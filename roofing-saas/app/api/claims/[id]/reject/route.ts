import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { logger } from '@/lib/logger'

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: claimId } = await context.params
    const body = await request.json()
    const { reason } = body

    // Validate rejection reason is provided
    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user's tenant
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (!tenantUser) {
      return NextResponse.json(
        { error: 'User not associated with any tenant' },
        { status: 403 }
      )
    }

    // Verify claim exists and belongs to tenant
    const { data: claim, error: fetchError } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .eq('tenant_id', tenantUser.tenant_id)
      .single()

    if (fetchError || !claim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      )
    }

    // Check if claim is in a reviewable state
    const reviewableStatuses = ['under_review', 'escalated', 'disputed']
    if (!reviewableStatuses.includes(claim.status)) {
      return NextResponse.json(
        { error: 'Claim is not in a reviewable state' },
        { status: 400 }
      )
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
      .eq('tenant_id', tenantUser.tenant_id)
      .select()
      .single()

    if (updateError) {
      logger.error('Failed to reject claim:', { error: updateError })
      return NextResponse.json(
        { error: 'Failed to reject claim' },
        { status: 500 }
      )
    }

    // Log rejection activity with detailed reason
    const activityData = {
      tenant_id: tenantUser.tenant_id,
      entity_type: 'claim' as const,
      entity_id: claimId,
      activity_type: 'claim_rejected' as const,
      user_id: user.id,
      details: {
        previous_status: claim.status,
        new_status: 'disputed',
        rejection_reason: reason.trim(),
        rejected_by: user.email,
        rejected_at: new Date().toISOString(),
      },
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
      tenantId: tenantUser.tenant_id,
      reason: reason.trim(),
    })

    return NextResponse.json({
      claim: updatedClaim,
      message: 'Claim rejected successfully',
    })
  } catch (error) {
    logger.error('Error in POST /api/claims/[id]/reject:', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
