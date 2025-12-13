import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import type {
  SubstatusConfig,
  UpdateSubstatusConfigRequest,
  UpdateSubstatusConfigResponse,
} from '@/lib/substatus/types'

/**
 * PATCH /api/substatus/configs/:id
 * Update substatus configuration (admin only)
 *
 * Body: UpdateSubstatusConfigRequest
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
      .select('role, tenant_id')
      .eq('user_id', user.id)
      .single()

    if (!tenantUser || tenantUser.role !== 'admin') {
      throw AuthorizationError('Admin access required')
    }

    const body: UpdateSubstatusConfigRequest = await request.json()

    // Get existing config to check for default flag change
    const { data: existing } = await supabase
      .from('status_substatus_configs')
      .select('entity_type, status_field_name, status_value, tenant_id')
      .eq('id', id)
      .single()

    if (!existing) {
      throw NotFoundError('Substatus configuration not found')
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    if (body.substatus_label !== undefined)
      updates.substatus_label = body.substatus_label
    if (body.substatus_description !== undefined)
      updates.substatus_description = body.substatus_description
    if (body.display_order !== undefined)
      updates.display_order = body.display_order
    if (body.color !== undefined) updates.color = body.color
    if (body.icon !== undefined) updates.icon = body.icon
    if (body.is_active !== undefined) updates.is_active = body.is_active
    if (body.is_terminal !== undefined) updates.is_terminal = body.is_terminal
    if (body.auto_transition_to !== undefined)
      updates.auto_transition_to = body.auto_transition_to
    if (body.auto_transition_delay_hours !== undefined)
      updates.auto_transition_delay_hours = body.auto_transition_delay_hours

    // Handle is_default specially (unset other defaults)
    if (body.is_default !== undefined) {
      if (body.is_default) {
        // Unset other defaults for this status
        await supabase
          .from('status_substatus_configs')
          .update({ is_default: false })
          .eq('tenant_id', existing.tenant_id)
          .eq('entity_type', existing.entity_type)
          .eq('status_field_name', existing.status_field_name)
          .eq('status_value', existing.status_value)
          .neq('id', id)
      }
      updates.is_default = body.is_default
    }

    if (Object.keys(updates).length === 0) {
      throw ValidationError('No fields to update')
    }

    const { data, error } = await supabase
      .from('status_substatus_configs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating substatus config:', { error })
      throw InternalError('Failed to update substatus configuration')
    }

    const response: UpdateSubstatusConfigResponse = {
      config: data as SubstatusConfig,
    }

    return successResponse(response)
  } catch (error) {
    logger.error('Error in PATCH /api/substatus/configs/:id:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * DELETE /api/substatus/configs/:id
 * Delete substatus configuration (admin only)
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
      .from('status_substatus_configs')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('Error deleting substatus config:', { error })
      throw InternalError('Failed to delete substatus configuration')
    }

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Error in DELETE /api/substatus/configs/:id:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
