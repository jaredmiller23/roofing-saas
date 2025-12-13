/**
 * GOOGLE MAPS GEOCODING CLIENT
 * Batch reverse geocoding (lat/lng → full address)
 * Converts OSM coordinates to complete addresses
 */

import type {
  GeocodingRequest,
  GeocodingResponse,
  BatchGeocodingResult,
  ExtractedAddress,
} from './types';
import { logger } from '@/lib/logger';

// =====================================================
// CONSTANTS
// =====================================================

const GOOGLE_GEOCODING_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

// Pricing (as of 2024)
const COST_PER_GEOCODE = 0.005; // $0.005 per request
const BATCH_SIZE = 10; // Process in batches to avoid rate limiting
const BATCH_DELAY_MS = 100; // Delay between batches
const MAX_RETRIES = 3;

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse Google Geocoding API response to extract address components
 */
function parseGoogleGeocodingResult(result: Record<string, unknown>): Partial<GeocodingResponse> {
  if (!result || result.status === 'ZERO_RESULTS') {
    return {
      success: false,
      error: 'No results found',
    };
  }

  interface GoogleAddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
  }

  interface GoogleGeocodingResult {
    formatted_address: string;
    place_id: string;
    address_components: GoogleAddressComponent[];
    geometry?: {
      location_type?: string;
    };
  }

  const results = result.results as GoogleGeocodingResult[];
  const firstResult = results?.[0];
  if (!firstResult) {
    return {
      success: false,
      error: 'No results in response',
    };
  }

  // Extract address components
  const components = firstResult.address_components || [];
  const parsed: Partial<GeocodingResponse> = {
    success: true,
    fullAddress: firstResult.formatted_address,
    formattedAddress: firstResult.formatted_address,
    placeId: firstResult.place_id,
    locationType: firstResult.geometry?.location_type,
  };

  // Parse address components
  for (const component of components) {
    const types = component.types || [];

    if (types.includes('street_number')) {
      parsed.streetNumber = component.long_name;
    } else if (types.includes('route')) {
      parsed.streetName = component.long_name;
    } else if (types.includes('locality')) {
      parsed.city = component.long_name;
    } else if (types.includes('administrative_area_level_2')) {
      parsed.county = component.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      parsed.state = component.short_name; // e.g., "TN"
    } else if (types.includes('postal_code')) {
      parsed.zipCode = component.long_name;
    } else if (types.includes('country')) {
      parsed.country = component.short_name;
    }
  }

  return parsed;
}

/**
 * Format address components into full address
 */
function formatFullAddress(geocoded: Partial<GeocodingResponse>): string | undefined {
  if (geocoded.formattedAddress) {
    return geocoded.formattedAddress;
  }

  // Fallback: construct from components
  const parts: string[] = [];

  if (geocoded.streetNumber && geocoded.streetName) {
    parts.push(`${geocoded.streetNumber} ${geocoded.streetName}`);
  }

  if (geocoded.city) {
    parts.push(geocoded.city);
  }

  if (geocoded.state) {
    parts.push(geocoded.state);
  }

  if (geocoded.zipCode) {
    parts.push(geocoded.zipCode);
  }

  return parts.length > 0 ? parts.join(', ') : undefined;
}

// =====================================================
// GEOCODING CLIENT
// =====================================================

