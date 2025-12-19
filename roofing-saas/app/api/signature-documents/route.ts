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
import { uploadSignaturePdfFromServer } from '@/lib/storage/signature-pdfs-server'
import { z } from 'zod'

// PDF generation requires longer timeout on Vercel
// Puppeteer/Chromium can take 10-30 seconds to initialize and generate
export const maxDuration = 60

// Zod schema for signature field placements
const signatureFieldSchema = z.object({
  id: z.string(),
  type: z.enum(['signature', 'initials', 'date', 'text', 'checkbox', 'name', 'email']),
  label: z.string(),
  page: z.number().int().positive(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().positive(),
  height: z.number().positive(),
  required: z.boolean(),
  assignedTo: z.enum(['customer', 'company', 'any'])
})

const signatureFieldsSchema = z.array(signatureFieldSchema).optional().default([])

/**
 * GET /api/signature-documents
 * List signature documents with filtering
 *
 * Query params:
 * - status: filter by document status
 * - project_id: filter by project
 * - contact_id: filter by contact
 * - limit: max results (default 50)
 * - offset: pagination offset
 */
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const projectId = searchParams.get('project_id')
    const contactId = searchParams.get('contact_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    logger.apiRequest('GET', '/api/signature-documents', {
      tenantId,
      status,
      projectId,
      contactId,
      limit,
      offset
    })

    const supabase = await createClient()

    // Build query with filters
    let query = supabase
      .from('signature_documents')
      .select(`
        *,
        project:projects(id, name),
        contact:contacts(id, first_name, last_name),
        signatures(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (contactId) {
      query = query.eq('contact_id', contactId)
    }

    query = query.range(offset, offset + limit - 1)

    const { data: documents, error, count } = await query

    if (error) {
      logger.error('Supabase error fetching signature documents', { error })
      throw InternalError('Failed to fetch signature documents')
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/signature-documents', 200, duration)

    return successResponse({
      documents: documents || [],
      total: count || 0,
      limit,
      offset
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error fetching signature documents', { error, duration })
    return errorResponse(error as Error)
  }
}

/**
 * POST /api/signature-documents
 * Create a new signature document
 *
 * Body:
 * - title: string (required)
 * - description: string
 * - document_type: string (required)
 * - project_id: uuid
 * - contact_id: uuid
 * - template_id: uuid
 * - file_url: string
 * - requires_customer_signature: boolean
 * - requires_company_signature: boolean
 * - expires_at: timestamp
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
      title,
      description,
      document_type,
      project_id,
      contact_id,
      template_id,
      file_url,
      signature_fields: rawSignatureFields,
      requires_customer_signature = true,
      requires_company_signature = true,
      expires_at
    } = body

    // Validation
    if (!title) {
      throw ValidationError('Title is required')
    }

    if (!document_type) {
      throw ValidationError('Document type is required')
    }

    const validTypes = ['contract', 'estimate', 'change_order', 'waiver', 'other']
    if (!validTypes.includes(document_type)) {
      throw ValidationError(`Invalid document type. Must be one of: ${validTypes.join(', ')}`)
    }

    // Validate signature fields if provided
    let signature_fields: z.infer<typeof signatureFieldsSchema> = []
    if (rawSignatureFields !== undefined) {
      const fieldsResult = signatureFieldsSchema.safeParse(rawSignatureFields)
      if (!fieldsResult.success) {
        throw ValidationError(`Invalid signature fields: ${fieldsResult.error.message}`)
      }
      signature_fields = fieldsResult.data
    }

    logger.apiRequest('POST', '/api/signature-documents', {
      tenantId,
      title,
      document_type,
      project_id,
      contact_id
    })

    const supabase = await createClient()

    // If template_id is provided, check if template has HTML content
    let generatedPdfUrl = file_url
    let finalSignatureFields = signature_fields
    let pdfGenerationError: string | null = null

    if (template_id) {
      const { data: template, error: templateError } = await supabase
        .from('document_templates')
        .select('html_content, signature_fields, requires_customer_signature, requires_company_signature')
        .eq('id', template_id)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .single()

      if (!templateError && template?.html_content) {
        logger.info('Generating PDF from HTML template', { template_id })

        try {
          // Fetch contact and project data for template merging
          let contactData = null
          let projectData = null

          if (contact_id) {
            const { data: contact } = await supabase
              .from('contacts')
              .select('*')
              .eq('id', contact_id)
              .eq('tenant_id', tenantId)
              .single()
            contactData = contact
          }

          if (project_id) {
            const { data: project } = await supabase
              .from('projects')
              .select('*')
              .eq('id', project_id)
              .eq('tenant_id', tenantId)
              .single()
            projectData = project
          }

          // Merge template with data
          const htmlContent = mergeTemplateWithContactAndProject(
            template.html_content,
            contactData,
            projectData,
            {
              document_title: title,
              document_type,
            }
          )

          // Generate PDF
          const pdfBuffer = await generateProfessionalPDF(htmlContent)

          // Upload generated PDF using server-side function
          const fileName = `generated-${template_id}-${Date.now()}.pdf`
          const uploadResult = await uploadSignaturePdfFromServer(
            pdfBuffer,
            user.id,
            fileName
          )

          if (uploadResult.success && uploadResult.data) {
            generatedPdfUrl = uploadResult.data.url
            logger.info('PDF generated and uploaded successfully', {
              template_id,
              pdf_url: generatedPdfUrl
            })
          }

          // Use template signature fields if not provided
          if (!signature_fields?.length && template.signature_fields?.length) {
            finalSignatureFields = template.signature_fields as z.infer<typeof signatureFieldsSchema>
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          const errorStack = error instanceof Error ? error.stack : undefined
          logger.error('Error generating PDF from template', {
            error: errorMessage,
            stack: errorStack,
            template_id
          })
          // Store error for debugging (visible in response)
          console.error('[PDF_GEN_ERROR]', errorMessage, errorStack)
          // Capture error for API response so we can debug
          pdfGenerationError = errorMessage
          // Continue with document creation even if PDF generation fails
        }
      }
    }

    const { data: document, error } = await supabase
      .from('signature_documents')
      .insert({
        tenant_id: tenantId,
        title,
        description,
        document_type,
        project_id,
        contact_id,
        template_id,
        file_url: generatedPdfUrl,
        signature_fields: finalSignatureFields,
        requires_customer_signature,
        requires_company_signature,
        expires_at,
        created_by: user.id,
        status: 'draft'
      })
      .select()
      .single()

    if (error) {
      logger.error('Supabase error creating signature document', { error })
      throw InternalError('Failed to create signature document')
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/signature-documents', 201, duration)

    // Include PDF generation error in response for debugging
    const response: { document: typeof document; pdf_generation_error?: string } = { document }
    if (pdfGenerationError) {
      response.pdf_generation_error = pdfGenerationError
    }

    return successResponse(response, 201)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error creating signature document', { error, duration })
    return errorResponse(error as Error)
  }
}
