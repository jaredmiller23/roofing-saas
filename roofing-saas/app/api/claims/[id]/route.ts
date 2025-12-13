import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
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
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant')
    }

    const { id: claimId } = await context.params
    const supabase = await createClient()

    // Fetch claim
    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !data) {
      throw NotFoundError('Claim')
    }

    return successResponse({ claim: data as ClaimData })
  } catch (error) {
    logger.error('Error in GET /api/claims/:id', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
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
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant')
    }

    const { id: claimId } = await context.params
    const body = await request.json()
    const supabase = await createClient()

    // Verify claim belongs to user's tenant
    const { data: existingClaim } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .eq('tenant_id', tenantId)
      .single()

    if (!existingClaim) {
      throw NotFoundError('Claim')
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
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      logger.error('Error updating claim', { error })
      throw InternalError('Failed to update claim')
    }

    logger.info('Claim updated successfully', {
      claimId,
      status: body.status,
      userId: user.id,
    })

    return successResponse({ claim: data as ClaimData })
  } catch (error) {
    logger.error('Error in PATCH /api/claims/:id', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
