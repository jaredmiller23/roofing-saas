import type { Database } from '@/lib/types/database.types'
import { createClient } from '@/lib/supabase/server'
import { withAuthParams, type AuthContext } from '@/lib/auth/with-auth'
import { updateContactSchema } from '@/lib/validations/contact'
import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'
import { AuthenticationError, NotFoundError, ValidationError, ConflictError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { getAuditContext, auditedUpdate, auditedDelete } from '@/lib/audit/audit-middleware'

/**
 * GET /api/contacts/[id]
 * Get a single contact by ID
 */
export const GET = withAuthParams(async (
  request: NextRequest,
  { tenantId }: AuthContext,
  { params }
) => {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (error || !contact) {
      throw NotFoundError('Contact')
    }

    return successResponse(contact)
  } catch (error) {
    logger.error('Error in GET /api/contacts/:id', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * PATCH /api/contacts/[id]
 * Update a contact
 */
export const PATCH = withAuthParams(async (
  request: NextRequest,
  { user, tenantId }: AuthContext,
  { params }
) => {
  try {
    // Get audit context for logging - pass pre-fetched auth to avoid duplicate calls
    const auditContext = await getAuditContext(request, { user, tenantId })
    if (!auditContext) {
      throw AuthenticationError('Failed to get audit context')
    }

    const { id } = await params
    const body = await request.json()

    // Validate input
    const parsed = updateContactSchema.safeParse({ ...body, id })
    if (!parsed.success) {
      throw ValidationError(parsed.error.issues.map((e: { message: string }) => e.message).join(', '))
    }

    // Remove id from update data
    const { id: _, ...updateData } = parsed.data

    // Update contact with audit logging
    const contact = await auditedUpdate(
      'contact',
      id,
      async (_beforeValues) => {
        const supabase = await createClient()

        const { data, error } = await supabase
          .from('contacts')
          .update({ ...updateData, updated_at: new Date().toISOString() } as Database['public']['Tables']['contacts']['Update'])
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .eq('is_deleted', false)
          .select()
          .single()

        if (error || !data) {
          logger.error('Error updating contact', { error })

          if (error?.code === '23505') {
            throw ConflictError('A contact with this email already exists')
          }

          throw NotFoundError('Contact')
        }

        return data
      },
      auditContext,
      {
        operation: 'contact_update',
        source: 'api',
        updated_fields: Object.keys(updateData)
      }
    )

    // Capture TCPA consent proof if auto_call_consent was set to true
    if (updateData.auto_call_consent === true && contact.id) {
      try {
        const { captureCallConsent, TCPA_CALL_CONSENT_TEXT, formatConsentText } =
          await import('@/lib/compliance/consent-capture')

        const supabase = await createClient()

        // Fetch tenant details for consent legal text
        const { data: tenantDetails } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', tenantId)
          .single()

        const legalText = formatConsentText(
          TCPA_CALL_CONSENT_TEXT,
          tenantDetails?.name || 'Company',
          '' // Phone not stored on tenants table
        )

        await captureCallConsent({
          contactId: contact.id,
          tenantId,
          consentType: 'call',
          method: 'web_form',
          legalText,
          formVersion: '1.0',
          userId: user.id,
        })

        logger.info('TCPA call consent captured for contact update', { contactId: contact.id })
      } catch (consentError) {
        // Non-blocking - log but don't fail the contact update
        logger.error('Failed to capture call consent on update', { error: consentError, contactId: contact.id })
      }
    }

    return successResponse(contact)
  } catch (error) {
    logger.error('Error in PATCH /api/contacts/:id', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * DELETE /api/contacts/[id]
 * Soft delete a contact
 */
export const DELETE = withAuthParams(async (
  request: NextRequest,
  { user, tenantId }: AuthContext,
  { params }
) => {
  try {
    // Get audit context for logging - pass pre-fetched auth to avoid duplicate calls
    const auditContext = await getAuditContext(request, { user, tenantId })
    if (!auditContext) {
      throw AuthenticationError('Failed to get audit context')
    }

    const { id } = await params

    // Delete contact with audit logging
    const result = await auditedDelete(
      'contact',
      id,
      async (_beforeValues) => {
        const supabase = await createClient()

        // Soft delete
        const { error } = await supabase
          .from('contacts')
          .update({ is_deleted: true })
          .eq('id', id)
          .eq('tenant_id', tenantId)

        if (error) {
          logger.error('Error deleting contact', { error })
          throw InternalError('Failed to delete contact')
        }

        return { success: true }
      },
      auditContext,
      {
        operation: 'contact_delete',
        source: 'api',
        delete_type: 'soft'
      }
    )

    return successResponse(result)
  } catch (error) {
    logger.error('Error in DELETE /api/contacts/:id', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
