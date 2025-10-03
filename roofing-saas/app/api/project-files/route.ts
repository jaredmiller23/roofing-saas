import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError,
  mapSupabaseError,
} from '@/lib/api/errors'
import { paginatedResponse, createdResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * GET /api/project-files
 * List project files with filtering and pagination
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

    logger.apiRequest('GET', '/api/project-files', { tenantId, userId: user.id })

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const fileType = searchParams.get('file_type') || undefined
    const fileCategory = searchParams.get('file_category') || undefined
    const projectId = searchParams.get('project_id') || undefined
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortOrder = (searchParams.get('sort_order') || 'desc') as 'asc' | 'desc'

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('project_files')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    // Apply filters
    if (fileType) {
      query = query.eq('file_type', fileType)
    }
    if (fileCategory) {
      query = query.eq('file_category', fileCategory)
    }
    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    // Sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    const { data: files, error, count } = await query

    if (error) {
      throw mapSupabaseError(error)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/project-files', 200, duration)

    const response = {
      files: files || [],
      total: count || 0,
      page,
      limit,
      has_more: count ? from + limit < count : false,
    }

    return paginatedResponse(response, { page, limit, total: count || 0 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Project files API error', { error, duration })
    return errorResponse(error as Error)
  }
}

/**
 * POST /api/project-files
 * Create a new project file record
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

    logger.apiRequest('POST', '/api/project-files', { tenantId, userId: user.id })

    const body = await request.json()

    const supabase = await createClient()

    // Create file record
    const { data: file, error } = await supabase
      .from('project_files')
      .insert({
        ...body,
        tenant_id: tenantId,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (error) {
      throw mapSupabaseError(error)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/project-files', 201, duration)
    logger.info('Project file created', { fileId: file.id, tenantId })

    return createdResponse({ file })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Create project file error', { error, duration })
    return errorResponse(error as Error)
  }
}
