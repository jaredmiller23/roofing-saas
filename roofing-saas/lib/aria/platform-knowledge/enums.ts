/**
 * Enum Value Definitions
 * Valid values for all enum fields in the system.
 * Used by ARIA to validate and explain valid options.
 */

export interface EnumDefinition {
  name: string
  description: string
  values: Array<{
    value: string
    label: string
    description: string
  }>
}

// =============================================================================
// Pipeline Stage Enum
// =============================================================================

export const PIPELINE_STAGE_ENUM: EnumDefinition = {
  name: 'pipeline_stage',
  description: 'Sales pipeline stage for projects',
  values: [
    { value: 'prospect', label: 'Prospect', description: 'Initial contact, not yet qualified' },
    { value: 'qualified', label: 'Qualified', description: 'Qualified lead with genuine interest' },
    { value: 'quote_sent', label: 'Quote Sent', description: 'Quote or estimate has been sent to the customer' },
    { value: 'negotiation', label: 'Negotiation', description: 'In negotiations, addressing concerns' },
    { value: 'won', label: 'Won', description: 'Deal won, contract signed' },
    { value: 'production', label: 'Production', description: 'Job in progress' },
    { value: 'complete', label: 'Complete', description: 'Project completed' },
    { value: 'lost', label: 'Lost', description: 'Opportunity lost' },
  ],
}

// =============================================================================
// Project Status Enum
// =============================================================================

export const PROJECT_STATUS_ENUM: EnumDefinition = {
  name: 'project_status',
  description: 'Project status (auto-synced with pipeline_stage)',
  values: [
    { value: 'estimate', label: 'Estimate', description: 'In estimate phase (prospect/qualified)' },
    { value: 'proposal', label: 'Proposal', description: 'Proposal sent (quote_sent/negotiation)' },
    { value: 'approved', label: 'Approved', description: 'Contract approved (won)' },
    { value: 'in_progress', label: 'In Progress', description: 'Work in progress (production)' },
    { value: 'completed', label: 'Completed', description: 'Project completed' },
    { value: 'cancelled', label: 'Cancelled', description: 'Project cancelled (lost)' },
  ],
}

// =============================================================================
// Contact Stage Enum
// =============================================================================

export const CONTACT_STAGE_ENUM: EnumDefinition = {
  name: 'contact_stage',
  description: 'Contact stage in the sales funnel',
  values: [
    { value: 'new', label: 'New', description: 'New contact, not yet reached' },
    { value: 'contacted', label: 'Contacted', description: 'Initial contact made' },
    { value: 'qualified', label: 'Qualified', description: 'Qualified as a potential customer' },
    { value: 'customer', label: 'Customer', description: 'Active or past customer' },
    { value: 'inactive', label: 'Inactive', description: 'No longer active' },
  ],
}

// =============================================================================
// Campaign Status Enum
// =============================================================================

export const CAMPAIGN_STATUS_ENUM: EnumDefinition = {
  name: 'campaign_status',
  description: 'Campaign status',
  values: [
    { value: 'draft', label: 'Draft', description: 'Campaign is being created, not yet active' },
    { value: 'active', label: 'Active', description: 'Campaign is running' },
    { value: 'paused', label: 'Paused', description: 'Campaign is temporarily paused' },
    { value: 'completed', label: 'Completed', description: 'Campaign has finished running' },
    { value: 'archived', label: 'Archived', description: 'Campaign is archived' },
  ],
}

// =============================================================================
// Campaign Type Enum
// =============================================================================

export const CAMPAIGN_TYPE_ENUM: EnumDefinition = {
  name: 'campaign_type',
  description: 'Type of campaign',
  values: [
    { value: 'drip', label: 'Drip', description: 'Automated sequence over time' },
    { value: 'blast', label: 'Blast', description: 'One-time bulk send' },
    { value: 'triggered', label: 'Triggered', description: 'Activated by an event' },
  ],
}

// =============================================================================
// Campaign Step Type Enum
// =============================================================================

export const CAMPAIGN_STEP_TYPE_ENUM: EnumDefinition = {
  name: 'campaign_step_type',
  description: 'Type of campaign step',
  values: [
    { value: 'sms', label: 'SMS', description: 'Send an SMS message' },
    { value: 'email', label: 'Email', description: 'Send an email' },
    { value: 'wait', label: 'Wait', description: 'Wait for a period of time' },
    { value: 'condition', label: 'Condition', description: 'Branch based on a condition' },
  ],
}

// =============================================================================
// DNC Status Enum
// =============================================================================

export const DNC_STATUS_ENUM: EnumDefinition = {
  name: 'dnc_status',
  description: 'Do Not Contact status',
  values: [
    { value: 'none', label: 'None', description: 'No restrictions' },
    { value: 'do_not_call', label: 'Do Not Call', description: 'Do not call this contact' },
    { value: 'do_not_text', label: 'Do Not Text', description: 'Do not send SMS to this contact' },
  ],
}

// =============================================================================
// Task Priority Enum
// =============================================================================

export const TASK_PRIORITY_ENUM: EnumDefinition = {
  name: 'task_priority',
  description: 'Task priority level',
  values: [
    { value: 'low', label: 'Low', description: 'Low priority, can wait' },
    { value: 'medium', label: 'Medium', description: 'Normal priority' },
    { value: 'high', label: 'High', description: 'High priority, do soon' },
    { value: 'urgent', label: 'Urgent', description: 'Urgent, do immediately' },
  ],
}

// =============================================================================
// Enum Registry
// =============================================================================

export const ENUM_DEFINITIONS: Record<string, EnumDefinition> = {
  pipeline_stage: PIPELINE_STAGE_ENUM,
  project_status: PROJECT_STATUS_ENUM,
  contact_stage: CONTACT_STAGE_ENUM,
  campaign_status: CAMPAIGN_STATUS_ENUM,
  campaign_type: CAMPAIGN_TYPE_ENUM,
  campaign_step_type: CAMPAIGN_STEP_TYPE_ENUM,
  dnc_status: DNC_STATUS_ENUM,
  task_priority: TASK_PRIORITY_ENUM,
}

/**
 * Get enum definition by name
 */
export function getEnumDefinition(enumName: string): EnumDefinition | undefined {
  return ENUM_DEFINITIONS[enumName.toLowerCase()]
}

/**
 * Check if a value is valid for an enum
 */
export function isValidEnumValue(enumName: string, value: string): boolean {
  const def = getEnumDefinition(enumName)
  if (!def) return false
  return def.values.some(v => v.value === value)
}

/**
 * Get human-readable label for an enum value
 */
export function getEnumLabel(enumName: string, value: string): string | undefined {
  const def = getEnumDefinition(enumName)
  if (!def) return undefined
  return def.values.find(v => v.value === value)?.label
}

/**
 * Get all valid values for an enum
 */
export function getEnumValues(enumName: string): string[] {
  const def = getEnumDefinition(enumName)
  if (!def) return []
  return def.values.map(v => v.value)
}
