/**
 * GOOGLE PLACES API CLIENT
 * Fallback for areas not mapped in OpenStreetMap
 * Cost: ~$0.017 per place search
 */

import type {
  Polygon,
  BoundingBox,
  ExtractedAddress,
  AddressExtractionResult,
} from './types';

// =====================================================
// HELPER FUNCTIONS
// =====================================================

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
 * Calculate center point of polygon
 */
function calculateCenterPoint(polygon: Polygon): { lat: number; lng: number } {
  const lats = polygon.coordinates.map((p) => p.lat);
  const lngs = polygon.coordinates.map((p) => p.lng);

  return {
    lat: (Math.max(...lats) + Math.min(...lats)) / 2,
    lng: (Math.max(...lngs) + Math.min(...lngs)) / 2,
  };
}

/**
 * Calculate radius of search area (in meters)
 */
function calculateRadius(bbox: BoundingBox): number {
  // Calculate distance between corners in meters
  // Rough approximation: 1 degree lat ≈ 111km, 1 degree lng ≈ 111km * cos(lat)
  const latDiff = bbox.north - bbox.south;
  const lngDiff = bbox.east - bbox.west;
  const avgLat = (bbox.north + bbox.south) / 2;

  const latMeters = latDiff * 111000;
  const lngMeters = lngDiff * 111000 * Math.cos((avgLat * Math.PI) / 180);

  // Return diagonal distance / 2 (radius)
  const diagonal = Math.sqrt(latMeters ** 2 + lngMeters ** 2);
  return Math.min(diagonal / 2, 50000); // Max radius 50km
}

// =====================================================
// GOOGLE PLACES CLIENT
// =====================================================

export class GooglePlacesClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }
  }

  /**
   * Extract addresses using Google Places API (New)
   * Uses Nearby Search with Text Search fallback
   * NOTE: This costs money! ~$0.017 per request
   */
  async extractAddresses(polygon: Polygon): Promise<AddressExtractionResult> {
    const startTime = Date.now();

    console.log('[Google Places] Extracting addresses using NEW API...');

    const bbox = calculateBoundingBox(polygon);
    const center = calculateCenterPoint(polygon);
    const radius = Math.min(calculateRadius(bbox), 50000); // Max 50km

    console.log(`[Google Places] Center: ${center.lat},${center.lng}, Radius: ${radius}m`);

    // Use the NEW Places API with Text Search
    // This searches for residential properties within the area
    const url = new URL('https://places.googleapis.com/v1/places:searchText');

    const requestBody = {
      textQuery: 'residential houses',
      locationBias: {
        circle: {
          center: {
            latitude: center.lat,
            longitude: center.lng,
          },
          radius,
        },
      },
      maxResultCount: 20, // Maximum per request
    };

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': 'places.location,places.formattedAddress,places.types',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Google Places] API error:', data);
      throw new Error(`Google Places API error: ${data.error?.message || response.statusText}`);
    }

    const places = data.places || [];
    console.log(`[Google Places] Found ${places.length} places`);

    // Convert to ExtractedAddress format
    const addresses: ExtractedAddress[] = places.map((place: Record<string, unknown>) => {
      const location = place.location as any;
      return {
        lat: location?.latitude || 0,
        lng: location?.longitude || 0,
        fullAddress: place.formattedAddress as string,
        source: 'google_places' as const,
        confidence: 0.8,
        isResidential: true, // We searched for residential, so assume all are residential
      };
    });

    const processingTimeMs = Date.now() - startTime;

    return {
      addresses,
      stats: {
        totalBuildings: places.length,
        residentialCount: addresses.length,
        commercialCount: 0,
        unknownCount: 0,
        processingTimeMs,
      },
      boundingBox: bbox,
      areaSquareMiles: 0, // Not calculated for Google Places
    };
  }
}

// =====================================================
// EXPORTS
// =====================================================

/**
 * Singleton instance
 */
export const googlePlacesClient = new GooglePlacesClient();

/**
 * Convenience function for extracting addresses
 */
export async function extractAddressesWithGooglePlaces(
  polygon: Polygon
): Promise<AddressExtractionResult> {
  return googlePlacesClient.extractAddresses(polygon);
}
