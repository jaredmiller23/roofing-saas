import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, createdResponse, errorResponse } from '@/lib/api/response'

/**
 * GET /api/settings/sms-templates
 * Get all SMS templates for tenant
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const supabase = await createClient()

    let query = supabase
      .from('sms_templates')
      .select('*')
      .eq('tenant_id', tenantId)

    if (category) {
      query = query.eq('category', category)
    }

    const { data: templates, error } = await query.order('created_at', { ascending: false })

    if (error) {
      throw InternalError(error.message)
    }

    return successResponse({ templates: templates || [] })
  } catch (error) {
    logger.error('Error fetching SMS templates:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * POST /api/settings/sms-templates
 * Create a new SMS template
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const body = await request.json()
    const {
      name,
      description,
      message,
      category,
      available_variables,
      is_active,
      is_default
    } = body

    if (!name || !message) {
      throw ValidationError('Name and message are required')
    }

    if (message.length > 1600) {
      throw ValidationError('Message must be 1600 characters or less')
    }

    const supabase = await createClient()

    const { data: template, error } = await supabase
      .from('sms_templates')
      .insert({
        tenant_id: tenantId,
        name,
        description,
        message,
        category,
        available_variables,
        is_active,
        is_default,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      throw InternalError(error.message)
    }

    return createdResponse({ template })
  } catch (error) {
    logger.error('Error creating SMS template:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
