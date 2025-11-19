import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import type { AIMessage, SendMessageRequest, SendMessageResponse } from '@/lib/ai-assistant/types'
import OpenAI from 'openai'
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * POST /api/ai/messages
 * Send a message and get AI response using OpenAI Chat Completions API
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
    }

    const body: SendMessageRequest = await request.json()
    const { conversation_id, content, role, metadata = {}, context } = body

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify or create conversation
    let conversationId = conversation_id

    if (conversationId) {
      // Verify ownership
      const { data: conversation } = await supabase
        .from('ai_conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)
        .eq('user_id', user.id)
        .single()

      if (!conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        )
      }
    } else {
      // Create new conversation with auto-generated title from first message
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '')

      const { data: newConversation, error: createError } = await supabase
        .from('ai_conversations')
        .insert({
          tenant_id: tenantId,
          user_id: user.id,
          title,
          metadata: { last_context: context },
        })
        .select()
        .single()

      if (createError || !newConversation) {
        console.error('Error creating conversation:', createError)
        return NextResponse.json(
          { error: 'Failed to create conversation' },
          { status: 500 }
        )
      }

      conversationId = newConversation.id
    }

    // Save user message
    const { data: userMessage, error: userMsgError } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        metadata: {
          ...metadata,
          context,
        },
      })
      .select()
      .single()

    if (userMsgError || !userMessage) {
      console.error('Error saving user message:', userMsgError)
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: 500 }
      )
    }

    // Load conversation history for context
    const { data: previousMessages } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20) // Last 20 messages for context

    // Build messages array for OpenAI
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: getSystemPrompt(context),
      },
      // Add conversation history
      ...(previousMessages || []).map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
      // Add new user message
      {
        role: 'user',
        content,
      },
    ]

    // Call OpenAI Chat Completions API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools: getCRMFunctionTools(),
      temperature: 0.7,
      max_tokens: 1000,
    })

    const assistantMessage = completion.choices[0].message
    let assistantContent = assistantMessage.content || 'I apologize, but I encountered an issue generating a response.'
    let functionCallData = null

    // Handle function calls if present
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolCall = assistantMessage.tool_calls[0]

      // Type guard to ensure this is a function tool call
      if (toolCall.type !== 'function') {
        throw new Error('Unsupported tool call type')
      }

      const functionName = toolCall.function.name
      const functionArgs = JSON.parse(toolCall.function.arguments)

      // Execute the function
      const functionResult = await executeCRMFunction(
        functionName,
        functionArgs,
        { tenantId, userId: user.id, supabase }
      )

      functionCallData = {
        name: functionName,
        parameters: functionArgs,
        result: functionResult,
      }

      // If we have a function result, make a second call to get a natural language response
      const followUpCompletion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          ...messages,
          {
            role: 'assistant',
            content: null,
            tool_calls: [toolCall],
          },
          {
            role: 'tool',
            content: JSON.stringify(functionResult),
            tool_call_id: toolCall.id,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      })

      assistantContent = followUpCompletion.choices[0].message.content || assistantContent
    }

    const { data: savedAssistantMessage, error: assistantMsgError } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantContent,
        function_call: functionCallData,
        metadata: {
          context,
          model: 'gpt-4o',
        },
      })
      .select()
      .single()

    if (assistantMsgError || !savedAssistantMessage) {
      console.error('Error saving assistant message:', assistantMsgError)
      return NextResponse.json(
        { error: 'Failed to save assistant response' },
        { status: 500 }
      )
    }

    // Safety check (should never happen due to logic above)
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID not set' },
        { status: 500 }
      )
    }

    const response: SendMessageResponse = {
      message: userMessage as AIMessage,
      assistant_message: savedAssistantMessage as AIMessage,
      conversation_id: conversationId,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in POST /api/ai/messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get system prompt based on current page context
 */
function getSystemPrompt(context?: { page?: string; entity_type?: string; entity_id?: string }): string {
  let contextInfo = ''

  if (context?.entity_type === 'contact' && context.entity_id) {
    contextInfo = '\n\nThe user is currently viewing a contact page. You can help them with actions related to this specific contact.'
  } else if (context?.entity_type === 'project' && context.entity_id) {
    contextInfo = '\n\nThe user is currently viewing a project/job page. You can help them with actions related to this project.'
  } else if (context?.page === '/territories') {
    contextInfo = '\n\nThe user is currently on the territories/field activity page. You can help them with door knocking activities.'
  } else if (context?.page === '/pipeline') {
    contextInfo = '\n\nThe user is currently on the pipeline page. You can help them with deal management and pipeline analytics.'
  }

  return `You are an AI assistant for a roofing company CRM system. You help users manage their contacts, projects, door-knocking activities, pipeline, and more.

Your capabilities include:
- Searching and finding contacts, projects, and activities
- Creating new contacts with contact information
- Adding notes and activities to records
- Checking pipeline status and deal stages
- Providing helpful information about the CRM

Be concise, professional, and action-oriented. When users ask you to perform an action, use the available functions to actually do it.${contextInfo}

Current page: ${context?.page || 'Unknown'}`
}

/**
 * Get CRM function tools for OpenAI function calling
 */
function getCRMFunctionTools(): ChatCompletionTool[] {
  return [
    {
      type: 'function',
      function: {
        name: 'search_contacts',
        description: 'Search for contacts in the CRM by name, phone, email, or address',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query (name, phone, email, or address)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
              default: 10,
            },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'create_contact',
        description: 'Create a new contact in the CRM',
        parameters: {
          type: 'object',
          properties: {
            first_name: {
              type: 'string',
              description: 'First name of the contact',
            },
            last_name: {
              type: 'string',
              description: 'Last name of the contact',
            },
            email: {
              type: 'string',
              description: 'Email address',
            },
            phone: {
              type: 'string',
              description: 'Phone number',
            },
            address: {
              type: 'string',
              description: 'Street address',
            },
            city: {
              type: 'string',
              description: 'City',
            },
            state: {
              type: 'string',
              description: 'State',
            },
            zip: {
              type: 'string',
              description: 'ZIP code',
            },
          },
          required: ['first_name', 'last_name'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'add_note',
        description: 'Add a note or activity to a contact or project',
        parameters: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'UUID of the contact (optional if project_id provided)',
            },
            project_id: {
              type: 'string',
              description: 'UUID of the project (optional if contact_id provided)',
            },
            content: {
              type: 'string',
              description: 'The note content',
            },
            type: {
              type: 'string',
              enum: ['note', 'call', 'email', 'meeting', 'task'],
              description: 'Type of activity',
              default: 'note',
            },
          },
          required: ['content'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_pipeline_stats',
        description: 'Get current pipeline statistics and deal counts by stage',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
    },
  ]
}

/**
 * Execute a CRM function and return the result
 */
async function executeCRMFunction(
  functionName: string,
  args: Record<string, unknown>,
  context: { tenantId: string; userId: string; supabase: Awaited<ReturnType<typeof createClient>> }
): Promise<unknown> {
  const { tenantId, userId, supabase } = context

  switch (functionName) {
    case 'search_contacts': {
      const { query, limit = 10 } = args as { query: string; limit?: number }

      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone, address, city, state, zip, lead_source')
        .eq('tenant_id', tenantId)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,address.ilike.%${query}%`)
        .limit(limit as number)

      if (error) {
        return { success: false, error: error.message }
      }

      return {
        success: true,
        contacts: data,
        count: data.length,
      }
    }

    case 'create_contact': {
      const contactData = args as {
        first_name: string
        last_name: string
        email?: string
        phone?: string
        address?: string
        city?: string
        state?: string
        zip?: string
      }

      const { data, error } = await supabase
        .from('contacts')
        .insert({
          tenant_id: tenantId,
          created_by: userId,
          ...contactData,
          lead_source: 'AI Assistant',
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return {
        success: true,
        contact: data,
      }
    }

    case 'add_note': {
      const { contact_id, project_id, content, type = 'note' } = args as {
        contact_id?: string
        project_id?: string
        content: string
        type?: string
      }

      const { data, error } = await supabase
        .from('activities')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          contact_id: contact_id || null,
          project_id: project_id || null,
          type: type as string,
          content,
          direction: 'outbound',
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return {
        success: true,
        activity: data,
      }
    }

    case 'get_pipeline_stats': {
      const { data, error } = await supabase
        .from('projects')
        .select('stage')
        .eq('tenant_id', tenantId)

      if (error) {
        return { success: false, error: error.message }
      }

      // Count by stage
      const stageCounts = data.reduce((acc: Record<string, number>, project) => {
        const stage = project.stage || 'unknown'
        acc[stage] = (acc[stage] || 0) + 1
        return acc
      }, {})

      return {
        success: true,
        total_deals: data.length,
        by_stage: stageCounts,
      }
    }

    default:
      return {
        success: false,
        error: `Unknown function: ${functionName}`,
      }
  }
}
