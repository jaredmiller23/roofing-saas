import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  InternalError,
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import type {
  ClaimCommunication,
  CreateClaimCommunicationInput,
} from '@/lib/claims/intelligence-types'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/claims/[id]/interactions
 * Get all interactions (communications) for a claim
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with a tenant')
    }

    const { id: claimId } = await params
    if (!claimId) {
      throw ValidationError('Claim ID is required')
    }

    const supabase = await createClient()

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Verify claim exists and belongs to tenant
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('id')
      .eq('id', claimId)
      .eq('tenant_id', tenantId)
      .single()

    if (claimError || !claim) {
      throw NotFoundError('Claim not found')
    }

    // Build query
    let query = supabase
      .from('claim_communications')
      .select('*', { count: 'exact' })
      .eq('claim_id', claimId)
      .eq('tenant_id', tenantId)
      .order('sent_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by type if specified
    if (type) {
      query = query.eq('type', type)
    }

    const { data: interactions, error, count } = await query

    if (error) {
      logger.error('[API] Error fetching claim interactions:', { error })
      throw InternalError('Failed to fetch interactions')
    }

    return successResponse({
      claim_id: claimId,
      interactions: interactions || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    logger.error('[API] Error in GET /api/claims/[id]/interactions:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * POST /api/claims/[id]/interactions
 * Log a new interaction for a claim
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with a tenant')
    }

    const { id: claimId } = await params
    if (!claimId) {
      throw ValidationError('Claim ID is required')
    }

    const supabase = await createClient()
    const body: CreateClaimCommunicationInput = await request.json()

    // Validate required fields
    if (!body.type) {
      throw ValidationError('type is required')
    }

    // Verify claim exists and belongs to tenant
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('id, adjuster_id, adjuster_name, adjuster_email')
      .eq('id', claimId)
      .eq('tenant_id', tenantId)
      .single()

    if (claimError || !claim) {
      throw NotFoundError('Claim not found')
    }

    // Create the interaction
    const { data: newInteraction, error: insertError } = await supabase
      .from('claim_communications')
      .insert({
        tenant_id: tenantId,
        claim_id: claimId,
        type: body.type,
        direction: body.direction || null,
        subject: body.subject || null,
        content: body.content || null,
        from_address: body.from_address || null,
        to_address: body.to_address || claim.adjuster_email || null,
        sent_at: new Date().toISOString(),
        response_due_at: body.response_due_at || null,
        response_overdue: false,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      logger.error('[API] Error creating claim interaction:', {
        error: insertError,
      })
      throw InternalError(`Failed to create interaction: ${insertError.message}`)
    }

    // Update adjuster's last_interaction_at if we have an adjuster
    if (claim.adjuster_id) {
      await supabase
        .from('insurance_personnel')
        .update({
          last_interaction_at: new Date().toISOString(),
        })
        .eq('id', claim.adjuster_id)
    }

    logger.info('Claim interaction logged', {
      claimId,
      type: body.type,
      direction: body.direction,
      userId: user.id,
    })

    return successResponse(newInteraction as ClaimCommunication)
  } catch (error) {
    logger.error('[API] Error in POST /api/claims/[id]/interactions:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * PATCH /api/claims/[id]/interactions
 * Update an interaction (e.g., mark as responded)
 * Requires interaction_id in query params
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with a tenant')
    }

    const { id: claimId } = await params
    const interactionId = request.nextUrl.searchParams.get('interaction_id')

    if (!claimId) {
      throw ValidationError('Claim ID is required')
    }
    if (!interactionId) {
      throw ValidationError('interaction_id query parameter is required')
    }

    const supabase = await createClient()
    const body = await request.json()

    // Build update object
    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      'responded_at',
      'response_overdue',
      'subject',
      'content',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw ValidationError('No valid fields to update')
    }

    // Update the interaction
    const { data: updated, error: updateError } = await supabase
      .from('claim_communications')
      .update(updateData)
      .eq('id', interactionId)
      .eq('claim_id', claimId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (updateError) {
      logger.error('[API] Error updating interaction:', { error: updateError })
      throw InternalError(`Failed to update interaction: ${updateError.message}`)
    }

    return successResponse(updated)
  } catch (error) {
    logger.error('[API] Error in PATCH /api/claims/[id]/interactions:', {
      error,
    })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
