import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import type {
  FilterConfig,
  UpdateFilterConfigRequest,
  UpdateFilterConfigResponse,
} from '@/lib/filters/types'

/**
 * PATCH /api/filters/configs/:id
 * Update filter configuration (admin only)
 *
 * Body: UpdateFilterConfigRequest
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const { id } = await params
    const supabase = await createClient()

    // Check if user is admin
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!tenantUser || tenantUser.role !== 'admin') {
      throw AuthorizationError('Admin access required')
    }

    const body: UpdateFilterConfigRequest = await request.json()

    // Build update object (only include provided fields)
    const updates: Record<string, unknown> = {}
    if (body.field_label !== undefined) updates.field_label = body.field_label
    if (body.field_type !== undefined) updates.field_type = body.field_type
    if (body.filter_operator !== undefined)
      updates.filter_operator = body.filter_operator
    if (body.filter_options !== undefined)
      updates.filter_options = body.filter_options
    if (body.is_quick_filter !== undefined)
      updates.is_quick_filter = body.is_quick_filter
    if (body.is_advanced_filter !== undefined)
      updates.is_advanced_filter = body.is_advanced_filter
    if (body.is_active !== undefined) updates.is_active = body.is_active
    if (body.display_order !== undefined)
      updates.display_order = body.display_order

    if (Object.keys(updates).length === 0) {
      throw ValidationError('No fields to update')
    }

    const { data, error } = await supabase
      .from('filter_configs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating filter config:', { error })
      throw InternalError('Failed to update filter configuration')
    }

    if (!data) {
      throw NotFoundError('Filter configuration not found')
    }

    const response: UpdateFilterConfigResponse = {
      config: data as unknown as FilterConfig,
    }

    return successResponse(response)
  } catch (error) {
    logger.error('Error in PATCH /api/filters/configs/:id:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * DELETE /api/filters/configs/:id
 * Delete filter configuration (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const { id } = await params
    const supabase = await createClient()

    // Check if user is admin
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!tenantUser || tenantUser.role !== 'admin') {
      throw AuthorizationError('Admin access required')
    }

    const { error } = await supabase
      .from('filter_configs')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('Error deleting filter config:', { error })
      throw InternalError('Failed to delete filter configuration')
    }

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Error in DELETE /api/filters/configs/:id:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
