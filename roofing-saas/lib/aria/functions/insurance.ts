/**
 * ARIA Insurance & Claims Intelligence Functions
 *
 * Provides ARIA with deep claims intelligence including:
 * - Claim status and timeline tracking
 * - Adjuster lookup and pattern analysis
 * - Carrier intelligence and comparison
 * - Claim success rate analysis
 */

import { ariaFunctionRegistry } from '../function-registry'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type {
  Claim,
  ClaimStatus,
  AdjusterPattern,
  CarrierPattern as _CarrierPattern,
  Adjuster as _Adjuster,
  InsuranceCarrier,
} from '@/lib/claims/intelligence-types'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format claim status for display
 */
function formatClaimStatus(status: ClaimStatus): string {
  const statusLabels: Record<ClaimStatus, string> = {
    new: 'New',
    filed: 'Filed with Insurance',
    acknowledged: 'Acknowledged by Carrier',
    inspection_scheduled: 'Inspection Scheduled',
    inspection_completed: 'Inspection Completed',
    estimate_received: 'Estimate Received',
    negotiating: 'In Negotiation',
    supplement_filed: 'Supplement Filed',
    approved: 'Approved',
    denied: 'Denied',
    appealed: 'Appeal in Progress',
    closed: 'Closed',
    litigation: 'In Litigation',
  }
  return statusLabels[status] || status
}

/**
 * Calculate days since a date
 */
