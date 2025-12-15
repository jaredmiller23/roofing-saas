import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { createOrganizationSchema, organizationFiltersSchema } from '@/lib/validations/organization'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError,
  mapSupabaseError,
  mapZodError,
  ConflictError
} from '@/lib/api/errors'
import { paginatedResponse, createdResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import type { OrganizationListResponse } from '@/lib/types/organization'
import { awardPointsSafe, POINT_VALUES } from '@/lib/gamification/award-points'

/**
 * GET /api/organizations
 * List organizations with filtering, search, and pagination
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
    const rawFilters = {
      search: searchParams.get('search') || undefined,
      type: searchParams.get('type') || undefined,
      industry: searchParams.get('industry') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sort_by: searchParams.get('sort_by') || 'created_at',
      sort_order: (searchParams.get('sort_order') || 'desc') as 'asc' | 'desc',
    }

    // Validate filters
    const validatedFilters = organizationFiltersSchema.safeParse(rawFilters)
    if (!validatedFilters.success) {
      throw mapZodError(validatedFilters.error)
    }

    const filters = validatedFilters.data
    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('organizations')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    // Apply filters
    if (filters.type) {
      query = query.eq('type', filters.type)
    }
    if (filters.industry) {
      query = query.eq('industry', filters.industry)
    }

    // Full-text search
    if (filters.search) {
      query = query.textSearch('search_vector', filters.search, {
        type: 'websearch',
        config: 'english',
      })
    }

    // Pagination
    const page = filters.page || 1
    const limit = filters.limit || 20
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query.range(from, to)

    // Sorting
    query = query.order(filters.sort_by || 'created_at', {
      ascending: filters.sort_order === 'asc',
    })

    const { data: organizations, error, count } = await query

    if (error) {
      throw mapSupabaseError(error)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/organizations', 200, duration)

    const response: OrganizationListResponse = {
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

    // Validate input
    const validatedData = createOrganizationSchema.safeParse(body)
    if (!validatedData.success) {
      throw mapZodError(validatedData.error)
    }

    const supabase = await createClient()

    // Create organization
    const { data: organization, error } = await supabase
      .from('organizations')
      .insert({
        ...validatedData.data,
        tenant_id: tenantId,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      // Handle duplicate name
      if (error.code === '23505') {
        throw ConflictError('An organization with this name already exists', { name: validatedData.data.name })
      }
      throw mapSupabaseError(error)
    }

    // Award points for creating an organization (non-blocking)
    awardPointsSafe(
      user.id,
      POINT_VALUES.CONTACT_CREATED, // Reuse contact points value, could add specific org points
      'Created new organization',
      organization.id
    )

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