import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  InternalError
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/signature-documents/[id]
 * Get a single signature document by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()

  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    const { id } = params

    logger.apiRequest('GET', `/api/signature-documents/${id}`, { tenantId, id })

    const supabase = await createClient()

    const { data: document, error } = await supabase
      .from('signature_documents')
      .select(`
        *,
        project:projects(id, name, address),
        contact:contacts(id, first_name, last_name, email, phone),
        signatures(*)
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !document) {
      logger.warn('Signature document not found', { id, tenantId })
      throw NotFoundError('Signature document not found')
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', `/api/signature-documents/${id}`, 200, duration)

    return successResponse({ document })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error fetching signature document', { error, duration })
    return errorResponse(error as Error)
  }
}

/**
 * PATCH /api/signature-documents/[id]
 * Update a signature document
 *
 * Body: Partial document fields to update
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()

  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    const { id } = params
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

    // Verify document exists and belongs to tenant
    const { data: existing } = await supabase
      .from('signature_documents')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (!existing) {
      throw NotFoundError('Signature document not found')
    }

    const { data: document, error } = await supabase
      .from('signature_documents')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      logger.error('Supabase error updating signature document', { error })
      throw InternalError('Failed to update signature document')
    }

    const duration = Date.now() - startTime
    logger.apiResponse('PATCH', `/api/signature-documents/${id}`, 200, duration)

    return successResponse({ document })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error updating signature document', { error, duration })
    return errorResponse(error as Error)
  }
}

/**
 * DELETE /api/signature-documents/[id]
 * Delete a signature document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()

  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    const { id } = params

    logger.apiRequest('DELETE', `/api/signature-documents/${id}`, { tenantId, id })

    const supabase = await createClient()

    // Verify document exists and belongs to tenant
    const { data: existing } = await supabase
      .from('signature_documents')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (!existing) {
      throw NotFoundError('Signature document not found')
    }

    const { error } = await supabase
      .from('signature_documents')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      logger.error('Supabase error deleting signature document', { error })
      throw InternalError('Failed to delete signature document')
    }

    const duration = Date.now() - startTime
    logger.apiResponse('DELETE', `/api/signature-documents/${id}`, 200, duration)

    return successResponse({ message: 'Signature document deleted successfully' })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error deleting signature document', { error, duration })
    return errorResponse(error as Error)
  }
}
