/**
 * Common Error Patterns
 * Maps error codes and messages to diagnoses and solutions.
 * Used by ARIA to provide helpful error explanations.
 */

export interface ErrorPattern {
  /** Error code or regex to match */
  code: string | RegExp
  /** URL pattern to match (optional) */
  urlPattern?: RegExp
  /** Human-readable diagnosis */
  diagnosis: string
  /** Likely causes */
  causes: string[]
  /** Suggested fixes */
  fixes: string[]
  /** Severity level */
  severity: 'low' | 'medium' | 'high'
}

// =============================================================================
// Validation Errors
// =============================================================================

export const VALIDATION_ERROR_PATTERNS: ErrorPattern[] = [
  {
    code: 'VALIDATION_ERROR',
    diagnosis: 'The data you submitted did not pass validation checks.',
    causes: [
      'A required field is missing',
      'A field has an invalid value',
      'Data format is incorrect (e.g., invalid email, phone)',
    ],
    fixes: [
      'Check that all required fields are filled in',
      'Verify the format of email addresses and phone numbers',
      'Look at the specific error message for which field failed',
    ],
    severity: 'medium',
  },
  {
    code: /estimated_value.*required/i,
    diagnosis: 'The estimated_value field is required for this action.',
    causes: [
      'Trying to move a project to quote_sent or negotiation without an estimate',
      'The estimate was not saved correctly',
    ],
    fixes: [
      'Create an estimate for this project first',
      'Manually enter the estimated value in the project details',
    ],
    severity: 'medium',
  },
  {
    code: /approved_value.*required/i,
    diagnosis: 'The approved_value field is required for this action.',
    causes: [
      'Trying to move a project to won without setting the approved value',
      'The contract amount was not recorded',
    ],
    fixes: [
      'Set the approved value to the final contract amount',
      'This is typically done when the customer signs the contract',
    ],
    severity: 'medium',
  },
  {
    code: /campaign_steps.*required/i,
    urlPattern: /\/api\/campaigns/,
    diagnosis: 'A campaign must have at least one step before it can be created.',
    causes: [
      'The campaign was created without adding any steps',
      'Steps were added but not saved correctly',
      'Form submission happened before steps were fully loaded',
    ],
    fixes: [
      'Add at least one step to the campaign (SMS, email, or wait)',
      'Save the campaign as a draft first, then add steps',
      'Check if there was a network error when adding steps',
    ],
    severity: 'medium',
  },
]

// =============================================================================
// Authorization Errors
// =============================================================================

export const AUTH_ERROR_PATTERNS: ErrorPattern[] = [
  {
    code: 'UNAUTHORIZED',
    diagnosis: 'You are not logged in or your session has expired.',
    causes: [
      'Session timeout after inactivity',
      'Logged out in another tab',
      'Cookie issues',
    ],
    fixes: [
      'Refresh the page and log in again',
      'Clear browser cookies if the issue persists',
    ],
    severity: 'high',
  },
  {
    code: 'FORBIDDEN',
    diagnosis: 'You do not have permission to perform this action.',
    causes: [
      'Your role does not have access to this feature',
      'The resource belongs to another tenant',
      'The action requires admin or owner permissions',
    ],
    fixes: [
      'Contact your administrator if you need access',
      'Check if you are in the correct tenant/organization',
    ],
    severity: 'medium',
  },
]

// =============================================================================
// Data Integrity Errors
// =============================================================================

export const DATA_ERROR_PATTERNS: ErrorPattern[] = [
  {
    code: 'NOT_FOUND',
    diagnosis: 'The requested item was not found.',
    causes: [
      'The record has been deleted',
      'The ID is incorrect',
      'You do not have access to this record',
    ],
    fixes: [
      'Check if the item was recently deleted',
      'Verify you have the correct link or ID',
      'Try searching for the item by name',
    ],
    severity: 'medium',
  },
  {
    code: 'CONFLICT',
    diagnosis: 'There is a conflict with existing data.',
    causes: [
      'Trying to create a duplicate record',
      'Another user modified the record at the same time',
      'Unique constraint violation',
    ],
    fixes: [
      'Check if a similar record already exists',
      'Refresh the page and try again',
      'Use a different value for the conflicting field',
    ],
    severity: 'medium',
  },
  {
    code: /foreign key/i,
    diagnosis: 'A related record is missing or invalid.',
    causes: [
      'Trying to link to a contact or project that does not exist',
      'The related record was deleted',
      'Invalid ID format',
    ],
    fixes: [
      'Make sure the related record exists first',
      'Create the parent record before linking to it',
    ],
    severity: 'medium',
  },
]