function daysSince(dateString: string): number {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Format adjuster pattern for display
 */
function formatPatternType(type: string): string {
  const patternLabels: Record<string, string> = {
    omits_line_item: 'Omits Line Items',
    disputes_item: 'Disputes Items',
    slow_response: 'Slow Response',
    unreachable: 'Hard to Reach',
    thorough: 'Thorough Inspector',
    reasonable: 'Reasonable to Work With',
    low_balls: 'Tends to Undervalue',
    fair: 'Generally Fair',
    denies_coverage: 'Denies Coverage',
    disputes_line_item: 'Disputes Line Items',
    slow_payment: 'Slow Payment',
    requires_inspection: 'Requires Reinspection',
    accepts_supplements: 'Accepts Supplements',
    fights_matching: 'Fights Matching',
    fights_code_upgrade: 'Fights Code Upgrades',
  }
  return patternLabels[type] || type
}

// =============================================================================
// ARIA Function: Get Claim Status
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_claim_status',
  category: 'insurance',
  description:
    'Get the status and details of an insurance claim. Can search by claim number, customer name, or address.',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_claim_status',
    description:
      'Get the status and details of an insurance claim. Use this to answer questions like "What\'s happening with the Smith claim?" or "Status of claim 12345"',
    parameters: {
      type: 'object',
      properties: {
        claim_number: {
          type: 'string',
          description: 'The insurance claim number',
        },
        customer_name: {
          type: 'string',
          description: 'Customer name to search by',
        },
        project_id: {
          type: 'string',
          description: 'Project ID associated with the claim',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    try {
      const supabase = await createAdminClient()
      const { claim_number, customer_name, project_id } = args as {
        claim_number?: string
        customer_name?: string
        project_id?: string
      }

      let query = supabase
        .from('claims')
        .select(
          `
          *,
          contacts!contact_id (
            id,
            first_name,
            last_name,
            phone,
            email
          ),
          projects!project_id (
            id,
            title,
            address
          )
        `
        )
        .eq('tenant_id', context.tenantId)

      // Apply filters
      if (claim_number) {
        query = query.ilike('claim_number', `%${claim_number}%`)
      }

      if (project_id) {
        query = query.eq('project_id', project_id)
      }

      // For customer name, we need to search through the contact relation
      // This is handled after the query

      const { data: claims, error } = await query.order('updated_at', {
        ascending: false,
      })

      if (error) {
        logger.error('[ARIA] Error fetching claim status', { error })
        return { success: false, error: 'Failed to fetch claim status' }
      }

      // Filter by customer name if provided
      let filteredClaims = claims || []
      if (customer_name && filteredClaims.length > 0) {
        const searchLower = customer_name.toLowerCase()
        filteredClaims = filteredClaims.filter((claim) => {
          const contact = claim.contacts as {
            first_name?: string
            last_name?: string
          } | null
          if (!contact) return false
          const fullName =
            `${contact.first_name || ''} ${contact.last_name || ''}`.toLowerCase()
          return fullName.includes(searchLower)
        })
      }

      if (filteredClaims.length === 0) {
        return {
          success: true,
          found: false,
          message: 'No claims found matching your search criteria.',
        }
      }

      // Return details for the most recent claim (or first match)
      const claim = filteredClaims[0] as Claim & {
        contacts: { first_name?: string; last_name?: string; phone?: string; email?: string } | null
        projects: { id: string; title?: string; address?: string } | null
      }
      const contact = claim.contacts
      const project = claim.projects

      // Calculate timeline metrics
      const daysOpen = claim.date_filed ? daysSince(claim.date_filed) : 0
      const daysSinceInspection = claim.inspection_completed_at
        ? daysSince(claim.inspection_completed_at)
        : null

      // Determine next steps based on status
      const nextSteps: string[] = []
      switch (claim.status) {
        case 'new':
          nextSteps.push('File the claim with the insurance carrier')
          break
        case 'filed':
          nextSteps.push('Wait for acknowledgment from carrier')
          nextSteps.push('Follow up if no response within 5 business days')
          break
        case 'acknowledged':
          nextSteps.push('Schedule inspection with adjuster')
          break
        case 'inspection_scheduled':
          nextSteps.push('Prepare for inspection')
          nextSteps.push('Have all documentation ready')
          break
        case 'inspection_completed':
          nextSteps.push('Wait for estimate from carrier')
          nextSteps.push('Review estimate when received')
          break
        case 'estimate_received':
          nextSteps.push('Review estimate for missed items')
          nextSteps.push('Prepare supplement if needed')
          break
        case 'negotiating':
          nextSteps.push('Continue negotiation with adjuster')
          nextSteps.push('Document all communications')
          break
        case 'supplement_filed':
          nextSteps.push('Wait for supplement response')
          nextSteps.push('Schedule reinspection if required')
          break
        case 'approved':
          nextSteps.push('Schedule work')
          nextSteps.push('Collect payment')
          break
        case 'denied':
          nextSteps.push('Review denial reason')
          nextSteps.push('Consider appeal')
          break
        case 'appealed':
          nextSteps.push('Wait for appeal decision')
          nextSteps.push('Prepare additional documentation if needed')
          break
      }

      return {
        success: true,
        found: true,
        claim: {
          id: claim.id,
          claim_number: claim.claim_number,
          status: formatClaimStatus(claim.status),
          status_raw: claim.status,
          carrier: claim.insurance_carrier,
          adjuster: claim.adjuster_name,
          adjuster_phone: claim.adjuster_phone,
          adjuster_email: claim.adjuster_email,
          date_of_loss: claim.date_of_loss,
          date_filed: claim.date_filed,
          inspection_date: claim.inspection_completed_at,
          financial: {
            estimated_damage: claim.estimated_damage,
            insurance_estimate: claim.insurance_estimate,
            approved_amount: claim.approved_amount,
            deductible: claim.deductible,
            paid_amount: claim.paid_amount,
          },
          timeline: {
            days_open: daysOpen,
            days_since_inspection: daysSinceInspection,
          },
          next_steps: nextSteps,
        },
        customer: contact
          ? {
              name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
              phone: contact.phone,
              email: contact.email,
            }
          : null,
        project: project
          ? {
              id: project.id,
              title: project.title,
              address: project.address,
            }
          : null,
        total_matching_claims: filteredClaims.length,
      }
    } catch (error) {
      logger.error('[ARIA] Error in get_claim_status', { error })
      return { success: false, error: 'Failed to retrieve claim status' }
    }
  },
})

// =============================================================================
// ARIA Function: Find Adjuster
// =============================================================================

ariaFunctionRegistry.register({
  name: 'find_adjuster',
  category: 'insurance',
  description:
    'Find an insurance adjuster by name or carrier. Returns contact info and performance patterns.',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'find_adjuster',
    description:
      'Find information about an insurance adjuster. Use for questions like "Who is the adjuster for State Farm?" or "Do we have contact info for John Smith the adjuster?"',
    parameters: {
      type: 'object',
      properties: {
        adjuster_name: {
          type: 'string',
          description: 'Name of the adjuster to search for',
        },
        carrier_name: {
          type: 'string',
          description: 'Insurance carrier name to filter by',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    try {
      const supabase = await createAdminClient()
      const { adjuster_name, carrier_name } = args as {
        adjuster_name?: string
        carrier_name?: string
      }

      let query = supabase
        .from('insurance_personnel')
        .select(
          `
          *,
          insurance_carriers!carrier_id (
            name,
            claims_phone
          )
        `
        )
        .eq('tenant_id', context.tenantId)

      // Apply filters
      if (adjuster_name) {
        // Search in both first and last name
        query = query.or(
          `first_name.ilike.%${adjuster_name}%,last_name.ilike.%${adjuster_name}%`
        )
      }

      if (carrier_name) {
        // Need to filter through the carrier relation
        // For now, we'll filter after the query
      }

      const { data: adjusters, error } = await query.order('total_claims_handled', {
        ascending: false,
      })

      if (error) {
        logger.error('[ARIA] Error finding adjuster', { error })
        return { success: false, error: 'Failed to search adjusters' }
      }

      let filteredAdjusters = adjusters || []

      // Filter by carrier name if provided
      if (carrier_name && filteredAdjusters.length > 0) {
        const searchLower = carrier_name.toLowerCase()
        filteredAdjusters = filteredAdjusters.filter((adj) => {
          const carrier = adj.insurance_carriers as { name: string } | null
          return carrier?.name?.toLowerCase().includes(searchLower)
        })
      }

      if (filteredAdjusters.length === 0) {
        return {
          success: true,
          found: false,
          message: 'No adjusters found matching your criteria.',
          suggestion:
            'Try searching with a different name or carrier, or add the adjuster when you encounter them on a claim.',
        }
      }

      // Get patterns for top adjusters
      const adjusterIds = filteredAdjusters.slice(0, 5).map((a) => a.id)
      const { data: patterns } = await supabase
        .from('adjuster_patterns')
        .select('*')
        .eq('tenant_id', context.tenantId)
        .in('adjuster_id', adjusterIds)
        .order('occurrence_count', { ascending: false })

      const patternsByAdjuster = new Map<string, AdjusterPattern[]>()
      for (const pattern of patterns || []) {
        const existing = patternsByAdjuster.get(pattern.adjuster_id) || []
        existing.push(pattern as AdjusterPattern)
        patternsByAdjuster.set(pattern.adjuster_id, existing)
      }

      const results = filteredAdjusters.slice(0, 5).map((adj) => {
        const carrier = adj.insurance_carriers as { name: string; claims_phone?: string } | null
        const adjPatterns = patternsByAdjuster.get(adj.id) || []

        return {
          id: adj.id,
          name: `${adj.first_name} ${adj.last_name}`,
          role: adj.role,
          carrier: carrier?.name || 'Unknown',
          contact: {
            email: adj.email,
            phone: adj.phone,
            carrier_claims_phone: carrier?.claims_phone,
          },
          performance: {
            total_claims: adj.total_claims_handled,
            approval_rate: adj.avg_claim_approval_rate
              ? `${adj.avg_claim_approval_rate.toFixed(0)}%`
              : 'N/A',
            avg_response_days: adj.avg_response_days
              ? `${adj.avg_response_days.toFixed(1)} days`
              : 'N/A',
            supplement_approval_rate: adj.avg_supplement_approval_rate
              ? `${adj.avg_supplement_approval_rate.toFixed(0)}%`
              : 'N/A',
          },
          patterns: adjPatterns.slice(0, 3).map((p) => ({
            type: formatPatternType(p.pattern_type),
            detail: p.pattern_detail,
            frequency: p.frequency,
            counter: p.successful_counter,
          })),
          tips: (adj.tips as string[]) || [],
          notes: adj.notes,
        }
      })

      return {
        success: true,
        found: true,
        adjusters: results,
        total_found: filteredAdjusters.length,
      }
    } catch (error) {
      logger.error('[ARIA] Error in find_adjuster', { error })
      return { success: false, error: 'Failed to find adjuster' }
    }
  },
})

// =============================================================================
// ARIA Function: Get Carrier Intelligence
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_carrier_intelligence',
  category: 'insurance',
  description:
    'Get intelligence about an insurance carrier including approval rates, common disputes, and tips.',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_carrier_intelligence',
    description:
      'Get detailed intelligence about an insurance carrier. Use for questions like "How does State Farm handle claims?" or "What should I know about Allstate?"',
    parameters: {
      type: 'object',
      properties: {
        carrier_name: {
          type: 'string',
          description: 'Name of the insurance carrier',
        },
        compare_to: {
          type: 'string',
          description:
            'Optional second carrier to compare against',
        },
      },
      required: ['carrier_name'],
    },
  },
  execute: async (args, context) => {
    try {
      const supabase = await createAdminClient()
      const { carrier_name, compare_to } = args as {
        carrier_name: string
        compare_to?: string
      }

      // Get carrier info
      const { data: carriers } = await supabase
        .from('insurance_carriers')
        .select('*')
        .ilike('name', `%${carrier_name}%`)

      // Get carrier patterns for this tenant
      const { data: patterns } = await supabase
        .from('carrier_patterns')
        .select(
          `
          *,
          insurance_carriers!carrier_id (
            name
          )
        `
        )
        .eq('tenant_id', context.tenantId)

      // Get claims data for this carrier
      const { data: claims } = await supabase
        .from('claims')
        .select('id, status, insurance_carrier')
        .eq('tenant_id', context.tenantId)
        .ilike('insurance_carrier', `%${carrier_name}%`)

      // Get outcomes for these claims
      const claimIds = (claims || []).map((c) => c.id)
      const { data: outcomes } = await supabase
        .from('claim_outcomes')
        .select('*')
        .eq('tenant_id', context.tenantId)
        .in('claim_id', claimIds)

      const carrier = (carriers || [])[0] as InsuranceCarrier | undefined

      // Calculate metrics
      const totalClaims = claims?.length || 0
      const totalOutcomes = outcomes?.length || 0
      const approvedOutcomes =
        outcomes?.filter((o) =>
          ['paid_full', 'paid_partial', 'supplement_approved', 'settled'].includes(
            o.outcome
          )
        ) || []

      const approvalRate =
        totalOutcomes > 0
          ? ((approvedOutcomes.length / totalOutcomes) * 100).toFixed(0)
          : 'N/A'

      // Get avg days to decision
      const daysToDecision =
        outcomes
          ?.filter((o) => o.days_to_decision != null)
          .map((o) => o.days_to_decision as number) || []
      const avgDaysToDecision =
        daysToDecision.length > 0
          ? (
              daysToDecision.reduce((a, b) => a + b, 0) / daysToDecision.length
            ).toFixed(1)
          : 'N/A'

      // Get common disputed items
      const disputedItems = new Map<string, number>()
      for (const outcome of outcomes || []) {
        const items = outcome.disputed_items as string[] | null
        if (items) {
          for (const item of items) {
            disputedItems.set(item, (disputedItems.get(item) || 0) + 1)
          }
        }
      }

      const topDisputed = Array.from(disputedItems.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([item, count]) => ({ item, count }))

      // Get carrier patterns
      const carrierPatterns = (patterns || [])
        .filter((p) => {
          const pCarrier = p.insurance_carriers as { name: string } | null
          return pCarrier?.name?.toLowerCase().includes(carrier_name.toLowerCase())
        })
        .slice(0, 5)
        .map((p) => ({
          type: formatPatternType(p.pattern_type),
          detail: p.pattern_detail,
          frequency: p.frequency,
          counter: p.successful_counter,
          occurrences: p.occurrence_count,
        }))

      const result = {
        success: true as const,
        carrier: {
          name: carrier?.name || carrier_name,
          claims_phone: carrier?.claims_phone,
          claims_email: carrier?.claims_email,
          claims_portal: carrier?.claims_portal_url,
          am_best_rating: carrier?.am_best_rating,
        },
        metrics: {
          total_claims_tracked: totalClaims,
          approval_rate: `${approvalRate}%`,
          avg_days_to_decision: avgDaysToDecision,
          supplement_approval_rate: carrier?.supplement_approval_rate
            ? `${carrier.supplement_approval_rate.toFixed(0)}%`
            : 'N/A',
        },
        common_disputes: topDisputed,
        patterns: carrierPatterns,
        tips: (carrier?.tips as string[]) || [],
        known_issues: (carrier?.known_issues as string[]) || [],
      }

      // If comparing to another carrier
      if (compare_to) {
        const { data: compareClaims } = await supabase
          .from('claims')
          .select('id, status, insurance_carrier')
          .eq('tenant_id', context.tenantId)
          .ilike('insurance_carrier', `%${compare_to}%`)

        const compareClaimIds = (compareClaims || []).map((c) => c.id)
        const { data: compareOutcomes } = await supabase
          .from('claim_outcomes')
          .select('*')
          .eq('tenant_id', context.tenantId)
          .in('claim_id', compareClaimIds)

        const compareTotalOutcomes = compareOutcomes?.length || 0
        const compareApproved =
          compareOutcomes?.filter((o) =>
            ['paid_full', 'paid_partial', 'supplement_approved', 'settled'].includes(
              o.outcome
            )
          ) || []

        const compareApprovalRate =
          compareTotalOutcomes > 0
            ? ((compareApproved.length / compareTotalOutcomes) * 100).toFixed(0)
            : 'N/A'

        const compareDays =
          compareOutcomes
            ?.filter((o) => o.days_to_decision != null)
            .map((o) => o.days_to_decision as number) || []
        const compareAvgDays =
          compareDays.length > 0
            ? (compareDays.reduce((a, b) => a + b, 0) / compareDays.length).toFixed(1)
            : 'N/A'

        return {
          ...result,
          comparison: {
            carrier: compare_to,
            total_claims: compareClaims?.length || 0,
            approval_rate: `${compareApprovalRate}%`,
            avg_days_to_decision: compareAvgDays,
          },
        }
      }

      return result
    } catch (error) {
      logger.error('[ARIA] Error in get_carrier_intelligence', { error })
      return { success: false, error: 'Failed to retrieve carrier intelligence' }
    }
  },
})

