/**
 * Packet Intelligence Service
 *
 * Fetches adjuster and carrier patterns to generate warnings
 * for the claims packet. This is the intelligence feedback loop
 * that makes the system learn from past claims.
 */

import { createClient } from '@/lib/supabase/client'
import type {
  Adjuster,
  InsuranceCarrier,
  AdjusterPattern,
  CarrierPattern,
  PatternWarning,
  PacketIntelligence,
  PatternFrequency,
} from '@/lib/claims/intelligence-types'

/**
 * Get intelligence data for packet generation
 */
export async function getPacketIntelligence(params: {
  tenant_id: string
  adjuster_id?: string
  carrier_id?: string
  carrier_name?: string
}): Promise<PacketIntelligence> {
  const supabase = createClient()
  const { tenant_id, adjuster_id, carrier_id, carrier_name } = params

  const warnings: PatternWarning[] = []
  const suggestedDocumentation: string[] = []
  let adjuster: Adjuster | undefined
  let carrier: InsuranceCarrier | undefined
  let adjusterPatterns: AdjusterPattern[] = []
  let carrierPatterns: CarrierPattern[] = []

  // Fetch adjuster data and patterns if adjuster_id provided
  if (adjuster_id) {
    const { data: adjusterData } = await supabase
      .from('insurance_personnel')
      .select(`
        id,
        tenant_id,
        carrier_id,
        first_name,
        last_name,
        role,
        email,
        phone,
        total_claims_handled,
        avg_response_days,
        avg_claim_approval_rate,
        common_omissions,
        communication_style,
        notes,
        created_at,
        updated_at,
        last_interaction_at,
        insurance_carriers!carrier_id (
          name
        )
      `)
      .eq('id', adjuster_id)
      .eq('tenant_id', tenant_id)
      .single()

    if (adjusterData) {
      const carrierInfo = adjusterData.insurance_carriers as unknown as { name: string } | null
      adjuster = {
        id: adjusterData.id,
        tenant_id: adjusterData.tenant_id ?? '',
        carrier_id: adjusterData.carrier_id ?? undefined,
        carrier_name: carrierInfo?.name,
        first_name: adjusterData.first_name ?? '',
        last_name: adjusterData.last_name ?? '',
        role: adjusterData.role ?? undefined,
        email: adjusterData.email ?? undefined,
        phone: adjusterData.phone ?? undefined,
        total_claims_handled: adjusterData.total_claims_handled ?? 0,
        avg_response_days: adjusterData.avg_response_days ?? undefined,
        avg_claim_approval_rate: adjusterData.avg_claim_approval_rate ?? undefined,
        common_omissions: (adjusterData.common_omissions as string[]) ?? undefined,
        communication_style: adjusterData.communication_style ?? undefined,
        notes: adjusterData.notes ?? undefined,
        created_at: adjusterData.created_at ?? '',
        updated_at: adjusterData.updated_at ?? '',
        last_interaction_at: adjusterData.last_interaction_at ?? undefined,
      }

      // Fetch adjuster patterns
      const { data: patterns } = await supabase
        .from('adjuster_patterns')
        .select('*')
        .eq('adjuster_id', adjuster_id)
        .eq('tenant_id', tenant_id)
        .order('occurrence_count', { ascending: false })

      if (patterns) {
        adjusterPatterns = patterns.map(p => ({
          ...p,
          pattern_detail: p.pattern_detail ?? undefined,
          successful_counter: p.successful_counter ?? undefined,
          notes: p.notes ?? undefined,
        })) as AdjusterPattern[]

        // Generate warnings from adjuster patterns
        for (const pattern of adjusterPatterns) {
          const warning = generateAdjusterWarning(pattern, adjuster)
          if (warning) {
            warnings.push(warning)
          }

          // Add suggested documentation based on pattern
          const docs = getSuggestedDocumentation(pattern)
          suggestedDocumentation.push(...docs)
        }
      }

      // Add warnings from common_omissions
      if (adjuster && adjuster.common_omissions && adjuster.common_omissions.length > 0) {
        warnings.push({
          type: 'adjuster',
          severity: 'high',
          pattern_type: 'omits_line_item',
          message: `${adjuster.first_name} ${adjuster.last_name} typically omits: ${adjuster.common_omissions.join(', ')}`,
          occurrence_count: adjuster.total_claims_handled,
        })

        // Add documentation suggestions for each omission
        for (const omission of adjuster.common_omissions) {
          suggestedDocumentation.push(`Include detailed documentation for ${omission}`)
        }
      }
    }
  }

  // Fetch carrier data and patterns
  const resolvedCarrierId = carrier_id || adjuster?.carrier_id
  if (resolvedCarrierId) {
    const { data: carrierData } = await supabase
      .from('insurance_carriers')
      .select('*')
      .eq('id', resolvedCarrierId)
      .single()

    if (carrierData) {
      carrier = carrierData as unknown as InsuranceCarrier

      // Add warnings from carrier known_issues
      if (carrier.known_issues && carrier.known_issues.length > 0) {
        warnings.push({
          type: 'carrier',
          severity: 'medium',
          pattern_type: 'disputes_line_item',
          message: `${carrier.name} known issues: ${carrier.known_issues.join(', ')}`,
          occurrence_count: carrier.total_claims_tracked || 0,
        })
      }
    }
  }

  // Fetch carrier patterns by carrier_id or carrier_name
  if (resolvedCarrierId || carrier_name) {
    let query = supabase
      .from('carrier_patterns')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('occurrence_count', { ascending: false })

    if (resolvedCarrierId) {
      query = query.eq('carrier_id', resolvedCarrierId)
    } else if (carrier_name) {
      query = query.eq('carrier_name', carrier_name)
    }

    const { data: patterns } = await query

    if (patterns) {
      carrierPatterns = patterns.map(p => ({
        ...p,
        carrier_id: p.carrier_id ?? undefined,
        carrier_name: p.carrier_name ?? undefined,
        pattern_detail: p.pattern_detail ?? undefined,
        successful_counter: p.successful_counter ?? undefined,
        notes: p.notes ?? undefined,
      })) as CarrierPattern[]

      // Generate warnings from carrier patterns
      for (const pattern of carrierPatterns) {
        const warning = generateCarrierWarning(pattern, carrier?.name || carrier_name)
        if (warning) {
          warnings.push(warning)
        }

        // Add suggested documentation
        const docs = getSuggestedDocumentation(pattern)
        suggestedDocumentation.push(...docs)
      }
    }
  }

  // Sort warnings by severity
  const severityOrder = { high: 0, medium: 1, low: 2 }
  warnings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  // Deduplicate suggested documentation
  const uniqueDocs = [...new Set(suggestedDocumentation)]

  return {
    adjuster,
    carrier,
    adjuster_patterns: adjusterPatterns,
    carrier_patterns: carrierPatterns,
    warnings,
    suggested_documentation: uniqueDocs,
  }
}

