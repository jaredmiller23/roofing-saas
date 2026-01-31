/**
 * Challenges API
 * CRUD operations for time-limited competitions
 */

import type { Database } from '@/lib/types/database.types'
import { createClient } from '@/lib/supabase/server'
import { getUserTenantId } from '@/lib/auth/session'
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

    const tenantId = await getUserTenantId(user.id)

    if (!tenantId) {
      throw ValidationError('Organization not found')
    }

    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('start_date', { ascending: false })

    if (error) {
      logger.error('Failed to fetch challenges', { error, tenantId })
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

    const tenantId = await getUserTenantId(user.id)

    if (!tenantId) {
      throw ValidationError('Organization not found')
    }

    const body = await request.json()
    const validationResult = challengeConfigSchema.safeParse(body)

    if (!validationResult.success) {
      throw ValidationError('Validation failed')
    }

    const validated = validationResult.data

    const { data, error } = await supabase
      .from('challenges')
      .insert({ ...validated, tenant_id: tenantId, created_by: user.id } as unknown as Database['public']['Tables']['challenges']['Insert'])
      .select()
      .single()

    if (error) {
      logger.error('Failed to create challenge', { error, tenantId })
      throw InternalError(error.message)
    }

    logger.info('Created challenge', { tenantId, challenge_id: data.id, title: data.title })

    return createdResponse({ data, success: true })
  } catch (error) {
    logger.error('Challenges POST error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
