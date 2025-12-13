/**
 * STORM TARGETING - ENRICH FROM CSV
 * POST /api/storm-targeting/enrich-from-csv
 *
 * Upload CSV with owner data and match to extracted addresses
 * Supports PropertyRadar format and custom formats
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session';
import { logger } from '@/lib/logger';
import { AuthenticationError, AuthorizationError, ValidationError, InternalError } from '@/lib/api/errors';
import { successResponse, errorResponse } from '@/lib/api/response';

// =====================================================
// TYPES
// =====================================================

interface ExtractedAddress {
  id: string
  full_address: string | null
  street_address: string | null
}

// =====================================================
// CSV PARSING
// =====================================================

function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split('\n').filter(line => !line.startsWith('#'));
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header.toLowerCase()] = values[index] || '';
    });
    rows.push(row);
  }

  return rows;
}

// =====================================================
// ADDRESS MATCHING
// =====================================================

function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,#]/g, '')
    .trim();
}

function matchAddress(
  csvRow: Record<string, string>,
  extractedAddresses: ExtractedAddress[]
): ExtractedAddress | null {
  // Try to find address field in CSV (various possible names)
  const addressFields = ['address', 'street', 'street_address', 'street address', 'property address'];
  let csvAddress = '';

  for (const field of addressFields) {
    if (csvRow[field]) {
      csvAddress = csvRow[field];
      break;
    }
  }

  if (!csvAddress) return null;

  const normalizedCsv = normalizeAddress(csvAddress);

  // Find best match in extracted addresses
  return extractedAddresses.find(addr => {
    const fullNorm = normalizeAddress(addr.full_address || '');
    const streetNorm = normalizeAddress(addr.street_address || '');

    return fullNorm.includes(normalizedCsv) || normalizedCsv.includes(fullNorm) ||
           streetNorm.includes(normalizedCsv) || normalizedCsv.includes(streetNorm);
  }) || null;
}

// =====================================================
// API HANDLER
// =====================================================

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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const targetingAreaId = formData.get('targetingAreaId') as string;

    if (!file || !targetingAreaId) {
      throw ValidationError('File and targetingAreaId required');
    }

    // Read CSV content
    const csvText = await file.text();
    const csvRows = parseCSV(csvText);

    logger.info(`Processing CSV: ${csvRows.length} rows`, { tenantId });

    // Get all extracted addresses for this area
    const { data: addresses, error: fetchError } = await supabase
      .from('extracted_addresses')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('targeting_area_id', targetingAreaId);

    if (fetchError || !addresses) {
      logger.error('Failed to fetch addresses:', { error: fetchError });
      throw InternalError('Failed to fetch addresses');
    }

    logger.info(`Found ${addresses.length} addresses to enrich`, { tenantId });

    // Match and enrich
    let enrichedCount = 0;
    const updates: Array<{
      id: string
      owner_name: string | null
      owner_phone: string | null
      owner_email: string | null
      property_value: number | null
      year_built: number | null
      is_enriched: boolean
      enrichment_source: string
      enriched_at: string
    }> = [];

    for (const csvRow of csvRows) {
      const matchedAddress = matchAddress(csvRow, addresses);

      if (matchedAddress) {
        // Extract enrichment data from CSV (handle various field names)
        const ownerName = csvRow['owner name'] || csvRow['owner'] || csvRow['name'] || null;
        const ownerPhone = csvRow['owner phone'] || csvRow['phone'] || csvRow['phone number'] || null;
        const ownerEmail = csvRow['owner email'] || csvRow['email'] || null;
        const propertyValue = csvRow['property value'] || csvRow['value'] || null;
        const yearBuilt = csvRow['year built'] || csvRow['year_built'] || csvRow['built'] || null;

        updates.push({
          id: matchedAddress.id,
          owner_name: ownerName,
          owner_phone: ownerPhone,
          owner_email: ownerEmail,
          property_value: propertyValue ? parseFloat(propertyValue.replace(/[$,]/g, '')) : null,
          year_built: yearBuilt ? parseInt(yearBuilt) : null,
          is_enriched: true,
          enrichment_source: 'csv_upload',
          enriched_at: new Date().toISOString(),
        });

        enrichedCount++;
      }
    }

    logger.info(`Matched ${enrichedCount} addresses`, { tenantId });

    // Bulk update enriched addresses
    if (updates.length > 0) {
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('extracted_addresses')
          .update({
            owner_name: update.owner_name,
            owner_phone: update.owner_phone,
            owner_email: update.owner_email,
            property_value: update.property_value,
            year_built: update.year_built,
            is_enriched: update.is_enriched,
            enrichment_source: update.enrichment_source,
            enriched_at: update.enriched_at,
          })
          .eq('id', update.id)
          .eq('tenant_id', tenantId);

        if (updateError) {
          logger.error('Update error:', { error: updateError });
        }
      }
    }

    logger.info(`Enriched ${enrichedCount} addresses from CSV`, { tenantId });

    return successResponse({
      enrichedCount,
      total: csvRows.length,
      matched: enrichedCount,
      unmatched: csvRows.length - enrichedCount,
    });
  } catch (error) {
    logger.error('CSV enrichment error:', { error });
    return errorResponse(error instanceof Error ? error : InternalError());
  }
}