/**
 * Generate a warning from an adjuster pattern
 */
function generateAdjusterWarning(
  pattern: AdjusterPattern,
  adjuster?: Adjuster
): PatternWarning | null {
  const adjusterName = adjuster
    ? `${adjuster.first_name} ${adjuster.last_name}`
    : 'Adjuster'

  const severity = getPatternSeverity(pattern.pattern_type, pattern.frequency)

  let message = ''
  switch (pattern.pattern_type) {
    case 'omits_line_item':
      message = `${adjusterName} typically omits ${pattern.pattern_detail || 'certain line items'}`
      break
    case 'disputes_item':
      message = `${adjusterName} often disputes ${pattern.pattern_detail || 'certain items'}`
      break
    case 'slow_response':
      message = `${adjusterName} has slow response times - plan for delays`
      break
    case 'unreachable':
      message = `${adjusterName} can be difficult to reach - document all contact attempts`
      break
    case 'low_balls':
      message = `${adjusterName} tends to undervalue claims - include detailed pricing support`
      break
    case 'thorough':
      return null // Positive pattern, no warning needed
    case 'reasonable':
      return null // Positive pattern, no warning needed
    case 'fair':
      return null // Positive pattern, no warning needed
    default:
      message = `${adjusterName} pattern: ${pattern.pattern_type}`
  }

  // Add frequency context
  if (pattern.frequency === 'always') {
    message += ' (always)'
  } else if (pattern.frequency === 'often') {
    message += ' (frequently)'
  }

  return {
    type: 'adjuster',
    severity,
    pattern_type: pattern.pattern_type,
    pattern_detail: pattern.pattern_detail,
    message,
    suggested_counter: pattern.successful_counter || undefined,
    occurrence_count: pattern.occurrence_count,
  }
}

/**
 * Generate a warning from a carrier pattern
 */
