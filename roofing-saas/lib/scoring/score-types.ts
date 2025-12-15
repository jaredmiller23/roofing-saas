/**
 * Lead scoring types and definitions
 */

export type LeadScoreLevel = 'hot' | 'warm' | 'cold'

export interface LeadScore {
  total: number
  level: LeadScoreLevel
  components: ScoreComponent[]
  lastUpdated: string
}

export interface ScoreComponent {
  id: string
  name: string
  score: number
  weight: number
  contribution: number // score * weight
  reason: string
  category: ScoreCategory
}

export type ScoreCategory =
  | 'property'
  | 'financial'
  | 'timing'
  | 'engagement'
  | 'demographics'
  | 'referral'

export interface ScoringRules {
  propertyValueRanges: PropertyValueRange[]
  roofAgeMultipliers: RoofAgeMultiplier[]
  sourceWeights: SourceWeight[]
  categoryWeights: CategoryWeights
  scoreThresholds: ScoreThresholds
}

export interface PropertyValueRange {
  min: number
  max: number | null
  score: number
  label: string
}

export interface RoofAgeMultiplier {
  minAge: number
  maxAge: number | null
  multiplier: number
  label: string
}

export interface SourceWeight {
  source: string
  weight: number
  description: string
}

export interface CategoryWeights {
  property: number
  financial: number
  timing: number
  engagement: number
  demographics: number
  referral: number
}

export interface ScoreThresholds {
  hot: {
    min: number
    color: string
    description: string
  }
  warm: {
    min: number
    color: string
    description: string
  }
  cold: {
    min: number
    color: string
    description: string
  }
}

export interface LeadScoringConfig {
  rules: ScoringRules
  enabled: boolean
  autoUpdate: boolean
  lastModified: string
  modifiedBy: string
}
