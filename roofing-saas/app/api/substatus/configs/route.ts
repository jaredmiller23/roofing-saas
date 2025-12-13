import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, ConflictError, InternalError } from '@/lib/api/errors'
import { successResponse, createdResponse, errorResponse } from '@/lib/api/response'
import type {
  SubstatusConfig,
  GetSubstatusConfigsResponse,
  CreateSubstatusConfigRequest,
  CreateSubstatusConfigResponse,
} from '@/lib/substatus/types'

/**
 * GET /api/substatus/configs
 * Get all substatus configurations for an entity type
 *
 * Query params:
 * - entity_type: 'contacts' | 'projects' | 'activities' (required)
 * - status_value: string (optional - filter by parent status)
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
    const status_value = searchParams.get('status_value')
    const include_inactive = searchParams.get('include_inactive') === 'true'

    if (!entity_type) {
      throw ValidationError('entity_type query parameter required')
    }

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('status_substatus_configs')
      .select('*')
      .eq('entity_type', entity_type)
      .order('status_value', { ascending: true })
      .order('display_order', { ascending: true })

    // Filter by status value if provided
    if (status_value) {
      query = query.eq('status_value', status_value)
    }

    // Filter by active unless explicitly including inactive
    if (!include_inactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching substatus configs:', { error })
      throw InternalError('Failed to fetch substatus configurations')
    }

    const response: GetSubstatusConfigsResponse = {
      configs: (data || []) as SubstatusConfig[],
      total: data?.length || 0,
    }

    return successResponse(response)
  } catch (error) {
    logger.error('Error in GET /api/substatus/configs:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * POST /api/substatus/configs
 * Create new substatus configuration (admin only)
 *
 * Body: CreateSubstatusConfigRequest
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const supabase = await createClient()

    // Check if user is admin
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('role, tenant_id')
      .eq('user_id', user.id)
      .single()

    if (!tenantUser || tenantUser.role !== 'admin') {
      throw AuthorizationError('Admin access required')
    }

    const body: CreateSubstatusConfigRequest = await request.json()

    // Validate required fields
    if (
      !body.entity_type ||
      !body.status_field_name ||
      !body.status_value ||
      !body.substatus_value ||
      !body.substatus_label
    ) {
      throw ValidationError('Missing required fields')
    }

    // If setting as default, unset other defaults for this status
    if (body.is_default) {
      await supabase
        .from('status_substatus_configs')
        .update({ is_default: false })
        .eq('tenant_id', tenantUser.tenant_id)
        .eq('entity_type', body.entity_type)
        .eq('status_field_name', body.status_field_name)
        .eq('status_value', body.status_value)
    }

    // Insert substatus config
    const { data, error } = await supabase
      .from('status_substatus_configs')
      .insert({
        tenant_id: tenantUser.tenant_id,
        entity_type: body.entity_type,
        status_field_name: body.status_field_name,
        status_value: body.status_value,
        substatus_value: body.substatus_value,
        substatus_label: body.substatus_label,
        substatus_description: body.substatus_description || null,
        display_order: body.display_order ?? 99,
        color: body.color || null,
        icon: body.icon || null,
        is_default: body.is_default ?? false,
        is_terminal: body.is_terminal ?? false,
        auto_transition_to: body.auto_transition_to || null,
        auto_transition_delay_hours: body.auto_transition_delay_hours || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating substatus config:', { error })
      // Check for unique constraint violation
      if (error.code === '23505') {
        throw ConflictError('A substatus with this value already exists for this status')
      }
      throw InternalError('Failed to create substatus configuration')
    }

    const response: CreateSubstatusConfigResponse = {
      config: data as SubstatusConfig,
    }

    return createdResponse(response)
  } catch (error) {
    logger.error('Error in POST /api/substatus/configs:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
