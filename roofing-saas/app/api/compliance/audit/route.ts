import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
} from '@/lib/api/errors'
import { paginatedResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  result: z.enum(['pass', 'fail', 'warning']).optional(),
  checkType: z
    .enum(['dnc_check', 'time_check', 'consent_check', 'opt_out_check'])
    .optional(),
  contactId: z.string().uuid().optional(),
})

/**
 * GET /api/compliance/audit?page=1&limit=50&result=blocked&checkType=dnc_check
 * Get compliance audit log entries
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

    logger.apiRequest('GET', '/api/compliance/audit', { tenantId, userId: user.id })

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      queryParams[key] = value
    })

    const validatedParams = querySchema.safeParse(queryParams)
    if (!validatedParams.success) {
      const firstError = validatedParams.error.issues[0]
      throw ValidationError(
        `Invalid query parameter: ${String(firstError.path[0])} - ${firstError.message}`,
        { errors: validatedParams.error.issues }
      )
    }

    const { page, limit, result, checkType, contactId } = validatedParams.data

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('call_compliance_log')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)

    // Apply filters
    if (result) {
      query = query.eq('result', result)
    }

    if (checkType) {
      query = query.eq('check_type', checkType)
    }

    if (contactId) {
      query = query.eq('contact_id', contactId)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      logger.error('Error fetching compliance audit log', { error, tenantId })
      throw ValidationError('Failed to fetch compliance audit log', {
        error: error.message,
      })
    }

    // Transform data to match ComplianceLogEntry type
    const logs = (data || []).map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      contactId: row.contact_id,
      callLogId: row.call_log_id,
      userId: row.user_id,
      phoneNumber: row.phone_number,
      checkType: row.check_type,
      result: row.result,
      reason: row.reason,
      dncSource: row.dnc_source,
      contactTimezone: row.contact_timezone,
      contactLocalTime: row.contact_local_time,
      metadata: row.metadata,
      createdAt: row.created_at,
    }))

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/compliance/audit', 200, duration)

    return paginatedResponse(
      {
        logs,
      },
      {
        page,
        limit,
        total: count || 0,
      }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Compliance audit error', { error, duration })
    return errorResponse(error as Error)
  }
}
