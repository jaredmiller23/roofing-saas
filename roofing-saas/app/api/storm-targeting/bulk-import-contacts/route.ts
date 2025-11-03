/**
 * STORM TARGETING - BULK IMPORT TO CONTACTS
 * POST /api/storm-targeting/bulk-import-contacts
 *
 * Takes extracted addresses and creates contacts from them
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = await createClient();

    // Get authenticated user
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

    // Parse request body
    const body = await request.json();
    const { targetingAreaId } = body;

    if (!targetingAreaId) {
      return NextResponse.json(
        { success: false, error: 'targeting_area_id is required' },
        { status: 400 }
      );
    }

    console.log(`[${tenantId}] Starting bulk import from area: ${targetingAreaId}`);

    // Get all extracted addresses for this targeting area
    const { data: addresses, error: fetchError } = await supabase
      .from('extracted_addresses')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('targeting_area_id', targetingAreaId)
      .eq('is_selected', true); // Only import selected addresses

    if (fetchError) {
      console.error('Failed to fetch addresses:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch addresses: ' + fetchError.message },
        { status: 500 }
      );
    }

    if (!addresses || addresses.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No addresses found to import' },
        { status: 404 }
      );
    }

    console.log(`Found ${addresses.length} addresses to import`);

    // Transform extracted addresses to contacts
    const contacts = addresses.map((addr) => ({
      tenant_id: tenantId,
      full_name: addr.full_address || addr.street_address || 'Unknown Address', // Use address as name initially
      email: null,
      phone: null,
      address_street: addr.street_address,
      address_city: addr.city,
      address_state: addr.state,
      address_zip: addr.zip_code,
      latitude: addr.latitude,
      longitude: addr.longitude,
      status: 'lead', // Start as leads
      source: 'storm_targeting',
      notes: `Address-only lead from storm targeting. Extracted: ${new Date().toLocaleDateString()}. Property type: ${addr.osm_property_type || 'residential'}. NEEDS ENRICHMENT: Add owner name, phone, email.`,
      created_by: user.id,
      tags: ['storm-lead', 'needs-enrichment'],
    }));

    // Bulk insert contacts
    const { data: insertedContacts, error: insertError } = await supabase
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

    const importedCount = insertedContacts?.length || 0;
    console.log(`✓ Successfully imported ${importedCount} contacts`);

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
      message: `Successfully imported ${importedCount} contacts`,
    });
  } catch (error) {
    console.error('Bulk import error:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during bulk import',
      },
      { status: 500 }
    );
  }
}
