import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions'
import { logger } from '@/lib/logger'
// ARIA - AI Roofing Intelligent Assistant
import { buildARIAContext, getARIASystemPrompt } from '@/lib/aria'
import type { ARIAContext } from '@/lib/aria'
import { ariaFunctionRegistry } from '@/lib/aria/function-registry'
import type { FunctionCallParameters } from '@/lib/voice/providers/types'
// Resilient OpenAI client with rate limit handling
import { getOpenAIClient, createStreamingChatCompletion, getOpenAIModel } from '@/lib/ai/openai-client'

/**
 * POST /api/ai/chat/stream
 * Streaming chat endpoint using Server-Sent Events with function calling
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

    // Build ARIA context for consistent persona across all channels
    const ariaContext: ARIAContext = await buildARIAContext({
      tenantId,
      userId: user.id,
      supabase,
      channel: 'chat',
      page: context?.page,
      entityType: context?.entity_type as ARIAContext['entityType'],
      entityId: context?.entity_id,
    })

    // Build messages for OpenAI with ARIA system prompt
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: getARIASystemPrompt(ariaContext),
      },
      ...(previousMessages || []).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ]

    // Get ARIA tools in OpenAI format
    const tools = ariaFunctionRegistry.getChatCompletionTools() as ChatCompletionTool[]

    // Create a TransformStream for SSE
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send conversation ID first
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'conversation_id', conversation_id: conversationId, user_message: userMessage })}\n\n`)
          )

          let fullContent = ''
          const currentMessages = [...messages]
          let continueLoop = true

          // Loop to handle multiple rounds of tool calls
          while (continueLoop) {
            // Use resilient client with rate limit handling
            const stream = await createStreamingChatCompletion(getOpenAIClient(), {
              messages: currentMessages,
              tools: tools.length > 0 ? tools : undefined,
              tool_choice: tools.length > 0 ? 'auto' : undefined,
              temperature: 0.7,
              max_tokens: 1000,
            })

            // Accumulate tool calls during streaming
            const toolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map()
            let hasToolCalls = false

            for await (const chunk of stream) {
              const choice = chunk.choices[0]
              const delta = choice?.delta

              // Handle streamed content
              if (delta?.content) {
                fullContent += delta.content
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'content', content: delta.content })}\n\n`)
                )
              }

              // Handle tool calls
              if (delta?.tool_calls) {
                hasToolCalls = true
                for (const toolCall of delta.tool_calls) {
                  const index = toolCall.index
                  if (!toolCalls.has(index)) {
                    toolCalls.set(index, {
                      id: toolCall.id || '',
                      name: toolCall.function?.name || '',
                      arguments: '',
                    })
                  }
                  const existing = toolCalls.get(index)!
                  if (toolCall.id) existing.id = toolCall.id
                  if (toolCall.function?.name) existing.name = toolCall.function.name
                  if (toolCall.function?.arguments) existing.arguments += toolCall.function.arguments
                }
              }

              // Check if we're done with this completion
              if (choice?.finish_reason === 'stop') {
                continueLoop = false
              } else if (choice?.finish_reason === 'tool_calls') {
                // Need to execute tools and continue
                continueLoop = true
              }
            }

            // Execute tool calls if any
            if (hasToolCalls && toolCalls.size > 0) {
              // Add assistant message with tool calls to history
              const assistantToolMessage: ChatCompletionMessageParam = {
                role: 'assistant',
                content: fullContent || null,
                tool_calls: Array.from(toolCalls.values()).map(tc => ({
                  id: tc.id,
                  type: 'function' as const,
                  function: {
                    name: tc.name,
                    arguments: tc.arguments,
                  },
                })),
              }
              currentMessages.push(assistantToolMessage)

              // Execute each tool call
              for (const [, toolCall] of toolCalls) {
                const startTime = Date.now()
                let args: FunctionCallParameters = {}

                try {
                  args = JSON.parse(toolCall.arguments || '{}') as FunctionCallParameters
                } catch {
                  args = {}
                }

                // Log tool call
                logger.ariaToolCall(toolCall.name, args, {
                  userId: user.id,
                  tenantId,
                  conversationId,
                })

                // Notify client that a tool is being executed
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'tool_call',
                    tool: toolCall.name,
                    args,
                  })}\n\n`)
                )

                // Execute the tool
                const ariaFunction = ariaFunctionRegistry.get(toolCall.name)
                let toolResult: { success: boolean; data?: unknown; error?: string; message?: string }

                if (ariaFunction) {
                  try {
                    toolResult = await ariaFunction.execute(args, ariaContext)
                  } catch (error) {
                    toolResult = {
                      success: false,
                      error: error instanceof Error ? error.message : 'Tool execution failed',
                    }
                  }
                } else {
                  toolResult = {
                    success: false,
                    error: `Unknown function: ${toolCall.name}`,
                  }
                }

                // Log tool result
                const duration = Date.now() - startTime
                logger.ariaToolResult(
                  toolCall.name,
                  toolResult.success,
                  duration,
                  toolResult.data,
                  toolResult.error
                )

                // Notify client of tool result
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'tool_result',
                    tool: toolCall.name,
                    success: toolResult.success,
                    message: toolResult.message,
                  })}\n\n`)
                )

                // Add tool result to messages for next iteration
                const toolResultMessage: ChatCompletionMessageParam = {
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: JSON.stringify(toolResult),
                }
                currentMessages.push(toolResultMessage)
              }

              // Reset fullContent for next assistant response
              fullContent = ''
            } else {
              // No tool calls, we're done
              continueLoop = false
            }
          }

          // Save the complete assistant message
          const { data: assistantMessage } = await supabase
            .from('ai_messages')
            .insert({
              conversation_id: conversationId,
              role: 'assistant',
              content: fullContent,
              metadata: { context, model: getOpenAIModel(), streamed: true, usedTools: true },
            })
            .select()
            .single()

          // Send completion event with full message
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done', assistant_message: assistantMessage })}\n\n`)
          )

          controller.close()
        } catch (error) {
          logger.error('Streaming error:', { error })
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
    logger.error('Error in POST /api/ai/chat/stream:', { error })
    return new Response('Internal server error', { status: 500 })
  }
}
