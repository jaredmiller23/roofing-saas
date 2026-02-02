/**
 * Auth Wrapper for API Routes
 *
 * Combines withRequestCache() + auth validation in a single wrapper.
 * This ensures API routes benefit from request-scoped auth caching.
 *
 * Without this wrapper, API routes call getCurrentUser() and getUserTenantId()
 * separately, each hitting Supabase because React.cache() doesn't work in
 * Node.js async contexts (only in React Server Components).
 *
 * @example
 * // For routes without params (e.g., /api/contacts)
 * export const GET = withAuth(async (request, { user, tenantId }) => {
 *   // ...
 * })
 *
 * // For routes with params (e.g., /api/contacts/[id])
 * export const GET = withAuthParams(async (request, { user, tenantId }, { params }) => {
 *   const { id } = await params
 *   // ...
 * })
 */
import { NextRequest, NextResponse } from 'next/server'
import { withRequestCache } from './request-context'
import { getCurrentUser, getUserTenantId } from './session'
import type { User } from '@supabase/supabase-js'

export interface AuthContext {
  user: User
  userId: string
  tenantId: string
}

// Next.js route context type for routes with dynamic params
type RouteContext = { params: Promise<Record<string, string>> }

/**
 * Handler type for routes without params (e.g., /api/contacts)
 */
type AuthHandler = (
  request: NextRequest,
  auth: AuthContext
) => Promise<Response>

/**
 * Handler type for routes with params (e.g., /api/contacts/[id])
 */
type AuthHandlerWithParams = (
  request: NextRequest,
  auth: AuthContext,
  context: RouteContext
) => Promise<Response>

/**
 * Wrap an API route handler (without params) with auth caching and validation.
 *
 * Benefits:
 * - Enables AsyncLocalStorage-based request caching
 * - Validates user authentication
 * - Validates tenant association
 * - Provides typed auth context to handler
 */
export function withAuth(handler: AuthHandler) {
  return async (request: NextRequest): Promise<Response> => {
    return withRequestCache(async () => {
      const user = await getCurrentUser()
      if (!user) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
          { status: 401 }
        )
      }

      const tenantId = await getUserTenantId(user.id)
      if (!tenantId) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'User is not associated with a tenant' } },
          { status: 403 }
        )
      }

      return handler(request, { user, userId: user.id, tenantId })
    })
  }
}

/**
 * Wrap an API route handler (with params) with auth caching and validation.
 * Use this for routes like /api/contacts/[id] that have dynamic segments.
 *
 * @example
 * export const GET = withAuthParams(async (request, { tenantId }, { params }) => {
 *   const { id } = await params
 *   // ...
 * })
 */
export function withAuthParams(handler: AuthHandlerWithParams) {
  return async (
    request: NextRequest,
    context: RouteContext
  ): Promise<Response> => {
    return withRequestCache(async () => {
      const user = await getCurrentUser()
      if (!user) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
          { status: 401 }
        )
      }

      const tenantId = await getUserTenantId(user.id)
      if (!tenantId) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'User is not associated with a tenant' } },
          { status: 403 }
        )
      }

      return handler(request, { user, userId: user.id, tenantId }, context)
    })
  }
}

/**
 * Optional auth wrapper - allows unauthenticated requests through.
 * Use for routes that have different behavior for logged-in vs anonymous users.
 */
export function withOptionalAuth(
  handler: (request: NextRequest, auth: AuthContext | null) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    return withRequestCache(async () => {
      const user = await getCurrentUser()
      if (!user) {
        return handler(request, null)
      }

      const tenantId = await getUserTenantId(user.id)
      if (!tenantId) {
        // User exists but no tenant - still pass auth context without tenantId
        return handler(request, null)
      }

      return handler(request, { user, userId: user.id, tenantId })
    })
  }
}
