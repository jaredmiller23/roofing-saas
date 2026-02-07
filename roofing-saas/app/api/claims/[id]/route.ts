import type { Database } from '@/lib/types/database.types'
import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import type { ClaimData } from '@/lib/claims/types'

/**
 * GET /api/claims/[id]
 * Get a single claim by ID
 */
export const GET = withAuthParams(async (_request, { tenantId }, { params }) => {
  try {
    const { id: claimId } = await params
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

    return successResponse(data as ClaimData)
  } catch (error) {
    logger.error('Error in GET /api/claims/:id', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * PATCH /api/claims/[id]
 * Update a claim (status, amounts, notes, etc.)
 */
export const PATCH = withAuthParams(async (request, { userId, tenantId }, { params }) => {
  try {
    const { id: claimId } = await params
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
      'claim_number',
      'policy_number',
      'insurance_carrier',
      'carrier_id',
      'adjuster_id',
      'adjuster_name',
      'adjuster_email',
      'adjuster_phone',
      'date_of_loss',
      'date_filed',
      'acknowledgment_date',
      'inspection_scheduled_at',
      'inspection_completed_at',
      'decision_date',
      'estimated_damage',
      'insurance_estimate',
      'approved_amount',
      'paid_amount',
      'deductible',
      'recovered_amount',
      'notes',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field as keyof typeof updateData] = body[field]
      }
    }

    // Update claim
    const { data, error } = await supabase
      .from('claims')
      .update(updateData as Database['public']['Tables']['claims']['Update'])
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
      userId,
    })

    return successResponse(data as ClaimData)
  } catch (error) {
    logger.error('Error in PATCH /api/claims/:id', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
