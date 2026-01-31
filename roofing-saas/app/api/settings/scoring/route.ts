import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { AuthenticationError, AuthorizationError, InternalError, ValidationError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { DEFAULT_SCORING_RULES } from '@/lib/scoring/scoring-rules'
import type { ScoringRules } from '@/lib/scoring/score-types'

const scoringConfigSchema = z.object({
  enabled: z.boolean().optional(),
  autoUpdate: z.boolean().optional(),
  rules: z.object({
    propertyValueRanges: z.array(z.object({
      min: z.number(),
      max: z.number().nullable(),
      score: z.number(),
      label: z.string(),
    })).optional(),
    roofAgeMultipliers: z.array(z.object({
      minAge: z.number(),
      maxAge: z.number().nullable(),
      multiplier: z.number(),
      label: z.string(),
    })).optional(),
    sourceWeights: z.array(z.object({
      source: z.string(),
      weight: z.number(),
      description: z.string(),
    })).optional(),
    categoryWeights: z.object({
      property: z.number(),
      financial: z.number(),
      timing: z.number(),
      engagement: z.number(),
      demographics: z.number(),
      referral: z.number(),
    }).optional(),
    scoreThresholds: z.object({
      hot: z.object({ min: z.number(), color: z.string(), description: z.string() }),
      warm: z.object({ min: z.number(), color: z.string(), description: z.string() }),
      cold: z.object({ min: z.number(), color: z.string(), description: z.string() }),
    }).optional(),
  }).optional(),
})

/**
 * GET /api/settings/scoring
 * Fetch lead scoring configuration for the current tenant
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
      .from('lead_scoring_configs')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine (use defaults)
      logger.error('Error fetching scoring config', { error })
      throw InternalError('Failed to fetch scoring configuration')
    }

    // Return existing config or defaults
    const config = data
      ? {
          enabled: data.enabled,
          autoUpdate: data.auto_update,
          rules: data.rules as unknown as ScoringRules,
          lastModified: data.updated_at,
          modifiedBy: data.updated_by,
        }
      : {
          enabled: true,
          autoUpdate: true,
          rules: DEFAULT_SCORING_RULES,
          lastModified: null,
          modifiedBy: null,
        }

    return successResponse(config)
  } catch (error) {
    logger.error('Error in GET /api/settings/scoring', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * PATCH /api/settings/scoring
 * Update lead scoring configuration (upsert)
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
    const validation = scoringConfigSchema.safeParse(body)

    if (!validation.success) {
      throw ValidationError(validation.error.issues[0].message)
    }

    const { enabled, autoUpdate, rules } = validation.data
    const supabase = await createClient()

    // Check if config exists
    const { data: existing } = await supabase
      .from('lead_scoring_configs')
      .select('id, rules')
      .eq('tenant_id', tenantId)
      .single()

    // Merge rules with existing or defaults
    const currentRules = (existing?.rules as unknown as ScoringRules) || DEFAULT_SCORING_RULES
    const mergedRules: ScoringRules = {
      propertyValueRanges: rules?.propertyValueRanges ?? currentRules.propertyValueRanges,
      roofAgeMultipliers: rules?.roofAgeMultipliers ?? currentRules.roofAgeMultipliers,
      sourceWeights: rules?.sourceWeights ?? currentRules.sourceWeights,
      categoryWeights: rules?.categoryWeights ?? currentRules.categoryWeights,
      scoreThresholds: rules?.scoreThresholds ?? currentRules.scoreThresholds,
    }

    const upsertData = {
      tenant_id: tenantId,
      enabled: enabled ?? true,
      auto_update: autoUpdate ?? true,
      rules: JSON.parse(JSON.stringify(mergedRules)),
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }

    let result
    if (existing) {
      const { data, error } = await supabase
        .from('lead_scoring_configs')
        .update(upsertData)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        logger.error('Error updating scoring config', { error })
        throw InternalError('Failed to update scoring configuration')
      }
      result = data
    } else {
      const { data, error } = await supabase
        .from('lead_scoring_configs')
        .insert({ ...upsertData, created_by: user.id })
        .select()
        .single()

      if (error) {
        logger.error('Error creating scoring config', { error })
        throw InternalError('Failed to create scoring configuration')
      }
      result = data
    }

    return successResponse({
      enabled: result.enabled,
      autoUpdate: result.auto_update,
      rules: result.rules as unknown as ScoringRules,
      lastModified: result.updated_at,
      modifiedBy: result.updated_by,
    })
  } catch (error) {
    logger.error('Error in PATCH /api/settings/scoring', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
