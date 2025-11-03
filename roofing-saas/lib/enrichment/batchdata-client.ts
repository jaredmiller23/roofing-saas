/**
 * BatchData API Client
 *
 * Client for BatchData property enrichment API
 * Handles property lookups, error handling, rate limiting, and response parsing
 *
 * API Documentation: https://developer.batchdata.com/docs
 */

import type {
  AddressInput,
  BatchDataConfig,
  BatchDataPropertyResponse,
  PropertyEnrichmentResult,
  EnrichmentError,
} from './types';
import { calculateQualityScore, calculateCompleteness, generateAddressHash } from './types';

// =====================================================
// CLIENT CLASS
// =====================================================

export class BatchDataClient {
  private config: Required<BatchDataConfig>;
  private requestCount = 0;
  private lastRequestTime = 0;
  private minDelayMs = 100; // Minimum 100ms between requests

  constructor(config: BatchDataConfig) {
    this.config = {
      api_key: config.api_key,
      base_url: config.base_url || 'https://api.batchdata.com/api/v1',
      timeout_ms: config.timeout_ms || 30000,
    };

    if (!this.config.api_key) {
      throw new Error('BatchData API key is required');
    }
  }

  /**
   * Enrich a single property by address
   */
  async enrichProperty(address: AddressInput): Promise<PropertyEnrichmentResult> {
    try {
      // Rate limiting
      await this.rateLimit();

      // Build query parameters
      const params = this.buildQueryParams(address);

      // Make API request
      const response = await this.makeRequest<BatchDataPropertyResponse>(
        '/property/lookup',
        params
      );

      // Parse and transform response
      const result = this.transformResponse(address, response);

      return result;
    } catch (error) {
      return this.handleError(address, error);
    }
  }

  /**
   * Enrich multiple properties in batch
   * Automatically handles rate limiting and retries
   */
  async enrichPropertyBatch(
    addresses: AddressInput[],
    options: {
      onProgress?: (completed: number, total: number) => void;
      batchSize?: number;
      delayMs?: number;
      maxRetries?: number;
    } = {}
  ): Promise<PropertyEnrichmentResult[]> {
    const {
      onProgress,
      batchSize = 50,
      delayMs = 100,
      maxRetries = 3,
    } = options;

    const results: PropertyEnrichmentResult[] = [];
    const total = addresses.length;

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);

      // Process batch with retry logic
      const batchResults = await Promise.allSettled(
        batch.map(address => this.enrichPropertyWithRetry(address, maxRetries))
      );

