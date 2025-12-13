/**
 * Challenges API
 * CRUD operations for time-limited competitions
 */

import { createClient } from '@/lib/supabase/server'
import { challengeConfigSchema } from '@/lib/gamification/types'
import { logger } from '@/lib/logger'
import { AuthenticationError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse, createdResponse } from '@/lib/api/response'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw AuthenticationError()
    }

    const org_id = user.user_metadata?.org_id

    if (!org_id) {
      throw ValidationError('Organization not found')
    }

    const { data, error } = await supabase
      .from('challenge_configs')
      .select('*')
      .eq('org_id', org_id)
      .order('start_date', { ascending: false })

    if (error) {
      logger.error('Failed to fetch challenges', { error, org_id })
      throw InternalError(error.message)
    }

    return successResponse({ data, success: true })
  } catch (error) {
    logger.error('Challenges GET error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw AuthenticationError()
    }

    const org_id = user.user_metadata?.org_id

    if (!org_id) {
      throw ValidationError('Organization not found')
    }

    const body = await request.json()
    const validationResult = challengeConfigSchema.safeParse(body)

    if (!validationResult.success) {
      throw ValidationError('Validation failed')
    }

    const validated = validationResult.data

    const { data, error } = await supabase
      .from('challenge_configs')
      .insert({ ...validated, org_id, created_by: user.id })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create challenge', { error, org_id })
      throw InternalError(error.message)
    }

    logger.info('Created challenge', { org_id, challenge_id: data.id, title: data.title })

    return createdResponse({ data, success: true })
  } catch (error) {
    logger.error('Challenges POST error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
