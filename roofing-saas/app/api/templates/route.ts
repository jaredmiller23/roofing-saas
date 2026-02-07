import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import {
  mapZodError,
} from '@/lib/api/errors'
import { paginatedResponse, createdResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100),
  type: z.enum(['sms', 'email']),
  content: z.string().min(1, 'Template content is required'),
  variables: z.array(z.string()).optional(),
  category: z.string().optional(),
})

/**
 * GET /api/templates
 * List templates with filtering
 */
export const GET = withAuth(async (request, { userId, tenantId }) => {
  const startTime = Date.now()

  try {
    logger.apiRequest('GET', '/api/templates', { tenantId, userId })

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') // 'sms' or 'email'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const supabase = await createClient()

    let query = supabase
      .from('templates')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (type) {
      query = query.eq('type', type)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: templates, error, count } = await query

    if (error) {
      throw new Error(error.message)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/templates', 200, duration)

    return paginatedResponse(
      { templates: templates || [], total: count || 0, page, limit },
      { page, limit, total: count || 0 }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Templates API error', { error, duration })
    return errorResponse(error as Error)
  }
})

/**
 * POST /api/templates
 * Create a new template
 */
export const POST = withAuth(async (request, { userId, tenantId }) => {
  const startTime = Date.now()

  try {
    logger.apiRequest('POST', '/api/templates', { tenantId, userId })

    const body = await request.json()

    // Validate input
    const validatedData = createTemplateSchema.safeParse(body)
    if (!validatedData.success) {
      throw mapZodError(validatedData.error)
    }

    const supabase = await createClient()

    // Create template
    const { data: template, error } = await supabase
      .from('templates')
      .insert({
        ...validatedData.data,
        tenant_id: tenantId,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/templates', 201, duration)
    logger.info('Template created', { templateId: template.id, type: template.type })

    return createdResponse({ template })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Create template error', { error, duration })
    return errorResponse(error as Error)
  }
})
