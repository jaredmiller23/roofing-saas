/**
 * Storm Response Mode API Route
 *
 * POST: Activate storm response mode
 * DELETE: Deactivate storm response mode
 * GET: Get current response mode configuration
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { StormResponseConfig } from '@/lib/storm/storm-types'

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch current response mode configuration
    const { data: config, error: fetchError } = await supabase
      .from('storm_response_mode')
      .select('*')
      .eq('tenant_id', user.id)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching response mode:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch response mode' },
        { status: 500 }
      )
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
      return NextResponse.json({
        success: true,
        config: defaultConfig,
      })
    }

    // Transform database record to StormResponseConfig type
    const responseConfig: StormResponseConfig = {
      mode: config.mode,
      activatedAt: config.activated_at,
      activatedBy: config.activated_by,
      stormEventId: config.storm_event_id,
      settings: config.settings,
      metrics: config.metrics,
    }

    return NextResponse.json({
      success: true,
      config: responseConfig,
    })
  } catch (error) {
    console.error('Get response mode error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

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
      .eq('tenant_id', user.id)
      .maybeSingle()

    const configData = {
      tenant_id: user.id,
      mode: responseMode,
      activated_at: new Date().toISOString(),
      activated_by: user.id,
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
        .eq('tenant_id', user.id)
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
      return NextResponse.json(
        { success: false, error: 'Failed to activate response mode' },
        { status: 500 }
      )
    }

    // Transform to response type
    const responseConfig: StormResponseConfig = {
      mode: result.data.mode,
      activatedAt: result.data.activated_at,
      activatedBy: result.data.activated_by,
      stormEventId: result.data.storm_event_id,
      settings: result.data.settings,
      metrics: result.data.metrics,
    }

    return NextResponse.json({
      success: true,
      message: 'Storm response mode activated',
      config: responseConfig,
    })
  } catch (error) {
    console.error('Activate response mode error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

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
      .eq('tenant_id', user.id)

    if (updateError) {
      console.error('Error deactivating response mode:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to deactivate response mode' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Storm response mode deactivated',
    })
  } catch (error) {
    console.error('Deactivate response mode error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
