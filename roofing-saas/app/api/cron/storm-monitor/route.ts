/**
 * Cron Job: Storm Monitor
 *
 * Polls NWS API for active severe weather alerts in the service territory.
 * Creates storm alerts in the database for hail, tornado, and high wind events.
 *
 * Integrated into daily-tasks consolidator to stay within Vercel cron limits.
 */

import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'
import { successResponse, errorResponse } from '@/lib/api/response'
import { AuthenticationError } from '@/lib/api/errors'
import {
  enhanceStormEvent,
  createStormAlert,
  analyzeAffectedArea,
} from '@/lib/storm/storm-intelligence'
import type { StormEventData } from '@/lib/weather/causation-generator'

// Service territory - Appalachian region (TN, VA, NC, KY)
const SERVICE_STATES = ['TN', 'VA', 'NC', 'KY']

// NWS alert types we care about for roofing
const RELEVANT_EVENT_TYPES = [
  'Tornado Warning',
  'Tornado Watch',
  'Severe Thunderstorm Warning',
  'Severe Thunderstorm Watch',
  'Special Weather Statement', // Often mentions hail
]

interface NWSAlert {
  id: string
  properties: {
    event: string
    headline: string
    description: string
    severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown'
    certainty: string
    urgency: string
    effective: string
    expires: string
    areaDesc: string
    geocode?: {
      UGC?: string[]
      SAME?: string[]
    }
    parameters?: {
      maxHailSize?: string[]
      maxWindGust?: string[]
      tornadoDetection?: string[]
    }
  }
  geometry?: {
    type: string
    coordinates: number[][][] | number[][]
  }
}

interface NWSAlertResponse {
  features: NWSAlert[]
}

// Verify cron secret for security
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return process.env.NODE_ENV === 'development'
  }

  return authHeader === 'Bearer ' + cronSecret
}

/**
 * Fetch active alerts from NWS API
 */
async function fetchNWSAlerts(): Promise<NWSAlert[]> {
  const alerts: NWSAlert[] = []

  for (const state of SERVICE_STATES) {
    try {
      const response = await fetch(
        `https://api.weather.gov/alerts/active?area=${state}`,
        {
          headers: {
            'User-Agent': 'RoofingSaaS/1.0 (contact@roofingsaas.com)',
            Accept: 'application/geo+json',
          },
        }
      )

      if (!response.ok) {
        logger.warn(`[Storm Monitor] NWS API error for ${state}: ${response.status}`)
        continue
      }

      const data: NWSAlertResponse = await response.json()

      // Filter for relevant event types
      const relevantAlerts = data.features.filter((alert) =>
        RELEVANT_EVENT_TYPES.some((type) =>
          alert.properties.event.includes(type.split(' ')[0])
        )
      )

      alerts.push(...relevantAlerts)
    } catch (error) {
      logger.error(`[Storm Monitor] Failed to fetch alerts for ${state}`, { error })
    }
  }

  // Deduplicate by alert ID
  const uniqueAlerts = new Map<string, NWSAlert>()
  for (const alert of alerts) {
    uniqueAlerts.set(alert.id, alert)
  }

  return Array.from(uniqueAlerts.values())
}

/**
 * Convert NWS alert to StormEventData format
 */
