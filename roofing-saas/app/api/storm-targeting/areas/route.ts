/**
 * STORM TARGETING AREAS API
 * GET /api/storm-targeting/areas
 *
 * Returns list of targeting areas for the current tenant
 */

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session';
import { logger } from '@/lib/logger';
import { AuthenticationError, AuthorizationError, InternalError } from '@/lib/api/errors';
import { successResponse, errorResponse } from '@/lib/api/response';

export async function GET() {
  try {
    const supabase = await createClient();

    const user = await getCurrentUser();
    if (!user) {
      throw AuthenticationError();
    }

    const tenantId = await getUserTenantId(user.id);
    if (!tenantId) {
      throw AuthorizationError('User not associated with a tenant');
    }

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
}
