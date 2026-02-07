import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * POST /api/claims/documents/upload
 * Upload a document for a claim
 */
export const POST = withAuth(async (request, { userId, tenantId }) => {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const claimId = formData.get('claimId') as string
    const documentType = formData.get('documentType') as string

    if (!file || !claimId) {
      throw ValidationError('File and claimId are required')
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw ValidationError('File size exceeds 10MB limit')
    }

    const supabase = await createClient()

    // Ensure storage bucket exists
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some((b) => b.name === 'claim-documents')

    if (!bucketExists) {
      // Create bucket if it doesn't exist
      const { error: bucketError } = await supabase.storage.createBucket('claim-documents', {
        public: false, // Private bucket - only authenticated users with RLS
        fileSizeLimit: MAX_FILE_SIZE,
      })

      if (bucketError) {
        logger.error('Failed to create claim-documents bucket:', { error: bucketError })
        // Continue anyway - bucket might exist but not be listed
      }
    }

    // Generate unique file path: {tenant_id}/{claim_id}/{timestamp}_{filename}
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${tenantId}/${claimId}/${timestamp}_${sanitizedFileName}`

    // Upload file to Supabase Storage
    const fileBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('claim-documents')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      logger.error('Storage upload error:', { error: uploadError })
      throw InternalError('Failed to upload file to storage')
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('claim-documents')
      .getPublicUrl(filePath)

    // Create document metadata record in documents table
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        tenant_id: tenantId,
        entity_type: 'claim',
        entity_id: claimId,
        name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
        type: documentType || 'other',
        created_by: userId,
      })
      .select()
      .single()

    if (dbError) {
      logger.error('Database insert error:', { error: dbError })
      // Clean up uploaded file
      await supabase.storage.from('claim-documents').remove([filePath])
      throw InternalError('Failed to save document metadata')
    }

    logger.info('Document uploaded successfully', {
      documentId: document.id,
      claimId,
      fileName: file.name,
      userId,
    })

    return successResponse({ document })
  } catch (error) {
    logger.error('Error in POST /api/claims/documents/upload:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