      // Extract results
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Shouldn't happen with retry logic, but handle anyway
          results.push({
            success: false,
            provider: 'batchdata',
            address_hash: '',
            full_address: 'Unknown',
            error: result.reason?.message || 'Unknown error',
          });
        }
      }

      // Report progress
      const completed = Math.min(i + batchSize, total);
      if (onProgress) {
        onProgress(completed, total);
      }

      // Delay between batches
      if (i + batchSize < addresses.length) {
        await this.delay(delayMs);
      }
    }

    return results;
  }

  /**
   * Enrich property with retry logic
   */
  private async enrichPropertyWithRetry(
    address: AddressInput,
    maxRetries: number
  ): Promise<PropertyEnrichmentResult> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.enrichProperty(address);

        // If successful, return
        if (result.success) {
          return result;
        }

        // If address not found (not a temporary error), don't retry
        if (result.error?.includes('not found') || result.error?.includes('invalid')) {
          return result;
        }

        lastError = new Error(result.error || 'Enrichment failed');
      } catch (error) {
        lastError = error;

        // Don't retry on authentication or rate limit errors
        if (
          error instanceof Error &&
          (error.message.includes('authentication') ||
            error.message.includes('rate limit'))
        ) {
          break;
        }
      }

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxRetries) {
        await this.delay(1000 * Math.pow(2, attempt));
      }
    }

    // All retries failed
    return this.handleError(address, lastError);
  }

  /**
   * Build query parameters for API request
   */
  private buildQueryParams(address: AddressInput): Record<string, string> {
    const params: Record<string, string> = {};

    if (address.full_address) {
      params.address = address.full_address;
    } else {
      // Build from components
      const components: string[] = [];
      if (address.street_address) components.push(address.street_address);
      if (address.city) components.push(address.city);
      if (address.state) components.push(address.state);
      if (address.zip_code) components.push(address.zip_code);
      params.address = components.join(', ');
    }

    // Optional: Add lat/lng for better accuracy
    if (address.latitude && address.longitude) {
      params.latitude = address.latitude.toString();
      params.longitude = address.longitude.toString();
    }

    return params;
  }

  /**
   * Make HTTP request to BatchData API
   */
  private async makeRequest<T>(
    endpoint: string,
    params: Record<string, string>
  ): Promise<T> {
    const url = new URL(endpoint, this.config.base_url);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout_ms);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.api_key}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Track request
      this.requestCount++;

      // Handle HTTP errors
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('BatchData API authentication failed. Check your API key.');
        } else if (response.status === 429) {
          throw new Error('BatchData API rate limit exceeded. Please wait and try again.');
        } else if (response.status === 402) {
          throw new Error('Insufficient BatchData credits. Please add credits to your account.');
        } else if (response.status === 404) {
          throw new Error('Property not found in BatchData database.');
        } else {
          const errorText = await response.text();
          throw new Error(
            `BatchData API error (${response.status}): ${errorText}`
          );
        }
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      clearTimeout(timeout);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(
            `BatchData API request timed out after ${this.config.timeout_ms}ms`
          );
        }
        throw error;
      }

      throw new Error('Unknown error during BatchData API request');
    }
  }

  /**
   * Transform BatchData API response to our standard format
   */
  private transformResponse(
    address: AddressInput,
    response: BatchDataPropertyResponse
  ): PropertyEnrichmentResult {
    if (response.status !== 'success' || !response.data) {
      return {
        success: false,
        provider: 'batchdata',
        address_hash: generateAddressHash(address),
        full_address: address.full_address || 'Unknown',
        error: response.message || 'No data returned from BatchData',
      };
    }

    const data = response.data;

    // Build result
    const result: PropertyEnrichmentResult = {
      success: true,
      provider: 'batchdata',
      provider_id: data.property_id,

      // Address
      address_hash: generateAddressHash({
        street_address: data.street_address,
        city: data.city,
        state: data.state,
        zip_code: data.zip_code,
      }),
      full_address: data.formatted_address,
      street_address: data.street_address,
      city: data.city,
      state: data.state,
      zip_code: data.zip_code,
      latitude: data.latitude,
      longitude: data.longitude,

      // Owner
      owner_name: data.owner_name,
      owner_mailing_address: data.mailing_address
        ? `${data.mailing_address.street}, ${data.mailing_address.city}, ${data.mailing_address.state} ${data.mailing_address.zip}`
        : undefined,

      // Property Details
      property_type: this.normalizePropertyType(data.property_type || data.property_use),
      year_built: data.year_built || data.effective_year_built,
      square_footage: data.building_sqft,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      lot_size: data.lot_sqft,
      stories: data.stories,

      // Financial
      assessed_value: data.assessed_value,
      market_value: data.market_value,
      last_sale_date: data.last_sale_date,
      last_sale_price: data.last_sale_price,
      equity_estimate: this.calculateEquity(data.market_value, data.mortgage_amount),
      mortgage_balance: data.mortgage_amount,

      // Roof Data
      roof_material: data.roof_cover || data.roof_type,
      roof_age: this.calculateRoofAge(data.year_built),
      roof_condition: undefined, // BatchData doesn't provide this

      // Raw data for reference
      property_data: data,

      // Timestamps
      enriched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 180 days

      // Cache info
      cached: false,
      cache_hit: false,
    };

    // Calculate quality scores
    result.quality_score = calculateQualityScore(result);
    result.data_completeness = calculateCompleteness(result);
    result.confidence = data.confidence_score || 85; // Default to 85 if not provided

    return result;
  }

  /**
   * Handle API errors
   */
  private handleError(address: AddressInput, error: any): PropertyEnrichmentResult {
    const addressHash = generateAddressHash(address);
    const fullAddress = address.full_address || 'Unknown';

    let errorType: EnrichmentError['error_type'] = 'unknown_error';
    let errorMessage = 'Unknown error';

    if (error instanceof Error) {
      errorMessage = error.message;

      if (errorMessage.includes('not found')) {
        errorType = 'address_not_found';
      } else if (errorMessage.includes('invalid')) {
        errorType = 'invalid_address';
      } else if (errorMessage.includes('authentication')) {
        errorType = 'authentication_error';
      } else if (errorMessage.includes('rate limit')) {
        errorType = 'rate_limit';
      } else if (errorMessage.includes('timed out')) {
        errorType = 'timeout';
      } else if (errorMessage.includes('credits')) {
        errorType = 'insufficient_credits';
      } else if (errorMessage.includes('network')) {
        errorType = 'network_error';
      } else {
        errorType = 'api_error';
      }
    }

    return {
      success: false,
      provider: 'batchdata',
      address_hash: addressHash,
      full_address: fullAddress,
      error: errorMessage,
      error_details: {
        error_type: errorType,
        original_error: error?.toString(),
      },
    };
  }

  /**
   * Rate limiting helper
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minDelayMs) {
      await this.delay(this.minDelayMs - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Normalize property type to our standard values
   */
  private normalizePropertyType(type?: string): string {
    if (!type) return 'residential';

    const normalized = type.toLowerCase();

    if (normalized.includes('single') || normalized.includes('residential')) {
      return 'residential';
    } else if (normalized.includes('multi') || normalized.includes('apartment')) {
      return 'multi-family';
    } else if (normalized.includes('commercial') || normalized.includes('office')) {
      return 'commercial';
    } else if (normalized.includes('industrial')) {
      return 'industrial';
    } else if (normalized.includes('land') || normalized.includes('vacant')) {
      return 'land';
    }

    return 'residential'; // Default
  }

  /**
   * Calculate estimated equity
   */
  private calculateEquity(
    marketValue?: number,
    mortgageBalance?: number
  ): number | undefined {
    if (marketValue && mortgageBalance != null) {
      return Math.max(0, marketValue - mortgageBalance);
    }
    return undefined;
  }

  /**
   * Calculate approximate roof age
   * Note: This is an estimate based on property age
   * Real roof age requires specialized data providers
   */
  private calculateRoofAge(yearBuilt?: number): number | undefined {
    if (!yearBuilt) return undefined;

    const currentYear = new Date().getFullYear();
    const propertyAge = currentYear - yearBuilt;

    // Assume roof was replaced if property is >25 years old
    // Average roof lifespan: 20-25 years
    if (propertyAge > 25) {
      // Estimate last roof replacement was 15 years ago
      return 15;
    }

    // Otherwise, assume original roof
    return propertyAge;
  }

  /**
   * Get client statistics
   */
  getStats(): {
    requestCount: number;
    lastRequestTime: number;
  } {
    return {
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }
}

// =====================================================
// FACTORY FUNCTION
// =====================================================

/**
 * Create BatchData client from environment variables
 */
export function createBatchDataClient(): BatchDataClient {
  const apiKey = process.env.BATCHDATA_API_KEY;

  if (!apiKey) {
    throw new Error(
      'BATCHDATA_API_KEY environment variable is not set. ' +
      'Please add it to your .env.local file.'
    );
  }

  return new BatchDataClient({
    api_key: apiKey,
    base_url: process.env.BATCHDATA_API_URL,
    timeout_ms: process.env.BATCHDATA_TIMEOUT_MS
      ? parseInt(process.env.BATCHDATA_TIMEOUT_MS)
      : undefined,
  });
}

// =====================================================
// EXPORTS
// =====================================================

export default BatchDataClient;
