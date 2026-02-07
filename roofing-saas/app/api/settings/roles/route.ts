import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { checkPermission } from '@/lib/auth/check-permission'
import { logger } from '@/lib/logger'
import { ApiError, ErrorCode, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, createdResponse, errorResponse } from '@/lib/api/response'

/**
 * GET /api/settings/roles
 * Get all roles for tenant
 */
export const GET = withAuth(async (_request, { tenantId }) => {
  try {
    const supabase = await createClient()

    const { data: roles, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      throw InternalError(error.message)
    }

    return successResponse(roles || [])
  } catch (error) {
    logger.error('Error fetching roles:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * POST /api/settings/roles
 * Create a new role
 */
export const POST = withAuth(async (request, { user, userId, tenantId }) => {
  try {
    const canEdit = await checkPermission(userId, 'settings', 'edit')
    if (!canEdit) {
      return errorResponse(new ApiError(ErrorCode.INSUFFICIENT_PERMISSIONS, 'You do not have permission to manage roles', 403))
    }

    const body = await request.json()
    const { name, description, permissions, is_system } = body

    if (!name) {
      throw ValidationError('Name is required')
    }

    const supabase = await createClient()

    const { data: role, error } = await supabase
      .from('user_roles')
      .insert({
        tenant_id: tenantId,
        name,
        description,
        permissions,
        is_system,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      throw InternalError(error.message)
    }

    return createdResponse(role)
  } catch (error) {
    logger.error('Error creating role:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
