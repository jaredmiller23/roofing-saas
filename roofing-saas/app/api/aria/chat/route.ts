/**
 * POST /api/aria/chat
 * Streaming chat API for ARIA text conversations
 *
 * Supports multiple AI providers:
 * - Anthropic Claude (default) — better tool orchestration, prompt caching
 * - OpenAI GPT-4o (fallback) — set ARIA_PROVIDER=openai to use
 *
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
import { getAnthropicClient } from '@/lib/ai/anthropic-client'
import { getProviderForTask } from '@/lib/ai/provider'
import { ariaRateLimit, applyRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { canUseFeature } from '@/lib/billing/feature-gates'
import { createConversation, saveMessage, updateConversationTitle, generateTitle } from '@/lib/aria/persistence'
import { incrementAiUsage, calculateCostCents, calculateChatCostCents } from '@/lib/billing/ai-usage'
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

    // Determine provider
    const providerConfig = getProviderForTask('aria_chat')

    logger.info('ARIA chat request', {
      userId: user.id,
      tenantId,
      messageLength: message.length,
      historyLength: history?.length || 0,
      conversationId: conversation_id || 'new',
      provider: providerConfig.provider,
      model: providerConfig.model,
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

    // Get system prompt
    const systemPrompt = getARIASystemPrompt(ariaContext)

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

          let finalAssistantContent = ''
          let sessionInputTokens = 0
          let sessionOutputTokens = 0
          let sessionCachedTokens = 0

          if (providerConfig.provider === 'anthropic') {
            finalAssistantContent = await streamAnthropicChat({
              controller,
              encoder,
              systemPrompt,
              history: history || [],
              message,
              model: providerConfig.model,
              ariaContext,
              conversationId,
              onUsage: (input, output, cached) => {
                sessionInputTokens += input
                sessionOutputTokens += output
                sessionCachedTokens += cached
              },
            })
          } else {
            finalAssistantContent = await streamOpenAIChat({
              controller,
              encoder,
              systemPrompt,
              history: history || [],
              message,
              ariaContext,
              conversationId,
              onUsage: (total) => {
                sessionInputTokens += total
              },
            })
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
          const totalTokens = sessionInputTokens + sessionOutputTokens
          if (totalTokens > 0) {
            const costCents = providerConfig.provider === 'anthropic'
              ? calculateCostCents({
                  model: providerConfig.model,
                  inputTokens: sessionInputTokens,
                  outputTokens: sessionOutputTokens,
                  cachedInputTokens: sessionCachedTokens,
                })
              : calculateChatCostCents(sessionInputTokens) // Legacy: total tokens passed as input
            incrementAiUsage(tenantId, totalTokens, costCents).catch(err =>
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

// =============================================================================
// Anthropic (Claude) Streaming
// =============================================================================

interface AnthropicStreamParams {
  controller: ReadableStreamDefaultController
  encoder: TextEncoder
  systemPrompt: string
  history: ChatCompletionMessageParam[]
  message: string
  model: string
  ariaContext: Awaited<ReturnType<typeof buildARIAContext>>
  conversationId: string | null
  onUsage: (inputTokens: number, outputTokens: number, cachedTokens: number) => void
}

async function streamAnthropicChat(params: AnthropicStreamParams): Promise<string> {
  const { controller, encoder, systemPrompt, history, message, model, ariaContext, conversationId, onUsage } = params

  const client = getAnthropicClient()
  const tools = ariaFunctionRegistry.getAnthropicTools()

  // Build Anthropic message history
  // Convert OpenAI-format history to Anthropic format inline
  const anthropicMessages: Array<{ role: 'user' | 'assistant'; content: string | Array<Record<string, unknown>> }> = []

  for (const msg of history) {
    if (msg.role === 'user' && typeof msg.content === 'string') {
      anthropicMessages.push({ role: 'user', content: msg.content })
    } else if (msg.role === 'assistant' && typeof msg.content === 'string') {
      anthropicMessages.push({ role: 'assistant', content: msg.content })
    }
    // Skip system/tool messages from history — we build fresh context
  }

  // Add current user message
  anthropicMessages.push({ role: 'user', content: message })

  let finalAssistantContent = ''
  let continueLoop = true

  while (continueLoop) {
    continueLoop = false

    const stream = client.messages.stream({
      model,
      max_tokens: 4096,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools,
      messages: anthropicMessages as Parameters<typeof client.messages.stream>[0]['messages'],
    })

    let accumulatedText = ''
    const toolUseBlocks: Array<{
      id: string
      name: string
      input: string
    }> = []
    let currentToolUse: { id: string; name: string; input: string } | null = null

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'text') {
          // Text block starting
        } else if (event.content_block.type === 'tool_use') {
          currentToolUse = {
            id: event.content_block.id,
            name: event.content_block.name,
            input: '',
          }
        }
      } else if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          accumulatedText += event.delta.text
          const data = JSON.stringify({ type: 'text', content: event.delta.text })
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        } else if (event.delta.type === 'input_json_delta' && currentToolUse) {
          currentToolUse.input += event.delta.partial_json
        }
      } else if (event.type === 'content_block_stop') {
        if (currentToolUse) {
          toolUseBlocks.push(currentToolUse)
          currentToolUse = null
        }
      } else if (event.type === 'message_delta') {
        // Capture usage from the message_delta event
        if (event.usage) {
          onUsage(0, event.usage.output_tokens, 0)
        }
      } else if (event.type === 'message_start') {
        // Capture input token usage
        if (event.message?.usage) {
          const usage = event.message.usage
          onUsage(
            usage.input_tokens,
            0,
            (usage as unknown as Record<string, number>).cache_read_input_tokens || 0,
          )
        }
      }
    }

    // If there are tool uses, execute them and continue
    if (toolUseBlocks.length > 0) {
      // Build assistant message with content blocks
      const assistantContent: Array<Record<string, unknown>> = []
      if (accumulatedText) {
        assistantContent.push({ type: 'text', text: accumulatedText })
      }
      for (const tu of toolUseBlocks) {
        let parsedInput: Record<string, unknown> = {}
        try {
          parsedInput = JSON.parse(tu.input)
        } catch {
          logger.warn('Failed to parse tool use input', { name: tu.name, input: tu.input })
        }
        assistantContent.push({
          type: 'tool_use',
          id: tu.id,
          name: tu.name,
          input: parsedInput,
        })
      }

      anthropicMessages.push({ role: 'assistant', content: assistantContent })

      // Execute each tool and collect results
      const toolResults: Array<Record<string, unknown>> = []

      for (const tu of toolUseBlocks) {
        let fnArgs: FunctionCallParameters = {}
        try {
          fnArgs = JSON.parse(tu.input)
        } catch {
          // Already warned above
        }

        // Notify client of function execution
        const fnStart = JSON.stringify({ type: 'function_call', name: tu.name, arguments: fnArgs })
        controller.enqueue(encoder.encode(`data: ${fnStart}\n\n`))

        // Execute the function
        const result = await executeARIAFunction(tu.name, fnArgs, ariaContext)

        // Notify client of function result
        const fnResult = JSON.stringify({
          type: 'function_result',
          name: tu.name,
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
            { name: tu.name, parameters: fnArgs, result },
          ).catch(err =>
            logger.error('Failed to persist function message', { error: err })
          )
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: JSON.stringify(result),
        })
      }

      // Add tool results as user message (Anthropic format)
      anthropicMessages.push({ role: 'user', content: toolResults })

      continueLoop = true
    } else {
      finalAssistantContent = accumulatedText
    }

    // Emit token usage event
    const usageEvent = JSON.stringify({ type: 'usage', provider: 'anthropic', model })
    controller.enqueue(encoder.encode(`data: ${usageEvent}\n\n`))
  }

  return finalAssistantContent
}

// =============================================================================
// OpenAI Streaming (preserved from original implementation)
// =============================================================================

interface OpenAIStreamParams {
  controller: ReadableStreamDefaultController
  encoder: TextEncoder
  systemPrompt: string
  history: ChatCompletionMessageParam[]
  message: string
  ariaContext: Awaited<ReturnType<typeof buildARIAContext>>
  conversationId: string | null
  onUsage: (totalTokens: number) => void
}

async function streamOpenAIChat(params: OpenAIStreamParams): Promise<string> {
  const { controller, encoder, systemPrompt, history, message, ariaContext, conversationId, onUsage } = params

  const voiceFunctions = ariaFunctionRegistry.getVoiceFunctions()
  const tools: ChatCompletionTool[] = voiceFunctions.map(fn => ({
    type: 'function' as const,
    function: {
      name: fn.name,
      description: fn.description,
      parameters: fn.parameters,
    },
  }))

  const conversationMessages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...(history || []),
    { role: 'user', content: message },
  ]

  let finalAssistantContent = ''
  let continueLoop = true

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
        onUsage(chunk.usage.total_tokens)
      }
    }

    // If there are tool calls, execute them and continue
    if (toolCalls.length > 0) {
      conversationMessages.push({
        role: 'assistant',
        content: accumulatedContent || null,
        tool_calls: toolCalls.map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: tc.function,
        })),
      })

      for (const tc of toolCalls) {
        const fnName = tc.function.name
        let fnArgs: FunctionCallParameters = {}
        try {
          fnArgs = JSON.parse(tc.function.arguments)
        } catch {
          logger.warn('Failed to parse tool call arguments', { fnName, args: tc.function.arguments })
        }

        const fnStart = JSON.stringify({ type: 'function_call', name: fnName, arguments: fnArgs })
        controller.enqueue(encoder.encode(`data: ${fnStart}\n\n`))

        const result = await executeARIAFunction(fnName, fnArgs, ariaContext)

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

        conversationMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        })
      }

      continueLoop = true
    } else {
      finalAssistantContent = accumulatedContent
    }

    // Emit token usage for the client
    const usageEvent = JSON.stringify({ type: 'usage', provider: 'openai' })
    controller.enqueue(encoder.encode(`data: ${usageEvent}\n\n`))
  }

  return finalAssistantContent
}
