import { NextRequest } from 'next/server'
import type { Json } from '@/lib/types/database.types'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, NotFoundError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * POST /api/claims/[id]/approve
 * Approve a claim and optionally add approval notes
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
    const { notes } = body

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

    // Update claim to approved status
    const updateData: Record<string, unknown> = {
      status: 'approved',
      updated_at: new Date().toISOString(),
    }

    // If claim doesn't have approved_amount yet, use estimated_damage
    if (!claim.approved_amount && claim.estimated_damage) {
      updateData.approved_amount = claim.estimated_damage
    }

    const { data: updatedClaim, error: updateError } = await supabase
      .from('claims')
      .update(updateData)
      .eq('id', claimId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (updateError) {
      logger.error('Failed to approve claim:', { error: updateError })
      throw InternalError('Failed to approve claim')
    }

    // Log approval activity
    const activityData = {
      tenant_id: tenantId,
      type: 'claim_approved',
      created_by: user.id,
      content: `Claim approved${notes ? `: ${notes}` : ''}`,
      outcome_details: {
        previous_status: claim.status,
        new_status: 'approved',
        approved_amount: updateData.approved_amount || claim.approved_amount,
        notes: notes || null,
        approved_by: user.email,
        approved_at: new Date().toISOString(),
      } as Json,
    }

    const { error: activityError } = await supabase
      .from('activities')
      .insert(activityData)

    if (activityError) {
      logger.error('Failed to log approval activity:', { error: activityError })
      // Don't fail the request, activity logging is non-critical
    }

    logger.info('Claim approved successfully', {
      claimId,
      userId: user.id,
      tenantId,
      approvedAmount: updateData.approved_amount || claim.approved_amount,
    })

    return successResponse({
      claim: updatedClaim,
      message: 'Claim approved successfully',
    })
  } catch (error) {
    logger.error('Error in POST /api/claims/[id]/approve:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
