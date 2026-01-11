/**
 * KPI by ID API
 */

import { createClient } from '@/lib/supabase/server'
import { getUserTenantId } from '@/lib/auth/session'
import { kpiDefinitionSchema } from '@/lib/gamification/types'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
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

    const tenant_id = await getUserTenantId(user.id)

    if (!tenant_id) {
      throw ValidationError('Organization not found')
    }

    // Check if KPI is a system KPI (cannot be fully modified)
    const { data: existing } = await supabase
      .from('kpi_snapshots')
      .select('is_system')
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .single()

    if (existing?.is_system) {
      // System KPIs can only have is_active and target_value modified
      const body = await request.json()
      const allowedFields = ['is_active', 'target_value']
      const updates: Record<string, unknown> = {}

      for (const field of allowedFields) {
        if (field in body) {
          updates[field] = body[field]
        }
      }

      if (Object.keys(updates).length === 0) {
        throw ValidationError('System KPIs can only have is_active and target_value modified')
      }

      const { data, error } = await supabase
        .from('kpi_snapshots')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenant_id)
        .select()
        .single()

      if (error) {
        logger.error('Failed to update system KPI', { error, tenant_id, kpi_id: id })
        throw InternalError(error.message)
      }

      return successResponse({ data, success: true })
    }

    // Custom KPIs can be fully modified
    const body = await request.json()
    const validationResult = kpiDefinitionSchema.partial().safeParse(body)

    if (!validationResult.success) {
      throw ValidationError('Validation failed')
    }

    const validated = validationResult.data

    const { data, error } = await supabase
      .from('kpi_snapshots')
      .update({ ...validated, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update KPI', { error, tenant_id, kpi_id: id })

      if (error.code === 'PGRST116') {
        throw NotFoundError('KPI not found')
      }

      throw InternalError(error.message)
    }

    logger.info('Updated KPI', { tenant_id, kpi_id: data.id })

    return successResponse({ data, success: true })
  } catch (error) {
    logger.error('KPI PATCH error', { error })
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

    const tenant_id = await getUserTenantId(user.id)

    if (!tenant_id) {
      throw ValidationError('Organization not found')
    }

    // Cannot delete system KPIs
    const { data: existing } = await supabase
      .from('kpi_snapshots')
      .select('is_system')
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .single()

    if (existing?.is_system) {
      throw AuthorizationError('System KPIs cannot be deleted')
    }

    const { error } = await supabase.from('kpi_snapshots').delete().eq('id', id).eq('tenant_id', tenant_id)

    if (error) {
      logger.error('Failed to delete KPI', { error, tenant_id, kpi_id: id })
      throw InternalError(error.message)
    }

    logger.info('Deleted KPI', { tenant_id, kpi_id: id })

    return successResponse({ success: true })
  } catch (error) {
    logger.error('KPI DELETE error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
