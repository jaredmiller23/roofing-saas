/**
 * Multi-Factor Authentication (MFA) Utilities
 *
 * Wrapper around Supabase's built-in MFA APIs for TOTP-based authentication.
 * Compatible with Google Authenticator, Authy, and other TOTP apps.
 */

import { createClient } from '@/lib/supabase/server'

export interface MFAEnrollmentResult {
  factorId: string
  qrCode: string // Data URL for QR code
  secret: string // TOTP secret (for manual entry)
  uri: string    // otpauth:// URI
}

export interface MFAVerifyResult {
  success: boolean
  error?: string
}

export interface MFAFactor {
  id: string
  type: 'totp'
  status: 'verified' | 'unverified'
  friendlyName?: string
  createdAt: string
  updatedAt: string
}

export interface MFAStatus {
  enabled: boolean
  factors: MFAFactor[]
}

/**
 * Get current MFA status for the authenticated user
 */
export async function getMFAStatus(): Promise<MFAStatus> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.mfa.listFactors()

  if (error) {
    throw new Error(`Failed to get MFA status: ${error.message}`)
  }

  const verifiedFactors = data.totp.filter(f => f.status === 'verified')

  return {
    enabled: verifiedFactors.length > 0,
    factors: data.totp.map(f => ({
      id: f.id,
      type: 'totp' as const,
      status: f.status,
      friendlyName: f.friendly_name || undefined,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
    })),
  }
}

/**
 * Start MFA enrollment - generates TOTP secret and QR code
 */
export async function enrollMFA(friendlyName?: string): Promise<MFAEnrollmentResult> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: friendlyName || 'Authenticator App',
  })

  if (error) {
    throw new Error(`Failed to enroll MFA: ${error.message}`)
  }

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  }
}

/**
 * Verify TOTP code and complete MFA enrollment
 */
export async function verifyMFAEnrollment(
  factorId: string,
  code: string
): Promise<MFAVerifyResult> {
  const supabase = await createClient()

  // First, create a challenge
  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  })

  if (challengeError) {
    return { success: false, error: challengeError.message }
  }

  // Then verify the code
  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  })

  if (verifyError) {
    return { success: false, error: verifyError.message }
  }

  return { success: true }
}

/**
 * Disable MFA by removing the factor
 */
export async function disableMFA(factorId: string): Promise<MFAVerifyResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.mfa.unenroll({ factorId })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Create an MFA challenge for login verification
 */
export async function createMFAChallenge(factorId: string): Promise<{
  challengeId: string
  expiresAt: string
}> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.mfa.challenge({ factorId })

  if (error) {
    throw new Error(`Failed to create MFA challenge: ${error.message}`)
  }

  return {
    challengeId: data.id,
    expiresAt: data.expires_at.toString(),
  }
}

/**
 * Verify an MFA challenge during login
 */
export async function verifyMFAChallenge(
  factorId: string,
  challengeId: string,
  code: string
): Promise<MFAVerifyResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Get the current authentication assurance level
 */
export async function getAssuranceLevel() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  if (error) {
    throw new Error(`Failed to get assurance level: ${error.message}`)
  }

  return {
    currentLevel: data.currentLevel as 'aal1' | 'aal2',
    nextLevel: data.nextLevel as 'aal1' | 'aal2' | null,
    currentAuthenticationMethods: data.currentAuthenticationMethods,
  }
}

/**
 * Generate recovery codes for MFA
 * Note: Supabase doesn't have built-in recovery codes, so we generate and store them
 * In a production system, these should be hashed before storage
 */
export function generateRecoveryCodes(count: number = 10): string[] {
  const codes: string[] = []
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

  for (let i = 0; i < count; i++) {
    let code = ''
    for (let j = 0; j < 8; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    // Format as XXXX-XXXX
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`)
  }

  return codes
}
