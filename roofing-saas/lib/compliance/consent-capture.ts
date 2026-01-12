/**
 * Consent Capture Service
 * Captures and stores TCPA-compliant consent proof
 *
 * CRITICAL FOR LAWSUIT DEFENSE:
 * - IP address proves WHO gave consent
 * - Timestamp proves WHEN consent was given
 * - Method proves HOW consent was obtained
 * - Legal text proves WHAT they agreed to
 *
 * FCC/FTC Requirements:
 * - Prior Express Written Consent (PEWC) required for autodialed calls
 * - Must retain consent proof for 5+ years (TCPA statute of limitations + buffer)
 * - Must be able to produce proof if challenged in court
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { headers } from 'next/headers'

export type ConsentMethod = 'web_form' | 'verbal' | 'written' | 'sms' | 'electronic_signature'
export type ConsentType = 'call' | 'sms' | 'recording'

export interface ConsentCaptureParams {
  contactId: string
  tenantId: string
  consentType: ConsentType
  method: ConsentMethod
  legalText: string
  formVersion?: string
  userId?: string
}

export interface ConsentProof {
  contactId: string
  consentType: ConsentType
  method: ConsentMethod
  timestamp: string
  ipAddress: string
  userAgent: string
  formVersion: string
  legalText: string
}

export interface ConsentCaptureResult {
  success: boolean
  proof?: ConsentProof
  error?: string
}

/**
 * Extract IP address from request headers
 * Handles various proxy configurations (Vercel, Cloudflare, etc.)
 */
export async function extractIpAddress(): Promise<string> {
  try {
    const headersList = await headers()

    // Try various headers in order of reliability
    const forwardedFor = headersList.get('x-forwarded-for')
    if (forwardedFor) {
      // x-forwarded-for can contain multiple IPs: client, proxy1, proxy2
      // First one is the original client
      return forwardedFor.split(',')[0].trim()
    }

    const realIp = headersList.get('x-real-ip')
    if (realIp) {
      return realIp.trim()
    }

    // Vercel-specific
    const vercelIp = headersList.get('x-vercel-forwarded-for')
    if (vercelIp) {
      return vercelIp.split(',')[0].trim()
    }

    // Cloudflare-specific
    const cfIp = headersList.get('cf-connecting-ip')
    if (cfIp) {
      return cfIp.trim()
    }

    return 'unknown'
  } catch (error) {
    logger.error('Error extracting IP address', { error })
    return 'error'
  }
}

/**
 * Extract user agent from request headers
 */
export async function extractUserAgent(): Promise<string> {
  try {
    const headersList = await headers()
    return headersList.get('user-agent') || 'unknown'
  } catch (error) {
    logger.error('Error extracting user agent', { error })
    return 'error'
  }
}

/**
 * Capture call consent with full TCPA proof
 * Required: IP address, timestamp, method, legal text acknowledgment
 *
 * @param params - Consent capture parameters
 * @returns Result with consent proof if successful
 */
