import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { AuthenticationError, AuthorizationError, NotFoundError, InternalError, ValidationError } from '@/lib/api/errors'
import { successResponse, noContentResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { kpiDefinitionSchema } from '@/lib/gamification/types'

/**
 * GET /api/gamification/kpis/[id]
 * Get a single KPI definition by ID
 */
export async function GET(
  _request: NextRequest,
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

    const { data, error } = await supabase
      .from('kpi_definitions')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        throw NotFoundError('KPI')
      }
      logger.error('Error fetching KPI definition', { error })
      throw InternalError('Failed to fetch KPI')
    }

    return successResponse(data)
  } catch (error) {
    logger.error('Error in GET /api/gamification/kpis/[id]', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * PATCH /api/gamification/kpis/[id]
 * Update a KPI definition
 */
export async function PATCH(
  request: NextRequest,
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
    const validation = kpiDefinitionSchema.partial().safeParse(body)

    if (!validation.success) {
      throw ValidationError(validation.error.issues[0].message)
    }

    const supabase = await createClient()

    // Verify the KPI exists and belongs to tenant
    const { data: existing, error: fetchError } = await supabase
      .from('kpi_definitions')
      .select('id, is_system')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !existing) {
      throw NotFoundError('KPI')
    }

    const updates = validation.data
    // Serialize calculation_config for JSONB compatibility
    const updatePayload = {
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.calculation_type !== undefined && { calculation_type: updates.calculation_type }),
      ...(updates.calculation_config !== undefined && {
        calculation_config: JSON.parse(JSON.stringify(updates.calculation_config)),
      }),
      ...(updates.format_type !== undefined && { format_type: updates.format_type }),
      ...(updates.target_value !== undefined && { target_value: updates.target_value }),
      ...(updates.frequency !== undefined && { frequency: updates.frequency }),
      ...(updates.is_active !== undefined && { is_active: updates.is_active }),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('kpi_definitions')
      .update(updatePayload)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      logger.error('Error updating KPI definition', { error })
      throw InternalError('Failed to update KPI')
    }

    return successResponse(data)
  } catch (error) {
    logger.error('Error in PATCH /api/gamification/kpis/[id]', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * DELETE /api/gamification/kpis/[id]
 * Delete a KPI definition
 */
export async function DELETE(
  _request: NextRequest,
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

    // Verify it exists and isn't a system KPI
    const { data: existing, error: fetchError } = await supabase
      .from('kpi_definitions')
      .select('id, is_system')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !existing) {
      throw NotFoundError('KPI')
    }

    if ((existing as unknown as { is_system: boolean }).is_system) {
      throw ValidationError('System KPIs cannot be deleted')
    }

    const { error } = await supabase
      .from('kpi_definitions')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      logger.error('Error deleting KPI definition', { error })
      throw InternalError('Failed to delete KPI')
    }

    return noContentResponse()
  } catch (error) {
    logger.error('Error in DELETE /api/gamification/kpis/[id]', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
