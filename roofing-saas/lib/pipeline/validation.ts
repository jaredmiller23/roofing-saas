/**
 * Pipeline Stage Validation
 * Handles stage transition rules and validation for the sales pipeline
 */

import type { PipelineStage } from '@/lib/types/api'

/**
 * Ordered pipeline stages for progression validation
 * Stages must progress in order (with exceptions for 'lost')
 */
export const PIPELINE_STAGE_ORDER: PipelineStage[] = [
  'prospect',
  'qualified',
  'quote_sent',
  'negotiation',
  'won',
  'production',
  'complete',
]

/**
 * Define valid transitions from each stage
 * Each stage can only transition to specific next stages
 */
export const VALID_STAGE_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  prospect: ['qualified', 'lost'],
  qualified: ['quote_sent', 'lost'],
  quote_sent: ['negotiation', 'lost'],
  negotiation: ['won', 'lost'],
  won: ['production', 'lost'],
  production: ['complete', 'lost'],
  complete: [], // Terminal stage - no further progression
  lost: [], // Terminal stage - no further progression
}

/**
 * Required fields for entering each stage
 */
export const STAGE_REQUIRED_FIELDS: Record<PipelineStage, string[]> = {
  prospect: [],
  qualified: [],
  quote_sent: ['estimated_value'], // Must have an estimate
  negotiation: ['estimated_value'],
  won: ['approved_value'], // Must have approved value
  production: [], // Will require job to be created
  complete: [],
  lost: [],
}

/**
 * Auto-sync status based on pipeline stage
 */
export const PIPELINE_TO_STATUS_MAP: Record<PipelineStage, string> = {
  prospect: 'estimate',
  qualified: 'estimate',
  quote_sent: 'proposal',
  negotiation: 'proposal',
  won: 'approved',
  production: 'in_progress',
  complete: 'completed',
  lost: 'cancelled',
}

/**
 * Stage display names for UI
 */
export const STAGE_DISPLAY_NAMES: Record<PipelineStage, string> = {
  prospect: 'Prospect',
  qualified: 'Qualified',
  quote_sent: 'Quote Sent',
  negotiation: 'Negotiation',
  won: 'Won',
  production: 'Production',
  complete: 'Complete',
  lost: 'Lost',
}

/**
 * Check if a stage transition is valid
 */
export function isValidStageTransition(
  currentStage: PipelineStage,
  newStage: PipelineStage
): boolean {
  // Same stage is always valid (no change)
  if (currentStage === newStage) return true

  // Check if newStage is in the allowed transitions
  return VALID_STAGE_TRANSITIONS[currentStage]?.includes(newStage) ?? false
}

/**
 * Get the list of valid next stages from the current stage
 */
export function getValidNextStages(currentStage: PipelineStage): PipelineStage[] {
  return VALID_STAGE_TRANSITIONS[currentStage] || []
}

/**
 * Validate that required fields are present for a stage transition
 */
export function validateStageRequirements(
  newStage: PipelineStage,
  project: {
    estimated_value?: number | null
    approved_value?: number | null
    [key: string]: unknown
  }
): { valid: boolean; missingFields: string[] } {
  const requiredFields = STAGE_REQUIRED_FIELDS[newStage] || []
  const missingFields: string[] = []

  for (const field of requiredFields) {
    const value = project[field]
    if (value === null || value === undefined || value === '') {
      missingFields.push(field)
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  }
}

/**
 * Get the auto-synced status for a pipeline stage
 */
export function getStatusForPipelineStage(pipelineStage: PipelineStage): string {
  return PIPELINE_TO_STATUS_MAP[pipelineStage] || 'estimate'
}

/**
 * Format missing fields for error message
 */
export function formatMissingFieldsError(missingFields: string[]): string {
  const fieldNames = missingFields.map(field => {
    switch (field) {
      case 'estimated_value': return 'Estimated Value'
      case 'approved_value': return 'Approved Value'
      default: return field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }
  })
  return `Missing required fields: ${fieldNames.join(', ')}`
}

/**
 * Get detailed error for invalid stage transition
 */
export function getTransitionError(
  currentStage: PipelineStage,
  newStage: PipelineStage
): string {
  const validNext = getValidNextStages(currentStage)

  if (validNext.length === 0) {
    return `Cannot transition from ${STAGE_DISPLAY_NAMES[currentStage]}. This is a terminal stage.`
  }

  const validNames = validNext.map(s => STAGE_DISPLAY_NAMES[s]).join(' or ')
  return `Cannot move to ${STAGE_DISPLAY_NAMES[newStage]}. From ${STAGE_DISPLAY_NAMES[currentStage]}, you can only move to: ${validNames}`
}

/**
 * Check if stage requires production to be started
 */
export function requiresProductionStart(newStage: PipelineStage): boolean {
  return newStage === 'production'
}

/**
 * Check if a project can start production
 */
export function canStartProduction(pipelineStage: PipelineStage): boolean {
  return pipelineStage === 'won'
}

/**
 * Validate complete stage transition including requirements
 */
export function validateCompleteTransition(
  currentStage: PipelineStage,
  newStage: PipelineStage,
  project: {
    estimated_value?: number | null
    approved_value?: number | null
    [key: string]: unknown
  }
): {
  valid: boolean
  error?: string
} {
  // Check transition validity
  if (!isValidStageTransition(currentStage, newStage)) {
    return {
      valid: false,
      error: getTransitionError(currentStage, newStage),
    }
  }

  // Check required fields
  const requirements = validateStageRequirements(newStage, project)
  if (!requirements.valid) {
    return {
      valid: false,
      error: formatMissingFieldsError(requirements.missingFields),
    }
  }

  return { valid: true }
}
