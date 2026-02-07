import { NextRequest, NextResponse } from 'next/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { createAdminClient } from '@/lib/supabase/server'
import { verifySystemAdmin } from '@/lib/auth/system-admin'
import { AuthorizationError, InternalError, NotFoundError } from '@/lib/api/errors'
import { errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * Tables with tenant_id + is_deleted columns.
 * Each will be filtered with .eq('tenant_id', tenantId).eq('is_deleted', false).
 */
const TABLES_WITH_SOFT_DELETE = [
  'contacts',
  'projects',
  'activities',
  'tasks',
  'documents',
  'timesheets',
  'job_expenses',
  'material_purchases',
  'call_logs',
  'quote_options',
  'quote_line_items',
  'sms_templates',
  'email_templates',
  'campaigns',
] as const

/**
 * Tables with tenant_id but WITHOUT is_deleted column.
 * Filtered with .eq('tenant_id', tenantId) only.
 */
const TABLES_WITHOUT_SOFT_DELETE = [
  'crew_members',
  'quote_proposals',
] as const

/**
 * GET /api/admin/data-export/[tenantId]
 *
 * Export all tenant data as a JSON download.
 * Security: Only system admins (owner of Clarity AI tenant) can access.
 */
export const GET = withAuthParams(async (_request: NextRequest, { user }, { params }) => {
  try {
    const isSystemAdmin = await verifySystemAdmin(user)
    if (!isSystemAdmin) {
      throw AuthorizationError('System admin access required')
    }

    const { tenantId } = await params
    const adminClient = await createAdminClient()

    // Verify tenant exists
    const { data: tenant, error: tenantError } = await adminClient
      .from('tenants')
      .select('id, name')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      throw NotFoundError('Tenant')
    }

    const exportData: Record<string, unknown> = {
      export_metadata: {
        tenant_id: tenantId,
        tenant_name: tenant.name,
        exported_at: new Date().toISOString(),
        exported_by: user.id,
      },
    }

    // Export tables with soft delete filtering
    for (const table of TABLES_WITH_SOFT_DELETE) {
      const { data, error } = await adminClient
        .from(table)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_deleted', false)

      if (error) {
        logger.error(`Error exporting table ${table}`, { error, tenantId })
        // Continue with other tables rather than failing the entire export
        exportData[table] = { error: `Failed to export: ${error.message}` }
      } else {
        exportData[table] = data || []
      }
    }

    // Export tables without soft delete
    for (const table of TABLES_WITHOUT_SOFT_DELETE) {
      const { data, error } = await adminClient
        .from(table)
        .select('*')
        .eq('tenant_id', tenantId)

      if (error) {
        logger.error(`Error exporting table ${table}`, { error, tenantId })
        exportData[table] = { error: `Failed to export: ${error.message}` }
      } else {
        exportData[table] = data || []
      }
    }

    // Export campaign_steps via campaign_id (no tenant_id column)
    const campaignIds = (
      (exportData.campaigns as Array<{ id: string }>) || []
    ).map((c) => c.id)

    if (campaignIds.length > 0) {
      const { data, error } = await adminClient
        .from('campaign_steps')
        .select('*')
        .in('campaign_id', campaignIds)
        .eq('is_deleted', false)

      if (error) {
        logger.error('Error exporting campaign_steps', { error, tenantId })
        exportData.campaign_steps = { error: `Failed to export: ${error.message}` }
      } else {
        exportData.campaign_steps = data || []
      }
    } else {
      exportData.campaign_steps = []
    }

    // Export tenant_users (no is_deleted column)
    const { data: tenantUsers, error: tuError } = await adminClient
      .from('tenant_users')
      .select('*')
      .eq('tenant_id', tenantId)

    if (tuError) {
      logger.error('Error exporting tenant_users', { error: tuError, tenantId })
      exportData.tenant_users = { error: `Failed to export: ${tuError.message}` }
    } else {
      exportData.tenant_users = tenantUsers || []
    }

    // Include the tenant record itself
    const { data: tenantRecord, error: trError } = await adminClient
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single()

    if (trError) {
      logger.error('Error exporting tenant record', { error: trError, tenantId })
      exportData.tenant = { error: `Failed to export: ${trError.message}` }
    } else {
      exportData.tenant = tenantRecord
    }

    const jsonPayload = JSON.stringify(exportData, null, 2)
    const sanitizedName = tenant.name.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

    return new NextResponse(jsonPayload, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="tenant-export-${sanitizedName}-${timestamp}.json"`,
      },
    })
  } catch (error) {
    logger.error('Error in GET /api/admin/data-export/[tenantId]', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
