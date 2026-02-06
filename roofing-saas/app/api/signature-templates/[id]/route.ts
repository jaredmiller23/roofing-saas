import { withAuthParams } from '@/lib/auth/with-auth'
import { NextRequest } from 'next/server'
import {
  InternalError,
  NotFoundError,
  mapZodError,
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

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
  name: z.string().min(1).max(200),
  description: z.string().nullable(),
  category: z.enum(['contracts', 'estimates', 'waivers', 'change_orders', 'other']),
  html_content: z.string().nullable(),
  pdf_template_url: z.string().url().nullable(),
  signature_fields: z.array(signatureFieldSchema),
  is_active: z.boolean(),
  requires_customer_signature: z.boolean(),
  requires_company_signature: z.boolean(),
  expiration_days: z.number().int().min(1).max(365),
}).partial()

/**
 * GET /api/signature-templates/[id]
 * Get a specific signature template by ID
 */
export const GET = withAuthParams(async (
  request: NextRequest,
  { tenantId },
  { params }
) => {
  const startTime = Date.now()

  try {
    const { id } = await params
    const templateId = id

    logger.apiRequest('GET', `/api/signature-templates/${templateId}`, {
      tenantId,
      templateId
    })

    const supabase = await createClient()

    const { data: template, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      logger.error('Supabase error fetching template', { error, templateId })
      throw InternalError('Failed to fetch template')
    }

    if (!template) {
      throw NotFoundError('Template')
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', `/api/signature-templates/${templateId}`, 200, duration)

    return successResponse({
      ...template,
      has_html_content: !!template.html_content
    })

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error fetching template', { error, duration })
    return errorResponse(error as Error)
  }
})

/**
 * PATCH /api/signature-templates/[id]
 * Update a signature template
 */
export const PATCH = withAuthParams(async (
  request: NextRequest,
  { tenantId },
  { params }
) => {
  const startTime = Date.now()

  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    logger.apiRequest('PATCH', `/api/signature-templates/${id}`, {
      tenantId,
      templateId: id,
    })

    const validatedData = updateTemplateSchema.safeParse(body)
    if (!validatedData.success) {
      throw mapZodError(validatedData.error)
    }

    const supabase = await createClient()

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
      logger.error('Supabase error updating template', { error, templateId: id })
      if (error.code === 'PGRST116') {
        throw NotFoundError('Template')
      }
      throw InternalError('Failed to update template')
    }

    const duration = Date.now() - startTime
    logger.apiResponse('PATCH', `/api/signature-templates/${id}`, 200, duration)
    logger.info('Signature template updated', {
      templateId: template.id,
      name: template.name,
    })

    return successResponse(template)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error updating template', { error, duration })
    return errorResponse(error as Error)
  }
})

/**
 * DELETE /api/signature-templates/[id]
 * Soft-delete a signature template
 */
export const DELETE = withAuthParams(async (
  _request: NextRequest,
  { tenantId },
  { params }
) => {
  const startTime = Date.now()

  try {
    const { id } = await params

    logger.apiRequest('DELETE', `/api/signature-templates/${id}`, {
      tenantId,
      templateId: id,
    })

    const supabase = await createClient()

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('document_templates')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      logger.error('Supabase error deleting template', { error, templateId: id })
      throw InternalError('Failed to delete template')
    }

    const duration = Date.now() - startTime
    logger.apiResponse('DELETE', `/api/signature-templates/${id}`, 200, duration)
    logger.info('Signature template deleted', { templateId: id })

    return successResponse(null)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error deleting template', { error, duration })
    return errorResponse(error as Error)
  }
})
