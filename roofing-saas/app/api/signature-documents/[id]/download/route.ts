import { withAuthParams } from '@/lib/auth/with-auth'
import { NextRequest } from 'next/server'
import {
  NotFoundError,
  ValidationError
} from '@/lib/api/errors'
import { errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'
import { generateSignedPDF, uploadPDFToStorage, type SignatureData } from '@/lib/pdf/signature-pdf-generator'

/**
 * GET /api/signature-documents/[id]/download
 * Download a signed document as PDF
 *
 * Returns the PDF file with signatures embedded
 */
export const GET = withAuthParams(async (
  request: NextRequest,
  { tenantId },
  { params }
) => {
  const startTime = Date.now()

  try {
    const { id } = await params

    logger.apiRequest('GET', `/api/signature-documents/${id}/download`, {
      tenantId,
      id
    })

    const supabase = await createClient()

    // Get document
    const { data: document, error } = await supabase
      .from('signature_documents')
      .select('*')
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

    // Fetch signatures separately (no FK relationship in generated types)
    const { data: signatures } = await supabase
      .from('signatures')
      .select('*')
      .eq('document_id', id)

    // Fetch project name if available
    let projectName: string | undefined
    if (document.project_id) {
      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', document.project_id)
        .single()
      projectName = project?.name ?? undefined
    }

    // Fetch contact first/last name for PDF generation
    let contactInfo: { first_name: string; last_name: string } | undefined
    if (document.contact_id) {
      const { data: contactData } = await supabase
        .from('contacts')
        .select('first_name, last_name')
        .eq('id', document.contact_id)
        .single()
      if (contactData) {
        contactInfo = { first_name: contactData.first_name, last_name: contactData.last_name }
      }
    }

    try {
      // Generate PDF with signatures
      logger.info('Generating signed PDF', {
        documentId: id,
        signaturesCount: signatures?.length || 0
      })

      const pdfBytes = await generateSignedPDF(
        {
          title: document.title,
          description: document.description ?? undefined,
          document_type: document.document_type,
          project: projectName ? { name: projectName } : undefined,
          contact: contactInfo
        },
        (signatures || []) as unknown as SignatureData[],
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
})
