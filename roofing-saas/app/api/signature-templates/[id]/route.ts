import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError,
  InternalError,
  NotFoundError
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/signature-templates/[id]
 * Get a specific signature template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      template: {
        ...template,
        has_html_content: !!template.html_content
      }
    })

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error fetching template', { error, duration })
    return errorResponse(error as Error)
  }
}
