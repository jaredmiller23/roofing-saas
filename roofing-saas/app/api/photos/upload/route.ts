import { NextRequest } from 'next/server'
import { fileTypeFromBuffer } from 'file-type'
import { successResponse, errorResponse } from '@/lib/api/response'
import { AuthenticationError, AuthorizationError, ValidationError } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { awardPointsSafe, POINT_VALUES } from '@/lib/gamification/award-points'

// Allowed image MIME types based on magic bytes (server-side validation)
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/bmp',
  'image/tiff',
]

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
      throw AuthenticationError('User not authenticated')
    }

    // Get tenant ID
    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found for user')
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const contactId = formData.get('contact_id') as string | null
    const projectId = formData.get('project_id') as string | null
    const metadataStr = formData.get('metadata') as string | null

    // Validate required fields
    if (!file) {
      throw ValidationError('File is required')
    }

    // Validate file size (10 MB before compression)
    const maxBytes = 10 * 1024 * 1024 * 2 // 20 MB raw (will be compressed)
    if (file.size > maxBytes) {
      throw ValidationError('File too large. Maximum size is 20 MB (will be compressed to ~2 MB)')
    }

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Server-side MIME validation using magic bytes (cannot be spoofed)
    // This detects the actual file type by reading the file header, not trusting browser-provided type
    const detectedType = await fileTypeFromBuffer(buffer)
    const actualMime = detectedType?.mime

    if (!actualMime || !ALLOWED_IMAGE_TYPES.includes(actualMime)) {
      const claimed = file.type || 'unknown'
      logger.warn('MIME type mismatch or invalid file', {
        claimedType: claimed,
        detectedType: actualMime || 'undetected',
        fileName: file.name,
      })
      throw ValidationError(
        `Invalid file type. Detected: ${actualMime || 'unknown'}. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`
      )
    }

    // Also check that browser-provided type matches detected type (optional warning)
    if (file.type && file.type !== actualMime) {
      logger.warn('MIME type mismatch between browser and detection', {
        browserType: file.type,
        detectedType: actualMime,
        fileName: file.name,
      })
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
        contentType: actualMime, // Use server-detected MIME type
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
    // Use server-detected MIME type for security
    const photoData = {
      tenant_id: tenantId,
      contact_id: contactId || null,
      project_id: projectId || null,
      file_path: storageData.path,
      file_url: urlData.publicUrl,
      thumbnail_url: urlData.publicUrl, // TODO: Generate thumbnail in future
      metadata: {
        original_name: file.name,
        mime_type: actualMime, // Server-detected MIME type (more reliable than browser)
        browser_mime_type: file.type, // Keep original for debugging
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
