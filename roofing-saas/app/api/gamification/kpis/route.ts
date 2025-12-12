/**
 * KPIs API
 * CRUD operations for KPI definitions
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { kpiDefinitionSchema } from '@/lib/gamification/types'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  try {
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

    // Optional: filter by is_system
    const { searchParams } = new URL(request.url)
    const isSystem = searchParams.get('system')

    let query = supabase.from('kpi_definitions').select('*').eq('org_id', org_id)

    if (isSystem !== null) {
      query = query.eq('is_system', isSystem === 'true')
    }

    const { data, error } = await query.order('is_system', { ascending: false }).order('name', { ascending: true })

    if (error) {
      logger.error('Failed to fetch KPIs', { error, org_id })
      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    return NextResponse.json({ data, success: true })
  } catch (error) {
    logger.error('KPIs GET error', { error })
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
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
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 })
    }

    const org_id = user.user_metadata?.org_id

    if (!org_id) {
      return NextResponse.json({ error: 'Organization not found', success: false }, { status: 400 })
    }

    const body = await request.json()
    const validationResult = kpiDefinitionSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.format(), success: false },
        { status: 400 }
      )
    }

    const validated = validationResult.data

    const { data, error } = await supabase
      .from('kpi_definitions')
      .insert({
        ...validated,
        org_id,
        is_system: false, // Custom KPIs are never system KPIs
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create KPI', { error, org_id })

      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A KPI with this name already exists', success: false },
          { status: 409 }
        )
      }

      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    logger.info('Created KPI', { org_id, kpi_id: data.id, name: data.name })

    return NextResponse.json({ data, success: true }, { status: 201 })
  } catch (error) {
    logger.error('KPIs POST error', { error })
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}
