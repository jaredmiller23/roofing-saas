/**
 * Request-Scoped Auth Cache
 *
 * Two-tier caching strategy:
 * 1. React.cache() - Automatic memoization for React Server Components
 * 2. AsyncLocalStorage - For API routes and non-React contexts
 *
 * This eliminates redundant Supabase auth calls when the same user/tenant
 * data is needed multiple times in a request lifecycle.
 */
import { AsyncLocalStorage } from 'async_hooks'
import { cache } from 'react'
import type { User } from '@supabase/supabase-js'
import type { UserContext } from './types'

interface RequestCache {
  user?: User | null
  tenantId?: Map<string, string | null> // keyed by userId
  userContext?: Map<string, UserContext | null> // keyed by userId
}

// AsyncLocalStorage for API routes (non-React contexts)
const requestCache = new AsyncLocalStorage<RequestCache>()

/**
 * Run a function with request-scoped caching enabled (for API routes)
 * React Server Components get automatic caching via React.cache()
 *
 * @example
 * // In an API route
 * export async function GET(request: NextRequest) {
 *   return withRequestCache(async () => {
 *     const user = await getCurrentUser() // First call - hits Supabase
 *     // ... later in the same request ...
 *     const user2 = await getCurrentUser() // Cached - instant
 *   })
 * }
 */
export function withRequestCache<T>(fn: () => Promise<T>): Promise<T> {
  const existingStore = requestCache.getStore()
  if (existingStore) {
    // Already in a cache context, just run the function
    return fn()
  }
  // Create new cache context
  return requestCache.run(
    {
      tenantId: new Map(),
      userContext: new Map(),
    },
    fn
  )
}

// ============================================================================
// React.cache() based memoization - works automatically in Server Components
// ============================================================================

/**
 * Memoized getter for cache store - creates one per request via React.cache()
 * This is the "trick" - React.cache() ensures this returns the same object
 * throughout a single request, giving us request-scoped state.
 */
export const getRequestStore = cache((): RequestCache => ({
  tenantId: new Map(),
  userContext: new Map(),
}))

// ============================================================================
// Unified cache access - tries AsyncLocalStorage first, falls back to React.cache()
// ============================================================================

/**
 * Get the active cache store
 * Prefers AsyncLocalStorage (API routes), falls back to React.cache() (Server Components)
 */
function getStore(): RequestCache {
  // Try AsyncLocalStorage first (explicit withRequestCache wrapping)
  const asyncStore = requestCache.getStore()
  if (asyncStore) return asyncStore

  // Fall back to React.cache() (automatic in Server Components)
  return getRequestStore()
}

/**
 * Get cached user or undefined if not cached
 */
export function getCachedUser(): User | null | undefined {
  const store = getStore()
  return store.user
}

/**
 * Cache the user for this request
 */
export function setCachedUser(user: User | null): void {
  const store = getStore()
  store.user = user
}

/**
 * Check if we have a cached user value (even if null)
 */
export function hasCachedUser(): boolean {
  const store = getStore()
  return 'user' in store
}

/**
 * Get cached tenant ID for a user, or undefined if not cached
 */
export function getCachedTenantId(userId: string): string | null | undefined {
  const store = getStore()
  if (!store.tenantId) return undefined
  if (!store.tenantId.has(userId)) return undefined
  return store.tenantId.get(userId)
}

/**
 * Cache the tenant ID for a user
 */
export function setCachedTenantId(userId: string, tenantId: string | null): void {
  const store = getStore()
  if (!store.tenantId) store.tenantId = new Map()
  store.tenantId.set(userId, tenantId)
}

/**
 * Check if we have a cached tenant ID for a user
 */
export function hasCachedTenantId(userId: string): boolean {
  const store = getStore()
  return store.tenantId?.has(userId) ?? false
}

/**
 * Get cached user context for a user, or undefined if not cached
 */
export function getCachedUserContext(userId: string): UserContext | null | undefined {
  const store = getStore()
  if (!store.userContext) return undefined
  if (!store.userContext.has(userId)) return undefined
  return store.userContext.get(userId)
}

/**
 * Cache the user context for a user
 */
export function setCachedUserContext(userId: string, context: UserContext | null): void {
  const store = getStore()
  if (!store.userContext) store.userContext = new Map()
  store.userContext.set(userId, context)
}

/**
 * Check if we have a cached user context for a user
 */
export function hasCachedUserContext(userId: string): boolean {
  const store = getStore()
  return store.userContext?.has(userId) ?? false
}

/**
 * Check if request caching is currently active
 */
export function isRequestCacheActive(): boolean {
  // Always active now due to React.cache() fallback
  return true
}
