/**
 * Claims Intelligence Types
 *
 * Type definitions for the claims intelligence platform.
 * Tracks adjuster patterns, carrier patterns, and claim outcomes
 * to build compounding advantage over time.
 */

// ============================================
// Common Enums/Constants
// ============================================

/**
 * Pattern types for adjusters
 */
export type AdjusterPatternType =
  | 'omits_line_item'    // Consistently leaves out specific line items
  | 'disputes_item'      // Disputes specific items/coverages
  | 'slow_response'      // Takes longer than average to respond
  | 'unreachable'        // Difficult to contact
  | 'thorough'           // Does complete inspections
  | 'reasonable'         // Easy to work with
  | 'low_balls'          // Consistently undervalues
  | 'fair'               // Generally fair assessments

/**
 * Pattern types for carriers
 */
export type CarrierPatternType =
  | 'denies_coverage'        // Denies specific coverage types
  | 'disputes_line_item'     // Disputes specific line items
  | 'slow_payment'           // Takes longer than average to pay
  | 'requires_inspection'    // Always requires reinspection
  | 'accepts_supplements'    // Generally approves supplements
  | 'fights_matching'        // Disputes matching requirements
  | 'fights_code_upgrade'    // Disputes code upgrade coverage

/**
 * Specific items/coverages that patterns relate to
 */
export type PatternDetail =
  | 'drip_edge'
  | 'starter_strip'
  | 'steep_charge'
  | 'O&P'                    // Overhead & Profit
  | 'OL_coverage'            // Ordinance & Law coverage
  | 'ice_water_shield'
  | 'ridge_vent'
  | 'pipe_boots'
  | 'flashing'
  | 'underlayment'
  | 'matching'
  | 'code_upgrade'
  | 'depreciation'
  | 'debris_removal'
  | string                    // Allow custom patterns

/**
 * Frequency of pattern occurrence
 */
export type PatternFrequency = 'always' | 'often' | 'sometimes' | 'rarely'

/**
 * Claim outcome types
 */
export type ClaimOutcomeType =
  | 'paid_full'           // Paid in full as requested
  | 'paid_partial'        // Paid but less than requested
  | 'denied'              // Claim denied
  | 'supplement_approved' // Supplement approved after initial
  | 'litigation'          // Went to litigation
  | 'settled'             // Settled outside normal process
  | 'withdrawn'           // Claim withdrawn

/**
 * Denial reasons
 */
export type DenialReason =
  | 'no_damage_found'
  | 'pre_existing'
  | 'not_covered'
  | 'maintenance_issue'
  | 'cosmetic_only'
  | 'below_deductible'
  | 'exclusion_applies'
  | string                // Allow custom reasons

// ============================================
// Insurance Personnel (Adjuster) Types
// ============================================

/**
 * Insurance personnel (adjuster) entity
 * Maps to the insurance_personnel table
 */
export interface Adjuster {
  id: string
  tenant_id: string
  carrier_id?: string
  carrier_name?: string // Denormalized for display

  // Identity
  first_name: string
  last_name: string
  role?: string // 'field_adjuster', 'desk_adjuster', 'supervisor'

  // Contact
  email?: string
  phone?: string

  // Aggregated stats
  total_claims_handled: number
  avg_response_days?: number
  avg_claim_approval_rate?: number
  avg_supplement_approval_rate?: number

  // Pattern summaries (array of common issues)
  common_omissions?: string[]
  communication_style?: string
  tips?: string[]
  notes?: string

  // Timestamps
  created_at: string
  updated_at: string
  last_interaction_at?: string
}

/**
 * Adjuster pattern - granular tracking of specific behaviors
 */
export interface AdjusterPattern {
  id: string
  tenant_id: string
  adjuster_id: string

  pattern_type: AdjusterPatternType
  pattern_detail?: PatternDetail
  frequency: PatternFrequency

  // What works against this pattern
  successful_counter?: string
  notes?: string

  // How many times we've observed this
  occurrence_count: number

  created_at: string
  updated_at: string
}

/**
 * Create adjuster pattern input
 */
export interface CreateAdjusterPatternInput {
  adjuster_id: string
  pattern_type: AdjusterPatternType
  pattern_detail?: PatternDetail
  frequency?: PatternFrequency
  successful_counter?: string
  notes?: string
}

// ============================================
// Insurance Carrier Types
// ============================================

/**
 * Insurance carrier entity
 * Maps to the insurance_carriers table
 */
export interface InsuranceCarrier {
  id: string
  name: string
  short_code?: string

