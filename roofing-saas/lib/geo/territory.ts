/**
 * Territory and GeoJSON helper functions
 * Utilities for working with territory boundaries and geographic data
 */

export interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: number[][][]
}

export interface GeoJSONMultiPolygon {
  type: 'MultiPolygon'
  coordinates: number[][][][]
}

export type TerritoryBoundary = GeoJSONPolygon | GeoJSONMultiPolygon

/**
 * Validate GeoJSON polygon coordinates
 * A valid polygon has at least 4 coordinates (with first and last being the same)
 */
export function isValidPolygonCoordinates(coordinates: number[][][]): boolean {
  if (!coordinates || coordinates.length === 0) {
    return false
  }

  // Check outer ring
  const outerRing = coordinates[0]
  if (!outerRing || outerRing.length < 4) {
    return false
  }

  // Verify each coordinate has [longitude, latitude] (and optionally altitude)
  for (const coord of outerRing) {
    if (!Array.isArray(coord) || coord.length < 2) {
      return false
    }
    // Validate longitude (-180 to 180) and latitude (-90 to 90)
    const [lon, lat] = coord
    if (typeof lon !== 'number' || typeof lat !== 'number') {
      return false
    }
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
      return false
    }
  }

  // First and last coordinates should be the same (closed ring)
  const first = outerRing[0]
  const last = outerRing[outerRing.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return false
  }

  return true
}

/**
 * Validate GeoJSON boundary data
 */
export function validateTerritoryBoundary(boundary: unknown): {
  valid: boolean
  error?: string
} {
  if (!boundary) {
    return { valid: false, error: 'Boundary is required' }
  }

  if (typeof boundary !== 'object') {
    return { valid: false, error: 'Boundary must be an object' }
  }

  if (!boundary.type) {
    return { valid: false, error: 'Boundary type is required' }
  }

  if (boundary.type === 'Polygon') {
    if (!Array.isArray(boundary.coordinates)) {
      return { valid: false, error: 'Polygon coordinates must be an array' }
    }

    if (!isValidPolygonCoordinates(boundary.coordinates)) {
      return { valid: false, error: 'Invalid polygon coordinates' }
    }

    return { valid: true }
  }

  if (boundary.type === 'MultiPolygon') {
    if (!Array.isArray(boundary.coordinates)) {
      return { valid: false, error: 'MultiPolygon coordinates must be an array' }
    }

    // Validate each polygon in the multipolygon
    for (const polygonCoords of boundary.coordinates) {
      if (!isValidPolygonCoordinates(polygonCoords)) {
        return { valid: false, error: 'Invalid multipolygon coordinates' }
      }
    }

    return { valid: true }
  }

  return { valid: false, error: 'Unsupported geometry type. Only Polygon and MultiPolygon are supported.' }
}

/**
 * Calculate the bounding box of a territory boundary
 * Returns [minLon, minLat, maxLon, maxLat]
 */
export function calculateBoundingBox(boundary: TerritoryBoundary): [number, number, number, number] | null {
  if (!boundary || !boundary.coordinates) {
    return null
  }

  let minLon = Infinity
  let minLat = Infinity
  let maxLon = -Infinity
  let maxLat = -Infinity

  const processCoordinates = (coords: number[][]) => {
    for (const [lon, lat] of coords) {
      if (lon < minLon) minLon = lon
      if (lon > maxLon) maxLon = lon
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
    }
  }

  if (boundary.type === 'Polygon') {
    // Process outer ring (index 0)
    processCoordinates(boundary.coordinates[0])
  } else if (boundary.type === 'MultiPolygon') {
    // Process all polygons
    for (const polygon of boundary.coordinates) {
      processCoordinates(polygon[0]) // Outer ring of each polygon
    }
  }

  if (!isFinite(minLon) || !isFinite(minLat) || !isFinite(maxLon) || !isFinite(maxLat)) {
    return null
  }

  return [minLon, minLat, maxLon, maxLat]
}

/**
 * Calculate the center point of a territory boundary
 * Returns [longitude, latitude]
 */
export function calculateCenter(boundary: TerritoryBoundary): [number, number] | null {
  const bbox = calculateBoundingBox(boundary)
  if (!bbox) {
    return null
  }

  const [minLon, minLat, maxLon, maxLat] = bbox
  const centerLon = (minLon + maxLon) / 2
  const centerLat = (minLat + maxLat) / 2

  return [centerLon, centerLat]
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 * Point: [longitude, latitude]
 * Polygon: array of [longitude, latitude] coordinates
 */
export function pointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [lon, lat] = point
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]

    const intersect = ((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)

    if (intersect) {
      inside = !inside
    }
  }

  return inside
}

/**
 * Check if a point is inside a territory boundary
 */
export function pointInTerritory(point: [number, number], boundary: TerritoryBoundary): boolean {
  if (!boundary || !boundary.coordinates) {
    return false
  }

  if (boundary.type === 'Polygon') {
    // Check if point is in outer ring
    return pointInPolygon(point, boundary.coordinates[0])
  } else if (boundary.type === 'MultiPolygon') {
    // Check if point is in any of the polygons
    for (const polygon of boundary.coordinates) {
      if (pointInPolygon(point, polygon[0])) {
        return true
      }
    }
    return false
  }

  return false
}

/**
 * Format a simple rectangle as GeoJSON Polygon
 * Useful for creating quick test territories
 */
export function createRectangleTerritory(
  centerLon: number,
  centerLat: number,
  widthDegrees: number = 0.05,
  heightDegrees: number = 0.05
): GeoJSONPolygon {
  const halfWidth = widthDegrees / 2
  const halfHeight = heightDegrees / 2

  return {
    type: 'Polygon',
    coordinates: [
      [
        [centerLon - halfWidth, centerLat - halfHeight], // SW
        [centerLon + halfWidth, centerLat - halfHeight], // SE
        [centerLon + halfWidth, centerLat + halfHeight], // NE
        [centerLon - halfWidth, centerLat + halfHeight], // NW
        [centerLon - halfWidth, centerLat - halfHeight], // Close the ring
      ],
    ],
  }
}

/**
 * Format coordinates for display
 */
export function formatCoordinate(coordinate: [number, number]): string {
  const [lon, lat] = coordinate
  const lonDir = lon >= 0 ? 'E' : 'W'
  const latDir = lat >= 0 ? 'N' : 'S'

  return `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lon).toFixed(6)}°${lonDir}`
}