export async function captureCallConsent(
  params: ConsentCaptureParams
): Promise<ConsentCaptureResult> {
  const { contactId, tenantId, consentType, method, legalText, formVersion, userId } = params

  try {
    const supabase = await createClient()

    // Extract request metadata for proof
    const ipAddress = await extractIpAddress()
    const userAgent = await extractUserAgent()
    const timestamp = new Date().toISOString()
    const version = formVersion || '1.0'

    logger.info('Capturing consent', {
      contactId,
      consentType,
      method,
      ipAddress,
      formVersion: version,
    })

    // Build update object based on consent type
    const updateData: Record<string, unknown> = {}

    if (consentType === 'call') {
      updateData.call_consent = 'explicit'
      updateData.call_consent_date = timestamp
      updateData.call_consent_ip = ipAddress
      updateData.call_consent_method = method
      updateData.call_consent_form_version = version
      updateData.call_consent_legal_text = legalText
      updateData.call_consent_user_agent = userAgent
      // Clear any opt-out status when consent is given
      updateData.call_opt_out = false
      updateData.call_opt_out_date = null
      updateData.call_opt_out_reason = null
      updateData.call_opt_out_deadline = null
    } else if (consentType === 'sms') {
      updateData.sms_opt_in = true
      updateData.sms_opt_in_date = timestamp
      updateData.sms_consent_ip = ipAddress
      updateData.sms_consent_method = method
      updateData.sms_consent_form_version = version
      updateData.sms_consent_legal_text = legalText
      updateData.sms_consent_user_agent = userAgent
      // Clear any opt-out status when consent is given
      updateData.sms_opt_out = false
      updateData.sms_opt_out_date = null
      updateData.sms_opt_out_reason = null
    } else if (consentType === 'recording') {
      updateData.recording_consent = true
      updateData.recording_consent_date = timestamp
      updateData.recording_consent_method = method
    }

    // Update contact record
    const { error } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', contactId)
      .eq('tenant_id', tenantId)

    if (error) {
      logger.error('Error capturing consent', { error, params })
      return { success: false, error: error.message }
    }

    // Log to compliance audit trail
    await supabase.from('call_compliance_log').insert({
      tenant_id: tenantId,
      contact_id: contactId,
      phone_number: 'consent_capture', // Placeholder - actual phone from contact
      compliance_check_type: 'consent_verification',
      check_result: 'allowed',
      check_details: {
        action: 'consent_captured',
        consent_type: consentType,
        method,
        ip_address: ipAddress,
        user_agent: userAgent,
        form_version: version,
        captured_by: userId,
      },
      checked_by: userId,
    })

    const proof: ConsentProof = {
      contactId,
      consentType,
      method,
      timestamp,
      ipAddress,
      userAgent,
      formVersion: version,
      legalText,
    }

    logger.info('Consent captured successfully', {
      contactId,
      consentType,
      method,
      ipAddress,
    })

    return { success: true, proof }
  } catch (error) {
    logger.error('Error in captureCallConsent', { error, params })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to capture consent',
    }
  }
}

/**
 * Revoke consent for a contact
 * Used when customer requests to opt-out
 *
 * @param contactId - Contact ID
 * @param tenantId - Tenant ID
 * @param consentType - Type of consent to revoke
 * @param reason - Reason for revocation
 */
export async function revokeConsent(
  contactId: string,
  tenantId: string,
  consentType: ConsentType,
  reason: string = 'Customer request'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const timestamp = new Date().toISOString()

    const updateData: Record<string, unknown> = {}

    if (consentType === 'call') {
      updateData.call_opt_out = true
      updateData.call_opt_out_date = timestamp
      updateData.call_opt_out_reason = reason
      updateData.call_consent = 'none'
    } else if (consentType === 'sms') {
      updateData.sms_opt_out = true
      updateData.sms_opt_out_date = timestamp
      updateData.sms_opt_out_reason = reason
      updateData.sms_opt_in = false
    } else if (consentType === 'recording') {
      updateData.recording_consent = false
      updateData.recording_consent_date = null
    }

    const { error } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', contactId)
      .eq('tenant_id', tenantId)

    if (error) {
      logger.error('Error revoking consent', { error, contactId, consentType })
      return { success: false, error: error.message }
    }

    // Log to compliance audit trail
    await supabase.from('call_compliance_log').insert({
      tenant_id: tenantId,
      contact_id: contactId,
      phone_number: 'consent_revocation',
      compliance_check_type: 'opt_out_check',
      check_result: 'blocked',
      check_details: {
        action: 'consent_revoked',
        consent_type: consentType,
        reason,
        revoked_at: timestamp,
      },
    })

    logger.info('Consent revoked', { contactId, consentType, reason })

    return { success: true }
  } catch (error) {
    logger.error('Error in revokeConsent', { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke consent',
    }
  }
}

/**
 * Get consent proof for a contact
 * Used for compliance audits and lawsuit defense
 *
 * @param contactId - Contact ID
 * @param tenantId - Tenant ID
 * @returns Consent proof records
 */
