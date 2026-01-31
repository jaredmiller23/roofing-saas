import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, createdResponse, errorResponse } from '@/lib/api/response'

/**
 * GET /api/settings/roles
 * Get all roles for tenant
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

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
}

/**
 * POST /api/settings/roles
 * Create a new role
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
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
}
