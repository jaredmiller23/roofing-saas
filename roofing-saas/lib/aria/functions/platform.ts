/**
 * ARIA Platform Functions
 * Self-awareness functions for diagnosing errors and understanding the app.
 * All functions are read-only and tenant-scoped via RLS.
 */

import { ariaFunctionRegistry } from '../function-registry'
import { logger } from '@/lib/logger'
import {
  diagnoseError,
  findErrorPattern,
} from '../platform-knowledge/error-patterns'
import {
  getEntitySchema,
  validateEntityAgainstSchema,
  getFieldsRequiredForStage,
} from '../platform-knowledge/schemas'
import {
  getEnumDefinition,
} from '../platform-knowledge/enums'
import {
  getValidNextStages,
  validateCompleteTransition,
  STAGE_DISPLAY_NAMES,
  describeTransition,
  getSuggestionsForTransition,
} from '../platform-knowledge/transitions'
import {
  describeCurrentPage,
  searchRoutes,
} from '../platform-knowledge/routes'
import type { PipelineStage } from '@/lib/types/api'

// =============================================================================
// diagnose_error - Analyze an error and provide diagnosis
// =============================================================================

ariaFunctionRegistry.register({
  name: 'diagnose_error',
  category: 'platform',
  description: 'Diagnose an error code or message and provide helpful information about what went wrong',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'diagnose_error',
    description: 'Diagnose an error code or message and provide helpful information',
    parameters: {
      type: 'object',
      properties: {
        error_code: {
          type: 'string',
          description: 'The error code (e.g., VALIDATION_ERROR, NOT_FOUND)',
        },
        error_message: {
          type: 'string',
          description: 'The error message text',
        },
        url: {
          type: 'string',
          description: 'The API URL where the error occurred',
        },
      },
      required: ['error_code'],
    },
  },
  execute: async (args, context) => {
    const { error_code, error_message, url } = args as {
      error_code: string
      error_message?: string
      url?: string
    }

    logger.info('ARIA diagnose_error', { error_code, error_message, url, userId: context.userId })

    const result = diagnoseError(error_code, error_message || '', url)
    const pattern = findErrorPattern(error_code, error_message || '', url)

    return {
      success: true,
      data: {
        error_code,
        diagnosis: result.diagnosis,
        causes: result.causes,
        fixes: result.fixes,
        severity: result.severity,
        pattern_matched: pattern ? pattern.code.toString() : null,
      },
      message: `Diagnosis: ${result.diagnosis}. ${result.fixes[0] || ''}`,
    }
  },
})

// =============================================================================
// check_data_integrity - Validate a record against its schema
// =============================================================================

ariaFunctionRegistry.register({
  name: 'check_data_integrity',
  category: 'platform',
  description: 'Check if a record has all required fields for its current state',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'check_data_integrity',
    description: 'Validate a record against its schema and stage requirements',
    parameters: {
      type: 'object',
      properties: {
        entity_type: {
          type: 'string',
          enum: ['contact', 'project', 'campaign'],
          description: 'Type of entity to check',
        },
        entity_id: {
          type: 'string',
          description: 'ID of the entity to check',
        },
        target_stage: {
          type: 'string',
          description: 'Pipeline stage to validate requirements for (optional)',
        },
      },
      required: ['entity_type', 'entity_id'],
    },
  },
  execute: async (args, context) => {
    const { entity_type, entity_id, target_stage } = args as {
      entity_type: string
      entity_id: string
      target_stage?: string
    }

    const schema = getEntitySchema(entity_type)
    if (!schema) {
      return { success: false, error: `Unknown entity type: ${entity_type}` }
    }

    // Fetch the entity
    const { data: entity, error } = await context.supabase
      .from(schema.tableName)
      .select('*')
      .eq('id', entity_id)
      .eq('tenant_id', context.tenantId)
      .single()

    if (error || !entity) {
      return { success: false, error: `Could not find ${entity_type} with ID ${entity_id}` }
    }

    // Validate against schema
    const validation = validateEntityAgainstSchema(entity_type, entity, target_stage)

    // Get stage-specific requirements if applicable
    const stageFields = target_stage
      ? getFieldsRequiredForStage(entity_type, target_stage)
      : []

    return {
      success: true,
      data: {
        entity_type,
        entity_id,
        valid: validation.valid,
        missing_fields: validation.missingFields,
        errors: validation.errors,
        stage_required_fields: stageFields,
        current_values: validation.missingFields.reduce((acc, field) => {
          acc[field] = entity[field]
          return acc
        }, {} as Record<string, unknown>),
      },
      message: validation.valid
        ? `${entity_type} ${entity_id} passes validation`
        : `${entity_type} is missing: ${validation.missingFields.join(', ')}`,
    }
  },
})

