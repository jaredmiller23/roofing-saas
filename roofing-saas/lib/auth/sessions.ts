/**
 * User Sessions Management
 *
 * Utilities for tracking, viewing, and revoking user sessions.
 * Used for security features like "sign out everywhere" and session monitoring.
 */

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getUserTenantId } from './session'
import { headers } from 'next/headers'
import crypto from 'crypto'

export interface UserSession {
  id: string
  user_id: string
  tenant_id: string
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
  is_current: boolean | null
  created_at: string | null
  last_active_at: string | null
  expires_at: string
  revoked_at: string | null
}

export interface ParsedUserAgent {
  browser: string | null
  browserVersion: string | null
  os: string | null
  osVersion: string | null
  deviceType: 'desktop' | 'mobile' | 'tablet' | null
}

/**
 * Parse user agent string to extract browser, OS, and device info
 */
export function parseUserAgent(userAgent: string | null): ParsedUserAgent {
  if (!userAgent) {
    return { browser: null, browserVersion: null, os: null, osVersion: null, deviceType: null }
  }

  const ua = userAgent.toLowerCase()

  // Detect device type
  let deviceType: 'desktop' | 'mobile' | 'tablet' | null = 'desktop'
  if (/tablet|ipad/i.test(ua)) {
    deviceType = 'tablet'
  } else if (/mobile|iphone|android.*mobile|windows phone/i.test(ua)) {
    deviceType = 'mobile'
  }

  // Detect browser
  let browser: string | null = null
  let browserVersion: string | null = null

  if (/edg/i.test(ua)) {
    browser = 'Microsoft Edge'
    const match = ua.match(/edg\/(\d+)/)
    browserVersion = match ? match[1] : null
  } else if (/chrome/i.test(ua) && !/chromium/i.test(ua)) {
    browser = 'Chrome'
    const match = ua.match(/chrome\/(\d+)/)
    browserVersion = match ? match[1] : null
  } else if (/firefox/i.test(ua)) {
    browser = 'Firefox'
    const match = ua.match(/firefox\/(\d+)/)
    browserVersion = match ? match[1] : null
  } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    browser = 'Safari'
    const match = ua.match(/version\/(\d+)/)
    browserVersion = match ? match[1] : null
  }

  // Detect OS
  let os: string | null = null
  let osVersion: string | null = null

  if (/windows nt 10/i.test(ua)) {
    os = 'Windows'
    osVersion = '10/11'
  } else if (/windows/i.test(ua)) {
    os = 'Windows'
  } else if (/mac os x/i.test(ua)) {
    os = 'macOS'
    const match = ua.match(/mac os x (\d+[._]\d+)/)
    osVersion = match ? match[1].replace('_', '.') : null
  } else if (/iphone|ipad/i.test(ua)) {
    os = 'iOS'
    const match = ua.match(/os (\d+[._]\d+)/)
    osVersion = match ? match[1].replace('_', '.') : null
  } else if (/android/i.test(ua)) {
    os = 'Android'
    const match = ua.match(/android (\d+)/)
    osVersion = match ? match[1] : null
  } else if (/linux/i.test(ua)) {
    os = 'Linux'
  }

  return { browser, browserVersion, os, osVersion, deviceType }
}

/**
 * Hash a session token for storage
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Get the current request's IP address and user agent
 */
export async function getRequestContext(): Promise<{
  ip: string | null
  userAgent: string | null
}> {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             headersList.get('x-real-ip') ||
             null
  const userAgent = headersList.get('user-agent')

  return { ip, userAgent }
}

/**
 * Create a new session record
 */
export async function createSessionRecord(
  userId: string,
  sessionToken: string,
  expiresAt: Date
): Promise<UserSession | null> {
  const tenantId = await getUserTenantId(userId)
  if (!tenantId) return null

  const { ip, userAgent } = await getRequestContext()
  const parsed = parseUserAgent(userAgent)

  // Use admin client for insert (bypasses RLS)
  const supabaseAdmin = await createAdminClient()

  const { data, error } = await supabaseAdmin
    .from('user_sessions')
    .insert({
      user_id: userId,
      tenant_id: tenantId,
      session_token_hash: hashSessionToken(sessionToken),
      ip_address: ip,
      user_agent: userAgent,
      device_type: parsed.deviceType,
      browser: parsed.browser,
      browser_version: parsed.browserVersion,
      os: parsed.os,
      os_version: parsed.osVersion,
      is_current: true,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create session record:', error)
    return null
  }

  return data
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<UserSession[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .order('last_active_at', { ascending: false })

  if (error) {
    console.error('Failed to get user sessions:', error)
    return []
  }

  return (data || []) as unknown as UserSession[]
}

/**
 * Revoke a specific session
 */
export async function revokeSession(
  sessionId: string,
  reason: string = 'user_action'
): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('user_sessions')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_reason: reason,
    })
    .eq('id', sessionId)

  if (error) {
    console.error('Failed to revoke session:', error)
    return false
  }

  return true
}

/**
 * Revoke all sessions except the current one
 */
export async function revokeAllOtherSessions(
  userId: string,
  currentSessionToken?: string
): Promise<number> {
  const supabase = await createClient()

  // Build the query
  let query = supabase
    .from('user_sessions')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_reason: 'user_action',
    })
    .eq('user_id', userId)
    .is('revoked_at', null)

  // Exclude current session if provided
  if (currentSessionToken) {
    const hash = hashSessionToken(currentSessionToken)
    query = query.neq('session_token_hash', hash)
  }

  const { data, error } = await query.select()

  if (error) {
    console.error('Failed to revoke sessions:', error)
    return 0
  }

  return data?.length || 0
}

/**
 * Update session's last active timestamp
 */
export async function updateSessionActivity(sessionTokenHash: string): Promise<void> {
  const supabase = await createClient()

  await supabase
    .from('user_sessions')
    .update({ last_active_at: new Date().toISOString() })
    .eq('session_token_hash', sessionTokenHash)
    .is('revoked_at', null)
}

/**
 * Mark a session as the current one
 */
export async function markSessionAsCurrent(
  userId: string,
  sessionTokenHash: string
): Promise<void> {
  const supabase = await createClient()

  // First, unmark all sessions as current
  await supabase
    .from('user_sessions')
    .update({ is_current: false })
    .eq('user_id', userId)

  // Then mark the current session
  await supabase
    .from('user_sessions')
    .update({ is_current: true })
    .eq('session_token_hash', sessionTokenHash)
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  // Use admin client for cleanup
  const supabaseAdmin = await createAdminClient()

  const { data, error } = await supabaseAdmin
    .from('user_sessions')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_reason: 'expired',
    })
    .lt('expires_at', new Date().toISOString())
    .is('revoked_at', null)
    .select()

  if (error) {
    console.error('Failed to cleanup expired sessions:', error)
    return 0
  }

  return data?.length || 0
}
