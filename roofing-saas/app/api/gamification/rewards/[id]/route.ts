/**
 * Reward by ID API
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rewardConfigSchema } from '@/lib/gamification/types'
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

    const body = await request.json()
    const validationResult = rewardConfigSchema.partial().safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.format(), success: false },
        { status: 400 }
      )
    }

    const validated = validationResult.data

    const { data, error } = await supabase
      .from('reward_configs')
      .update({ ...validated, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', org_id)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update reward', { error, org_id, reward_id: id })

      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Reward not found', success: false }, { status: 404 })
      }

      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    logger.info('Updated reward', { org_id, reward_id: data.id })

    return NextResponse.json({ data, success: true })
  } catch (error) {
    logger.error('Reward PATCH error', { error })
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

    const { error } = await supabase.from('reward_configs').delete().eq('id', id).eq('org_id', org_id)

    if (error) {
      logger.error('Failed to delete reward', { error, org_id, reward_id: id })
      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    logger.info('Deleted reward', { org_id, reward_id: id })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    logger.error('Reward DELETE error', { error })
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}
