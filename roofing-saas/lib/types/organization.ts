/**
 * Organization/Company type definitions
 * Supports B2B accounts and hierarchical company management
 */

export type OrganizationType = 'company' | 'agency' | 'contractor'

export interface Organization {
  id: string
  tenant_id: string
  created_at: string
  updated_at: string
  created_by: string | null
  is_deleted: boolean

  // Basic Info
  name: string
  type: OrganizationType
  website: string | null
  phone: string | null

  // Address
  address_street: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  latitude: number | null
  longitude: number | null

  // Metadata
  notes: string | null
  custom_fields: Record<string, unknown>
  tags: string[] | null
}

export interface CreateOrganizationInput {
  name: string
  type: OrganizationType
  website?: string
  phone?: string
  address_street?: string
  address_city?: string
  address_state?: string
  address_zip?: string
  notes?: string
  tags?: string[]
  custom_fields?: Record<string, unknown>
}

export interface UpdateOrganizationInput extends Partial<CreateOrganizationInput> {
  id: string
}

export interface OrganizationFilters {
  search?: string
  type?: OrganizationType
  tags?: string[]
  page?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface OrganizationListResponse {
  organizations: Organization[]
  total: number
  page: number
  limit: number
  has_more: boolean
}

/**
 * Organization with related contact count
 */
export interface OrganizationWithStats extends Organization {
  contact_count: number
  project_count?: number
}

/**
 * Helper Functions for Organization Types
 */

/**
 * Format organization type for display
 */
export function formatOrganizationType(type: OrganizationType): string {
  const labels: Record<OrganizationType, string> = {
    company: 'Company',
    agency: 'Agency',
    contractor: 'Contractor',
  }
  return labels[type]
}

/**
 * Get all organization type options for dropdowns
 */
export function getOrganizationTypeOptions(): Array<{
  value: OrganizationType
  label: string
}> {
  return [
    { value: 'company', label: 'Company' },
    { value: 'agency', label: 'Agency' },
    { value: 'contractor', label: 'Contractor' },
  ]
}

/**
 * Get organization display name with type
 */
export function getOrganizationDisplayName(organization: Organization): string {
  return `${organization.name} (${formatOrganizationType(organization.type)})`
}

/**
 * Simple organization option for selectors
 */
export interface OrganizationOption {
  id: string
  name: string
  type: OrganizationType
  displayName: string
}

/**
 * Convert organization to option for selectors
 */
export function organizationToOption(organization: Organization): OrganizationOption {
  return {
    id: organization.id,
    name: organization.name,
    type: organization.type,
    displayName: getOrganizationDisplayName(organization),
  }
}