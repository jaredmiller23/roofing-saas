/**
 * ARIA Repair Functions
 * Containment-gated functions for fixing data issues.
 *
 * Risk Levels:
 * - MEDIUM: Requires user confirmation, logs before/after
 * - HIGH: Requires HITL approval (not implemented in Phase 3)
 *
 * All operations:
 * - Are tenant-scoped (RLS enforced)
 * - Cannot touch system fields (blocklist)
 * - Log before/after snapshots for audit
 * - Require explicit confirmation
 */

import { ariaFunctionRegistry } from '../function-registry'
import { logger } from '@/lib/logger'
import {
  validateCompleteTransition,
  STAGE_DISPLAY_NAMES,
  STAGE_REQUIRED_FIELDS,
  getStatusForPipelineStage,
} from '../platform-knowledge/transitions'
import { getEntitySchema } from '../platform-knowledge/schemas'
import type { PipelineStage } from '@/lib/types/api'
import type { ARIAContext } from '../types'

// =============================================================================
// Field Blocklist - Fields ARIA cannot modify
// =============================================================================

const BLOCKED_FIELDS = new Set([
  // System fields
  'id',
  'tenant_id',
  'created_at',
  'updated_at',
  'created_by',
  'is_deleted',

  // Auth/Security fields
  'user_id',
  'password',
  'password_hash',
  'token',
  'api_key',

  // Billing fields
  'stripe_customer_id',
  'subscription_id',

  // Foreign keys that shouldn't be changed directly
  // (these can be changed but require careful validation)
  // 'contact_id', // Allow changing project's contact
  // 'adjuster_contact_id', // Allow changing adjuster
])

/**
 * Check if a field can be modified by ARIA
 */
function isFieldModifiable(field: string): boolean {
  return !BLOCKED_FIELDS.has(field)
}

/**
 * Get the list of blocked fields for error messages
 */
function getBlockedFieldsMessage(): string {
  return 'System fields (id, tenant_id, created_at, etc.) cannot be modified.'
}

// =============================================================================
// Audit Logging
// =============================================================================

interface AuditLogEntry {
  action: 'fix_field' | 'fix_stage' | 'fill_fields'
  entity_type: string
  entity_id: string
  user_id: string
  tenant_id: string
  before: Record<string, unknown>
  after: Record<string, unknown>
  timestamp: string
}

/**
 * Log a repair action for audit trail
 */
async function logRepairAction(
  context: ARIAContext,
  entry: Omit<AuditLogEntry, 'user_id' | 'tenant_id' | 'timestamp'>
): Promise<void> {
  const logEntry: AuditLogEntry = {
    ...entry,
    user_id: context.userId,
    tenant_id: context.tenantId,
    timestamp: new Date().toISOString(),
  }

  // Log to application logger
  logger.info('ARIA repair action', {
    action: logEntry.action,
    entity_type: logEntry.entity_type,
    entity_id: logEntry.entity_id,
    user_id: logEntry.user_id,
    tenant_id: logEntry.tenant_id,
  })

  // Also persist to aria_function_logs table if it exists
  try {
    await context.supabase.from('aria_function_logs').insert({
      tenant_id: context.tenantId,
      user_id: context.userId,
      function_name: entry.action,
      parameters: {
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
      },
      result: {
        before: entry.before,
        after: entry.after,
      },
      success: true,
    })
  } catch (error) {
    // Don't fail the operation if logging fails
    logger.warn('Failed to persist ARIA repair log', { error })
  }
}

// =============================================================================
// fix_field_value - Update a specific field on a record
// =============================================================================

