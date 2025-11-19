/**
 * Property Enrichment Queue System
 *
 * Handles background processing of property enrichment jobs
 * Integrates with Supabase bulk_import_jobs and property_enrichment_cache tables
 * Supports multiple providers and automatic caching
 */

import { createClient } from '@/lib/supabase/server';
import { BatchDataClient } from './batchdata-client';
import { TracerfyClient } from './tracerfy-client';
import type {
  AddressInput,
  PropertyEnrichmentResult,
  BatchEnrichmentRequest,
  BatchEnrichmentResult,
  EnrichmentProvider,
  EnrichmentOptions,
  EnrichmentJobStatus,
  EnrichmentError,
} from './types';
import {
  generateAddressHash,
  calculateQualityScore,
  calculateCompleteness,
  estimateEnrichmentCost,
} from './types';

// =====================================================
// ENRICHMENT QUEUE MANAGER
// =====================================================

export class EnrichmentQueueManager {
  private supabase: Awaited<ReturnType<typeof createClient>>;
  private batchDataClient?: BatchDataClient;
  private tracerfyClient?: TracerfyClient;

  constructor(supabase: Awaited<ReturnType<typeof createClient>>) {
    this.supabase = supabase;
  }

  /**
   * Initialize enrichment provider clients
   */
  private initializeProviderClients(provider: EnrichmentProvider) {
    if (provider === 'batchdata' && !this.batchDataClient) {
      const apiKey = process.env.BATCHDATA_API_KEY;
      if (apiKey) {
        this.batchDataClient = new BatchDataClient({ api_key: apiKey });
      }
    }

    if (provider === 'tracerfy' && !this.tracerfyClient) {
      const apiKey = process.env.TRACERFY_API_KEY;
      if (apiKey) {
        this.tracerfyClient = new TracerfyClient({ api_key: apiKey });
      }
    }
  }

  /**
   * Start a new enrichment job
   */
  async startEnrichmentJob(
    request: BatchEnrichmentRequest,
    tenantId: string,
    targetingAreaId?: string
  ): Promise<BatchEnrichmentResult> {
    const {
      addresses,
      provider,
      options = {},
    } = request;

    // Initialize provider client
    this.initializeProviderClients(provider);

    // Check cache first
    const cachedResults = options.use_cache !== false
      ? await this.checkCache(addresses)
      : { results: [], cachedCount: 0 };

    // Determine which addresses need enrichment
    const addressesToEnrich = options.force_refresh
      ? addresses
      : addresses.filter(addr => {
          const hash = generateAddressHash(addr);
          return !cachedResults.results.some(r => r.address_hash === hash);
        });

    // Calculate cost estimate
    const costEstimate = estimateEnrichmentCost(
      addresses,
      provider,
      cachedResults.cachedCount
    );

    // Check cost limit
    if (options.max_cost_dollars && costEstimate.total_cost / 100 > options.max_cost_dollars) {
      throw new Error(
        `Estimated cost ($${(costEstimate.total_cost / 100).toFixed(2)}) exceeds ` +
        `maximum allowed ($${options.max_cost_dollars}). ` +
        `Reduce address count or increase cost limit.`
      );
    }

    // If estimate only, return early
    if (options.estimate_only) {
      return {
        job_id: 'estimate-only',
        status: 'completed',
        total_addresses: addresses.length,
        processed_count: 0,
        successful_count: 0,
        failed_count: 0,
        cached_count: cachedResults.cachedCount,
        results: [],
        errors: [],
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        cost_estimate: costEstimate,
        actual_cost: 0,
      };
    }

    // Create bulk import job in database
    const job = await this.createBulkImportJob(
      tenantId,
      targetingAreaId,
      addresses.length,
      provider
    );

    // Start processing (can be async)
    this.processEnrichmentJob(
      job.id as string,
      addressesToEnrich,
      provider,
      options,
      cachedResults.results
    ).catch(error => {
      console.error('Enrichment job error:', error);
      this.updateJobStatus(job.id as string, 'failed', {
        error_message: error.message,
      });
    });

    // Return initial result
    return {
      job_id: job.id as string,
      status: 'processing' as const,
      total_addresses: addresses.length,
      processed_count: 0,
      successful_count: cachedResults.cachedCount,
      failed_count: 0,
      cached_count: cachedResults.cachedCount,
      results: cachedResults.results,
      errors: [],
      started_at: (job.started_at as string) || new Date().toISOString(),
      estimated_completion_at: job.estimated_completion_at as string | undefined,
      cost_estimate: costEstimate,
    };
  }