// =============================================================================
// ARIA Function: Get Adjuster Patterns
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_adjuster_patterns',
  category: 'insurance',
  description:
    'Get detailed behavior patterns for a specific adjuster. Shows what they typically dispute, omit, or approve.',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_adjuster_patterns',
    description:
      'Get detailed behavior patterns for a specific adjuster. Use for questions like "What does this adjuster usually dispute?" or "What should I watch out for with John Smith?"',
    parameters: {
      type: 'object',
      properties: {
        adjuster_id: {
          type: 'string',
          description: 'The ID of the adjuster',
        },
        adjuster_name: {
          type: 'string',
          description:
            'Name of the adjuster (if ID not known)',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    try {
      const supabase = await createAdminClient()
      const { adjuster_id, adjuster_name } = args as {
        adjuster_id?: string
        adjuster_name?: string
      }

      let adjusterId = adjuster_id

      // If we have a name but no ID, look up the adjuster
      if (!adjusterId && adjuster_name) {
        const { data: adjusters } = await supabase
          .from('insurance_personnel')
          .select('id, first_name, last_name')
          .eq('tenant_id', context.tenantId)
          .or(`first_name.ilike.%${adjuster_name}%,last_name.ilike.%${adjuster_name}%`)
          .limit(1)

        if (adjusters && adjusters.length > 0) {
          adjusterId = adjusters[0].id
        }
      }

      if (!adjusterId) {
        return {
          success: true,
          found: false,
          message: 'Adjuster not found. Please provide an adjuster ID or a valid name.',
        }
      }

      // Get adjuster details
      const { data: adjuster } = await supabase
        .from('insurance_personnel')
        .select(
          `
          *,
          insurance_carriers!carrier_id (
            name
          )
        `
        )
        .eq('id', adjusterId)
        .single()

      if (!adjuster) {
        return { success: true, found: false, message: 'Adjuster not found.' }
      }

      // Get all patterns for this adjuster
      const { data: patterns } = await supabase
        .from('adjuster_patterns')
        .select('*')
        .eq('tenant_id', context.tenantId)
        .eq('adjuster_id', adjusterId)
        .order('occurrence_count', { ascending: false })

      // Group patterns by type
      const omissionPatterns = (patterns || []).filter(
        (p) => p.pattern_type === 'omits_line_item'
      )
      const disputePatterns = (patterns || []).filter(
        (p) => p.pattern_type === 'disputes_item'
      )
      const behaviorPatterns = (patterns || []).filter(
        (p) =>
          !['omits_line_item', 'disputes_item'].includes(p.pattern_type)
      )

      const carrier = adjuster.insurance_carriers as { name: string } | null

      return {
        success: true,
        found: true,
        adjuster: {
          id: adjuster.id,
          name: `${adjuster.first_name} ${adjuster.last_name}`,
          carrier: carrier?.name || 'Unknown',
          role: adjuster.role,
        },
        performance: {
          total_claims: adjuster.total_claims_handled,
          approval_rate: adjuster.avg_claim_approval_rate
            ? `${adjuster.avg_claim_approval_rate.toFixed(0)}%`
            : 'No data yet',
          avg_response_days: adjuster.avg_response_days
            ? `${adjuster.avg_response_days.toFixed(1)} days`
            : 'No data yet',
        },
        patterns: {
          commonly_omits: omissionPatterns.map((p) => ({
            item: p.pattern_detail,
            frequency: p.frequency,
            times_observed: p.occurrence_count,
            counter_strategy: p.successful_counter,
          })),
          commonly_disputes: disputePatterns.map((p) => ({
            item: p.pattern_detail,
            frequency: p.frequency,
            times_observed: p.occurrence_count,
            counter_strategy: p.successful_counter,
          })),
          behaviors: behaviorPatterns.map((p) => ({
            type: formatPatternType(p.pattern_type),
            frequency: p.frequency,
            times_observed: p.occurrence_count,
            notes: p.notes,
          })),
        },
        tips: (adjuster.tips as string[]) || [],
        communication_style: adjuster.communication_style,
        notes: adjuster.notes,
        common_omissions: (adjuster.common_omissions as string[]) || [],
      }
    } catch (error) {
      logger.error('[ARIA] Error in get_adjuster_patterns', { error })
      return { success: false, error: 'Failed to retrieve adjuster patterns' }
    }
  },
})

