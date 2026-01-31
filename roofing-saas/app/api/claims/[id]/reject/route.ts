import { NextRequest } from 'next/server'
import type { Json } from '@/lib/types/database.types'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, NotFoundError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * POST /api/claims/[id]/reject
 * Reject a claim with a required reason
 */
export async function POST(
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
    const body = await request.json()
    const { reason } = body

    // Validate rejection reason is provided
    if (!reason || !reason.trim()) {
      throw ValidationError('Rejection reason is required')
    }

    const supabase = await createClient()

    // Verify claim exists and belongs to tenant
    const { data: claim, error: fetchError } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !claim) {
      throw NotFoundError('Claim')
    }

    // Check if claim is in a reviewable state
    const reviewableStatuses = ['under_review', 'escalated', 'disputed']
    if (!reviewableStatuses.includes(claim.status ?? '')) {
      throw ValidationError('Claim is not in a reviewable state')
    }

    // Update claim to disputed status (representing rejection)
    // Note: We use 'disputed' status to track rejections in the workflow
    const updateData = {
      status: 'disputed',
      updated_at: new Date().toISOString(),
    }

    const { data: updatedClaim, error: updateError } = await supabase
      .from('claims')
      .update(updateData)
      .eq('id', claimId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (updateError) {
      logger.error('Failed to reject claim:', { error: updateError })
      throw InternalError('Failed to reject claim')
    }

    // Log rejection activity with detailed reason
    const activityData = {
      tenant_id: tenantId,
      type: 'claim_rejected',
      created_by: user.id,
      content: `Claim rejected: ${reason.trim()}`,
      outcome_details: {
        previous_status: claim.status,
        new_status: 'disputed',
        rejection_reason: reason.trim(),
        rejected_by: user.email,
        rejected_at: new Date().toISOString(),
      } as Json,
    }

    const { error: activityError } = await supabase
      .from('activities')
      .insert(activityData)

    if (activityError) {
      logger.error('Failed to log rejection activity:', { error: activityError })
      // Don't fail the request, activity logging is non-critical
    }

    logger.info('Claim rejected successfully', {
      claimId,
      userId: user.id,
      tenantId,
      reason: reason.trim(),
    })

    return successResponse({
      claim: updatedClaim,
      message: 'Claim rejected successfully',
    })
  } catch (error) {
    logger.error('Error in POST /api/claims/[id]/reject:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
