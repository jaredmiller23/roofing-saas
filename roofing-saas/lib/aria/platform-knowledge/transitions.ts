/**
 * Pipeline Stage Transitions
 * Rules for moving projects between pipeline stages.
 * Re-exports from lib/pipeline/validation.ts with ARIA-friendly descriptions.
 */

import {
  VALID_STAGE_TRANSITIONS,
  STAGE_REQUIRED_FIELDS,
  STAGE_DISPLAY_NAMES,
  PIPELINE_TO_STATUS_MAP,
  isValidStageTransition,
  getValidNextStages,
  validateStageRequirements,
  validateCompleteTransition,
  formatMissingFieldsError,
  getTransitionError,
  getStatusForPipelineStage,
} from '@/lib/pipeline/validation'
import type { PipelineStage } from '@/lib/types/api'

// Re-export for ARIA use
export {
  VALID_STAGE_TRANSITIONS,
  STAGE_REQUIRED_FIELDS,
  STAGE_DISPLAY_NAMES,
  PIPELINE_TO_STATUS_MAP,
  isValidStageTransition,
  getValidNextStages,
  validateStageRequirements,
  validateCompleteTransition,
  formatMissingFieldsError,
  getTransitionError,
  getStatusForPipelineStage,
}

// =============================================================================
// ARIA-Friendly Transition Descriptions
// =============================================================================

export interface TransitionDescription {
  from: PipelineStage
  to: PipelineStage
  description: string
  requiredFields: string[]
  tips: string[]
}

/**
 * Get a human-readable description of a stage transition
 */
export function describeTransition(from: PipelineStage, to: PipelineStage): TransitionDescription | null {
  if (!isValidStageTransition(from, to)) {
    return null
  }

  const requiredFields = STAGE_REQUIRED_FIELDS[to] || []

  const descriptions: Record<string, TransitionDescription> = {
    // Forward progression
    'prospect->qualified': {
      from: 'prospect',
      to: 'qualified',
      description: 'Moving from initial contact to qualified lead. This means the customer has genuine interest and is worth pursuing.',
      requiredFields: [],
      tips: ['Make sure you have verified contact information', 'Document what makes this lead qualified'],
    },
    'qualified->quote_sent': {
      from: 'qualified',
      to: 'quote_sent',
      description: 'Moving to Quote Sent stage. This requires an estimated value for the project.',
      requiredFields: ['estimated_value'],
      tips: ['Create and send an estimate before moving to this stage', 'The estimated_value field must be filled in'],
    },
    'quote_sent->negotiation': {
      from: 'quote_sent',
      to: 'negotiation',
      description: 'Customer is actively negotiating. They have reviewed the quote and are working towards a decision.',
      requiredFields: ['estimated_value'],
      tips: ['Track any price adjustments', 'Document concerns or objections'],
    },
    'negotiation->won': {
      from: 'negotiation',
      to: 'won',
      description: 'Deal is won! Contract signed, moving to approved status. Requires approved_value.',
      requiredFields: ['approved_value'],
      tips: ['Make sure contract is signed', 'Set approved_value to the final agreed amount'],
    },
    'won->production': {
      from: 'won',
      to: 'production',
      description: 'Starting production on the project. Work is beginning.',
      requiredFields: [],
      tips: ['Schedule the work', 'Assign crew members'],
    },
    'production->complete': {
      from: 'production',
      to: 'complete',
      description: 'Project is complete! All work has been finished.',
      requiredFields: [],
      tips: ['Verify all work is done', 'Get customer sign-off', 'Send final invoice'],
    },
    // Lost transitions
    'prospect->lost': {
      from: 'prospect',
      to: 'lost',
      description: 'Lead did not qualify or is no longer interested.',
      requiredFields: [],
      tips: ['Document why the lead was lost'],
    },
    'qualified->lost': {
      from: 'qualified',
      to: 'lost',
      description: 'Qualified lead decided not to proceed.',
      requiredFields: [],
      tips: ['Document the reason for loss'],
    },
    'quote_sent->lost': {
      from: 'quote_sent',
      to: 'lost',
      description: 'Customer declined the quote.',
      requiredFields: [],
      tips: ['Document why they declined (price, timing, competitor, etc.)'],
    },
    'negotiation->lost': {
      from: 'negotiation',
      to: 'lost',
      description: 'Deal fell through during negotiations.',
      requiredFields: [],
      tips: ['Document what caused the deal to fall through'],
    },
    // Backward movement (allowed for sales stages)
    'qualified->prospect': {
      from: 'qualified',
      to: 'prospect',
      description: 'Moving back to prospect. Perhaps needs re-qualification.',
      requiredFields: [],
      tips: ['Document why the lead is being moved back'],
    },
    'quote_sent->qualified': {
      from: 'quote_sent',
      to: 'qualified',
      description: 'Moving back to qualified. Quote may need revision.',
      requiredFields: [],
      tips: ['May need to create a new estimate'],
    },
    'negotiation->quote_sent': {
      from: 'negotiation',
      to: 'quote_sent',
      description: 'Moving back to quote sent. May need to send a revised quote.',
      requiredFields: ['estimated_value'],
      tips: ['Consider sending a revised estimate'],
    },
    'won->negotiation': {
      from: 'won',
      to: 'negotiation',
      description: 'Moving back to negotiation. Contract may need changes.',
      requiredFields: ['estimated_value'],
      tips: ['Document why the contract is being renegotiated'],
    },
    'production->won': {
      from: 'production',
      to: 'won',
      description: 'Moving back to won. Work has not actually started.',
      requiredFields: ['approved_value'],
      tips: ['Only do this if work has not begun'],
    },
  }

  const key = `${from}->${to}`
  if (descriptions[key]) {
    return descriptions[key]
  }

  // Generic description for valid transitions not explicitly defined
  return {
    from,
    to,
    description: `Moving from ${STAGE_DISPLAY_NAMES[from]} to ${STAGE_DISPLAY_NAMES[to]}.`,
    requiredFields,
    tips: requiredFields.length > 0
      ? [`Required fields: ${requiredFields.join(', ')}`]
      : [],
  }
}

/**
 * Explain why a transition is blocked
 */
export function explainBlockedTransition(
  currentStage: PipelineStage,
  targetStage: PipelineStage,
  project: Record<string, unknown>
): string {
  // Check if transition is valid at all
  if (!isValidStageTransition(currentStage, targetStage)) {
    return getTransitionError(currentStage, targetStage)
  }

  // Check required fields
  const validation = validateStageRequirements(targetStage, {
    estimated_value: project.estimated_value as number | null | undefined,
    approved_value: project.approved_value as number | null | undefined,
  })

  if (!validation.valid) {
    return formatMissingFieldsError(validation.missingFields)
  }

  return 'This transition should be allowed. Check for other validation errors.'
}

/**
 * Get suggestions for unblocking a transition
 */
export function getSuggestionsForTransition(
  targetStage: PipelineStage,
  project: Record<string, unknown>
): string[] {
  const requiredFields = STAGE_REQUIRED_FIELDS[targetStage] || []
  const suggestions: string[] = []

  for (const field of requiredFields) {
    const value = project[field]
    if (value === null || value === undefined || value === '') {
      if (field === 'estimated_value') {
        suggestions.push('Create and send an estimate to set the estimated_value')
        suggestions.push('Or manually enter the estimated value on the project')
      } else if (field === 'approved_value') {
        suggestions.push('Get the contract signed and set the approved_value')
        suggestions.push('The approved value is the final agreed amount')
      } else {
        suggestions.push(`Fill in the ${field} field`)
      }
    }
  }

  return suggestions
}
