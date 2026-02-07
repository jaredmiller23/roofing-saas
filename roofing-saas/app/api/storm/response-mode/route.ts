/**
 * Storm Response Mode API Route
 *
 * POST: Activate storm response mode
 * DELETE: Deactivate storm response mode
 * GET: Get current response mode configuration
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { requireFeature } from '@/lib/billing/feature-gates'
import type { StormResponseConfig, ResponseMode } from '@/lib/storm/storm-types'
import { InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export const GET = withAuth(async (_request: NextRequest, { userId, tenantId }) => {
  try {
    const supabase = await createClient()

    await requireFeature(tenantId, 'stormData')

    // Fetch current response mode configuration
    const { data: config, error: fetchError } = await supabase
      .from('storm_response_mode')
      .select('*')
      .eq('tenant_id', userId)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching response mode:', fetchError)
      throw InternalError('Failed to fetch response mode')
    }

    // If no config exists, return default normal mode
    if (!config) {
      const defaultConfig: StormResponseConfig = {
        mode: 'normal',
        activatedAt: null,
        activatedBy: null,
        stormEventId: null,
        settings: {
          autoNotifications: false,
          autoLeadGeneration: false,
          priorityRouting: false,
          crewPrePositioning: false,
          extendedHours: false,
        },
        metrics: {
          leadsGenerated: 0,
          customersNotified: 0,
          appointmentsScheduled: 0,
          estimatedRevenue: 0,
        },
      }
      return successResponse(defaultConfig)
    }

    // Transform database record to StormResponseConfig type
    const responseConfig: StormResponseConfig = {
      mode: config.mode as ResponseMode,
      activatedAt: config.activated_at,
      activatedBy: config.activated_by,
      stormEventId: config.storm_event_id,
      settings: config.settings as StormResponseConfig['settings'],
      metrics: config.metrics as StormResponseConfig['metrics'],
    }

    return successResponse(responseConfig)
  } catch (error) {
    console.error('Get response mode error:', error)
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

export const POST = withAuth(async (request: NextRequest, { userId, tenantId }) => {
  try {
    const supabase = await createClient()

    await requireFeature(tenantId, 'stormData')

    // Parse request body
    const body = await request.json()
    const { mode, stormEventId, settings } = body as {
      mode?: 'storm_watch' | 'storm_response' | 'emergency'
      stormEventId?: string | null
      settings?: Partial<StormResponseConfig['settings']>
    }

    // Default to storm_response if not specified
    const responseMode = mode || 'storm_response'

    // Check if config already exists
    const { data: existingConfig } = await supabase
      .from('storm_response_mode')
      .select('id')
      .eq('tenant_id', userId)
      .maybeSingle()

    const configData = {
      tenant_id: userId,
      mode: responseMode,
      activated_at: new Date().toISOString(),
      activated_by: userId,
      storm_event_id: stormEventId || null,
      settings: settings || {
        autoNotifications: false,
        autoLeadGeneration: false,
        priorityRouting: false,
        crewPrePositioning: false,
        extendedHours: false,
      },
      updated_at: new Date().toISOString(),
    }

    let result
    if (existingConfig) {
      // Update existing config
      result = await supabase
        .from('storm_response_mode')
        .update(configData)
        .eq('tenant_id', userId)
        .select()
        .single()
    } else {
      // Create new config
      result = await supabase
        .from('storm_response_mode')
        .insert({
          ...configData,
          metrics: {
            leadsGenerated: 0,
            customersNotified: 0,
            appointmentsScheduled: 0,
            estimatedRevenue: 0,
          },
        })
        .select()
        .single()
    }

    if (result.error) {
      console.error('Error activating response mode:', result.error)
      throw InternalError('Failed to activate response mode')
    }

    // Transform to response type
    const responseConfig: StormResponseConfig = {
      mode: result.data.mode as ResponseMode,
      activatedAt: result.data.activated_at,
      activatedBy: result.data.activated_by,
      stormEventId: result.data.storm_event_id,
      settings: result.data.settings as StormResponseConfig['settings'],
      metrics: result.data.metrics as StormResponseConfig['metrics'],
    }

    return successResponse(responseConfig)
  } catch (error) {
    console.error('Activate response mode error:', error)
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

export const DELETE = withAuth(async (_request: NextRequest, { userId, tenantId }) => {
  try {
    const supabase = await createClient()

    await requireFeature(tenantId, 'stormData')

    // Reset to normal mode
    const { error: updateError } = await supabase
      .from('storm_response_mode')
      .update({
        mode: 'normal',
        activated_at: null,
        activated_by: null,
        storm_event_id: null,
        settings: {
          autoNotifications: false,
          autoLeadGeneration: false,
          priorityRouting: false,
          crewPrePositioning: false,
          extendedHours: false,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', userId)

    if (updateError) {
      console.error('Error deactivating response mode:', updateError)
      throw InternalError('Failed to deactivate response mode')
    }

    return successResponse(null)
  } catch (error) {
    console.error('Deactivate response mode error:', error)
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
