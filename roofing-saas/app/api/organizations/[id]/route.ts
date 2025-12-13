import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * GET /api/organizations/[id]
 * Get a single organization by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const { id } = await params
    const supabase = await createClient()

    const { data: organization, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (error || !organization) {
      throw NotFoundError('Organization not found')
    }

    return successResponse({ organization })
  } catch (error) {
    logger.error('Get organization error:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * PATCH /api/organizations/[id]
 * Update an organization
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

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const { id } = await params
    const body = await request.json()

    const supabase = await createClient()

    const { data: organization, error } = await supabase
      .from('organizations')
      .update(body)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error || !organization) {
      throw InternalError('Failed to update organization')
    }

    return successResponse({ organization })
  } catch (error) {
    logger.error('Update organization error:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * DELETE /api/organizations/[id]
 * Soft delete an organization
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

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const { id } = await params
    const supabase = await createClient()

    const { error } = await supabase
      .from('organizations')
      .update({ is_deleted: true })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      logger.error('Failed to delete organization:', { error })
      throw InternalError('Failed to delete organization')
    }

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Delete organization error:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
