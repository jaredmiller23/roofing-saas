import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * PATCH /api/settings/roles/[id]
 * Update a role
 */
export const PATCH = withAuthParams(async (
  request,
  { tenantId },
  { params }
) => {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = await createClient()

    // Check if role is system role
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('is_system')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (existingRole?.is_system && body.name) {
      throw ValidationError('Cannot modify system role name')
    }

    const { data: role, error } = await supabase
      .from('user_roles')
      .update({
        name: body.name,
        description: body.description,
        permissions: body.permissions
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      throw InternalError(error.message)
    }

    if (!role) {
      throw NotFoundError('Role not found')
    }

    return successResponse(role)
  } catch (error) {
    logger.error('Error updating role:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * DELETE /api/settings/roles/[id]
 * Delete a role
 */
export const DELETE = withAuthParams(async (
  _request,
  { tenantId },
  { params }
) => {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check if role is system role
    const { data: role } = await supabase
      .from('user_roles')
      .select('is_system')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (role?.is_system) {
      throw ValidationError('Cannot delete system role')
    }

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      throw InternalError(error.message)
    }

    return successResponse(null)
  } catch (error) {
    logger.error('Error deleting role:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
