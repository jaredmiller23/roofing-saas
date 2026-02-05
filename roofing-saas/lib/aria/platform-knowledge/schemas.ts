/**
 * Entity Schema Definitions
 * Describes the structure and requirements of each entity type.
 * Used by ARIA to understand what fields exist and their constraints.
 */

export interface FieldDefinition {
  name: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'uuid' | 'json' | 'enum'
  required: boolean
  description: string
  enumValues?: string[]
  /** Fields required for specific pipeline stages */
  requiredForStages?: string[]
}

export interface EntitySchema {
  name: string
  description: string
  tableName: string
  fields: FieldDefinition[]
}

// =============================================================================
// Contact Schema
// =============================================================================

export const CONTACT_SCHEMA: EntitySchema = {
  name: 'Contact',
  description: 'A person or company that the roofing company interacts with',
  tableName: 'contacts',
  fields: [
    { name: 'id', type: 'uuid', required: true, description: 'Unique identifier' },
    { name: 'first_name', type: 'string', required: true, description: 'First name' },
    { name: 'last_name', type: 'string', required: true, description: 'Last name' },
    { name: 'email', type: 'string', required: false, description: 'Email address' },
    { name: 'phone', type: 'string', required: false, description: 'Primary phone number' },
    { name: 'mobile_phone', type: 'string', required: false, description: 'Mobile phone number' },
    { name: 'address_street', type: 'string', required: false, description: 'Street address' },
    { name: 'address_city', type: 'string', required: false, description: 'City' },
    { name: 'address_state', type: 'string', required: false, description: 'State (2-letter code)' },
    { name: 'address_zip', type: 'string', required: false, description: 'ZIP code' },
    { name: 'stage', type: 'enum', required: false, description: 'Contact stage in sales funnel', enumValues: ['new', 'contacted', 'qualified', 'customer', 'inactive'] },
    { name: 'source', type: 'string', required: false, description: 'Lead source (e.g., referral, website, door knock)' },
    { name: 'dnc_status', type: 'enum', required: false, description: 'Do Not Call status', enumValues: ['none', 'do_not_call', 'do_not_text'] },
    { name: 'preferred_language', type: 'string', required: false, description: 'Preferred language code (en, es, fr)' },
    { name: 'notes', type: 'string', required: false, description: 'General notes about the contact' },
  ],
}

// =============================================================================
// Project Schema
// =============================================================================

export const PROJECT_SCHEMA: EntitySchema = {
  name: 'Project',
  description: 'A roofing project or opportunity linked to a contact',
  tableName: 'projects',
  fields: [
    { name: 'id', type: 'uuid', required: true, description: 'Unique identifier' },
    { name: 'name', type: 'string', required: true, description: 'Project name' },
    { name: 'contact_id', type: 'uuid', required: true, description: 'Associated contact' },
    { name: 'status', type: 'enum', required: false, description: 'Project status', enumValues: ['estimate', 'proposal', 'approved', 'in_progress', 'completed', 'cancelled'] },
    { name: 'pipeline_stage', type: 'enum', required: true, description: 'Current pipeline stage', enumValues: ['prospect', 'qualified', 'quote_sent', 'negotiation', 'won', 'production', 'complete', 'lost'] },
    {
      name: 'estimated_value',
      type: 'number',
      required: false,
      description: 'Estimated project value in dollars',
      requiredForStages: ['quote_sent', 'negotiation'],
    },
    {
      name: 'approved_value',
      type: 'number',
      required: false,
      description: 'Approved/contracted project value in dollars',
      requiredForStages: ['won'],
    },
    { name: 'insurance_carrier', type: 'string', required: false, description: 'Insurance company name' },
    { name: 'insurance_claim_number', type: 'string', required: false, description: 'Insurance claim number' },
    { name: 'adjuster_contact_id', type: 'uuid', required: false, description: 'Insurance adjuster contact' },
    { name: 'assigned_to', type: 'uuid', required: false, description: 'Assigned team member' },
    { name: 'notes', type: 'string', required: false, description: 'Project notes' },
  ],
}

// =============================================================================
// Campaign Schema
// =============================================================================

