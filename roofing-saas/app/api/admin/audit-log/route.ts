import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId, isAdmin } from '@/lib/auth/session'
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  InternalError
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import type { AuditLogResponse, AuditLogFilters, AuditEntry, AuditEntityType, AuditActionType } from '@/lib/audit/audit-types'

/**
 * GET /api/admin/audit-log
 * Fetch audit log entries with filtering and pagination
 * Admin-only endpoint for compliance and troubleshooting
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(user.id)
    if (!userIsAdmin) {
      throw AuthorizationError('Admin access required')
    }

    logger.apiRequest('GET', '/api/admin/audit-log', { tenantId, userId: user.id })

    const searchParams = request.nextUrl.searchParams

    // Parse and validate query parameters
    const filters: AuditLogFilters = {
      search: searchParams.get('search') || undefined,
      user_id: searchParams.get('user_id') || undefined,
      entity_type: searchParams.get('entity_type') as AuditEntityType || undefined,
      action_type: searchParams.get('action_type') as AuditActionType || undefined,
      entity_id: searchParams.get('entity_id') || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
      sort_by: (searchParams.get('sort_by') as 'timestamp' | 'user_name' | 'action_type' | 'entity_type') || 'timestamp',
      sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc',
    }

    // Validate pagination parameters
    if (filters.page! < 1) {
      throw ValidationError('Page must be greater than 0')
    }

    if (filters.limit! < 1 || filters.limit! > 1000) {
      throw ValidationError('Limit must be between 1 and 1000')
    }

    // Validate sort parameters
    const validSortColumns = ['timestamp', 'user_name', 'action_type', 'entity_type']
    if (!validSortColumns.includes(filters.sort_by!)) {
      throw ValidationError(`Invalid sort column. Must be one of: ${validSortColumns.join(', ')}`)
    }

    if (!['asc', 'desc'].includes(filters.sort_order!)) {
      throw ValidationError('Sort order must be "asc" or "desc"')
    }

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('audit_log')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)

    // Apply filters
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id)
    }

    if (filters.entity_type) {
      query = query.eq('entity_type', filters.entity_type)
    }

    if (filters.action_type) {
      query = query.eq('action_type', filters.action_type)
    }

    if (filters.entity_id) {
      query = query.eq('entity_id', filters.entity_id)
    }

    // Date range filters
    if (filters.start_date) {
      query = query.gte('timestamp', filters.start_date)
    }

    if (filters.end_date) {
      // Add 23:59:59 to end date to include the full day
      const endDateTime = `${filters.end_date}T23:59:59.999Z`
      query = query.lte('timestamp', endDateTime)
    }

    // Search across user name, email, and entity ID
    if (filters.search) {
      query = query.or(
        `user_name.ilike.%${filters.search}%,` +
        `user_email.ilike.%${filters.search}%,` +
        `entity_id.ilike.%${filters.search}%`
      )
    }

    // Pagination
    const page = filters.page!
    const limit = filters.limit!
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query.range(from, to)

    // Sorting
    const sortColumn = filters.sort_by!
    const ascending = filters.sort_order === 'asc'

    query = query.order(sortColumn, { ascending })

    // Execute query
    const { data: entries, error, count } = await query

    if (error) {
      logger.error('Audit log query error', { error, filters })
      throw InternalError('Failed to fetch audit log entries')
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/admin/audit-log', 200, duration)

    const response: AuditLogResponse = {
      entries: (entries as AuditEntry[]) || [],
      total: count || 0,
      page,
      limit,
      has_more: count ? from + limit < count : false,
    }

    logger.info('Audit log accessed', {
      userId: user.id,
      tenantId,
      entryCount: entries?.length || 0,
      totalCount: count || 0,
      filters: {
        ...filters,
        // Don't log sensitive search terms
        search: filters.search ? '[FILTERED]' : undefined
      }
    })

    return successResponse(response)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Audit log API error', { error, duration })
    return errorResponse(error as Error)
  }
}

/**
 * POST /api/admin/audit-log
 * Manual audit log creation (for system events, migration, etc.)
 * Admin-only endpoint
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(user.id)
    if (!userIsAdmin) {
      throw AuthorizationError('Admin access required')
    }

    logger.apiRequest('POST', '/api/admin/audit-log', { tenantId, userId: user.id })

    const body = await request.json()

    // Validate required fields
    const requiredFields = ['action_type', 'entity_type', 'entity_id']
    const missingFields = requiredFields.filter(field => !body[field])

    if (missingFields.length > 0) {
      throw ValidationError(`Missing required fields: ${missingFields.join(', ')}`)
    }

    // Validate action_type
    const validActions = ['create', 'update', 'delete']
    if (!validActions.includes(body.action_type)) {
      throw ValidationError(`Invalid action_type. Must be one of: ${validActions.join(', ')}`)
    }

    // Validate entity_type
    const validEntities = ['contact', 'project', 'estimate', 'user', 'tenant', 'settings', 'document']
    if (!validEntities.includes(body.entity_type)) {
      throw ValidationError(`Invalid entity_type. Must be one of: ${validEntities.join(', ')}`)
    }

    const supabase = await createClient()

    // Create audit entry
    const auditEntry = {
      user_id: user.id,
      user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'System',
      user_email: user.email || 'system@example.com',
      tenant_id: tenantId,
      action_type: body.action_type,
      entity_type: body.entity_type,
      entity_id: body.entity_id,
      before_values: body.before_values || null,
      after_values: body.after_values || null,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null,
      metadata: {
        ...body.metadata,
        source: 'manual',
        created_by_admin: user.id,
        manual_entry: true
      },
      timestamp: new Date().toISOString()
    }

    const { data: entry, error } = await supabase
      .from('audit_log')
      .insert(auditEntry)
      .select()
      .single()

    if (error) {
      logger.error('Manual audit entry creation error', { error, auditEntry })
      throw InternalError('Failed to create audit entry')
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/admin/audit-log', 201, duration)

    logger.info('Manual audit entry created', {
      entryId: entry.id,
      userId: user.id,
      tenantId,
      entity_type: body.entity_type,
      entity_id: body.entity_id,
      action_type: body.action_type
    })

    return successResponse({ entry }, 201)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Manual audit log creation error', { error, duration })
    return errorResponse(error as Error)
  }
}