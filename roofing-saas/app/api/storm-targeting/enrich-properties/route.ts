/**
 * Property Enrichment API Route
 *
 * POST /api/storm-targeting/enrich-properties
 * - Start a new property enrichment job
 *
 * GET /api/storm-targeting/enrich-properties?jobId=xxx
 * - Get enrichment job status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createEnrichmentQueue } from '@/lib/enrichment/enrichment-queue';
import { logger } from '@/lib/logger';
import { AuthenticationError, ValidationError, NotFoundError, InternalError } from '@/lib/api/errors';
import { successResponse, errorResponse } from '@/lib/api/response';
import type {
  BatchEnrichmentRequest,
  AddressInput,
  EnrichmentProvider,
  EnrichmentOptions,
} from '@/lib/enrichment/types';

// =====================================================
// POST - Start Enrichment Job
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw AuthenticationError();
    }

    // Parse request body
    const body = await request.json();
    const {
      addresses,
      provider = 'batchdata',
      targetingAreaId,
      options = {},
    } = body as {
      addresses: AddressInput[];
      provider?: EnrichmentProvider;
      targetingAreaId?: string;
      options?: EnrichmentOptions;
    };

    // Validate input
    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid addresses array' },
        { status: 400 }
      );
    }

    if (addresses.length > 1000) {
      return NextResponse.json(
        {
          error: 'Too many addresses. Maximum 1000 addresses per batch.',
          max_allowed: 1000,
          provided: addresses.length,
        },
        { status: 400 }
      );
    }

    // Validate provider
    const validProviders: EnrichmentProvider[] = [
      'batchdata',
      'propertyradar',
      'tracerfy',
      'lead_sherpa',
      'county_assessor',
      'manual',
    ];

    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        {
          error: `Invalid provider: ${provider}`,
          valid_providers: validProviders,
        },
        { status: 400 }
      );
    }

    // Check if API key is configured for provider
    if (provider === 'batchdata' && !process.env.BATCHDATA_API_KEY) {
      return NextResponse.json(
        {
          error: 'BatchData API key not configured',
          message: 'Please add BATCHDATA_API_KEY to your environment variables',
        },
        { status: 500 }
      );
    }

    if (provider === 'tracerfy' && !process.env.TRACERFY_API_KEY) {
      return NextResponse.json(
        {
          error: 'Tracerfy API key not configured',
          message: 'Please add TRACERFY_API_KEY to your environment variables',
        },
        { status: 500 }
      );
    }

    // Validate Tracerfy-specific requirements
    if (provider === 'tracerfy') {
      // Check if all addresses have owner names
      const addressesWithoutNames = addresses.filter(
        (addr) => !addr.first_name || !addr.last_name
      );

      if (addressesWithoutNames.length > 0) {
        return NextResponse.json(
          {
            error: 'Tracerfy requires owner names',
            message: 'Tracerfy skip tracing requires first_name and last_name for each address. ' +
                     'Use this provider for door-knock follow-ups when you have owner names. ' +
                     'For storm targeting (addresses only), use a different approach like DealMachine or PropertyRadar.',
            addresses_missing_names: addressesWithoutNames.length,
            total_addresses: addresses.length,
          },
          { status: 400 }
        );
      }
    }

    // Create enrichment queue manager
    const enrichmentQueue = createEnrichmentQueue(supabase);

    // Start enrichment job
    const enrichmentRequest: BatchEnrichmentRequest = {
      addresses,
      provider,
      options: {
        use_cache: options.use_cache !== false,
        cache_ttl_days: options.cache_ttl_days || 180,
        force_refresh: options.force_refresh || false,
        include_owner_contact: options.include_owner_contact !== false,
        include_property_details: options.include_property_details !== false,
        include_financial_data: options.include_financial_data !== false,
        include_roof_data: options.include_roof_data !== false,
        min_quality_score: options.min_quality_score,
        require_owner_phone: options.require_owner_phone,
        require_owner_email: options.require_owner_email,
        batch_size: options.batch_size || 50,
        delay_ms: options.delay_ms || 100,
        max_retries: options.max_retries || 3,
        max_cost_dollars: options.max_cost_dollars,
        estimate_only: options.estimate_only || false,
      },
    };

    const result = await enrichmentQueue.startEnrichmentJob(
      enrichmentRequest,
      user.id,
      targetingAreaId
    );

    // Return success response
    return successResponse({
      job_id: result.job_id,
      status: result.status,
      total_addresses: result.total_addresses,
      cached_count: result.cached_count,
      estimated_completion_at: result.estimated_completion_at,
      cost_estimate: result.cost_estimate,
      message: options.estimate_only
        ? 'Cost estimate calculated successfully'
        : `Enrichment job started. Processing ${result.total_addresses - result.cached_count} addresses (${result.cached_count} cached).`,
    });
  } catch (error) {
    logger.error('Enrichment API error:', { error });

    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('cost')) {
        return NextResponse.json(
          {
            error: 'Cost limit exceeded',
            message: error.message,
          },
          { status: 402 } // Payment Required
        );
      }

      if (error.message.includes('API key')) {
        return NextResponse.json(
          {
            error: 'Configuration error',
            message: error.message,
          },
          { status: 500 }
        );
      }
    }

    return errorResponse(error instanceof Error ? error : InternalError());
  }
}

// =====================================================
// GET - Get Job Status
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw AuthenticationError();
    }

    // Get job ID from query params
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      throw ValidationError('Missing jobId parameter');
    }

    // Create enrichment queue manager
    const enrichmentQueue = createEnrichmentQueue(supabase);

    // Get job status
    const result = await enrichmentQueue.getJobStatus(jobId);

    if (!result) {
      throw NotFoundError('Job not found');
    }

    // Calculate progress percentage
    const progressPercentage = result.total_addresses > 0
      ? Math.round((result.processed_count / result.total_addresses) * 100)
      : 0;

    // Return job status
    return successResponse({
      job_id: result.job_id,
      status: result.status,
      progress: {
        total: result.total_addresses,
        processed: result.processed_count,
        successful: result.successful_count,
        failed: result.failed_count,
        cached: result.cached_count,
        percentage: progressPercentage,
      },
      results: result.results,
      errors: result.errors,
      timing: {
        started_at: result.started_at,
        completed_at: result.completed_at,
        estimated_completion_at: result.estimated_completion_at,
        duration_ms: result.duration_ms,
      },
      cost_estimate: result.cost_estimate,
      quality: {
        average_quality_score: result.average_quality_score,
        average_completeness: result.average_completeness,
      },
    });
  } catch (error) {
    logger.error('Enrichment status API error:', { error });
    return errorResponse(error instanceof Error ? error : InternalError());
  }
}

// =====================================================
// OPTIONS - CORS
// =====================================================

export async function OPTIONS() {
  // Use specific origin from env, not wildcard
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'https://roofing-saas.vercel.app';

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
