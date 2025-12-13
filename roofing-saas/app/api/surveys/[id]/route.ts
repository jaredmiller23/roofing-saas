import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * GET /api/surveys/[id]
 * Get a single survey by ID
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

    const { data, error } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (error) {
      logger.error('Error fetching survey:', { error })
      throw InternalError(error.message)
    }

    if (!data) {
      throw NotFoundError('Survey not found')
    }

    return successResponse(data)
  } catch (error) {
    logger.error('Error in GET /api/surveys/[id]:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * PATCH /api/surveys/[id]
 * Update a survey
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

    const { data, error } = await supabase
      .from('surveys')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .select()
      .single()

    if (error) {
      logger.error('Error updating survey:', { error })
      throw InternalError(error.message)
    }

    if (!data) {
      throw NotFoundError('Survey not found')
    }

    return successResponse(data)
  } catch (error) {
    logger.error('Error in PATCH /api/surveys/[id]:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * DELETE /api/surveys/[id]
 * Soft delete a survey
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

    const { data, error } = await supabase
      .from('surveys')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .select()
      .single()

    if (error) {
      logger.error('Error deleting survey:', { error })
      throw InternalError(error.message)
    }

    if (!data) {
      throw NotFoundError('Survey not found')
    }

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Error in DELETE /api/surveys/[id]:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
