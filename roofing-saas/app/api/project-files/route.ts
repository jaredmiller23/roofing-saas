import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { NextRequest } from 'next/server'
import {
  mapSupabaseError,
} from '@/lib/api/errors'
import { paginatedResponse, createdResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * GET /api/project-files
 * List project files with filtering and pagination
 */
export const GET = withAuth(async (request: NextRequest, { userId, tenantId }) => {
  const startTime = Date.now()

  try {
    logger.apiRequest('GET', '/api/project-files', { tenantId, userId })

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const fileType = searchParams.get('file_type') || undefined
    const fileCategory = searchParams.get('file_category') || undefined
    const projectId = searchParams.get('project_id') || undefined
    const folderPath = searchParams.get('folder_path') || undefined
    const searchTerm = searchParams.get('search_term') || undefined
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
    if (folderPath !== undefined) {
      if (folderPath === '') {
        // Root folder - files with null or empty folder_path
        query = query.or('folder_path.is.null,folder_path.eq.')
      } else {
        // Specific folder or subfolder
        query = query.or(`folder_path.eq.${folderPath},folder_path.like.${folderPath}/%`)
      }
    }
    // Basic text search in file name and description
    if (searchTerm) {
      const searchPattern = `%${searchTerm}%`
      query = query.or(`file_name.ilike.${searchPattern},description.ilike.${searchPattern}`)
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
})

/**
 * POST /api/project-files
 * Create a new project file record
 */
export const POST = withAuth(async (request: NextRequest, { userId, tenantId }) => {
  const startTime = Date.now()

  try {
    logger.apiRequest('POST', '/api/project-files', { tenantId, userId })

    const body = await request.json()

    const supabase = await createClient()

    // Create file record (columns match project_files table schema)
    const fileData = {
      file_name: body.file_name,
      file_type: body.file_type,
      file_category: body.file_category,
      file_url: body.file_url,
      file_size: body.file_size,
      mime_type: body.mime_type,
      thumbnail_url: body.thumbnail_url,
      project_id: body.project_id,
      description: body.description,
      tags: body.tags || [],
      tenant_id: tenantId,
      uploaded_by: userId,
      is_deleted: false,
    }

    const { data: file, error } = await supabase
      .from('project_files')
      .insert(fileData)
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
})
