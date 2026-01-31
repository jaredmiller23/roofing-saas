/**
 * STORM TARGETING - IMPORT ENRICHED CONTACTS
 * POST /api/storm-targeting/import-enriched
 *
 * Import only enriched addresses (those with owner data) to contacts
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session';
import { logger } from '@/lib/logger';
import { AuthenticationError, AuthorizationError, ValidationError, NotFoundError, InternalError } from '@/lib/api/errors';
import { successResponse, errorResponse } from '@/lib/api/response';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { targetingAreaId } = body;

    if (!targetingAreaId) {
      throw ValidationError('targetingAreaId is required');
    }

    logger.info(`Importing enriched contacts from area: ${targetingAreaId}`, { tenantId });

    // Get only enriched, selected addresses
    const { data: addresses, error: fetchError } = await supabase
      .from('extracted_addresses')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('targeting_area_id', targetingAreaId)
      .eq('is_enriched', true)
      .eq('is_selected', true);

    if (fetchError) {
      logger.error('Failed to fetch addresses:', { error: fetchError });
      throw InternalError('Failed to fetch addresses');
    }

    if (!addresses || addresses.length === 0) {
      throw NotFoundError('No enriched addresses found to import');
    }

    logger.info(`Found ${addresses.length} enriched addresses to import`);

    // Transform to contacts with full enrichment data
    const contacts = addresses.map((addr) => {
      const ownerParts = (addr.owner_name || 'Unknown').split(' ')
      return {
        tenant_id: tenantId,
        first_name: ownerParts[0] || 'Unknown',
        last_name: ownerParts.slice(1).join(' ') || addr.city || 'Address',
        email: addr.owner_email,
        phone: addr.owner_phone,
        address_street: addr.street_address,
        address_city: addr.city,
        address_state: addr.state,
        address_zip: addr.zip_code,
        latitude: addr.latitude,
        longitude: addr.longitude,
        type: 'lead' as const,
        source: 'storm_targeting',
        notes: `Storm targeting lead. Extracted: ${new Date(addr.created_at ?? '').toLocaleDateString()}. Enriched: ${new Date(addr.enriched_at ?? '').toLocaleDateString()}. Source: ${addr.enrichment_source}`,
        created_by: user.id,
        tags: ['storm-lead', 'enriched'],
      }
    });

    // Bulk insert
    const { data: inserted, error: insertError } = await supabase
      .from('contacts')
      .insert(contacts)
      .select('id');

    if (insertError) {
      logger.error('Failed to insert contacts:', { error: insertError });
      throw InternalError('Failed to import contacts: ' + insertError.message);
    }

    const importedCount = inserted?.length || 0;
    logger.info(`Imported ${importedCount} enriched contacts`);

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

    return successResponse({
      imported: importedCount,
    });
  } catch (error) {
    logger.error('Import enriched error:', { error });
    return errorResponse(error instanceof Error ? error : InternalError());
  }
}