// =============================================================================
// query_records - Read-only query against a table
// =============================================================================

ariaFunctionRegistry.register({
  name: 'query_records',
  category: 'platform',
  description: 'Query records from the database (read-only, tenant-scoped)',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'query_records',
    description: 'Query records from a table with optional filters',
    parameters: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          enum: ['contacts', 'projects', 'campaigns', 'campaign_steps', 'tasks', 'activities'],
          description: 'Table to query',
        },
        filters: {
          type: 'object',
          description: 'Filter conditions (e.g., {campaign_id: "xxx"})',
        },
        select: {
          type: 'string',
          description: 'Columns to select (default: *)',
        },
        limit: {
          type: 'number',
          description: 'Maximum records to return (default: 10, max: 50)',
        },
      },
      required: ['table'],
    },
  },
  execute: async (args, context) => {
    const { table, filters, select, limit } = args as {
      table: string
      filters?: Record<string, unknown>
      select?: string
      limit?: number
    }

    // Whitelist of allowed tables
    const allowedTables = ['contacts', 'projects', 'campaigns', 'campaign_steps', 'tasks', 'activities']
    if (!allowedTables.includes(table)) {
      return { success: false, error: `Table ${table} is not queryable` }
    }

    const maxLimit = Math.min(limit || 10, 50)

    let query = context.supabase
      .from(table)
      .select(select || '*')
      .eq('tenant_id', context.tenantId)
      .limit(maxLimit)

    // Apply filters
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        // Prevent tenant_id override
        if (key === 'tenant_id') continue
        query = query.eq(key, value)
      }
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      data: {
        table,
        count: data?.length || 0,
        records: data,
      },
      message: `Found ${data?.length || 0} records in ${table}`,
    }
  },
})

// =============================================================================
// get_validation_rules - Get field requirements for an entity
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_validation_rules',
  category: 'platform',
  description: 'Get validation rules and required fields for an entity type',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_validation_rules',
    description: 'Get field definitions and requirements for an entity type',
    parameters: {
      type: 'object',
      properties: {
        entity_type: {
          type: 'string',
          enum: ['contact', 'project', 'campaign', 'campaign_step'],
          description: 'Type of entity',
        },
      },
      required: ['entity_type'],
    },
  },
  execute: async (args) => {
    const { entity_type } = args as { entity_type: string }

    const schema = getEntitySchema(entity_type)
    if (!schema) {
      return { success: false, error: `Unknown entity type: ${entity_type}` }
    }

    return {
      success: true,
      data: {
        entity_type,
        description: schema.description,
        table_name: schema.tableName,
        fields: schema.fields.map(f => ({
          name: f.name,
          type: f.type,
          required: f.required,
          description: f.description,
          valid_values: f.enumValues,
          required_for_stages: f.requiredForStages,
        })),
        required_fields: schema.fields.filter(f => f.required).map(f => f.name),
      },
      message: `${entity_type} has ${schema.fields.filter(f => f.required).length} required fields`,
    }
  },
})

// =============================================================================
// check_pipeline_requirements - What's needed for a stage transition
// =============================================================================

ariaFunctionRegistry.register({
  name: 'check_pipeline_requirements',
  category: 'platform',
  description: 'Check what is needed to move a project to a target pipeline stage',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'check_pipeline_requirements',
    description: 'Check requirements and blockers for a pipeline stage transition',
    parameters: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID to check',
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

    // Fetch the project
    const { data: project, error } = await context.supabase
      .from('projects')
      .select('id, name, pipeline_stage, estimated_value, approved_value')
      .eq('id', project_id)
      .eq('tenant_id', context.tenantId)
      .single()

    if (error || !project) {
      return { success: false, error: `Could not find project ${project_id}` }
    }

    const currentStage = project.pipeline_stage as PipelineStage

    // Check transition validity
    const validNextStages = getValidNextStages(currentStage)

    // Validate requirements
    const validation = validateCompleteTransition(currentStage, target_stage, {
      estimated_value: project.estimated_value,
      approved_value: project.approved_value,
    })

    // Get transition description
    const transitionDesc = describeTransition(currentStage, target_stage)

    // Get suggestions if blocked
    const suggestions = !validation.valid
      ? getSuggestionsForTransition(target_stage, project)
      : []

    return {
      success: true,
      data: {
        project_id,
        project_name: project.name,
        current_stage: currentStage,
        current_stage_label: STAGE_DISPLAY_NAMES[currentStage],
        target_stage,
        target_stage_label: STAGE_DISPLAY_NAMES[target_stage],
        can_transition: validation.valid,
        blocker: validation.error,
        valid_next_stages: validNextStages.map(s => ({
          stage: s,
          label: STAGE_DISPLAY_NAMES[s],
        })),
        transition_description: transitionDesc?.description,
        required_fields: transitionDesc?.requiredFields || [],
        tips: transitionDesc?.tips || [],
        suggestions,
      },
      message: validation.valid
        ? `Project can move from ${STAGE_DISPLAY_NAMES[currentStage]} to ${STAGE_DISPLAY_NAMES[target_stage]}`
        : `Blocked: ${validation.error}`,
    }
  },
})

