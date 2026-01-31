/**
 * Login Activity Log Utilities
 *
 * Tracks login attempts, failures, and authentication events for security auditing.
 */

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getUserTenantId } from './session'
import { getRequestContext, parseUserAgent } from './sessions'

export type LoginEventType =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'password_reset'
  | 'password_changed'
  | 'mfa_challenge'
  | 'mfa_verified'
  | 'mfa_failed'
  | 'account_locked'
  | 'account_unlocked'

export interface LoginActivity {
  id: string
  tenant_id: string | null
  user_id: string | null
  email: string
  event_type: LoginEventType
  ip_address: string | null
  user_agent: string | null
  device_type: string | null
  browser: string | null
  browser_version: string | null
  os: string | null
  os_version: string | null
  location_city: string | null
  location_region: string | null
  location_country: string | null
  failure_reason: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface LogLoginAttemptParams {
  email: string
  userId?: string | null
  eventType: LoginEventType
  failureReason?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Log a login attempt or authentication event
 */
export async function logLoginAttempt(params: LogLoginAttemptParams): Promise<void> {
  const { email, userId, eventType, failureReason, metadata } = params

  try {
    const { ip, userAgent } = await getRequestContext()
    const parsed = parseUserAgent(userAgent)

    // Get tenant ID if user ID is provided
    let tenantId: string | null = null
    if (userId) {
      tenantId = await getUserTenantId(userId)
    }

    // Use admin client for insert (bypasses RLS)
    const supabaseAdmin = await createAdminClient()

    await supabaseAdmin.from('login_activity').insert({
      tenant_id: tenantId,
      user_id: userId || null,
      email,
      event_type: eventType,
      ip_address: ip,
      user_agent: userAgent,
      device_type: parsed.deviceType,
      browser: parsed.browser,
      browser_version: parsed.browserVersion,
      os: parsed.os,
      os_version: parsed.osVersion,
      failure_reason: failureReason || null,
      metadata: (metadata || {}) as import('@/lib/types/database.types').Json,
    })
  } catch (error) {
    // Don't throw - logging should not break the auth flow
    console.error('Failed to log login activity:', error)
  }
}

/**
 * Get login history for a user
 */
export async function getLoginHistory(
  userId: string,
  options: {
    limit?: number
    offset?: number
    eventTypes?: LoginEventType[]
  } = {}
): Promise<{ activities: LoginActivity[]; total: number }> {
  const { limit = 50, offset = 0, eventTypes } = options

  const supabase = await createClient()

  let query = supabase
    .from('login_activity')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (eventTypes && eventTypes.length > 0) {
    query = query.in('event_type', eventTypes)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('Failed to get login history:', error)
    return { activities: [], total: 0 }
  }

  return {
    activities: (data || []) as LoginActivity[],
    total: count || 0,
  }
}

/**
 * Get recent failed login attempts for an email (for rate limiting)
 */
export async function getRecentFailedAttempts(
  email: string,
  windowMinutes: number = 15
): Promise<number> {
  const supabaseAdmin = await createAdminClient()

  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()

  const { count, error } = await supabaseAdmin
    .from('login_activity')
    .select('*', { count: 'exact', head: true })
    .eq('email', email)
    .eq('event_type', 'login_failed')
    .gte('created_at', windowStart)

  if (error) {
    console.error('Failed to get failed attempts:', error)
    return 0
  }

  return count || 0
}

/**
 * Check if account should be temporarily locked due to failed attempts
 */
export async function shouldLockAccount(
  email: string,
  maxAttempts: number = 5,
  windowMinutes: number = 15
): Promise<boolean> {
  const failedAttempts = await getRecentFailedAttempts(email, windowMinutes)
  return failedAttempts >= maxAttempts
}

/**
 * Get suspicious login attempts (different location/device)
 */
export async function getSuspiciousActivities(
  userId: string,
  limit: number = 10
): Promise<LoginActivity[]> {
  const supabase = await createClient()

  // Get user's most common login characteristics
  const { data: history } = await supabase
    .from('login_activity')
    .select('ip_address, browser, os, location_country')
    .eq('user_id', userId)
    .eq('event_type', 'login_success')
    .order('created_at', { ascending: false })
    .limit(20)

  if (!history || history.length < 3) {
    return [] // Not enough history to determine suspicious activity
  }

  // Find most common values
  const ipCounts = new Map<string, number>()
  const browserCounts = new Map<string, number>()
  const countryCounts = new Map<string, number>()

  history.forEach(h => {
    if (h.ip_address) {
      ipCounts.set(h.ip_address, (ipCounts.get(h.ip_address) || 0) + 1)
    }
    if (h.browser) {
      browserCounts.set(h.browser, (browserCounts.get(h.browser) || 0) + 1)
    }
    if (h.location_country) {
      countryCounts.set(h.location_country, (countryCounts.get(h.location_country) || 0) + 1)
    }
  })

  // Common values (appear in more than 50% of logins)
  const threshold = history.length * 0.5
  const commonBrowsers = [...browserCounts.entries()]
    .filter(([, count]) => count >= threshold)
    .map(([browser]) => browser)
  const commonCountries = [...countryCounts.entries()]
    .filter(([, count]) => count >= threshold)
    .map(([country]) => country)

  // Get recent logins that don't match common patterns
  const { data: suspicious } = await supabase
    .from('login_activity')
    .select('*')
    .eq('user_id', userId)
    .eq('event_type', 'login_success')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!suspicious) return []

  // Filter for suspicious entries
  return suspicious.filter(activity => {
    const unusualBrowser = activity.browser && !commonBrowsers.includes(activity.browser)
    const unusualCountry = activity.location_country && !commonCountries.includes(activity.location_country)
    return unusualBrowser || unusualCountry
  }) as LoginActivity[]
}

/**
 * Get event type display label
 */
export function getEventTypeLabel(eventType: LoginEventType): string {
  const labels: Record<LoginEventType, string> = {
    login_success: 'Signed in',
    login_failed: 'Sign in failed',
    logout: 'Signed out',
    password_reset: 'Password reset requested',
    password_changed: 'Password changed',
    mfa_challenge: 'MFA challenge sent',
    mfa_verified: 'MFA verified',
    mfa_failed: 'MFA verification failed',
    account_locked: 'Account locked',
    account_unlocked: 'Account unlocked',
  }
  return labels[eventType] || eventType
}

/**
 * Check if event type indicates a security concern
 */
export function isSecurityConcern(eventType: LoginEventType): boolean {
  return [
    'login_failed',
    'mfa_failed',
    'account_locked',
  ].includes(eventType)
}
