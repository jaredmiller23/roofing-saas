/**
 * Lead scoring engine
 */

import type { Contact } from '@/lib/types/contact'
import type { LeadScore, ScoreComponent, ScoringRules } from './score-types'
import {
  DEFAULT_SCORING_RULES,
  getPropertyValueScore,
  getRoofAgeMultiplier,
  getSourceWeight,
  getLeadScoreLevel,
} from './scoring-rules'

/**
 * Calculate comprehensive lead score for a contact
 * Accepts optional custom rules — falls back to DEFAULT_SCORING_RULES
 */
export function calculateLeadScore(contact: Contact, customRules?: ScoringRules): LeadScore {
  const components: ScoreComponent[] = []
  const rules = customRules || DEFAULT_SCORING_RULES

  // 1. Property Value Score
  const propertyScore = getPropertyValueScore(contact.property_value, rules.propertyValueRanges)
  if (propertyScore > 0) {
    components.push({
      id: 'property_value',
      name: 'Property Value',
      score: propertyScore,
      weight: rules.categoryWeights.property,
      contribution: propertyScore * rules.categoryWeights.property,
      reason: `Property valued at $${contact.property_value?.toLocaleString() || 0}`,
      category: 'property',
    })
  }

  // 2. Roof Age Multiplier (applies to property score)
  const roofAgeMultiplier = getRoofAgeMultiplier(contact.roof_age, rules.roofAgeMultipliers)
  if (contact.roof_age && roofAgeMultiplier > 1) {
    const roofAgeBonus = propertyScore * (roofAgeMultiplier - 1) * rules.categoryWeights.timing
    components.push({
      id: 'roof_age',
      name: 'Roof Age',
      score: roofAgeBonus,
      weight: rules.categoryWeights.timing,
      contribution: roofAgeBonus,
      reason: `Roof is ${contact.roof_age} years old (${roofAgeMultiplier}x multiplier)`,
      category: 'timing',
    })
  }

  // 3. Source Quality
  const sourceWeight = getSourceWeight(contact.source, rules.sourceWeights)
  if (sourceWeight > 1) {
    const sourceBonus = 20 * (sourceWeight - 1) * rules.categoryWeights.referral
    components.push({
      id: 'source_quality',
      name: 'Lead Source Quality',
      score: sourceBonus,
      weight: rules.categoryWeights.referral,
      contribution: sourceBonus,
      reason: `High-quality source: ${contact.source || 'Unknown'}`,
      category: 'referral',
    })
  }

  // 4. Stage-based Engagement Score
  const stageScore = getStageEngagementScore(contact.stage)
  if (stageScore > 0) {
    components.push({
      id: 'stage_engagement',
      name: 'Engagement Level',
      score: stageScore,
      weight: rules.categoryWeights.engagement,
      contribution: stageScore * rules.categoryWeights.engagement,
      reason: `Currently in ${contact.stage} stage`,
      category: 'engagement',
    })
  }

  // 5. Insurance Information Bonus
  if (contact.insurance_carrier && contact.policy_number) {
    const insuranceBonus = 15 * rules.categoryWeights.financial
    components.push({
      id: 'insurance_info',
      name: 'Insurance Information',
      score: insuranceBonus,
      weight: rules.categoryWeights.financial,
      contribution: insuranceBonus,
      reason: 'Has complete insurance information',
      category: 'financial',
    })
  }

  // 6. Complete Contact Information Bonus
  const completenessScore = getContactCompletenessScore(contact)
  if (completenessScore > 0) {
    components.push({
      id: 'contact_completeness',
      name: 'Contact Completeness',
      score: completenessScore,
      weight: rules.categoryWeights.demographics,
      contribution: completenessScore * rules.categoryWeights.demographics,
      reason: 'Complete contact information available',
      category: 'demographics',
    })
  }

  // 7. Property Details Completeness
  const propertyDetailsScore = getPropertyDetailsScore(contact)
  if (propertyDetailsScore > 0) {
    components.push({
      id: 'property_details',
      name: 'Property Information',
      score: propertyDetailsScore,
      weight: rules.categoryWeights.property,
      contribution: propertyDetailsScore * rules.categoryWeights.property,
      reason: 'Detailed property information available',
      category: 'property',
    })
  }

  // Calculate total score
  const total = Math.round(components.reduce((sum, comp) => sum + comp.contribution, 0))

  // Determine score level
  const level = getLeadScoreLevel(total)

  return {
    total,
    level,
    components,
    lastUpdated: new Date().toISOString(),
  }
}

/**
 * Get engagement score based on contact stage
 */
function getStageEngagementScore(stage: string): number {
  const stageScores: Record<string, number> = {
    new: 10,
    contacted: 20,
    qualified: 35,
    proposal: 45,
    negotiation: 50,
    won: 60,
    lost: 0,
  }

  return stageScores[stage] || 10
}

/**
 * Calculate contact completeness score
 */
function getContactCompletenessScore(contact: Contact): number {
  let score = 0
  const fields = [
    contact.email,
    contact.phone || contact.mobile_phone,
    contact.address_street,
    contact.address_city,
    contact.address_state,
  ]

  const completedFields = fields.filter(Boolean).length
  const totalFields = fields.length

  score = (completedFields / totalFields) * 20 // Max 20 points

  return Math.round(score)
}

/**
 * Calculate property details score
 */
function getPropertyDetailsScore(contact: Contact): number {
  let score = 0
  const fields = [
    contact.property_type,
    contact.roof_type,
    contact.roof_age,
    contact.square_footage,
    contact.stories,
  ]

  const completedFields = fields.filter(field => field !== null && field !== undefined && field !== '').length
  const totalFields = fields.length

  score = (completedFields / totalFields) * 15 // Max 15 points

  return Math.round(score)
}

/**
 * Update lead score for a contact (used by API)
 */
export async function updateContactLeadScore(_contactId: string): Promise<LeadScore> {
  // This would typically fetch the contact from the database
  // For now, we'll return a placeholder implementation
  throw new Error('updateContactLeadScore not implemented - requires database integration')
}

/**
 * Batch update lead scores for multiple contacts
 */
export async function batchUpdateLeadScores(_contactIds: string[]): Promise<Map<string, LeadScore>> {
  const results = new Map<string, LeadScore>()
  
  // This would typically process contacts in batches
  // For now, we'll return a placeholder implementation
  throw new Error('batchUpdateLeadScores not implemented - requires database integration')
  
  return results
}

/**
 * Get scoring explanation for a contact
 */
export function getScoreExplanation(contact: Contact): string {
  const score = calculateLeadScore(contact)
  
  const explanations = score.components.map(comp => 
    `${comp.name}: +${Math.round(comp.contribution)} (${comp.reason})`
  )

  return `Total Score: ${score.total}/100 (${score.level.toUpperCase()})\n\n` +
         explanations.join('\n')
}
