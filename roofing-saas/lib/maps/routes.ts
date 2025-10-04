/**
 * Route Optimization Service
 * Plan efficient routes for canvassing using Google Maps Directions API
 */

import { logger } from '@/lib/logger'
import { calculateDistance } from './geocoding'

export interface RouteWaypoint {
  id: string
  latitude: number
  longitude: number
  address: string
  name?: string
}

export interface OptimizedRoute {
  waypoints: RouteWaypoint[]
  total_distance_meters: number
  total_duration_minutes: number
  optimized_order: number[]
}

export interface DirectionsResult {
  routes: {
    legs: {
      distance: { value: number; text: string }
      duration: { value: number; text: string }
      start_address: string
      end_address: string
      steps: any[]
    }[]
    overview_polyline: { points: string }
  }[]
  status: string
}

/**
 * Get directions between two points
 */
export async function getDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  waypoints?: { lat: number; lng: number }[]
): Promise<DirectionsResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    logger.warn('Google Maps API key not configured')
    return null
  }

  try {
    const originStr = `${origin.lat},${origin.lng}`
    const destinationStr = `${destination.lat},${destination.lng}`

    let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&key=${apiKey}`

    if (waypoints && waypoints.length > 0) {
      const waypointsStr = waypoints.map(wp => `${wp.lat},${wp.lng}`).join('|')
      url += `&waypoints=optimize:true|${waypointsStr}`
    }

    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK') {
      logger.warn('Directions API failed', { status: data.status })
      return null
    }

    return data
  } catch (error) {
    logger.error('Directions API error', { error })
    return null
  }
}

/**
 * Optimize route using nearest neighbor algorithm (lightweight alternative)
 * This is a greedy algorithm that doesn't require API calls
 */
export function optimizeRouteNearestNeighbor(
  start: { latitude: number; longitude: number },
  waypoints: RouteWaypoint[]
): OptimizedRoute {
  if (waypoints.length === 0) {
    return {
      waypoints: [],
      total_distance_meters: 0,
      total_duration_minutes: 0,
      optimized_order: [],
    }
  }

  const unvisited = [...waypoints]
  const route: RouteWaypoint[] = []
  const order: number[] = []
  let currentPos = start
  let totalDistance = 0

  // Nearest neighbor: always go to closest unvisited point
  while (unvisited.length > 0) {
    let nearestIndex = 0
    let nearestDistance = Infinity

    // Find nearest unvisited waypoint
    unvisited.forEach((waypoint, index) => {
      const distance = calculateDistance(
        currentPos.latitude,
        currentPos.longitude,
        waypoint.latitude,
        waypoint.longitude
      )

      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = index
      }
    })

    // Add nearest to route
    const nearest = unvisited[nearestIndex]
    route.push(nearest)
    order.push(waypoints.indexOf(nearest))
    totalDistance += nearestDistance

    // Update current position
    currentPos = {
      latitude: nearest.latitude,
      longitude: nearest.longitude,
    }

    // Remove from unvisited
    unvisited.splice(nearestIndex, 1)
  }

  // Estimate duration (40 km/h average)
  const totalDuration = Math.round((totalDistance / 1000 / 40) * 60)

  return {
    waypoints: route,
    total_distance_meters: Math.round(totalDistance),
    total_duration_minutes: totalDuration,
    optimized_order: order,
  }
}

/**
 * Optimize route using Google Maps Directions API with waypoint optimization
 */
export async function optimizeRouteWithDirections(
  start: RouteWaypoint,
  waypoints: RouteWaypoint[],
  end?: RouteWaypoint
): Promise<OptimizedRoute | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    logger.warn('Google Maps API key not configured, using fallback algorithm')
    return optimizeRouteNearestNeighbor(start, waypoints)
  }

  try {
    const origin = { lat: start.latitude, lng: start.longitude }
    const destination = end
      ? { lat: end.latitude, lng: end.longitude }
      : { lat: start.latitude, lng: start.longitude } // Return to start

    const waypointCoords = waypoints.map(wp => ({
      lat: wp.latitude,
      lng: wp.longitude,
    }))

    const directions = await getDirections(origin, destination, waypointCoords)

    if (!directions || !directions.routes || directions.routes.length === 0) {
      logger.warn('No routes found, using fallback algorithm')
      return optimizeRouteNearestNeighbor(start, waypoints)
    }

    const route = directions.routes[0]
    let totalDistance = 0
    let totalDuration = 0

    route.legs.forEach(leg => {
      totalDistance += leg.distance.value
      totalDuration += leg.duration.value
    })

    // Extract optimized order from waypoint_order if available
    const optimizedOrder: number[] = (route as any).waypoint_order || waypoints.map((_, i) => i)

    const optimizedWaypoints = optimizedOrder.map(index => waypoints[index])

    return {
      waypoints: optimizedWaypoints,
      total_distance_meters: totalDistance,
      total_duration_minutes: Math.round(totalDuration / 60),
      optimized_order: optimizedOrder,
    }
  } catch (error) {
    logger.error('Route optimization error', { error })
    return optimizeRouteNearestNeighbor(start, waypoints)
  }
}

/**
 * Calculate distance matrix between multiple locations
 */
export async function getDistanceMatrix(
  origins: { lat: number; lng: number }[],
  destinations: { lat: number; lng: number }[]
): Promise<number[][] | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    logger.warn('Google Maps API key not configured')
    return null
  }

  try {
    const originsStr = origins.map(o => `${o.lat},${o.lng}`).join('|')
    const destinationsStr = destinations.map(d => `${d.lat},${d.lng}`).join('|')

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originsStr}&destinations=${destinationsStr}&key=${apiKey}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK') {
      logger.warn('Distance Matrix API failed', { status: data.status })
      return null
    }

    // Extract distance matrix
    const matrix: number[][] = []
    data.rows.forEach((row: any) => {
      const distances: number[] = []
      row.elements.forEach((element: any) => {
        distances.push(element.status === 'OK' ? element.distance.value : Infinity)
      })
      matrix.push(distances)
    })

    return matrix
  } catch (error) {
    logger.error('Distance Matrix API error', { error })
    return null
  }
}

/**
 * Plan daily canvassing route
 * Optimizes sequence of addresses to minimize travel time
 */
export async function planCanvassingRoute(
  startLocation: RouteWaypoint,
  targetAddresses: RouteWaypoint[],
  returnToStart: boolean = true
): Promise<OptimizedRoute> {
  // Try Google Maps optimization first
  const endLocation = returnToStart ? startLocation : undefined
  const optimized = await optimizeRouteWithDirections(
    startLocation,
    targetAddresses,
    endLocation
  )

  // Fallback to nearest neighbor if API fails
  if (!optimized) {
    return optimizeRouteNearestNeighbor(startLocation, targetAddresses)
  }

  return optimized
}

/**
 * Split large territory into manageable daily routes
 * Divides addresses into chunks based on max distance or max stops
 */
export function splitIntoDailyRoutes(
  allWaypoints: RouteWaypoint[],
  maxStopsPerDay: number = 50,
  maxDistancePerDay: number = 50000 // 50km in meters
): RouteWaypoint[][] {
  const routes: RouteWaypoint[][] = []
  let currentRoute: RouteWaypoint[] = []
  let currentDistance = 0

  for (let i = 0; i < allWaypoints.length; i++) {
    const waypoint = allWaypoints[i]

    // Calculate distance from last point in current route
    if (currentRoute.length > 0) {
      const lastPoint = currentRoute[currentRoute.length - 1]
      const distance = calculateDistance(
        lastPoint.latitude,
        lastPoint.longitude,
        waypoint.latitude,
        waypoint.longitude
      )

      // Check if adding this waypoint exceeds limits
      if (
        currentRoute.length >= maxStopsPerDay ||
        currentDistance + distance > maxDistancePerDay
      ) {
        // Start new route
        routes.push(currentRoute)
        currentRoute = [waypoint]
        currentDistance = 0
      } else {
        currentRoute.push(waypoint)
        currentDistance += distance
      }
    } else {
      currentRoute.push(waypoint)
    }
  }

  // Add last route if not empty
  if (currentRoute.length > 0) {
    routes.push(currentRoute)
  }

  return routes
}
