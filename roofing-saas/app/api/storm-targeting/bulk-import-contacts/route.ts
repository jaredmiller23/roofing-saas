/**
 * STORM TARGETING - BULK IMPORT TO CONTACTS
 * POST /api/storm-targeting/bulk-import-contacts
 *
 * Takes extracted addresses and creates contacts from them
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session';
import { logger } from '@/lib/logger';
import { AuthenticationError, AuthorizationError, ValidationError, NotFoundError, InternalError } from '@/lib/api/errors';
import { successResponse, errorResponse } from '@/lib/api/response';

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = await createClient();

    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      throw AuthenticationError();
    }

    const tenantId = await getUserTenantId(user.id);
    if (!tenantId) {
      throw AuthorizationError('User not associated with a tenant');
    }

    // Parse request body
    const body = await request.json();
    const { targetingAreaId } = body;

    if (!targetingAreaId) {
      throw ValidationError('targeting_area_id is required');
    }

    logger.info(`Starting bulk import from area: ${targetingAreaId}`, { tenantId });

    // Get all extracted addresses for this targeting area
    const { data: addresses, error: fetchError } = await supabase
      .from('extracted_addresses')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('targeting_area_id', targetingAreaId)
      .eq('is_selected', true); // Only import selected addresses

    if (fetchError) {
      logger.error('Failed to fetch addresses:', { error: fetchError });
      throw InternalError('Failed to fetch addresses: ' + fetchError.message);
    }

    if (!addresses || addresses.length === 0) {
      throw NotFoundError('No addresses found to import');
    }

    logger.info(`Found ${addresses.length} addresses to import`);

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
      logger.error('Failed to insert contacts:', { error: insertError });
      throw InternalError('Failed to import contacts: ' + insertError.message);
    }

    const importedCount = insertedContacts?.length || 0;
    logger.info(`Successfully imported ${importedCount} contacts`);

    // Update targeting area status
    await supabase
      .from('storm_targeting_areas')
      .update({
        status: 'imported',
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetingAreaId)
      .eq('tenant_id', tenantId);

    return successResponse({
      imported: importedCount,
      message: `Successfully imported ${importedCount} contacts`,
    });
  } catch (error) {
    logger.error('Bulk import error:', { error });
    return errorResponse(error instanceof Error ? error : InternalError());
  }
}
