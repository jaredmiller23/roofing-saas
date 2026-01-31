import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, createdResponse, errorResponse } from '@/lib/api/response'

/**
 * GET /api/settings/email-templates
 * Get all email templates for tenant
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
      .from('email_templates')
      .select('*')
      .eq('tenant_id', tenantId)

    if (category) {
      query = query.eq('category', category)
    }

    const { data: templates, error } = await query.order('created_at', { ascending: false })

    if (error) {
      throw InternalError(error.message)
    }

    return successResponse(templates || [])
  } catch (error) {
    logger.error('Error fetching email templates:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * POST /api/settings/email-templates
 * Create a new email template
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
      subject,
      body: emailBody,
      category,
      available_variables,
      is_active,
      is_default
    } = body

    if (!name || !subject || !emailBody) {
      throw ValidationError('Name, subject, and body are required')
    }

    const supabase = await createClient()

    const { data: template, error } = await supabase
      .from('email_templates')
      .insert({
        tenant_id: tenantId,
        name,
        description,
        subject,
        body: emailBody,
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

    return createdResponse(template)
  } catch (error) {
    logger.error('Error creating email template:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