  /**
   * Process enrichment job (background processing)
   */
  private async processEnrichmentJob(
    jobId: string,
    addresses: AddressInput[],
    provider: EnrichmentProvider,
    options: EnrichmentOptions,
    cachedResults: PropertyEnrichmentResult[]
  ): Promise<void> {
    const results: PropertyEnrichmentResult[] = [...cachedResults];
    const errors: EnrichmentError[] = [];
    let successCount = cachedResults.length;
    let failedCount = 0;

    // Update job status
    await this.updateJobStatus(jobId, 'processing', {
      started_at: new Date().toISOString(),
      processed_items: 0,
      successful_items: successCount,
      total_items: addresses.length + cachedResults.length,
    });

    // Process addresses
    const batchSize = options.batch_size || 50;
    const delayMs = options.delay_ms || 100;
    const maxRetries = options.max_retries || 3;

    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);

      // Enrich batch
      let batchResults: PropertyEnrichmentResult[] = [];

      if (provider === 'batchdata' && this.batchDataClient) {
        batchResults = await this.batchDataClient.enrichPropertyBatch(batch, {
          batchSize,
          delayMs,
          maxRetries,
        });
      } else if (provider === 'tracerfy' && this.tracerfyClient) {
        // Tracerfy uses asynchronous batch processing with polling
        batchResults = await this.tracerfyClient.enrichPropertyBatch(batch, {
          maxRetries,
        });
      } else {
        throw new Error(`Provider ${provider} not supported or not configured`);
      }