// =============================================================================
// get_recent_errors - Get errors from context
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_recent_errors',
  category: 'platform',
  description: 'Get recent errors encountered by the user (from context)',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_recent_errors',
    description: 'Retrieve recent errors from the current session',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  execute: async (_args, context) => {
    const errors = context.recentErrors || []

    if (errors.length === 0) {
      return {
        success: true,
        data: { count: 0, errors: [] },
        message: 'No recent errors found',
      }
    }

    // Diagnose each error
    const diagnosed = errors.map(err => ({
      ...err,
      diagnosis: diagnoseError(err.code, err.message, err.url),
    }))

    return {
      success: true,
      data: {
        count: errors.length,
        errors: diagnosed,
      },
      message: `Found ${errors.length} recent error(s). Most recent: ${errors[0].code} - ${errors[0].message}`,
    }
  },
})

// =============================================================================
// explain_feature - Explain how a feature works
// =============================================================================

ariaFunctionRegistry.register({
  name: 'explain_feature',
  category: 'platform',
  description: 'Explain how a specific feature or page works in the app',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'explain_feature',
    description: 'Get information about a feature or page in the app',
    parameters: {
      type: 'object',
      properties: {
        feature: {
          type: 'string',
          description: 'Feature name or search term (e.g., "campaigns", "pipeline", "estimates")',
        },
      },
      required: ['feature'],
    },
  },
  execute: async (args, context) => {
    const { feature } = args as { feature: string }

    // Search routes by keyword
    const routes = searchRoutes(feature)

    // Get current page context
    const currentPage = context.page
    const currentPageDesc = currentPage ? describeCurrentPage(currentPage) : null

    // Get enum info if feature matches an enum
    const enumDef = getEnumDefinition(feature)

    // Build explanation
    const explanations: string[] = []

    if (routes.length > 0) {
      explanations.push(`Found ${routes.length} related feature(s):`)
      for (const route of routes.slice(0, 3)) {
        explanations.push(`- ${route.label}: ${route.description} (${route.path})`)
      }
    }

    if (enumDef) {
      explanations.push(`\n${feature} values:`)
      for (const v of enumDef.values) {
        explanations.push(`- ${v.label}: ${v.description}`)
      }
    }

    return {
      success: true,
      data: {
        feature,
        routes: routes.slice(0, 5),
        enum_definition: enumDef,
        current_page: currentPage,
        current_page_description: currentPageDesc,
      },
      message: explanations.join('\n') || `No specific information found for "${feature}"`,
    }
  },
})

// =============================================================================
// get_enum_values - Get valid values for a field
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_enum_values',
  category: 'platform',
  description: 'Get valid values for an enum field',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_enum_values',
    description: 'Get the list of valid values for an enum field',
    parameters: {
      type: 'object',
      properties: {
        enum_name: {
          type: 'string',
          enum: ['pipeline_stage', 'project_status', 'contact_stage', 'campaign_status', 'campaign_type', 'task_priority', 'dnc_status'],
          description: 'Name of the enum',
        },
      },
      required: ['enum_name'],
    },
  },
  execute: async (args) => {
    const { enum_name } = args as { enum_name: string }

    const enumDef = getEnumDefinition(enum_name)
    if (!enumDef) {
      return { success: false, error: `Unknown enum: ${enum_name}` }
    }

    return {
      success: true,
      data: {
        enum_name,
        description: enumDef.description,
        values: enumDef.values,
      },
      message: `${enum_name} has ${enumDef.values.length} valid values`,
    }
  },
})
