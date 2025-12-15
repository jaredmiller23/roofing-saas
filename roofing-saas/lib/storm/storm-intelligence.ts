/**
 * Storm Intelligence Core
 *
 * Main orchestration layer for storm tracking, prediction, and automation.
 * Integrates with NOAA data, damage prediction, and notification systems.
 */

import type {
  StormEvent,
  StormAlert,
  AffectedCustomer,
  AffectedAreaAnalysis,
  StormResponseConfig,
  AlertType,
  AlertPriority,
  CrewPositioning,
} from './storm-types'
import type { Contact } from '@/lib/types/contact'
import type { StormEventData } from '@/lib/weather/causation-generator'
import { predictBatchDamage, calculatePriority, calculateDistance } from './damage-predictor'

// =====================================================
// STORM EVENT ENHANCEMENT
// =====================================================

/**
 * Enhance NOAA storm data with intelligence metadata
 */
export function enhanceStormEvent(
  noaaEvent: StormEventData,
  status: StormEvent['status'] = 'active'
): StormEvent {
  const severity = determineSeverity(noaaEvent)
  const affectedRadius = calculateAffectedRadius(noaaEvent)
  const alertLevel = determineAlertLevel(noaaEvent, severity)
  const confidence = calculateEventConfidence(noaaEvent)

  return {
    ...noaaEvent,
    severity,
    status,
    alertLevel,
    affectedRadius,
    confidence,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Determine storm severity from NOAA data
 */
function determineSeverity(event: StormEventData): StormEvent['severity'] {
  // Tornado = extreme
  if (event.event_type === 'tornado') {
    return 'extreme'
  }

  // Hail severity
  if (event.event_type === 'hail' && event.magnitude) {
    if (event.magnitude >= 2.5) return 'extreme' // Baseball+
    if (event.magnitude >= 1.75) return 'severe' // Golf ball+
    if (event.magnitude >= 1.0) return 'moderate' // Quarter+
    return 'minor'
  }

  // Wind severity
  if (event.event_type === 'thunderstorm_wind' && event.magnitude) {
    if (event.magnitude >= 90) return 'extreme'
    if (event.magnitude >= 75) return 'severe'
    if (event.magnitude >= 60) return 'moderate'
    return 'minor'
  }

  // Property damage as fallback indicator
  if (event.property_damage) {
    if (event.property_damage >= 1000000) return 'extreme'
    if (event.property_damage >= 500000) return 'severe'
    if (event.property_damage >= 100000) return 'moderate'
    return 'minor'
  }

  return 'moderate'
}

/**
 * Calculate affected radius in miles
 */
function calculateAffectedRadius(event: StormEventData): number {
  // Tornado uses path width/length
  if (event.event_type === 'tornado') {
    const pathWidth = event.path_width || 0.5 // miles
    const pathLength = event.path_length || 1
    return Math.max(pathWidth * 2, pathLength)
  }

  // Hail radius based on size
  if (event.event_type === 'hail' && event.magnitude) {
    if (event.magnitude >= 2.0) return 15
    if (event.magnitude >= 1.5) return 10
    if (event.magnitude >= 1.0) return 7
    return 5
  }

  // Wind radius based on speed
  if (event.event_type === 'thunderstorm_wind' && event.magnitude) {
    if (event.magnitude >= 80) return 20
    if (event.magnitude >= 60) return 15
    return 10
  }

  return 10 // Default
}

/**
 * Determine NWS alert level
 */
function determineAlertLevel(
  event: StormEventData,
  severity: StormEvent['severity']
): StormEvent['alertLevel'] {
  if (event.event_type === 'tornado' || severity === 'extreme') {
    return 'emergency'
  }
  if (severity === 'severe') {
    return 'warning'
  }
  if (severity === 'moderate') {
    return 'watch'
  }
  return null
}

/**
 * Calculate confidence in event data quality
 */
function calculateEventConfidence(event: StormEventData): number {
  let confidence = 50

  if (event.latitude && event.longitude) confidence += 20
  if (event.magnitude !== null) confidence += 15
  if (event.event_narrative) confidence += 10
  if (event.property_damage) confidence += 5

  return Math.min(confidence, 100)
}

// =====================================================
// AFFECTED CUSTOMER ANALYSIS
// =====================================================

/**
 * Find all customers affected by a storm
 */
export function findAffectedCustomers(
  stormEvent: StormEvent,
  allContacts: Contact[],
  options: {
    maxDistance?: number
    minProbability?: number
  } = {}
): AffectedCustomer[] {
  const maxDistance = options.maxDistance || stormEvent.affectedRadius * 2
  const minProbability = options.minProbability || 25

  // Filter contacts within range
  const contactsInRange = allContacts.filter((contact) => {
    if (!contact.latitude || !contact.longitude) return false
    if (!stormEvent.latitude || !stormEvent.longitude) return false

    const distance = calculateDistance(
      contact.latitude,
      contact.longitude,
      stormEvent.latitude,
      stormEvent.longitude
    )

    return distance <= maxDistance
  })

  // Predict damage for all contacts in range
  const predictions = predictBatchDamage(contactsInRange, stormEvent)

  // Build affected customer list
  const affectedCustomers: AffectedCustomer[] = predictions
    .filter((pred) => pred.probability >= minProbability)
    .map((prediction) => {
      const contact = contactsInRange.find((c) => c.id === prediction.contactId)!
      const distance = calculateDistance(
        contact.latitude!,
        contact.longitude!,
        stormEvent.latitude || 0,
        stormEvent.longitude || 0
      )
      const priority = calculatePriority(prediction, contact)

      return {
        contact,
        distance,
        damagePrediction: prediction,
        priority,
        notificationStatus: 'pending',
        responseStatus: 'none',
      }
    })

  // Sort by priority and probability
  affectedCustomers.sort((a, b) => {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
    if (priorityDiff !== 0) return priorityDiff

    return b.damagePrediction.probability - a.damagePrediction.probability
  })

  return affectedCustomers
}

/**
 * Analyze affected area and generate statistics
 */
export function analyzeAffectedArea(
  stormEvent: StormEvent,
  affectedCustomers: AffectedCustomer[]
): AffectedAreaAnalysis {
  const coverage = {
    residential: affectedCustomers.filter((c) =>
      c.contact.property_type?.toLowerCase().includes('residential')
    ).length,
    commercial: affectedCustomers.filter((c) =>
      c.contact.property_type?.toLowerCase().includes('commercial')
    ).length,
    byZipCode: {} as Record<string, number>,
  }

  // Count by ZIP code
  affectedCustomers.forEach((c) => {
    const zip = c.contact.address_zip
    if (zip) {
      coverage.byZipCode[zip] = (coverage.byZipCode[zip] || 0) + 1
    }
  })

  const estimatedRevenue = affectedCustomers.reduce(
    (sum, c) => sum + c.damagePrediction.estimatedDamage,
    0
  )

  return {
    stormEventId: stormEvent.id,
    totalCustomers: affectedCustomers.length,
    affectedCustomers: affectedCustomers.length,
    highPriorityCount: affectedCustomers.filter((c) =>
      c.priority === 'high' || c.priority === 'urgent'
    ).length,
    estimatedRevenue,
    coverage,
    generatedAt: new Date().toISOString(),
  }
}

// =====================================================
// STORM ALERTS
// =====================================================

/**
 * Create storm alert
 */
export function createStormAlert(
  stormEvent: StormEvent,
  analysis: AffectedAreaAnalysis
): StormAlert {
  const type = determineAlertType(stormEvent)
  const priority = determineAlertPriority(stormEvent, analysis)
  const message = generateAlertMessage(stormEvent, analysis)
  const actionItems = generateActionItems(stormEvent, analysis)

  return {
    id: `alert-${stormEvent.id}-${Date.now()}`,
    type,
    priority,
    stormEvent,
    affectedArea: {
      center: {
        lat: stormEvent.latitude || 0,
        lng: stormEvent.longitude || 0,
      },
      radius: stormEvent.affectedRadius,
      zipCodes: Object.keys(analysis.coverage.byZipCode),
    },
    message,
    actionItems,
    createdAt: new Date().toISOString(),
    expiresAt: calculateExpirationTime(stormEvent),
    acknowledgedBy: [],
    dismissed: false,
  }
}

function determineAlertType(stormEvent: StormEvent): AlertType {
  if (stormEvent.event_type === 'tornado') return 'tornado_warning'
  if (stormEvent.event_type === 'hail') return 'hail_detected'
  if (stormEvent.event_type === 'thunderstorm_wind') return 'high_winds'
  if (stormEvent.status === 'approaching') return 'storm_approaching'
  return 'storm_active'
}

function determineAlertPriority(
  stormEvent: StormEvent,
  analysis: AffectedAreaAnalysis
): AlertPriority {
  if (stormEvent.alertLevel === 'emergency' || analysis.highPriorityCount >= 50) {
    return 'critical'
  }
  if (stormEvent.alertLevel === 'warning' || analysis.highPriorityCount >= 20) {
    return 'high'
  }
  if (stormEvent.alertLevel === 'watch' || analysis.highPriorityCount >= 5) {
    return 'medium'
  }
  return 'low'
}

function generateAlertMessage(
  stormEvent: StormEvent,
  analysis: AffectedAreaAnalysis
): string {
  const location = stormEvent.city ? `${stormEvent.city}, ${stormEvent.state}` : stormEvent.state
  const eventType = stormEvent.event_type.replace('_', ' ')

  let message = `${stormEvent.severity.toUpperCase()} ${eventType} detected near ${location}. `

  if (stormEvent.magnitude) {
    if (stormEvent.event_type === 'hail') {
      message += `Hail size: ${stormEvent.magnitude}". `
    } else if (stormEvent.event_type === 'thunderstorm_wind') {
      message += `Wind speed: ${stormEvent.magnitude} mph. `
    }
  }

  message += `${analysis.affectedCustomers} customers potentially affected. `
  message += `Estimated total damage: $${(analysis.estimatedRevenue / 1000).toFixed(0)}K.`

  return message
}

function generateActionItems(
  stormEvent: StormEvent,
  analysis: AffectedAreaAnalysis
): string[] {
  const items: string[] = []

  if (analysis.highPriorityCount > 0) {
    items.push(`Contact ${analysis.highPriorityCount} high-priority customers`)
  }

  if (analysis.affectedCustomers >= 10) {
    items.push('Activate storm response mode')
  }

  items.push('Review damage predictions and adjust crew scheduling')

  if (analysis.estimatedRevenue >= 100000) {
    items.push('Pre-position crews in affected areas')
  }

  items.push('Monitor storm path and update customer list')

  return items
}

function calculateExpirationTime(stormEvent: StormEvent): string {
  const expirationHours = stormEvent.severity === 'extreme' ? 48 : 24
  const expiration = new Date()
  expiration.setHours(expiration.getHours() + expirationHours)
  return expiration.toISOString()
}

// =====================================================
// CREW POSITIONING
// =====================================================

/**
 * Generate crew positioning recommendations
 */
export function generateCrewPositioning(
  stormEvent: StormEvent,
  analysis: AffectedAreaAnalysis
): CrewPositioning {
  const zipCodes = Object.entries(analysis.coverage.byZipCode)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5) // Top 5 ZIP codes

  const recommendations = zipCodes.map(([zipCode, count], index) => {
    const priority = 10 - index * 2
    const estimatedLeads = Math.round(count * 0.7) // 70% conversion estimate
    const estimatedRevenue = estimatedLeads * 12000 // $12k average job

    // Arrival window based on storm status
    const earliest = new Date()
    const latest = new Date()
    if (stormEvent.status === 'approaching') {
      earliest.setHours(earliest.getHours() + 2)
      latest.setHours(latest.getHours() + 6)
    } else if (stormEvent.status === 'active') {
      earliest.setHours(earliest.getHours() + 1)
      latest.setHours(latest.getHours() + 4)
    } else {
      latest.setHours(latest.getHours() + 2)
    }

    return {
      location: {
        city: stormEvent.city || '',
        state: stormEvent.state,
        zipCode,
        lat: stormEvent.latitude || 0,
        lng: stormEvent.longitude || 0,
      },
      priority,
      estimatedLeads,
      estimatedRevenue,
      travelTime: 2, // Placeholder - would calculate from crew location
      arrivalWindow: {
        earliest: earliest.toISOString(),
        latest: latest.toISOString(),
      },
      reasoning: `${count} affected properties, high damage probability area`,
    }
  })

  return {
    stormEventId: stormEvent.id,
    recommendations,
    generatedAt: new Date().toISOString(),
  }
}

// =====================================================
// STORM RESPONSE MODE
// =====================================================

/**
 * Activate storm response mode
 */
export function activateStormResponse(
  stormEventId: string,
  userId: string,
  settings?: Partial<StormResponseConfig['settings']>
): StormResponseConfig {
  return {
    mode: 'storm_response',
    activatedAt: new Date().toISOString(),
    activatedBy: userId,
    stormEventId,
    settings: {
      autoNotifications: settings?.autoNotifications ?? true,
      autoLeadGeneration: settings?.autoLeadGeneration ?? true,
      priorityRouting: settings?.priorityRouting ?? true,
      crewPrePositioning: settings?.crewPrePositioning ?? false,
      extendedHours: settings?.extendedHours ?? true,
    },
    metrics: {
      leadsGenerated: 0,
      customersNotified: 0,
      appointmentsScheduled: 0,
      estimatedRevenue: 0,
    },
  }
}

/**
 * Deactivate storm response mode
 */
export function deactivateStormResponse(): StormResponseConfig {
  return {
    mode: 'normal',
    activatedAt: null,
    activatedBy: null,
    stormEventId: null,
    settings: {
      autoNotifications: false,
      autoLeadGeneration: false,
      priorityRouting: false,
      crewPrePositioning: false,
      extendedHours: false,
    },
    metrics: {
      leadsGenerated: 0,
      customersNotified: 0,
      appointmentsScheduled: 0,
      estimatedRevenue: 0,
    },
  }
}
