/**
 * Storm Damage Predictor
 *
 * Predictive models for estimating roof damage probability and severity
 * based on storm characteristics and property attributes.
 */

import type {
  DamagePrediction,
  DamageLevel,
  DamageFactor,
  DamageModelParams,
  StormEvent,
} from './storm-types'
import type { Contact } from '@/lib/types/contact'

// =====================================================
// DAMAGE PROBABILITY CALCULATION
// =====================================================

/**
 * Calculate damage probability for a specific contact/property
 */
export function predictDamage(
  contact: Contact,
  stormEvent: StormEvent,
  distance: number
): DamagePrediction {
  const params: DamageModelParams = {
    hailSize: stormEvent.magnitude && stormEvent.event_type === 'hail' ? stormEvent.magnitude : null,
    windSpeed: stormEvent.magnitude && stormEvent.event_type === 'thunderstorm_wind' ? stormEvent.magnitude : null,
    roofAge: contact.roof_age,
    roofType: contact.roof_type,
    propertyType: contact.property_type,
    distance,
    historicalDamage: Boolean(contact.claim_number), // Has previous claim
  }

  const factors = calculateDamageFactors(params, stormEvent)
  const probability = calculateProbability(factors)
  const damageLevel = determineDamageLevel(probability, params)
  const estimatedDamage = estimateDamageCost(damageLevel, contact, params)
  const confidence = calculateConfidence(factors, params)

  return {
    contactId: contact.id,
    stormEventId: stormEvent.id,
    probability,
    damageLevel,
    estimatedDamage,
    confidence,
    factors,
    calculatedAt: new Date().toISOString(),
  }
}

/**
 * Calculate individual damage factors
 */
function calculateDamageFactors(
  params: DamageModelParams,
  stormEvent: StormEvent
): DamageFactor[] {
  const factors: DamageFactor[] = []

  // Proximity factor (most important)
  const proximityScore = calculateProximityScore(params.distance)
  factors.push({
    type: 'proximity',
    weight: 0.35,
    value: proximityScore,
    description: `Property is ${params.distance.toFixed(1)} miles from storm center`,
  })

  // Storm intensity factor
  const intensityScore = calculateIntensityScore(params, stormEvent)
  factors.push({
    type: 'storm_intensity',
    weight: 0.30,
    value: intensityScore,
    description: getIntensityDescription(params, stormEvent),
  })

  // Roof age factor
  if (params.roofAge !== null) {
    const roofAgeScore = calculateRoofAgeScore(params.roofAge)
    factors.push({
      type: 'roof_age',
      weight: 0.15,
      value: roofAgeScore,
      description: `Roof is ${params.roofAge} years old`,
    })
  }

  // Roof type factor
  if (params.roofType) {
    const roofTypeScore = calculateRoofTypeScore(params.roofType)
    factors.push({
      type: 'roof_type',
      weight: 0.10,
      value: roofTypeScore,
      description: `Roof type: ${params.roofType}`,
    })
  }

  // Property type factor
  if (params.propertyType) {
    const propertyTypeScore = calculatePropertyTypeScore(params.propertyType)
    factors.push({
      type: 'property_type',
      weight: 0.05,
      value: propertyTypeScore,
      description: `Property type: ${params.propertyType}`,
    })
  }

  // Historical damage factor
  if (params.historicalDamage) {
    factors.push({
      type: 'historical',
      weight: 0.05,
      value: 80,
      description: 'Property has previous storm damage claim',
    })
  }

  return factors
}

/**
 * Calculate proximity score (0-100)
 * Closer = higher damage probability
 */
function calculateProximityScore(distance: number): number {
  if (distance < 1) return 95
  if (distance < 3) return 85
  if (distance < 5) return 70
  if (distance < 10) return 50
  if (distance < 15) return 30
  if (distance < 25) return 15
  return 5
}

/**
 * Calculate storm intensity score (0-100)
 */
