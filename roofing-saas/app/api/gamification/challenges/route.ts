/**
 * Challenges API
 * CRUD operations for time-limited competitions
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { challengeConfigSchema } from '@/lib/gamification/types'
import { logger } from '@/lib/logger'

export async function GET() {
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

    const { data, error } = await supabase
      .from('challenge_configs')
      .select('*')
      .eq('org_id', org_id)
      .order('start_date', { ascending: false })

    if (error) {
      logger.error('Failed to fetch challenges', { error, org_id })
      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    return NextResponse.json({ data, success: true })
  } catch (error) {
    logger.error('Challenges GET error', { error })
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
    const validationResult = challengeConfigSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.format(), success: false },
        { status: 400 }
      )
    }

    const validated = validationResult.data

    const { data, error } = await supabase
      .from('challenge_configs')
      .insert({ ...validated, org_id, created_by: user.id })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create challenge', { error, org_id })
      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    logger.info('Created challenge', { org_id, challenge_id: data.id, title: data.title })

    return NextResponse.json({ data, success: true }, { status: 201 })
  } catch (error) {
    logger.error('Challenges POST error', { error })
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}
