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
 * Patterns that indicate an OFFER/QUESTION (not a commitment)
 * These should NOT trigger task creation - ARIA is asking, not promising
 */
const OFFER_PATTERNS: RegExp[] = [
  /would you (?:like|prefer|want)/i,
  /do you (?:want|need|prefer)/i,
  /can i (?:have someone|arrange|schedule)/i,
  /shall i (?:have someone|arrange|schedule)/i,
  /would (?:a call|that) work/i,
  /or would you (?:prefer|rather)/i,
  /\?$/, // Ends with question mark
]

/**
 * Patterns ordered by priority - first match wins
 * These match CONFIRMED commitments (after customer consent)
 */
const COMMITMENT_PATTERNS: CommitmentPattern[] = [
  // HIGH PRIORITY - Confirmed Callback (due same day)
  // These patterns indicate ARIA has confirmed an action, not just offered
  {
    // "Great! I'll arrange a callback" or "I'll have someone call you"
    regex: /(?:great|perfect|absolutely|sure|okay|yes)[\s!,]*(?:i'll|i will|let me)\s*(?:arrange|have someone|get someone)/i,
    type: 'callback',
    urgency: 'high',
    dueDays: 0,
  },
  {
    // "I'm arranging a callback" or "I've scheduled someone to call"
    regex: /(?:i'm|i am|i've|i have)\s*(?:arranging|scheduling|setting up|having someone)/i,
    type: 'callback',
    urgency: 'high',
    dueDays: 0,
  },
  {
    // "Someone will call you shortly" (after customer confirmed they want this)
    regex: /(?:someone|a team member)\s*will\s*(?:call|contact|reach out).*(?:shortly|soon|today|right away)/i,
    type: 'callback',
    urgency: 'high',
    dueDays: 0,
  },

  // MEDIUM PRIORITY - Confirmed Quote (due next business day)
  {
    regex: /(?:great|perfect|absolutely)[\s!,]*(?:i'll|let me)\s*(?:send|prepare|get)\s*(?:you\s*)?(?:a|that)\s*quote/i,
    type: 'quote',
    urgency: 'medium',
    dueDays: 1,
  },
  {
    regex: /(?:i'm|i am)\s*(?:sending|preparing|putting together)\s*(?:a|your)\s*(?:quote|estimate)/i,
    type: 'quote',
    urgency: 'medium',
    dueDays: 1,
  },

  // MEDIUM PRIORITY - Confirmed Schedule (due next business day)
  {
    regex: /(?:great|perfect|absolutely)[\s!,]*(?:i'll|let me)\s*(?:schedule|set up|book|arrange)\s*(?:that|an?)/i,
    type: 'schedule',
    urgency: 'medium',
    dueDays: 1,
  },
  {
    regex: /(?:i'm|i am)\s*(?:scheduling|setting up|booking|arranging)\s*(?:that|an?|your)/i,
    type: 'schedule',
    urgency: 'medium',
    dueDays: 1,
  },

  // LOW PRIORITY - Confirmed Follow-up (due in 2 days)
  {
    regex: /(?:great|perfect|absolutely)[\s!,]*(?:i'll|let me)\s*(?:follow up|get back|check on)/i,
    type: 'followup',
    urgency: 'low',
    dueDays: 2,
  },
  {
    regex: /(?:i'll|i will)\s*(?:make sure|ensure)\s*(?:someone|we)\s*(?:follows up|gets back)/i,
    type: 'followup',
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
 * Only detects CONFIRMED commitments (after customer consent).
 * Offers/questions like "Would you like someone to call you?" are NOT commitments.
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

  // First, check if this is an OFFER/QUESTION (not a commitment)
  // ARIA asking "Would you like a callback?" is NOT a commitment
  for (const offerPattern of OFFER_PATTERNS) {
    if (offerPattern.test(response)) {
      logger.debug('Response is an offer/question, not a commitment', {
        response: response.slice(0, 100),
        matchedPattern: offerPattern.source,
      })
      return {
        hasCommitment: false,
        type: 'followup',
        urgency: 'low',
        suggestedDueDate: new Date(),
      }
    }
  }

  // Check each commitment pattern in priority order
  // These only match CONFIRMED actions (after customer said yes)
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
