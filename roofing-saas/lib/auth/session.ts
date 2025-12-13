import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

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
 */
export async function getUserTenantId(userId: string): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return data.tenant_id
}

/**
 * Check if user has a specific role in their tenant
 */
export async function hasRole(userId: string, role: string): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenant_users')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return false
  }

  return data.role === role
}

/**
 * Check if user is admin in their tenant
 */
export async function isAdmin(userId: string): Promise<boolean> {
  return hasRole(userId, 'admin')
}

/**
 * Get user's role in their tenant
 * Returns null if user is not associated with a tenant
 */
export async function getUserRole(userId: string): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenant_users')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return data.role
}

export type UserStatus = 'active' | 'deactivated' | 'suspended' | 'pending'

/**
 * Get user's status in their tenant
 * Returns null if user is not associated with a tenant
 */
export async function getUserStatus(userId: string): Promise<UserStatus | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenant_users')
    .select('status')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return (data.status as UserStatus) || 'active'
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
