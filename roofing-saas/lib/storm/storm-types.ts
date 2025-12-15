/**
 * Storm Intelligence Type Definitions
 *
 * Comprehensive type system for storm tracking, prediction, and automation.
 * Integrates with existing weather/causation infrastructure.
 */

import type { StormEventData } from '@/lib/weather/causation-generator'
import type { Contact } from '@/lib/types/contact'

// =====================================================
// CORE STORM TYPES
// =====================================================

export type StormSeverity = 'minor' | 'moderate' | 'severe' | 'extreme'
export type StormStatus = 'approaching' | 'active' | 'passed' | 'dissipated'
export type AlertLevel = 'watch' | 'warning' | 'emergency'

/**
 * Enhanced storm event with intelligence metadata
 */
export interface StormEvent extends StormEventData {
  severity: StormSeverity
  status: StormStatus
  alertLevel: AlertLevel | null
  affectedRadius: number // miles
  predictedPath?: StormPath
  confidence: number // 0-100
  nwsAlertId?: string
  createdAt: string
  updatedAt: string
}

/**
 * Storm path prediction
 */
export interface StormPath {
  coordinates: Array<{
    lat: number
    lng: number
    timestamp: string
    confidence: number
  }>
  width: number // miles
  speed: number // mph
  direction: number // degrees (0-360)
}

// =====================================================
// DAMAGE PREDICTION
// =====================================================

export type DamageLevel = 'none' | 'minor' | 'moderate' | 'severe' | 'catastrophic'

/**
 * Damage probability assessment
 */
export interface DamagePrediction {
  contactId: string
  stormEventId: string
  probability: number // 0-100
  damageLevel: DamageLevel
  estimatedDamage: number // dollars
  confidence: number // 0-100
  factors: DamageFactor[]
  calculatedAt: string
}

/**
 * Factors contributing to damage assessment
 */
export interface DamageFactor {
  type: 'proximity' | 'roof_age' | 'roof_type' | 'storm_intensity' | 'historical' | 'property_type'
  weight: number // 0-1
  value: number
  description: string
}

/**
 * Damage assessment model parameters
 */
export interface DamageModelParams {
  hailSize: number | null // inches
  windSpeed: number | null // mph
  roofAge: number | null // years
  roofType: string | null
  propertyType: string | null
  distance: number // miles from storm center
  historicalDamage: boolean
}

// =====================================================
// AFFECTED CUSTOMERS
// =====================================================

export interface AffectedCustomer {
  contact: Contact
  distance: number // miles from storm
  damagePrediction: DamagePrediction
  priority: 'low' | 'medium' | 'high' | 'urgent'
  notificationStatus: NotificationStatus
  responseStatus: ResponseStatus
}

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'opted_out'
export type ResponseStatus = 'none' | 'interested' | 'not_interested' | 'scheduled' | 'completed'

/**
 * Affected area analysis
 */
export interface AffectedAreaAnalysis {
  stormEventId: string
  totalCustomers: number
  affectedCustomers: number
  highPriorityCount: number
  estimatedRevenue: number
  coverage: {
    residential: number
    commercial: number
    byZipCode: Record<string, number>
  }
  generatedAt: string
}

// =====================================================
// STORM ALERTS & NOTIFICATIONS
// =====================================================

export type AlertType = 'storm_approaching' | 'storm_active' | 'hail_detected' | 'high_winds' | 'tornado_warning'
export type AlertPriority = 'low' | 'medium' | 'high' | 'critical'

/**
 * Storm alert definition
 */
export interface StormAlert {
  id: string
  type: AlertType
  priority: AlertPriority
  stormEvent: StormEvent
  affectedArea: {
    center: { lat: number; lng: number }
    radius: number
    zipCodes: string[]
  }
  message: string
  actionItems: string[]
  createdAt: string
  expiresAt: string | null
  acknowledgedBy: string[] // user IDs
  dismissed: boolean
}

/**
 * Notification template for storm events
 */
export interface StormNotification {
  id: string
  alertId: string
  contactId: string
  type: 'email' | 'sms' | 'push'
  template: string
  variables: Record<string, string>
  scheduledFor: string
  sentAt: string | null
  status: NotificationStatus
  response: string | null
}

