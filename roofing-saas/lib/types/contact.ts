/**
 * Contact/Lead type definitions
 */

import type { DNCStatus } from '@/lib/compliance/types'

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

export type CustomerType = 'insurance' | 'retail'

/**
 * Contact category (role/type of contact)
 * Used for combined type system: e.g., "Lead-Homeowner", "Customer-Adjuster"
 */
export type ContactCategory =
  | 'homeowner'
  | 'adjuster'
  | 'insurance_agent'
  | 'sub_contractor'
  | 'supplier'
  | 'real_estate_agent'
  | 'developer'
  | 'property_manager'
  | 'local_business'
  | 'other'

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

  // Organization Link
  organization_id: string | null

  // Organization Info (merged from organizations table)
  is_organization: boolean
  company: string | null
  website: string | null
  contact_category: ContactCategory

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
  substatus: string | null
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

  // Insurance & Job Details
  insurance_carrier: string | null
  policy_number: string | null
  claim_number: string | null
  deductible: number | null
  policy_holder_id: string | null  // FK to another contact who holds the insurance policy
  job_type: string | null  // Roof, Siding, Gutters, etc.
  customer_type: CustomerType | null  // 'insurance' or 'retail'

  // Scoring
  lead_score: number
  priority: ContactPriority

  // Compliance & Consent
  dnc_status: DNCStatus | null
  call_opt_out: boolean
  call_consent: boolean
  text_consent: boolean
  auto_text_consent: boolean
  auto_call_consent: boolean
  recording_consent: boolean
  timezone: string | null

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
  organization_id?: string
  is_organization?: boolean
  company?: string
  website?: string
  contact_category?: ContactCategory
  address_street?: string
  address_city?: string
  address_state?: string
  address_zip?: string
  type?: ContactType
  stage?: ContactStage
  substatus?: string
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
  policy_holder_id?: string
  job_type?: string
  customer_type?: CustomerType
  text_consent?: boolean
  auto_text_consent?: boolean
  auto_call_consent?: boolean
  recording_consent?: boolean
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
  contact_category?: ContactCategory
  is_organization?: boolean
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

/**
 * Helper Functions for Combined Type System
 */

/**
 * Get combined type label for display
 * Examples: "Lead-Homeowner", "Customer-Adjuster", "Company: ABC Corp (Developer)"
 */
export function getCombinedTypeLabel(contact: Contact): string {
  if (contact.is_organization && contact.company) {
    return `Company: ${contact.company} (${formatCategory(contact.contact_category)})`
  }
  return `${formatType(contact.type)}-${formatCategory(contact.contact_category)}`
}

/**
 * Format contact category for display
 */
export function formatCategory(category: ContactCategory): string {
  const labels: Record<ContactCategory, string> = {
    homeowner: 'Homeowner',
    adjuster: 'Adjuster',
    insurance_agent: 'Insurance Agent',
    sub_contractor: 'Sub Contractor',
    supplier: 'Supplier',
    real_estate_agent: 'Real Estate Agent',
    developer: 'Developer',
    property_manager: 'Property Manager',
    local_business: 'Local Business',
    other: 'Other',
  }
  return labels[category]
}

/**
 * Format contact type (sales stage) for display
 */
export function formatType(type: ContactType): string {
  const labels: Record<ContactType, string> = {
    lead: 'Lead',
    prospect: 'Prospect',
    customer: 'Customer',
  }
  return labels[type]
}

/**
 * Format contact stage for display
 */
export function formatStage(stage: ContactStage): string {
  const labels: Record<ContactStage, string> = {
    new: 'New',
    contacted: 'Contacted',
    qualified: 'Qualified',
    proposal: 'Proposal',
    negotiation: 'Negotiation',
    won: 'Won',
    lost: 'Lost',
  }
  return labels[stage]
}

/**
 * Get all contact category options for dropdowns
 */
export function getContactCategoryOptions(): Array<{
  value: ContactCategory
  label: string
}> {
  return [
    { value: 'homeowner', label: 'Homeowner' },
    { value: 'adjuster', label: 'Adjuster' },
    { value: 'insurance_agent', label: 'Insurance Agent' },
    { value: 'sub_contractor', label: 'Sub Contractor' },
    { value: 'supplier', label: 'Supplier' },
    { value: 'real_estate_agent', label: 'Real Estate Agent' },
    { value: 'developer', label: 'Developer' },
    { value: 'property_manager', label: 'Property Manager' },
    { value: 'local_business', label: 'Local Business' },
    { value: 'other', label: 'Other' },
  ]
}
