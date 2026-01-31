/**
 * STORM TARGETING - EXTRACT ADDRESSES API
 * POST /api/storm-targeting/extract-addresses
 *
 * Extracts addresses from a polygon using OSM + Google Maps
 * Main entry point for bulk address extraction
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session';
import { googlePlacesClient } from '@/lib/address-extraction/google-places-client';
import { geocodingClient } from '@/lib/address-extraction/geocoder';
import { logger } from '@/lib/logger';
import { AuthenticationError, AuthorizationError, ValidationError, InternalError } from '@/lib/api/errors';
import { errorResponse } from '@/lib/api/response';
import type {
  ExtractAddressesRequest,
  ExtractAddressesResponse,
  Polygon,
} from '@/lib/address-extraction/types';

// =====================================================
// HELPERS
// =====================================================

/**
 * Convert polygon coordinates to PostGIS geography format
 */
function polygonToPostGIS(polygon: Polygon): string {
  // PostGIS format: POLYGON((lng1 lat1, lng2 lat2, lng3 lat3, lng1 lat1))
  // Note: Must close the polygon (first point = last point)
  const coords = [...polygon.coordinates, polygon.coordinates[0]]
    .map((p) => `${p.lng} ${p.lat}`)
    .join(', ');

  return `POLYGON((${coords}))`;
}

/**
 * Calculate area of polygon in square miles using the spherical excess formula.
 * Operates on WKT POLYGON string with (lng lat) coordinate pairs.
 */
function calculateAreaSquareMiles(polygonWKT: string): number {
  // Parse coordinates from WKT: POLYGON((lng1 lat1, lng2 lat2, ...))
  const match = polygonWKT.match(/POLYGON\(\((.+)\)\)/);
  if (!match) return 0;

  const coords = match[1].split(',').map(pair => {
    const [lng, lat] = pair.trim().split(' ').map(Number);
    return { lat, lng };
  });

  if (coords.length < 3) return 0;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const EARTH_RADIUS_MILES = 3958.8;

  // Spherical polygon area via the shoelace formula on a sphere
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    const dLng = toRad(coords[j].lng - coords[i].lng);
    area += dLng * (2 + Math.sin(toRad(coords[i].lat)) + Math.sin(toRad(coords[j].lat)));
  }
  area = Math.abs((area * EARTH_RADIUS_MILES * EARTH_RADIUS_MILES) / 2);

  return area;
}