      // Process batch results
      for (const result of batchResults) {
        if (result.success) {
          // Cache successful result
          await this.cacheEnrichmentResult(result, options.cache_ttl_days);

          // Apply quality filters
          if (this.passesQualityFilter(result, options)) {
            results.push(result);
            successCount++;
          } else {
            failedCount++;
            errors.push({
              address: {
                full_address: result.full_address,
              },
              error_type: 'invalid_address',
              error_message: 'Property did not meet quality requirements',
              error_details: {
                quality_score: result.quality_score,
                min_required: options.min_quality_score,
              },
              retry_count: 0,
              timestamp: new Date().toISOString(),
            });
          }
        } else {
          failedCount++;
          errors.push({
            address: {
              full_address: result.full_address,
            },
            error_type: 'api_error',
            error_message: result.error || 'Unknown error',
            error_details: result.error_details,
            retry_count: maxRetries,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Update progress
      const processed = Math.min(i + batchSize, addresses.length);
      await this.updateJobProgress(jobId, {
        processed_items: processed + cachedResults.length,
        successful_items: successCount,
        failed_items: failedCount,
      });
    }

    // Mark job complete
    await this.updateJobStatus(jobId, 'completed', {
      completed_at: new Date().toISOString(),
      successful_items: successCount,
      failed_items: failedCount,
      results: {
        results,
        errors,
        average_quality_score: this.calculateAverageQuality(results),
        average_completeness: this.calculateAverageCompleteness(results),
      },
    });
  }

  /**
   * Check cache for existing enrichment data
   */
  private async checkCache(
    addresses: AddressInput[]
  ): Promise<{ results: PropertyEnrichmentResult[]; cachedCount: number }> {
    const hashes = addresses.map(addr => generateAddressHash(addr));

    const { data: cached, error } = await this.supabase
      .from('property_enrichment_cache')
      .select('*')
      .in('address_hash', hashes)
      .gt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Cache lookup error:', error);
      return { results: [], cachedCount: 0 };
    }

    if (!cached || cached.length === 0) {
      return { results: [], cachedCount: 0 };
    }

    // Transform cached data to PropertyEnrichmentResult format
    const results: PropertyEnrichmentResult[] = cached.map((item: Record<string, unknown>) => {
      // Create a typed version of item for quality calculations
      const typedItem = item as unknown as PropertyEnrichmentResult;

      return {
        success: true,
        provider: item.provider as EnrichmentProvider,
        provider_id: item.provider_id,
        address_hash: item.address_hash,
        full_address: item.full_address,
        street_address: item.street_address,
        city: item.city,
        state: item.state,
        zip_code: item.zip_code,
        latitude: item.latitude,
        longitude: item.longitude,
        owner_name: item.owner_name,
        owner_phone: item.owner_phone,
        owner_email: item.owner_email,
        owner_mailing_address: item.owner_mailing_address,
        property_type: item.property_type,
        year_built: item.year_built,
        square_footage: item.square_footage,
        bedrooms: item.bedrooms,
        bathrooms: item.bathrooms,
        lot_size: item.lot_size,
        stories: item.stories,
        assessed_value: item.assessed_value,
        market_value: item.market_value,
        last_sale_date: item.last_sale_date,
        last_sale_price: item.last_sale_price,
        equity_estimate: item.equity_estimate,
        mortgage_balance: item.mortgage_balance,
        roof_material: item.roof_material,
        roof_age: item.roof_age,
        roof_condition: item.roof_condition,
        property_data: item.property_data as Record<string, unknown>,
        cached: true,
        cache_hit: true,
        enriched_at: item.enriched_at,
        expires_at: item.expires_at,
        quality_score: calculateQualityScore(typedItem),
        data_completeness: calculateCompleteness(typedItem),
      } as PropertyEnrichmentResult;
    });

    // Update hit count
    await this.supabase
      .from('property_enrichment_cache')
      .update({
        hit_count: this.supabase.rpc('increment', { value: 1 }) as unknown as number,
        last_accessed_at: new Date().toISOString(),
      })
      .in('address_hash', hashes);

    return {
      results,
      cachedCount: results.length,
    };
  }

  /**
   * Cache enrichment result in database
   */
  private async cacheEnrichmentResult(
    result: PropertyEnrichmentResult,
    ttlDays: number = 180
  ): Promise<void> {
    if (!result.success) return;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    const { error } = await this.supabase
      .from('property_enrichment_cache')
      .upsert({
        address_hash: result.address_hash,
        full_address: result.full_address,
        street_address: result.street_address,
        city: result.city,
        state: result.state,
        zip_code: result.zip_code,
        latitude: result.latitude,
        longitude: result.longitude,
        provider: result.provider,
        provider_id: result.provider_id,
        owner_name: result.owner_name,
        owner_phone: result.owner_phone,
        owner_email: result.owner_email,
        owner_mailing_address: result.owner_mailing_address,
        property_type: result.property_type,
        year_built: result.year_built,
        square_footage: result.square_footage,
        bedrooms: result.bedrooms,
        bathrooms: result.bathrooms,
        lot_size: result.lot_size,
        stories: result.stories,
        assessed_value: result.assessed_value,
        market_value: result.market_value,
        last_sale_date: result.last_sale_date,
        last_sale_price: result.last_sale_price,
        equity_estimate: result.equity_estimate,
        mortgage_balance: result.mortgage_balance,
        roof_material: result.roof_material,
        roof_age: result.roof_age,
        roof_condition: result.roof_condition,
        property_data: result.property_data,
        enriched_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        hit_count: 0,
        last_accessed_at: new Date().toISOString(),
      }, {
        onConflict: 'address_hash',
      });

    if (error) {
      console.error('Cache write error:', error);
    }
  }

  /**
   * Create bulk import job in database
   */
  private async createBulkImportJob(
    tenantId: string,
    targetingAreaId: string | undefined,
    totalItems: number,
    provider: EnrichmentProvider
  ): Promise<Record<string, unknown>> {
    const estimatedCompletionMinutes = Math.ceil(totalItems / 50); // ~50 per minute
    const estimatedCompletionAt = new Date();
    estimatedCompletionAt.setMinutes(
      estimatedCompletionAt.getMinutes() + estimatedCompletionMinutes
    );

    const { data, error } = await this.supabase
      .from('bulk_import_jobs')
      .insert({
        tenant_id: tenantId,
        targeting_area_id: targetingAreaId,
        job_type: 'enrich_properties',
        status: 'pending',
        total_items: totalItems,
        processed_items: 0,
        successful_items: 0,
        failed_items: 0,
        started_at: new Date().toISOString(),
        estimated_completion_at: estimatedCompletionAt.toISOString(),
        import_settings: {
          provider,
        },
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create enrichment job: ${error.message}`);
    }

    return data;
  }

  /**
   * Update job status
   */
  private async updateJobStatus(
    jobId: string,
    status: EnrichmentJobStatus,
    updates: Record<string, unknown> = {}
  ): Promise<void> {
    const { error } = await this.supabase
      .from('bulk_import_jobs')
      .update({
        status,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) {
      console.error('Job status update error:', error);
    }
  }

  /**
   * Update job progress
   */
  private async updateJobProgress(
    jobId: string,
    progress: {
      processed_items?: number;
      successful_items?: number;
      failed_items?: number;
      skipped_items?: number;
    }
  ): Promise<void> {
    const { error } = await this.supabase
      .from('bulk_import_jobs')
      .update({
        ...progress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) {
      console.error('Job progress update error:', error);
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<BatchEnrichmentResult | null> {
    const { data: job, error } = await this.supabase
      .from('bulk_import_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return null;
    }

    return {
      job_id: job.id,
      status: job.status as EnrichmentJobStatus,
      total_addresses: job.total_items,
      processed_count: job.processed_items,
      successful_count: job.successful_items,
      failed_count: job.failed_items,
      cached_count: 0, // Would need to be stored separately
      results: job.results?.results || [],
      errors: job.results?.errors || [],
      started_at: job.started_at,
      completed_at: job.completed_at,
      estimated_completion_at: job.estimated_completion_at,
      duration_ms: job.completed_at
        ? new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()
        : undefined,
      cost_estimate: {
        provider: job.import_settings?.provider || 'batchdata',
        total_addresses: job.total_items,
        cached_addresses: 0,
        new_lookups: job.total_items,
        property_lookup_cost: 0,
        skip_trace_cost: 0,
        total_cost: 0,
        cost_per_property: 0,
        cost_per_skip_trace: 0,
        cache_savings: 0,
        estimated_total_without_cache: 0,
      },
      average_quality_score: job.results?.average_quality_score,
      average_completeness: job.results?.average_completeness,
    };
  }

  /**
   * Check if result passes quality filters
   */
  private passesQualityFilter(
    result: PropertyEnrichmentResult,
    options: EnrichmentOptions
  ): boolean {
    // Min quality score
    if (options.min_quality_score && result.quality_score) {
      if (result.quality_score < options.min_quality_score) {
        return false;
      }
    }

    // Require owner phone
    if (options.require_owner_phone && !result.owner_phone) {
      return false;
    }

    // Require owner email
    if (options.require_owner_email && !result.owner_email) {
      return false;
    }

    return true;
  }

  /**
   * Calculate average quality score
   */
  private calculateAverageQuality(results: PropertyEnrichmentResult[]): number {
    if (results.length === 0) return 0;

    const validScores = results
      .map(r => r.quality_score)
      .filter((s): s is number => s != null);

    if (validScores.length === 0) return 0;

    const sum = validScores.reduce((acc, score) => acc + score, 0);
    return Math.round(sum / validScores.length);
  }

  /**
   * Calculate average completeness
   */
  private calculateAverageCompleteness(results: PropertyEnrichmentResult[]): number {
    if (results.length === 0) return 0;

    const validScores = results
      .map(r => r.data_completeness)
      .filter((s): s is number => s != null);

    if (validScores.length === 0) return 0;

    const sum = validScores.reduce((acc, score) => acc + score, 0);
    return Math.round(sum / validScores.length);
  }
}

// =====================================================
// FACTORY FUNCTION
// =====================================================

export function createEnrichmentQueue(
  supabase: Awaited<ReturnType<typeof createClient>>
): EnrichmentQueueManager {
  return new EnrichmentQueueManager(supabase);
}

// =====================================================
// EXPORTS
// =====================================================

export default EnrichmentQueueManager;