function calculateIntensityScore(
  params: DamageModelParams,
  stormEvent: StormEvent
): number {
  let score = 0

  // Hail intensity
  if (params.hailSize) {
    if (params.hailSize >= 2.75) score = 100 // Baseball or larger
    else if (params.hailSize >= 2.0) score = 90 // Golfball
    else if (params.hailSize >= 1.75) score = 80 // Walnut
    else if (params.hailSize >= 1.0) score = 60 // Quarter
    else if (params.hailSize >= 0.75) score = 40 // Penny
    else score = 20
  }

  // Wind intensity
  if (params.windSpeed) {
    if (params.windSpeed >= 100) score = Math.max(score, 100)
    else if (params.windSpeed >= 80) score = Math.max(score, 85)
    else if (params.windSpeed >= 70) score = Math.max(score, 70)
    else if (params.windSpeed >= 60) score = Math.max(score, 50)
    else if (params.windSpeed >= 50) score = Math.max(score, 30)
    else score = Math.max(score, 15)
  }

  // Tornado automatically high
  if (stormEvent.event_type === 'tornado') {
    score = Math.max(score, 90)
  }

  // Severity modifier
  const severityMultiplier: Record<string, number> = {
    extreme: 1.2,
    severe: 1.1,
    moderate: 1.0,
    minor: 0.8,
  }
  score *= severityMultiplier[stormEvent.severity] || 1.0

  return Math.min(Math.round(score), 100)
}

/**
 * Get human-readable intensity description
 */
function getIntensityDescription(
  params: DamageModelParams,
  stormEvent: StormEvent
): string {
  if (params.hailSize) {
    return `${params.hailSize}" hail detected`
  }
  if (params.windSpeed) {
    return `${params.windSpeed} mph winds`
  }
  if (stormEvent.event_type === 'tornado') {
    return 'Tornado event'
  }
  return `${stormEvent.severity} ${stormEvent.event_type}`
}

/**
 * Calculate roof age score (0-100)
 * Older roofs = higher damage probability
 */
function calculateRoofAgeScore(roofAge: number): number {
  if (roofAge >= 20) return 90
  if (roofAge >= 15) return 70
  if (roofAge >= 10) return 50
  if (roofAge >= 5) return 30
  return 15
}

/**
 * Calculate roof type vulnerability score (0-100)
 */
function calculateRoofTypeScore(roofType: string): number {
  const vulnerabilityScores: Record<string, number> = {
    'asphalt_shingle': 70, // Most vulnerable to hail
    'wood_shake': 75,
    'metal': 30, // More resistant
    'tile': 50,
    'slate': 40,
    'flat': 60,
    'composite': 65,
  }

  const normalized = roofType.toLowerCase().replace(/\s+/g, '_')
  return vulnerabilityScores[normalized] || 50
}

/**
 * Calculate property type score (0-100)
 */
function calculatePropertyTypeScore(propertyType: string): number {
  const scores: Record<string, number> = {
    'residential': 60,
    'commercial': 70, // Often larger, more exposure
    'multi_family': 65,
    'industrial': 50,
  }

  const normalized = propertyType.toLowerCase().replace(/\s+/g, '_')
  return scores[normalized] || 55
}

/**
 * Calculate overall probability from weighted factors
 */
function calculateProbability(factors: DamageFactor[]): number {
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0)
  const weightedSum = factors.reduce((sum, f) => sum + (f.value * f.weight), 0)

  return Math.round(weightedSum / totalWeight)
}

/**
 * Determine damage level from probability
 */
function determineDamageLevel(
  probability: number,
  params: DamageModelParams
): DamageLevel {
  // Adjust thresholds based on storm intensity
  const hasSignificantHail = params.hailSize && params.hailSize >= 1.5
  const hasHighWinds = params.windSpeed && params.windSpeed >= 70

  if (probability >= 85 || (hasSignificantHail && probability >= 75)) {
    return 'catastrophic'
  }
  if (probability >= 70) {
    return 'severe'
  }
  if (probability >= 50) {
    return 'moderate'
  }
  if (probability >= 25) {
    return 'minor'
  }
  return 'none'
}

