/**
 * Claims Integration Types
 *
 * Type definitions for Claims Agent integration.
 * These types mirror the Claims Agent module schema.
 */

// Claim status from Claims Agent
export type ClaimStatus =
  | 'new'
  | 'documents_pending'
  | 'under_review'
  | 'approved'
  | 'paid'
  | 'closed'
  | 'disputed'
  | 'supplement_filed'
  | 'escalated'

// TN Law compliance thresholds (days)
export const TN_LAW_THRESHOLDS = {
  ACKNOWLEDGMENT: 15,
  NOTIFICATION_RESPONSE: 30,
  APPROACHING_DEADLINE: 45,
  STATUTORY_DEADLINE: 60,
  FORMAL_DEMAND: 90,
} as const

/**
 * Claim data structure matching the actual claims database table.
 *
 * Column names must match the DB exactly. Fields that don't exist as
 * top-level columns (e.g. claim_type, property address) are stored
 * in the custom_fields JSONB column.
 */
export interface ClaimData {
  id: string
  tenant_id: string
  contact_id?: string
  project_id?: string
  claim_number?: string
  policy_number?: string
  date_of_loss?: string
  date_filed?: string
  status?: ClaimStatus

  // Insurance
  insurance_carrier?: string
  carrier_id?: string
  adjuster_id?: string
  adjuster_name?: string
  adjuster_email?: string
  adjuster_phone?: string
  claim_email_address?: string

  // Financial (actual DB column names)
  estimated_damage?: number
  insurance_estimate?: number
  approved_amount?: number
  paid_amount?: number
  deductible?: number
  recovered_amount?: number

  // Analysis (JSONB)
  coverage_analysis?: Record<string, unknown>
  missed_coverages?: Record<string, unknown>
  violations?: Record<string, unknown>

  // Timeline (actual DB column names — note: _at suffix, not bare names)
  acknowledgment_date?: string
  inspection_scheduled_at?: string
  inspection_completed_at?: string
  decision_date?: string

  // Notes & custom data
  notes?: string
  custom_fields?: Record<string, unknown>

  // Metadata
  created_at?: string
  updated_at?: string
  created_by?: string
}

/**
 * Data to sync from project to claim
 */
export interface ProjectToClaimSync {
  project_id: string
  contact_id: string
  storm_event_id?: string

  // From project
  property_address: string
  property_city: string
  property_state: string
  property_zip: string
  estimated_value?: number
  date_of_loss?: string

  // From contact
  contact_first_name: string
  contact_last_name: string
  contact_email?: string
  contact_phone?: string

  // Insurance info (if available from contact)
  insurance_carrier?: string
  policy_number?: string
}

/**
 * Webhook event from Claims Agent
 */
export interface ClaimWebhookEvent {
  claim_id: string
  project_id?: string
  contact_id?: string
  event: 'status_changed' | 'amount_updated' | 'document_added' | 'inspection_scheduled'
  data: {
    previous_status?: ClaimStatus
    new_status?: ClaimStatus
    amount?: number
    document_id?: string
    document_type?: string
    inspection_date?: string
    notes?: string
  }
  timestamp: string
}

/**
 * Response from Claims Agent sync
 */
export interface ClaimSyncResponse {
  success: boolean
  claim_id?: string
  claim_number?: string
  status?: ClaimStatus
  error?: string
}

/**
 * Claim export package contents
 */
export interface ClaimExportPackage {
  project: {
    id: string
    name: string
    description?: string
    estimated_value?: number
    pipeline_stage: string
    created_at: string
  }
  contact: {
    id: string
    first_name: string
    last_name: string
    email?: string
    phone?: string
    address_street?: string
    address_city?: string
    address_state?: string
    address_zip?: string
    insurance_carrier?: string
    policy_number?: string
  }
  storm_causation?: {
    events: Array<{
      event_date: string
      event_type: string
      magnitude?: number
      distance_miles?: number
    }>
    causation_narrative: string
    evidence_score: number
  }
  photos: Array<{
    id: string
    url: string
    caption?: string
    damage_type?: string
    severity?: string
    taken_at: string
  }>
  documents: Array<{
    id: string
    name: string
    type: string
    url: string
    created_at: string
  }>
  exported_at: string
}
