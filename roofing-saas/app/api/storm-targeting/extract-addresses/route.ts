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
 * Calculate area of polygon in square miles (using PostGIS)
 */
async function calculateAreaSquareMiles(
  supabase: any,
  polygonWKT: string
): Promise<number> {
  const { data, error } = await supabase.rpc('calculate_polygon_area_sq_miles', {
    poly: polygonWKT,
  });

  if (error || !data) {
    console.warn('Failed to calculate area, using estimate:', error);
    return 0;
  }

  return parseFloat(data);
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
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tenantId = await getUserTenantId(user.id);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'User not associated with a tenant' },
        { status: 403 }
      );
    }

    // Parse request body
    const body: ExtractAddressesRequest = await request.json();
    const { polygon, targetingAreaName, stormEventId } = body;

    console.log(`[${tenantId}] === EXTRACTION REQUEST RECEIVED ===`);
    console.log('Request body:', { targetingAreaName, stormEventId, polygonPoints: polygon?.coordinates?.length });
    console.log('Polygon coordinates received:', polygon?.coordinates);

    // Validate polygon
    if (!polygon || !polygon.coordinates || polygon.coordinates.length < 3) {
      console.error('Invalid polygon received:', polygon);
      return NextResponse.json(
        { success: false, error: 'Invalid polygon: must have at least 3 coordinates' },
        { status: 400 }
      );
    }

    console.log(`[${tenantId}] Starting address extraction...`);
    console.log(`Polygon: ${polygon.coordinates.length} points`);

    // Convert to WKT for database operations
    const polygonWKT = polygonToPostGIS(polygon);

    // Calculate area to validate size (prevent timeouts)
    const areaSquareMiles = await calculateAreaSquareMiles(supabase, polygonWKT);
    console.log(`Area: ${areaSquareMiles.toFixed(2)} square miles`);

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
    console.log('[1/4] Extracting addresses from Google Places (cost: $0.017)...');

    const extractionResult = await googlePlacesClient.extractAddresses(polygon);

    console.log(`[1/4] ✓ Google Places Results:`, {
      total: extractionResult.stats.totalBuildings,
      residential: extractionResult.stats.residentialCount,
      commercial: extractionResult.stats.commercialCount,
    });

    // Check if we have any results
    if (extractionResult.addresses.length === 0) {
      const debugMessage = extractionResult.stats.totalBuildings === 0
        ? 'No buildings found in this area. This area may be too rural or sparsely populated.'
        : `Found ${extractionResult.stats.totalBuildings} buildings, but all were filtered as non-residential.`;

      console.warn('[1/4] ⚠️ No residential addresses found:', debugMessage);

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

    console.log(`[1/4] ✓ Found ${extractionResult.stats.residentialCount} residential addresses`);

    // STEP 2: Geocode addresses (lat/lng → full address)
    console.log('[2/4] Geocoding addresses with Google Maps...');
    const enrichedAddresses = await geocodingClient.enrichAddressesWithGeocoding(
      extractionResult.addresses
    );

    const successfulGeocodes = enrichedAddresses.filter(
      (a) => a.fullAddress && a.confidence > 0.5
    ).length;
    console.log(
      `[2/4] ✓ Geocoded ${successfulGeocodes}/${enrichedAddresses.length} addresses`
    );

    // STEP 3: Create targeting area in database
    console.log('[3/4] Saving targeting area to database...');
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
      console.error('Failed to create targeting area:', areaError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to save targeting area: ' + areaError?.message,
        },
        { status: 500 }
      );
    }

    const targetingAreaId = targetingArea.id;
    console.log(`[3/4] ✓ Created targeting area: ${targetingAreaId}`);

    // STEP 4: Save extracted addresses to database
    console.log('[4/4] Saving extracted addresses...');
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
      console.error('Failed to save addresses:', addressError);
      // Don't fail the request - addresses were extracted successfully
      console.warn('Addresses extracted but not saved to DB');
    } else {
      console.log(`[4/4] ✓ Saved ${addressRecords.length} addresses`);
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

    console.log(`[${tenantId}] ✓ Address extraction complete`);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Address extraction error:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during address extraction',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// OPTIONS - CORS Support
// =====================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