export class GeocodingClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

    if (!this.apiKey) {
      console.warn('Google Maps API key not configured');
    }
  }

  /**
   * Reverse geocode single location
   */
  async reverseGeocode(
    lat: number,
    lng: number,
    retryCount: number = 0
  ): Promise<GeocodingResponse> {
    if (!this.apiKey) {
      return {
        lat,
        lng,
        success: false,
        error: 'Google Maps API key not configured',
      };
    }

    try {
      const url = `${GOOGLE_GEOCODING_API_URL}?latlng=${lat},${lng}&key=${this.apiKey}&result_type=street_address|premise`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === 'OVER_QUERY_LIMIT' && retryCount < MAX_RETRIES) {
        // Rate limited - exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        console.warn(`Google Geocoding rate limited, retrying in ${delay}ms...`);
        await sleep(delay);
        return this.reverseGeocode(lat, lng, retryCount + 1);
      }

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        return {
          lat,
          lng,
          success: false,
          error: `Geocoding error: ${data.status} - ${data.error_message || ''}`,
        };
      }

      const parsed = parseGoogleGeocodingResult(data);

      return {
        lat,
        lng,
        ...parsed,
        success: !!parsed.success,
      };
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.warn(`Geocoding request failed, retrying in ${delay}ms...`, error);
        await sleep(delay);
        return this.reverseGeocode(lat, lng, retryCount + 1);
      }

      return {
        lat,
        lng,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Batch reverse geocode multiple locations
   * Processes in batches to respect rate limits
   */
  async batchReverseGeocode(
    requests: GeocodingRequest[]
  ): Promise<BatchGeocodingResult> {
    const startTime = Date.now();
    const results: GeocodingResponse[] = [];

    // Process in batches
    for (let i = 0; i < requests.length; i += BATCH_SIZE) {
      const batch = requests.slice(i, i + BATCH_SIZE);

      logger.info('Geocoding batch', {
        batch: Math.floor(i / BATCH_SIZE) + 1,
        totalBatches: Math.ceil(requests.length / BATCH_SIZE),
        batchSize: batch.length,
      });

      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map((req) => this.reverseGeocode(req.lat, req.lng))
      );

      results.push(...batchResults);

      // Delay between batches (except for last batch)
      if (i + BATCH_SIZE < requests.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    // Calculate stats
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const processingTimeMs = Date.now() - startTime;
    const costEstimate = results.length * COST_PER_GEOCODE;

    const stats = {
      total: results.length,
      successful,
      failed,
      processingTimeMs,
      costEstimate,
    };

    logger.info('Batch geocoding complete', {
      successful,
      failed,
      timeSeconds: (processingTimeMs / 1000).toFixed(1),
      costUSD: costEstimate.toFixed(2),
    });

    return {
      results,
      stats,
    };
  }

  /**
   * Enrich extracted addresses with geocoded data
   * Merges geocoding results back into extracted addresses
   */
  async enrichAddressesWithGeocoding(
    addresses: ExtractedAddress[]
  ): Promise<ExtractedAddress[]> {
    logger.info('Enriching addresses with geocoding', { count: addresses.length });

    // Prepare geocoding requests
    const requests: GeocodingRequest[] = addresses.map((addr) => ({
      lat: addr.lat,
      lng: addr.lng,
    }));

    // Batch geocode
    const geocodeResult = await this.batchReverseGeocode(requests);

    // Merge results
    const enriched: ExtractedAddress[] = addresses.map((addr, index) => {
      const geocoded = geocodeResult.results[index];

      if (!geocoded || !geocoded.success) {
        // Keep original address, mark low confidence
        return {
          ...addr,
          confidence: 0.3,
        };
      }

      // Merge geocoded data
      return {
        ...addr,
        fullAddress: formatFullAddress(geocoded),
        streetAddress: geocoded.streetNumber && geocoded.streetName
          ? `${geocoded.streetNumber} ${geocoded.streetName}`
          : undefined,
        city: geocoded.city,
        state: geocoded.state,
        zipCode: geocoded.zipCode,
        county: geocoded.county,
        confidence: geocoded.locationType === 'ROOFTOP' ? 0.95 : 0.75,
      };
    });

    return enriched;
  }
}

// =====================================================
// EXPORTS
// =====================================================

/**
 * Singleton instance
 */
export const geocodingClient = new GeocodingClient();

/**
 * Convenience function for batch geocoding
 */
export async function batchReverseGeocode(
  requests: GeocodingRequest[]
): Promise<BatchGeocodingResult> {
  return geocodingClient.batchReverseGeocode(requests);
}

/**
 * Convenience function for enriching addresses
 */
export async function enrichAddressesWithGeocoding(
  addresses: ExtractedAddress[]
): Promise<ExtractedAddress[]> {
  return geocodingClient.enrichAddressesWithGeocoding(addresses);
}

/**
 * Estimate geocoding cost
 */
export function estimateGeocodingCost(addressCount: number): number {
  return addressCount * COST_PER_GEOCODE;
}
