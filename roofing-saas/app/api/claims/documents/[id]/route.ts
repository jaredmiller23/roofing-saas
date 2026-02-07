import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * DELETE /api/claims/documents/[id]
 * Delete a claim document (soft delete in metadata, optionally remove from storage)
 */
export const DELETE = withAuthParams(async (_request, { userId, tenantId }, { params }) => {
  try {
    const { id: documentId } = await params
    const supabase = await createClient()

    // Get document to verify ownership and get file_url (exclude soft-deleted)
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('tenant_id', tenantId)
      .eq('entity_type', 'claim')
      .eq('is_deleted', false)
      .single()

    if (fetchError || !document) {
      throw NotFoundError('Document')
    }

    // Soft delete the document record
    const { error: deleteError } = await supabase
      .from('documents')
      .update({ is_deleted: true })
      .eq('id', documentId)
      .eq('tenant_id', tenantId)

    if (deleteError) {
      logger.error('Failed to delete document record:', { error: deleteError })
      throw InternalError('Failed to delete document')
    }

    // Extract file path from URL and delete from storage
    // URL format: https://[project].supabase.co/storage/v1/object/public/claim-documents/{path}
    try {
      const urlParts = document.file_url.split('/claim-documents/')
      if (urlParts.length === 2) {
        const filePath = decodeURIComponent(urlParts[1])
        await supabase.storage.from('claim-documents').remove([filePath])
      }
    } catch (storageError) {
      // Log but don't fail - metadata is already deleted
      logger.error('Failed to delete file from storage:', { error: storageError })
    }

    logger.info('Document deleted successfully', {
      documentId,
      claimId: document.entity_id,
      userId,
    })

    return successResponse(null)
  } catch (error) {
    logger.error('Error in DELETE /api/claims/documents/[id]:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
