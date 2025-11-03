/**
 * Tracerfy Skip Tracing API Client
 *
 * Provides skip tracing (owner contact lookup) services for properties
 * Perfect for door-knock follow-ups when you have owner names
 *
 * API Documentation: https://tracerfy.com/skip-tracing-api-documentation/
 * Pricing: $0.009 per lookup
 *
 * IMPORTANT: Requires first_name and last_name as input (not just addresses)
 * Use case: Door-knock rep gets name → enrich with phone/email
 */

import crypto from 'crypto';
import type {
  AddressInput,
  PropertyEnrichmentResult,
  EnrichmentError,
  TracerfyConfig,
  TracerfySkipTraceResponse,
} from './types';

// =====================================================
// CONFIGURATION
// =====================================================

const DEFAULT_CONFIG: Required<Omit<TracerfyConfig, 'api_key'>> = {
  base_url: 'https://tracerfy.com/v1/api',
  timeout_ms: 30000, // 30 seconds
  poll_interval_ms: 5000, // 5 seconds
  max_poll_attempts: 60, // 5 minutes total
};

// =====================================================
// TRACERFY API TYPES
// =====================================================

interface TracerfyQueueResponse {
  message: string;
  queue_id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

interface TracerfyQueueStatusResponse {
  queue_id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_records: number;
  processed_records: number;
  results?: Array<{
    first_name: string;
    last_name: string;
    full_name?: string;
    address: string;
    city: string;
    state: string;
    mail_address?: string;
    mail_city?: string;
    mail_state?: string;
    primary_phone?: string;
    mobile_1?: string;
    mobile_2?: string;
    mobile_3?: string;
    mobile_4?: string;
    mobile_5?: string;
    landline_1?: string;
    landline_2?: string;
    landline_3?: string;
    email_1?: string;
    email_2?: string;
    email_3?: string;
    email_4?: string;
    email_5?: string;
    match_score?: number;
    data_sources?: string[];
    last_verified?: string;
    created_at?: string;
  }>;
  error?: string;
}

// =====================================================
// TRACERFY CLIENT
// =====================================================

export class TracerfyClient {
  private config: Required<TracerfyConfig>;
  private requestCount = 0;

