/**
 * Grid Search for Address Extraction
 *
 * Breaks large polygons into smaller grid cells (default 500m x 500m)
 * to overcome API limitations and extract more addresses.
 *
 * Instead of querying one large area and getting ~20 results,
 * we query many small cells and aggregate results for 500-2000+ addresses.
 */

import type { Polygon, LatLng, ExtractedAddress, BuildingData } from './types'

// Re-export for convenience (used internally as OsmBuilding alias)
export type OsmBuilding = BuildingData

/**
 * Geographic constants
 */
const _EARTH_RADIUS_METERS = 6371000 // Reserved for future use
const METERS_PER_DEGREE_LAT = 111320 // Approximate, varies by latitude

/**
 * Grid cell with bounds and metadata
 */
export interface GridCell {
  id: string
  index: { row: number; col: number }
  bounds: {
    minLat: number
    maxLat: number
    minLng: number
    maxLng: number
  }
  center: {
    lat: number
    lng: number
  }
  /** Whether this cell overlaps with the original polygon */
  intersectsPolygon: boolean
}

/**
 * Grid configuration options
 */
export interface GridConfig {
  /** Cell size in meters (default: 500) */
  cellSizeMeters?: number
  /** Maximum number of cells to generate (default: 100) */
  maxCells?: number
  /** Minimum overlap percentage with polygon to include cell (default: 0.1 = 10%) */
  minOverlapPercent?: number
}

/**
 * Grid generation result
 */
export interface GridResult {
  cells: GridCell[]
  totalCells: number
  includedCells: number
  gridSize: { rows: number; cols: number }
  cellSizeMeters: number
  bounds: {
    minLat: number
    maxLat: number
    minLng: number
    maxLng: number
  }
}

/**
 * Generate a grid of cells covering a polygon
 * Only includes cells that intersect with the polygon
 */
export function generateGrid(polygon: Polygon | LatLng[], config: GridConfig = {}): GridResult {
  const {
    cellSizeMeters = 500,
    maxCells = 100,
    minOverlapPercent = 0.1,
  } = config

  // Normalize polygon to LatLng array
  const coords = Array.isArray(polygon) ? polygon : polygon.coordinates

  // Calculate polygon bounds
  const bounds = calculateBounds(coords)
  const { minLat, maxLat, minLng, maxLng } = bounds

  // Calculate cell dimensions in degrees
  const latDegPerCell = cellSizeMeters / METERS_PER_DEGREE_LAT
  const avgLat = (minLat + maxLat) / 2
  const lngDegPerCell = cellSizeMeters / (METERS_PER_DEGREE_LAT * Math.cos(avgLat * Math.PI / 180))

  // Calculate grid dimensions
  const rows = Math.ceil((maxLat - minLat) / latDegPerCell)
  const cols = Math.ceil((maxLng - minLng) / lngDegPerCell)
  const totalCells = rows * cols

  // If total cells exceeds max, increase cell size
  let adjustedCellSize = cellSizeMeters
  let adjustedRows = rows
  let adjustedCols = cols
  let adjustedLatDeg = latDegPerCell
  let adjustedLngDeg = lngDegPerCell

  if (totalCells > maxCells) {
    const scaleFactor = Math.sqrt(totalCells / maxCells)
    adjustedCellSize = cellSizeMeters * scaleFactor
    adjustedLatDeg = adjustedCellSize / METERS_PER_DEGREE_LAT
    adjustedLngDeg = adjustedCellSize / (METERS_PER_DEGREE_LAT * Math.cos(avgLat * Math.PI / 180))
    adjustedRows = Math.ceil((maxLat - minLat) / adjustedLatDeg)
    adjustedCols = Math.ceil((maxLng - minLng) / adjustedLngDeg)
  }

  // Generate cells
  const cells: GridCell[] = []
  for (let row = 0; row < adjustedRows; row++) {
    for (let col = 0; col < adjustedCols; col++) {
      const cellMinLat = minLat + row * adjustedLatDeg
      const cellMaxLat = Math.min(cellMinLat + adjustedLatDeg, maxLat)
      const cellMinLng = minLng + col * adjustedLngDeg
      const cellMaxLng = Math.min(cellMinLng + adjustedLngDeg, maxLng)

      const cellBounds = {
        minLat: cellMinLat,
        maxLat: cellMaxLat,
        minLng: cellMinLng,
        maxLng: cellMaxLng,
      }

      // Check if cell intersects with polygon
      const intersectsPolygon = cellIntersectsPolygon(cellBounds, coords, minOverlapPercent)

      if (intersectsPolygon) {
        cells.push({
          id: `cell_${row}_${col}`,
          index: { row, col },
          bounds: cellBounds,
          center: {
            lat: (cellMinLat + cellMaxLat) / 2,
            lng: (cellMinLng + cellMaxLng) / 2,
          },
          intersectsPolygon: true,
        })
      }
    }
  }

  return {
    cells,
    totalCells: adjustedRows * adjustedCols,
    includedCells: cells.length,
    gridSize: { rows: adjustedRows, cols: adjustedCols },
    cellSizeMeters: adjustedCellSize,
    bounds,
  }
}

