import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { updateContactSchema } from '@/lib/validations/contact'
import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, NotFoundError, ValidationError, ConflictError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { getAuditContext, auditedUpdate, auditedDelete } from '@/lib/audit/audit-middleware'

/**
 * GET /api/contacts/[id]
 * Get a single contact by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant')
    }

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

    return successResponse({ contact })
  } catch (error) {
    logger.error('Error in GET /api/contacts/:id', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * PATCH /api/contacts/[id]
 * Update a contact
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant')
    }

    // Get audit context for logging
    const auditContext = await getAuditContext(request)
    if (!auditContext) {
      throw AuthenticationError('Failed to get audit context')
    }

    const { id } = await params
    const body = await request.json()

    // Validate input
    const validatedData = updateContactSchema.parse({ ...body, id })

    // Remove id from update data
    const { id: _, ...updateData } = validatedData

    // Update contact with audit logging
    const contact = await auditedUpdate(
      'contact',
      id,
      async (_beforeValues) => {
        const supabase = await createClient()

        const { data, error } = await supabase
          .from('contacts')
          .update(updateData)
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

    return successResponse({ contact })
  } catch (error) {
    logger.error('Error in PATCH /api/contacts/:id', { error })

    if (error instanceof Error && error.message.includes('validation')) {
      return errorResponse(ValidationError('Invalid input data'))
    }

    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * DELETE /api/contacts/[id]
 * Soft delete a contact
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant')
    }

    // Get audit context for logging
    const auditContext = await getAuditContext(request)
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
}
