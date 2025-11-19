// =============================================
// Proline CRM Field Mappings
// =============================================
// Purpose: Map Proline CRM fields to our database schema
// Author: Claude Code
// Date: 2025-11-18
// =============================================

/**
 * Field mapping configuration for Proline → Our Schema
 *
 * This file defines how to transform Proline CRM data into our database format.
 * Update these mappings based on actual Proline export structure.
 */

// =================
// Contact Mappings
// =================

export interface ProlineContact {
  // Proline field names (update based on actual export)
  id?: string | number
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  mobile?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  status?: string // e.g., "Lead", "Customer", "Lost"
  source?: string
  notes?: string
  created_date?: string
  modified_date?: string
  assigned_to?: string
  tags?: string // comma-separated
  custom_field_1?: string
  custom_field_2?: string
}

export const CONTACT_FIELD_MAPPING = {
  // Our field → Proline field
  first_name: 'first_name',
  last_name: 'last_name',
  email: 'email',
  phone: ['phone', 'mobile'], // Try phone first, fallback to mobile
  street_address: 'address',
  city: 'city',
  state: 'state',
  zip_code: 'zip',
  notes: 'notes',
  source: 'source',
  // created_at: Proline 'created_date'
  // updated_at: Proline 'modified_date'
} as const

/**
 * Map Proline contact status to our ContactType + ContactStage
 */
export function mapContactStatus(prolineStatus: string): {
  type: 'lead' | 'customer' | 'partner'
  stage: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
} {
  const status = prolineStatus?.toLowerCase() || ''

  // Map Proline status to our schema
  if (status.includes('customer') || status.includes('client')) {
    return { type: 'customer', stage: 'closed_won' }
  }

  if (status.includes('lost') || status.includes('dead')) {
    return { type: 'lead', stage: 'closed_lost' }
  }

  if (status.includes('proposal') || status.includes('quote')) {
    return { type: 'lead', stage: 'proposal' }
  }

  if (status.includes('qualified')) {
    return { type: 'lead', stage: 'qualified' }
  }

  if (status.includes('contacted') || status.includes('working')) {
    return { type: 'lead', stage: 'contacted' }
  }

  // Default: new lead
  return { type: 'lead', stage: 'new' }
}

// =================
// Project Mappings
// =================

export interface ProlineProject {
  id?: string | number
  name?: string
  contact_id?: string | number
  status?: string // e.g., "Open", "In Progress", "Completed", "Lost"
  value?: string | number
  description?: string
  start_date?: string
  end_date?: string
  close_date?: string
  probability?: number
  stage?: string
  notes?: string
  created_date?: string
  modified_date?: string
  assigned_to?: string
}

export const PROJECT_FIELD_MAPPING = {
  name: 'name',
  description: 'description',
  estimated_value: 'value',
  expected_close_date: ['close_date', 'end_date'],
  notes: 'notes',
} as const

/**
 * Map Proline project status to our PipelineStage
 */
export function mapProjectStage(
  prolineStatus: string,
  prolineStage?: string
): 'lead' | 'contacted' | 'qualified' | 'proposal' | 'contract' | 'installation' | 'complete' | 'lost' {
  const status = prolineStatus?.toLowerCase() || ''
  const stage = prolineStage?.toLowerCase() || ''

  if (status.includes('complete') || status.includes('won') || stage.includes('complete')) {
    return 'complete'
  }

  if (status.includes('lost') || status.includes('dead') || stage.includes('lost')) {
    return 'lost'
  }

  if (status.includes('install') || stage.includes('install')) {
    return 'installation'
  }

  if (status.includes('contract') || status.includes('signed') || stage.includes('contract')) {
    return 'contract'
  }

  if (status.includes('proposal') || status.includes('quote') || stage.includes('proposal')) {
    return 'proposal'
  }

  if (status.includes('qualified') || stage.includes('qualified')) {
    return 'qualified'
  }

  if (status.includes('contact') || stage.includes('contact')) {
    return 'contacted'
  }

  // Default
  return 'lead'
}

// =================
// Activity Mappings
// =================

export interface ProlineActivity {
  id?: string | number
  contact_id?: string | number
  project_id?: string | number
  type?: string // e.g., "Call", "Email", "Meeting", "Note"
  subject?: string
  description?: string
  date?: string
  created_date?: string
  created_by?: string
}

export const ACTIVITY_FIELD_MAPPING = {
  type: 'type',
  subject: 'subject',
  notes: 'description',
  // activity_date: Proline 'date'
} as const

/**
 * Map Proline activity type to our ActivityType
 */
export function mapActivityType(
  prolineType: string
): 'call' | 'email' | 'meeting' | 'note' | 'task' | 'sms' {
  const type = prolineType?.toLowerCase() || ''

  if (type.includes('call') || type.includes('phone')) return 'call'
  if (type.includes('email') || type.includes('mail')) return 'email'
  if (type.includes('meeting') || type.includes('appointment')) return 'meeting'
  if (type.includes('task') || type.includes('todo')) return 'task'
  if (type.includes('sms') || type.includes('text')) return 'sms'

  // Default to note
  return 'note'
}

// =================
// Data Validation
// =================

/**
 * Validate required fields for contact
 */
export function validateContact(contact: ProlineContact): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!contact.first_name && !contact.last_name) {
    errors.push('Missing both first_name and last_name')
  }

  if (!contact.email && !contact.phone && !contact.mobile) {
    errors.push('Missing all contact methods (email, phone, mobile)')
  }

  // Email format validation
  if (contact.email && !isValidEmail(contact.email)) {
    errors.push(`Invalid email format: ${contact.email}`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone number and format to E.164
 */
export function formatPhoneNumber(phone: string): string | null {
  if (!phone) return null

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')

  // US phone number validation (10 digits)
  if (digits.length === 10) {
    return `+1${digits}`
  }

  // Already formatted with country code
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }

  // Invalid phone number length
  return null
}

/**
 * Clean and normalize text fields
 */
export function cleanTextField(text: string | null | undefined): string | null {
  if (!text) return null

  return text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[\r\n]+/g, '\n') // Normalize line breaks
}

/**
 * Parse date from various formats
 */
export function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null

  const date = new Date(dateString)

  // Check if valid date
  if (isNaN(date.getTime())) {
    return null
  }

  return date
}

// =================
// Default Values
// =================

export const MIGRATION_DEFAULTS = {
  contact: {
    type: 'lead' as const,
    stage: 'new' as const,
    contact_category: 'homeowner' as const,
    is_organization: false,
  },
  project: {
    stage: 'lead' as const,
  },
} as const
