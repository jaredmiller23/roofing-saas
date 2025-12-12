/**
 * KPI by ID API
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { kpiDefinitionSchema } from '@/lib/gamification/types'
import { logger } from '@/lib/logger'

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
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 })
    }

    const org_id = user.user_metadata?.org_id

    if (!org_id) {
      return NextResponse.json({ error: 'Organization not found', success: false }, { status: 400 })
    }

    // Check if KPI is a system KPI (cannot be fully modified)
    const { data: existing } = await supabase
      .from('kpi_definitions')
      .select('is_system')
      .eq('id', id)
      .eq('org_id', org_id)
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
        return NextResponse.json(
          { error: 'System KPIs can only have is_active and target_value modified', success: false },
          { status: 400 }
        )
      }

      const { data, error } = await supabase
        .from('kpi_definitions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('org_id', org_id)
        .select()
        .single()

      if (error) {
        logger.error('Failed to update system KPI', { error, org_id, kpi_id: id })
        return NextResponse.json({ error: error.message, success: false }, { status: 500 })
      }

      return NextResponse.json({ data, success: true })
    }

    // Custom KPIs can be fully modified
    const body = await request.json()
    const validationResult = kpiDefinitionSchema.partial().safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.format(), success: false },
        { status: 400 }
      )
    }

    const validated = validationResult.data

    const { data, error } = await supabase
      .from('kpi_definitions')
      .update({ ...validated, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', org_id)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update KPI', { error, org_id, kpi_id: id })

      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'KPI not found', success: false }, { status: 404 })
      }

      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    logger.info('Updated KPI', { org_id, kpi_id: data.id })

    return NextResponse.json({ data, success: true })
  } catch (error) {
    logger.error('KPI PATCH error', { error })
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
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
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 })
    }

    const org_id = user.user_metadata?.org_id

    if (!org_id) {
      return NextResponse.json({ error: 'Organization not found', success: false }, { status: 400 })
    }

    // Cannot delete system KPIs
    const { data: existing } = await supabase
      .from('kpi_definitions')
      .select('is_system')
      .eq('id', id)
      .eq('org_id', org_id)
      .single()

    if (existing?.is_system) {
      return NextResponse.json(
        { error: 'System KPIs cannot be deleted', success: false },
        { status: 403 }
      )
    }

    const { error } = await supabase.from('kpi_definitions').delete().eq('id', id).eq('org_id', org_id)

    if (error) {
      logger.error('Failed to delete KPI', { error, org_id, kpi_id: id })
      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    logger.info('Deleted KPI', { org_id, kpi_id: id })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    logger.error('KPI DELETE error', { error })
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}
