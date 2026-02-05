/**
 * QuickBooks OAuth State Token Management
 *
 * Provides HMAC-SHA256 signed state tokens for CSRF protection
 * during the OAuth authorization flow.
 *
 * The state is signed with a server-side secret so that:
 * 1. The callback can verify it was issued by this server
 * 2. The payload cannot be forged (knowing user_id + tenant_id is not enough)
 * 3. Replay is limited by the 5-minute timestamp check
 */

import { createHmac } from 'crypto'
import { logger } from '@/lib/logger'

/**
 * Get the HMAC signing secret for state tokens.
 * Falls back to NEXTAUTH_SECRET if QUICKBOOKS_STATE_SECRET is not set.
 */
function getStateSecret(): string {
  const secret = process.env.QUICKBOOKS_STATE_SECRET || process.env.NEXTAUTH_SECRET || ''
  if (!secret) {
    logger.warn('No QUICKBOOKS_STATE_SECRET or NEXTAUTH_SECRET configured for state signing')
  }
  return secret
}

/**
 * Sign a state payload with HMAC-SHA256.
 * Returns a base64url-encoded string containing both data and signature.
 */
export function signState(payload: object): string {
  const secret = getStateSecret()
  const data = JSON.stringify(payload)
  const signature = createHmac('sha256', secret).update(data).digest('hex')
  return Buffer.from(JSON.stringify({ data, signature })).toString('base64url')
}

/**
 * Verify and decode a signed state token.
 * Returns the original payload if valid, null if tampered or invalid.
 */
export function verifyState(state: string): { tenant_id: string; user_id: string; timestamp: number } | null {
  try {
    const secret = getStateSecret()
    const { data, signature } = JSON.parse(Buffer.from(state, 'base64url').toString())
    const expected = createHmac('sha256', secret).update(data).digest('hex')

    if (signature !== expected) {
      logger.warn('State token signature mismatch - possible CSRF attempt')
      return null
    }

    return JSON.parse(data)
  } catch {
    return null
  }
}
