import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import type { ClaimData } from '@/lib/claims/types'

/**
 * GET /api/claims/[id]
 * Get a single claim by ID
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: claimId } = await context.params
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

    // Fetch claim
    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .eq('tenant_id', tenantUser.tenant_id)
      .single()

    if (error || !data) {
      logger.error('Error fetching claim:', { error })
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      claim: data as ClaimData,
    })
  } catch (error) {
    logger.error('Error in GET /api/claims/[id]:', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/claims/[id]
 * Update a claim (status, amounts, notes, etc.)
 */
export async function PATCH(
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

    // Verify claim belongs to user's tenant
    const { data: existingClaim } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .eq('tenant_id', tenantUser.tenant_id)
      .single()

    if (!existingClaim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      )
    }

    // Build update object
    const updateData: Partial<ClaimData> & { updated_at?: string } = {
      updated_at: new Date().toISOString(),
    }

    // Allow updating specific fields
    const allowedFields = [
      'status',
      'approved_amount',
      'paid_amount',
      'policy_number',
      'date_filed',
      'acknowledgment_received',
      'inspection_scheduled',
      'inspection_completed',
      'decision_date',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field as keyof typeof updateData] = body[field]
      }
    }

    // Update claim
    const { data, error } = await supabase
      .from('claims')
      .update(updateData)
      .eq('id', claimId)
      .eq('tenant_id', tenantUser.tenant_id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating claim:', { error })
      return NextResponse.json(
        { error: 'Failed to update claim' },
        { status: 500 }
      )
    }

    logger.info('Claim updated successfully', {
      claimId,
      status: body.status,
      userId: user.id,
    })

    return NextResponse.json({
      claim: data as ClaimData,
    })
  } catch (error) {
    logger.error('Error in PATCH /api/claims/[id]:', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
