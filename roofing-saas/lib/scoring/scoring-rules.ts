/**
 * Default scoring rules and configuration
 */

import type { ScoringRules, ScoreThresholds, PropertyValueRange, RoofAgeMultiplier, SourceWeight } from './score-types'

export const DEFAULT_SCORING_RULES: ScoringRules = {
  propertyValueRanges: [
    { min: 0, max: 150000, score: 10, label: 'Low Value ($0-$150k)' },
    { min: 150000, max: 300000, score: 25, label: 'Medium Value ($150k-$300k)' },
    { min: 300000, max: 500000, score: 40, label: 'High Value ($300k-$500k)' },
    { min: 500000, max: null, score: 50, label: 'Premium Value ($500k+)' },
  ],

  roofAgeMultipliers: [
    { minAge: 0, maxAge: 5, multiplier: 0.5, label: 'Very New (0-5 years)' },
    { minAge: 6, maxAge: 10, multiplier: 0.8, label: 'New (6-10 years)' },
    { minAge: 11, maxAge: 15, multiplier: 1.0, label: 'Good (11-15 years)' },
    { minAge: 16, maxAge: 20, multiplier: 1.5, label: 'Prime (16-20 years)' },
    { minAge: 21, maxAge: 25, multiplier: 1.8, label: 'Aging (21-25 years)' },
    { minAge: 26, maxAge: null, multiplier: 2.0, label: 'Old (26+ years)' },
  ],

  sourceWeights: [
    { source: 'referral', weight: 2.0, description: 'Customer or partner referral' },
    { source: 'door_knocking', weight: 1.5, description: 'Direct door-to-door contact' },
    { source: 'storm_damage', weight: 1.8, description: 'Storm damage inquiry' },
    { source: 'insurance_claim', weight: 1.7, description: 'Insurance claim related' },
    { source: 'website', weight: 1.2, description: 'Website form submission' },
    { source: 'phone_call', weight: 1.4, description: 'Inbound phone call' },
    { source: 'social_media', weight: 1.0, description: 'Social media contact' },
    { source: 'advertisement', weight: 0.8, description: 'Advertisement response' },
    { source: 'other', weight: 1.0, description: 'Other or unspecified source' },
  ],

  categoryWeights: {
    property: 0.30,    // 30% - Property characteristics
    financial: 0.25,   // 25% - Financial indicators
    timing: 0.20,      // 20% - Timing and urgency
    engagement: 0.15,  // 15% - Response and engagement
    demographics: 0.05, // 5% - Demographics
    referral: 0.05,    // 5% - Referral quality
  },

  scoreThresholds: {
    hot: {
      min: 75,
      color: 'red',
      description: 'High-priority leads requiring immediate attention',
    },
    warm: {
      min: 50,
      color: 'orange', 
      description: 'Qualified leads with good potential',
    },
    cold: {
      min: 0,
      color: 'blue',
      description: 'Low-priority leads for long-term nurturing',
    },
  },
}

export const SCORE_THRESHOLDS: ScoreThresholds = DEFAULT_SCORING_RULES.scoreThresholds

/**
 * Get scoring rule by property value
 */
export function getPropertyValueScore(propertyValue: number | null, customRanges?: PropertyValueRange[]): number {
  if (!propertyValue || propertyValue <= 0) return 0

  const ranges = customRanges || DEFAULT_SCORING_RULES.propertyValueRanges
  const range = ranges.find(
    (r) => propertyValue >= r.min && (r.max === null || propertyValue <= r.max)
  )

  return range?.score || 0
}

/**
 * Get roof age multiplier
 */
export function getRoofAgeMultiplier(roofAge: number | null, customMultipliers?: RoofAgeMultiplier[]): number {
  if (!roofAge || roofAge < 0) return 1.0

  const multipliers = customMultipliers || DEFAULT_SCORING_RULES.roofAgeMultipliers
  const multiplier = multipliers.find(
    (mult) => roofAge >= mult.minAge && (mult.maxAge === null || roofAge <= mult.maxAge)
  )

  return multiplier?.multiplier || 1.0
}

/**
 * Get source weight
 */
export function getSourceWeight(source: string | null, customWeights?: SourceWeight[]): number {
  if (!source) return 1.0

  const weights = customWeights || DEFAULT_SCORING_RULES.sourceWeights
  const sourceKey = source.toLowerCase().replace(/\s+/g, '_')
  const sourceWeight = weights.find(
    (weight) => weight.source === sourceKey
  )

  return sourceWeight?.weight || 1.0
}

/**
 * Determine lead score level based on total score
 */
export function getLeadScoreLevel(totalScore: number): 'hot' | 'warm' | 'cold' {
  if (totalScore >= SCORE_THRESHOLDS.hot.min) return 'hot'
  if (totalScore >= SCORE_THRESHOLDS.warm.min) return 'warm'
  return 'cold'
}

/**
 * Get color for score level
 */
export function getScoreLevelColor(level: 'hot' | 'warm' | 'cold'): string {
  return SCORE_THRESHOLDS[level].color
}

/**
 * Get CSS classes for score level
 */
export function getScoreLevelStyles(level: 'hot' | 'warm' | 'cold'): {
  bg: string
  text: string
  border: string
} {
  switch (level) {
    case 'hot':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-300',
      }
    case 'warm':
      return {
        bg: 'bg-orange-100', 
        text: 'text-orange-800',
        border: 'border-orange-300',
      }
    case 'cold':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800', 
        border: 'border-blue-300',
      }
  }
}
