/**
 * Challenge by ID API
 */

import { createClient } from '@/lib/supabase/server'
import { getUserTenantId } from '@/lib/auth/session'
import { challengeConfigSchema } from '@/lib/gamification/types'
import { logger } from '@/lib/logger'
import { AuthenticationError, ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)

    if (!tenantId) {
      throw ValidationError('Organization not found')
    }

    const body = await request.json()
    const validationResult = challengeConfigSchema.partial().safeParse(body)

    if (!validationResult.success) {
      throw ValidationError('Validation failed')
    }

    const validated = validationResult.data

    const { data, error } = await supabase
      .from('challenges')
      .update({ ...validated, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenantId', tenantId)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update challenge', { error, tenantId, challenge_id: id })

      if (error.code === 'PGRST116') {
        throw NotFoundError('Challenge not found')
      }

      throw InternalError(error.message)
    }

    logger.info('Updated challenge', { tenantId, challenge_id: data.id })

    return successResponse({ data, success: true })
  } catch (error) {
    logger.error('Challenge PATCH error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)

    if (!tenantId) {
      throw ValidationError('Organization not found')
    }

    const { error } = await supabase
      .from('challenges')
      .delete()
      .eq('id', id)
      .eq('tenantId', tenantId)

    if (error) {
      logger.error('Failed to delete challenge', { error, tenantId, challenge_id: id })
      throw InternalError(error.message)
    }

    logger.info('Deleted challenge', { tenantId, challenge_id: id })

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Challenge DELETE error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
