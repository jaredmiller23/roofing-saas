import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  mapZodError,
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Schema for signature field placement
const signatureFieldSchema = z.object({
  id: z.string(),
  type: z.enum(['signature', 'initials', 'date', 'text', 'checkbox', 'name', 'email']),
  label: z.string().optional(),
  page: z.number().int().min(1).default(1),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(1).max(100).default(20),
  height: z.number().min(1).max(100).default(5),
  required: z.boolean().default(true),
  assignedTo: z.enum(['customer', 'company', 'any']).default('customer'),
  tabOrder: z.number().int().default(0),
})

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  category: z.enum(['contracts', 'estimates', 'waivers', 'change_orders', 'other']).optional().nullable(),
  html_content: z.string().optional().nullable(),
  pdf_template_url: z.string().url().optional().nullable(),
  signature_fields: z.array(signatureFieldSchema).optional(),
  is_active: z.boolean().optional(),
  requires_customer_signature: z.boolean().optional(),
  requires_company_signature: z.boolean().optional(),
  expiration_days: z.number().int().min(1).max(365).optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/signature-templates/[id]
 * Get a single signature template by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now()

  try {
    const { id } = await params

    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    logger.apiRequest('GET', `/api/signature-templates/${id}`, { tenantId, userId: user.id })

    const supabase = await createClient()

    const { data: template, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw NotFoundError('Signature template not found')
      }
      logger.error('Supabase error fetching signature template', { error })
      throw new Error(error.message)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', `/api/signature-templates/${id}`, 200, duration)

    return successResponse({ template })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Get signature template error', { error, duration })
    return errorResponse(error as Error)
  }
}

/**
 * PATCH /api/signature-templates/[id]
 * Update a signature template
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now()

  try {
    const { id } = await params

    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    logger.apiRequest('PATCH', `/api/signature-templates/${id}`, { tenantId, userId: user.id })

    const body = await request.json().catch(() => ({}))

    // Validate input
    const validatedData = updateTemplateSchema.safeParse(body)
    if (!validatedData.success) {
      throw mapZodError(validatedData.error)
    }

    const supabase = await createClient()

    // Verify template exists and belongs to tenant
    const { data: existing, error: fetchError } = await supabase
      .from('document_templates')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !existing) {
      throw NotFoundError('Signature template not found')
    }

    // Update template
    const { data: template, error } = await supabase
      .from('document_templates')
      .update({
        ...validatedData.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      logger.error('Supabase error updating signature template', { error })
      throw new Error(error.message)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('PATCH', `/api/signature-templates/${id}`, 200, duration)
    logger.info('Signature template updated', { templateId: id })

    return successResponse({ template })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Update signature template error', { error, duration })
    return errorResponse(error as Error)
  }
}

/**
 * DELETE /api/signature-templates/[id]
 * Delete a signature template
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now()

  try {
    const { id } = await params

    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    logger.apiRequest('DELETE', `/api/signature-templates/${id}`, { tenantId, userId: user.id })

    const supabase = await createClient()

    // Verify template exists and belongs to tenant
    const { data: existing, error: fetchError } = await supabase
      .from('document_templates')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !existing) {
      throw NotFoundError('Signature template not found')
    }

    // Check if template is in use by any documents
    const { count: documentsUsingTemplate } = await supabase
      .from('signature_documents')
      .select('id', { count: 'exact', head: true })
      .eq('template_id', id)

    if (documentsUsingTemplate && documentsUsingTemplate > 0) {
      // Soft delete - deactivate instead of removing
      const { error: updateError } = await supabase
        .from('document_templates')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId)

      if (updateError) {
        throw new Error(updateError.message)
      }

      const duration = Date.now() - startTime
      logger.apiResponse('DELETE', `/api/signature-templates/${id}`, 200, duration)
      logger.info('Signature template deactivated (in use by documents)', {
        templateId: id,
        documentsCount: documentsUsingTemplate,
      })

      return successResponse({
        message: 'Template deactivated (in use by documents)',
        deactivated: true,
      })
    }

    // Hard delete if not in use
    const { error } = await supabase
      .from('document_templates')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      logger.error('Supabase error deleting signature template', { error })
      throw new Error(error.message)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('DELETE', `/api/signature-templates/${id}`, 200, duration)
    logger.info('Signature template deleted', { templateId: id })

    return successResponse({ message: 'Template deleted successfully', deleted: true })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Delete signature template error', { error, duration })
    return errorResponse(error as Error)
  }
}
