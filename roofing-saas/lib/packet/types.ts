/**
 * THE PACKET - Claims Documentation Types
 *
 * Type definitions for comprehensive claims documentation packets.
 * The packet is designed to be so complete that denial is unreasonable.
 */

import type {
  PatternWarning,
  PacketIntelligence,
} from '@/lib/claims/intelligence-types'

// Re-export intelligence types for convenience
export type { PatternWarning, PacketIntelligence }

/**
 * Building code reference from database
 */
export interface BuildingCode {
  id: string
  jurisdiction_level: 'federal' | 'state' | 'county' | 'city'
  jurisdiction_name: string
  state_code: string
  county?: string
  city?: string
  code_type: string // IRC, IBC, local
  code_section: string
  code_title: string
  code_text: string
  applies_to: string[]
  effective_date: string
  source_document: string
  version: string
}

/**
 * Manufacturer specification from database
 */
export interface ManufacturerSpec {
  id: string
  manufacturer: string
  product_category: string
  product_name: string
  installation_requirements: {
    nailing?: {
      pattern: string
      placement: string
      penetration: string
    }
    starter_strip?: string
    hip_ridge?: string
    underlayment?: string
    ventilation?: string
    slope_minimum?: string
    temperature?: string
    [key: string]: unknown
  }
  warranty_requirements: {
    standard_warranty?: string
    wind_warranty?: string
    installer_requirement?: string
    required_accessories?: string[]
    [key: string]: unknown
  }
  matching_policy: string
  spec_sheet_url?: string
  installation_guide_url?: string
}

/**
 * Policy provision from database
 */
export interface PolicyProvision {
  id: string
  carrier: string
  policy_form: string
  provision_type: 'coverage' | 'exclusion' | 'condition' | 'definition'
  provision_name: string
  provision_text: string
  common_disputes: string[]
}

/**
 * Discontinued shingle information
 */
export interface DiscontinuedShingle {
  id: string
  manufacturer: string
  product_line: string
  product_name: string
  color?: string
  discontinued_date?: string
  replaced_by?: string
  can_mix_with_replacement: boolean
  manufacturer_statement?: string
  visual_identifiers?: Record<string, unknown>
  notes?: string
}

/**
 * Weather causation data (from existing storm intelligence)
 */
export interface WeatherCausation {
  events: Array<{
    event_date: string
    event_type: string
    magnitude?: number
    distance_miles?: number
    source: string
  }>
  causation_narrative: string
  evidence_score: number
  pdf_url?: string
}

/**
 * Damage documentation from inspection
 */
export interface DamageDocumentation {
  photos: Array<{
    id: string
    url: string
    caption?: string
    damage_type?: string
    severity?: string
    location?: string
    taken_at: string
    gps_coordinates?: {
      lat: number
      lng: number
    }
  }>
  inspection_date: string
  inspector_name?: string
  damage_summary: string
  affected_areas: string[]
  test_square_count?: number
  hail_hits_per_square?: number
}

/**
 * Property information
 */
export interface PropertyInfo {
  address: string
  city: string
  state: string
  zip: string
  property_type: 'residential' | 'commercial' | 'multi_family'
  year_built?: number
  roof_type?: string
  roof_material?: string
  roof_manufacturer?: string
  roof_age_years?: number
}

/**
 * Contact/homeowner information
 */
export interface ContactInfo {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  insurance_carrier?: string
  policy_number?: string
}

/**
 * Xactimate punch list item
 */
export interface XactPunchListItem {
  code: string
  description: string
  quantity?: number
  unit?: string
  notes?: string
  quantity_source?: string // Where the quantity came from (e.g., "Roof measurement", "Pipe boot count")
  category?: string // For grouping (e.g., "Tear-off", "Shingles", "Flashing")
}

/**
 * THE PACKET - Complete claims documentation package
 */
export interface ClaimsPacket {
  // Metadata
  id: string
  generated_at: string
  generated_by?: string
  version: string

  // Project/Claim reference
  project_id: string
  claim_id?: string

  // Property and contact
  property: PropertyInfo
  contact: ContactInfo

  // Core documentation
  damage: DamageDocumentation
  weather_causation: WeatherCausation

  // Reference data (what makes this powerful)
  applicable_codes: BuildingCode[]
  manufacturer_specs: ManufacturerSpec[]
  policy_provisions: PolicyProvision[]

  // Discontinued shingle analysis
  shingle_analysis?: {
    identified_shingle?: string
    is_discontinued: boolean
    discontinued_info?: DiscontinuedShingle
    replacement_required_reason?: string
  }

  // Estimate/scope
  xactimate_punch_list?: XactPunchListItem[]

  // Intelligence warnings (from adjuster/carrier pattern tracking)
  intelligence?: PacketIntelligence

  // Executive summary
  summary: {
    loss_date: string
    claim_type: string
    damage_overview: string
    recommended_action: 'repair' | 'partial_replacement' | 'full_replacement'
    replacement_justification?: string
    estimated_value?: number
  }

  // Export URLs
  pdf_url?: string
  json_export_url?: string
}

/**
 * Input for packet generation
 */
export interface PacketGenerationInput {
  project_id: string
  include_weather?: boolean
  include_codes?: boolean
  include_manufacturer_specs?: boolean
  include_policy_provisions?: boolean
  include_intelligence?: boolean // Include adjuster/carrier pattern warnings
  carrier?: string // To filter policy provisions
  carrier_id?: string // For intelligence lookup
  adjuster_id?: string // For intelligence lookup
  roof_manufacturer?: string // To filter manufacturer specs
  jurisdiction?: {
    state: string
    county?: string
    city?: string
  }
}

/**
 * Packet generation result
 */
export interface PacketGenerationResult {
  success: boolean
  packet?: ClaimsPacket
  pdf_url?: string
  error?: string
}
