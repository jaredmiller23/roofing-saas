/**
 * ARIA Commitment Detector
 *
 * Detects when ARIA makes commitments in responses (callbacks, follow-ups, quotes)
 * so we can create tasks and notify the team automatically.
 */

import { logger } from '@/lib/logger'

// =============================================================================
// Types
// =============================================================================

export type CommitmentType = 'callback' | 'followup' | 'quote' | 'schedule' | 'information'
export type CommitmentUrgency = 'high' | 'medium' | 'low'

export interface DetectedCommitment {
  hasCommitment: boolean
  type: CommitmentType
  urgency: CommitmentUrgency
  suggestedDueDate: Date
  matchedPattern?: string
  extractedDetails?: string
}

// =============================================================================
// Commitment Patterns
// =============================================================================

interface CommitmentPattern {
  regex: RegExp
  type: CommitmentType
  urgency: CommitmentUrgency
  dueDays: number // 0 = same day, 1 = next business day, etc.
}

/**
 * Patterns ordered by priority - first match wins
 */
const COMMITMENT_PATTERNS: CommitmentPattern[] = [
  // HIGH PRIORITY - Callback/Contact (due same day)
  {
    regex: /(?:someone|we|i|a team member|our team)\s*(?:will|can|'ll)\s*(?:call|contact|reach out|phone|get in touch)/i,
    type: 'callback',
    urgency: 'high',
    dueDays: 0,
  },
  {
    regex: /(?:expect|anticipate)\s*(?:a|our)?\s*call/i,
    type: 'callback',
    urgency: 'high',
    dueDays: 0,
  },
  {
    regex: /(?:give|make)\s*(?:you)?\s*a\s*call/i,
    type: 'callback',
    urgency: 'high',
    dueDays: 0,
  },
  {
    regex: /call\s*(?:you|back)\s*(?:to|and)\s*(?:confirm|discuss|schedule)/i,
    type: 'callback',
    urgency: 'high',
    dueDays: 0,
  },

  // MEDIUM PRIORITY - Quote/Estimate (due next business day)
  {
    regex: /(?:send|provide|get|prepare|put together)\s*(?:you|a)?\s*(?:a|an|the)?\s*(?:quote|estimate|pricing|proposal)/i,
    type: 'quote',
    urgency: 'medium',
    dueDays: 1,
  },
  {
    regex: /(?:work up|calculate|figure out)\s*(?:a|an|the)?\s*(?:quote|estimate|price|cost)/i,
    type: 'quote',
    urgency: 'medium',
    dueDays: 1,
  },

  // MEDIUM PRIORITY - Schedule (due next business day)
  {
    regex: /(?:schedule|set up|arrange|book)\s*(?:a|an|the)?\s*(?:appointment|visit|inspection|meeting|time)/i,
    type: 'schedule',
    urgency: 'medium',
    dueDays: 1,
  },
  {
    regex: /(?:find|check)\s*(?:a|some)?\s*(?:time|availability)/i,
    type: 'schedule',
    urgency: 'medium',
    dueDays: 1,
  },

  // LOW PRIORITY - General Follow-up (due in 2 days)
  {
    regex: /(?:get back|follow up|reach out|be in touch)\s*(?:to|with)?\s*(?:you)?/i,
    type: 'followup',
    urgency: 'low',
    dueDays: 2,
  },
  {
    regex: /(?:someone|we|i)\s*(?:will|'ll)\s*(?:follow up|respond|reply|get back)/i,
    type: 'followup',
    urgency: 'low',
    dueDays: 2,
  },
  {
    regex: /(?:let me|i'll)\s*(?:check|find out|look into|verify)/i,
    type: 'information',
    urgency: 'low',
    dueDays: 2,
  },
]

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate the due date based on business days
 */
function calculateDueDate(dueDays: number): Date {
  const now = new Date()
  let daysToAdd = dueDays

  // If it's after 5pm, start counting from tomorrow
  if (now.getHours() >= 17) {
    daysToAdd += 1
  }

  const dueDate = new Date(now)

  while (daysToAdd > 0) {
    dueDate.setDate(dueDate.getDate() + 1)
    // Skip weekends
    const dayOfWeek = dueDate.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysToAdd--
    }
  }

  // Set to end of business day (5pm)
  dueDate.setHours(17, 0, 0, 0)

  return dueDate
}

/**
 * Extract additional context around the commitment
 */
function extractDetails(response: string, matchIndex: number): string | undefined {
  // Get surrounding context (50 chars before and after)
  const start = Math.max(0, matchIndex - 50)
  const end = Math.min(response.length, matchIndex + 100)
  const context = response.slice(start, end).trim()

  // Clean up the context
  if (context.length > 20) {
    return `...${context}...`
  }

  return undefined
}

// =============================================================================
// Main Detection Function
// =============================================================================

/**
 * Detect commitments in ARIA's response
 *
 * @param response - ARIA's generated response text
 * @returns Detected commitment details or null if no commitment found
 */
export function detectCommitment(response: string): DetectedCommitment {
  if (!response || response.length < 10) {
    return {
      hasCommitment: false,
      type: 'followup',
      urgency: 'low',
      suggestedDueDate: new Date(),
    }
  }

  // Check each pattern in priority order
  for (const pattern of COMMITMENT_PATTERNS) {
    const match = response.match(pattern.regex)

    if (match) {
      const commitment: DetectedCommitment = {
        hasCommitment: true,
        type: pattern.type,
        urgency: pattern.urgency,
        suggestedDueDate: calculateDueDate(pattern.dueDays),
        matchedPattern: match[0],
        extractedDetails: extractDetails(response, match.index || 0),
      }

      logger.debug('Commitment detected in ARIA response', {
        type: commitment.type,
        urgency: commitment.urgency,
        pattern: commitment.matchedPattern,
      })

      return commitment
    }
  }

  // No commitment detected
  return {
    hasCommitment: false,
    type: 'followup',
    urgency: 'low',
    suggestedDueDate: new Date(),
  }
}

/**
 * Get a human-readable description of the commitment type
 */
export function getCommitmentDescription(type: CommitmentType): string {
  const descriptions: Record<CommitmentType, string> = {
    callback: 'Phone callback requested',
    followup: 'Follow-up needed',
    quote: 'Quote/estimate requested',
    schedule: 'Appointment scheduling needed',
    information: 'Information request',
  }
  return descriptions[type]
}

/**
 * Get the task title for a commitment
 */
export function getCommitmentTaskTitle(
  type: CommitmentType,
  contactName?: string
): string {
  const prefix: Record<CommitmentType, string> = {
    callback: 'Callback',
    followup: 'Follow up',
    quote: 'Send quote',
    schedule: 'Schedule appointment',
    information: 'Provide info',
  }

  const name = contactName || 'Customer'
  return `${prefix[type]}: ${name}`
}
