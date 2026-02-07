import { successResponse, errorResponse } from '@/lib/api/response'
import { withAuth } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { awardPointsSafe, POINT_VALUES } from '@/lib/gamification/award-points'

// GeoJSON validation schema
const geoJSONSchema = z.object({
  type: z.enum(['Polygon', 'MultiPolygon']),
  coordinates: z.array(z.any()), // Simplified - full GeoJSON validation would be more complex
})

const createTerritorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  boundary_data: geoJSONSchema.optional(),
  assigned_to: z.string().uuid().optional().nullable(),
})

/**
 * GET /api/territories
 * List territories for the tenant
 *
 * Query params:
 * - assigned_to: Filter by assigned user
 * - limit: Max results (default 100)
 * - offset: Pagination offset (default 0)
 */
export const GET = withAuth(async (request, { tenantId }) => {
  const startTime = Date.now()

  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const assignedTo = searchParams.get('assigned_to')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('territories')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo)
    }

    const { data, error, count } = await query

    if (error) {
      logger.error('Territories query error', { error })
      throw new Error(`Failed to fetch territories: ${error.message}`)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/territories', 200, duration)

    return successResponse({
      territories: data || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Territories API error', { error, duration })
    return errorResponse(error as Error)
  }
})

/**
 * POST /api/territories
 * Create a new territory
 */
export const POST = withAuth(async (request, { userId, tenantId }) => {
  const startTime = Date.now()

  try {
    // Parse and validate request body
    const body = await request.json()
    const validatedData = createTerritorySchema.safeParse(body)

    if (!validatedData.success) {
      const errors = validatedData.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      throw new Error(errors)
    }

    const supabase = await createClient()

    // If assigned_to is provided, verify the user exists and belongs to the tenant
    if (validatedData.data.assigned_to) {
      const { data: assignedUser, error: userError } = await supabase
        .from('tenant_users')
        .select('user_id')
        .eq('tenant_id', tenantId)
        .eq('user_id', validatedData.data.assigned_to)
        .single()

      if (userError || !assignedUser) {
        throw new Error('Assigned user not found or does not belong to tenant')
      }
    }

    // Create territory
    const territoryData = {
      tenant_id: tenantId,
      name: validatedData.data.name,
      description: validatedData.data.description || null,
      boundary_data: validatedData.data.boundary_data || null,
      assigned_to: validatedData.data.assigned_to || null,
    }

    const { data, error } = await supabase
      .from('territories')
      .insert(territoryData)
      .select()
      .single()

    if (error) {
      logger.error('Territory create error', { error })
      throw new Error(`Failed to create territory: ${error.message}`)
    }

    // Award points for creating a territory (non-blocking)
    awardPointsSafe(
      userId,
      POINT_VALUES.TERRITORY_CREATED,
      'Created new territory',
      data.id
    )

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/territories', 201, duration)

    return successResponse(
      {
        message: 'Territory created successfully',
        territory: data,
      },
      201
    )
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Territory create error', { error, duration })
    return errorResponse(error as Error)
  }
})