// =============================================================================
// ARIA Function: Track Claim Timeline
// =============================================================================

ariaFunctionRegistry.register({
  name: 'track_claim_timeline',
  category: 'insurance',
  description:
    'Get a detailed timeline view of a claim with days at each stage and deadlines.',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'track_claim_timeline',
    description:
      'Get detailed timeline information for a claim including days at each stage and upcoming deadlines. Use for questions like "How long has the Smith claim been open?" or "When do we need to follow up?"',
    parameters: {
      type: 'object',
      properties: {
        claim_id: {
          type: 'string',
          description: 'The ID of the claim to track',
        },
        claim_number: {
          type: 'string',
          description: 'The claim number to search by',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    try {
      const supabase = await createAdminClient()
      const { claim_id, claim_number } = args as {
        claim_id?: string
        claim_number?: string
      }

      let query = supabase
        .from('claims')
        .select(
          `
          *,
          contacts!contact_id (
            first_name,
            last_name
          )
        `
        )
        .eq('tenant_id', context.tenantId)

      if (claim_id) {
        query = query.eq('id', claim_id)
      } else if (claim_number) {
        query = query.ilike('claim_number', `%${claim_number}%`)
      } else {
        return { success: false, error: 'Please provide a claim ID or claim number' }
      }

      const { data: claims, error } = await query.single()

      if (error || !claims) {
        return { success: true, found: false, message: 'Claim not found' }
      }

      const claim = claims as Claim & {
        contacts: { first_name?: string; last_name?: string } | null
      }
      const contact = claim.contacts

      // Build timeline
      const timeline: Array<{
        stage: string
        date: string | null
        days_in_stage?: number
      }> = []

      // Date of loss
      if (claim.date_of_loss) {
        timeline.push({ stage: 'Date of Loss', date: claim.date_of_loss })
      }

      // Filed
      if (claim.date_filed) {
        timeline.push({
          stage: 'Claim Filed',
          date: claim.date_filed,
          days_in_stage: claim.date_of_loss
            ? daysSince(claim.date_of_loss) - daysSince(claim.date_filed)
            : undefined,
        })
      }

      // Acknowledged
      if (claim.acknowledgment_date) {
        timeline.push({
          stage: 'Acknowledged',
          date: claim.acknowledgment_date,
          days_in_stage: claim.date_filed
            ? daysSince(claim.date_filed) - daysSince(claim.acknowledgment_date)
            : undefined,
        })
      }

      // Inspection scheduled
      if (claim.inspection_scheduled_at) {
        timeline.push({
          stage: 'Inspection Scheduled',
          date: claim.inspection_scheduled_at,
        })
      }

      // Inspection completed
      if (claim.inspection_completed_at) {
        timeline.push({
          stage: 'Inspection Completed',
          date: claim.inspection_completed_at,
        })
      }

      // Decision
      if (claim.decision_date) {
        timeline.push({
          stage: 'Decision Made',
          date: claim.decision_date,
          days_in_stage: claim.inspection_completed_at
            ? daysSince(claim.inspection_completed_at) - daysSince(claim.decision_date)
            : undefined,
        })
      }

      // Calculate total days open
      const totalDaysOpen = claim.date_filed ? daysSince(claim.date_filed) : 0

      // Determine deadlines and recommended actions
      const deadlines: Array<{
        action: string
        deadline: string
        urgency: 'low' | 'medium' | 'high'
      }> = []

      // If filed but not acknowledged, carrier should acknowledge within 15 days
      if (claim.date_filed && !claim.acknowledgment_date) {
        const daysSinceFiled = daysSince(claim.date_filed)
        if (daysSinceFiled > 10) {
          deadlines.push({
            action: 'Follow up on acknowledgment',
            deadline: 'Overdue',
            urgency: 'high',
          })
        } else if (daysSinceFiled > 5) {
          deadlines.push({
            action: 'Carrier acknowledgment expected',
            deadline: `Within ${15 - daysSinceFiled} days`,
            urgency: 'medium',
          })
        }
      }

      // If acknowledged but inspection not scheduled
      if (claim.acknowledgment_date && !claim.inspection_scheduled_at) {
        const daysSinceAck = daysSince(claim.acknowledgment_date)
        if (daysSinceAck > 7) {
          deadlines.push({
            action: 'Schedule inspection',
            deadline: 'Overdue',
            urgency: 'high',
          })
        }
      }

      // If inspection completed but no estimate
      if (
        claim.inspection_completed_at &&
        !claim.insurance_estimate &&
        claim.status !== 'denied'
      ) {
        const daysSinceInspection = daysSince(claim.inspection_completed_at)
        if (daysSinceInspection > 14) {
          deadlines.push({
            action: 'Follow up on estimate',
            deadline: 'Overdue',
            urgency: 'high',
          })
        } else if (daysSinceInspection > 7) {
          deadlines.push({
            action: 'Estimate expected',
            deadline: `Within ${14 - daysSinceInspection} days`,
            urgency: 'medium',
          })
        }
      }

      return {
        success: true,
        found: true,
        claim: {
          id: claim.id,
          claim_number: claim.claim_number,
          customer: contact
            ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
            : 'Unknown',
          carrier: claim.insurance_carrier,
          current_status: formatClaimStatus(claim.status),
        },
        timeline: {
          total_days_open: totalDaysOpen,
          events: timeline,
        },
        deadlines,
        summary:
          totalDaysOpen > 30
            ? `This claim has been open for ${totalDaysOpen} days. Consider escalation if progress has stalled.`
            : `Claim is ${totalDaysOpen} days old and progressing normally.`,
      }
    } catch (error) {
      logger.error('[ARIA] Error in track_claim_timeline', { error })
      return { success: false, error: 'Failed to track claim timeline' }
    }
  },
})

// =============================================================================
// ARIA Function: Get Claim Success Rate
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_claim_success_rate',
  category: 'insurance',
  description:
    'Get claim success rates filtered by carrier, adjuster, or damage type.',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_claim_success_rate',
    description:
      'Get claim success rate statistics. Use for questions like "What\'s our success rate with State Farm?" or "How often do we win supplements?"',
    parameters: {
      type: 'object',
      properties: {
        carrier_name: {
          type: 'string',
          description: 'Filter by insurance carrier',
        },
        adjuster_name: {
          type: 'string',
          description: 'Filter by adjuster name',
        },
        date_range_days: {
          type: 'number',
          description:
            'Number of days to look back (default 365)',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    try {
      const supabase = await createAdminClient()
      const { carrier_name, adjuster_name, date_range_days = 365 } = args as {
        carrier_name?: string
        adjuster_name?: string
        date_range_days?: number
      }

      // Calculate date range
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - date_range_days)

      // Get claims with filters
      let claimsQuery = supabase
        .from('claims')
        .select('id, insurance_carrier, adjuster_name, adjuster_id')
        .eq('tenant_id', context.tenantId)
        .gte('created_at', startDate.toISOString())

      if (carrier_name) {
        claimsQuery = claimsQuery.ilike('insurance_carrier', `%${carrier_name}%`)
      }

      if (adjuster_name) {
        claimsQuery = claimsQuery.ilike('adjuster_name', `%${adjuster_name}%`)
      }

      const { data: claims } = await claimsQuery

      if (!claims || claims.length === 0) {
        return {
          success: true,
          found: true,
          message: 'No claims found matching your criteria for this time period.',
          filters: { carrier_name, adjuster_name, date_range_days },
        }
      }

      // Get outcomes for these claims
      const claimIds = claims.map((c) => c.id)
      const { data: outcomes } = await supabase
        .from('claim_outcomes')
        .select('*')
        .eq('tenant_id', context.tenantId)
        .in('claim_id', claimIds)

      const totalClaims = claims.length
      const totalOutcomes = outcomes?.length || 0

      // Calculate success metrics
      const paidFull = outcomes?.filter((o) => o.outcome === 'paid_full') || []
      const paidPartial = outcomes?.filter((o) => o.outcome === 'paid_partial') || []
      const supplementApproved =
        outcomes?.filter((o) => o.outcome === 'supplement_approved') || []
      const denied = outcomes?.filter((o) => o.outcome === 'denied') || []
      const appealed = outcomes?.filter((o) => o.appeal_filed) || []
      const appealWins = appealed.filter((o) =>
        ['paid_full', 'paid_partial', 'settled'].includes(o.appeal_outcome || '')
      )

      // Calculate financial metrics
      const totalRequested = outcomes?.reduce(
        (sum, o) => sum + ((o.requested_amount as number) || 0),
        0
      ) || 0
      const totalApproved = outcomes?.reduce(
        (sum, o) => sum + ((o.approved_amount as number) || 0),
        0
      ) || 0
      const totalPaid = outcomes?.reduce(
        (sum, o) => sum + ((o.paid_amount as number) || 0),
        0
      ) || 0

      // Get most successful arguments
      const argumentCounts = new Map<string, number>()
      for (const outcome of outcomes || []) {
        const args = outcome.successful_arguments as string[] | null
        if (args) {
          for (const arg of args) {
            argumentCounts.set(arg, (argumentCounts.get(arg) || 0) + 1)
          }
        }
      }

      const topArguments = Array.from(argumentCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([argument, count]) => ({ argument, success_count: count }))

      // Calculate avg days to resolution
      const daysToDecision = outcomes
        ?.filter((o) => o.days_to_decision != null)
        .map((o) => o.days_to_decision as number) || []
      const avgDays =
        daysToDecision.length > 0
          ? daysToDecision.reduce((a, b) => a + b, 0) / daysToDecision.length
          : null

      return {
        success: true,
        found: true,
        filters: {
          carrier: carrier_name || 'All carriers',
          adjuster: adjuster_name || 'All adjusters',
          date_range: `Last ${date_range_days} days`,
        },
        summary: {
          total_claims: totalClaims,
          claims_with_outcomes: totalOutcomes,
          pending: totalClaims - totalOutcomes,
        },
        success_rates: {
          overall: totalOutcomes > 0
            ? `${(((paidFull.length + paidPartial.length + supplementApproved.length) / totalOutcomes) * 100).toFixed(1)}%`
            : 'N/A',
          paid_in_full: totalOutcomes > 0
            ? `${((paidFull.length / totalOutcomes) * 100).toFixed(1)}%`
            : 'N/A',
          paid_partial: totalOutcomes > 0
            ? `${((paidPartial.length / totalOutcomes) * 100).toFixed(1)}%`
            : 'N/A',
          supplement_approved: totalOutcomes > 0
            ? `${((supplementApproved.length / totalOutcomes) * 100).toFixed(1)}%`
            : 'N/A',
          denied: totalOutcomes > 0
            ? `${((denied.length / totalOutcomes) * 100).toFixed(1)}%`
            : 'N/A',
          appeal_success: appealed.length > 0
            ? `${((appealWins.length / appealed.length) * 100).toFixed(1)}%`
            : 'N/A',
        },
        financial: {
          total_requested: totalRequested > 0 ? `$${totalRequested.toLocaleString()}` : 'N/A',
          total_approved: totalApproved > 0 ? `$${totalApproved.toLocaleString()}` : 'N/A',
          total_paid: totalPaid > 0 ? `$${totalPaid.toLocaleString()}` : 'N/A',
          recovery_rate: totalRequested > 0
            ? `${((totalApproved / totalRequested) * 100).toFixed(1)}%`
            : 'N/A',
        },
        timing: {
          avg_days_to_decision: avgDays ? `${avgDays.toFixed(1)} days` : 'N/A',
        },
        top_successful_arguments: topArguments,
      }
    } catch (error) {
      logger.error('[ARIA] Error in get_claim_success_rate', { error })
      return { success: false, error: 'Failed to calculate success rates' }
    }
  },
})
