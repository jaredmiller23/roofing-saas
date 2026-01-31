/**
 * THE PACKET Generator
 *
 * Core packet assembly service. Takes a project and generates a comprehensive
 * claims documentation package that is so complete that denial is unreasonable.
 */

import { type SupabaseClient } from '@supabase/supabase-js'
import {
  getApplicableCodes,
  getManufacturerSpecs,
  getPolicyProvisions,
  checkDiscontinuedShingle,
} from '@/lib/reference-data'
import {
  generatePunchList,
  type InspectionData as XactInspectionData,
} from '@/lib/xactimate'
import { getPacketIntelligence } from './intelligence'
import type {
  ClaimsPacket,
  PacketGenerationInput,
  PacketGenerationResult,
  DamageDocumentation,
  WeatherCausation,
  PropertyInfo,
  ContactInfo,
  XactPunchListItem,
  PacketIntelligence,
} from './types'

/**
 * Generate a complete claims packet for a project
 */
export async function generatePacket(
  input: PacketGenerationInput,
  supabase: SupabaseClient
): Promise<PacketGenerationResult> {
  const {
    project_id,
    include_weather = true,
    include_codes = true,
    include_manufacturer_specs = true,
    include_policy_provisions = true,
    include_intelligence = true,
    carrier,
    carrier_id,
    adjuster_id,
    roof_manufacturer,
    jurisdiction,
  } = input

  try {
    // 1. Get project and contact data
    // Use contacts:contact_id to disambiguate (projects has two FKs to contacts)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        contacts:contact_id (
          id,
          first_name,
          last_name,
          email,
          phone,
          insurance_carrier,
          insurance_policy_number,
          address_street,
          address_city,
          address_state,
          address_zip
        )
      `)
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      return { success: false, error: `Project not found: ${projectError?.message}` }
    }

    // Fetch claim data separately (no FK constraint between projects and claims)
    const { data: claimRows } = await supabase
      .from('claims')
      .select('id, adjuster_id, carrier_id, insurance_carrier')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false })
      .limit(1)

    const claim = claimRows?.[0] || null

    // 2. Get inspection data (photos and damage documentation)
    const damage = await getInspectionData(project_id, supabase)

    // 3. Get weather causation (if enabled)
    let weather_causation: WeatherCausation | undefined
    if (include_weather) {
      weather_causation = await getWeatherCausation(project_id, supabase)
    }

    // Extract contact (may be object or array depending on PostgREST response)
    const contactData = Array.isArray(project.contacts)
      ? project.contacts[0]
      : project.contacts

    // 4. Determine jurisdiction (address lives on contacts, not projects)
    const state = jurisdiction?.state || contactData?.address_state || 'TN'
    const county = jurisdiction?.county
    const city = jurisdiction?.city || contactData?.address_city

    // 5. Get applicable building codes
    const applicable_codes = include_codes
      ? await getApplicableCodes({
          state,
          county,
          city,
          damageTypes: damage.affected_areas,
        })
      : []

    // 6. Get manufacturer specs
    const manufacturer = roof_manufacturer || project.roof_manufacturer || 'GAF'
    const manufacturer_specs = include_manufacturer_specs
      ? await getManufacturerSpecs({ manufacturer })
      : []

    // 7. Get policy provisions
    const insuranceCarrier = carrier || claim?.insurance_carrier || contactData?.insurance_carrier
    const policy_provisions = include_policy_provisions && insuranceCarrier
      ? await getPolicyProvisions({ carrier: insuranceCarrier })
      : []

    // 8. Get intelligence data (adjuster/carrier patterns)
    let intelligence: PacketIntelligence | undefined
    if (include_intelligence) {
      const resolvedAdjusterId = adjuster_id || claim?.adjuster_id
      const resolvedCarrierId = carrier_id || claim?.carrier_id
      const resolvedCarrierName = insuranceCarrier

      if (resolvedAdjusterId || resolvedCarrierId || resolvedCarrierName) {
        intelligence = await getPacketIntelligence({
          tenant_id: project.tenant_id,
          adjuster_id: resolvedAdjusterId,
          carrier_id: resolvedCarrierId,
          carrier_name: resolvedCarrierName,
        })
      }
    }

    // 9. Check discontinued shingle status
    const shingle_analysis = await analyzeShingleStatus({
      manufacturer,
      productLine: project.roof_product_line,
      productName: project.roof_product_name,
      color: project.roof_color,
    })

    // 10. Generate Xactimate punch list with project measurements
    const xactimate_punch_list = generateXactPunchList(damage, {
      roof_squares: project.roof_squares,
      ridge_linear_feet: project.ridge_linear_feet,
      hip_linear_feet: project.hip_linear_feet,
      valley_linear_feet: project.valley_linear_feet,
      eave_linear_feet: project.eave_linear_feet,
      rake_linear_feet: project.rake_linear_feet,
      drip_edge_linear_feet: project.drip_edge_linear_feet,
      gutter_linear_feet: project.gutter_linear_feet,
      pipe_boot_count: project.pipe_boot_count,
      vent_count: project.vent_count,
      skylight_count: project.skylight_count,
      chimney_count: project.chimney_count,
      satellite_count: project.satellite_count,
      downspout_count: project.downspout_count,
      deck_repair_square_feet: project.deck_repair_square_feet,
      roof_pitch: project.roof_pitch,
      stories: project.stories,
      has_steep_sections: project.has_steep_sections,
    })

    // 11. Build property info (address lives on contacts, not projects)
    const customFields = (project.custom_fields || {}) as Record<string, unknown>
    const property: PropertyInfo = {
      address: contactData?.address_street || (customFields.property_address as string) || '',
      city: contactData?.address_city || (customFields.property_city as string) || '',
      state: contactData?.address_state || (customFields.property_state as string) || '',
      zip: contactData?.address_zip || (customFields.property_zip as string) || '',
      property_type: (customFields.property_type as PropertyInfo['property_type']) || 'residential',
      year_built: customFields.year_built as number | undefined,
      roof_type: customFields.roof_type as string | undefined,
      roof_material: customFields.roof_material as string | undefined,
      roof_manufacturer: manufacturer,
      roof_age_years: customFields.roof_age as number | undefined,
    }

    // 12. Build contact info
    const contact: ContactInfo = {
      id: contactData?.id || project.contact_id,
      first_name: contactData?.first_name || '',
      last_name: contactData?.last_name || '',
      email: contactData?.email,
      phone: contactData?.phone,
      insurance_carrier: contactData?.insurance_carrier,
      policy_number: contactData?.insurance_policy_number,
    }

    // 13. Determine recommended action
    const recommendedAction = determineRecommendedAction(
      damage,
      shingle_analysis,
      applicable_codes
    )

    // 14. Assemble THE PACKET
    const packet: ClaimsPacket = {
      id: crypto.randomUUID(),
      generated_at: new Date().toISOString(),
      version: '1.0.0',
      project_id,
      property,
      contact,
      damage,
      weather_causation: weather_causation || {
        events: [],
        causation_narrative: '',
        evidence_score: 0,
      },
      applicable_codes,
      manufacturer_specs,
      policy_provisions,
      shingle_analysis,
      xactimate_punch_list,
      intelligence,
      summary: {
        loss_date: project.date_of_loss || project.created_at,
        claim_type: project.claim_type || 'roof',
        damage_overview: damage.damage_summary,
        recommended_action: recommendedAction.action,
        replacement_justification: recommendedAction.justification,
        estimated_value: project.estimated_value,
      },
    }

    // 15. Store packet in database
    const { error: saveError } = await supabase.from('packets').insert({
      tenant_id: project.tenant_id,
      project_id,
      claim_id: project.claim_id,
      packet_data: packet,
      status: 'draft',
      generated_by: null, // Will be set by auth context
    })

    if (saveError) {
      console.error('Error saving packet:', saveError)
      // Continue anyway - packet generation succeeded
    }

    return { success: true, packet }
  } catch (error) {
    console.error('Packet generation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error generating packet',
    }
  }
}

/**
 * Get inspection/damage data for a project
 */
async function getInspectionData(project_id: string, supabase: SupabaseClient): Promise<DamageDocumentation> {
  // Get inspection photos
  const { data: photos } = await supabase
    .from('project_photos')
    .select('*')
    .eq('project_id', project_id)
    .order('created_at', { ascending: false })

  // Get inspection checklist data
  const { data: inspection } = await supabase
    .from('project_inspections')
    .select('*')
    .eq('project_id', project_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Map photos to damage documentation format
  const damagePhotos = (photos || []).map((photo) => ({
    id: photo.id,
    url: photo.url,
    caption: photo.caption || photo.description,
    damage_type: photo.damage_type || photo.category,
    severity: photo.severity,
    location: photo.location || photo.area,
    taken_at: photo.taken_at || photo.created_at,
    gps_coordinates: photo.gps_lat && photo.gps_lng
      ? { lat: photo.gps_lat, lng: photo.gps_lng }
      : undefined,
  }))

  // Extract affected areas from photos and inspection
  const affectedAreas = new Set<string>()
  damagePhotos.forEach((p) => {
    if (p.damage_type) affectedAreas.add(p.damage_type)
    if (p.location) affectedAreas.add(p.location)
  })

  // Add common roofing damage types based on inspection
  if (inspection?.findings) {
    const findings = inspection.findings as Record<string, unknown>
    if (findings.shingle_damage) affectedAreas.add('shingles')
    if (findings.flashing_damage) affectedAreas.add('flashing')
    if (findings.ridge_damage) affectedAreas.add('ridge_cap')
    if (findings.gutter_damage) affectedAreas.add('gutters')
    if (findings.underlayment_damage) affectedAreas.add('underlayment')
  }

  return {
    photos: damagePhotos,
    inspection_date: inspection?.inspection_date || new Date().toISOString(),
    inspector_name: inspection?.inspector_name,
    damage_summary: inspection?.summary || generateDamageSummary(damagePhotos),
    affected_areas: Array.from(affectedAreas),
    test_square_count: inspection?.test_square_count,
    hail_hits_per_square: inspection?.hail_hits_per_square,
  }
}

/**
 * Get weather causation data for a project
 */
async function getWeatherCausation(project_id: string, supabase: SupabaseClient): Promise<WeatherCausation | undefined> {
  // Check for existing weather report
  const { data: report } = await supabase
    .from('weather_reports')
    .select('*')
    .eq('project_id', project_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (report) {
    return {
      events: report.events || [],
      causation_narrative: report.narrative || '',
      evidence_score: report.evidence_score || 0,
      pdf_url: report.pdf_url,
    }
  }

  // Check for linked storm events
  const { data: project } = await supabase
    .from('projects')
    .select('storm_event_id')
    .eq('id', project_id)
    .single()

  if (project?.storm_event_id) {
    const { data: stormEvent } = await supabase
      .from('storm_events')
      .select('*')
      .eq('id', project.storm_event_id)
      .single()

    if (stormEvent) {
      return {
        events: [
          {
            event_date: stormEvent.event_date,
            event_type: stormEvent.event_type,
            magnitude: stormEvent.magnitude,
            distance_miles: stormEvent.distance_miles,
            source: stormEvent.source || 'NOAA',
          },
        ],
        causation_narrative: `Storm event ${stormEvent.event_type} occurred on ${stormEvent.event_date} within ${stormEvent.distance_miles || 'unknown'} miles of the property.`,
        evidence_score: calculateEvidenceScore(stormEvent),
      }
    }
  }

  return undefined
}

/**
 * Analyze shingle status (discontinued check)
 */
async function analyzeShingleStatus(params: {
  manufacturer?: string
  productLine?: string
  productName?: string
  color?: string
}): Promise<ClaimsPacket['shingle_analysis']> {
  const { manufacturer, productLine, productName, color } = params

  if (!manufacturer && !productLine && !productName) {
    return {
      is_discontinued: false,
    }
  }

  const discontinued = await checkDiscontinuedShingle({
    manufacturer,
    productLine,
    productName,
    color,
  })

  if (discontinued) {
    let reason = `${discontinued.manufacturer} ${discontinued.product_name} was discontinued`
    if (discontinued.discontinued_date) {
      reason += ` on ${discontinued.discontinued_date}`
    }
    if (discontinued.replaced_by && !discontinued.can_mix_with_replacement) {
      reason += `. Replaced by ${discontinued.replaced_by} which cannot be mixed with existing materials.`
    }
    if (discontinued.manufacturer_statement) {
      reason += ` Per manufacturer: "${discontinued.manufacturer_statement}"`
    }

    return {
      identified_shingle: `${manufacturer || ''} ${productLine || ''} ${productName || ''} ${color || ''}`.trim(),
      is_discontinued: true,
      discontinued_info: discontinued,
      replacement_required_reason: reason,
    }
  }

  return {
    identified_shingle: `${manufacturer || ''} ${productLine || ''} ${productName || ''} ${color || ''}`.trim(),
    is_discontinued: false,
  }
}

/**
 * Generate Xactimate punch list from damage documentation and project measurements
 * Uses the comprehensive damage-to-Xact mapping from lib/xactimate
 */
function generateXactPunchList(
  damage: DamageDocumentation,
  projectMeasurements?: {
    roof_squares?: number
    ridge_linear_feet?: number
    hip_linear_feet?: number
    valley_linear_feet?: number
    eave_linear_feet?: number
    rake_linear_feet?: number
    drip_edge_linear_feet?: number
    gutter_linear_feet?: number
    pipe_boot_count?: number
    vent_count?: number
    skylight_count?: number
    chimney_count?: number
    satellite_count?: number
    downspout_count?: number
    deck_repair_square_feet?: number
    roof_pitch?: string
    stories?: number
    has_steep_sections?: boolean
  }
): XactPunchListItem[] {
  // Build inspection data for the punch list generator
  const inspectionData: XactInspectionData = {
    affected_areas: damage.affected_areas,
    hail_hits_per_square: damage.hail_hits_per_square,
    test_square_count: damage.test_square_count,
    // Add measurements if provided
    ...projectMeasurements,
  }

  // Generate comprehensive punch list
  const result = generatePunchList(inspectionData, {
    include_overhead_profit: true,
    include_steep_charge: true,
    include_high_roof_charge: true,
    group_by_category: true,
  })

  // Convert to XactPunchListItem format
  return result.items.map((item) => ({
    code: item.code,
    description: item.description,
    unit: item.unit,
    quantity: item.quantity,
    quantity_source: item.quantity_source,
    notes: item.special_instructions || item.notes,
    category: item.category,
  }))
}

/**
 * Determine recommended action based on damage, shingle status, and codes
 */
function determineRecommendedAction(
  damage: DamageDocumentation,
  shingleAnalysis: ClaimsPacket['shingle_analysis'],
  codes: ClaimsPacket['applicable_codes']
): { action: 'repair' | 'partial_replacement' | 'full_replacement'; justification: string } {
  const reasons: string[] = []

  // Discontinued shingle = full replacement
  if (shingleAnalysis?.is_discontinued) {
    reasons.push(shingleAnalysis.replacement_required_reason || 'Existing shingle is discontinued')
    return { action: 'full_replacement', justification: reasons.join(' ') }
  }

  // High hail damage = full replacement
  if (damage.hail_hits_per_square && damage.hail_hits_per_square >= 8) {
    reasons.push(
      `Test square shows ${damage.hail_hits_per_square} hits per square, exceeding industry standard threshold for replacement.`
    )
    return { action: 'full_replacement', justification: reasons.join(' ') }
  }

  // Check for code-required replacement (e.g., two existing layers)
  const reRoofCode = codes.find((c) => c.code_section === 'R908.3')
  if (reRoofCode) {
    reasons.push(
      `IRC R908.3 requires removal of existing roof covering when damaged or deteriorated beyond adequate base condition.`
    )
  }

  // Multiple affected areas = likely full replacement
  if (damage.affected_areas.length >= 4) {
    reasons.push(
      `Damage documented across ${damage.affected_areas.length} roof areas indicating widespread damage.`
    )
    return {
      action: 'full_replacement',
      justification: reasons.join(' ') || 'Extensive damage across multiple roof areas.',
    }
  }

  // Some affected areas = partial replacement
  if (damage.affected_areas.length >= 2) {
    return {
      action: 'partial_replacement',
      justification: `Damage limited to ${damage.affected_areas.join(', ')}. Partial replacement recommended.`,
    }
  }

  // Minor damage = repair
  return {
    action: 'repair',
    justification: 'Minor damage documented. Repair may be appropriate.',
  }
}

/**
 * Generate damage summary from photos
 */
function generateDamageSummary(photos: DamageDocumentation['photos']): string {
  if (!photos.length) {
    return 'No damage documentation available.'
  }

  const damageTypes = [...new Set(photos.map((p) => p.damage_type).filter(Boolean))]
  const severities = [...new Set(photos.map((p) => p.severity).filter(Boolean))]

  let summary = `Inspection documented ${photos.length} photos of damage.`
  if (damageTypes.length) {
    summary += ` Damage types include: ${damageTypes.join(', ')}.`
  }
  if (severities.length) {
    summary += ` Severity levels: ${severities.join(', ')}.`
  }

  return summary
}

/**
 * Calculate evidence score for storm event
 */
function calculateEvidenceScore(stormEvent: {
  magnitude?: number
  distance_miles?: number
  event_type?: string
}): number {
  let score = 50 // Base score

  // Magnitude bonus
  if (stormEvent.magnitude) {
    if (stormEvent.magnitude >= 2) score += 30
    else if (stormEvent.magnitude >= 1.5) score += 20
    else if (stormEvent.magnitude >= 1) score += 10
  }

  // Distance bonus (closer = better)
  if (stormEvent.distance_miles !== undefined) {
    if (stormEvent.distance_miles <= 1) score += 20
    else if (stormEvent.distance_miles <= 5) score += 15
    else if (stormEvent.distance_miles <= 10) score += 10
    else if (stormEvent.distance_miles <= 20) score += 5
  }

  // Event type bonus
  if (stormEvent.event_type === 'hail') score += 10
  if (stormEvent.event_type === 'tornado') score += 15

  return Math.min(score, 100)
}

