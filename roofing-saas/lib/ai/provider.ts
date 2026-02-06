/**
 * Multi-Provider AI Abstraction Layer
 *
 * Routes AI requests to the optimal provider/model based on task type.
 * Supports OpenAI and Anthropic (Claude) with format translation.
 *
 * Provider selection:
 * - ARIA chat + tool calling → Claude Sonnet 4.5 (better tool orchestration, caching)
 * - SMS classification → Claude Haiku 4.5 (fast, cheap)
 * - Vision/photos → OpenAI GPT-4o (mature vision API)
 * - Embeddings → OpenAI text-embedding-3-small (no Claude equivalent)
 * - Transcription → OpenAI Whisper (no Claude equivalent)
 */

import type Anthropic from '@anthropic-ai/sdk'
import type { VoiceFunction, VoiceFunctionParameter } from '@/lib/voice/providers/types'

// =============================================================================
// Types
// =============================================================================

export type AIProvider = 'anthropic' | 'openai'

export type AITask =
  | 'aria_chat'
  | 'sms_classification'
  | 'language_detection'
  | 'call_summarization'
  | 'deep_analysis'
  | 'vision'
  | 'embedding'
  | 'transcription'

export interface ProviderConfig {
  provider: AIProvider
  model: string
}

// =============================================================================
// Provider Routing
// =============================================================================

/**
 * Get the recommended provider for a given AI task.
 * Can be overridden via ARIA_PROVIDER env var to force all tasks to one provider.
 */
export function getProviderForTask(task: AITask): ProviderConfig {
  // Global override for testing/rollback
  const forceProvider = process.env.ARIA_PROVIDER as AIProvider | undefined
  if (forceProvider === 'openai') {
    return getOpenAIConfig(task)
  }

  switch (task) {
    case 'aria_chat':
      return {
        provider: 'anthropic',
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
      }
    case 'sms_classification':
    case 'language_detection':
      return {
        provider: 'anthropic',
        model: 'claude-haiku-4-5-20251001',
      }
    case 'call_summarization':
      return {
        provider: 'anthropic',
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
      }
    case 'deep_analysis':
      return {
        provider: 'anthropic',
        model: 'claude-opus-4-6',
      }
    // These stay on OpenAI — no Claude equivalent
    case 'vision':
    case 'embedding':
    case 'transcription':
      return getOpenAIConfig(task)
  }
}

function getOpenAIConfig(task: AITask): ProviderConfig {
  const model = task === 'sms_classification' || task === 'language_detection'
    ? (process.env.OPENAI_MODEL_MINI || 'gpt-4o-mini')
    : (process.env.OPENAI_MODEL || 'gpt-4o')

  return { provider: 'openai', model }
}

// =============================================================================
// Tool Format Translation
// =============================================================================

/**
 * Convert VoiceFunction (OpenAI-compatible) tool definitions to Anthropic tool format.
 * Designed to be used with prompt caching — tool definitions are static across requests.
 */
export function toAnthropicTools(voiceFunctions: VoiceFunction[]): Anthropic.Tool[] {
  return voiceFunctions.map(fn => ({
    name: fn.name,
    description: fn.description,
    input_schema: convertParametersToJsonSchema(fn.parameters),
  }))
}

/**
 * Convert our VoiceFunction parameters to a proper JSON Schema object for Anthropic.
 * The input_schema must be a valid JSON Schema with type: "object".
 */
function convertParametersToJsonSchema(
  params: VoiceFunction['parameters']
): Anthropic.Tool.InputSchema {
  return {
    type: 'object' as const,
    properties: convertProperties(params.properties),
    required: params.required,
  }
}

/**
 * Recursively convert VoiceFunctionParameter properties to JSON Schema properties.
 */
function convertProperties(
  properties: Record<string, VoiceFunctionParameter>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, param] of Object.entries(properties)) {
    const prop: Record<string, unknown> = { type: param.type }
    if (param.description) prop.description = param.description
    if (param.enum) prop.enum = param.enum
    if (param.items) {
      prop.items = { type: param.items.type }
      if (param.items.description) (prop.items as Record<string, unknown>).description = param.items.description
      if (param.items.enum) (prop.items as Record<string, unknown>).enum = param.items.enum
    }
    if (param.properties) {
      prop.properties = convertProperties(param.properties)
      if (param.required) prop.required = param.required
    }
    result[key] = prop
  }

  return result
}

/**
 * Mark tools for prompt caching (Anthropic).
 * The last tool gets cache_control to cache the entire tool list.
 */
export function withCaching(tools: Anthropic.Tool[]): Anthropic.Tool[] {
  if (tools.length === 0) return tools

  // Clone and add cache_control to the last tool
  const cached = tools.map((t, i) => {
    if (i === tools.length - 1) {
      return {
        ...t,
        cache_control: { type: 'ephemeral' as const },
      }
    }
    return t
  })

  return cached
}

// =============================================================================
// Message Format Translation
// =============================================================================

/**
 * Convert OpenAI-style message history to Anthropic message format.
 * Extracts system message separately (Anthropic uses a top-level system param).
 */
export function toAnthropicMessages(
  openaiMessages: Array<{ role: string; content: string | null; tool_calls?: unknown[]; tool_call_id?: string; name?: string }>
): {
  system: string
  messages: Anthropic.MessageParam[]
} {
  let system = ''
  const messages: Anthropic.MessageParam[] = []

  for (const msg of openaiMessages) {
    if (msg.role === 'system') {
      system = msg.content || ''
      continue
    }

    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content || '' })
      continue
    }

    if (msg.role === 'assistant') {
      // If assistant has tool_calls, convert to Anthropic content blocks
      if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
        const content: Anthropic.ContentBlockParam[] = []
        if (msg.content) {
          content.push({ type: 'text', text: msg.content } as Anthropic.TextBlockParam)
        }
        for (const tc of msg.tool_calls as Array<{ id: string; function: { name: string; arguments: string } }>) {
          let input: Record<string, unknown> = {}
          try {
            input = JSON.parse(tc.function.arguments)
          } catch {
            // Leave as empty object
          }
          content.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.function.name,
            input,
          })
        }
        messages.push({ role: 'assistant', content })
        continue
      }

      messages.push({ role: 'assistant', content: msg.content || '' })
      continue
    }

    if (msg.role === 'tool') {
      // Anthropic puts tool results inside user messages
      // Check if previous message is already a user message with tool_result blocks
      const lastMsg = messages[messages.length - 1]
      const toolResultBlock: Anthropic.ToolResultBlockParam = {
        type: 'tool_result',
        tool_use_id: msg.tool_call_id || '',
        content: msg.content || '',
      }

      if (lastMsg?.role === 'user' && Array.isArray(lastMsg.content)) {
        // Append to existing user message with tool results
        (lastMsg.content as Anthropic.ToolResultBlockParam[]).push(toolResultBlock)
      } else {
        // Create new user message with tool result
        messages.push({
          role: 'user',
          content: [toolResultBlock],
        })
      }
      continue
    }
  }

  return { system, messages }
}
