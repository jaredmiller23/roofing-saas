import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * PATCH /api/settings/email-templates/[id]
 * Update an email template
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const { id } = await params
    const body = await request.json()
    const supabase = await createClient()

    const { data: template, error } = await supabase
      .from('email_templates')
      .update({
        name: body.name,
        description: body.description,
        subject: body.subject,
        body: body.body,
        category: body.category,
        available_variables: body.available_variables,
        is_active: body.is_active,
        is_default: body.is_default
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      throw InternalError(error.message)
    }

    if (!template) {
      throw NotFoundError('Template not found')
    }

    return successResponse(template)
  } catch (error) {
    logger.error('Error updating email template:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * DELETE /api/settings/email-templates/[id]
 * Delete an email template
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const { id } = await params
    const supabase = await createClient()

    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      throw InternalError(error.message)
    }

    return successResponse(null)
  } catch (error) {
    logger.error('Error deleting email template:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
