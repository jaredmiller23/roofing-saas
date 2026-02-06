import { NextRequest } from 'next/server'
import { fileTypeFromBuffer } from 'file-type'
import { successResponse, errorResponse } from '@/lib/api/response'
import { ValidationError } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { withAuth } from '@/lib/auth/with-auth'
import { createClient } from '@/lib/supabase/server'
import { awardPointsSafe, POINT_VALUES } from '@/lib/gamification/award-points'
import { convertHeicToJpeg, isHeicBuffer, isHeicMimeType } from '@/lib/images/heic-converter'
import { generateThumbnail } from '@/lib/images/thumbnail'

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
export const POST = withAuth(async (request: NextRequest, { userId, tenantId }) => {
  const startTime = Date.now()

  try {
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

    // ========================================
    // Server-Side HEIC Conversion
    // ========================================
    // Convert HEIC to JPEG on server - much more reliable than client-side heic2any
    // Use ArrayBufferLike to accept both original buffer and converted buffer types
    let processedBuffer: Buffer<ArrayBufferLike> = buffer
    let finalMime = actualMime
    let wasHeicConverted = false

    if (isHeicMimeType(actualMime) || isHeicBuffer(buffer)) {
      logger.info('[PhotoUpload] HEIC file detected, converting server-side', {
        fileName: file.name,
        originalSize: buffer.length,
        detectedMime: actualMime,
      })

      try {
        const conversion = await convertHeicToJpeg(buffer, 0.9)
        processedBuffer = conversion.buffer
        finalMime = 'image/jpeg'
        wasHeicConverted = true

        logger.info('[PhotoUpload] HEIC conversion successful', {
          originalSize: buffer.length,
          convertedSize: processedBuffer.length,
          compressionRatio: Math.round((1 - processedBuffer.length / buffer.length) * 100),
        })
      } catch (conversionError) {
        logger.error('[PhotoUpload] HEIC conversion failed', {
          error: conversionError instanceof Error ? conversionError.message : 'Unknown error',
          fileName: file.name,
        })
        throw new Error(
          'Failed to convert HEIC image. The file may be corrupted or in an unsupported format.'
        )
      }
    }

    // ========================================
    // Thumbnail Generation
    // ========================================
    // Generate thumbnail for fast gallery loading
    let thumbnailBuffer: Buffer
    let thumbnailWidth = 0
    let thumbnailHeight = 0

    try {
      const thumbnail = await generateThumbnail(processedBuffer, {
        maxDimension: 400,
        quality: 80,
        format: 'jpeg',
      })
      thumbnailBuffer = thumbnail.buffer
      thumbnailWidth = thumbnail.width
      thumbnailHeight = thumbnail.height

      logger.info('[PhotoUpload] Thumbnail generated', {
        mainSize: processedBuffer.length,
        thumbSize: thumbnailBuffer.length,
        dimensions: `${thumbnailWidth}x${thumbnailHeight}`,
      })
    } catch (thumbnailError) {
      logger.warn('[PhotoUpload] Thumbnail generation failed, using main image', {
        error: thumbnailError instanceof Error ? thumbnailError.message : 'Unknown error',
      })
      // Fallback: use processed buffer as thumbnail (not ideal but ensures upload succeeds)
      thumbnailBuffer = processedBuffer
    }

    const supabase = await createClient()

    // Generate unique filenames for main image and thumbnail
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const timestamp = now.getTime()
    const random = Math.random().toString(36).substring(2, 8)

    // Always use .jpg extension since we convert HEIC to JPEG
    const mainFilePath = `${userId}/${year}/${month}/IMG_${timestamp}_${random}.jpg`
    const thumbFilePath = `${userId}/${year}/${month}/thumb_${timestamp}_${random}.jpg`

    // Upload main image to Supabase Storage
    const { data: mainStorageData, error: mainStorageError } = await supabase.storage
      .from('property-photos')
      .upload(mainFilePath, processedBuffer, {
        contentType: finalMime,
        cacheControl: '3600',
        upsert: false,
      })

    if (mainStorageError) {
      logger.error('Main image storage upload error', {
        error: mainStorageError,
        message: mainStorageError.message,
      })
      throw new Error(`Failed to upload photo: ${mainStorageError.message}`)
    }

    // Upload thumbnail to Supabase Storage
    const { error: thumbStorageError } = await supabase.storage
      .from('property-photos')
      .upload(thumbFilePath, thumbnailBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      })

    if (thumbStorageError) {
      // Non-fatal: log warning but continue (we have the main image)
      logger.warn('Thumbnail storage upload error', {
        error: thumbStorageError,
        message: thumbStorageError.message,
      })
    }

    // Get public URLs
    const { data: mainUrlData } = supabase.storage.from('property-photos').getPublicUrl(mainFilePath)
    const { data: thumbUrlData } = supabase.storage.from('property-photos').getPublicUrl(thumbFilePath)

    // Save photo metadata to unified project_files table
    const parsedMetadata = metadata as Record<string, unknown>
    const fileCategory = parsedMetadata.damage_type ? 'inspection' : undefined

    const photoData = {
      tenant_id: tenantId,
      contact_id: contactId || null,
      project_id: projectId || null,
      file_name: file.name,
      file_type: 'photo' as const,
      file_category: fileCategory,
      file_path: mainStorageData.path,
      file_url: mainUrlData.publicUrl,
      thumbnail_url: thumbStorageError ? mainUrlData.publicUrl : thumbUrlData.publicUrl,
      file_size: processedBuffer.length,
      mime_type: finalMime,
      metadata: {
        original_name: file.name,
        original_mime_type: actualMime,
        final_mime_type: finalMime,
        browser_mime_type: file.type,
        original_size: file.size,
        processed_size: processedBuffer.length,
        was_heic_converted: wasHeicConverted,
        thumbnail_dimensions: thumbnailWidth > 0 ? { width: thumbnailWidth, height: thumbnailHeight } : null,
        ...metadata,
      },
      uploaded_by: userId,
      is_deleted: false,
    }

    const { data, error } = await supabase.from('project_files').insert(photoData).select().single()

    if (error) {
      // Rollback: Delete uploaded files if database insert fails
      await supabase.storage.from('property-photos').remove([mainFilePath, thumbFilePath])
      logger.error('Database insert error', { error })
      throw new Error(`Failed to save photo metadata: ${error.message}`)
    }

    // Award points for photo upload (non-blocking)
    awardPointsSafe(
      userId,
      POINT_VALUES.PHOTO_UPLOADED,
      'Uploaded property photo',
      data.id
    )

    // Check if this is part of a photo set (5+ photos for a property)
    // and award bonus if applicable
    if (contactId || projectId) {
      const { count: photoCount } = await supabase
        .from('project_files')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('file_type', 'photo')
        .eq('is_deleted', false)
        .or(`contact_id.eq.${contactId},project_id.eq.${projectId}`)

      if (photoCount && photoCount >= 5 && photoCount % 5 === 0) {
        // Award bonus for every 5 photos
        awardPointsSafe(
          userId,
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
})