  // Contact
  claims_phone?: string
  claims_email?: string
  claims_portal_url?: string
  claims_mailing_address?: string
  website?: string

  // Regulatory
  naic_code?: string
  am_best_rating?: string
  headquarters_state?: string
  is_national: boolean

  // Response tracking
  statutory_response_days?: number
  published_response_days?: number
  avg_actual_response_days?: number

  // Aggregated stats
  total_claims_tracked: number
  avg_initial_response_days?: number
  supplement_approval_rate?: number
  dispute_success_rate?: number

  // Pattern summaries
  known_issues?: string[]
  tips?: string[]

  created_at: string
  updated_at: string
}

/**
 * Carrier pattern - granular tracking of carrier-level behaviors
 */
export interface CarrierPattern {
  id: string
  tenant_id: string
  carrier_id?: string
  carrier_name?: string // For carriers not in master list

  pattern_type: CarrierPatternType
  pattern_detail?: PatternDetail
  frequency: PatternFrequency

  // What works against this pattern
  successful_counter?: string

  // Stats
  occurrence_count: number
  counter_success_count: number

  notes?: string

  created_at: string
  updated_at: string
}

/**
 * Create carrier pattern input
 */
export interface CreateCarrierPatternInput {
  carrier_id?: string
  carrier_name?: string
  pattern_type: CarrierPatternType
  pattern_detail?: PatternDetail
  frequency?: PatternFrequency
  successful_counter?: string
  notes?: string
}

// ============================================
// Claim Types
// ============================================

/**
 * Claim status values
 */
export type ClaimStatus =
  | 'new'
  | 'filed'
  | 'acknowledged'
  | 'inspection_scheduled'
  | 'inspection_completed'
  | 'estimate_received'
  | 'negotiating'
  | 'supplement_filed'
  | 'approved'
  | 'denied'
  | 'appealed'
  | 'closed'
  | 'litigation'

/**
 * Claim entity
 * Maps to the claims table
 */
export interface Claim {
  id: string
  tenant_id: string
  project_id?: string
  contact_id?: string

  // Identifiers
  claim_number?: string
  policy_number?: string

  // Carrier & Adjuster
  insurance_carrier?: string
  carrier_id?: string
  adjuster_id?: string

  // Denormalized adjuster info (for quick display)
  adjuster_name?: string
  adjuster_email?: string
  adjuster_phone?: string

  // Dates
  date_of_loss?: string
  date_filed?: string
  acknowledgment_date?: string
  inspection_scheduled_at?: string
  inspection_completed_at?: string
  decision_date?: string

  // Financial
  estimated_damage?: number
  insurance_estimate?: number
  approved_amount?: number
  deductible?: number
  paid_amount?: number
  recovered_amount?: number

  // Status
  status: ClaimStatus

  // Analysis (JSONB)
  coverage_analysis?: Record<string, unknown>
  missed_coverages?: Record<string, unknown>
  violations?: Record<string, unknown>

  // Other
  notes?: string
  custom_fields?: Record<string, unknown>
  claim_email_address?: string

  created_at: string
  updated_at: string
  created_by?: string
}

/**
 * Create claim input
 */
export interface CreateClaimInput {
  project_id?: string
  contact_id?: string
  claim_number?: string
  policy_number?: string
  insurance_carrier?: string
  carrier_id?: string
  adjuster_id?: string
  adjuster_name?: string
  adjuster_email?: string
  adjuster_phone?: string
  date_of_loss: string
  date_filed?: string
  estimated_damage?: number
  deductible?: number
  notes?: string
}

/**
 * Update claim input
 */
export interface UpdateClaimInput {
  claim_number?: string
  policy_number?: string
  insurance_carrier?: string
  carrier_id?: string
  adjuster_id?: string
  adjuster_name?: string
  adjuster_email?: string
  adjuster_phone?: string
  date_of_loss?: string
  date_filed?: string
  acknowledgment_date?: string
  inspection_scheduled_at?: string
  inspection_completed_at?: string
  decision_date?: string
  estimated_damage?: number
  insurance_estimate?: number
  approved_amount?: number
  deductible?: number
  paid_amount?: number
  recovered_amount?: number
  status?: ClaimStatus
  notes?: string
}

// ============================================
// Claim Outcome Types
// ============================================

/**
 * Claim outcome entity
 * Maps to the claim_outcomes table
 */
export interface ClaimOutcome {
  id: string
  tenant_id: string
  claim_id: string
  adjuster_id?: string

  // Result
  outcome: ClaimOutcomeType
  outcome_date?: string

  // Financial
  requested_amount?: number
  approved_amount?: number
  paid_amount?: number

