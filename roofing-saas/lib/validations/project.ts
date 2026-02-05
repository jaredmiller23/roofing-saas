import { z } from 'zod'

/**
 * Zod validation schemas for project data
 *
 * Security note: These schemas ensure clients cannot set server-controlled fields
 * like id, tenant_id, created_by, created_at, etc.
 */

// Pipeline stages enum
const pipelineStageEnum = z.enum([
  'prospect',
  'qualified',
  'quote_sent',
  'negotiation',
  'won',
  'production',
  'complete',
  'lost',
])

// Lead priority enum
const leadPriorityEnum = z.enum(['urgent', 'high', 'normal', 'low'])

// Project status enum
const projectStatusEnum = z.enum([
  'estimate',
  'proposal',
  'approved',
  'in_progress',
  'completed',
  'cancelled',
])

export const createProjectSchema = z.object({
  // Required field
  name: z.string().min(1, 'Project name is required').max(200),

  // Contact reference (recommended but optional)
  contact_id: z.string().uuid('Invalid contact ID').optional().nullable(),

  // Description
  description: z.string().max(5000).optional(),

  // Status and pipeline
  status: projectStatusEnum.optional(),
  pipeline_stage: pipelineStageEnum.optional(),
  type: z.string().max(100).optional(),

  // Lead management
  lead_source: z.string().max(100).optional(),
  priority: leadPriorityEnum.optional(),
  lead_score: z.number().int().min(0).max(100).optional(),
  estimated_close_date: z.string().datetime().optional().nullable(),

  // Insurance/adjuster reference
  adjuster_contact_id: z.string().uuid().optional().nullable(),
  claim_id: z.string().uuid().optional().nullable(),
  storm_event_id: z.string().uuid().optional().nullable(),

  // Financial fields
  estimated_value: z.number().min(0).optional().nullable(),
  approved_value: z.number().min(0).optional().nullable(),
  final_value: z.number().min(0).optional().nullable(),
  budget: z.number().min(0).optional().nullable(),
  actual_cost: z.number().min(0).optional().nullable(),

  // Dates
  start_date: z.string().datetime().optional().nullable(),
  end_date: z.string().datetime().optional().nullable(),

  // Notes and custom fields
  notes: z.string().max(10000).optional(),
  custom_fields: z.record(z.string(), z.unknown()).optional(),
})

export const updateProjectSchema = createProjectSchema.partial().extend({
  id: z.string().uuid(),
})

export const projectFiltersSchema = z.object({
  search: z.string().optional(),
  status: projectStatusEnum.optional(),
  pipeline_stage: pipelineStageEnum.optional(),
  pipeline: z.string().optional(), // For custom_fields.proline_pipeline filter
  stage: z.string().optional(), // For custom_fields.proline_stage filter
  assigned_to: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(), // Max 100 per page
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
})

// Edit form schema (subset of fields exposed in the project edit UI)
export const projectEditSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200),
  description: z.string().max(5000).optional(),
  scope_of_work: z.string().max(10000).optional(),
  type: z.string().max(100).optional(),
  estimated_value: z.number().min(0).optional().nullable(),
  approved_value: z.number().min(0).optional().nullable(),
  final_value: z.number().min(0).optional().nullable(),
  estimated_start: z.string().optional().nullable(),
  pipeline_stage: pipelineStageEnum,
  lead_source: z.string().max(100).optional(),
})

// Type exports
export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type ProjectFilters = z.infer<typeof projectFiltersSchema>
export type ProjectEditInput = z.infer<typeof projectEditSchema>
