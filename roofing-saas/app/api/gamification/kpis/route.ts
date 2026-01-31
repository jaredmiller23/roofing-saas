import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { AuthenticationError, AuthorizationError, InternalError, ValidationError } from '@/lib/api/errors'
import { successResponse, createdResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { kpiDefinitionSchema } from '@/lib/gamification/types'

/**
 * GET /api/gamification/kpis
 * List KPI definitions for the current tenant
 *
 * Query params:
 *   active - filter to active KPIs only (default: all)
 *   frequency - filter by frequency (daily, weekly, monthly)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'
    const frequency = searchParams.get('frequency')

    let query = supabase
      .from('kpi_definitions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    if (frequency && ['daily', 'weekly', 'monthly'].includes(frequency)) {
      query = query.eq('frequency', frequency)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching KPI definitions', { error })
      throw InternalError('Failed to fetch KPIs')
    }

    return successResponse(data || [])
  } catch (error) {
    logger.error('Error in GET /api/gamification/kpis', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * POST /api/gamification/kpis
 * Create a new KPI definition
 */
export async function POST(request: NextRequest) {
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
    const validation = kpiDefinitionSchema.safeParse(body)

    if (!validation.success) {
      throw ValidationError(validation.error.issues[0].message)
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('kpi_definitions')
      .insert({
        tenant_id: tenantId,
        name: validation.data.name,
        description: validation.data.description || null,
        calculation_type: validation.data.calculation_type,
        calculation_config: JSON.parse(JSON.stringify(validation.data.calculation_config)),
        format_type: validation.data.format_type,
        target_value: validation.data.target_value || null,
        frequency: validation.data.frequency,
        is_active: validation.data.is_active,
        is_system: false,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating KPI definition', { error })
      throw InternalError('Failed to create KPI')
    }

    return createdResponse(data)
  } catch (error) {
    logger.error('Error in POST /api/gamification/kpis', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
