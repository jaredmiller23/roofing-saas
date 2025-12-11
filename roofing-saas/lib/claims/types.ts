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
 * Claim data structure matching Claims Agent schema
 */
export interface ClaimData {
  id: string
  contact_id: string
  project_id: string
  claim_number?: string
  policy_number?: string
  carrier_id?: string
  date_of_loss: string
  date_filed?: string
  status: ClaimStatus
  claim_type: 'roof' | 'siding' | 'gutters' | 'full_exterior' | 'other'

  // Financial
  initial_estimate?: number
  approved_amount?: number
  paid_amount?: number
  deductible?: number

  // Property info
  property_address: string
  property_city: string
  property_state: string
  property_zip: string
  property_type?: 'residential' | 'commercial' | 'multi_family'

  // Timeline
  acknowledgment_received?: string
  inspection_scheduled?: string
  inspection_completed?: string
  decision_date?: string

  // Weather causation
  storm_event_id?: string

  // Metadata
  created_at: string
  updated_at: string
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
    address?: string
    city?: string
    state?: string
    zip?: string
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
