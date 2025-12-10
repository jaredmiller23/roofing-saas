import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * POST /api/ai/chat/stream
 * Streaming chat endpoint using Server-Sent Events
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return new Response('No tenant found', { status: 403 })
    }

    const { conversation_id, content, context } = await request.json()

    if (!content || !content.trim()) {
      return new Response('Message content is required', { status: 400 })
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
        return new Response('Conversation not found', { status: 404 })
      }
    } else {
      // Create new conversation
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
        return new Response('Failed to create conversation', { status: 500 })
      }

      conversationId = newConversation.id
    }

    // Save user message first
    const { data: userMessage, error: userMsgError } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content,
        metadata: { context },
      })
      .select()
      .single()

    if (userMsgError || !userMessage) {
      return new Response('Failed to save message', { status: 500 })
    }

    // Load conversation history
    const { data: previousMessages } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20)

    // Build messages for OpenAI
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: getSystemPrompt(context),
      },
      ...(previousMessages || []).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ]

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    })

    // Create a TransformStream for SSE
    const encoder = new TextEncoder()
    let fullContent = ''

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send conversation ID first
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'conversation_id', conversation_id: conversationId, user_message: userMessage })}\n\n`)
          )

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              fullContent += content
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'content', content })}\n\n`)
              )
            }
          }

          // Save the complete assistant message
          const { data: assistantMessage } = await supabase
            .from('ai_messages')
            .insert({
              conversation_id: conversationId,
              role: 'assistant',
              content: fullContent,
              metadata: { context, model: 'gpt-4o', streamed: true },
            })
            .select()
            .single()

          // Send completion event with full message
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done', assistant_message: assistantMessage })}\n\n`)
          )

          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Streaming failed' })}\n\n`)
          )
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error in POST /api/ai/chat/stream:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

/**
 * Get system prompt based on context
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
- Answering questions about the CRM and how to use it
- Providing helpful tips for sales and door-knocking
- Helping analyze data and pipeline status
- Offering roofing industry expertise

Be concise, professional, and helpful. For actions that modify data (creating contacts, adding notes), let users know they can do this through the interface or by using specific commands.${contextInfo}

Current page: ${context?.page || 'Unknown'}`
}
