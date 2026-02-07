import { withAuthParams } from '@/lib/auth/with-auth'
import { NextRequest } from 'next/server'
import {
  AuthorizationError,
  NotFoundError,
  InternalError
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'
import { hasPermission } from '@/lib/auth/permissions'

/**
 * GET /api/signature-documents/[id]
 * Get a single signature document by ID
 */
export const GET = withAuthParams(async (
  request: NextRequest,
  { tenantId },
  { params }
) => {
  const startTime = Date.now()

  try {
    const { id } = await params

    logger.apiRequest('GET', `/api/signature-documents/${id}`, { tenantId, id })

    const supabase = await createClient()

    const { data: document, error } = await supabase
      .from('signature_documents')
      .select(`
        *,
        project:projects(id, name),
        contact:contacts(id, first_name, last_name, email, phone),
        signatures(*)
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (error || !document) {
      logger.warn('Signature document not found', { id, tenantId, error: error?.message })
      throw NotFoundError('Signature document')
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', `/api/signature-documents/${id}`, 200, duration)

    return successResponse(document)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error fetching signature document', { error, duration })
    return errorResponse(error as Error)
  }
})

/**
 * PATCH /api/signature-documents/[id]
 * Update a signature document
 *
 * Access rules:
 * - signed documents: immutable, no edits allowed
 * - draft: creator can edit, or users with signatures.edit permission
 * - sent/viewed: only users with signatures.edit permission (admin/owner)
 * - expired/declined: only users with signatures.edit permission (admin/owner)
 *
 * Body: Partial document fields to update
 */
export const PATCH = withAuthParams(async (
  request: NextRequest,
  { user, tenantId },
  { params }
) => {
  const startTime = Date.now()

  try {
    const { id } = await params
    const updates = await request.json().catch(() => ({}))

    // Remove fields that shouldn't be updated directly
    delete updates.id
    delete updates.tenant_id
    delete updates.created_by
    delete updates.created_at

    logger.apiRequest('PATCH', `/api/signature-documents/${id}`, {
      tenantId,
      id,
      updates
    })

    const supabase = await createClient()

    // Fetch document with status and created_by for authorization checks
    const { data: existing } = await supabase
      .from('signature_documents')
      .select('id, status, created_by')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .or('is_deleted.eq.false,is_deleted.is.null')
      .single()

    if (!existing) {
      throw NotFoundError('Signature document')
    }

    // Signed documents are immutable
    if (existing.status === 'signed') {
      throw AuthorizationError('Signed documents cannot be edited')
    }

    // Authorization: check if user can edit this document
    const canEditSignatures = await hasPermission(user.id, 'signatures', 'edit', tenantId)
    const isCreator = existing.created_by === user.id

    if (existing.status === 'draft') {
      // Draft: creator can edit their own, or need edit permission
      if (!isCreator && !canEditSignatures) {
        throw AuthorizationError('You do not have permission to edit this document')
      }
    } else {
      // sent, viewed, expired, declined: require edit permission (admin/owner)
      if (!canEditSignatures) {
        throw AuthorizationError('Only admins can edit non-draft documents')
      }
    }

    // Restrict editable fields based on status
    const allowedFields = existing.status === 'draft'
      ? ['title', 'description', 'document_type', 'project_id', 'contact_id', 'signature_requirements', 'expiration_date', 'status']
      : ['title', 'description', 'project_id', 'contact_id', 'status']

    const filteredUpdates: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in updates) {
        filteredUpdates[key] = updates[key]
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      throw InternalError('No valid fields to update')
    }

    const { data: document, error } = await supabase
      .from('signature_documents')
      .update(filteredUpdates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .or('is_deleted.eq.false,is_deleted.is.null')
      .select()
      .single()

    if (error) {
      logger.error('Supabase error updating signature document', { error })
      throw InternalError('Failed to update signature document')
    }

    const duration = Date.now() - startTime
    logger.apiResponse('PATCH', `/api/signature-documents/${id}`, 200, duration)

    return successResponse(document)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error updating signature document', { error, duration })
    return errorResponse(error as Error)
  }
})

/**
 * DELETE /api/signature-documents/[id]
 * Soft-delete a signature document
 *
 * Access rules:
 * - signed documents: cannot be deleted by anyone
 * - draft: creator can delete, or users with signatures.delete permission
 * - sent/viewed: only users with signatures.delete permission (admin/owner)
 *   Also sets status to 'expired' to invalidate the signing link
 * - expired/declined: only users with signatures.delete permission (admin/owner)
 */
export const DELETE = withAuthParams(async (
  request: NextRequest,
  { user, tenantId },
  { params }
) => {
  const startTime = Date.now()

  try {
    const { id } = await params

    logger.apiRequest('DELETE', `/api/signature-documents/${id}`, { tenantId, id })

    const supabase = await createClient()

    // Fetch document with status and created_by for authorization checks
    const { data: existing } = await supabase
      .from('signature_documents')
      .select('id, status, created_by')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .or('is_deleted.eq.false,is_deleted.is.null')
      .single()

    if (!existing) {
      throw NotFoundError('Signature document')
    }

    // Signed documents cannot be deleted
    if (existing.status === 'signed') {
      throw AuthorizationError('Signed documents cannot be deleted')
    }

    // Authorization: check if user can delete this document
    const canDeleteSignatures = await hasPermission(user.id, 'signatures', 'delete', tenantId)
    const isCreator = existing.created_by === user.id

    if (existing.status === 'draft') {
      // Draft: creator can delete their own, or need delete permission
      if (!isCreator && !canDeleteSignatures) {
        throw AuthorizationError('You do not have permission to delete this document')
      }
    } else {
      // sent, viewed, expired, declined: require delete permission (admin/owner)
      if (!canDeleteSignatures) {
        throw AuthorizationError('Only admins can delete non-draft documents')
      }
    }

    // Soft delete — also set status to 'expired' for sent/viewed to invalidate signing links
    const updateData: Record<string, unknown> = { is_deleted: true }
    if (existing.status === 'sent' || existing.status === 'viewed') {
      updateData.status = 'expired'
    }

    const { error } = await supabase
      .from('signature_documents')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      logger.error('Supabase error soft-deleting signature document', { error })
      throw InternalError('Failed to delete signature document')
    }

    const duration = Date.now() - startTime
    logger.apiResponse('DELETE', `/api/signature-documents/${id}`, 200, duration)
    logger.info('Signature document soft-deleted', {
      documentId: id,
      previousStatus: existing.status,
      deletedBy: user.id,
      tenantId
    })

    return successResponse({ message: 'Signature document deleted successfully', id })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error deleting signature document', { error, duration })
    return errorResponse(error as Error)
  }
})
