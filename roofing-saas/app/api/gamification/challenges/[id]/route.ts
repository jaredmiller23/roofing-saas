/**
 * Challenge by ID API
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { challengeConfigSchema } from '@/lib/gamification/types'
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
    const validationResult = challengeConfigSchema.partial().safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.format(), success: false },
        { status: 400 }
      )
    }

    const validated = validationResult.data

    const { data, error } = await supabase
      .from('challenge_configs')
      .update({ ...validated, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', org_id)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update challenge', { error, org_id, challenge_id: id })

      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Challenge not found', success: false }, { status: 404 })
      }

      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    logger.info('Updated challenge', { org_id, challenge_id: data.id })

    return NextResponse.json({ data, success: true })
  } catch (error) {
    logger.error('Challenge PATCH error', { error })
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

    const { error } = await supabase
      .from('challenge_configs')
      .delete()
      .eq('id', id)
      .eq('org_id', org_id)

    if (error) {
      logger.error('Failed to delete challenge', { error, org_id, challenge_id: id })
      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    logger.info('Deleted challenge', { org_id, challenge_id: id })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    logger.error('Challenge DELETE error', { error })
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}
