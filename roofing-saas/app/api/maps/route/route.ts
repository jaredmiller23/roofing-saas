/**
 * Route Optimization API
 * Plan efficient routes for canvassing
 */

import { NextRequest } from 'next/server'
import {
  planCanvassingRoute,
  optimizeRouteNearestNeighbor,
  splitIntoDailyRoutes,
  type RouteWaypoint,
} from '@/lib/maps/routes'
import { logger } from '@/lib/logger'
import { ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { start, waypoints, return_to_start, action } = body

    if (!start || !waypoints || !Array.isArray(waypoints)) {
      throw ValidationError('Missing required fields: start, waypoints (array)')
    }

    // Validate start location
    if (!start.latitude || !start.longitude) {
      throw ValidationError('Start location must have latitude and longitude')
    }

    // Validate waypoints
    for (const waypoint of waypoints) {
      if (!waypoint.latitude || !waypoint.longitude) {
        throw ValidationError('All waypoints must have latitude and longitude')
      }
    }

    // Split into daily routes
    if (action === 'split_daily') {
      const { max_stops_per_day, max_distance_per_day } = body
      const dailyRoutes = splitIntoDailyRoutes(
        waypoints,
        max_stops_per_day || 50,
        max_distance_per_day || 50000
      )

      return successResponse({
        daily_routes: dailyRoutes,
        total_days: dailyRoutes.length,
      })
    }

    // Optimize single route
    const optimized = await planCanvassingRoute(
      start,
      waypoints,
      return_to_start !== false // Default to true
    )

    return successResponse(optimized)
  } catch (error) {
    logger.error('Route optimization API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')

    // Get simple nearest neighbor route (no API key required)
    if (action === 'nearest_neighbor') {
      const start = searchParams.get('start')
      const waypoints = searchParams.get('waypoints')

      if (!start || !waypoints) {
        throw ValidationError('Missing start or waypoints parameters')
      }

      try {
        const startLocation = JSON.parse(start) as { latitude: number; longitude: number }
        const waypointsList = JSON.parse(waypoints) as RouteWaypoint[]

        const optimized = optimizeRouteNearestNeighbor(startLocation, waypointsList)

        return successResponse(optimized)
      } catch {
        throw ValidationError('Invalid JSON in start or waypoints parameters')
      }
    }

    throw ValidationError('Provide action=nearest_neighbor parameter')
  } catch (error) {
    logger.error('Route API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
