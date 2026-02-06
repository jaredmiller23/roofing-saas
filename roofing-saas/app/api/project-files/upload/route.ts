import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { NextRequest } from 'next/server'
import {
  ValidationError,
  mapSupabaseError,
} from '@/lib/api/errors'
import { createdResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { isHeicBuffer, isHeicMimeType, convertHeicToJpeg } from '@/lib/images/heic-converter'

/**
 * POST /api/project-files/upload
 * Upload files via multipart/form-data (for mobile and direct uploads)
 */
export const POST = withAuth(async (request: NextRequest, { userId, tenantId }) => {
  const startTime = Date.now()

  try {
    logger.apiRequest('POST', '/api/project-files/upload', { tenantId, userId })

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      throw ValidationError('No file provided')
    }

    // Get form parameters
    const fileName = (formData.get('file_name') as string) || file.name
    const fileType = (formData.get('file_type') as string) || 'document'
    const fileCategory = (formData.get('file_category') as string) || 'other'
    const description = (formData.get('description') as string) || ''
    const projectId = (formData.get('project_id') as string) || null
    const contactId = (formData.get('contact_id') as string) || null
    const folderPath = (formData.get('folder_path') as string) || null

    // Validate file
    const maxFileSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxFileSize) {
      throw ValidationError(`File size exceeds maximum limit of ${maxFileSize / (1024 * 1024)}MB`)
    }

    const supabase = await createClient()

    // Read file buffer once for HEIC detection, conversion, and thumbnail generation
    const arrayBuffer = await file.arrayBuffer()
    let buffer: Buffer = Buffer.from(arrayBuffer)
    const originalExt = file.name.split('.').pop() || 'bin'
    let effectiveExt = originalExt
    let effectiveMimeType = file.type

    // Detect and convert HEIC/HEIF files to JPEG
    const isHeic = isHeicMimeType(file.type) || isHeicBuffer(buffer) ||
                   ['heic', 'heif'].includes(originalExt.toLowerCase())

    if (isHeic) {
      logger.info('HEIC file detected, converting to JPEG', { fileName: file.name, size: file.size })
      const conversion = await convertHeicToJpeg(buffer)
      buffer = conversion.buffer
      effectiveMimeType = 'image/jpeg'
      effectiveExt = 'jpg'
    }

    // Generate unique filename for storage
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2)
    const storageFileName = `${timestamp}_${randomStr}.${effectiveExt}`
    const storagePath = `project-files/${storageFileName}`

    // Upload file buffer to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('files')
      .upload(storagePath, buffer, {
        contentType: effectiveMimeType,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      logger.error('File upload to storage failed', { error: uploadError })
      throw new Error(`File upload failed: ${uploadError.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('files')
      .getPublicUrl(uploadData.path)

    // Generate thumbnail for image files
    let thumbnailUrl: string | null = null
    const isImage = effectiveMimeType.startsWith('image/')

    if (isImage) {
      try {
        const sharp = (await import('sharp')).default

        const thumbnailBuffer = await sharp(buffer)
          .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 75 })
          .toBuffer()

        const thumbFileName = storageFileName.replace(/\.[^.]+$/, '.jpg')
        const thumbPath = `project-files/thumbs/${thumbFileName}`

        const { error: thumbUploadError } = await supabase.storage
          .from('files')
          .upload(thumbPath, thumbnailBuffer, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false,
          })

        if (!thumbUploadError) {
          const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
            .from('files')
            .getPublicUrl(thumbPath)
          thumbnailUrl = thumbPublicUrl
        } else {
          logger.warn('Thumbnail upload failed, continuing without', { error: thumbUploadError })
        }
      } catch (thumbError) {
        logger.warn('Thumbnail generation failed, continuing without', {
          error: thumbError instanceof Error ? thumbError.message : 'Unknown',
        })
      }
    }

    // Create file record in database
    const fileRecord = {
      file_name: fileName,
      file_type: fileType,
      file_category: fileCategory,
      file_url: publicUrl,
      thumbnail_url: thumbnailUrl,
      file_size: buffer.length,
      file_extension: effectiveExt,
      mime_type: effectiveMimeType,
      project_id: projectId,
      contact_id: contactId,
      folder_path: folderPath,
      description: description || null,
      tenant_id: tenantId,
      uploaded_by: userId,
      status: 'active',
      version: 1,
      parent_file_id: null,
      is_deleted: false,
      metadata: {
        original_filename: file.name,
        upload_method: 'direct',
        storage_path: storagePath,
        ...(isHeic ? { converted_from: 'heic', original_extension: originalExt } : {})
      }
    }

    const { data: dbFile, error: dbError } = await supabase
      .from('project_files')
      .insert(fileRecord)
      .select()
      .single()

    if (dbError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('files').remove([storagePath])
      throw mapSupabaseError(dbError)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/project-files/upload', 201, duration)
    logger.info('File uploaded successfully', {
      fileId: dbFile.id,
      fileName: fileName,
      fileSize: file.size,
      tenantId
    })

    return createdResponse({
      message: 'File uploaded successfully',
      file: dbFile
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('File upload error', { error, duration })
    return errorResponse(error as Error)
  }
})

// Set max file size for the upload
export const runtime = 'nodejs'
