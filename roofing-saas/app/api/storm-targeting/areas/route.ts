/**
 * STORM TARGETING AREAS API
 * GET /api/storm-targeting/areas
 *
 * Returns list of targeting areas for the current tenant
 */

import { createClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/auth/with-auth';
import { requireFeature } from '@/lib/billing/feature-gates';
import { logger } from '@/lib/logger';
import { InternalError } from '@/lib/api/errors';
import { successResponse, errorResponse } from '@/lib/api/response';

export const GET = withAuth(async (_request, { tenantId }) => {
  try {
    const supabase = await createClient();

    await requireFeature(tenantId, 'stormData');

    // Get all targeting areas for this tenant
    const { data: areas, error } = await supabase
      .from('storm_targeting_areas')
      .select('id, name, address_count, area_sq_miles, status, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch targeting areas:', { error });
      throw InternalError('Failed to fetch targeting areas');
    }

    return successResponse({
      areas: areas || [],
    });
  } catch (error) {
    logger.error('Areas API error:', { error });
    return errorResponse(error instanceof Error ? error : InternalError());
  }
});
