/**
 * Resilient OpenAI Client
 *
 * Provides production-grade OpenAI integration with:
 * - Configurable model via OPENAI_MODEL environment variable
 * - Automatic retry with exponential backoff for rate limits
 * - Proper logging of retry attempts
 *
 * This addresses rate limiting (429 errors) which can happen in both
 * production and test environments.
 */

import OpenAI from 'openai'
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  ChatCompletion,
} from 'openai/resources/chat/completions'
import { logger } from '@/lib/logger'

// Default to gpt-4o in production, but allow override for testing
const DEFAULT_MODEL = 'gpt-4o'
const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000 // Start with 1 second

/**
 * Get the configured OpenAI model from environment
 * Default: gpt-4o (production)
 * Test: gpt-4o-mini (6.7x higher rate limit)
 */
export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL || DEFAULT_MODEL
}

/**
 * Check if error is a rate limit error (429)
 */
function isRateLimitError(error: unknown): boolean {
  return (
    error instanceof OpenAI.APIError &&
    error.status === 429
  )
}

/**
 * Parse retry-after header from rate limit response
 */
function getRetryDelay(error: unknown, attempt: number): number {
  // Try to get retry-after from headers if it's an API error
  if (error instanceof OpenAI.APIError) {
    const retryAfterHeader = error.headers?.['retry-after']
    if (retryAfterHeader) {
      const seconds = parseInt(retryAfterHeader, 10)
      if (!isNaN(seconds)) {
        return seconds * 1000
      }
    }
  }

  // Fallback to exponential backoff: 1s, 2s, 4s
  return Math.pow(2, attempt) * BASE_DELAY_MS
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Create a chat completion with automatic retry on rate limits
 *
 * @param openai - OpenAI client instance
 * @param params - Chat completion parameters (model will be overridden by env config)
 * @returns Chat completion response
 * @throws OpenAI.APIError if all retries fail or non-rate-limit error occurs
 */
export async function createChatCompletion(
  openai: OpenAI,
  params: Omit<ChatCompletionCreateParamsNonStreaming, 'model'>
): Promise<ChatCompletion> {
  const model = getOpenAIModel()

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await openai.chat.completions.create({
        ...params,
        model,
      })
    } catch (error) {
      if (isRateLimitError(error) && attempt < MAX_RETRIES - 1) {
        const waitTime = getRetryDelay(error, attempt)

        logger.warn('OpenAI rate limited, retrying', {
          attempt: attempt + 1,
          maxRetries: MAX_RETRIES,
          waitTimeMs: waitTime,
          model,
        })

        await sleep(waitTime)
        continue
      }

      // Re-throw non-rate-limit errors or if we've exhausted retries
      throw error
    }
  }

  // This should never be reached due to the throw in the loop,
  // but TypeScript needs it for type safety
  throw new Error('OpenAI: Max retries exceeded')
}

/**
 * Create a streaming chat completion with automatic retry on rate limits
 *
 * Note: Retry only happens before streaming starts. Once streaming begins,
 * errors are not retried (the stream would need to restart from scratch).
 *
 * @param openai - OpenAI client instance
 * @param params - Chat completion parameters (model will be overridden by env config)
 * @returns Async iterable of chat completion chunks
 * @throws OpenAI.APIError if all retries fail or non-rate-limit error occurs
 */
export async function createStreamingChatCompletion(
  openai: OpenAI,
  params: Omit<ChatCompletionCreateParamsStreaming, 'model' | 'stream'>
): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
  const model = getOpenAIModel()

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const stream = await openai.chat.completions.create({
        ...params,
        model,
        stream: true,
      })

      return stream
    } catch (error) {
      if (isRateLimitError(error) && attempt < MAX_RETRIES - 1) {
        const waitTime = getRetryDelay(error, attempt)

        logger.warn('OpenAI rate limited (streaming), retrying', {
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

  throw new Error('OpenAI: Max retries exceeded (streaming)')
}

/**
 * Initialize OpenAI client
 * Centralized to ensure consistent configuration
 */
export function createOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

// Export a default client instance for convenience
export const openai = createOpenAIClient()
