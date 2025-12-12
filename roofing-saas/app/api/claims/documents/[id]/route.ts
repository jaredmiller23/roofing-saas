import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { logger } from '@/lib/logger'

/**
 * DELETE /api/claims/documents/[id]
 * Delete a claim document (soft delete in metadata, optionally remove from storage)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId } = await context.params
    const supabase = await createClient()

    // Get user's tenant
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (!tenantUser) {
      return NextResponse.json(
        { error: 'User not associated with any tenant' },
        { status: 403 }
      )
    }

    // Get document to verify ownership and get file_url
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('tenant_id', tenantUser.tenant_id)
      .eq('entity_type', 'claim')
      .single()

    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Hard delete the document record
    // (In production, you might want soft delete by adding is_deleted column)
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('tenant_id', tenantUser.tenant_id)

    if (deleteError) {
      logger.error('Failed to delete document record:', { error: deleteError })
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      )
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
      userId: user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error in DELETE /api/claims/documents/[id]:', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
