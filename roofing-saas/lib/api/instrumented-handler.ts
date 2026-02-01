/**
 * Instrumented API Route Handler
 *
 * Wraps API route handlers with automatic Sentry span instrumentation.
 * Captures request timing, status codes, and errors.
 */
import * as Sentry from '@sentry/nextjs'
import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

type RouteHandler = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<Response>

export interface InstrumentedRouteOptions {
  /** Route name for span (e.g., '/api/contacts') */
  name: string
  /** Additional attributes to add to all spans */
  attributes?: Record<string, string | number | boolean>
}

/**
 * Wrap an API route handler with automatic instrumentation.
 *
 * @example
 * // In app/api/contacts/route.ts
 * import { instrumentedHandler } from '@/lib/api/instrumented-handler'
 *
 * export const GET = instrumentedHandler(
 *   { name: '/api/contacts' },
 *   async (request) => {
 *     // Your existing handler code
 *     const data = await fetchContacts()
 *     return NextResponse.json(data)
 *   }
 * )
 *
 * @example With dynamic route
 * // In app/api/contacts/[id]/route.ts
 * export const GET = instrumentedHandler(
 *   { name: '/api/contacts/[id]' },
 *   async (request, context) => {
 *     const { id } = await context.params
 *     const contact = await fetchContact(id)
 *     return NextResponse.json(contact)
 *   }
 * )
 */
export function instrumentedHandler(
  options: InstrumentedRouteOptions,
  handler: RouteHandler
): RouteHandler {
  return async (
    request: NextRequest,
    context?: { params: Promise<Record<string, string>> }
  ) => {
    const method = request.method
    const startTime = Date.now()

    return Sentry.startSpan(
      {
        op: 'http.server',
        name: `${method} ${options.name}`,
        attributes: {
          'http.method': method,
          'http.route': options.name,
          'http.url': request.url,
          ...options.attributes,
        },
      },
      async (span) => {
        try {
          const response = await handler(request, context)
          const duration = Date.now() - startTime

          span.setAttribute('http.status_code', response.status)
          span.setAttribute('http.duration_ms', duration)
          span.setStatus({ code: response.ok ? 1 : 2 })

          logger.apiResponse(method, options.name, response.status, duration)

          return response
        } catch (error) {
          const duration = Date.now() - startTime
          span.setAttribute('http.duration_ms', duration)
          span.setAttribute('http.status_code', 500)
          span.setStatus({ code: 2, message: String(error) })

          logger.apiError(method, options.name, 500, error as Error)
          Sentry.captureException(error)

          // Re-throw to let Next.js error handling work
          throw error
        }
      }
    )
  }
}

/**
 * Helper to create instrumented handlers for all HTTP methods.
 *
 * @example
 * const handlers = createInstrumentedHandlers('/api/contacts', {
 *   GET: async (request) => { ... },
 *   POST: async (request) => { ... },
 * })
 *
 * export const { GET, POST } = handlers
 */
export function createInstrumentedHandlers(
  routeName: string,
  handlers: Partial<Record<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', RouteHandler>>,
  options?: Omit<InstrumentedRouteOptions, 'name'>
): Partial<Record<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', RouteHandler>> {
  const result: Partial<Record<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', RouteHandler>> = {}

  for (const [method, handler] of Object.entries(handlers)) {
    if (handler) {
      result[method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'] = instrumentedHandler(
        { name: routeName, ...options },
        handler
      )
    }
  }

  return result
}
