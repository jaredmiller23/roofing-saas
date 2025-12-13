import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError,
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * GET /api/compliance/dnc/imports?limit=5
 * Get recent DNC import history for tenant
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

    logger.apiRequest('GET', '/api/compliance/dnc/imports', { tenantId, userId: user.id })

    // Get optional limit parameter
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 10

    const supabase = await createClient()

    // Get recent imports with user email
    const { data: imports, error } = await supabase
      .from('dnc_imports')
      .select(`
        id,
        source,
        numbers_count,
        numbers_added,
        numbers_updated,
        numbers_failed,
        created_at,
        imported_by,
        metadata
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      logger.error('Error fetching DNC imports', { error })
      throw new Error('Failed to fetch import history')
    }

    // Get user emails for imports
    const userIds = [...new Set(imports?.map(i => i.imported_by).filter(Boolean))]
    let userMap: Record<string, string> = {}

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds)

      if (users) {
        userMap = Object.fromEntries(users.map(u => [u.id, u.email]))
      }
    }

    // Transform for response
    const formattedImports = imports?.map(imp => ({
      id: imp.id,
      source: imp.source,
      filename: imp.metadata?.filename || `Import ${new Date(imp.created_at).toLocaleDateString()}`,
      records_added: imp.numbers_added || 0,
      records_updated: imp.numbers_updated || 0,
      records_failed: imp.numbers_failed || 0,
      total_records: imp.numbers_count || 0,
      created_at: imp.created_at,
      created_by_email: userMap[imp.imported_by] || 'Unknown',
    })) || []

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/compliance/dnc/imports', 200, duration)

    return successResponse({
      imports: formattedImports,
      total: formattedImports.length,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('DNC imports fetch error', { error, duration })
    return errorResponse(error as Error)
  }
}
