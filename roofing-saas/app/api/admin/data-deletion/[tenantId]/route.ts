import { NextRequest } from 'next/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { createAdminClient } from '@/lib/supabase/server'
import { verifySystemAdmin } from '@/lib/auth/system-admin'
import {
  AuthorizationError,
  InternalError,
  NotFoundError,
  ValidationError,
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/** The production tenant must NEVER be deleted */
const PRODUCTION_TENANT_ID = '00000000-0000-0000-0000-000000000000'

/**
 * Deletion order matters due to foreign key constraints.
 * Delete from leaf tables first, then work up to parent tables.
 *
 * Each entry specifies:
 * - table: the table name
 * - filterColumn: column to filter by (usually 'tenant_id', sometimes 'campaign_id')
 * - hasIsDeleted: whether the table has is_deleted (not used for filtering on delete,
 *   but documented for clarity -- we delete ALL rows including soft-deleted ones)
 */
const DELETION_ORDER = [
  // Leaf tables first (FK children)
  { table: 'quote_line_items', filterColumn: 'tenant_id' },
  { table: 'quote_options', filterColumn: 'tenant_id' },
  { table: 'quote_proposals', filterColumn: 'tenant_id' },
  { table: 'activities', filterColumn: 'tenant_id' },
  { table: 'call_logs', filterColumn: 'tenant_id' },
  { table: 'tasks', filterColumn: 'tenant_id' },
  { table: 'timesheets', filterColumn: 'tenant_id' },
  { table: 'job_expenses', filterColumn: 'tenant_id' },
  { table: 'material_purchases', filterColumn: 'tenant_id' },
  { table: 'documents', filterColumn: 'tenant_id' },
  { table: 'crew_members', filterColumn: 'tenant_id' },
  { table: 'projects', filterColumn: 'tenant_id' },
  { table: 'contacts', filterColumn: 'tenant_id' },
  // campaign_steps has no tenant_id -- handled separately via campaign_id
  { table: 'campaign_steps', filterColumn: 'campaign_id' },
  { table: 'campaigns', filterColumn: 'tenant_id' },
  { table: 'sms_templates', filterColumn: 'tenant_id' },
  { table: 'email_templates', filterColumn: 'tenant_id' },
  { table: 'tenant_users', filterColumn: 'tenant_id' },
] as const

/**
 * DELETE /api/admin/data-deletion/[tenantId]
 *
 * Permanently delete all tenant data. This is irreversible.
 * Requires system admin verification and a confirmation field matching the tenant name.
 * The production tenant (Appalachian Storm Restoration) cannot be deleted.
 *
 * Security: Only system admins (owner of Clarity AI tenant) can access.
 */
export const DELETE = withAuthParams(async (request: NextRequest, { user }, { params }) => {
  try {
    const isSystemAdmin = await verifySystemAdmin(user)
    if (!isSystemAdmin) {
      throw AuthorizationError('System admin access required')
    }

    const { tenantId } = await params

    // Prevent deletion of the production tenant
    if (tenantId === PRODUCTION_TENANT_ID) {
      throw ValidationError(
        'Cannot delete the production tenant. This operation is permanently blocked.'
      )
    }

    const adminClient = await createAdminClient()

    // Verify tenant exists and get its name
    const { data: tenant, error: tenantError } = await adminClient
      .from('tenants')
      .select('id, name')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      throw NotFoundError('Tenant')
    }

    // Require confirmation matching the tenant name
    let body: { confirmation?: string }
    try {
      body = await request.json()
    } catch {
      throw ValidationError('Request body must be valid JSON with a "confirmation" field')
    }

    if (!body.confirmation || body.confirmation !== tenant.name) {
      throw ValidationError(
        `Confirmation does not match. Please type the exact tenant name: "${tenant.name}"`
      )
    }

    logger.info('Starting tenant data deletion', {
      tenantId,
      tenantName: tenant.name,
      deletedBy: user.id,
    })

    const deletionSummary: Record<string, number> = {}

    // First, collect campaign IDs for campaign_steps deletion
    const { data: campaigns } = await adminClient
      .from('campaigns')
      .select('id')
      .eq('tenant_id', tenantId)

    const campaignIds = (campaigns || []).map((c) => c.id)

    // Delete in order
    for (const { table, filterColumn } of DELETION_ORDER) {
      try {
        if (table === 'campaign_steps') {
          // campaign_steps has no tenant_id -- delete via campaign_id
          if (campaignIds.length > 0) {
            const { data, error } = await adminClient
              .from('campaign_steps')
              .delete()
              .in('campaign_id', campaignIds)
              .select('id')

            if (error) {
              logger.error(`Error deleting ${table}`, { error, tenantId })
              deletionSummary[table] = -1 // -1 indicates error
            } else {
              deletionSummary[table] = data?.length ?? 0
            }
          } else {
            deletionSummary[table] = 0
          }
        } else {
          const { data, error } = await adminClient
            .from(table)
            .delete()
            .eq(filterColumn, tenantId)
            .select('id')

          if (error) {
            logger.error(`Error deleting ${table}`, { error, tenantId })
            deletionSummary[table] = -1
          } else {
            deletionSummary[table] = data?.length ?? 0
          }
        }
      } catch (tableError) {
        logger.error(`Unexpected error deleting ${table}`, { error: tableError, tenantId })
        deletionSummary[table] = -1
      }
    }

    // Finally, delete the tenant itself
    const { error: tenantDeleteError } = await adminClient
      .from('tenants')
      .delete()
      .eq('id', tenantId)

    if (tenantDeleteError) {
      logger.error('Error deleting tenant record', { error: tenantDeleteError, tenantId })
      deletionSummary.tenants = -1
    } else {
      deletionSummary.tenants = 1
    }

    const totalDeleted = Object.values(deletionSummary)
      .filter((v) => v > 0)
      .reduce((sum, v) => sum + v, 0)

    const errors = Object.entries(deletionSummary)
      .filter(([, v]) => v === -1)
      .map(([table]) => table)

    logger.info('Tenant data deletion complete', {
      tenantId,
      tenantName: tenant.name,
      totalDeleted,
      errors,
      summary: deletionSummary,
    })

    return successResponse({
      tenant_id: tenantId,
      tenant_name: tenant.name,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      total_rows_deleted: totalDeleted,
      tables: deletionSummary,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    logger.error('Error in DELETE /api/admin/data-deletion/[tenantId]', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
