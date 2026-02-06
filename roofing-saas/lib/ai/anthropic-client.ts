/**
 * Resilient Anthropic Client
 *
 * Provides production-grade Anthropic (Claude) integration with:
 * - Configurable model via ANTHROPIC_MODEL environment variable
 * - Automatic retry with exponential backoff for rate limits
 * - Prompt caching support for tool definitions
 */

import Anthropic from '@anthropic-ai/sdk'
import { logger } from '@/lib/logger'

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929'
const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

/**
 * Available Claude models with their pricing
 */
export const CLAUDE_MODELS = {
  'claude-opus-4-6': {
    inputPer1M: 5.0,
    outputPer1M: 25.0,
    cachedInputPer1M: 0.5,
    maxTokens: 128_000,
    contextWindow: 1_000_000,
  },
  'claude-sonnet-4-5-20250929': {
    inputPer1M: 3.0,
    outputPer1M: 15.0,
    cachedInputPer1M: 0.3,
    maxTokens: 64_000,
    contextWindow: 200_000,
  },
  'claude-haiku-4-5-20251001': {
    inputPer1M: 1.0,
    outputPer1M: 5.0,
    cachedInputPer1M: 0.1,
    maxTokens: 64_000,
    contextWindow: 200_000,
  },
} as const

export type ClaudeModelId = keyof typeof CLAUDE_MODELS

/**
 * Get the configured Anthropic model from environment
 * Default: claude-sonnet-4-5-20250929
 */
export function getAnthropicModel(): ClaudeModelId {
  const envModel = process.env.ANTHROPIC_MODEL
  if (envModel && envModel in CLAUDE_MODELS) {
    return envModel as ClaudeModelId
  }
  return DEFAULT_MODEL
}

/**
 * Check if error is a rate limit error (429)
 */
function isRateLimitError(error: unknown): boolean {
  return (
    error instanceof Anthropic.APIError &&
    error.status === 429
  )
}

/**
 * Check if error is an overloaded error (529)
 */
function isOverloadedError(error: unknown): boolean {
  return (
    error instanceof Anthropic.APIError &&
    error.status === 529
  )
}

/**
 * Get retry delay with exponential backoff
 */
function getRetryDelay(error: unknown, attempt: number): number {
  if (error instanceof Anthropic.APIError) {
    const retryAfter = error.headers?.['retry-after']
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10)
      if (!isNaN(seconds)) {
        return seconds * 1000
      }
    }
  }
  return Math.pow(2, attempt) * BASE_DELAY_MS
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Create a message with automatic retry on rate limits
 */
export async function createAnthropicMessage(
  client: Anthropic,
  params: Omit<Anthropic.MessageCreateParamsNonStreaming, 'model'> & { model?: ClaudeModelId }
): Promise<Anthropic.Message> {
  const model = params.model || getAnthropicModel()

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await client.messages.create({
        ...params,
        model,
      })
    } catch (error) {
      if ((isRateLimitError(error) || isOverloadedError(error)) && attempt < MAX_RETRIES - 1) {
        const waitTime = getRetryDelay(error, attempt)
        logger.warn('Anthropic rate limited, retrying', {
          attempt: attempt + 1,
          maxRetries: MAX_RETRIES,
          waitTimeMs: waitTime,
          model,
        })
        await sleep(waitTime)
        continue
      }
      throw error
    }
  }

  throw new Error('Anthropic: Max retries exceeded')
}

/**
 * Create a streaming message with automatic retry on rate limits
 * Retry only happens before streaming starts.
 */
export async function createStreamingAnthropicMessage(
  client: Anthropic,
  params: Omit<Anthropic.MessageCreateParamsStreaming, 'model' | 'stream'> & { model?: ClaudeModelId }
): Promise<ReturnType<Anthropic['messages']['stream']>> {
  const model = params.model || getAnthropicModel()

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const stream = client.messages.stream({
        ...params,
        model,
      })
      return stream
    } catch (error) {
      if ((isRateLimitError(error) || isOverloadedError(error)) && attempt < MAX_RETRIES - 1) {
        const waitTime = getRetryDelay(error, attempt)
        logger.warn('Anthropic rate limited (streaming), retrying', {
          attempt: attempt + 1,
          maxRetries: MAX_RETRIES,
          waitTimeMs: waitTime,
          model,
        })
        await sleep(waitTime)
        continue
      }
      throw error
    }
  }

  throw new Error('Anthropic: Max retries exceeded (streaming)')
}

/**
 * Initialize Anthropic client
 */
export function createAnthropicClient(): Anthropic {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
}

// Lazy-loaded singleton
let _anthropicClient: Anthropic | null = null

/**
 * Get the Anthropic client instance (lazy-loaded)
 */
export function getAnthropicClient(): Anthropic {
  if (!_anthropicClient) {
    _anthropicClient = createAnthropicClient()
  }
  return _anthropicClient
}
