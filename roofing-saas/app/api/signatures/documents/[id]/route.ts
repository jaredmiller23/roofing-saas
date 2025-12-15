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
 * GET /api/signatures/documents/[id]
 * Get a single signature document by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params

    logger.apiRequest('GET', `/api/signatures/documents/${id}`, { tenantId, id })

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
      throw NotFoundError('Signature document')
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', `/api/signatures/documents/${id}`, 200, duration)

    return successResponse({ document })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error fetching signature document', { error, duration })
    return errorResponse(error as Error)
  }
}
