/* eslint-disable */
/**
 * AR Damage Classification System
 * AI-assisted damage detection and severity assessment
 */

import { DamageType, DamageSeverity, DamageClassificationResult, DamageMarker, ARPoint } from './ar-types'

export class DamageClassifier {
  private damageDatabase: DamageDatabase
  private costEstimates: CostEstimateDatabase

  constructor() {
    this.damageDatabase = new DamageDatabase()
    this.costEstimates = new CostEstimateDatabase()
  }

  /**
   * Classify damage from image data or user input
   */
  classifyDamage(
    imageData?: ImageData,
    userDescription?: string,
    area?: number
  ): DamageClassificationResult {
    // For now, implement rule-based classification
    // In production, this would use AI/ML models
    
    let type = DamageType.OTHER
    let severity = DamageSeverity.MINOR
    let confidence = 0.5

    // Classify based on user description
    if (userDescription) {
      const result = this.classifyFromDescription(userDescription)
      type = result.type
      severity = result.severity
      confidence = result.confidence
    }

    // Adjust severity based on area
    if (area) {
      severity = this.adjustSeverityByArea(type, severity, area)
    }

    const costRange = this.estimateCost(type, severity, area || 1)
    const suggestedAction = this.getSuggestedAction(type, severity)

    return {
      type,
      severity,
      confidence,
      suggested_action: suggestedAction,
      estimated_cost_range: costRange
    }
  }

  /**
   * Create damage marker from classification
   */
  createDamageMarker(
    position: ARPoint,
    classification: DamageClassificationResult,
    description: string
  ): DamageMarker {
    return {
      id: this.generateId(),
      position,
      type: classification.type,
      severity: classification.severity,
      description,
      measurements: [],
      photos: [],
      created_at: new Date().toISOString()
    }
  }

  /**
   * Analyze damage pattern across multiple markers
   */
  analyzeDamagePattern(markers: DamageMarker[]): {
    primary_cause: string
    total_affected_area: number
    severity_distribution: Record<DamageSeverity, number>
    recommended_actions: string[]
  } {
    const severityCount: Record<DamageSeverity, number> = {
      [DamageSeverity.MINOR]: 0,
      [DamageSeverity.MODERATE]: 0,
      [DamageSeverity.SEVERE]: 0,
      [DamageSeverity.CRITICAL]: 0
    }

    const typeCount: Record<DamageType, number> = {} as Record<DamageType, number>
    let totalArea = 0

    markers.forEach(marker => {
      severityCount[marker.severity]++
      typeCount[marker.type] = (typeCount[marker.type] || 0) + 1
      
      // Estimate area from measurements
      const areaMeasurements = marker.measurements.filter(m => m.type === 'area')
      if (areaMeasurements.length > 0) {
        totalArea += areaMeasurements.reduce((sum, m) => sum + m.value, 0)
      } else {
        // Estimate 1 sq ft per marker if no area measurement
        totalArea += 1
      }
    })

    // Determine primary cause
    const primaryType = Object.entries(typeCount).reduce((a, b) => 
      typeCount[a[0] as DamageType] > typeCount[b[0] as DamageType] ? a : b
    )[0] as DamageType

    const primaryCause = this.getPrimaryCause(primaryType, markers)
    const recommendedActions = this.getPatternRecommendations(severityCount, typeCount, totalArea)

    return {
      primary_cause: primaryCause,
      total_affected_area: totalArea,
      severity_distribution: severityCount,
      recommended_actions: recommendedActions
    }
  }