/**
 * Calculate the bounding box of a polygon
 */
export function calculateBounds(polygon: Polygon | LatLng[]): {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
} {
  // Normalize polygon to LatLng array
  const coords = Array.isArray(polygon) ? polygon : polygon.coordinates

  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity

  for (const coord of coords) {
    if (coord.lat < minLat) minLat = coord.lat
    if (coord.lat > maxLat) maxLat = coord.lat
    if (coord.lng < minLng) minLng = coord.lng
    if (coord.lng > maxLng) maxLng = coord.lng
  }

  return { minLat, maxLat, minLng, maxLng }
}

/**
 * Check if a cell intersects with a polygon
 * Uses simplified check: if any cell corner is inside polygon OR
 * if polygon has any point inside cell
 */
function cellIntersectsPolygon(
  cellBounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  coords: LatLng[],
  _minOverlapPercent: number
): boolean {
  // Check if any cell corner is inside polygon
  const corners = [
    { lat: cellBounds.minLat, lng: cellBounds.minLng },
    { lat: cellBounds.minLat, lng: cellBounds.maxLng },
    { lat: cellBounds.maxLat, lng: cellBounds.minLng },
    { lat: cellBounds.maxLat, lng: cellBounds.maxLng },
  ]

  for (const corner of corners) {
    if (pointInPolygon(corner, coords)) {
      return true
    }
  }

  // Check if any polygon vertex is inside cell
  for (const vertex of coords) {
    if (
      vertex.lat >= cellBounds.minLat &&
      vertex.lat <= cellBounds.maxLat &&
      vertex.lng >= cellBounds.minLng &&
      vertex.lng <= cellBounds.maxLng
    ) {
      return true
    }
  }

  // Check if cell center is inside polygon
  const center = {
    lat: (cellBounds.minLat + cellBounds.maxLat) / 2,
    lng: (cellBounds.minLng + cellBounds.maxLng) / 2,
  }
  if (pointInPolygon(center, coords)) {
    return true
  }

  return false
}

/**
 * Ray casting algorithm to check if a point is inside a polygon
 */
export function pointInPolygon(point: { lat: number; lng: number }, polygon: Polygon | LatLng[]): boolean {
  // Normalize polygon to LatLng array
  const coords = Array.isArray(polygon) ? polygon : polygon.coordinates

  let inside = false
  const x = point.lng
  const y = point.lat

  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const xi = coords[i].lng
    const yi = coords[i].lat
    const xj = coords[j].lng
    const yj = coords[j].lat

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi)

    if (intersect) inside = !inside
  }

  return inside
}

/**
 * Convert grid cell bounds to Overpass API bounding box format
 * Format: south,west,north,east (minLat,minLng,maxLat,maxLng)
 */
export function cellToBbox(cell: GridCell): string {
  const { minLat, minLng, maxLat, maxLng } = cell.bounds
  return `${minLat},${minLng},${maxLat},${maxLng}`
}

/**
 * Calculate approximate area of a polygon in square meters
 */
