import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { awardPointsSafe, POINT_VALUES } from '@/lib/gamification/award-points'

/**
 * POST /api/photos/upload
 * Upload a photo and save metadata to database
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const user = await getCurrentUser()
    if (!user) {
      return errorResponse(new Error('User not authenticated'), 401)
    }

    // Get tenant ID
    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return errorResponse(new Error('No tenant found for user'), 403)
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const contactId = formData.get('contact_id') as string | null
    const projectId = formData.get('project_id') as string | null
    const metadataStr = formData.get('metadata') as string | null

    // Validate required fields
    if (!file) {
      throw new Error('File is required')
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image')
    }

    // Validate file size (10 MB before compression)
    const maxBytes = 10 * 1024 * 1024 * 2 // 20 MB raw (will be compressed)
    if (file.size > maxBytes) {
      throw new Error(`File too large. Maximum size is 20 MB (will be compressed to ~2 MB)`)
    }

    // Parse metadata
    let metadata = {}
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr)
      } catch {
        throw new Error('Invalid metadata JSON')
      }
    }

    const supabase = await createClient()

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Generate unique filename
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const timestamp = now.getTime()
    const random = Math.random().toString(36).substring(2, 8)
    const ext = file.name.split('.').pop() || 'jpg'
    const filePath = `${user.id}/${year}/${month}/IMG_${timestamp}_${random}.${ext}`

    // Upload to Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('property-photos')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (storageError) {
      logger.error('Storage upload error', {
        error: storageError,
        message: storageError.message
      })
      throw new Error(`Failed to upload photo: ${storageError.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('property-photos').getPublicUrl(filePath)

    // Save photo metadata to database
    const photoData = {
      tenant_id: tenantId,
      contact_id: contactId || null,
      project_id: projectId || null,
      file_path: storageData.path,
      file_url: urlData.publicUrl,
      thumbnail_url: urlData.publicUrl, // TODO: Generate thumbnail in future
      metadata: {
        original_name: file.name,
        mime_type: file.type,
        size: file.size,
        ...metadata,
      },
      uploaded_by: user.id,
    }

    const { data, error } = await supabase.from('photos').insert(photoData).select().single()

    if (error) {
      // Rollback: Delete uploaded file if database insert fails
      await supabase.storage.from('property-photos').remove([storageData.path])
      logger.error('Database insert error', { error })
      throw new Error(`Failed to save photo metadata: ${error.message}`)
    }

    // Award points for photo upload (non-blocking)
    awardPointsSafe(
      user.id,
      POINT_VALUES.PHOTO_UPLOADED,
      'Uploaded property photo',
      data.id
    )

    // Check if this is part of a photo set (5+ photos for a property)
    // and award bonus if applicable
    if (contactId || projectId) {
      const { count: photoCount } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_deleted', false)
        .or(`contact_id.eq.${contactId},project_id.eq.${projectId}`)

      if (photoCount && photoCount >= 5 && photoCount % 5 === 0) {
        // Award bonus for every 5 photos
        awardPointsSafe(
          user.id,
          POINT_VALUES.PHOTO_SET_COMPLETED,
          `Completed photo set (${photoCount} photos)`,
          data.id
        )
      }
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/photos/upload', 200, duration)

    return successResponse({
      message: 'Photo uploaded successfully',
      photo: data,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Photo upload error', { error, duration })
    return errorResponse(error as Error)
  }
}
