/**
 * External API Instrumentation
 *
 * Wraps third-party API calls with Sentry spans for visibility into:
 * - API call duration
 * - Service being called
 * - Operation type
 */
import * as Sentry from '@sentry/nextjs'
import { recordSpan } from './metrics'

export type ExternalService =
  | 'twilio'
  | 'resend'
  | 'quickbooks'
  | 'openai'
  | 'google'
  | 'elevenlabs'
  | 'stripe'
  | 'supabase-auth'

interface ExternalSpanOptions {
  service: ExternalService
  operation: string
  attributes?: Record<string, string | number | boolean>
}

/**
 * Wrap an external API call with a Sentry span.
 *
 * @example
 * const result = await withExternalSpan(
 *   { service: 'twilio', operation: 'send_sms' },
 *   async () => twilioClient.messages.create({ ... })
 * )
 */
export async function withExternalSpan<T>(
  options: ExternalSpanOptions,
  fn: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan(
    {
      op: `http.client.${options.service}`,
      name: `${options.service}: ${options.operation}`,
      attributes: {
        'external.service': options.service,
        'external.operation': options.operation,
        ...options.attributes,
      },
    },
    async (span) => {
      const startTime = Date.now()
      try {
        const result = await fn()
        const duration = Date.now() - startTime
        span.setAttribute('http.duration_ms', duration)
        span.setStatus({ code: 1 }) // OK

        // Record to local metrics
        recordSpan({
          op: `http.client.${options.service}`,
          name: `${options.service}: ${options.operation}`,
          duration_ms: duration,
          status: 'ok',
          attributes: {
            'external.service': options.service,
            'external.operation': options.operation,
            ...options.attributes,
          },
        })

        return result
      } catch (error) {
        const duration = Date.now() - startTime
        span.setAttribute('http.duration_ms', duration)
        span.setStatus({ code: 2, message: String(error) }) // ERROR

        // Record error to local metrics
        recordSpan({
          op: `http.client.${options.service}`,
          name: `${options.service}: ${options.operation}`,
          duration_ms: duration,
          status: 'error',
          attributes: {
            'external.service': options.service,
            'external.operation': options.operation,
            ...options.attributes,
          },
          error: String(error),
        })

        throw error
      }
    }
  )
}

// ============================================================================
// Service-specific convenience wrappers
// ============================================================================

/**
 * Wrap a Twilio API call.
 *
 * @example
 * const message = await twilioSpan('send_sms', async () =>
 *   twilioClient.messages.create({ to, from, body }),
 *   { 'twilio.to_masked': to.slice(-4) }
 * )
 */
export function twilioSpan<T>(
  operation: 'send_sms' | 'make_call' | 'get_recording' | 'download_recording' | 'lookup' | 'verify',
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  return withExternalSpan({ service: 'twilio', operation, attributes }, fn)
}

/**
 * Wrap a Resend email API call.
 *
 * @example
 * const result = await resendSpan('send_email', async () =>
 *   resendClient.emails.send({ ... }),
 *   { 'email.recipient_count': 1 }
 * )
 */
export function resendSpan<T>(
  operation: 'send_email' | 'send_batch',
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  return withExternalSpan({ service: 'resend', operation, attributes }, fn)
}

/**
 * Wrap an OpenAI API call.
 *
 * @example
 * const completion = await openaiSpan('chat_completion', async () =>
 *   openai.chat.completions.create({ ... }),
 *   { 'openai.model': 'gpt-4o', 'openai.message_count': messages.length }
 * )
 */
export function openaiSpan<T>(
  operation: 'chat_completion' | 'embedding' | 'transcription' | 'streaming',
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  return withExternalSpan({ service: 'openai', operation, attributes }, fn)
}

/**
 * Wrap a QuickBooks API call.
 *
 * @example
 * const invoice = await quickbooksSpan('create_invoice', async () =>
 *   qbClient.createInvoice(data),
 *   { 'quickbooks.entity': 'invoice' }
 * )
 */
export function quickbooksSpan<T>(
  operation: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  return withExternalSpan({ service: 'quickbooks', operation, attributes }, fn)
}

/**
 * Wrap a Google API call (Calendar, OAuth, etc).
 *
 * @example
 * const events = await googleSpan('list_events', async () =>
 *   calendar.events.list({ ... })
 * )
 */
export function googleSpan<T>(
  operation: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  return withExternalSpan({ service: 'google', operation, attributes }, fn)
}

/**
 * Wrap a Stripe API call.
 *
 * @example
 * const subscription = await stripeSpan('create_subscription', async () =>
 *   stripe.subscriptions.create({ ... })
 * )
 */
export function stripeSpan<T>(
  operation: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  return withExternalSpan({ service: 'stripe', operation, attributes }, fn)
}