export function calculatePolygonArea(polygon: Polygon | LatLng[]): number {
  // Normalize polygon to LatLng array
  const coords = Array.isArray(polygon) ? polygon : polygon.coordinates

  if (coords.length < 3) return 0

  // Use Shoelace formula with lat/lng converted to approximate meters
  let area = 0
  const avgLat = coords.reduce((sum, p) => sum + p.lat, 0) / coords.length
  const metersPerDegreeLng = METERS_PER_DEGREE_LAT * Math.cos(avgLat * Math.PI / 180)

  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length
    const xi = coords[i].lng * metersPerDegreeLng
    const yi = coords[i].lat * METERS_PER_DEGREE_LAT
    const xj = coords[j].lng * metersPerDegreeLng
    const yj = coords[j].lat * METERS_PER_DEGREE_LAT
    area += xi * yj - xj * yi
  }

  return Math.abs(area / 2)
}

/**
 * Calculate area in square miles
 */
export function calculatePolygonAreaSqMiles(polygon: Polygon | LatLng[]): number {
  const areaSqMeters = calculatePolygonArea(polygon)
  return areaSqMeters / 2590000 // 1 sq mile = 2,590,000 sq meters
}

/**
 * Deduplicate addresses from multiple cell results
 * Uses address string + coordinates to identify duplicates
 */
export function deduplicateAddresses(addresses: ExtractedAddress[]): ExtractedAddress[] {
  const seen = new Map<string, ExtractedAddress>()

  for (const addr of addresses) {
    // Create a key from coordinates (rounded to 5 decimal places for ~1m precision)
    const coordKey = `${addr.lat.toFixed(5)},${addr.lng.toFixed(5)}`

    // Also check address string for near-duplicates
    const addrKey = addr.fullAddress?.toLowerCase().replace(/\s+/g, '') || coordKey

    // Use coordinate key as primary, with address as tiebreaker
    const key = `${coordKey}|${addrKey}`

    if (!seen.has(key)) {
      seen.set(key, addr)
    } else {
      // Keep the one with more complete data
      const existing = seen.get(key)!
      if (!existing.fullAddress && addr.fullAddress) {
        seen.set(key, addr)
      }
    }
  }

  return Array.from(seen.values())
}

/**
 * Deduplicate OSM buildings by node/way ID
 */
export function deduplicateOsmBuildings(buildings: OsmBuilding[]): OsmBuilding[] {
  const seen = new Map<string, OsmBuilding>()

  for (const building of buildings) {
    // OSM buildings have unique IDs
    if (!seen.has(building.id)) {
      seen.set(building.id, building)
    }
  }

  return Array.from(seen.values())
}

/**
 * Estimate the number of addresses in a polygon based on area and density
 * Used for progress estimation
 */
export function estimateAddressCount(
  areaSqMiles: number,
  densityType: 'rural' | 'suburban' | 'urban' = 'suburban'
): { low: number; high: number; estimate: number } {
  // Addresses per square mile by density type
  const densities = {
    rural: { low: 10, high: 100, avg: 50 },
    suburban: { low: 200, high: 800, avg: 500 },
    urban: { low: 2000, high: 10000, avg: 5000 },
  }

  const density = densities[densityType]
  return {
    low: Math.round(areaSqMiles * density.low),
    high: Math.round(areaSqMiles * density.high),
    estimate: Math.round(areaSqMiles * density.avg),
  }
}

/**
 * Calculate optimal grid configuration for a polygon
 * Returns recommended cell size and max cells based on polygon area
 */
export function calculateOptimalGridConfig(polygon: Polygon | LatLng[]): GridConfig {
  const areaSqMiles = calculatePolygonAreaSqMiles(polygon)

  // Small areas (< 1 sq mi): 200m cells, up to 50 cells
  if (areaSqMiles < 1) {
    return { cellSizeMeters: 200, maxCells: 50 }
  }

  // Medium areas (1-5 sq mi): 500m cells, up to 100 cells
  if (areaSqMiles < 5) {
    return { cellSizeMeters: 500, maxCells: 100 }
  }

  // Large areas (5-20 sq mi): 1000m cells, up to 150 cells
  if (areaSqMiles < 20) {
    return { cellSizeMeters: 1000, maxCells: 150 }
  }

  // Very large areas (> 20 sq mi): 2000m cells, up to 200 cells
  return { cellSizeMeters: 2000, maxCells: 200 }
}
