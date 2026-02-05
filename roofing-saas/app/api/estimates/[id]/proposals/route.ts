import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { AuthenticationError, AuthorizationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * GET /api/estimates/[id]/proposals
 * Get all proposals for a project (authenticated, contractor-side).
 *
 * The [id] parameter is the project_id.
 * Returns proposals ordered by most recent first.
 */
export async function GET(
  _request: NextRequest,
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

    const resolvedParams = await params
    const projectId = resolvedParams.id

    const supabase = await createClient()

    const { data: proposals, error } = await supabase
      .from('quote_proposals')
      .select('id, proposal_number, title, description, status, sent_at, viewed_at, responded_at, selected_option_id, valid_until, decline_reason, created_at')
      .eq('project_id', projectId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch proposals', { error, projectId })
      throw InternalError('Failed to fetch proposals')
    }

    // For each proposal that has a selected_option_id, fetch the option details
    const proposalsWithOptions = await Promise.all(
      (proposals || []).map(async (proposal) => {
        if (proposal.selected_option_id) {
          const { data: option } = await supabase
            .from('quote_options')
            .select('id, name, total_amount, subtotal')
            .eq('id', proposal.selected_option_id)
            .single()

          return { ...proposal, selected_option: option }
        }
        return { ...proposal, selected_option: null }
      })
    )

    return successResponse({ proposals: proposalsWithOptions })
  } catch (error) {
    logger.error('Error in GET /api/estimates/[id]/proposals', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
