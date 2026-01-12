/**
 * OVERPASS API CLIENT
 * Queries OpenStreetMap for buildings within a polygon
 * Free, fast, and perfect for bulk address extraction
 */

import type {
  Polygon,
  BoundingBox,
  OverpassResponse,
  BuildingData,
  ExtractedAddress,
  AddressExtractionResult,
} from './types';
import { logger } from '@/lib/logger';
import {
  generateGrid,
  calculateOptimalGridConfig,
  calculatePolygonAreaSqMiles,
  pointInPolygon,
  type GridCell,
  type GridConfig,
} from './grid-search';

// =====================================================
// CONSTANTS
// =====================================================

// Overpass API public instances (load-balanced)
// Prioritize fastest/most reliable endpoints
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter', // Most reliable
  'https://overpass.kumi.systems/api/interpreter', // Fast backup
  // Removed Russian endpoint - frequently times out
];

const MAX_RETRIES = 2; // Reduced from 3 to fail faster
const RATE_LIMIT_DELAY = 1000; // ms between requests

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Convert polygon to Overpass QL format
 * Format: poly:"lat1 lng1 lat2 lng2 lat3 lng3"
 */
function polygonToOverpassQL(polygon: Polygon): string {
  const coords = polygon.coordinates
    .map((point) => `${point.lat} ${point.lng}`)
    .join(' ');
  return `poly:"${coords}"`;
}

/**
 * Calculate bounding box from polygon
 */
function calculateBoundingBox(polygon: Polygon): BoundingBox {
  const lats = polygon.coordinates.map((p) => p.lat);
  const lngs = polygon.coordinates.map((p) => p.lng);

  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs),
  };
}

/**
 * Estimate area of polygon in square miles (rough approximation)
 */
function estimatePolygonAreaSquareMiles(polygon: Polygon): number {
  // Using Shoelace formula for polygon area
  let area = 0;
  const coords = polygon.coordinates;

  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    area += coords[i].lng * coords[j].lat;
    area -= coords[j].lng * coords[i].lat;
  }

  area = Math.abs(area) / 2;

  // Convert from square degrees to square miles (rough approximation)
  // At latitude ~36° (Tennessee), 1 degree ≈ 69 miles
  const milesPerDegree = 69;
  const squareMiles = area * milesPerDegree * milesPerDegree;

  return squareMiles;
}

/**
 * Determine if building is likely residential
 */
function isResidentialBuilding(tags: Record<string, string>): boolean {
  const buildingTag = tags.building || '';
  const landUseTag = tags.landuse || '';

  // Residential building types
  const residentialTypes = [
    'house',
    'detached',
    'semidetached_house',
    'residential',
    'bungalow',
    'terrace',
    'apartments',
    'dormitory',
    'farm',
  ];

  // Commercial/non-residential types
  const nonResidentialTypes = [
    'commercial',
    'retail',
    'industrial',
    'warehouse',
    'office',
    'church',
    'school',
    'hospital',
    'hotel',
    'civic',
    'public',
    'government',
  ];

  // Check building tag
  if (residentialTypes.some((type) => buildingTag.includes(type))) {
    return true;
  }

  if (nonResidentialTypes.some((type) => buildingTag.includes(type))) {
    return false;
  }

  // Check landuse tag
  if (landUseTag === 'residential') {
    return true;
  }

  // If building=yes or no specific tag, assume residential (conservative)
  // Most mapped buildings without specific tags are residential
  if (buildingTag === 'yes' || buildingTag === '') {
    return true;
  }

  return false;
}

/**
 * Get building type description
 */
function getBuildingType(tags: Record<string, string>): string {
  const buildingTag = tags.building || 'unknown';
  return buildingTag === 'yes' ? 'residential' : buildingTag;
}

/**
 * Get property type (residential, commercial, industrial, etc.)
 */
function getPropertyType(tags: Record<string, string>): string {
  const landUseTag = tags.landuse || '';
  const buildingTag = tags.building || '';

  if (landUseTag) {
    return landUseTag;
  }

  if (isResidentialBuilding(tags)) {
    return 'residential';
  }

  if (['commercial', 'retail', 'office'].includes(buildingTag)) {
    return 'commercial';
  }

  if (['industrial', 'warehouse'].includes(buildingTag)) {
    return 'industrial';
  }

  return 'unknown';
}

// =====================================================
// OVERPASS API CLIENT
// =====================================================

export class OverpassClient {
  private currentEndpointIndex = 0;
  private lastRequestTime = 0;

