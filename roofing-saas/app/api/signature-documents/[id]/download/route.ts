import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError
} from '@/lib/api/errors'
import { errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/signature-documents/[id]/download
 * Download a signed document as PDF
 *
 * Returns the PDF file with signatures embedded
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    logger.apiRequest('GET', `/api/signature-documents/${id}/download`, {
      tenantId,
      id
    })

    const supabase = await createClient()

    // Get document with signatures
    const { data: document, error } = await supabase
      .from('signature_documents')
      .select(`
        *,
        signatures(*)
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !document) {
      throw NotFoundError('Signature document not found')
    }

    // Check if document has been signed
    if (document.status !== 'signed') {
      throw ValidationError('Document must be signed before downloading')
    }

    // If file_url exists, fetch and return it
    if (document.file_url) {
      // TODO: Fetch PDF from Supabase Storage and return
      // For now, return a placeholder response

      const duration = Date.now() - startTime
      logger.apiResponse('GET', `/api/signature-documents/${id}/download`, 200, duration)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'PDF download endpoint ready. PDF generation to be implemented.',
          document_url: document.file_url,
          signatures: document.signatures
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }

    // If no file_url, we need to generate PDF from HTML template
    // TODO: Implement PDF generation using Puppeteer or similar
    // 1. Get template HTML
    // 2. Replace placeholders with document data
    // 3. Add signature images
    // 4. Generate PDF
    // 5. Store in Supabase Storage
    // 6. Return PDF

    const duration = Date.now() - startTime
    logger.apiResponse('GET', `/api/signature-documents/${id}/download`, 501, duration)

    return new Response(
      JSON.stringify({
        success: false,
        error: 'PDF generation not yet implemented',
        document,
        signatures: document.signatures
      }),
      {
        status: 501,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error downloading signature document', { error, duration })
    return errorResponse(error as Error)
  }
}
