/**
 * Storm Data Causation API
 *
 * Query storm events near a property location to establish weather causation
 * for insurance claim documentation.
 *
 * GET /api/storm-data/causation?lat={lat}&lng={lng}&date={date}&radius_miles={5}
 *
 * Returns matching storm events, weather summary, causation narrative,
 * and evidence score for claim documentation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { AuthenticationError, ValidationError, InternalError } from '@/lib/api/errors'
import { errorResponse } from '@/lib/api/response'
import {
  type StormEventData,
  type CausationResult,
  generateWeatherSummary,
  generateCausationNarrative,
  calculateEvidenceScore,
  determineDataQuality,
} from '@/lib/weather/causation-generator'

// Conversion: 1 mile = 1609.34 meters
const METERS_PER_MILE = 1609.34

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw AuthenticationError()
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const date = searchParams.get('date')
    const radiusMiles = parseFloat(searchParams.get('radius_miles') || '5')
    const daysRange = parseInt(searchParams.get('days_range') || '7', 10)

    // Validate required parameters
    if (!lat || !lng) {
      throw ValidationError('lat and lng parameters are required')
    }

    const latitude = parseFloat(lat)
    const longitude = parseFloat(lng)

    if (isNaN(latitude) || isNaN(longitude)) {
      throw ValidationError('Invalid latitude or longitude')
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw ValidationError('Latitude must be -90 to 90, longitude must be -180 to 180')
    }

    if (radiusMiles < 0.1 || radiusMiles > 50) {
      throw ValidationError('radius_miles must be between 0.1 and 50')
    }

    // Calculate date range
    let startDate: Date
    let endDate: Date

    if (date) {
      const baseDate = new Date(date)
      if (isNaN(baseDate.getTime())) {
        throw ValidationError('Invalid date format. Use YYYY-MM-DD')
      }
      // Look for events within the days_range before and after the date
      startDate = new Date(baseDate)
      startDate.setDate(startDate.getDate() - daysRange)
      endDate = new Date(baseDate)
      endDate.setDate(endDate.getDate() + daysRange)
    } else {
      // Default: last 30 days
      endDate = new Date()
      startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
    }

    // Convert radius to meters
    const radiusMeters = radiusMiles * METERS_PER_MILE

    // Query storm events within radius using PostGIS
    // We use ST_DWithin for spatial filtering and ST_Distance for distance calculation
    const { data: events, error } = await supabase.rpc('find_storm_events_near_point', {
      p_lat: latitude,
      p_lng: longitude,
      p_radius_meters: radiusMeters,
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: endDate.toISOString().split('T')[0],
    })

    if (error) {
      // If the RPC doesn't exist yet, fall back to a simpler query
      logger.warn('RPC not available, using fallback query', { error: error.message })

      // Fallback: Query by county/state and date (less precise but works without PostGIS RPC)
      const { data: fallbackEvents, error: fallbackError } = await supabase
        .from('storm_events')
        .select('*')
        .gte('event_date', startDate.toISOString().split('T')[0])
        .lte('event_date', endDate.toISOString().split('T')[0])
        .eq('state', 'TN') // Default to Tennessee
        .order('event_date', { ascending: false })
        .limit(20)

      if (fallbackError) {
        logger.error('Storm events query failed', { error: fallbackError })
        throw InternalError('Failed to query storm events')
      }

      // Calculate approximate distances for fallback events
      const eventsWithDistance: StormEventData[] = (fallbackEvents || []).map(event => ({
        id: event.id,
        event_date: event.event_date,
        event_type: event.event_type,
        magnitude: event.magnitude,
        state: event.state,
        county: event.county,
        city: event.city,
        latitude: event.latitude,
        longitude: event.longitude,
        path_length: event.path_length,
        path_width: event.path_width,
        property_damage: event.property_damage,
        event_narrative: event.event_narrative,
        distance_miles: event.latitude && event.longitude
          ? haversineDistance(latitude, longitude, event.latitude, event.longitude)
          : undefined,
      }))

      // Filter by radius
      const nearbyEvents = eventsWithDistance.filter(
        e => e.distance_miles === undefined || e.distance_miles <= radiusMiles
      )

      return buildCausationResponse(nearbyEvents, { latitude, longitude })
    }

    // Map RPC results to StormEventData
    const stormEvents: StormEventData[] = (events || []).map((event: Record<string, unknown>) => ({
      id: event.id as string,
      event_date: event.event_date as string,
      event_type: event.event_type as StormEventData['event_type'],
      magnitude: event.magnitude as number | null,
      state: event.state as string,
      county: event.county as string | undefined,
      city: event.city as string | undefined,
      latitude: event.latitude as number | undefined,
      longitude: event.longitude as number | undefined,
      path_length: event.path_length as number | undefined,
      path_width: event.path_width as number | undefined,
      property_damage: event.property_damage as number | undefined,
      event_narrative: event.event_narrative as string | undefined,
      distance_miles: (event.distance_meters as number) / METERS_PER_MILE,
    }))

    return buildCausationResponse(stormEvents, { latitude, longitude })
  } catch (error) {
    logger.error('Storm data causation API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * Build the causation response from storm events
 */
function buildCausationResponse(
  events: StormEventData[],
  _property: { latitude: number; longitude: number }
): NextResponse {
  // Sort by distance (closest first), then by magnitude (largest first)
  const sortedEvents = [...events].sort((a, b) => {
    const distA = a.distance_miles ?? 999
    const distB = b.distance_miles ?? 999
    if (distA !== distB) return distA - distB
    const magA = a.magnitude ?? 0
    const magB = b.magnitude ?? 0
    return magB - magA
  })

  const weatherSummary = generateWeatherSummary(sortedEvents)
  const causationNarrative = generateCausationNarrative(sortedEvents)
  const evidenceScore = calculateEvidenceScore(sortedEvents)
  const dataQuality = determineDataQuality(sortedEvents)

  const response: CausationResult = {
    matching_events: sortedEvents,
    weather_summary: weatherSummary,
    causation_narrative: causationNarrative,
    evidence_score: evidenceScore,
    data_quality: dataQuality,
    sources: [
      {
        name: 'NOAA Storm Events Database',
        url: 'https://www.ncdc.noaa.gov/stormevents/',
      },
      {
        name: 'National Weather Service',
        url: 'https://www.weather.gov/',
      },
    ],
  }

  return NextResponse.json({
    success: true,
    data: response,
  })
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in miles
 */
function haversineDistance(
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
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}
