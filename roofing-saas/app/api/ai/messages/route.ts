import { NextRequest } from 'next/server'
import type { Json } from '@/lib/types/database.types'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import type { AIMessage, SendMessageRequest } from '@/lib/ai-assistant/types'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
// ARIA - AI Roofing Intelligent Assistant
import { ariaFunctionRegistry, buildARIAContext, getARIASystemPrompt, executeARIAFunction } from '@/lib/aria'
import type { ARIAContext } from '@/lib/aria'
// Resilient OpenAI client with rate limit handling
import { getOpenAIClient, createChatCompletion, getOpenAIModel } from '@/lib/ai/openai-client'

/**
 * POST /api/ai/messages
 * Send a message and get AI response using OpenAI Chat Completions API
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const body: SendMessageRequest = await request.json()
    const { conversation_id, content, role, metadata = {}, context } = body

    if (!content || !content.trim()) {
      throw ValidationError('Message content is required')
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
        throw NotFoundError('Conversation not found')
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
          metadata: { last_context: context } as Json,
        })
        .select()
        .single()

      if (createError || !newConversation) {
        logger.error('Error creating conversation:', { error: createError })
        throw InternalError('Failed to create conversation')
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
        } as Json,
      })
      .select()
      .single()

    if (userMsgError || !userMessage) {
      logger.error('Error saving user message:', { error: userMsgError })
      throw InternalError('Failed to save message')
    }

    // Load conversation history for context
    const { data: previousMessages } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20) // Last 20 messages for context

    // Build ARIA context for enhanced capabilities
    const ariaContext: ARIAContext = await buildARIAContext({
      tenantId,
      userId: user.id,
      supabase,
      channel: 'chat',
      page: context?.page,
      entityType: context?.entity_type as ARIAContext['entityType'],
      entityId: context?.entity_id,
    })

    // Build messages array for OpenAI
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: getARIASystemPrompt(ariaContext),
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

    // Get ARIA's enhanced function tools (CRM + QuickBooks + Actions + Weather)
    const tools = ariaFunctionRegistry.getChatCompletionTools()

    // Call OpenAI Chat Completions API with resilient client (handles rate limits)
    const completion = await createChatCompletion(getOpenAIClient(), {
      messages,
      tools: tools.length > 0 ? tools : undefined,
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

      // Execute the function using ARIA orchestrator
      const functionResult = await executeARIAFunction(
        functionName,
        functionArgs,
        ariaContext
      )

      functionCallData = {
        name: functionName,
        parameters: functionArgs,
        result: functionResult,
      }

      // If we have a function result, make a second call to get a natural language response
      const followUpCompletion = await createChatCompletion(getOpenAIClient(), {
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
        function_call: functionCallData as Json,
        metadata: {
          context,
          model: getOpenAIModel(),
        } as Json,
      })
      .select()
      .single()

    if (assistantMsgError || !savedAssistantMessage) {
      logger.error('Error saving assistant message:', { error: assistantMsgError })
      throw InternalError('Failed to save assistant response')
    }

    // Safety check (should never happen due to logic above)
    if (!conversationId) {
      throw InternalError('Conversation ID not set')
    }

    return successResponse({
      message: userMessage as AIMessage,
      assistant_message: savedAssistantMessage as AIMessage,
      conversation_id: conversationId,
    })
  } catch (error) {
    logger.error('Error in POST /api/ai/messages:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

// NOTE: System prompt, function tools, and function execution are now provided by ARIA
// See lib/aria/ for the unified orchestrator implementation