export const CAMPAIGN_SCHEMA: EntitySchema = {
  name: 'Campaign',
  description: 'An automated outreach campaign (SMS, email sequences)',
  tableName: 'campaigns',
  fields: [
    { name: 'id', type: 'uuid', required: true, description: 'Unique identifier' },
    { name: 'name', type: 'string', required: true, description: 'Campaign name' },
    { name: 'description', type: 'string', required: false, description: 'Campaign description' },
    { name: 'status', type: 'enum', required: true, description: 'Campaign status', enumValues: ['draft', 'active', 'paused', 'completed', 'archived'] },
    { name: 'campaign_type', type: 'enum', required: true, description: 'Type of campaign', enumValues: ['drip', 'blast', 'triggered'] },
    { name: 'trigger_event', type: 'string', required: false, description: 'Event that triggers the campaign (for triggered campaigns)' },
  ],
}

// =============================================================================
// Campaign Step Schema
// =============================================================================

export const CAMPAIGN_STEP_SCHEMA: EntitySchema = {
  name: 'CampaignStep',
  description: 'A step in a campaign (e.g., send SMS, send email, wait)',
  tableName: 'campaign_steps',
  fields: [
    { name: 'id', type: 'uuid', required: true, description: 'Unique identifier' },
    { name: 'campaign_id', type: 'uuid', required: true, description: 'Parent campaign' },
    { name: 'step_order', type: 'number', required: true, description: 'Order in the sequence (0-based)' },
    { name: 'step_type', type: 'enum', required: true, description: 'Type of step', enumValues: ['sms', 'email', 'wait', 'condition'] },
    { name: 'delay_minutes', type: 'number', required: false, description: 'Delay before executing (for wait steps)' },
    { name: 'template_id', type: 'uuid', required: false, description: 'Message template to use' },
    { name: 'message_content', type: 'string', required: false, description: 'Direct message content (if no template)' },
    { name: 'subject', type: 'string', required: false, description: 'Email subject (for email steps)' },
  ],
}

// =============================================================================
// Schema Registry
// =============================================================================

export const ENTITY_SCHEMAS: Record<string, EntitySchema> = {
  contact: CONTACT_SCHEMA,
  project: PROJECT_SCHEMA,
  campaign: CAMPAIGN_SCHEMA,
  campaign_step: CAMPAIGN_STEP_SCHEMA,
}

/**
 * Get schema for an entity type
 */
export function getEntitySchema(entityType: string): EntitySchema | undefined {
  return ENTITY_SCHEMAS[entityType.toLowerCase()]
}

/**
 * Get required fields for an entity
 */
export function getRequiredFields(entityType: string): string[] {
  const schema = getEntitySchema(entityType)
  if (!schema) return []
  return schema.fields.filter(f => f.required).map(f => f.name)
}

/**
 * Get fields required for a specific pipeline stage
 */
export function getFieldsRequiredForStage(entityType: string, stage: string): string[] {
  const schema = getEntitySchema(entityType)
  if (!schema) return []
  return schema.fields
    .filter(f => f.requiredForStages?.includes(stage))
    .map(f => f.name)
}

/**
 * Validate an entity against its schema
 */
export function validateEntityAgainstSchema(
  entityType: string,
  data: Record<string, unknown>,
  stage?: string
): { valid: boolean; missingFields: string[]; errors: string[] } {
  const schema = getEntitySchema(entityType)
  if (!schema) {
    return { valid: false, missingFields: [], errors: [`Unknown entity type: ${entityType}`] }
  }

  const missingFields: string[] = []
  const errors: string[] = []

  // Check required fields
  for (const field of schema.fields) {
    if (field.required && (data[field.name] === undefined || data[field.name] === null || data[field.name] === '')) {
      missingFields.push(field.name)
    }
  }

  // Check stage-specific required fields
  if (stage) {
    for (const field of schema.fields) {
      if (field.requiredForStages?.includes(stage)) {
        if (data[field.name] === undefined || data[field.name] === null || data[field.name] === '') {
          if (!missingFields.includes(field.name)) {
            missingFields.push(field.name)
          }
          errors.push(`${field.name} is required for ${stage} stage`)
        }
      }
    }
  }

  return {
    valid: missingFields.length === 0 && errors.length === 0,
    missingFields,
    errors,
  }
}