/**
 * Estimate damage cost based on level and property
 */
function estimateDamageCost(
  damageLevel: DamageLevel,
  contact: Contact,
  params: DamageModelParams
): number {
  // Base costs by damage level (for average home)
  const baseCosts: Record<DamageLevel, number> = {
    none: 0,
    minor: 2500,
    moderate: 8000,
    severe: 15000,
    catastrophic: 25000,
  }

  let cost = baseCosts[damageLevel]

  // Adjust for property size
  if (contact.square_footage) {
    const sizeMultiplier = contact.square_footage / 2000 // 2000 sq ft baseline
    cost *= sizeMultiplier
  }

  // Adjust for stories
  if (contact.stories && contact.stories > 1) {
    cost *= 1.1 + (contact.stories - 1) * 0.05
  }

  // Adjust for roof type
  if (params.roofType) {
    const costMultipliers: Record<string, number> = {
      'asphalt_shingle': 1.0,
      'wood_shake': 1.3,
      'metal': 1.2,
      'tile': 1.4,
      'slate': 1.5,
      'composite': 1.1,
    }
    const normalized = params.roofType.toLowerCase().replace(/\s+/g, '_')
    cost *= costMultipliers[normalized] || 1.0
  }

  return Math.round(cost)
}

/**
 * Calculate prediction confidence (0-100)
 */
function calculateConfidence(
  factors: DamageFactor[],
  params: DamageModelParams
): number {
  let confidence = 60 // Base confidence

  // Higher confidence with more data
  if (params.roofAge !== null) confidence += 10
  if (params.roofType) confidence += 10
  if (params.hailSize !== null || params.windSpeed !== null) confidence += 10

  // Distance affects confidence
  if (params.distance < 5) confidence += 10
  else if (params.distance > 20) confidence -= 10

  // More factors = higher confidence
  if (factors.length >= 5) confidence += 5

  return Math.min(Math.max(confidence, 0), 100)
}

// =====================================================
// BATCH PREDICTION
// =====================================================

/**
 * Predict damage for multiple contacts
 */
export function predictBatchDamage(
  contacts: Contact[],
  stormEvent: StormEvent
): DamagePrediction[] {
  return contacts.map((contact) => {
    if (!contact.latitude || !contact.longitude) {
      // Skip contacts without coordinates
      return null
    }

    const distance = calculateDistance(
      contact.latitude,
      contact.longitude,
      stormEvent.latitude || 0,
      stormEvent.longitude || 0
    )

    return predictDamage(contact, stormEvent, distance)
  }).filter((p): p is DamagePrediction => p !== null)
}

/**
 * Calculate distance between two lat/lng points (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959 // Earth's radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

// =====================================================
// PRIORITY SCORING
// =====================================================

/**
 * Determine contact priority based on damage prediction
 */
export function calculatePriority(
  prediction: DamagePrediction,
  contact: Contact
): 'low' | 'medium' | 'high' | 'urgent' {
  const { probability, damageLevel, estimatedDamage } = prediction

  // Urgent: High probability + severe/catastrophic damage + high value
  if (
    probability >= 75 &&
    (damageLevel === 'severe' || damageLevel === 'catastrophic') &&
    estimatedDamage >= 15000
  ) {
    return 'urgent'
  }

  // High: High probability or severe damage
  if (probability >= 70 || damageLevel === 'severe' || damageLevel === 'catastrophic') {
    return 'high'
  }

  // Medium: Moderate probability or damage
  if (probability >= 50 || damageLevel === 'moderate') {
    return 'medium'
  }

  // Low: Everything else
  return 'low'
}
