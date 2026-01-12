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
  ClaimOutcome,
  CreateClaimOutcomeInput,
} from '@/lib/claims/intelligence-types'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/claims/[id]/outcomes
 * Get all outcomes for a claim
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

    // Get outcomes with adjuster info
    const { data: outcomes, error } = await supabase
      .from('claim_outcomes')
      .select(
        `
        *,
        insurance_personnel!adjuster_id (
          id,
          first_name,
          last_name
        )
      `
      )
      .eq('claim_id', claimId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('[API] Error fetching claim outcomes:', { error })
      throw InternalError('Failed to fetch outcomes')
    }

    // Transform to include adjuster_name
    const transformedOutcomes = (outcomes || []).map((outcome) => {
      const adjuster = outcome.insurance_personnel as unknown as {
        id: string
        first_name: string
        last_name: string
      } | null

      return {
        ...outcome,
        adjuster_name: adjuster
          ? `${adjuster.first_name} ${adjuster.last_name}`
          : null,
        insurance_personnel: undefined,
      }
    })

    return successResponse({
      claim_id: claimId,
      outcomes: transformedOutcomes,
    })
  } catch (error) {
    logger.error('[API] Error in GET /api/claims/[id]/outcomes:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * POST /api/claims/[id]/outcomes
 * Record a new outcome for a claim
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
    const body: CreateClaimOutcomeInput = await request.json()

    // Validate required fields
    if (!body.outcome) {
      throw ValidationError('outcome is required')
    }

    // Verify claim exists and belongs to tenant
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('id, adjuster_id, date_of_loss, date_filed')
      .eq('id', claimId)
      .eq('tenant_id', tenantId)
      .single()

    if (claimError || !claim) {
      throw NotFoundError('Claim not found')
    }

    // Calculate days_to_decision if we have the dates
    let daysToDecision = body.days_to_decision
    if (!daysToDecision && body.outcome_date && claim.date_filed) {
      const filedDate = new Date(claim.date_filed)
      const outcomeDate = new Date(body.outcome_date)
      daysToDecision = Math.round(
        (outcomeDate.getTime() - filedDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    }

    // Create the outcome
    const { data: newOutcome, error: insertError } = await supabase
      .from('claim_outcomes')
      .insert({
        tenant_id: tenantId,
        claim_id: claimId,
        adjuster_id: body.adjuster_id || claim.adjuster_id || null,
        outcome: body.outcome,
        outcome_date: body.outcome_date || new Date().toISOString().split('T')[0],
        requested_amount: body.requested_amount || null,
        approved_amount: body.approved_amount || null,
        paid_amount: body.paid_amount || null,
        disputed_items: body.disputed_items || null,
        denial_reason: body.denial_reason || null,
        denial_reasons: body.denial_reasons || null,
        successful_arguments: body.successful_arguments || null,
        days_to_decision: daysToDecision || null,
        days_to_payment: body.days_to_payment || null,
        supplements_filed: body.supplements_filed || 0,
        attorney_referral: body.attorney_referral || false,
        appeal_filed: body.appeal_filed || false,
        appeal_outcome: body.appeal_outcome || null,
        notes: body.notes || null,
      })
      .select()
      .single()

    if (insertError) {
      logger.error('[API] Error creating claim outcome:', { error: insertError })
      throw InternalError(`Failed to create outcome: ${insertError.message}`)
    }

    // Update adjuster stats if we have an adjuster_id
    const adjusterId = body.adjuster_id || claim.adjuster_id
    if (adjusterId) {
      await updateAdjusterStats(supabase, adjusterId, tenantId)
    }

    // Update claim status if outcome indicates closure
    if (['paid_full', 'paid_partial', 'denied', 'settled'].includes(body.outcome)) {
      await supabase
        .from('claims')
        .update({
          status: body.outcome === 'denied' ? 'denied' : 'closed',
          approved_amount: body.approved_amount,
          paid_amount: body.paid_amount,
          decision_date: body.outcome_date,
          updated_at: new Date().toISOString(),
        })
        .eq('id', claimId)
    }

    logger.info('Claim outcome recorded', {
      claimId,
      outcome: body.outcome,
      adjusterId,
      userId: user.id,
    })

    return successResponse(newOutcome as ClaimOutcome)
  } catch (error) {
    logger.error('[API] Error in POST /api/claims/[id]/outcomes:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * Update adjuster statistics based on claim outcomes
 */
async function updateAdjusterStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  adjusterId: string,
  tenantId: string
) {
  try {
    // Get all outcomes for this adjuster
    const { data: outcomes } = await supabase
      .from('claim_outcomes')
      .select('outcome, days_to_decision')
      .eq('adjuster_id', adjusterId)
      .eq('tenant_id', tenantId)

    if (!outcomes || outcomes.length === 0) return

    // Calculate stats
    const totalClaims = outcomes.length
    const approvedClaims = outcomes.filter((o) =>
      ['paid_full', 'paid_partial', 'supplement_approved', 'settled'].includes(
        o.outcome
      )
    ).length
    const approvalRate = (approvedClaims / totalClaims) * 100

    const daysToDecision = outcomes
      .filter((o) => o.days_to_decision != null)
      .map((o) => o.days_to_decision as number)
    const avgResponseDays =
      daysToDecision.length > 0
        ? daysToDecision.reduce((a, b) => a + b, 0) / daysToDecision.length
        : null

    // Update adjuster stats
    await supabase
      .from('insurance_personnel')
      .update({
        total_claims_handled: totalClaims,
        avg_claim_approval_rate: approvalRate,
        avg_response_days: avgResponseDays,
        updated_at: new Date().toISOString(),
      })
      .eq('id', adjusterId)
  } catch (error) {
    logger.error('Error updating adjuster stats:', { error, adjusterId })
    // Don't throw - this is a background update
  }
}
