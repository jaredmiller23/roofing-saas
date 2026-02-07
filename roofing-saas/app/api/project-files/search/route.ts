import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { NextRequest } from 'next/server'
import {
  ValidationError,
  mapSupabaseError,
} from '@/lib/api/errors'
import { paginatedResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { FileSearchFilters, RoofingFileCategory, FileType } from '@/lib/types/file'

/**
 * GET /api/project-files/search
 * Advanced search for project files with filtering
 */
export const GET = withAuth(async (request: NextRequest, { userId, tenantId }) => {
  const startTime = Date.now()

  try {
    logger.apiRequest('GET', '/api/project-files/search', { tenantId, userId })

    const searchParams = request.nextUrl.searchParams

    // Parse search parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const searchTerm = searchParams.get('search_term') || undefined
    const projectId = searchParams.get('project_id') || undefined
    const folderPath = searchParams.get('folder_path') || undefined
    const uploadedBy = searchParams.get('uploaded_by') || undefined
    const dateFrom = searchParams.get('date_from') || undefined
    const dateTo = searchParams.get('date_to') || undefined
    const fileSizeMin = searchParams.get('file_size_min') ? parseInt(searchParams.get('file_size_min')!) : undefined
    const fileSizeMax = searchParams.get('file_size_max') ? parseInt(searchParams.get('file_size_max')!) : undefined
    const hasVersions = searchParams.get('has_versions') === 'true' ? true : undefined
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortOrder = (searchParams.get('sort_order') || 'desc') as 'asc' | 'desc'

    // Parse array parameters
    const fileTypes = searchParams.getAll('file_type') as FileType[]
    const fileCategories = searchParams.getAll('file_category') as RoofingFileCategory[]

    // Validate search parameters
    if (limit > 100) {
      throw ValidationError('Limit cannot exceed 100')
    }

    if (searchTerm && searchTerm.length < 2) {
      throw ValidationError('Search term must be at least 2 characters')
    }

    const supabase = await createClient()

    // Build base query
    let query = supabase
      .from('project_files')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    // Apply filters
    if (fileTypes.length > 0) {
      query = query.in('file_type', fileTypes)
    }

    if (fileCategories.length > 0) {
      query = query.in('file_category', fileCategories)
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

    if (uploadedBy) {
      query = query.eq('uploaded_by', uploadedBy)
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    if (fileSizeMin !== undefined) {
      query = query.gte('file_size', fileSizeMin)
    }

    if (fileSizeMax !== undefined) {
      query = query.lte('file_size', fileSizeMax)
    }

    // Text search in file name and description
    if (searchTerm) {
      const searchPattern = `%${searchTerm}%`
      query = query.or(`file_name.ilike.${searchPattern},description.ilike.${searchPattern}`)
    }

    // Filter files with versions (files that have parent_file_id set or are parents themselves)
    if (hasVersions !== undefined) {
      if (hasVersions) {
        // Files that have versions or are versions
        const { data: filesWithVersions } = await supabase
          .from('project_files')
          .select('id, parent_file_id')
          .eq('tenant_id', tenantId)
          .eq('is_deleted', false)
          .not('parent_file_id', 'is', null)

        const parentIds = filesWithVersions?.map(f => f.parent_file_id).filter((id): id is string => id !== null) || []
        const versionIds = filesWithVersions?.map(f => f.id) || []
        const allVersionedIds = [...new Set([...parentIds, ...versionIds])]

        if (allVersionedIds.length > 0) {
          query = query.in('id', allVersionedIds)
        } else {
          // No versioned files, return empty result
          query = query.eq('id', 'non-existent-id')
        }
      } else {
        // Files without versions
        query = query.is('parent_file_id', null)
      }
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    // Sorting
    const allowedSortFields = ['created_at', 'updated_at', 'file_name', 'file_size', 'file_type', 'file_category']
    if (allowedSortFields.includes(sortBy)) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data: files, error, count } = await query

    if (error) {
      throw mapSupabaseError(error)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/project-files/search', 200, duration)

    // Build filters object for response
    const appliedFilters: FileSearchFilters = {
      ...(fileTypes.length > 0 && { file_type: fileTypes }),
      ...(fileCategories.length > 0 && { file_category: fileCategories }),
      ...(projectId && { project_id: projectId }),
      ...(folderPath !== undefined && { folder_path: folderPath }),
      ...(searchTerm && { search_term: searchTerm }),
      ...(uploadedBy && { uploaded_by: uploadedBy }),
      ...(dateFrom && { date_from: dateFrom }),
      ...(dateTo && { date_to: dateTo }),
      ...(fileSizeMin !== undefined && { file_size_min: fileSizeMin }),
      ...(fileSizeMax !== undefined && { file_size_max: fileSizeMax }),
      ...(hasVersions !== undefined && { has_versions: hasVersions }),
    }

    const response = {
      files: files || [],
      total: count || 0,
      page,
      limit,
      has_more: count ? from + limit < count : false,
      search_term: searchTerm,
      filters_applied: appliedFilters,
    }

    return paginatedResponse(response, { page, limit, total: count || 0 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Project files search API error', { error, duration })
    return errorResponse(error as Error)
  }
})

/**
 * POST /api/project-files/search
 * Advanced search with complex filter objects
 */
export const POST = withAuth(async (request: NextRequest, { userId, tenantId }) => {
  const startTime = Date.now()

  try {
    logger.apiRequest('POST', '/api/project-files/search', { tenantId, userId })

    const body = await request.json()
    const {
      filters = {},
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = body

    const searchFilters: FileSearchFilters = filters

    // Validate
    if (limit > 100) {
      throw ValidationError('Limit cannot exceed 100')
    }

    if (searchFilters.search_term && searchFilters.search_term.length < 2) {
      throw ValidationError('Search term must be at least 2 characters')
    }

    const supabase = await createClient()

    // Build query using filters object
    let query = supabase
      .from('project_files')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    // Apply all filters
    if (searchFilters.file_type && searchFilters.file_type.length > 0) {
      query = query.in('file_type', searchFilters.file_type)
    }

    if (searchFilters.file_category && searchFilters.file_category.length > 0) {
      query = query.in('file_category', searchFilters.file_category)
    }

    if (searchFilters.project_id) {
      query = query.eq('project_id', searchFilters.project_id)
    }

    if (searchFilters.folder_path !== undefined) {
      if (searchFilters.folder_path === '') {
        query = query.or('folder_path.is.null,folder_path.eq.')
      } else {
        query = query.or(`folder_path.eq.${searchFilters.folder_path},folder_path.like.${searchFilters.folder_path}/%`)
      }
    }

    if (searchFilters.uploaded_by) {
      query = query.eq('uploaded_by', searchFilters.uploaded_by)
    }

    if (searchFilters.date_from) {
      query = query.gte('created_at', searchFilters.date_from)
    }

    if (searchFilters.date_to) {
      query = query.lte('created_at', searchFilters.date_to)
    }

    if (searchFilters.file_size_min !== undefined) {
      query = query.gte('file_size', searchFilters.file_size_min)
    }

    if (searchFilters.file_size_max !== undefined) {
      query = query.lte('file_size', searchFilters.file_size_max)
    }

    if (searchFilters.search_term) {
      const searchPattern = `%${searchFilters.search_term}%`
      query = query.or(`file_name.ilike.${searchPattern},description.ilike.${searchPattern}`)
    }

    if (searchFilters.has_versions !== undefined) {
      if (searchFilters.has_versions) {
        const { data: filesWithVersions } = await supabase
          .from('project_files')
          .select('id, parent_file_id')
          .eq('tenant_id', tenantId)
          .eq('is_deleted', false)
          .not('parent_file_id', 'is', null)

        const parentIds = filesWithVersions?.map(f => f.parent_file_id).filter((id): id is string => id !== null) || []
        const versionIds = filesWithVersions?.map(f => f.id) || []
        const allVersionedIds = [...new Set([...parentIds, ...versionIds])]

        if (allVersionedIds.length > 0) {
          query = query.in('id', allVersionedIds)
        } else {
          query = query.eq('id', 'non-existent-id')
        }
      } else {
        query = query.is('parent_file_id', null)
      }
    }

    // Pagination and sorting
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const allowedSortFields = ['created_at', 'updated_at', 'file_name', 'file_size', 'file_type', 'file_category']
    if (allowedSortFields.includes(sort_by)) {
      query = query.order(sort_by, { ascending: sort_order === 'asc' })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data: files, error, count } = await query

    if (error) {
      throw mapSupabaseError(error)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/project-files/search', 200, duration)

    const response = {
      files: files || [],
      total: count || 0,
      page,
      limit,
      has_more: count ? from + limit < count : false,
      search_term: searchFilters.search_term,
      filters_applied: searchFilters,
    }

    return paginatedResponse(response, { page, limit, total: count || 0 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Project files search POST API error', { error, duration })
    return errorResponse(error as Error)
  }
})
