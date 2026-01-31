import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError,
  mapZodError,
} from '@/lib/api/errors'
import { paginatedResponse, createdResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Schema for signature field placement
const signatureFieldSchema = z.object({
  id: z.string(),
  type: z.enum(['signature', 'initials', 'date', 'text', 'checkbox', 'name', 'email']),
  label: z.string().optional(),
  page: z.number().int().min(1).default(1),
  x: z.number().min(0).max(100), // percentage from left
  y: z.number().min(0).max(100), // percentage from top
  width: z.number().min(1).max(100).default(20),
  height: z.number().min(1).max(100).default(5),
  required: z.boolean().default(true),
  assignedTo: z.enum(['customer', 'company', 'any']).default('customer'),
  tabOrder: z.number().int().default(0),
})

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(200),
  description: z.string().optional(),
  category: z.enum(['contracts', 'estimates', 'waivers', 'change_orders', 'other']).optional(),
  html_content: z.string().optional(),
  pdf_template_url: z.string().url().optional().nullable(),
  signature_fields: z.array(signatureFieldSchema).default([]),
  is_active: z.boolean().default(true),
  requires_customer_signature: z.boolean().default(true),
  requires_company_signature: z.boolean().default(true),
  expiration_days: z.number().int().min(1).max(365).default(30),
})

export type SignatureField = z.infer<typeof signatureFieldSchema>
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>

/**
 * GET /api/signature-templates
 * List signature document templates with filtering
 *
 * Query params:
 * - category: filter by category
 * - is_active: filter by active status
 * - page: page number (default 1)
 * - limit: items per page (default 20)
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

    logger.apiRequest('GET', '/api/signature-templates', { tenantId, userId: user.id })

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const isActive = searchParams.get('is_active')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const supabase = await createClient()

    let query = supabase
      .from('document_templates')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: templates, error, count } = await query

    if (error) {
      logger.error('Supabase error fetching signature templates', { error })
      throw new Error(error.message)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/signature-templates', 200, duration)

    return paginatedResponse(templates || [], { page, limit, total: count || 0 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Signature templates API error', { error, duration })
    return errorResponse(error as Error)
  }
}

/**
 * POST /api/signature-templates
 * Create a new signature document template
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

    logger.apiRequest('POST', '/api/signature-templates', { tenantId, userId: user.id })

    const body = await request.json().catch(() => ({}))

    // Validate input
    const validatedData = createTemplateSchema.safeParse(body)
    if (!validatedData.success) {
      throw mapZodError(validatedData.error)
    }

    const supabase = await createClient()

    // Create template
    const { data: template, error } = await supabase
      .from('document_templates')
      .insert({
        ...validatedData.data,
        tenant_id: tenantId,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      logger.error('Supabase error creating signature template', { error })
      throw new Error(error.message)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/signature-templates', 201, duration)
    logger.info('Signature template created', {
      templateId: template.id,
      name: template.name,
      category: template.category,
    })

    return createdResponse(template)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Create signature template error', { error, duration })
    return errorResponse(error as Error)
  }
}
