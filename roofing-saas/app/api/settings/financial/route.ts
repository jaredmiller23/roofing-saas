import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { AuthenticationError, AuthorizationError, InternalError, ValidationError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { z } from 'zod'

/** Default financial configuration values */
const DEFAULTS = {
  forecast_blend_historical: 0.6,
  forecast_blend_pipeline: 0.4,
  cost_rate: 0.7,
  margin_excellent: 30,
  margin_good: 20,
  margin_fair: 10,
  margin_target: 25,
  seasonal_adjustments: {},
}

const financialConfigSchema = z.object({
  forecast_blend_historical: z.number().min(0).max(1).optional(),
  forecast_blend_pipeline: z.number().min(0).max(1).optional(),
  cost_rate: z.number().min(0).max(1).optional(),
  margin_excellent: z.number().min(0).max(100).optional(),
  margin_good: z.number().min(0).max(100).optional(),
  margin_fair: z.number().min(0).max(100).optional(),
  margin_target: z.number().min(0).max(100).optional(),
  seasonal_adjustments: z.record(z.string(), z.number()).optional(),
}).refine((data) => {
  // If both blend ratios are provided, they should sum to 1
  if (data.forecast_blend_historical !== undefined && data.forecast_blend_pipeline !== undefined) {
    const sum = data.forecast_blend_historical + data.forecast_blend_pipeline
    return Math.abs(sum - 1) < 0.01
  }
  return true
}, { message: 'Forecast blend ratios must sum to 1.0' })

/**
 * GET /api/settings/financial
 * Fetch financial configuration for the current tenant
 */
export async function GET() {
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

    const { data, error } = await supabase
      .from('financial_configs')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching financial config', { error })
      throw InternalError('Failed to fetch financial configuration')
    }

    const config = data
      ? {
          forecast_blend_historical: data.forecast_blend_historical,
          forecast_blend_pipeline: data.forecast_blend_pipeline,
          cost_rate: data.cost_rate,
          margin_excellent: data.margin_excellent,
          margin_good: data.margin_good,
          margin_fair: data.margin_fair,
          margin_target: data.margin_target,
          seasonal_adjustments: data.seasonal_adjustments,
          lastModified: data.updated_at,
          modifiedBy: data.updated_by,
        }
      : {
          ...DEFAULTS,
          lastModified: null,
          modifiedBy: null,
        }

    return successResponse(config)
  } catch (error) {
    logger.error('Error in GET /api/settings/financial', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * PATCH /api/settings/financial
 * Update financial configuration (upsert)
 */
export async function PATCH(request: NextRequest) {
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
    const validation = financialConfigSchema.safeParse(body)

    if (!validation.success) {
      throw ValidationError(validation.error.issues[0].message)
    }

    const updates = validation.data
    const supabase = await createClient()

    // Check if config exists
    const { data: existing } = await supabase
      .from('financial_configs')
      .select('id')
      .eq('tenant_id', tenantId)
      .single()

    const upsertData = {
      tenant_id: tenantId,
      forecast_blend_historical: updates.forecast_blend_historical ?? DEFAULTS.forecast_blend_historical,
      forecast_blend_pipeline: updates.forecast_blend_pipeline ?? DEFAULTS.forecast_blend_pipeline,
      cost_rate: updates.cost_rate ?? DEFAULTS.cost_rate,
      margin_excellent: updates.margin_excellent ?? DEFAULTS.margin_excellent,
      margin_good: updates.margin_good ?? DEFAULTS.margin_good,
      margin_fair: updates.margin_fair ?? DEFAULTS.margin_fair,
      margin_target: updates.margin_target ?? DEFAULTS.margin_target,
      seasonal_adjustments: updates.seasonal_adjustments ? JSON.parse(JSON.stringify(updates.seasonal_adjustments)) : null,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }

    let result
    if (existing) {
      const { data, error } = await supabase
        .from('financial_configs')
        .update(upsertData)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        logger.error('Error updating financial config', { error })
        throw InternalError('Failed to update financial configuration')
      }
      result = data
    } else {
      const { data, error } = await supabase
        .from('financial_configs')
        .insert({ ...upsertData, created_by: user.id })
        .select()
        .single()

      if (error) {
        logger.error('Error creating financial config', { error })
        throw InternalError('Failed to create financial configuration')
      }
      result = data
    }

    return successResponse({
      forecast_blend_historical: result.forecast_blend_historical,
      forecast_blend_pipeline: result.forecast_blend_pipeline,
      cost_rate: result.cost_rate,
      margin_excellent: result.margin_excellent,
      margin_good: result.margin_good,
      margin_fair: result.margin_fair,
      margin_target: result.margin_target,
      seasonal_adjustments: result.seasonal_adjustments,
      lastModified: result.updated_at,
      modifiedBy: result.updated_by,
    })
  } catch (error) {
    logger.error('Error in PATCH /api/settings/financial', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
