import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

/**
 * Get the current authenticated user
 * Returns null if no user is authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

/**
 * Get user from Authorization Bearer token
 * Supports programmatic API access (CLI, scripts, tests)
 *
 * Usage in API routes:
 * ```typescript
 * const user = await getCurrentUserFromRequest(request) ?? await getCurrentUser()
 * ```
 */
export async function getCurrentUserFromRequest(request: NextRequest): Promise<User | null> {
  const authHeader = request.headers.get('authorization')

  if (!authHeader?.toLowerCase().startsWith('bearer ')) {
    return null
  }

  const token = authHeader.substring(7)

  // Validate token directly against Supabase auth endpoint
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseKey,
      },
    })

    if (!response.ok) {
      return null
    }

    const user = await response.json()
    return user as User
  } catch {
    return null
  }
}

/**
 * Get the current user's session
 * Returns null if no active session
 */
export async function getSession() {
  const supabase = await createClient()

  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) {
    return null
  }

  return session
}

/**
 * Require authentication - throws if no user
 * Use in Server Components or Server Actions that require auth
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Unauthorized - please sign in')
  }

  return user
}

/**
 * Get user's tenant ID from tenant_users table
 * Returns null if user is not associated with a tenant
 *
 * NOTE: If user is in multiple tenants, returns the most recently joined one.
 * This ensures users see their latest/primary tenant by default.
 * For users needing to switch tenants, a tenant switcher UI would be required.
 */
export async function getUserTenantId(userId: string): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0) {
    return null
  }

  return data[0].tenant_id
}

/**
 * Get user's tenant ID using service role (bypasses RLS)
 * Use this when authenticating via Bearer token where RLS won't work
 */
export async function getUserTenantIdAdmin(userId: string): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || ''

  if (!serviceKey) {
    console.error('[Auth] Service role key not configured')
    return null
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/tenant_users?select=tenant_id&user_id=eq.${userId}&status=eq.active&order=joined_at.desc&limit=1`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    )

    if (!response.ok) {
      console.error('[Auth] Tenant lookup failed:', response.status)
      return null
    }

    const data = await response.json()
    if (!data || data.length === 0) {
      return null
    }

    return data[0].tenant_id
  } catch (err) {
    console.error('[Auth] Tenant lookup error:', err)
    return null
  }
}

/**
 * Check if user has a specific role in their tenant
 * NOTE: Checks the most recently joined active tenant if user is in multiple tenants
 */
export async function hasRole(userId: string, role: string): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenant_users')
    .select('role')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0) {
    return false
  }

  return data[0].role === role
}

/**
 * Check if user is admin in their tenant
 * Owners also have admin-level privileges
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId)
  return role === 'admin' || role === 'owner'
}

/**
 * Get user's role in their tenant
 * Returns null if user is not associated with a tenant
 * NOTE: Returns role from most recently joined active tenant if user is in multiple tenants
 */
export async function getUserRole(userId: string): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenant_users')
    .select('role')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0) {
    return null
  }

  return data[0].role
}

export type UserStatus = 'active' | 'deactivated' | 'suspended' | 'pending'

export interface UserContext {
  tenantId: string
  role: string
  status: UserStatus
}

/**
 * Get user's full tenant context in a single query
 * Returns tenantId, role, and status from the most recently joined active tenant.
 * Use this instead of calling getUserTenantId + getUserRole + getUserStatus separately.
 */
export async function getUserContext(userId: string): Promise<UserContext | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenant_users')
    .select('tenant_id, role, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0) {
    return null
  }

  return {
    tenantId: data[0].tenant_id,
    role: data[0].role,
    status: (data[0].status as UserStatus) || 'active',
  }
}

/**
 * Get user's status in their tenant
 * Returns null if user is not associated with a tenant
 * NOTE: Returns status from most recently joined tenant if user is in multiple tenants
 */
export async function getUserStatus(userId: string): Promise<UserStatus | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenant_users')
    .select('status')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0) {
    return null
  }

  return (data[0].status as UserStatus) || 'active'
}

/**
 * Check if user is active (not deactivated, suspended, or pending)
 */
export async function isUserActive(userId: string): Promise<boolean> {
  const status = await getUserStatus(userId)
  return status === 'active' || status === null // null = legacy user without status, treat as active
}

/**
 * Require active user - throws if user is deactivated
 * Use in API routes to block deactivated users
 */
export async function requireActiveUser(userId: string): Promise<void> {
  const status = await getUserStatus(userId)

  if (status === 'deactivated') {
    throw new Error('Your account has been deactivated. Please contact an administrator.')
  }

  if (status === 'suspended') {
    throw new Error('Your account has been suspended. Please contact an administrator.')
  }

  if (status === 'pending') {
    throw new Error('Your account is pending activation.')
  }
}
