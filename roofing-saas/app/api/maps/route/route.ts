/**
 * Route Optimization API
 * Plan efficient routes for canvassing
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  planCanvassingRoute,
  optimizeRouteNearestNeighbor,
  splitIntoDailyRoutes,
  type RouteWaypoint,
} from '@/lib/maps/routes'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { start, waypoints, return_to_start, action } = body

    if (!start || !waypoints || !Array.isArray(waypoints)) {
      return NextResponse.json(
        { error: 'Missing required fields: start, waypoints (array)' },
        { status: 400 }
      )
    }

    // Validate start location
    if (!start.latitude || !start.longitude) {
      return NextResponse.json(
        { error: 'Start location must have latitude and longitude' },
        { status: 400 }
      )
    }

    // Validate waypoints
    for (const waypoint of waypoints) {
      if (!waypoint.latitude || !waypoint.longitude) {
        return NextResponse.json(
          { error: 'All waypoints must have latitude and longitude' },
          { status: 400 }
        )
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

      return NextResponse.json({
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

    return NextResponse.json(optimized)
  } catch (error) {
    logger.error('Route optimization API error', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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
        return NextResponse.json(
          { error: 'Missing start or waypoints parameters' },
          { status: 400 }
        )
      }

      try {
        const startLocation = JSON.parse(start) as { latitude: number; longitude: number }
        const waypointsList = JSON.parse(waypoints) as RouteWaypoint[]

        const optimized = optimizeRouteNearestNeighbor(startLocation, waypointsList)

        return NextResponse.json(optimized)
      } catch {
        return NextResponse.json(
          { error: 'Invalid JSON in start or waypoints parameters' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Provide action=nearest_neighbor parameter' },
      { status: 400 }
    )
  } catch (error) {
    logger.error('Route API error', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