  // What was disputed/denied
  disputed_items?: string[]
  denial_reason?: string
  denial_reasons?: string[]

  // What worked
  successful_arguments?: string[]

  // Timeline
  days_to_decision?: number
  days_to_payment?: number
  supplements_filed?: number

  // Follow-up
  attorney_referral: boolean
  appeal_filed: boolean
  appeal_outcome?: string

  notes?: string

  created_at: string
  updated_at?: string
}

/**
 * Create claim outcome input
 */
export interface CreateClaimOutcomeInput {
  claim_id: string
  adjuster_id?: string
  outcome: ClaimOutcomeType
  outcome_date?: string
  requested_amount?: number
  approved_amount?: number
  paid_amount?: number
  disputed_items?: string[]
  denial_reason?: string
  denial_reasons?: string[]
  successful_arguments?: string[]
  days_to_decision?: number
  days_to_payment?: number
  supplements_filed?: number
  attorney_referral?: boolean
  appeal_filed?: boolean
  appeal_outcome?: string
  notes?: string
}

// ============================================
// Claim Communication Types
// ============================================

/**
 * Claim communication type
 */
export type CommunicationType =
  | 'phone_call'
  | 'email'
  | 'text'
  | 'meeting'
  | 'inspection'
  | 'document_sent'
  | 'document_received'
  | 'status_change'

/**
 * Communication direction
 */
export type CommunicationDirection = 'inbound' | 'outbound'

/**
 * Claim communication entity
 * Maps to the claim_communications table (serves as interaction log)
 */
export interface ClaimCommunication {
  id: string
  tenant_id: string
  claim_id: string

  type: CommunicationType
  direction?: CommunicationDirection

  subject?: string
  content?: string

  from_address?: string
  to_address?: string
  cc_addresses?: string[]

  sent_at?: string
  response_due_at?: string
  responded_at?: string
  response_overdue: boolean

  external_id?: string
  message_id?: string
  thread_id?: string

  created_at: string
  created_by?: string
}

/**
 * Create claim communication input
 */
export interface CreateClaimCommunicationInput {
  claim_id: string
  type: CommunicationType
  direction?: CommunicationDirection
  subject?: string
  content?: string
  from_address?: string
  to_address?: string
  response_due_at?: string
}

// ============================================
// Intelligence Dashboard Types
// ============================================

/**
 * Carrier intelligence summary for dashboard
 */
export interface CarrierIntelligence {
  carrier_id?: string
  carrier_name: string
  total_claims: number
  approval_rate: number
  avg_days_to_decision: number
  avg_days_to_payment: number
  supplement_approval_rate: number
  top_disputed_items: Array<{ item: string; count: number }>
  top_denial_reasons: Array<{ reason: string; count: number }>
  effective_counters: Array<{ argument: string; success_rate: number }>
}

/**
 * Adjuster intelligence summary for dashboard
 */
export interface AdjusterIntelligence {
  adjuster_id: string
  adjuster_name: string
  carrier_name?: string
  total_claims: number
  approval_rate: number
  avg_response_days: number
  common_omissions: string[]
  effective_counters: string[]
  communication_rating?: 'excellent' | 'good' | 'fair' | 'poor'
}

/**
 * Intelligence dashboard data
 */
export interface IntelligenceDashboard {
  // Summary stats
  total_claims: number
  overall_approval_rate: number
  avg_days_to_resolution: number
  appeal_success_rate: number

  // Top patterns
  top_disputed_items: Array<{ item: string; count: number; win_rate: number }>
  top_denial_reasons: Array<{ reason: string; count: number; appeal_success_rate: number }>
  most_effective_arguments: Array<{ argument: string; success_count: number }>

  // Carrier breakdown
  carriers: CarrierIntelligence[]

  // Adjuster breakdown
  adjusters: AdjusterIntelligence[]
}

// ============================================
// Pattern Warning Types
// ============================================

/**
 * Pattern warning for packet generation
 */
export interface PatternWarning {
  type: 'adjuster' | 'carrier'
  severity: 'high' | 'medium' | 'low'
  pattern_type: AdjusterPatternType | CarrierPatternType
  pattern_detail?: string
  message: string
  suggested_counter?: string
  occurrence_count: number
}

/**
 * Intelligence for packet generation
 */
export interface PacketIntelligence {
  adjuster?: Adjuster
  carrier?: InsuranceCarrier
  adjuster_patterns: AdjusterPattern[]
  carrier_patterns: CarrierPattern[]
  warnings: PatternWarning[]
  suggested_documentation: string[]
}
