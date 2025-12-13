import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * GET /api/claims/[id]/documents
 * Get all documents for a claim
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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

    const { id: claimId } = await context.params
    const supabase = await createClient()

    // Fetch documents for this claim
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('entity_type', 'claim')
      .eq('entity_id', claimId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Error fetching claim documents:', { error })
      throw InternalError('Failed to fetch documents')
    }

    return successResponse({
      documents: documents || [],
    })
  } catch (error) {
    logger.error('Error in GET /api/claims/[id]/documents:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