  /**
   * Classify damage from text description
   */
  private classifyFromDescription(description: string): {
    type: DamageType
    severity: DamageSeverity
    confidence: number
  } {
    const desc = description.toLowerCase()
    
    // Missing shingles
    if (desc.includes('missing') && desc.includes('shingle')) {
      return {
        type: DamageType.MISSING_SHINGLES,
        severity: desc.includes('multiple') || desc.includes('many') ? 
          DamageSeverity.MODERATE : DamageSeverity.MINOR,
        confidence: 0.85
      }
    }
    
    // Cracked shingles
    if (desc.includes('crack') && desc.includes('shingle')) {
      return {
        type: DamageType.CRACKED_SHINGLES,
        severity: desc.includes('large') || desc.includes('deep') ? 
          DamageSeverity.MODERATE : DamageSeverity.MINOR,
        confidence: 0.80
      }
    }
    
    // Hail damage
    if (desc.includes('hail') || desc.includes('dent') || desc.includes('impact')) {
      return {
        type: DamageType.HAIL_DAMAGE,
        severity: desc.includes('severe') || desc.includes('extensive') ? 
          DamageSeverity.SEVERE : DamageSeverity.MODERATE,
        confidence: 0.75
      }
    }
    
    // Wind damage
    if (desc.includes('wind') || desc.includes('lift') || desc.includes('blown')) {
      return {
        type: DamageType.WIND_DAMAGE,
        severity: desc.includes('entire') || desc.includes('section') ? 
          DamageSeverity.SEVERE : DamageSeverity.MODERATE,
        confidence: 0.80
      }
    }
    
    // Flashing damage
    if (desc.includes('flashing')) {
      return {
        type: DamageType.FLASHING_DAMAGE,
        severity: desc.includes('loose') || desc.includes('separated') ? 
          DamageSeverity.MODERATE : DamageSeverity.MINOR,
        confidence: 0.85
      }
    }
    
    // Default to other with low confidence
    return {
      type: DamageType.OTHER,
      severity: DamageSeverity.MINOR,
      confidence: 0.40
    }
  }

  /**
   * Adjust severity based on affected area
   */
  private adjustSeverityByArea(
    type: DamageType,
    baseSeverity: DamageSeverity,
    area: number
  ): DamageSeverity {
    // Area thresholds in square feet
    const thresholds: Record<DamageType, { moderate: number; severe: number; critical: number }> = {
      [DamageType.MISSING_SHINGLES]: { moderate: 10, severe: 50, critical: 200 },
      [DamageType.HAIL_DAMAGE]: { moderate: 25, severe: 100, critical: 500 },
      [DamageType.WIND_DAMAGE]: { moderate: 20, severe: 100, critical: 400 },
      [DamageType.CRACKED_SHINGLES]: { moderate: 15, severe: 75, critical: 300 },
      [DamageType.GRANULE_LOSS]: { moderate: 30, severe: 150, critical: 600 },
      [DamageType.FLASHING_DAMAGE]: { moderate: 5, severe: 25, critical: 100 },
      [DamageType.GUTTER_DAMAGE]: { moderate: 10, severe: 50, critical: 200 },
      [DamageType.PENETRATION]: { moderate: 1, severe: 5, critical: 20 },
      [DamageType.STRUCTURAL]: { moderate: 5, severe: 25, critical: 100 },
      [DamageType.DEBRIS]: { moderate: 20, severe: 100, critical: 400 },
      [DamageType.OTHER]: { moderate: 15, severe: 75, critical: 300 }
    }

    const threshold = thresholds[type] || { moderate: 15, severe: 75, critical: 300 }

    if (area >= threshold.critical) return DamageSeverity.CRITICAL
    if (area >= threshold.severe) return DamageSeverity.SEVERE
    if (area >= threshold.moderate) return DamageSeverity.MODERATE
    
    return baseSeverity
  }

  /**
   * Estimate repair cost
   */
  private estimateCost(
    type: DamageType,
    severity: DamageSeverity,
    area: number
  ): [number, number] {
    const baseCosts = this.costEstimates.getBaseCost(type, severity)
    const multiplier = this.costEstimates.getAreaMultiplier(area)
    
    return [
      Math.round(baseCosts[0] * multiplier),
      Math.round(baseCosts[1] * multiplier)
    ]
  }

