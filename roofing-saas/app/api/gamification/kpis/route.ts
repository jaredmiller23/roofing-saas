/**
 * KPIs API
 * CRUD operations for KPI definitions
 */

import { createClient } from '@/lib/supabase/server'
import { getUserTenantId } from '@/lib/auth/session'
import { kpiDefinitionSchema } from '@/lib/gamification/types'
import { logger } from '@/lib/logger'
import { AuthenticationError, ValidationError, ConflictError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse, createdResponse } from '@/lib/api/response'

export async function GET(request: Request) {
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

    // Optional: filter by is_system
    const { searchParams } = new URL(request.url)
    const isSystem = searchParams.get('system')

    let query = supabase.from('kpi_snapshots').select('*').eq('tenant_id', tenantId)

    if (isSystem !== null) {
      query = query.eq('is_system', isSystem === 'true')
    }

    const { data, error } = await query.order('is_system', { ascending: false }).order('name', { ascending: true })

    if (error) {
      logger.error('Failed to fetch KPIs', { error, tenantId })
      throw InternalError(error.message)
    }

    return successResponse({ data, success: true })
  } catch (error) {
    logger.error('KPIs GET error', { error })
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
    const validationResult = kpiDefinitionSchema.safeParse(body)

    if (!validationResult.success) {
      throw ValidationError('Validation failed')
    }

    const validated = validationResult.data

    const { data, error } = await supabase
      .from('kpi_snapshots')
      .insert({
        ...validated,
        tenant_id: tenantId,
        is_system: false, // Custom KPIs are never system KPIs
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create KPI', { error, tenantId })

      if (error.code === '23505') {
        throw ConflictError('A KPI with this name already exists')
      }

      throw InternalError(error.message)
    }

    logger.info('Created KPI', { tenantId, kpi_id: data.id, name: data.name })

    return createdResponse({ data, success: true })
  } catch (error) {
    logger.error('KPIs POST error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
