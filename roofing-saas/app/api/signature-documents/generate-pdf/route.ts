import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  InternalError
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'
import { generateProfessionalPDF } from '@/lib/pdf/html-to-pdf'
import { mergeTemplateWithContactAndProject } from '@/lib/templates/merge'
import { uploadSignaturePdf } from '@/lib/storage/signature-pdfs'

/**
 * POST /api/signature-documents/generate-pdf
 * Generate PDF from HTML template with data
 *
 * Body:
 * - template_id: string (required) - Document template ID
 * - contact_id: string (optional) - Contact ID for data merging
 * - project_id: string (optional) - Project ID for data merging
 * - additional_data: object (optional) - Additional data for template merging
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

    const body = await request.json().catch(() => ({}))
    const {
      template_id,
      contact_id,
      project_id,
      additional_data = {}
    } = body

    // Validation
    if (!template_id) {
      throw ValidationError('Template ID is required')
    }

    logger.apiRequest('POST', '/api/signature-documents/generate-pdf', {
      tenantId,
      template_id,
      contact_id,
      project_id
    })

    const supabase = await createClient()

    // Fetch template with HTML content
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', template_id)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single()

    if (templateError || !template) {
      throw ValidationError('Template not found or inactive')
    }

    if (!template.html_content) {
      throw ValidationError('Template does not have HTML content')
    }

    // Fetch contact data if provided
    let contactData = null
    if (contact_id) {
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contact_id)
        .eq('tenant_id', tenantId)
        .single()

      if (contactError) {
        logger.warn('Failed to fetch contact data', { contact_id, error: contactError })
      } else {
        contactData = contact
      }
    }

    // Fetch project data if provided
    let projectData = null
    if (project_id) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', project_id)
        .eq('tenant_id', tenantId)
        .single()

      if (projectError) {
        logger.warn('Failed to fetch project data', { project_id, error: projectError })
      } else {
        projectData = project
      }
    }

    // Merge template with data
    const htmlContent = mergeTemplateWithContactAndProject(
      template.html_content,
      contactData,
      projectData,
      {
        document_title: template.name,
        document_type: template.category || 'other',
        ...additional_data
      }
    )

    // Generate PDF
    const pdfBuffer = await generateProfessionalPDF(htmlContent)

    // Upload PDF to storage
    const fileName = `generated-${template_id}-${Date.now()}.pdf`
    const pdfBlob = new Uint8Array(pdfBuffer)
    const uploadResult = await uploadSignaturePdf(
      new File([pdfBlob], fileName, { type: 'application/pdf' }),
      user.id
    )

    if (!uploadResult.success || !uploadResult.data) {
      throw InternalError('Failed to upload generated PDF')
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/signature-documents/generate-pdf', 200, duration)

    return successResponse({
      pdf_url: uploadResult.data.url,
      template: {
        id: template.id,
        name: template.name,
        category: template.category,
        signature_fields: template.signature_fields
      },
      generated_at: new Date().toISOString(),
      file_size: pdfBuffer.length
    })

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error generating PDF from template', { error, duration })
    return errorResponse(error as Error)
  }
}