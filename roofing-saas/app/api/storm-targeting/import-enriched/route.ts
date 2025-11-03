/**
 * STORM TARGETING - IMPORT ENRICHED CONTACTS
 * POST /api/storm-targeting/import-enriched
 *
 * Import only enriched addresses (those with owner data) to contacts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { targetingAreaId } = body;

    if (!targetingAreaId) {
      return NextResponse.json(
        { success: false, error: 'targetingAreaId is required' },
        { status: 400 }
      );
    }

    console.log(`[${tenantId}] Importing enriched contacts from area: ${targetingAreaId}`);

    // Get only enriched, selected addresses
    const { data: addresses, error: fetchError } = await supabase
      .from('extracted_addresses')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('targeting_area_id', targetingAreaId)
      .eq('is_enriched', true)
      .eq('is_selected', true);

    if (fetchError) {
      console.error('Failed to fetch addresses:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch addresses' },
        { status: 500 }
      );
    }

    if (!addresses || addresses.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No enriched addresses found to import' },
        { status: 404 }
      );
    }

    console.log(`Found ${addresses.length} enriched addresses to import`);

    // Transform to contacts with full enrichment data
    const contacts = addresses.map((addr) => ({
      tenant_id: tenantId,
      full_name: addr.owner_name || addr.full_address || 'Unknown',
      email: addr.owner_email,
      phone: addr.owner_phone,
      address_street: addr.street_address,
      address_city: addr.city,
      address_state: addr.state,
      address_zip: addr.zip_code,
      latitude: addr.latitude,
      longitude: addr.longitude,
      status: 'lead',
      source: 'storm_targeting',
      notes: `Storm targeting lead. Extracted: ${new Date(addr.created_at).toLocaleDateString()}. Enriched: ${new Date(addr.enriched_at).toLocaleDateString()}. Source: ${addr.enrichment_source}`,
      created_by: user.id,
      tags: ['storm-lead', 'enriched'],
    }));

    // Bulk insert
    const { data: inserted, error: insertError } = await supabase
      .from('contacts')
      .insert(contacts)
      .select('id');

    if (insertError) {
      console.error('Failed to insert contacts:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to import contacts: ' + insertError.message },
        { status: 500 }
      );
    }

    const importedCount = inserted?.length || 0;
    console.log(`✓ Imported ${importedCount} enriched contacts`);

    // Mark addresses as imported (not selected anymore)
    await supabase
      .from('extracted_addresses')
      .update({ is_selected: false })
      .eq('tenant_id', tenantId)
      .eq('targeting_area_id', targetingAreaId)
      .eq('is_enriched', true)
      .eq('is_selected', true);

    // Update targeting area status
    await supabase
      .from('storm_targeting_areas')
      .update({
        status: 'imported',
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetingAreaId)
      .eq('tenant_id', tenantId);

    return NextResponse.json({
      success: true,
      imported: importedCount,
    });
  } catch (error) {
    console.error('Import enriched error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to import' },
      { status: 500 }
    );
  }
}
