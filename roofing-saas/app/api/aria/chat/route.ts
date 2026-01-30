/**
 * POST /api/aria/chat
 * Streaming chat API for ARIA text conversations
 *
 * Uses OpenAI chat completions (streaming) with ARIA functions as tools.
 * Handles tool calls inline — executes via ariaOrchestrator, then continues.
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
import { openai, getOpenAIModel } from '@/lib/ai/openai-client'
import { ariaRateLimit, applyRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions'
import type { FunctionCallParameters } from '@/lib/voice/providers/types'

interface ChatRequest {
  message: string
  conversation_id?: string
  history?: ChatCompletionMessageParam[]
  context?: {
    contact_id?: string
    project_id?: string
  }
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
    const { message, history, context } = body

    if (!message?.trim()) {
      throw ValidationError('message is required')
    }

    logger.info('ARIA chat request', {
      userId: user.id,
      tenantId,
      messageLength: message.length,
      historyLength: history?.length || 0,
    })

    // Build ARIA context
    const supabase = await createClient()
    const ariaContext = await buildARIAContext({
      tenantId,
      userId: user.id,
      supabase,
      channel: 'chat',
      entityType: context?.contact_id ? 'contact' : context?.project_id ? 'project' : undefined,
      entityId: context?.contact_id || context?.project_id,
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
          const conversationMessages: ChatCompletionMessageParam[] = [...messages]
          let continueLoop = true

          while (continueLoop) {
            continueLoop = false

            const completion = await openai.chat.completions.create({
              model: getOpenAIModel(),
              messages: conversationMessages,
              tools: tools.length > 0 ? tools : undefined,
              stream: true,
            })

            let accumulatedContent = ''
            const toolCalls: Array<{
              id: string
              function: { name: string; arguments: string }
            }> = []

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

                // Add tool result to messages
                conversationMessages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  content: JSON.stringify(result),
                })
              }

              // Continue the loop to get the model's response after tool execution
              continueLoop = true
            }
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