  constructor(config: TracerfyConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    if (!this.config.api_key) {
      throw new Error('Tracerfy API key is required');
    }
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  /**
   * Enrich a single property with owner contact information
   * Requires first_name and last_name
   */
  async enrichProperty(address: AddressInput): Promise<PropertyEnrichmentResult> {
    // Validate required fields
    this.validateInput(address);

    try {
      // Submit trace job
      const queueResponse = await this.submitTraceJob([address]);

      // Poll for results
      const results = await this.pollForResults(queueResponse.queue_id);

      // Transform first result
      if (!results || results.length === 0) {
        return this.createNotFoundResult(address);
      }

      return this.transformResponse(address, results[0]);
    } catch (error) {
      console.error('Tracerfy enrichment error:', error);
      throw this.handleError(error, address);
    }
  }

  /**
   * Enrich multiple properties in batch
   * Supports progress callbacks and retry logic
   */
  async enrichPropertyBatch(
    addresses: AddressInput[],
    options: {
      onProgress?: (processed: number, total: number) => void;
      maxRetries?: number;
    } = {}
  ): Promise<PropertyEnrichmentResult[]> {
    const { onProgress, maxRetries = 3 } = options;

    // Validate all addresses
    const validAddresses: AddressInput[] = [];
    const invalidResults: PropertyEnrichmentResult[] = [];

    for (const address of addresses) {
      try {
        this.validateInput(address);
        validAddresses.push(address);
      } catch (error) {
        // Create error result for invalid address
        invalidResults.push({
          success: false,
          provider: 'tracerfy',
          address_hash: this.generateAddressHash(address),
          full_address: address.full_address || `${address.street_address}, ${address.city}, ${address.state}`,
          owner_name: `${address.first_name} ${address.last_name}`.trim(),
          quality_score: 0,
          data_completeness: 0,
        });
      }
    }

    if (validAddresses.length === 0) {
      return invalidResults;
    }

    // Submit trace job for valid addresses
    try {
      const queueResponse = await this.submitTraceJob(validAddresses);

      // Poll for results with progress updates
      const results = await this.pollForResults(queueResponse.queue_id, (processed, total) => {
        if (onProgress) {
          onProgress(processed + invalidResults.length, addresses.length);
        }
      });

      // Transform all results
      const enrichedResults: PropertyEnrichmentResult[] = [];

      for (let i = 0; i < validAddresses.length; i++) {
        const address = validAddresses[i];
        const result = results?.[i];

        if (result) {
          enrichedResults.push(this.transformResponse(address, result));
        } else {
          enrichedResults.push(this.createNotFoundResult(address));
        }
      }

      // Combine with invalid results
      return [...invalidResults, ...enrichedResults];
    } catch (error) {
      console.error('Tracerfy batch enrichment error:', error);

      // Return error results for all addresses
      return addresses.map((address) =>
        this.createErrorResult(address, error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  // =====================================================
  // PRIVATE API
  // =====================================================

  /**
   * Validate input has required fields for Tracerfy
   */
  private validateInput(address: AddressInput): void {
    if (!address.first_name || !address.last_name) {
      throw new Error(
        'Tracerfy requires first_name and last_name. ' +
          'Use this provider for door-knock follow-ups when you have owner names.'
      );
    }

    if (!address.street_address && !address.full_address) {
      throw new Error('Address is required (street_address or full_address)');
    }

    if (!address.city) {
      throw new Error('City is required');
    }

    if (!address.state) {
      throw new Error('State is required');
    }
  }

  /**
   * Submit skip trace job to Tracerfy
   * Returns queue_id for polling
   */
  private async submitTraceJob(addresses: AddressInput[]): Promise<TracerfyQueueResponse> {
    // Convert addresses to CSV format (Tracerfy expects CSV or JSON array)
    const csvData = this.convertToCSV(addresses);

    // Submit as form data (multipart/form-data)
    const formData = new FormData();
    formData.append('file', new Blob([csvData], { type: 'text/csv' }), 'addresses.csv');
    formData.append('first_name_column', 'first_name');
    formData.append('last_name_column', 'last_name');
    formData.append('address_column', 'address');
    formData.append('city_column', 'city');
    formData.append('state_column', 'state');

    const response = await this.makeRequest<TracerfyQueueResponse>('/trace/', {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type - let browser set it with boundary for multipart/form-data
        Authorization: `Bearer ${this.config.api_key}`,
      },
    });

    this.requestCount++;

    return response;
  }

  /**
   * Poll for job completion
   * Returns results when ready
   */
  private async pollForResults(
    queueId: number,
    onProgress?: (processed: number, total: number) => void
  ): Promise<TracerfyQueueStatusResponse['results']> {
    let attempts = 0;

    while (attempts < this.config.max_poll_attempts) {
      const status = await this.checkQueueStatus(queueId);

      // Report progress
      if (onProgress) {
        onProgress(status.processed_records, status.total_records);
      }

      // Check if complete
      if (status.status === 'completed') {
        return status.results;
      }

      // Check if failed
      if (status.status === 'failed') {
        throw new Error(status.error || 'Tracerfy job failed');
      }

      // Wait before next poll
      await this.sleep(this.config.poll_interval_ms);
      attempts++;
    }

    throw new Error(
      `Tracerfy job timed out after ${this.config.max_poll_attempts} attempts ` +
        `(${(this.config.max_poll_attempts * this.config.poll_interval_ms) / 1000}s)`
    );
  }

  /**
   * Check queue status
   */
  private async checkQueueStatus(queueId: number): Promise<TracerfyQueueStatusResponse> {
    return await this.makeRequest<TracerfyQueueStatusResponse>(`/queue/${queueId}`, {
      method: 'GET',
    });
  }

  /**
   * Make HTTP request to Tracerfy API
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit & { headers?: Record<string, string> } = {}
  ): Promise<T> {
    const url = `${this.config.base_url}${endpoint}`;

    const defaultHeaders: Record<string, string> = {
      Authorization: `Bearer ${this.config.api_key}`,
    };

    // Merge headers (don't override if already set, e.g., for multipart/form-data)
    const headers = {
      ...defaultHeaders,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
      signal: AbortSignal.timeout(this.config.timeout_ms),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorText;
      } catch {
        errorMessage = errorText;
      }

      // Map HTTP status codes to error types
      if (response.status === 401) {
        throw new Error(`Authentication failed: ${errorMessage}`);
      } else if (response.status === 402) {
        throw new Error(`Insufficient credits: ${errorMessage}`);
      } else if (response.status === 429) {
        throw new Error(`Rate limit exceeded: ${errorMessage}`);
      } else if (response.status === 400) {
        throw new Error(`Invalid request: ${errorMessage}`);
      } else {
        throw new Error(`Tracerfy API error (${response.status}): ${errorMessage}`);
      }
    }

    return (await response.json()) as T;
  }

  /**
   * Convert addresses to CSV format
   */
  private convertToCSV(addresses: AddressInput[]): string {
    const headers = ['first_name', 'last_name', 'address', 'city', 'state'];
    const rows = addresses.map((addr) => [
      addr.first_name || '',
      addr.last_name || '',
      addr.street_address || addr.full_address || '',
      addr.city || '',
      addr.state || '',
    ]);

    const csvLines = [headers.join(','), ...rows.map((row) => row.map(this.escapeCSV).join(','))];

    return csvLines.join('\n');
  }

  /**
   * Escape CSV field
   */
  private escapeCSV(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  /**
   * Transform Tracerfy response to standard format
   */
  private transformResponse(
    input: AddressInput,
    result: NonNullable<TracerfyQueueStatusResponse['results']>[0]
  ): PropertyEnrichmentResult {
    // Extract phone numbers with ranking
    const phones = [
      result.primary_phone,
      result.mobile_1,
      result.mobile_2,
      result.mobile_3,
      result.mobile_4,
      result.mobile_5,
      result.landline_1,
      result.landline_2,
      result.landline_3,
    ].filter(Boolean);

    // Extract emails with ranking
    const emails = [result.email_1, result.email_2, result.email_3, result.email_4, result.email_5].filter(
      Boolean
    );

    // Calculate quality score
    const qualityScore = this.calculateQualityScore({
      has_primary_phone: !!result.primary_phone,
      phone_count: phones.length,
      email_count: emails.length,
      has_mailing_address: !!(result.mail_address || result.mail_city),
      match_score: result.match_score || 0,
    });

    return {
      success: true,
      provider: 'tracerfy',

      // Address identification
      address_hash: this.generateAddressHash(input),
      full_address: input.full_address || `${input.street_address}, ${input.city}, ${input.state}`,
      street_address: result.address,
      city: result.city,
      state: result.state,

      // Owner information
      owner_name: result.full_name || `${result.first_name} ${result.last_name}`,
      owner_phone: phones[0], // Best phone number
      owner_email: emails[0], // Best email
      owner_mailing_address: result.mail_address
        ? `${result.mail_address}, ${result.mail_city}, ${result.mail_state}`
        : undefined,

      // Quality metrics
      quality_score: qualityScore,
      data_completeness: this.calculateCompleteness({
        owner_name: true,
        owner_phone: phones.length > 0,
        owner_email: emails.length > 0,
        owner_mailing_address: !!result.mail_address,
      }),
      confidence: result.match_score,

      // Provider-specific data (store all phones and emails for reference)
      property_data: {
        phones: phones.map((phone, idx) => ({
          number: phone,
          rank: idx + 1,
          is_primary: idx === 0,
        })),
        emails: emails.map((email, idx) => ({
          email: email,
          rank: idx + 1,
          is_primary: idx === 0,
        })),
        match_score: result.match_score,
        data_sources: result.data_sources,
        last_verified: result.last_verified,
      },

      enriched_at: new Date().toISOString(),
    };
  }

  /**
   * Calculate quality score for Tracerfy results
   * Focus on contact information quality
   */
  private calculateQualityScore(data: {
    has_primary_phone: boolean;
    phone_count: number;
    email_count: number;
    has_mailing_address: boolean;
    match_score: number;
  }): number {
    let score = 0;

    // Primary phone (30 points)
    if (data.has_primary_phone) score += 30;

    // Additional phones (up to 20 points, 5 per phone)
    score += Math.min(20, (data.phone_count - 1) * 5);

    // Emails (up to 20 points, 7 per email)
    score += Math.min(20, data.email_count * 7);

    // Mailing address (10 points)
    if (data.has_mailing_address) score += 10;

    // Match score (up to 20 points)
    score += Math.min(20, data.match_score / 5);

    return Math.min(100, Math.round(score));
  }

  /**
   * Calculate data completeness percentage
   */
  private calculateCompleteness(fields: Record<string, boolean>): number {
    const total = Object.keys(fields).length;
    const populated = Object.values(fields).filter(Boolean).length;
    return Math.round((populated / total) * 100);
  }

  /**
   * Generate consistent address hash for caching
   */
  private generateAddressHash(address: AddressInput): string {
    const normalized = `${address.street_address || address.full_address || ''}|${address.city || ''}|${address.state || ''}|${address.first_name || ''}|${address.last_name || ''}`
      .toLowerCase()
      .replace(/[^a-z0-9|]/g, '');

    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  /**
   * Create "not found" result
   */
  private createNotFoundResult(address: AddressInput): PropertyEnrichmentResult {
    return {
      success: false,
      provider: 'tracerfy',
      address_hash: this.generateAddressHash(address),
      full_address: address.full_address || `${address.street_address}, ${address.city}, ${address.state}`,
      owner_name: `${address.first_name} ${address.last_name}`.trim(),
      quality_score: 0,
      data_completeness: 0,
      property_data: {
        error: 'No data found',
      },
    };
  }

  /**
   * Create error result
   */
  private createErrorResult(address: AddressInput, errorMessage: string): PropertyEnrichmentResult {
    return {
      success: false,
      provider: 'tracerfy',
      address_hash: this.generateAddressHash(address),
      full_address: address.full_address || `${address.street_address}, ${address.city}, ${address.state}`,
      owner_name: address.first_name && address.last_name ? `${address.first_name} ${address.last_name}` : undefined,
      quality_score: 0,
      data_completeness: 0,
      property_data: {
        error: errorMessage,
      },
    };
  }

  /**
   * Handle and transform errors
   */
  private handleError(error: unknown, address: AddressInput): EnrichmentError {
    const message = error instanceof Error ? error.message : 'Unknown error';

    let errorType: EnrichmentError['error_type'] = 'api_error';

    if (message.includes('Authentication') || message.includes('Unauthorized')) {
      errorType = 'authentication_error';
    } else if (message.includes('credits')) {
      errorType = 'insufficient_credits';
    } else if (message.includes('Rate limit')) {
      errorType = 'rate_limit';
    } else if (message.includes('Invalid') || message.includes('required')) {
      errorType = 'invalid_address';
    } else if (message.includes('not found') || message.includes('No data')) {
      errorType = 'address_not_found';
    } else if (message.includes('timeout') || message.includes('network')) {
      errorType = 'network_error';
    }

    return {
      error_type: errorType,
      error_message: message,
      address: address,
      retry_count: 0,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // =====================================================
  // UTILITIES
  // =====================================================

  /**
   * Get request statistics
   */
  getStats() {
    return {
      total_requests: this.requestCount,
      provider: 'tracerfy',
      cost_per_lookup: 0.009, // $0.009
    };
  }
}

// =====================================================
// FACTORY FUNCTION
// =====================================================

/**
 * Create Tracerfy client from environment variables
 */
export function createTracerfyClient(): TracerfyClient {
  const apiKey = process.env.TRACERFY_API_KEY;

  if (!apiKey) {
    throw new Error(
      'TRACERFY_API_KEY environment variable is not set. ' +
        'Add it to your .env.local file to enable Tracerfy skip tracing.'
    );
  }

  return new TracerfyClient({
    api_key: apiKey,
    base_url: process.env.TRACERFY_API_URL,
    timeout_ms: process.env.TRACERFY_TIMEOUT_MS ? parseInt(process.env.TRACERFY_TIMEOUT_MS) : undefined,
  });
}
