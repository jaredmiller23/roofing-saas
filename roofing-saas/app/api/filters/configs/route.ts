import type { Json } from '@/lib/types/database.types'
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { getCurrentUser, isAdmin, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, createdResponse, errorResponse } from '@/lib/api/response'
import type {
  FilterConfig,
  GetFilterConfigsResponse,
  CreateFilterConfigRequest,
  CreateFilterConfigResponse,
} from '@/lib/filters/types'

/**
 * GET /api/filters/configs
 * Get all filter configurations for an entity type
 *
 * Query params:
 * - entity_type: 'contacts' | 'projects' | 'pipeline' | 'activities'
 * - include_inactive: boolean (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const searchParams = request.nextUrl.searchParams
    const entity_type = searchParams.get('entity_type')
    const include_inactive = searchParams.get('include_inactive') === 'true'

    if (!entity_type) {
      throw ValidationError('entity_type query parameter required')
    }

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('filter_configs')
      .select('*')
      .eq('entity_type', entity_type)
      .order('display_order', { ascending: true })

    // Filter by active status unless explicitly including inactive
    if (!include_inactive) {
      query = query.eq('is_active', true)
    }

    const { data, error, count } = await query

    if (error) {
      logger.error('Error fetching filter configs:', { error })
      throw InternalError('Failed to fetch filter configurations')
    }

    const response: GetFilterConfigsResponse = {
      configs: (data || []) as unknown as FilterConfig[],
      total: count || data?.length || 0,
    }

    return successResponse(response)
  } catch (error) {
    logger.error('Error in GET /api/filters/configs:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * POST /api/filters/configs
 * Create new filter configuration (admin only)
 *
 * Body: CreateFilterConfigRequest
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    // Check if user is admin (includes owner role)
    const userIsAdmin = await isAdmin(user.id)
    if (!userIsAdmin) {
      throw AuthorizationError('Admin access required')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant')
    }

    const supabase = await createClient()
    const body: CreateFilterConfigRequest = await request.json()

    // Validate required fields
    if (
      !body.entity_type ||
      !body.field_name ||
      !body.field_label ||
      !body.field_type ||
      !body.filter_operator
    ) {
      throw ValidationError('Missing required fields')
    }

    // Insert filter config
    const { data, error } = await supabase
      .from('filter_configs')
      .insert({
        tenant_id: tenantId,
        entity_type: body.entity_type,
        field_name: body.field_name,
        field_label: body.field_label,
        field_type: body.field_type,
        filter_operator: body.filter_operator,
        filter_options: (body.filter_options || []) as unknown as Json,
        is_quick_filter: body.is_quick_filter ?? false,
        is_advanced_filter: body.is_advanced_filter ?? true,
        display_order: body.display_order ?? 99,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating filter config:', { error })
      throw InternalError('Failed to create filter configuration')
    }

    const response: CreateFilterConfigResponse = {
      config: data as unknown as FilterConfig,
    }

    return createdResponse(response)
  } catch (error) {
    logger.error('Error in POST /api/filters/configs:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
