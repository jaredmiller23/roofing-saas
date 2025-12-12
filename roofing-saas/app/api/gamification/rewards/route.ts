/**
 * Rewards API
 * CRUD operations for reward catalog
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rewardConfigSchema } from '@/lib/gamification/types'
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
      .from('reward_configs')
      .select('*')
      .eq('org_id', org_id)
      .order('points_required', { ascending: true })

    if (error) {
      logger.error('Failed to fetch rewards', { error, org_id })
      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    return NextResponse.json({ data, success: true })
  } catch (error) {
    logger.error('Rewards GET error', { error })
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
    const validationResult = rewardConfigSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.format(), success: false },
        { status: 400 }
      )
    }

    const validated = validationResult.data

    const { data, error } = await supabase
      .from('reward_configs')
      .insert({ ...validated, org_id, created_by: user.id })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create reward', { error, org_id })

      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A reward with this name already exists', success: false },
          { status: 409 }
        )
      }

      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    logger.info('Created reward', { org_id, reward_id: data.id, name: data.name })

    return NextResponse.json({ data, success: true }, { status: 201 })
  } catch (error) {
    logger.error('Rewards POST error', { error })
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}