// =====================================================
// STORM RESPONSE MODE
// =====================================================

export type ResponseMode = 'normal' | 'storm_watch' | 'storm_response' | 'emergency'

/**
 * Storm response configuration
 */
export interface StormResponseConfig {
  mode: ResponseMode
  activatedAt: string | null
  activatedBy: string | null // user ID
  stormEventId: string | null
  settings: {
    autoNotifications: boolean
    autoLeadGeneration: boolean
    priorityRouting: boolean
    crewPrePositioning: boolean
    extendedHours: boolean
  }
  metrics: {
    leadsGenerated: number
    customersNotified: number
    appointmentsScheduled: number
    estimatedRevenue: number
  }
}

// =====================================================
// AUTOMATION & WORKFLOWS
// =====================================================

export type WorkflowTrigger =
  | 'storm_detected'
  | 'hail_event'
  | 'storm_passed'
  | 'high_damage_probability'
  | 'customer_in_path'

export type WorkflowAction =
  | 'send_notification'
  | 'create_lead'
  | 'assign_sales_rep'
  | 'schedule_followup'
  | 'alert_crew'
  | 'update_crm'

/**
 * Storm automation workflow
 */
export interface StormWorkflow {
  id: string
  name: string
  description: string
  trigger: WorkflowTrigger
  conditions: WorkflowCondition[]
  actions: WorkflowActionConfig[]
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface WorkflowCondition {
  field: string
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains'
  value: unknown
}

export interface WorkflowActionConfig {
  type: WorkflowAction
  params: Record<string, unknown>
  delay?: number // minutes
}

// =====================================================
// HISTORICAL ANALYSIS
// =====================================================

/**
 * Historical storm data for pattern analysis
 */
export interface HistoricalStormData {
  zipCode: string
  year: number
  stormCount: number
  hailEvents: number
  averageHailSize: number
  windEvents: number
  maxWindSpeed: number
  tornadoEvents: number
  totalDamage: number
  claimsCount: number
}

/**
 * Storm pattern analysis
 */
export interface StormPattern {
  location: {
    zipCode: string
    city: string
    state: string
  }
  seasonality: {
    peakMonths: string[]
    averageEventsPerYear: number
  }
  damageProfile: {
    averageDamagePerEvent: number
    mostCommonType: string
    severityDistribution: Record<StormSeverity, number>
  }
  predictions: {
    nextStormLikelihood: number // 0-100
    estimatedDate: string | null
    confidence: number
  }
}

// =====================================================
// CREW POSITIONING
// =====================================================

/**
 * Crew pre-positioning recommendation
 */
export interface CrewPositioning {
  stormEventId: string
  recommendations: Array<{
    location: {
      city: string
      state: string
      zipCode: string
      lat: number
      lng: number
    }
    priority: number // 1-10
    estimatedLeads: number
    estimatedRevenue: number
    travelTime: number // hours
    arrivalWindow: {
      earliest: string
      latest: string
    }
    reasoning: string
  }>
  generatedAt: string
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface StormPredictionResponse {
  success: boolean
  stormEvent: StormEvent
  affectedCustomers: AffectedCustomer[]
  analysis: AffectedAreaAnalysis
  recommendations: string[]
  error?: string
}

export interface AffectedCustomersResponse {
  success: boolean
  customers: AffectedCustomer[]
  total: number
  filters: {
    minProbability?: number
    maxDistance?: number
    priority?: string[]
  }
  error?: string
}

export interface NotificationResponse {
  success: boolean
  sent: number
  failed: number
  scheduled: number
  details: Array<{
    contactId: string
    status: NotificationStatus
    message?: string
  }>
  error?: string
}

// =====================================================
// STORM INTELLIGENCE METRICS
// =====================================================

export interface StormIntelligenceMetrics {
  period: {
    start: string
    end: string
  }
  storms: {
    total: number
    active: number
    bySeverity: Record<StormSeverity, number>
  }
  leads: {
    generated: number
    converted: number
    revenue: number
  }
  notifications: {
    sent: number
    delivered: number
    responseRate: number
  }
  accuracy: {
    predictionAccuracy: number
    damageEstimateAccuracy: number
  }
}
