import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * PATCH /api/settings/sms-templates/[id]
 * Update an SMS template
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

    if (body.message && body.message.length > 1600) {
      throw ValidationError('Message must be 1600 characters or less')
    }

    const supabase = await createClient()

    const { data: template, error } = await supabase
      .from('sms_templates')
      .update({
        name: body.name,
        description: body.description,
        message: body.message,
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
    logger.error('Error updating SMS template:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * DELETE /api/settings/sms-templates/[id]
 * Delete an SMS template
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
      .from('sms_templates')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      throw InternalError(error.message)
    }

    return successResponse(null)
  } catch (error) {
    logger.error('Error deleting SMS template:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
