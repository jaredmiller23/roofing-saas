/**
 * Request Context - Read auth/tenant info from middleware headers
 *
 * The middleware validates the JWT and looks up tenant context once per request,
 * then passes the results via headers. API routes read from these headers
 * instead of making redundant auth calls.
 *
 * These headers are set by middleware.ts AFTER JWT validation — they are
 * trustworthy and cannot be spoofed by clients (middleware overwrites them).
 */

export interface RequestContext {
  userId: string
  tenantId: string
  role: string
  email: string
}

/**
 * Read auth context from middleware-set headers.
 * Returns null if headers are missing (e.g., request didn't go through middleware).
 */
export function getRequestContext(request: Request): RequestContext | null {
  const userId = request.headers.get('x-user-id')
  const tenantId = request.headers.get('x-tenant-id')

  if (!userId || !tenantId) {
    return null
  }

  return {
    userId,
    tenantId,
    role: request.headers.get('x-user-role') || 'user',
    email: request.headers.get('x-user-email') || '',
  }
}
