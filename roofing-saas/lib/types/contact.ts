/**
 * Contact/Lead type definitions
 */

export type ContactType = 'lead' | 'customer' | 'prospect'

export type ContactStage =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost'

export type ContactPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface Contact {
  id: string
  tenant_id: string
  created_at: string
  updated_at: string
  created_by: string | null
  is_deleted: boolean

  // Basic Info
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  mobile_phone: string | null

  // Address
  address_street: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  latitude: number | null
  longitude: number | null

  // Lead Management
  type: ContactType
  stage: ContactStage
  source: string | null
  source_details: Record<string, unknown> | null
  assigned_to: string | null

  // Property Details
  property_type: string | null
  roof_type: string | null
  roof_age: number | null
  last_inspection_date: string | null
  property_value: number | null
  square_footage: number | null
  stories: number | null

  // Insurance
  insurance_carrier: string | null
  policy_number: string | null
  claim_number: string | null
  deductible: number | null

  // Scoring
  lead_score: number
  priority: ContactPriority

  // Flexible
  custom_fields: Record<string, unknown>
  tags: string[] | null
  search_vector: unknown | null
}

export interface CreateContactInput {
  first_name: string
  last_name: string
  email?: string
  phone?: string
  mobile_phone?: string
  address_street?: string
  address_city?: string
  address_state?: string
  address_zip?: string
  type?: ContactType
  stage?: ContactStage
  source?: string
  assigned_to?: string
  property_type?: string
  roof_type?: string
  roof_age?: number
  property_value?: number
  square_footage?: number
  stories?: number
  insurance_carrier?: string
  policy_number?: string
  claim_number?: string
  deductible?: number
  priority?: ContactPriority
  tags?: string[]
  custom_fields?: Record<string, unknown>
}

export interface UpdateContactInput extends Partial<CreateContactInput> {
  id: string
}

export interface ContactFilters {
  search?: string
  type?: ContactType
  stage?: ContactStage
  assigned_to?: string
  priority?: ContactPriority
  tags?: string[]
  page?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface ContactListResponse {
  contacts: Contact[]
  total: number
  page: number
  limit: number
  has_more: boolean
}
