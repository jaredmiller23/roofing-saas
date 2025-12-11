/**
 * Weather Causation Generator
 *
 * Generates causation narratives for insurance claim documentation.
 * Ported from Claims Agent module for integration.
 */

export interface StormEventData {
  id: string
  event_date: string
  event_type: 'hail' | 'tornado' | 'thunderstorm_wind' | 'flood' | 'other'
  magnitude: number | null
  state: string
  county?: string
  city?: string
  latitude?: number
  longitude?: number
  path_length?: number
  path_width?: number
  property_damage?: number
  event_narrative?: string
  distance_miles?: number
}

export interface WeatherSummary {
  hail_reported: boolean
  max_hail_size: number | null
  max_wind_speed: number | null
  tornado_reported: boolean
  total_property_damage: number | null
  event_count: number
}

export interface CausationResult {
  matching_events: StormEventData[]
  weather_summary: WeatherSummary
  causation_narrative: string
  evidence_score: number
  data_quality: 'verified' | 'partial' | 'estimated'
  sources: Array<{ name: string; url: string }>
}

/**
 * Generate weather summary from storm events
 */
export function generateWeatherSummary(events: StormEventData[]): WeatherSummary {
  const hailEvents = events.filter(e => e.event_type === 'hail')
  const windEvents = events.filter(e => e.event_type === 'thunderstorm_wind')
  const tornadoEvents = events.filter(e => e.event_type === 'tornado')

  return {
    hail_reported: hailEvents.length > 0,
    max_hail_size: hailEvents.reduce((max, e) =>
      e.magnitude && e.magnitude > (max || 0) ? e.magnitude : max,
      null as number | null
    ),
    max_wind_speed: windEvents.reduce((max, e) =>
      e.magnitude && e.magnitude > (max || 0) ? e.magnitude : max,
      null as number | null
    ),
    tornado_reported: tornadoEvents.length > 0,
    total_property_damage: events.reduce((sum, e) =>
      (sum || 0) + (e.property_damage || 0),
      null as number | null
    ),
    event_count: events.length,
  }
}

/**
 * Generate causation narrative for insurance documentation
 *
 * This creates a professional narrative suitable for insurance claims
 * that establishes the relationship between storm events and property damage.
 */
export function generateCausationNarrative(
  events: StormEventData[],
  propertyAddress?: { city?: string; state?: string }
): string {
  if (events.length === 0) {
    return 'No matching storm events found for the specified location and date range. Additional weather data sources may be needed to establish causation.'
  }

  // Sort events by date and significance
  const sortedEvents = [...events].sort((a, b) => {
    // Primary sort by distance (closer is better)
    const distA = a.distance_miles || 999
    const distB = b.distance_miles || 999
    if (distA !== distB) return distA - distB
    // Secondary sort by magnitude (larger is more significant)
    const magA = a.magnitude || 0
    const magB = b.magnitude || 0
    return magB - magA
  })

  const primaryEvent = sortedEvents[0]
  const summary = generateWeatherSummary(events)

  // Build the narrative
  const parts: string[] = []

  // Opening statement
  const locationStr = propertyAddress?.city && propertyAddress?.state
    ? `${propertyAddress.city}, ${propertyAddress.state}`
    : primaryEvent.county
      ? `${primaryEvent.county} County, ${primaryEvent.state}`
      : primaryEvent.state

  parts.push(
    `On ${formatDate(primaryEvent.event_date)}, a severe weather event impacted ${locationStr}.`
  )

  // Describe the primary event
  if (primaryEvent.event_type === 'hail' && primaryEvent.magnitude) {
    parts.push(
      `Hail measuring up to ${primaryEvent.magnitude} inches in diameter was reported${
        primaryEvent.distance_miles !== undefined
          ? ` within ${primaryEvent.distance_miles.toFixed(1)} miles of the subject property`
          : ''
      }.`
    )
  } else if (primaryEvent.event_type === 'thunderstorm_wind' && primaryEvent.magnitude) {
    parts.push(
      `Damaging winds of ${primaryEvent.magnitude} mph were recorded${
        primaryEvent.distance_miles !== undefined
          ? ` within ${primaryEvent.distance_miles.toFixed(1)} miles of the subject property`
          : ''
      }.`
    )
  } else if (primaryEvent.event_type === 'tornado') {
    parts.push(
      `A tornado was confirmed${
        primaryEvent.distance_miles !== undefined
          ? ` within ${primaryEvent.distance_miles.toFixed(1)} miles of the subject property`
          : ''
      }${
        primaryEvent.path_length
          ? ` with a path length of ${primaryEvent.path_length} miles`
          : ''
      }.`
    )
  }

  // Add NOAA narrative if available
  if (primaryEvent.event_narrative) {
    parts.push(`According to NOAA records: "${primaryEvent.event_narrative}"`)
  }

  // Additional events
  if (events.length > 1) {
    const additionalTypes = new Set(sortedEvents.slice(1).map(e => e.event_type))
    const typeDescriptions = Array.from(additionalTypes).map(type => {
      const count = sortedEvents.filter(e => e.event_type === type).length
      return `${count} ${formatEventType(type)} event${count > 1 ? 's' : ''}`
    })

    if (typeDescriptions.length > 0) {
      parts.push(
        `Additional weather events in the area included ${typeDescriptions.join(', ')}.`
      )
    }
  }

  // Property damage if significant
  if (summary.total_property_damage && summary.total_property_damage > 100000) {
    parts.push(
      `These events caused an estimated $${formatCurrency(summary.total_property_damage)} in property damage in the affected area.`
    )
  }

  // Conclusion
  parts.push(
    'This documented severe weather activity establishes a direct causal link between the storm event and the damage observed at the subject property.'
  )

  return parts.join(' ')
}