// =============================================================================
// Pipeline Errors
// =============================================================================

export const PIPELINE_ERROR_PATTERNS: ErrorPattern[] = [
  {
    code: /invalid.*transition/i,
    diagnosis: 'This pipeline stage transition is not allowed.',
    causes: [
      'Trying to skip stages',
      'Moving from a terminal stage (complete/lost)',
      'Business rules prevent this transition',
    ],
    fixes: [
      'Check which stages you can move to from the current stage',
      'Complete and lost are terminal - you cannot move from them',
      'Move through stages in order: prospect → qualified → quote_sent → negotiation → won',
    ],
    severity: 'medium',
  },
  {
    code: /terminal stage/i,
    diagnosis: 'Cannot move from a terminal stage.',
    causes: [
      'The project is marked as complete or lost',
      'These are final stages in the pipeline',
    ],
    fixes: [
      'Complete and lost projects cannot be moved to other stages',
      'If this was a mistake, you may need to create a new project',
    ],
    severity: 'low',
  },
]

// =============================================================================
// Network/System Errors
// =============================================================================

export const SYSTEM_ERROR_PATTERNS: ErrorPattern[] = [
  {
    code: 'NETWORK_ERROR',
    diagnosis: 'Could not connect to the server.',
    causes: [
      'Internet connection issue',
      'Server is temporarily down',
      'Request timeout',
    ],
    fixes: [
      'Check your internet connection',
      'Try again in a few moments',
      'Refresh the page',
    ],
    severity: 'high',
  },
  {
    code: 'INTERNAL_SERVER_ERROR',
    diagnosis: 'Something went wrong on our end.',
    causes: [
      'Server encountered an unexpected error',
      'Database issue',
      'Bug in the application',
    ],
    fixes: [
      'Try the action again',
      'If it persists, contact support',
      'The issue has likely been logged for investigation',
    ],
    severity: 'high',
  },
  {
    code: 'RATE_LIMITED',
    diagnosis: 'Too many requests in a short time.',
    causes: [
      'Making too many API calls',
      'Automated processes running too fast',
    ],
    fixes: [
      'Wait a few seconds and try again',
      'Avoid rapidly clicking buttons',
    ],
    severity: 'low',
  },
]

// =============================================================================
// All Patterns
// =============================================================================

export const ALL_ERROR_PATTERNS: ErrorPattern[] = [
  ...VALIDATION_ERROR_PATTERNS,
  ...AUTH_ERROR_PATTERNS,
  ...DATA_ERROR_PATTERNS,
  ...PIPELINE_ERROR_PATTERNS,
  ...SYSTEM_ERROR_PATTERNS,
]

/**
 * Find matching error pattern
 */
export function findErrorPattern(
  code: string,
  message: string,
  url?: string
): ErrorPattern | null {
  for (const pattern of ALL_ERROR_PATTERNS) {
    // Check code match
    let codeMatches = false
    if (typeof pattern.code === 'string') {
      codeMatches = code.toLowerCase() === pattern.code.toLowerCase()
    } else {
      codeMatches = pattern.code.test(code) || pattern.code.test(message)
    }

    if (!codeMatches) continue

    // Check URL pattern if specified
    if (pattern.urlPattern && url) {
      if (!pattern.urlPattern.test(url)) continue
    }

    return pattern
  }

  return null
}

/**
 * Diagnose an error and return helpful information
 */
export function diagnoseError(
  code: string,
  message: string,
  url?: string
): {
  diagnosis: string
  causes: string[]
  fixes: string[]
  severity: 'low' | 'medium' | 'high'
} {
  const pattern = findErrorPattern(code, message, url)

  if (pattern) {
    return {
      diagnosis: pattern.diagnosis,
      causes: pattern.causes,
      fixes: pattern.fixes,
      severity: pattern.severity,
    }
  }

  // Generic fallback
  return {
    diagnosis: `Error: ${message || code}`,
    causes: ['Unknown cause'],
    fixes: ['Try the action again', 'If it persists, contact support'],
    severity: 'medium',
  }
}