  /**
   * Get suggested action for damage
   */
  private getSuggestedAction(type: DamageType, severity: DamageSeverity): string {
    const actions: Partial<Record<DamageType, Record<DamageSeverity, string>>> = {
      [DamageType.MISSING_SHINGLES]: {
        [DamageSeverity.MINOR]: 'Replace missing shingles and inspect surrounding area',
        [DamageSeverity.MODERATE]: 'Replace shingles and check underlying deck',
        [DamageSeverity.SEVERE]: 'Section replacement and deck inspection required',
        [DamageSeverity.CRITICAL]: 'Major roof replacement needed'
      },
      [DamageType.HAIL_DAMAGE]: {
        [DamageSeverity.MINOR]: 'Monitor for leaks, consider insurance claim',
        [DamageSeverity.MODERATE]: 'File insurance claim, plan roof replacement',
        [DamageSeverity.SEVERE]: 'Immediate insurance claim and roof replacement',
        [DamageSeverity.CRITICAL]: 'Emergency repairs needed, full replacement'
      }
    }

    return actions[type]?.[severity] || 'Assess damage and determine appropriate repair method'
  }

  private getPrimaryCause(primaryType: DamageType, markers: DamageMarker[]): string {
    // Analyze patterns to determine likely cause
    const causes: Partial<Record<DamageType, string>> = {
      [DamageType.HAIL_DAMAGE]: 'Hail storm impact',
      [DamageType.WIND_DAMAGE]: 'High wind event',
      [DamageType.MISSING_SHINGLES]: 'Weather-related deterioration',
      [DamageType.CRACKED_SHINGLES]: 'Age and weather exposure'
    }

    return causes[primaryType] || 'General weather damage'
  }

  private getPatternRecommendations(
    severityCount: Record<DamageSeverity, number>,
    typeCount: Record<DamageType, number>,
    totalArea: number
  ): string[] {
    const recommendations: string[] = []

    if (severityCount[DamageSeverity.CRITICAL] > 0) {
      recommendations.push('Emergency repairs required to prevent further damage')
    }

    if (totalArea > 500) {
      recommendations.push('Consider full roof replacement due to extensive damage')
    } else if (totalArea > 100) {
      recommendations.push('Section replacement may be more cost-effective than spot repairs')
    }

    if (typeCount[DamageType.HAIL_DAMAGE] > 5) {
      recommendations.push('Document all damage for comprehensive insurance claim')
    }

    return recommendations
  }

  private generateId(): string {
    return 'damage_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }
}

class DamageDatabase {
  // Database of damage types and characteristics
  // In production, this would be loaded from external data
}

class CostEstimateDatabase {
  getBaseCost(type: DamageType, severity: DamageSeverity): [number, number] {
    // Cost per square foot in dollars [min, max]
    const costs: Partial<Record<DamageType, Record<DamageSeverity, [number, number]>>> = {
      [DamageType.MISSING_SHINGLES]: {
        [DamageSeverity.MINOR]: [8, 12],
        [DamageSeverity.MODERATE]: [12, 18],
        [DamageSeverity.SEVERE]: [18, 25],
        [DamageSeverity.CRITICAL]: [25, 35]
      },
      [DamageType.HAIL_DAMAGE]: {
        [DamageSeverity.MINOR]: [10, 15],
        [DamageSeverity.MODERATE]: [15, 22],
        [DamageSeverity.SEVERE]: [22, 30],
        [DamageSeverity.CRITICAL]: [30, 40]
      }
    }

    return costs[type]?.[severity] || [10, 20]
  }

  getAreaMultiplier(area: number): number {
    // Economies of scale for larger areas
    if (area > 1000) return 0.85
    if (area > 500) return 0.90
    if (area > 100) return 0.95
    return 1.0
  }
}

export const damageClassifier = new DamageClassifier()