// =====================================================
// API HANDLER
// =====================================================

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = await createClient();

    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      throw AuthenticationError();
    }

    const tenantId = await getUserTenantId(user.id);
    if (!tenantId) {
      throw AuthorizationError('User not associated with a tenant');
    }

    // Parse request body
    const body: ExtractAddressesRequest = await request.json();
    const { polygon, targetingAreaName, stormEventId } = body;

    logger.info('Extraction request received', { tenantId, targetingAreaName, stormEventId, polygonPoints: polygon?.coordinates?.length });

    // Validate polygon
    if (!polygon || !polygon.coordinates || polygon.coordinates.length < 3) {
      logger.error('Invalid polygon received:', { polygon });
      throw ValidationError('Invalid polygon: must have at least 3 coordinates');
    }

    logger.info('Starting address extraction', { tenantId, polygonPoints: polygon.coordinates.length });

    // Convert to WKT for database operations
    const polygonWKT = polygonToPostGIS(polygon);

    // Calculate area to validate size (prevent timeouts)
    const areaSquareMiles = calculateAreaSquareMiles(polygonWKT);
    logger.info('Calculated area', { areaSquareMiles: areaSquareMiles.toFixed(2) });

    // Validate area size
    const MAX_AREA_SQ_MILES = 10; // Limit to 10 sq mi to prevent timeouts
    if (areaSquareMiles > MAX_AREA_SQ_MILES) {
      return NextResponse.json(
        {
          success: false,
          error: `Area too large (${areaSquareMiles.toFixed(1)} sq mi). Please draw a smaller area (max ${MAX_AREA_SQ_MILES} sq mi). For large areas, break them into smaller sections.`,
        },
        { status: 400 }
      );
    }

    // STEP 1: Extract addresses using Google Places API
    logger.info('[1/4] Extracting addresses from Google Places');

    const extractionResult = await googlePlacesClient.extractAddresses(polygon);

    logger.info('[1/4] Google Places results', {
      total: extractionResult.stats.totalBuildings,
      residential: extractionResult.stats.residentialCount,
      commercial: extractionResult.stats.commercialCount,
    });

    // Check if we have any results
    if (extractionResult.addresses.length === 0) {
      const debugMessage = extractionResult.stats.totalBuildings === 0
        ? 'No buildings found in this area. This area may be too rural or sparsely populated.'
        : `Found ${extractionResult.stats.totalBuildings} buildings, but all were filtered as non-residential.`;

      logger.warn('[1/4] No residential addresses found', { debugMessage });

      return NextResponse.json<ExtractAddressesResponse>({
        success: true,
        addresses: [],
        error: debugMessage,
        stats: {
          totalBuildings: extractionResult.stats.totalBuildings,
          residentialCount: 0,
          commercialCount: extractionResult.stats.commercialCount,
          areaSquareMiles,
          estimatedProperties: 0,
          processingTimeMs: extractionResult.stats.processingTimeMs,
        },
      });
    }

    logger.info('[1/4] Found residential addresses', { count: extractionResult.stats.residentialCount });

    // STEP 2: Geocode addresses (lat/lng → full address)
    logger.info('[2/4] Geocoding addresses with Google Maps');
    const enrichedAddresses = await geocodingClient.enrichAddressesWithGeocoding(
      extractionResult.addresses
    );

    const successfulGeocodes = enrichedAddresses.filter(
      (a) => a.fullAddress && a.confidence > 0.5
    ).length;
    logger.info('[2/4] Geocoding complete', { successfulGeocodes, total: enrichedAddresses.length });

    // STEP 3: Create targeting area in database
    logger.info('[3/4] Saving targeting area to database');
    const areaName = targetingAreaName || `Area ${new Date().toISOString().split('T')[0]}`;

    const { data: targetingArea, error: areaError } = await supabase
      .from('storm_targeting_areas')
      .insert({
        tenant_id: tenantId,
        name: areaName,
        boundary_polygon: polygonWKT,
        storm_event_id: stormEventId || null,
        area_sq_miles: areaSquareMiles,
        address_count: enrichedAddresses.length,
        estimated_properties: Math.round(areaSquareMiles * 75),
        status: 'extracted',
        created_by: user.id,
      })
      .select('id')
      .single();

    if (areaError || !targetingArea) {
      logger.error('Failed to create targeting area:', { error: areaError });
      throw InternalError('Failed to save targeting area: ' + areaError?.message);
    }

    const targetingAreaId = targetingArea.id;
    logger.info('[3/4] Created targeting area', { targetingAreaId });

    // STEP 4: Save extracted addresses to database
    logger.info('[4/4] Saving extracted addresses');
    const addressRecords = enrichedAddresses.map((addr) => ({
      tenant_id: tenantId,
      targeting_area_id: targetingAreaId,
      latitude: addr.lat,
      longitude: addr.lng,
      full_address: addr.fullAddress,
      street_address: addr.streetAddress,
      city: addr.city,
      state: addr.state,
      zip_code: addr.zipCode,
      osm_property_type: addr.osmPropertyType,
      osm_building_type: addr.osmBuildingType,
      is_enriched: false, // Not yet enriched with property data
      is_selected: true, // Selected for import by default
      is_duplicate: false,
    }));

    const { error: addressError } = await supabase
      .from('extracted_addresses')
      .insert(addressRecords);

    if (addressError) {
      logger.error('Failed to save addresses:', { error: addressError });
      // Don't fail the request - addresses were extracted successfully
      logger.warn('Addresses extracted but not saved to DB');
    } else {
      logger.info(`Saved ${addressRecords.length} addresses`);
    }

    // STEP 5: Return response
    const response: ExtractAddressesResponse = {
      success: true,
      targetingAreaId,
      addresses: enrichedAddresses,
      stats: {
        totalBuildings: extractionResult.stats.totalBuildings,
        residentialCount: extractionResult.stats.residentialCount,
        commercialCount: extractionResult.stats.commercialCount,
        areaSquareMiles,
        estimatedProperties: Math.round(areaSquareMiles * 75),
        processingTimeMs: extractionResult.stats.processingTimeMs,
      },
    };

    logger.info('Address extraction complete', { tenantId });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Address extraction error:', { error });
    return errorResponse(error instanceof Error ? error : InternalError());
  }
}

// =====================================================
// OPTIONS - CORS Support
// =====================================================

export async function OPTIONS() {
  // Use specific origin from env, not wildcard
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'https://roofing-saas.vercel.app';

  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
