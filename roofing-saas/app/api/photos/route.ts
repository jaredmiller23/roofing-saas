import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { getUserFromRequest, getUserTenantId } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/photos
 * List photos with optional filtering
 *
 * Query params:
 * - contact_id: Filter by contact
 * - project_id: Filter by project
 * - limit: Max results (default 50)
 * - offset: Pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const user = await getUserFromRequest(request)
    if (!user) {
      return errorResponse(new Error('User not authenticated'), 401)
    }

    // Get tenant ID
    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return errorResponse(new Error('No tenant found for user'), 403)
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const contactId = searchParams.get('contact_id')
    const projectId = searchParams.get('project_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('photos')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (contactId) {
      query = query.eq('contact_id', contactId)
    }
    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error, count } = await query

    if (error) {
      logger.error('Photos query error', { error })
      throw new Error(`Failed to fetch photos: ${error.message}`)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/photos', 200, duration)

    return successResponse({
      photos: data || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Photos API error', { error, duration })
    return errorResponse(error as Error)
  }
}

/**
 * DELETE /api/photos
 * Soft delete a photo
 *
 * Query params:
 * - id: Photo ID (required)
 */
export async function DELETE(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const user = await getUserFromRequest(request)
    if (!user) {
      return errorResponse(new Error('User not authenticated'), 401)
    }

    // Get tenant ID
    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return errorResponse(new Error('No tenant found for user'), 403)
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const photoId = searchParams.get('id')
    if (!photoId) {
      throw new Error('Photo ID is required')
    }

    // Verify photo belongs to tenant
    const { data: photo, error: fetchError } = await supabase
      .from('photos')
      .select('*')
      .eq('id', photoId)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !photo) {
      throw new Error('Photo not found')
    }

    // Soft delete the photo
    const { error: deleteError } = await supabase
      .from('photos')
      .update({ is_deleted: true })
      .eq('id', photoId)

    if (deleteError) {
      logger.error('Photo delete error', { error: deleteError })
      throw new Error(`Failed to delete photo: ${deleteError.message}`)
    }

    // Optionally, delete from storage as well
    // const { error: storageError } = await supabase.storage
    //   .from('property-photos')
    //   .remove([photo.file_path])
    //
    // if (storageError) {
    //   logger.warn('Storage delete failed', { error: storageError })
    // }

    const duration = Date.now() - startTime
    logger.apiResponse('DELETE', '/api/photos', 200, duration)

    return successResponse({
      message: 'Photo deleted successfully',
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Photo delete error', { error, duration })
    return errorResponse(error as Error)
  }
}