ariaFunctionRegistry.register({
  name: 'fix_field_value',
  category: 'repair',
  description: 'Update a specific field value on a contact or project',
  riskLevel: 'medium',
  requiresConfirmation: true,
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'fix_field_value',
    description: 'Update a field value on a record (requires confirmation)',
    parameters: {
      type: 'object',
      properties: {
        entity_type: {
          type: 'string',
          enum: ['contact', 'project'],
          description: 'Type of entity to update',
        },
        entity_id: {
          type: 'string',
          description: 'ID of the entity to update',
        },
        field: {
          type: 'string',
          description: 'Field name to update',
        },
        value: {
          type: 'string',
          description: 'New value for the field (will be converted to appropriate type)',
        },
      },
      required: ['entity_type', 'entity_id', 'field', 'value'],
    },
  },
  execute: async (args, context) => {
    const { entity_type, entity_id, field, value } = args as {
      entity_type: 'contact' | 'project'
      entity_id: string
      field: string
      value: unknown
    }

    // Check if field is modifiable
    if (!isFieldModifiable(field)) {
      return {
        success: false,
        error: `Cannot modify ${field}. ${getBlockedFieldsMessage()}`,
      }
    }

    // Get schema to validate field exists
    const schema = getEntitySchema(entity_type)
    if (!schema) {
      return { success: false, error: `Unknown entity type: ${entity_type}` }
    }

    const fieldDef = schema.fields.find(f => f.name === field)
    if (!fieldDef) {
      return { success: false, error: `Unknown field: ${field} on ${entity_type}` }
    }

    // Fetch current record
    const { data: current, error: fetchError } = await context.supabase
      .from(schema.tableName)
      .select('*')
      .eq('id', entity_id)
      .eq('tenant_id', context.tenantId)
      .single()

    if (fetchError || !current) {
      return { success: false, error: `Could not find ${entity_type} ${entity_id}` }
    }

    const beforeValue = current[field]

    // Perform the update
    const { error: updateError } = await context.supabase
      .from(schema.tableName)
      .update({ [field]: value })
      .eq('id', entity_id)
      .eq('tenant_id', context.tenantId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Log the repair action
    await logRepairAction(context, {
      action: 'fix_field',
      entity_type,
      entity_id,
      before: { [field]: beforeValue },
      after: { [field]: value },
    })

    return {
      success: true,
      data: {
        entity_type,
        entity_id,
        field,
        before: beforeValue,
        after: value,
      },
      message: `Updated ${field} from "${beforeValue}" to "${value}"`,
    }
  },
})

// =============================================================================
// fix_pipeline_stage - Safely transition a project's stage
// =============================================================================

ariaFunctionRegistry.register({
  name: 'fix_pipeline_stage',
  category: 'repair',
  description: 'Move a project to a different pipeline stage (with validation)',
  riskLevel: 'medium',
  requiresConfirmation: true,
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'fix_pipeline_stage',
    description: 'Transition a project to a new pipeline stage (requires confirmation)',
    parameters: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID to update',
        },
        target_stage: {
          type: 'string',
          enum: ['prospect', 'qualified', 'quote_sent', 'negotiation', 'won', 'production', 'complete', 'lost'],
          description: 'Target pipeline stage',
        },
      },
      required: ['project_id', 'target_stage'],
    },
  },
  execute: async (args, context) => {
    const { project_id, target_stage } = args as {
      project_id: string
      target_stage: PipelineStage
    }

    // Fetch current project
    const { data: project, error: fetchError } = await context.supabase
      .from('projects')
      .select('id, name, pipeline_stage, estimated_value, approved_value, status')
      .eq('id', project_id)
      .eq('tenant_id', context.tenantId)
      .single()

    if (fetchError || !project) {
      return { success: false, error: `Could not find project ${project_id}` }
    }

    const currentStage = project.pipeline_stage as PipelineStage

    // Validate the transition
    const validation = validateCompleteTransition(currentStage, target_stage, {
      estimated_value: project.estimated_value,
      approved_value: project.approved_value,
    })

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        data: {
          current_stage: currentStage,
          target_stage,
          blocker: validation.error,
        },
      }
    }

    // Get the auto-synced status
    const newStatus = getStatusForPipelineStage(target_stage)

    // Perform the update
    const { error: updateError } = await context.supabase
      .from('projects')
      .update({
        pipeline_stage: target_stage,
        status: newStatus,
      })
      .eq('id', project_id)
      .eq('tenant_id', context.tenantId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Log the repair action
    await logRepairAction(context, {
      action: 'fix_stage',
      entity_type: 'project',
      entity_id: project_id,
      before: { pipeline_stage: currentStage, status: project.status },
      after: { pipeline_stage: target_stage, status: newStatus },
    })

    return {
      success: true,
      data: {
        project_id,
        project_name: project.name,
        before_stage: currentStage,
        before_stage_label: STAGE_DISPLAY_NAMES[currentStage],
        after_stage: target_stage,
        after_stage_label: STAGE_DISPLAY_NAMES[target_stage],
        status_synced_to: newStatus,
      },
      message: `Moved project "${project.name}" from ${STAGE_DISPLAY_NAMES[currentStage]} to ${STAGE_DISPLAY_NAMES[target_stage]}`,
    }
  },
})

