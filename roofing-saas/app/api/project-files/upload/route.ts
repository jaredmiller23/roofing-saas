import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  mapSupabaseError,
} from '@/lib/api/errors'
import { createdResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * POST /api/project-files/upload
 * Upload files via multipart/form-data (for mobile and direct uploads)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    logger.apiRequest('POST', '/api/project-files/upload', { tenantId, userId: user.id })

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
    const folderPath = (formData.get('folder_path') as string) || null

    // Validate file
    const maxFileSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxFileSize) {
      throw ValidationError(`File size exceeds maximum limit of ${maxFileSize / (1024 * 1024)}MB`)
    }

    const supabase = await createClient()

    // Generate unique filename for storage
    const fileExt = file.name.split('.').pop() || 'bin'
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2)
    const storageFileName = `${timestamp}_${randomStr}.${fileExt}`
    const storagePath = `project-files/${storageFileName}`

    // Upload file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('files')
      .upload(storagePath, file, {
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

    // Create file record in database
    const fileRecord = {
      file_name: fileName,
      file_type: fileType,
      file_category: fileCategory,
      file_url: publicUrl,
      file_size: file.size,
      file_extension: fileExt,
      mime_type: file.type,
      project_id: projectId,
      folder_path: folderPath,
      description: description || null,
      tenant_id: tenantId,
      uploaded_by: user.id,
      status: 'active',
      version: 1,
      parent_file_id: null,
      is_deleted: false,
      metadata: {
        original_filename: file.name,
        upload_method: 'direct',
        storage_path: storagePath
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
}

// Set max file size for the upload
export const runtime = 'nodejs'