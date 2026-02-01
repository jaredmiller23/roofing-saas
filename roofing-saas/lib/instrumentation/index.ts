/**
 * Core Instrumentation Utilities
 *
 * Provides Sentry span wrappers for performance monitoring.
 * All operations (DB, external APIs, auth) use these primitives.
 *
 * Also records to local metrics file for Claude-accessible analysis.
 */
import * as Sentry from '@sentry/nextjs'
import { recordSpan } from './metrics'

export interface SpanOptions {
  /** Operation type (e.g., 'db.query', 'http.client', 'auth') */
  op: string
  /** Human-readable description */
  description: string
  /** Additional span attributes */
  attributes?: Record<string, string | number | boolean>
}

/**
 * Wrap an async function with a Sentry span.
 * Automatically captures errors and sets span status.
 *
 * @example
 * const result = await withSpan(
 *   { op: 'custom', description: 'Process data' },
 *   async () => processData(input)
 * )
 */
export async function withSpan<T>(
  options: SpanOptions,
  fn: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan(
    {
      op: options.op,
      name: options.description,
      attributes: options.attributes,
    },
    async (span) => {
      const startTime = Date.now()
      try {
        const result = await fn()
        const duration = Date.now() - startTime
        span.setAttribute('duration_ms', duration)
        span.setStatus({ code: 1 }) // OK

        // Record to local metrics
        recordSpan({
          op: options.op,
          name: options.description,
          duration_ms: duration,
          status: 'ok',
          attributes: options.attributes || {},
        })

        return result
      } catch (error) {
        const duration = Date.now() - startTime
        span.setAttribute('duration_ms', duration)
        span.setStatus({ code: 2, message: String(error) }) // ERROR

        // Record error to local metrics
        recordSpan({
          op: options.op,
          name: options.description,
          duration_ms: duration,
          status: 'error',
          attributes: options.attributes || {},
          error: String(error),
        })

        throw error
      }
    }
  )
}

/**
 * Sync version for non-async operations.
 * Use sparingly - most operations should be async.
 */
export function withSpanSync<T>(options: SpanOptions, fn: () => T): T {
  return Sentry.startSpan(
    {
      op: options.op,
      name: options.description,
      attributes: options.attributes,
    },
    (span) => {
      const startTime = Date.now()
      try {
        const result = fn()
        const duration = Date.now() - startTime
        span.setAttribute('duration_ms', duration)
        span.setStatus({ code: 1 })
        return result
      } catch (error) {
        const duration = Date.now() - startTime
        span.setAttribute('duration_ms', duration)
        span.setStatus({ code: 2, message: String(error) })
        throw error
      }
    }
  )
}

// Re-export specialized span utilities
export { withDbSpan } from './db'
export {
  withExternalSpan,
  twilioSpan,
  resendSpan,
  openaiSpan,
  quickbooksSpan,
  googleSpan,
  stripeSpan,
} from './external'
export { withAuthSpan } from './auth'
