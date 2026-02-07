import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import {
  InternalError,
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import type { IntelligenceDashboard } from '@/lib/claims/intelligence-types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/intelligence/dashboard
 * Get aggregated intelligence data for the dashboard
 */
export const GET = withAuth(async (_request: NextRequest, { tenantId }) => {
  try {
    const supabase = await createClient()

    // Fetch all necessary data in parallel
    const [
      outcomesResult,
      adjustersResult,
      adjusterPatternsResult,
      carrierPatternsResult,
      claimsResult,
    ] = await Promise.all([
      // All outcomes
      supabase
        .from('claim_outcomes')
        .select('*')
        .eq('tenant_id', tenantId),

      // All adjusters with basic stats
      supabase
        .from('insurance_personnel')
        .select(`
          id,
          first_name,
          last_name,
          carrier_id,
          total_claims_handled,
          avg_claim_approval_rate,
          avg_response_days,
          common_omissions,
          insurance_carriers!carrier_id (
            name
          )
        `)
        .eq('tenant_id', tenantId)
        .gt('total_claims_handled', 0)
        .order('total_claims_handled', { ascending: false })
        .limit(20),

      // All adjuster patterns
      supabase
        .from('adjuster_patterns')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('occurrence_count', { ascending: false }),

      // All carrier patterns
      supabase
        .from('carrier_patterns')
        .select(`
          *,
          insurance_carriers!carrier_id (
            name
          )
        `)
        .eq('tenant_id', tenantId)
        .order('occurrence_count', { ascending: false }),

      // Basic claims stats
      supabase
        .from('claims')
        .select('id, status, insurance_carrier')
        .eq('tenant_id', tenantId),
    ])

    const outcomes = outcomesResult.data || []
    const adjusters = adjustersResult.data || []
    const adjusterPatterns = adjusterPatternsResult.data || []
    const _carrierPatterns = carrierPatternsResult.data || [] // For future use in carrier intelligence section
    const claims = claimsResult.data || []

    // Calculate summary stats
    const totalClaims = claims.length
    const totalOutcomes = outcomes.length

    const approvedOutcomes = outcomes.filter((o) =>
      ['paid_full', 'paid_partial', 'supplement_approved', 'settled'].includes(
        o.outcome
      )
    )
    const deniedOutcomes = outcomes.filter((o) => o.outcome === 'denied')
    const appealedOutcomes = outcomes.filter((o) => o.appeal_filed)
    const appealWins = appealedOutcomes.filter((o) =>
      ['paid_full', 'paid_partial', 'settled'].includes(o.appeal_outcome || '')
    )

    const overallApprovalRate =
      totalOutcomes > 0 ? (approvedOutcomes.length / totalOutcomes) * 100 : 0
    const appealSuccessRate =
      appealedOutcomes.length > 0
        ? (appealWins.length / appealedOutcomes.length) * 100
        : 0

    const daysToResolution = outcomes
      .filter((o) => o.days_to_decision != null)
      .map((o) => o.days_to_decision as number)
    const avgDaysToResolution =
      daysToResolution.length > 0
        ? daysToResolution.reduce((a, b) => a + b, 0) / daysToResolution.length
        : 0

    // Aggregate disputed items
    const disputedItemsMap = new Map<string, { count: number; wins: number }>()
    for (const outcome of outcomes) {
      const items = outcome.disputed_items as string[] | null
      if (items) {
        for (const item of items) {
          const current = disputedItemsMap.get(item) || { count: 0, wins: 0 }
          current.count++
          if (
            ['paid_full', 'paid_partial', 'supplement_approved'].includes(
              outcome.outcome
            )
          ) {
            current.wins++
          }
          disputedItemsMap.set(item, current)
        }
      }
    }

    const topDisputedItems = Array.from(disputedItemsMap.entries())
      .map(([item, stats]) => ({
        item,
        count: stats.count,
        win_rate: stats.count > 0 ? (stats.wins / stats.count) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Aggregate denial reasons
    const denialReasonsMap = new Map<
      string,
      { count: number; appealSuccess: number }
    >()
    for (const outcome of deniedOutcomes) {
      const reasons = (outcome.denial_reasons as string[] | null) || [
        outcome.denial_reason,
      ].filter(Boolean)
      for (const reason of reasons) {
        if (!reason) continue
        const current = denialReasonsMap.get(reason) || {
          count: 0,
          appealSuccess: 0,
        }
        current.count++
        if (
          outcome.appeal_filed &&
          ['paid_full', 'paid_partial'].includes(outcome.appeal_outcome || '')
        ) {
          current.appealSuccess++
        }
        denialReasonsMap.set(reason, current)
      }
    }

    const topDenialReasons = Array.from(denialReasonsMap.entries())
      .map(([reason, stats]) => ({
        reason,
        count: stats.count,
        appeal_success_rate:
          stats.count > 0 ? (stats.appealSuccess / stats.count) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Aggregate successful arguments
    const argumentsMap = new Map<string, number>()
    for (const outcome of approvedOutcomes) {
      const args = outcome.successful_arguments as string[] | null
      if (args) {
        for (const arg of args) {
          argumentsMap.set(arg, (argumentsMap.get(arg) || 0) + 1)
        }
      }
    }

    const mostEffectiveArguments = Array.from(argumentsMap.entries())
      .map(([argument, success_count]) => ({ argument, success_count }))
      .sort((a, b) => b.success_count - a.success_count)
      .slice(0, 10)

    // Build carrier intelligence
    const carrierMap = new Map<
      string,
      { claims: number; approved: number; days: number[]; disputes: string[] }
    >()
    for (const claim of claims) {
      const carrier = claim.insurance_carrier || 'Unknown'
      if (!carrierMap.has(carrier)) {
        carrierMap.set(carrier, {
          claims: 0,
          approved: 0,
          days: [],
          disputes: [],
        })
      }
      carrierMap.get(carrier)!.claims++
    }

    for (const outcome of outcomes) {
      // Find the carrier for this claim
      const claim = claims.find((c) => c.id === outcome.claim_id)
      const carrier = claim?.insurance_carrier || 'Unknown'
      const stats = carrierMap.get(carrier)
      if (stats) {
        if (
          ['paid_full', 'paid_partial', 'supplement_approved'].includes(
            outcome.outcome
          )
        ) {
          stats.approved++
        }
        if (outcome.days_to_decision) {
          stats.days.push(outcome.days_to_decision)
        }
        const items = outcome.disputed_items as string[] | null
        if (items) {
          stats.disputes.push(...items)
        }
      }
    }

    const carriers = Array.from(carrierMap.entries())
      .map(([carrier_name, stats]) => {
        // Count disputed items
        const disputeCounts = new Map<string, number>()
        for (const item of stats.disputes) {
          disputeCounts.set(item, (disputeCounts.get(item) || 0) + 1)
        }
        const topDisputed = Array.from(disputeCounts.entries())
          .map(([item, count]) => ({ item, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        return {
          carrier_id: undefined,
          carrier_name,
          total_claims: stats.claims,
          approval_rate:
            stats.claims > 0 ? (stats.approved / stats.claims) * 100 : 0,
          avg_days_to_decision:
            stats.days.length > 0
              ? stats.days.reduce((a, b) => a + b, 0) / stats.days.length
              : 0,
          avg_days_to_payment: 0, // Would need more data
          supplement_approval_rate: 0, // Would need more data
          top_disputed_items: topDisputed,
          top_denial_reasons: [],
          effective_counters: [],
        }
      })
      .filter((c) => c.total_claims > 0)
      .sort((a, b) => b.total_claims - a.total_claims)

    // Build adjuster intelligence
    const adjustersIntelligence = adjusters.map((adj) => {
      const carrier = adj.insurance_carriers as unknown as { name: string } | null
      const patterns = adjusterPatterns.filter(
        (p) => p.adjuster_id === adj.id && p.successful_counter
      )

      return {
        adjuster_id: adj.id,
        adjuster_name: `${adj.first_name} ${adj.last_name}`,
        carrier_name: carrier?.name || undefined,
        total_claims: adj.total_claims_handled || 0,
        approval_rate: adj.avg_claim_approval_rate || 0,
        avg_response_days: adj.avg_response_days || 0,
        common_omissions: (adj.common_omissions as string[]) || [],
        effective_counters: patterns
          .map((p) => p.successful_counter)
          .filter(Boolean) as string[],
        communication_rating: undefined,
      }
    })

    const dashboard: IntelligenceDashboard = {
      total_claims: totalClaims,
      overall_approval_rate: overallApprovalRate,
      avg_days_to_resolution: avgDaysToResolution,
      appeal_success_rate: appealSuccessRate,
      top_disputed_items: topDisputedItems,
      top_denial_reasons: topDenialReasons,
      most_effective_arguments: mostEffectiveArguments,
      carriers,
      adjusters: adjustersIntelligence,
    }

    return successResponse(dashboard)
  } catch (error) {
    logger.error('[API] Error in GET /api/intelligence/dashboard:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
