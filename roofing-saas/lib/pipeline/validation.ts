/**
 * Pipeline Stage Validation
 * Handles stage transition rules and validation for the sales pipeline
 *
 * Includes Perfect Packet validation — ASR's requirement that 4 items must be
 * present before a project can advance to production:
 * 1. Photos of home/damage
 * 2. Measurement report
 * 3. Insurance estimate
 * 4. Job submission form
 */

import type { PipelineStage } from '@/lib/types/api'
import type { RoofingFileCategory } from '@/lib/types/file'
import type { SupabaseClient } from '@supabase/supabase-js'

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
 * Allows both forward and backward movement for sales stages (prospect through won)
 * Production and Complete are restricted to prevent accidental regression during active work
 */
export const VALID_STAGE_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  // Sales stages - allow backward movement for flexibility
  prospect: ['qualified', 'lost'],
  qualified: ['prospect', 'quote_sent', 'lost'], // Can go back to prospect
  quote_sent: ['qualified', 'negotiation', 'lost'], // Can go back to qualified
  negotiation: ['quote_sent', 'won', 'lost'], // Can go back to quote_sent
  won: ['negotiation', 'production', 'lost'], // Can go back to negotiation
  // Work stages - restricted movement
  production: ['won', 'complete', 'lost'], // Can go back to won if work hasn't started
  complete: [], // Terminal stage - job is done
  lost: [], // Terminal stage - deal is closed
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
 * Note: This is synchronous validation for field requirements only.
 * For Perfect Packet validation (which requires DB queries), use validateCompleteTransitionAsync
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

// =====================================================
// PERFECT PACKET VALIDATION
// ASR Workflow: Nothing proceeds past "Contract Signed" (won)
// to production without a complete packet
// =====================================================

/**
 * Perfect Packet Requirements
 * These are the 4 required document categories for a project to enter production
 */
export interface PerfectPacketRequirement {
  category: RoofingFileCategory
  label: string
  description: string
}

export const PERFECT_PACKET_REQUIREMENTS: PerfectPacketRequirement[] = [
  {
    category: 'photos-damage',
    label: 'Photos of Home/Damage',
    description: 'Documentation photos showing damage or property condition',
  },
  {
    category: 'measurements',
    label: 'Measurement Report',
    description: 'Roof measurements (EagleView, Hover, manual, etc.)',
  },
  {
    category: 'insurance-estimate',
    label: 'Insurance Estimate',
    description: 'Insurance company scope or estimate document',
  },
  {
    category: 'job-submission',
    label: 'Job Submission Form',
    description: 'Completed job submission form for production',
  },
]

/**
 * Result of Perfect Packet validation
 */
export interface PerfectPacketValidationResult {
  isComplete: boolean
  missing: PerfectPacketRequirement[]
  present: PerfectPacketRequirement[]
  /** File counts by category */
  fileCounts: Record<string, number>
}

/**
 * Validate Perfect Packet completeness for a project
 * Checks that all 4 required document categories have at least one file
 *
 * @param projectId - The project to validate
 * @param supabase - Authenticated Supabase client
 * @returns Validation result with missing/present items
 */
export async function validatePerfectPacket(
  projectId: string,
  supabase: SupabaseClient
): Promise<PerfectPacketValidationResult> {
  // Query project_files for this project, grouped by category
  const { data: files, error } = await supabase
    .from('project_files')
    .select('file_category')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .in('file_category', PERFECT_PACKET_REQUIREMENTS.map(r => r.category))

  if (error) {
    // Log but don't throw — return as if nothing present
    console.error('[validatePerfectPacket] Query error:', error)
    return {
      isComplete: false,
      missing: [...PERFECT_PACKET_REQUIREMENTS],
      present: [],
      fileCounts: {},
    }
  }

  // Count files per category
  const fileCounts: Record<string, number> = {}
  for (const file of files || []) {
    const category = file.file_category as string
    fileCounts[category] = (fileCounts[category] || 0) + 1
  }

  // Check which requirements are met
  const missing: PerfectPacketRequirement[] = []
  const present: PerfectPacketRequirement[] = []

  for (const requirement of PERFECT_PACKET_REQUIREMENTS) {
    if ((fileCounts[requirement.category] || 0) > 0) {
      present.push(requirement)
    } else {
      missing.push(requirement)
    }
  }

  return {
    isComplete: missing.length === 0,
    missing,
    present,
    fileCounts,
  }
}

/**
 * Format Perfect Packet validation error for user display
 */
export function formatPerfectPacketError(
  result: PerfectPacketValidationResult
): string {
  if (result.isComplete) {
    return ''
  }

  const missingItems = result.missing.map(r => r.label).join(', ')
  return `Perfect Packet incomplete. Missing: ${missingItems}. All 4 items are required before starting production.`
}

/**
 * Check if a stage transition requires Perfect Packet validation
 */
export function requiresPerfectPacketValidation(
  currentStage: PipelineStage,
  newStage: PipelineStage
): boolean {
  // Perfect Packet is required when moving to production from won
  return currentStage === 'won' && newStage === 'production'
}

/**
 * Complete stage transition validation including async Perfect Packet check
 * Use this when you have access to a Supabase client
 *
 * @param currentStage - Current pipeline stage
 * @param newStage - Target pipeline stage
 * @param project - Project data with required fields
 * @param projectId - Project ID for file queries
 * @param supabase - Authenticated Supabase client
 * @param options - Optional validation options
 * @returns Validation result
 */
export async function validateCompleteTransitionAsync(
  currentStage: PipelineStage,
  newStage: PipelineStage,
  project: {
    estimated_value?: number | null
    approved_value?: number | null
    [key: string]: unknown
  },
  projectId: string,
  supabase: SupabaseClient,
  options?: {
    /** Skip Perfect Packet validation (admin override) */
    skipPerfectPacket?: boolean
  }
): Promise<{
  valid: boolean
  error?: string
  perfectPacketResult?: PerfectPacketValidationResult
}> {
  // First run synchronous validation
  const syncResult = validateCompleteTransition(currentStage, newStage, project)
  if (!syncResult.valid) {
    return syncResult
  }

  // Check if Perfect Packet validation is needed
  if (
    requiresPerfectPacketValidation(currentStage, newStage) &&
    !options?.skipPerfectPacket
  ) {
    const packetResult = await validatePerfectPacket(projectId, supabase)

    if (!packetResult.isComplete) {
      return {
        valid: false,
        error: formatPerfectPacketError(packetResult),
        perfectPacketResult: packetResult,
      }
    }

    return {
      valid: true,
      perfectPacketResult: packetResult,
    }
  }

  return { valid: true }
}
