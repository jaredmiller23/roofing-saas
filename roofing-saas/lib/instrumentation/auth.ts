/**
 * Auth Instrumentation
 *
 * Wraps authentication operations with Sentry spans.
 * Auth is called on almost every request, so visibility here is critical.
 */
import * as Sentry from '@sentry/nextjs'
import { recordSpan } from './metrics'

export type AuthOperation =
  | 'get_user'
  | 'get_session'
  | 'get_tenant'
  | 'check_role'
  | 'check_permission'
  | 'refresh_token'

/**
 * Wrap an auth operation with a Sentry span.
 *
 * @example
 * const user = await withAuthSpan('get_user', async () =>
 *   supabase.auth.getUser()
 * )
 *
 * @example
 * const tenantId = await withAuthSpan('get_tenant', async () =>
 *   getUserTenantId(userId)
 * )
 */
export async function withAuthSpan<T>(
  operation: AuthOperation,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  return Sentry.startSpan(
    {
      op: 'auth',
      name: `auth: ${operation}`,
      attributes: {
        'auth.operation': operation,
        ...attributes,
      },
    },
    async (span) => {
      const startTime = Date.now()
      try {
        const result = await fn()
        const duration = Date.now() - startTime
        span.setAttribute('auth.duration_ms', duration)
        span.setStatus({ code: 1 }) // OK

        // Record to local metrics
        recordSpan({
          op: 'auth',
          name: `auth: ${operation}`,
          duration_ms: duration,
          status: 'ok',
          attributes: {
            'auth.operation': operation,
            ...attributes,
          },
        })

        return result
      } catch (error) {
        const duration = Date.now() - startTime
        span.setAttribute('auth.duration_ms', duration)
        span.setStatus({ code: 2, message: String(error) }) // ERROR

        // Record error to local metrics
        recordSpan({
          op: 'auth',
          name: `auth: ${operation}`,
          duration_ms: duration,
          status: 'error',
          attributes: {
            'auth.operation': operation,
            ...attributes,
          },
          error: String(error),
        })

        throw error
      }
    }
  )
}
