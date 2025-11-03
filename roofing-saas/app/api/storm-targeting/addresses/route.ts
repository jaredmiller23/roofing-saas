/**
 * STORM TARGETING ADDRESSES API
 * GET /api/storm-targeting/addresses?areaId={id}
 *
 * Returns extracted addresses for a targeting area
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const areaId = searchParams.get('areaId');

    if (!areaId) {
      return NextResponse.json(
        { success: false, error: 'areaId parameter required' },
        { status: 400 }
      );
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
      console.error('Failed to fetch addresses:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch addresses' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      addresses: addresses || [],
    });
  } catch (error) {
    console.error('Addresses API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
