/**
 * Database Instrumentation
 *
 * Wraps Supabase queries with Sentry spans for visibility into:
 * - Query execution time
 * - Table being accessed
 * - Operation type (SELECT, INSERT, UPDATE, DELETE)
 */
import * as Sentry from '@sentry/nextjs'
import { recordSpan } from './metrics'

export type DbOperation = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT' | 'RPC'

interface DbSpanOptions {
  /** Additional attributes to attach to the span */
  attributes?: Record<string, string | number | boolean>
}

/**
 * Wrap a Supabase query with a performance span.
 *
 * @example
 * const { data, error } = await withDbSpan('contacts', 'SELECT', async () =>
 *   supabase.from('contacts').select('*').eq('tenant_id', tenantId)
 * )
 *
 * @example With additional attributes
 * const { data } = await withDbSpan('contacts', 'SELECT', async () =>
 *   supabase.from('contacts').select('*').limit(100),
 *   { attributes: { 'db.limit': 100 } }
 * )
 */
export async function withDbSpan<T>(
  table: string,
  operation: DbOperation,
  fn: () => Promise<T>,
  options?: DbSpanOptions
): Promise<T> {
  return Sentry.startSpan(
    {
      op: 'db.query',
      name: `${operation} ${table}`,
      attributes: {
        'db.system': 'postgresql',
        'db.name': 'supabase',
        'db.table': table,
        'db.operation': operation,
        ...options?.attributes,
      },
    },
    async (span) => {
      const startTime = Date.now()
      try {
        const result = await fn()
        const duration = Date.now() - startTime
        span.setAttribute('db.duration_ms', duration)
        span.setStatus({ code: 1 }) // OK

        // Record to local metrics
        recordSpan({
          op: 'db.query',
          name: `${operation} ${table}`,
          duration_ms: duration,
          status: 'ok',
          attributes: {
            'db.table': table,
            'db.operation': operation,
            ...options?.attributes,
          },
        })

        return result
      } catch (error) {
        const duration = Date.now() - startTime
        span.setAttribute('db.duration_ms', duration)
        span.setStatus({ code: 2, message: String(error) }) // ERROR

        // Record error to local metrics
        recordSpan({
          op: 'db.query',
          name: `${operation} ${table}`,
          duration_ms: duration,
          status: 'error',
          attributes: {
            'db.table': table,
            'db.operation': operation,
            ...options?.attributes,
          },
          error: String(error),
        })

        throw error
      }
    }
  )
}

/**
 * Wrap a Supabase RPC call with a performance span.
 *
 * @example
 * const { data } = await withRpcSpan('calculate_metrics', async () =>
 *   supabase.rpc('calculate_metrics', { tenant_id: tenantId })
 * )
 */
export async function withRpcSpan<T>(
  functionName: string,
  fn: () => Promise<T>,
  options?: DbSpanOptions
): Promise<T> {
  return Sentry.startSpan(
    {
      op: 'db.rpc',
      name: `RPC ${functionName}`,
      attributes: {
        'db.system': 'postgresql',
        'db.name': 'supabase',
        'db.rpc.function': functionName,
        ...options?.attributes,
      },
    },
    async (span) => {
      const startTime = Date.now()
      try {
        const result = await fn()
        const duration = Date.now() - startTime
        span.setAttribute('db.duration_ms', duration)
        span.setStatus({ code: 1 })
        return result
      } catch (error) {
        const duration = Date.now() - startTime
        span.setAttribute('db.duration_ms', duration)
        span.setStatus({ code: 2, message: String(error) })
        throw error
      }
    }
  )
}
