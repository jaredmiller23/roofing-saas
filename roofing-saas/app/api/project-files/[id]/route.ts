import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'
import { NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * GET /api/project-files/[id]
 * Get a single project file by ID
 */
export const GET = withAuthParams(async (
  _request: NextRequest,
  { tenantId },
  { params }
) => {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: file, error } = await supabase
      .from('project_files')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (error || !file) {
      throw NotFoundError('File not found')
    }

    return successResponse({ file })
  } catch (error) {
    logger.error('Get project file error:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * PATCH /api/project-files/[id]
 * Update a project file
 */
export const PATCH = withAuthParams(async (
  request: NextRequest,
  { tenantId },
  { params }
) => {
  try {
    const { id } = await params
    const body = await request.json()

    const supabase = await createClient()

    const { data: file, error } = await supabase
      .from('project_files')
      .update(body)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error || !file) {
      throw InternalError('Failed to update file')
    }

    return successResponse({ file })
  } catch (error) {
    logger.error('Update project file error:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * DELETE /api/project-files/[id]
 * Soft delete a project file
 */
export const DELETE = withAuthParams(async (
  _request: NextRequest,
  { tenantId },
  { params }
) => {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { error } = await supabase
      .from('project_files')
      .update({ is_deleted: true })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      logger.error('Failed to delete file:', { error })
      throw InternalError('Failed to delete file')
    }

    return successResponse(null)
  } catch (error) {
    logger.error('Delete project file error:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