  /**
   * Get next Overpass API endpoint (load balancing)
   */
  private getEndpoint(): string {
    const endpoint = OVERPASS_ENDPOINTS[this.currentEndpointIndex];
    this.currentEndpointIndex =
      (this.currentEndpointIndex + 1) % OVERPASS_ENDPOINTS.length;
    return endpoint;
  }

  /**
   * Rate limiting - ensure we don't overwhelm the API
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
      await new Promise((resolve) =>
        setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Build Overpass QL query for buildings within polygon
   * Using bounding box only for better compatibility
   */
  private buildQuery(polygon: Polygon, timeout: number = 60): string {
    const bbox = calculateBoundingBox(polygon);

    // Use bounding box query (simpler, more reliable)
    // Format: (south,west,north,east)
    const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;

    // Simplified Overpass QL query
    // Just use bounding box - the polygon filter was causing issues
    // We'll filter client-side if needed
    const query = `
      [out:json][timeout:${timeout}];
      (
        way["building"](${bboxStr});
        node["building"](${bboxStr});
      );
      out center;
    `;

    return query.trim();
  }

  /**
   * Execute Overpass API query with retry logic
   */
  private async executeQuery(
    query: string,
    retryCount: number = 0
  ): Promise<OverpassResponse> {
    await this.rateLimit();

    const endpoint = this.getEndpoint();

    logger.debug(`Overpass API using endpoint: ${endpoint}`);
    logger.debug('Overpass query preview', { query: query.substring(0, 500) });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'RoofingSaaS-StormTargeting/1.0',
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        const responseText = await response.text();
        logger.error(`Overpass API error response (${response.status})`, { response: responseText.substring(0, 500) });

        if (response.status === 429 && retryCount < MAX_RETRIES) {
          // Rate limited - wait longer and retry
          logger.warn(`Overpass API rate limited, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
          await new Promise((resolve) => setTimeout(resolve, 5000 * (retryCount + 1)));
          return this.executeQuery(query, retryCount + 1);
        }

        if (response.status === 504 && retryCount < MAX_RETRIES) {
          // Timeout - try shorter timeout or different endpoint
          logger.warn(`Overpass API timeout, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return this.executeQuery(query, retryCount + 1);
        }

        throw new Error(`Overpass API error: ${response.status} ${response.statusText}. Response: ${responseText.substring(0, 200)}`);
      }

      // Try to parse as JSON
      const responseText = await response.text();

      // Check if response is XML (error response)
      if (responseText.trim().startsWith('<?xml') || responseText.trim().startsWith('<')) {
        logger.error('Overpass API returned XML instead of JSON', { response: responseText.substring(0, 500) });
        throw new Error('Overpass API query error. The query syntax may be invalid.');
      }

      const data: OverpassResponse = JSON.parse(responseText);
      return data;
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        logger.warn(`Overpass API request failed, retrying... (${retryCount + 1}/${MAX_RETRIES})`, { error: error instanceof Error ? error.message : String(error) });
        await new Promise((resolve) => setTimeout(resolve, 2000 * (retryCount + 1)));
        return this.executeQuery(query, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Parse Overpass API response into building data
   */
  private parseBuildings(response: OverpassResponse): BuildingData[] {
    const buildings: BuildingData[] = [];

    for (const element of response.elements) {
      // Get coordinates
      let lat: number | undefined;
      let lng: number | undefined;

      if (element.lat && element.lon) {
        // Node
        lat = element.lat;
        lng = element.lon;
      } else if (element.center) {
        // Way or relation with center
        lat = element.center.lat;
        lng = element.center.lon;
      }

      if (!lat || !lng) {
        continue; // Skip if no coordinates
      }

      const tags = element.tags || {};

      buildings.push({
        id: `${element.type}-${element.id}`,
        lat,
        lng,
        buildingType: getBuildingType(tags),
        propertyType: getPropertyType(tags),
        tags,
      });
    }

    return buildings;
  }

  /**
   * Filter buildings to residential only
   */
  private filterResidential(buildings: BuildingData[]): BuildingData[] {
    return buildings.filter((building) => isResidentialBuilding(building.tags));
  }

  /**
   * Convert building data to extracted addresses
   */
  private buildingsToAddresses(buildings: BuildingData[]): ExtractedAddress[] {
    return buildings.map((building) => ({
      lat: building.lat,
      lng: building.lng,
      osmPropertyType: building.propertyType,
      osmBuildingType: building.buildingType,
      osmTags: building.tags,
      source: 'osm' as const,
      confidence: 0.6, // OSM data is good but needs geocoding for full address
      isResidential: isResidentialBuilding(building.tags),
    }));
  }

  /**
   * Extract all addresses within a polygon
   * Main entry point
   */
  async extractAddresses(polygon: Polygon): Promise<AddressExtractionResult> {
    const startTime = Date.now();

    // Log polygon details
    logger.debug('Address extraction started', {
      pointsCount: polygon.coordinates.length,
      boundingBox: calculateBoundingBox(polygon),
    });

    // Build and execute query
    const query = this.buildQuery(polygon);
    logger.debug('Executing Overpass API query');

    const response = await this.executeQuery(query);
    logger.debug(`Overpass API returned ${response.elements.length} buildings`);

    // Parse buildings
    const allBuildings = this.parseBuildings(response);
    logger.debug(`Parsed ${allBuildings.length} buildings with coordinates`, {
      buildingTypes: [...new Set(allBuildings.map(b => b.buildingType))],
      propertyTypes: [...new Set(allBuildings.map(b => b.propertyType))],
    });

    // Filter to residential only
    const residentialBuildings = this.filterResidential(allBuildings);
    logger.debug(`Filtered to ${residentialBuildings.length} residential buildings`);

    if (allBuildings.length > 0 && residentialBuildings.length === 0) {
      logger.warn('All buildings were filtered out as non-residential', {
        buildingTags: allBuildings.map(b => b.tags.building || 'none').slice(0, 10),
      });
    }

    // Convert to addresses
    const addresses = this.buildingsToAddresses(residentialBuildings);

    // Calculate stats
    const boundingBox = calculateBoundingBox(polygon);
    const areaSquareMiles = estimatePolygonAreaSquareMiles(polygon);
    const processingTimeMs = Date.now() - startTime;

    const result: AddressExtractionResult = {
      addresses,
      stats: {
        totalBuildings: allBuildings.length,
        residentialCount: residentialBuildings.length,
        commercialCount: allBuildings.length - residentialBuildings.length,
        unknownCount: 0,
        processingTimeMs,
      },
      boundingBox,
      areaSquareMiles,
    };

    logger.info('Address extraction complete', {
      residential: result.stats.residentialCount,
      total: result.stats.totalBuildings,
      area: areaSquareMiles.toFixed(2) + ' sq mi',
      time: (processingTimeMs / 1000).toFixed(1) + 's',
    });

    return result;
  }

  /**
   * Quick count of buildings in area (faster than full extraction)
   */
  async estimateBuildingCount(polygon: Polygon): Promise<number> {
    const polyQL = polygonToOverpassQL(polygon);

    // Lightweight query - just count, don't return data
    const query = `
      [out:json][timeout:30];
      (
        way["building"](${polyQL});
        relation["building"](${polyQL});
      );
      out count;
    `;

    const response = await this.executeQuery(query);

    // Count response format is different
    if (response.elements && response.elements[0]) {
      const tags = response.elements[0].tags;
      if (tags && 'buildings' in tags) {
        return parseInt(tags.buildings as string, 10);
      }
    }

    // Fallback: return element count
    return response.elements.length;
  }

  /**
   * Build query for a single grid cell
   */
  private buildCellQuery(cell: GridCell, timeout: number = 30): string {
    const { minLat, minLng, maxLat, maxLng } = cell.bounds;
    const bboxStr = `${minLat},${minLng},${maxLat},${maxLng}`;

    const query = `
      [out:json][timeout:${timeout}];
      (
        way["building"](${bboxStr});
        node["building"](${bboxStr});
      );
      out center;
    `;

    return query.trim();
  }

  /**
   * Extract addresses from a single grid cell
   */
  private async extractFromCell(
    cell: GridCell,
    originalPolygon: Polygon
  ): Promise<BuildingData[]> {
    try {
      const query = this.buildCellQuery(cell);
      const response = await this.executeQuery(query);
      const buildings = this.parseBuildings(response);

      // Filter to buildings that are actually inside the original polygon
      // (cells may extend beyond the polygon boundary)
      return buildings.filter((building) =>
        pointInPolygon({ lat: building.lat, lng: building.lng }, originalPolygon.coordinates)
      );
    } catch (error) {
      logger.warn(`Failed to extract from cell ${cell.id}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * GRID-BASED ADDRESS EXTRACTION
   *
   * Breaks large polygons into smaller grid cells for more comprehensive
   * address extraction. This overcomes API limitations and extracts
   * significantly more addresses (500-2000+) from large areas.
   *
   * @param polygon - The polygon to search within
   * @param gridConfig - Optional grid configuration
   * @param onProgress - Optional callback for progress updates
   */
  async extractAddressesWithGrid(
    polygon: Polygon,
    gridConfig?: GridConfig,
    onProgress?: (progress: {
      currentCell: number;
      totalCells: number;
      addressesFound: number;
      currentCellId: string;
    }) => void
  ): Promise<AddressExtractionResult & {
    gridStats: {
      totalCells: number;
      processedCells: number;
      failedCells: number;
      cellSizeMeters: number;
    };
  }> {
    const startTime = Date.now();

    // Calculate area and optimal grid configuration
    const areaSqMiles = calculatePolygonAreaSqMiles(polygon.coordinates);
    const config = gridConfig || calculateOptimalGridConfig(polygon.coordinates);

    logger.info('Starting grid-based address extraction', {
      areaSqMiles: areaSqMiles.toFixed(2),
      config,
    });

    // Generate grid
    const gridResult = generateGrid(polygon.coordinates, config);

    logger.info('Grid generated', {
      totalCells: gridResult.totalCells,
      includedCells: gridResult.includedCells,
      cellSize: `${gridResult.cellSizeMeters}m`,
    });

    // Extract from each cell
    const allBuildings: BuildingData[] = [];
    let processedCells = 0;
    const failedCells = 0; // Track failed cells (currently unused but ready for error handling)

    for (const cell of gridResult.cells) {
      const cellBuildings = await this.extractFromCell(cell, polygon);
      allBuildings.push(...cellBuildings);
      processedCells++;

      if (cellBuildings.length === 0) {
        // Not necessarily a failure - could just be no buildings in cell
      }

      // Progress callback
      if (onProgress) {
        onProgress({
          currentCell: processedCells,
          totalCells: gridResult.includedCells,
          addressesFound: allBuildings.length,
          currentCellId: cell.id,
        });
      }

      logger.debug(`Cell ${cell.id}: ${cellBuildings.length} buildings found`, {
        progress: `${processedCells}/${gridResult.includedCells}`,
        totalSoFar: allBuildings.length,
      });
    }

    // Deduplicate buildings (cells may overlap slightly at edges)
    const seen = new Map<string, BuildingData>();
    for (const building of allBuildings) {
      // Use OSM ID for deduplication
      if (!seen.has(building.id)) {
        seen.set(building.id, building);
      }
    }
    const uniqueBuildings = Array.from(seen.values());

    // Filter to residential only
    const residentialBuildings = this.filterResidential(uniqueBuildings);

    // Convert to addresses
    const addresses = this.buildingsToAddresses(residentialBuildings);

    // Calculate stats
    const boundingBox = calculateBoundingBox(polygon);
    const processingTimeMs = Date.now() - startTime;

    const result = {
      addresses,
      stats: {
        totalBuildings: uniqueBuildings.length,
        residentialCount: residentialBuildings.length,
        commercialCount: uniqueBuildings.length - residentialBuildings.length,
        unknownCount: 0,
        processingTimeMs,
      },
      boundingBox,
      areaSquareMiles: areaSqMiles,
      gridStats: {
        totalCells: gridResult.includedCells,
        processedCells,
        failedCells,
        cellSizeMeters: gridResult.cellSizeMeters,
      },
    };

    logger.info('Grid-based extraction complete', {
      residential: result.stats.residentialCount,
      total: result.stats.totalBuildings,
      cells: `${processedCells}/${gridResult.includedCells}`,
      area: `${areaSqMiles.toFixed(2)} sq mi`,
      time: `${(processingTimeMs / 1000).toFixed(1)}s`,
    });

    return result;
  }
}

// =====================================================
// EXPORTS
// =====================================================

/**
 * Singleton instance
 */
export const overpassClient = new OverpassClient();

/**
 * Convenience function for extracting addresses
 */
export async function extractAddressesFromPolygon(
  polygon: Polygon
): Promise<AddressExtractionResult> {
  return overpassClient.extractAddresses(polygon);
}

/**
 * Convenience function for estimating building count
 */
export async function estimateBuildingCountInPolygon(polygon: Polygon): Promise<number> {
  return overpassClient.estimateBuildingCount(polygon);
}

/**
 * Convenience function for grid-based address extraction
 * Recommended for areas > 1 square mile
 */
export async function extractAddressesWithGrid(
  polygon: Polygon,
  gridConfig?: GridConfig,
  onProgress?: (progress: {
    currentCell: number;
    totalCells: number;
    addressesFound: number;
    currentCellId: string;
  }) => void
) {
  return overpassClient.extractAddressesWithGrid(polygon, gridConfig, onProgress);
}

// Re-export grid utilities for external use
export {
  generateGrid,
  calculateOptimalGridConfig,
  calculatePolygonAreaSqMiles,
  type GridCell,
  type GridConfig,
} from './grid-search';