function convertToStormEvent(alert: NWSAlert): StormEventData {
  const props = alert.properties

  // Determine event type
  let eventType: StormEventData['event_type'] = 'other'
  if (props.event.toLowerCase().includes('tornado')) {
    eventType = 'tornado'
  } else if (props.event.toLowerCase().includes('thunderstorm')) {
    // Check for hail in description or parameters
    if (
      props.description?.toLowerCase().includes('hail') ||
      props.parameters?.maxHailSize
    ) {
      eventType = 'hail'
    } else {
      eventType = 'thunderstorm_wind'
    }
  }

  // Extract magnitude if available
  let magnitude: number | null = null
  if (props.parameters?.maxHailSize?.[0]) {
    magnitude = parseFloat(props.parameters.maxHailSize[0])
  } else if (props.parameters?.maxWindGust?.[0]) {
    magnitude = parseFloat(props.parameters.maxWindGust[0])
  }

  // Extract coordinates from geometry
  let latitude: number | undefined
  let longitude: number | undefined
  if (alert.geometry?.coordinates) {
    // Get centroid of polygon or first point
    const coords = alert.geometry.coordinates
    if (alert.geometry.type === 'Polygon' && Array.isArray(coords[0])) {
      const points = coords[0] as number[][]
      const sumLng = points.reduce((sum, p) => sum + p[0], 0)
      const sumLat = points.reduce((sum, p) => sum + p[1], 0)
      longitude = sumLng / points.length
      latitude = sumLat / points.length
    }
  }

  // Parse state from area description
  const stateMatch = props.areaDesc.match(/\b([A-Z]{2})\b/)
  const state = stateMatch?.[1] || 'TN'

  return {
    id: alert.id,
    event_date: props.effective,
    event_type: eventType,
    magnitude,
    state,
    city: props.areaDesc.split(';')[0]?.trim(),
    latitude,
    longitude,
    event_narrative: props.headline,
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Verify authorization
  if (!verifyCronSecret(request)) {
    logger.warn('[Storm Monitor] Unauthorized cron request attempt')
    return errorResponse(AuthenticationError('Unauthorized'))
  }

  logger.info('[Storm Monitor] Starting storm alert check...')

  try {
    // Fetch alerts from NWS
    const nwsAlerts = await fetchNWSAlerts()
    logger.info(`[Storm Monitor] Found ${nwsAlerts.length} relevant alerts`)

    if (nwsAlerts.length === 0) {
      return successResponse({
        message: 'No severe weather alerts in service territory',
        alertsFound: 0,
        duration: Date.now() - startTime,
      })
    }

    // Process each alert and generate our internal format
    const processedAlerts: Array<{
      id: string
      type: string
      priority: string
      message: string
      event: string
      headline: string
      area: string
    }> = []

    for (const nwsAlert of nwsAlerts) {
      try {
        // Convert to our format
        const stormEventData = convertToStormEvent(nwsAlert)
        const stormEvent = enhanceStormEvent(stormEventData, 'active')

        // Create empty analysis for now (would need contacts to populate)
        const analysis = analyzeAffectedArea(stormEvent, [])
        const alert = createStormAlert(stormEvent, analysis)

        processedAlerts.push({
          id: nwsAlert.id,
          type: alert.type,
          priority: alert.priority,
          message: alert.message,
          event: nwsAlert.properties.event,
          headline: nwsAlert.properties.headline,
          area: nwsAlert.properties.areaDesc,
        })

        logger.info(
          `[Storm Monitor] Alert: ${alert.priority.toUpperCase()} ${alert.type} - ${nwsAlert.properties.headline}`
        )
      } catch (alertError) {
        const msg = alertError instanceof Error ? alertError.message : String(alertError)
        logger.error(`[Storm Monitor] Error processing alert ${nwsAlert.id}`, { error: msg })
      }
    }

    const duration = Date.now() - startTime
    logger.info(
      `[Storm Monitor] Completed. Found ${nwsAlerts.length} alerts, Processed ${processedAlerts.length}. Duration: ${duration}ms`
    )

    // Return processed alerts for visibility
    // TODO: Store in database once tenant context is available
    return successResponse({
      message: `Storm monitor completed`,
      alertsFound: nwsAlerts.length,
      alertsProcessed: processedAlerts.length,
      alerts: processedAlerts,
      duration,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('[Storm Monitor] Fatal error', { error: errorMessage })
    return successResponse({
      message: 'Storm monitor failed',
      error: errorMessage,
      duration: Date.now() - startTime,
    })
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
