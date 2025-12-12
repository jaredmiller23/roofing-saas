import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { logger } from '@/lib/logger'

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: claimId } = await context.params
    const body = await request.json()
    const { notes } = body

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

    // Update claim to approved status
    const updateData: Record<string, unknown> = {
      status: 'approved',
      updated_at: new Date().toISOString(),
    }

    // If claim doesn't have approved_amount yet, use initial_estimate
    if (!claim.approved_amount && claim.initial_estimate) {
      updateData.approved_amount = claim.initial_estimate
    }

    const { data: updatedClaim, error: updateError } = await supabase
      .from('claims')
      .update(updateData)
      .eq('id', claimId)
      .eq('tenant_id', tenantUser.tenant_id)
      .select()
      .single()

    if (updateError) {
      logger.error('Failed to approve claim:', { error: updateError })
      return NextResponse.json(
        { error: 'Failed to approve claim' },
        { status: 500 }
      )
    }

    // Log approval activity
    const activityData = {
      tenant_id: tenantUser.tenant_id,
      entity_type: 'claim' as const,
      entity_id: claimId,
      activity_type: 'claim_approved' as const,
      user_id: user.id,
      details: {
        previous_status: claim.status,
        new_status: 'approved',
        approved_amount: updateData.approved_amount || claim.approved_amount,
        notes: notes || null,
        approved_by: user.email,
        approved_at: new Date().toISOString(),
      },
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
      tenantId: tenantUser.tenant_id,
      approvedAmount: updateData.approved_amount || claim.approved_amount,
    })

    return NextResponse.json({
      claim: updatedClaim,
      message: 'Claim approved successfully',
    })
  } catch (error) {
    logger.error('Error in POST /api/claims/[id]/approve:', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