/**
 * Calculate evidence score based on data quality and proximity
 */
export function calculateEvidenceScore(events: StormEventData[]): number {
  if (events.length === 0) return 0

  let score = 0

  // Base score for having any matching events
  score += 20

  // Score for event proximity (closer = better)
  const closestEvent = events.reduce((closest, e) => {
    const dist = e.distance_miles ?? 999
    const closestDist = closest?.distance_miles ?? 999
    return dist < closestDist ? e : closest
  }, events[0])

  if (closestEvent.distance_miles !== undefined) {
    if (closestEvent.distance_miles < 1) score += 30
    else if (closestEvent.distance_miles < 3) score += 25
    else if (closestEvent.distance_miles < 5) score += 20
    else if (closestEvent.distance_miles < 10) score += 15
    else score += 5
  }

  // Score for hail events with magnitude
  const hailEvents = events.filter(e => e.event_type === 'hail' && e.magnitude)
  if (hailEvents.length > 0) {
    score += 15
    const maxHail = Math.max(...hailEvents.map(e => e.magnitude || 0))
    if (maxHail >= 1.0) score += 10 // 1"+ hail is significant
    if (maxHail >= 1.75) score += 10 // 1.75"+ is very damaging
  }

  // Score for wind events with magnitude
  const windEvents = events.filter(e => e.event_type === 'thunderstorm_wind' && e.magnitude)
  if (windEvents.length > 0) {
    score += 10
    const maxWind = Math.max(...windEvents.map(e => e.magnitude || 0))
    if (maxWind >= 60) score += 5 // 60+ mph is damaging
    if (maxWind >= 75) score += 5 // 75+ mph is severe
  }

  // Score for NOAA narratives (verified data)
  const withNarratives = events.filter(e => e.event_narrative)
  if (withNarratives.length > 0) {
    score += 10
  }

  // Multiple confirming events
  if (events.length >= 2) score += 5
  if (events.length >= 3) score += 5

  return Math.min(score, 100)
}

/**
 * Determine data quality based on available information
 */
export function determineDataQuality(
  events: StormEventData[]
): 'verified' | 'partial' | 'estimated' {
  if (events.length === 0) return 'estimated'

  // Check for verified NOAA data
  const hasNOAANarrative = events.some(e => e.event_narrative)
  const hasExactCoordinates = events.some(e => e.latitude && e.longitude)
  const hasMagnitude = events.some(e => e.magnitude !== null)

  if (hasNOAANarrative && hasExactCoordinates && hasMagnitude) {
    return 'verified'
  }

  if (hasExactCoordinates || hasMagnitude) {
    return 'partial'
  }

  return 'estimated'
}

/**
 * Helper: Format date for narrative
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Helper: Format event type for display
 */
function formatEventType(type: string): string {
  const typeMap: Record<string, string> = {
    hail: 'hail',
    tornado: 'tornado',
    thunderstorm_wind: 'damaging wind',
    flood: 'flooding',
    other: 'severe weather',
  }
  return typeMap[type] || type
}

/**
 * Helper: Format currency
 */
function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)} million`
  }
  if (amount >= 1000) {
    return `${Math.round(amount / 1000)}K`
  }
  return amount.toLocaleString()
}
