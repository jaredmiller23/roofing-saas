/**
 * STORM TARGETING ADDRESSES API
 * GET /api/storm-targeting/addresses?areaId={id}
 *
 * Returns extracted addresses for a targeting area
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/auth/with-auth';
import { requireFeature } from '@/lib/billing/feature-gates';
import { logger } from '@/lib/logger';
import { ValidationError, InternalError } from '@/lib/api/errors';
import { successResponse, errorResponse } from '@/lib/api/response';

export const GET = withAuth(async (request: NextRequest, { tenantId }) => {
  try {
    const supabase = await createClient();

    await requireFeature(tenantId, 'stormData');

    const { searchParams } = new URL(request.url);
    const areaId = searchParams.get('areaId');

    if (!areaId) {
      throw ValidationError('areaId parameter required');
    }

    // Get all addresses for this targeting area
    const { data: addresses, error } = await supabase
      .from('extracted_addresses')
      .select(`
        id,
        targeting_area_id,
        full_address,
        street_address,
        city,
        state,
        zip_code,
        latitude,
        longitude,
        is_enriched,
        is_selected,
        owner_name,
        owner_email,
        owner_phone,
        enrichment_source,
        enriched_at
      `)
      .eq('tenant_id', tenantId)
      .eq('targeting_area_id', areaId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to fetch addresses:', { error });
      throw InternalError('Failed to fetch addresses');
    }

    return successResponse({
      addresses: addresses || [],
    });
  } catch (error) {
    logger.error('Addresses API error:', { error });
    return errorResponse(error instanceof Error ? error : InternalError());
  }
});
