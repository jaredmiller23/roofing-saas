/**
 * Contact Consent API
 * Capture and manage TCPA consent for contacts
 *
 * POST - Capture new consent (call, SMS, or recording)
 * GET - Retrieve consent proof for a contact
 * DELETE - Revoke consent (opt-out)
 */

import { NextRequest } from 'next/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import {
  captureCallConsent,
  revokeConsent,
  getConsentProof,
  formatConsentText,
  TCPA_CALL_CONSENT_TEXT,
  TCPA_SMS_CONSENT_TEXT,
  TCPA_COMBINED_CONSENT_TEXT,
  RECORDING_CONSENT_TEXT,
} from '@/lib/compliance'
import type { ConsentMethod, ConsentType } from '@/lib/compliance'
import { successResponse, errorResponse } from '@/lib/api/response'
import { AuthenticationError, AuthorizationError, ValidationError } from '@/lib/api/errors'
import { z } from 'zod'

// Validation schemas
const captureConsentSchema = z.object({
  consentType: z.enum(['call', 'sms', 'recording']),
  method: z.enum(['web_form', 'verbal', 'written', 'sms', 'electronic_signature']),
  companyName: z.string().optional(),
  companyPhone: z.string().optional(),
  customLegalText: z.string().optional(),
  formVersion: z.string().optional(),
})

const revokeConsentSchema = z.object({
  consentType: z.enum(['call', 'sms', 'recording']),
  reason: z.string().optional(),
})

/**
 * POST /api/contacts/[id]/consent
 * Capture TCPA-compliant consent with full proof
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await context.params
    const user = await getCurrentUser()
    if (!user) throw AuthenticationError('Not authenticated')

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) throw AuthorizationError('No tenant access')

    const body = await request.json()
    const validated = captureConsentSchema.parse(body)

    // Determine legal text to use
    let legalText: string

    if (validated.customLegalText) {
      // Use custom legal text if provided
      legalText = validated.customLegalText
    } else {
      // Use standard template based on consent type
      let template: string
      switch (validated.consentType) {
        case 'call':
          template = TCPA_CALL_CONSENT_TEXT
          break
        case 'sms':
          template = TCPA_SMS_CONSENT_TEXT
          break
        case 'recording':
          template = RECORDING_CONSENT_TEXT
          break
        default:
          template = TCPA_COMBINED_CONSENT_TEXT
      }

      // Format with company details if provided
      const companyName = validated.companyName || '[Company Name]'
      const companyPhone = validated.companyPhone || '[Company Phone]'
      legalText = formatConsentText(template, companyName, companyPhone)
    }

    // Capture consent with full PEWC proof
    const result = await captureCallConsent({
      contactId,
      tenantId,
      consentType: validated.consentType as ConsentType,
      method: validated.method as ConsentMethod,
      legalText,
      formVersion: validated.formVersion,
      userId: user.id,
    })

    if (!result.success) {
      throw new Error(result.error || 'Failed to capture consent')
    }

    return successResponse({
      message: 'Consent captured successfully',
      proof: result.proof,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError
      return errorResponse(ValidationError(zodError.issues[0]?.message || 'Validation error'))
    }
    return errorResponse(error as Error)
  }
}

/**
 * GET /api/contacts/[id]/consent
 * Retrieve consent proof for audits and lawsuit defense
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await context.params
    const user = await getCurrentUser()
    if (!user) throw AuthenticationError('Not authenticated')

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) throw AuthorizationError('No tenant access')

    const proof = await getConsentProof(contactId, tenantId)

    if (!proof) {
      return successResponse({
        message: 'No consent records found',
        proof: null,
      })
    }

    return successResponse({
      message: 'Consent proof retrieved',
      proof,
    })
  } catch (error) {
    return errorResponse(error as Error)
  }
}

/**
 * DELETE /api/contacts/[id]/consent
 * Revoke consent (process opt-out request)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await context.params
    const user = await getCurrentUser()
    if (!user) throw AuthenticationError('Not authenticated')

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) throw AuthorizationError('No tenant access')

    const body = await request.json()
    const validated = revokeConsentSchema.parse(body)

    const result = await revokeConsent(
      contactId,
      tenantId,
      validated.consentType as ConsentType,
      validated.reason || 'Customer request'
    )

    if (!result.success) {
      throw new Error(result.error || 'Failed to revoke consent')
    }

    return successResponse({
      message: 'Consent revoked successfully',
      consentType: validated.consentType,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError
      return errorResponse(ValidationError(zodError.issues[0]?.message || 'Validation error'))
    }
    return errorResponse(error as Error)
  }
}
