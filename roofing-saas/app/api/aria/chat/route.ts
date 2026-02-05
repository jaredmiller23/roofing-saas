/**
 * POST /api/aria/chat
 * Streaming chat API for ARIA text conversations
 *
 * Uses OpenAI chat completions (streaming) with ARIA functions as tools.
 * Handles tool calls inline — executes via ariaOrchestrator, then continues.
 * Persists conversations and messages to ai_conversations / ai_messages tables.
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
} from '@/lib/api/errors'
import { errorResponse } from '@/lib/api/response'
import { buildARIAContext, ariaFunctionRegistry, executeARIAFunction } from '@/lib/aria'
import { getARIASystemPrompt } from '@/lib/aria/orchestrator'
import { getOpenAIClient, getOpenAIModel } from '@/lib/ai/openai-client'
import { ariaRateLimit, applyRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { canUseFeature } from '@/lib/billing/feature-gates'
import { createConversation, saveMessage, updateConversationTitle, generateTitle } from '@/lib/aria/persistence'
import { incrementAiUsage, calculateChatCostCents } from '@/lib/billing/ai-usage'
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions'
import type { FunctionCallParameters } from '@/lib/voice/providers/types'
import type { ARIAErrorContext } from '@/lib/aria/types'

interface ChatRequest {
  message: string
  conversation_id?: string
  history?: ChatCompletionMessageParam[]
  context?: {
    contact_id?: string
    project_id?: string
  }
  /** ARIA 2.0: Error context for self-awareness */
  errorContext?: ARIAErrorContext
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    // Check AI feature access (allow if no subscription — treat as trial/setup mode)
    const aiAccess = await canUseFeature(tenantId, 'aiChat')
    if (!aiAccess.allowed && aiAccess.reason !== 'No active subscription') {
      throw AuthorizationError(aiAccess.reason || 'AI chat requires a plan upgrade')
    }

    // Apply rate limiting
    const rateLimitResult = await applyRateLimit(
      request,
      ariaRateLimit,
      getClientIdentifier(request, user.id)
    )
    if (rateLimitResult instanceof Response) {
      return rateLimitResult
    }

    const body: ChatRequest = await request.json()
    const { message, conversation_id, history, context, errorContext } = body

    if (!message?.trim()) {
      throw ValidationError('message is required')
    }

    logger.info('ARIA chat request', {
      userId: user.id,
      tenantId,
      messageLength: message.length,
      historyLength: history?.length || 0,
      conversationId: conversation_id || 'new',
    })

    // Resolve or create conversation
    let conversationId = conversation_id || null
    let isNewConversation = false

    if (!conversationId) {
      conversationId = await createConversation(tenantId, user.id)
      isNewConversation = true
    }

    // Save user message (fire-and-forget for persistence, don't block streaming)
    if (conversationId) {
      saveMessage(conversationId, 'user', message).catch(err =>
        logger.error('Failed to persist user message', { error: err })
      )
    }

    // Build ARIA context with error awareness (ARIA 2.0)
    const supabase = await createClient()
    const ariaContext = await buildARIAContext({
      tenantId,
      userId: user.id,
      supabase,
      channel: 'chat',
      entityType: context?.contact_id ? 'contact' : context?.project_id ? 'project' : undefined,
      entityId: context?.contact_id || context?.project_id,
      // ARIA 2.0: Pass recent errors so ARIA knows what went wrong
      recentErrors: errorContext?.recentErrors,
    })

    // Get system prompt and tools
    const systemPrompt = getARIASystemPrompt(ariaContext)

    const voiceFunctions = ariaFunctionRegistry.getVoiceFunctions()
    const tools: ChatCompletionTool[] = voiceFunctions.map(fn => ({
      type: 'function' as const,
      function: {
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters,
      },
    }))

    // Build message history
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...(history || []),
      { role: 'user', content: message },
    ]

    // Create streaming response
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Emit conversation_id so the client can track it
          if (conversationId) {
            const convEvent = JSON.stringify({ type: 'conversation_id', id: conversationId })
            controller.enqueue(encoder.encode(`data: ${convEvent}\n\n`))
          }

          const conversationMessages: ChatCompletionMessageParam[] = [...messages]
          let continueLoop = true
          let finalAssistantContent = ''
          let sessionTotalTokens = 0

          while (continueLoop) {
            continueLoop = false

            const completion = await getOpenAIClient().chat.completions.create({
              model: getOpenAIModel(),
              messages: conversationMessages,
              tools: tools.length > 0 ? tools : undefined,
              stream: true,
              stream_options: { include_usage: true },
            })

            let accumulatedContent = ''
            const toolCalls: Array<{
              id: string
              function: { name: string; arguments: string }
            }> = []
            let totalTokens = 0

            for await (const chunk of completion) {
              const delta = chunk.choices[0]?.delta

              // Stream text content
              if (delta?.content) {
                accumulatedContent += delta.content
                const data = JSON.stringify({ type: 'text', content: delta.content })
                controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              }

              // Accumulate tool calls
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  if (tc.index !== undefined) {
                    if (!toolCalls[tc.index]) {
                      toolCalls[tc.index] = {
                        id: tc.id || '',
                        function: { name: '', arguments: '' },
                      }
                    }
                    if (tc.id) toolCalls[tc.index].id = tc.id
                    if (tc.function?.name) toolCalls[tc.index].function.name += tc.function.name
                    if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments
                  }
                }
              }

              // Capture usage from final chunk
              if (chunk.usage) {
                totalTokens += chunk.usage.total_tokens
                sessionTotalTokens += chunk.usage.total_tokens
              }
            }

            // If there are tool calls, execute them and continue
            if (toolCalls.length > 0) {
              // Add assistant message with tool calls
              conversationMessages.push({
                role: 'assistant',
                content: accumulatedContent || null,
                tool_calls: toolCalls.map(tc => ({
                  id: tc.id,
                  type: 'function' as const,
                  function: tc.function,
                })),
              })

              // Execute each tool call
              for (const tc of toolCalls) {
                const fnName = tc.function.name
                let fnArgs: FunctionCallParameters = {}
                try {
                  fnArgs = JSON.parse(tc.function.arguments)
                } catch {
                  logger.warn('Failed to parse tool call arguments', { fnName, args: tc.function.arguments })
                }

                // Notify client of function execution
                const fnStart = JSON.stringify({ type: 'function_call', name: fnName, arguments: fnArgs })
                controller.enqueue(encoder.encode(`data: ${fnStart}\n\n`))

                // Execute the function
                const result = await executeARIAFunction(fnName, fnArgs, ariaContext)

                // Notify client of function result
                const fnResult = JSON.stringify({
                  type: 'function_result',
                  name: fnName,
                  result: {
                    success: result.success,
                    message: result.message,
                    error: result.error,
                  },
                })
                controller.enqueue(encoder.encode(`data: ${fnResult}\n\n`))

                // Persist function call message
                if (conversationId) {
                  saveMessage(
                    conversationId,
                    'function',
                    JSON.stringify(result),
                    { name: fnName, parameters: fnArgs, result },
                  ).catch(err =>
                    logger.error('Failed to persist function message', { error: err })
                  )
                }

                // Add tool result to messages
                conversationMessages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  content: JSON.stringify(result),
                })
              }

              // Continue the loop to get the model's response after tool execution
              continueLoop = true
            } else {
              // Final text response (no more tool calls)
              finalAssistantContent = accumulatedContent
            }

            // Emit token usage for the client
            if (totalTokens > 0) {
              const usageEvent = JSON.stringify({ type: 'usage', total_tokens: totalTokens })
              controller.enqueue(encoder.encode(`data: ${usageEvent}\n\n`))
            }
          }

          // Persist final assistant message
          if (conversationId && finalAssistantContent) {
            saveMessage(conversationId, 'assistant', finalAssistantContent).catch(err =>
              logger.error('Failed to persist assistant message', { error: err })
            )
          }

          // Auto-set title from first message for new conversations
          if (isNewConversation && conversationId) {
            const title = generateTitle(message)
            updateConversationTitle(conversationId, title).catch(err =>
              logger.error('Failed to set conversation title', { error: err })
            )
          }

          // Track AI token usage (fire-and-forget)
          if (sessionTotalTokens > 0) {
            const costCents = calculateChatCostCents(sessionTotalTokens)
            incrementAiUsage(tenantId, sessionTotalTokens, costCents).catch(err =>
              logger.error('Failed to track AI usage', { error: err })
            )
          }

          // Signal done
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          logger.error('ARIA chat stream error', { error })
          const errData = JSON.stringify({ type: 'error', message: 'An error occurred while processing your message.' })
          controller.enqueue(encoder.encode(`data: ${errData}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    logger.error('ARIA chat error', { error })
    return errorResponse(error as Error)
  }
}
