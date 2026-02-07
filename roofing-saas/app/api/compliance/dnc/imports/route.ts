import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * GET /api/compliance/dnc/imports?limit=5
 * Get recent DNC import history for tenant
 */
export const GET = withAuth(async (request: NextRequest, { userId, tenantId }) => {
  const startTime = Date.now()

  try {
    logger.apiRequest('GET', '/api/compliance/dnc/imports', { tenantId, userId })

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
        file_name,
        records_total,
        records_imported,
        records_failed,
        created_at,
        imported_by
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      logger.error('Error fetching DNC imports', { error })
      throw new Error('Failed to fetch import history')
    }

    // Get user emails for imports
    const userIds = [...new Set(imports?.map(i => i.imported_by).filter((id): id is string => id !== null))]
    let userMap: Record<string, string> = {}

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, email')
        .in('id', userIds)

      if (users) {
        userMap = Object.fromEntries(
          users
            .filter((u): u is typeof u & { id: string; email: string } => u.id !== null && u.email !== null)
            .map(u => [u.id, u.email])
        )
      }
    }

    // Transform for response
    const formattedImports = imports?.map(imp => ({
      id: imp.id,
      filename: imp.file_name || `Import ${new Date(imp.created_at ?? '').toLocaleDateString()}`,
      records_added: imp.records_imported || 0,
      records_failed: imp.records_failed || 0,
      total_records: imp.records_total || 0,
      created_at: imp.created_at,
      created_by_email: (imp.imported_by && userMap[imp.imported_by]) || 'Unknown',
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
})
