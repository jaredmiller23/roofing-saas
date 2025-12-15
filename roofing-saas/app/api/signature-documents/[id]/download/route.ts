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
import { generateSignedPDF, uploadPDFToStorage } from '@/lib/pdf/signature-pdf-generator'

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
      throw NotFoundError('Signature document')
    }

    // Check if document has been signed
    if (document.status !== 'signed') {
      throw ValidationError('Document must be signed before downloading')
    }

    try {
      // Generate PDF with signatures
      logger.info('Generating signed PDF', {
        documentId: id,
        signaturesCount: document.signatures?.length || 0
      })

      const pdfBytes = await generateSignedPDF(
        {
          title: document.title,
          description: document.description,
          document_type: document.document_type,
          project: document.project,
          contact: document.contact
        },
        document.signatures || [],
        document.file_url || undefined
      )

      // Upload to Supabase Storage if not already stored
      let finalUrl = document.file_url

      if (!finalUrl || !finalUrl.includes('signed')) {
        const fileName = `signed-documents/${tenantId}/${id}_signed_${Date.now()}.pdf`

        finalUrl = await uploadPDFToStorage(
          pdfBytes,
          fileName,
          'documents',
          supabase
        )

        // Update document with signed PDF URL
        await supabase
          .from('signature_documents')
          .update({ file_url: finalUrl })
          .eq('id', id)

        logger.info('Signed PDF uploaded to storage', {
          documentId: id,
          fileUrl: finalUrl
        })
      }

      const duration = Date.now() - startTime
      logger.apiResponse('GET', `/api/signature-documents/${id}/download`, 200, duration)

      // Return PDF as downloadable file
      return new Response(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${document.title.replace(/[^a-z0-9]/gi, '_')}_signed.pdf"`,
          'Content-Length': pdfBytes.length.toString(),
        }
      })
    } catch (pdfError) {
      logger.error('Error generating PDF', { error: pdfError, documentId: id })
      throw new Error(`PDF generation failed: ${(pdfError as Error).message}`)
    }
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error downloading signature document', { error, duration })
    return errorResponse(error as Error)
  }
}
