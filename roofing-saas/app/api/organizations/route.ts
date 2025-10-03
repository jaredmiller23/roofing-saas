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
 * GET /api/organizations
 * List organizations with filtering and pagination
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

    logger.apiRequest('GET', '/api/organizations', { tenantId, userId: user.id })

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || undefined
    const orgType = searchParams.get('org_type') || undefined
    const stage = searchParams.get('stage') || undefined
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortOrder = (searchParams.get('sort_order') || 'desc') as 'asc' | 'desc'

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('organizations')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    // Apply filters
    if (orgType) {
      query = query.eq('org_type', orgType)
    }
    if (stage) {
      query = query.eq('stage', stage)
    }
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    // Sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    const { data: organizations, error, count } = await query

    if (error) {
      throw mapSupabaseError(error)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/organizations', 200, duration)

    const response = {
      organizations: organizations || [],
      total: count || 0,
      page,
      limit,
      has_more: count ? from + limit < count : false,
    }

    return paginatedResponse(response, { page, limit, total: count || 0 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Organizations API error', { error, duration })
    return errorResponse(error as Error)
  }
}

/**
 * POST /api/organizations
 * Create a new organization
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

    logger.apiRequest('POST', '/api/organizations', { tenantId, userId: user.id })

    const body = await request.json()

    const supabase = await createClient()

    // Create organization
    const { data: organization, error } = await supabase
      .from('organizations')
      .insert({
        ...body,
        tenant_id: tenantId,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      throw mapSupabaseError(error)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/organizations', 201, duration)
    logger.info('Organization created', { organizationId: organization.id, tenantId })

    return createdResponse({ organization })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Create organization error', { error, duration })
    return errorResponse(error as Error)
  }
}
