import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId, isAdmin } from '@/lib/auth/session'
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  InternalError
} from '@/lib/api/errors'
import { errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import type { AuditLogFilters, AuditEntry } from '@/lib/audit/audit-types'

/**
 * GET /api/admin/audit-log/export
 * Export audit log entries as CSV for compliance reporting
 * Admin-only endpoint
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

    logger.apiRequest('GET', '/api/admin/audit-log/export', { tenantId, userId: user.id })

    const searchParams = request.nextUrl.searchParams

    // Parse filters (same as main audit log endpoint, but without pagination)
    const filters: Omit<AuditLogFilters, 'page' | 'limit'> = {
      search: searchParams.get('search') || undefined,
      user_id: searchParams.get('user_id') || undefined,
      entity_type: (searchParams.get('entity_type') as AuditLogFilters['entity_type']) || undefined,
      action_type: (searchParams.get('action_type') as AuditLogFilters['action_type']) || undefined,
      entity_id: searchParams.get('entity_id') || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      sort_by: (searchParams.get('sort_by') as AuditLogFilters['sort_by']) || 'timestamp',
      sort_order: (searchParams.get('sort_order') as AuditLogFilters['sort_order']) || 'desc',
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

    // Build query (no pagination limit for export)
    let query = supabase
      .from('audit_log')
      .select('*')
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

    // Sorting
    const sortColumn = filters.sort_by!
    const ascending = filters.sort_order === 'asc'
    query = query.order(sortColumn, { ascending })

    // Limit to reasonable export size (10k entries max)
    query = query.limit(10000)

    // Execute query
    const { data: entries, error } = await query

    if (error) {
      logger.error('Audit log export query error', { error, filters })
      throw InternalError('Failed to fetch audit log entries for export')
    }

    if (!entries || entries.length === 0) {
      throw ValidationError('No audit entries found for the specified filters')
    }

    // Convert to CSV
    const csv = generateCSV(entries as AuditEntry[])

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/admin/audit-log/export', 200, duration)

    logger.info('Audit log exported', {
      userId: user.id,
      tenantId,
      entryCount: entries.length,
      filters: {
        ...filters,
        // Don't log sensitive search terms
        search: filters.search ? '[FILTERED]' : undefined
      }
    })

    // Return CSV file
    const filename = `audit-log-${new Date().toISOString().split('T')[0]}.csv`

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Audit log export API error', { error, duration })
    return errorResponse(error as Error)
  }
}

/**
 * Generate CSV content from audit entries
 */
function generateCSV(entries: AuditEntry[]): string {
  // CSV headers
  const headers = [
    'Timestamp',
    'User ID',
    'User Name',
    'User Email',
    'Tenant ID',
    'Action Type',
    'Entity Type',
    'Entity ID',
    'IP Address',
    'User Agent',
    'Has Before Values',
    'Has After Values',
    'Before Values (JSON)',
    'After Values (JSON)',
    'Metadata (JSON)',
    'Created At',
    'Updated At'
  ]

  // Escape CSV field values
  const escapeCSV = (value: unknown): string => {
    if (value === null || value === undefined) {
      return ''
    }

    const str = String(value)

    // If field contains comma, quote, or newline, wrap in quotes and escape quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`
    }

    return str
  }

  // Generate CSV rows
  const rows = entries.map(entry => {
    return [
      escapeCSV(entry.timestamp),
      escapeCSV(entry.user_id),
      escapeCSV(entry.user_name),
      escapeCSV(entry.user_email),
      escapeCSV(entry.tenant_id),
      escapeCSV(entry.action_type),
      escapeCSV(entry.entity_type),
      escapeCSV(entry.entity_id),
      escapeCSV(entry.ip_address),
      escapeCSV(entry.user_agent),
      escapeCSV(entry.before_values ? 'Yes' : 'No'),
      escapeCSV(entry.after_values ? 'Yes' : 'No'),
      escapeCSV(entry.before_values ? JSON.stringify(entry.before_values) : ''),
      escapeCSV(entry.after_values ? JSON.stringify(entry.after_values) : ''),
      escapeCSV(entry.metadata ? JSON.stringify(entry.metadata) : ''),
      escapeCSV(entry.created_at),
      escapeCSV(entry.updated_at)
    ].join(',')
  })

  // Combine headers and rows
  return [headers.join(','), ...rows].join('\n')
}

/**
 * POST /api/admin/audit-log/export
 * Generate audit report with custom format (PDF, detailed CSV, etc.)
 * Admin-only endpoint for advanced compliance reporting
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

    logger.apiRequest('POST', '/api/admin/audit-log/export', { tenantId, userId: user.id })

    const body = await request.json()

    // Validate report configuration
    const { format = 'csv', filters = {}, options = {} } = body

    if (!['csv', 'json'].includes(format)) {
      throw ValidationError('Invalid format. Must be "csv" or "json"')
    }

    // Get audit entries based on filters
    const supabase = await createClient()

    let query = supabase
      .from('audit_log')
      .select('*')
      .eq('tenant_id', tenantId)

    // Apply filters from request body
    if (filters.user_id) query = query.eq('user_id', filters.user_id)
    if (filters.entity_type) query = query.eq('entity_type', filters.entity_type)
    if (filters.action_type) query = query.eq('action_type', filters.action_type)
    if (filters.entity_id) query = query.eq('entity_id', filters.entity_id)
    if (filters.start_date) query = query.gte('timestamp', filters.start_date)
    if (filters.end_date) query = query.lte('timestamp', `${filters.end_date}T23:59:59.999Z`)

    // Search
    if (filters.search) {
      query = query.or(
        `user_name.ilike.%${filters.search}%,` +
        `user_email.ilike.%${filters.search}%,` +
        `entity_id.ilike.%${filters.search}%`
      )
    }

    // Sorting and limits
    query = query
      .order(filters.sort_by || 'timestamp', { ascending: filters.sort_order === 'asc' })
      .limit(options.max_records || 10000)

    const { data: entries, error } = await query

    if (error) {
      throw InternalError('Failed to fetch audit entries for custom report')
    }

    if (!entries || entries.length === 0) {
      throw ValidationError('No audit entries found for the specified criteria')
    }

    let content: string
    let contentType: string
    let filename: string

    if (format === 'json') {
      // Generate detailed JSON report
      const report = {
        metadata: {
          generated_at: new Date().toISOString(),
          generated_by: user.email,
          tenant_id: tenantId,
          total_entries: entries.length,
          filters: filters,
          options: options
        },
        entries: entries
      }

      content = JSON.stringify(report, null, options.pretty_print ? 2 : 0)
      contentType = 'application/json'
      filename = `audit-report-${new Date().toISOString().split('T')[0]}.json`
    } else {
      // Generate detailed CSV
      content = generateCSV(entries as AuditEntry[])
      contentType = 'text/csv'
      filename = `audit-report-${new Date().toISOString().split('T')[0]}.csv`
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/admin/audit-log/export', 200, duration)

    logger.info('Custom audit report generated', {
      userId: user.id,
      tenantId,
      format,
      entryCount: entries.length,
      options
    })

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Custom audit report export error', { error, duration })
    return errorResponse(error as Error)
  }
}