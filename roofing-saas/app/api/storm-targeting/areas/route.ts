/**
 * STORM TARGETING AREAS API
 * GET /api/storm-targeting/areas
 *
 * Returns list of targeting areas for the current tenant
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session';

export async function GET() {
  try {
    const supabase = await createClient();

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

    // Get all targeting areas for this tenant
    const { data: areas, error } = await supabase
      .from('storm_targeting_areas')
      .select('id, name, address_count, area_sq_miles, status, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch targeting areas:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch targeting areas' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      areas: areas || [],
    });
  } catch (error) {
    console.error('Areas API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