function generateCarrierWarning(
  pattern: CarrierPattern,
  carrierName?: string
): PatternWarning | null {
  const name = carrierName || pattern.carrier_name || 'Carrier'
  const severity = getPatternSeverity(pattern.pattern_type, pattern.frequency)

  let message = ''
  switch (pattern.pattern_type) {
    case 'denies_coverage':
      message = `${name} often denies coverage for ${pattern.pattern_detail || 'certain items'}`
      break
    case 'disputes_line_item':
      message = `${name} typically disputes ${pattern.pattern_detail || 'certain line items'}`
      break
    case 'slow_payment':
      message = `${name} has slow payment processing - set expectations with homeowner`
      break
    case 'requires_inspection':
      message = `${name} typically requires reinspection - be prepared`
      break
    case 'fights_matching':
      message = `${name} often disputes matching requirements - include matching documentation`
      break
    case 'fights_code_upgrade':
      message = `${name} often disputes code upgrade coverage - include code references`
      break
    case 'accepts_supplements':
      return null // Positive pattern, no warning needed
    default:
      message = `${name} pattern: ${pattern.pattern_type}`
  }

  // Add frequency context
  if (pattern.frequency === 'always') {
    message += ' (always)'
  } else if (pattern.frequency === 'often') {
    message += ' (frequently)'
  }

  return {
    type: 'carrier',
    severity,
    pattern_type: pattern.pattern_type,
    pattern_detail: pattern.pattern_detail,
    message,
    suggested_counter: pattern.successful_counter || undefined,
    occurrence_count: pattern.occurrence_count,
  }
}

/**
 * Determine warning severity based on pattern type and frequency
 */
function getPatternSeverity(
  patternType: string,
  frequency: PatternFrequency
): 'high' | 'medium' | 'low' {
  // High severity patterns
  const highSeverityPatterns = [
    'omits_line_item',
    'denies_coverage',
    'low_balls',
  ]

  // Medium severity patterns
  const mediumSeverityPatterns = [
    'disputes_item',
    'disputes_line_item',
    'fights_matching',
    'fights_code_upgrade',
  ]

  if (highSeverityPatterns.includes(patternType)) {
    return frequency === 'always' || frequency === 'often' ? 'high' : 'medium'
  }

  if (mediumSeverityPatterns.includes(patternType)) {
    return frequency === 'always' ? 'high' : 'medium'
  }

  return 'low'
}

/**
 * Get suggested documentation based on pattern
 */
function getSuggestedDocumentation(
  pattern: AdjusterPattern | CarrierPattern
): string[] {
  const suggestions: string[] = []
  const detail = pattern.pattern_detail

  // Suggestions based on pattern detail
  switch (detail) {
    case 'drip_edge':
      suggestions.push('Include photos of existing drip edge condition')
      suggestions.push('Reference IRC R905.2.8.5 for drip edge requirements')
      break
    case 'starter_strip':
      suggestions.push('Document starter strip installation requirements per manufacturer')
      suggestions.push('Include manufacturer warranty requirements for starter')
      break
    case 'steep_charge':
      suggestions.push('Include roof pitch measurements and documentation')
      suggestions.push('Reference OSHA requirements for steep roof work')
      break
    case 'O&P':
      suggestions.push('Document all subcontractor involvement')
      suggestions.push('Include general contractor overhead calculations')
      break
    case 'OL_coverage':
      suggestions.push('Include all applicable building codes')
      suggestions.push('Document code upgrades required')
      break
    case 'ice_water_shield':
      suggestions.push('Reference IRC R905.1.2 for ice dam protection requirements')
      suggestions.push('Include climate zone documentation')
      break
    case 'ridge_vent':
      suggestions.push('Document existing ventilation and requirements')
      suggestions.push('Include manufacturer ventilation specifications')
      break
    case 'pipe_boots':
      suggestions.push('Photo each pipe boot with condition assessment')
      suggestions.push('Document age and material of existing boots')
      break
    case 'flashing':
      suggestions.push('Detail photos of all flashing points')
      suggestions.push('Include flashing installation requirements')
      break
    case 'underlayment':
      suggestions.push('Document underlayment type and condition')
      suggestions.push('Include manufacturer underlayment requirements')
      break
    case 'matching':
      suggestions.push('Include shingle manufacturer matching policy')
      suggestions.push('Document color fade/weathering of existing shingles')
      break
    case 'code_upgrade':
      suggestions.push('List all applicable building code updates')
      suggestions.push('Include Ordinance & Law coverage analysis')
      break
  }

  // Suggestions based on pattern type
  if (pattern.pattern_type === 'slow_response') {
    suggestions.push('Document all communication attempts with dates/times')
    suggestions.push('Send written follow-ups after phone calls')
  }

  if (pattern.pattern_type === 'unreachable') {
    suggestions.push('Use certified mail for important documents')
    suggestions.push('Copy carrier claims department on correspondence')
  }

  return suggestions
}