export async function getConsentProof(
  contactId: string,
  tenantId: string
): Promise<{
  call?: Partial<ConsentProof>
  sms?: Partial<ConsentProof>
  recording?: { consent: boolean; date?: string; method?: string }
} | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('contacts')
      .select(`
        call_consent,
        call_consent_date,
        call_consent_ip,
        call_consent_method,
        call_consent_form_version,
        call_consent_legal_text,
        call_consent_user_agent,
        sms_opt_in,
        sms_opt_in_date,
        sms_consent_ip,
        sms_consent_method,
        sms_consent_form_version,
        sms_consent_legal_text,
        sms_consent_user_agent,
        recording_consent,
        recording_consent_date,
        recording_consent_method
      `)
      .eq('id', contactId)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !data) {
      logger.error('Error fetching consent proof', { error, contactId })
      return null
    }

    return {
      call: data.call_consent ? {
        consentType: 'call',
        method: data.call_consent_method as ConsentMethod,
        timestamp: data.call_consent_date,
        ipAddress: data.call_consent_ip,
        userAgent: data.call_consent_user_agent,
        formVersion: data.call_consent_form_version,
        legalText: data.call_consent_legal_text,
      } : undefined,
      sms: data.sms_opt_in ? {
        consentType: 'sms',
        method: data.sms_consent_method as ConsentMethod,
        timestamp: data.sms_opt_in_date,
        ipAddress: data.sms_consent_ip,
        userAgent: data.sms_consent_user_agent,
        formVersion: data.sms_consent_form_version,
        legalText: data.sms_consent_legal_text,
      } : undefined,
      recording: {
        consent: data.recording_consent || false,
        date: data.recording_consent_date,
        method: data.recording_consent_method,
      },
    }
  } catch (error) {
    logger.error('Error in getConsentProof', { error })
    return null
  }
}

// =====================================================
// STANDARD TCPA CONSENT LEGAL TEXT
// These are versioned templates for consent disclosure
// =====================================================

/**
 * Standard TCPA call consent legal text (v1.0)
 * Must be displayed to customer before they consent
 */
export const TCPA_CALL_CONSENT_TEXT_V1 = `By providing my phone number, I consent to receive calls from {COMPANY_NAME} regarding my inquiry, including calls made using an automatic telephone dialing system or pre-recorded messages. I understand that my consent is not a condition of purchase and that I may revoke my consent at any time by calling {COMPANY_PHONE} or requesting removal.`

/**
 * Standard TCPA SMS consent legal text (v1.0)
 * Must be displayed to customer before they consent
 */
export const TCPA_SMS_CONSENT_TEXT_V1 = `By providing my phone number, I consent to receive text messages from {COMPANY_NAME}. Message and data rates may apply. Message frequency varies. Reply STOP to opt out at any time. Reply HELP for help. My consent is not a condition of purchase.`

/**
 * Combined TCPA consent legal text (v1.0)
 * For forms that capture both call and SMS consent
 */
export const TCPA_COMBINED_CONSENT_TEXT_V1 = `By providing my phone number, I consent to receive calls and/or text messages from {COMPANY_NAME} regarding my inquiry, including calls made using an automatic telephone dialing system or pre-recorded messages. Message and data rates may apply. I understand my consent is not a condition of purchase. I may revoke consent at any time by replying STOP to text messages or calling {COMPANY_PHONE}.`

/**
 * Recording consent legal text (v1.0)
 * For call recording disclosure
 */
export const RECORDING_CONSENT_TEXT_V1 = `This call may be recorded for quality assurance and training purposes. By continuing with this call, you consent to being recorded.`

/**
 * Format consent text with company details
 *
 * @param template - Consent text template
 * @param companyName - Company name to insert
 * @param companyPhone - Company phone to insert
 * @returns Formatted consent text
 */
export function formatConsentText(
  template: string,
  companyName: string,
  companyPhone: string
): string {
  return template
    .replace(/{COMPANY_NAME}/g, companyName)
    .replace(/{COMPANY_PHONE}/g, companyPhone)
}

// Export current versions as default
export const TCPA_CALL_CONSENT_TEXT = TCPA_CALL_CONSENT_TEXT_V1
export const TCPA_SMS_CONSENT_TEXT = TCPA_SMS_CONSENT_TEXT_V1
export const TCPA_COMBINED_CONSENT_TEXT = TCPA_COMBINED_CONSENT_TEXT_V1
export const RECORDING_CONSENT_TEXT = RECORDING_CONSENT_TEXT_V1