// =============================================================================
// fill_required_fields - Populate missing required fields
// =============================================================================

ariaFunctionRegistry.register({
  name: 'fill_required_fields',
  category: 'repair',
  description: 'Fill in missing required fields for a pipeline stage transition',
  riskLevel: 'medium',
  requiresConfirmation: true,
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'fill_required_fields',
    description: 'Fill empty required fields with provided values (does not overwrite existing values)',
    parameters: {
      type: 'object',
      properties: {
        entity_type: {
          type: 'string',
          enum: ['project'],
          description: 'Type of entity (currently only project)',
        },
        entity_id: {
          type: 'string',
          description: 'ID of the entity',
        },
        target_stage: {
          type: 'string',
          enum: ['quote_sent', 'negotiation', 'won'],
          description: 'Target stage to fill requirements for',
        },
        values: {
          type: 'object',
          description: 'Values to fill (e.g., {estimated_value: 15000})',
        },
      },
      required: ['entity_type', 'entity_id', 'target_stage', 'values'],
    },
  },
  execute: async (args, context) => {
    const { entity_type, entity_id, target_stage, values } = args as {
      entity_type: 'project'
      entity_id: string
      target_stage: PipelineStage
      values: Record<string, unknown>
    }

    if (entity_type !== 'project') {
      return { success: false, error: 'fill_required_fields currently only supports projects' }
    }

    // Get required fields for the target stage
    const requiredFields = STAGE_REQUIRED_FIELDS[target_stage] || []
    if (requiredFields.length === 0) {
      return { success: true, message: `No required fields for ${target_stage} stage` }
    }

    // Validate all provided values are for required fields and modifiable
    for (const field of Object.keys(values)) {
      if (!isFieldModifiable(field)) {
        return {
          success: false,
          error: `Cannot modify ${field}. ${getBlockedFieldsMessage()}`,
        }
      }
      if (!requiredFields.includes(field)) {
        return {
          success: false,
          error: `${field} is not a required field for ${target_stage} stage. Required: ${requiredFields.join(', ')}`,
        }
      }
    }

    // Fetch current record
    const { data: current, error: fetchError } = await context.supabase
      .from('projects')
      .select('*')
      .eq('id', entity_id)
      .eq('tenant_id', context.tenantId)
      .single()

    if (fetchError || !current) {
      return { success: false, error: `Could not find project ${entity_id}` }
    }

    // Build update object - only fill empty fields
    const updates: Record<string, unknown> = {}
    const beforeValues: Record<string, unknown> = {}
    const skipped: string[] = []

    for (const [field, value] of Object.entries(values)) {
      const currentValue = current[field]
      if (currentValue === null || currentValue === undefined || currentValue === '') {
        updates[field] = value
        beforeValues[field] = currentValue
      } else {
        skipped.push(field)
      }
    }

    if (Object.keys(updates).length === 0) {
      return {
        success: true,
        message: skipped.length > 0
          ? `All fields already have values: ${skipped.join(', ')}`
          : 'No fields to update',
        data: { skipped },
      }
    }

    // Perform the update
    const { error: updateError } = await context.supabase
      .from('projects')
      .update(updates)
      .eq('id', entity_id)
      .eq('tenant_id', context.tenantId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Log the repair action
    await logRepairAction(context, {
      action: 'fill_fields',
      entity_type: 'project',
      entity_id,
      before: beforeValues,
      after: updates,
    })

    return {
      success: true,
      data: {
        entity_id,
        filled: updates,
        skipped,
        target_stage,
      },
      message: `Filled ${Object.keys(updates).length} field(s): ${Object.entries(updates).map(([k, v]) => `${k}=${v}`).join(', ')}${skipped.length > 0 ? ` (skipped existing: ${skipped.join(', ')})` : ''}`,
    }
  },
})
