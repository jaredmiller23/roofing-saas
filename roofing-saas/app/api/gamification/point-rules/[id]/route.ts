/**
 * Point Rule by ID API
 * Update and delete operations for specific point rule
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pointRuleConfigSchema } from '@/lib/gamification/types'
import { logger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * PATCH /api/gamification/point-rules/[id]
 * Update a point rule
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get authenticated user
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

    // Parse and validate request body
    const body = await request.json()
    const validationResult = pointRuleConfigSchema.partial().safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.format(),
          success: false,
        },
        { status: 400 }
      )
    }

    const validated = validationResult.data

    // Update point rule (RLS ensures org_id isolation)
    const { data, error } = await supabase
      .from('point_rule_configs')
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', org_id)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update point rule', { error, org_id, rule_id: id })

      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Point rule not found', success: false },
          { status: 404 }
        )
      }

      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    logger.info('Updated point rule', {
      org_id,
      rule_id: data.id,
      action_type: data.action_type,
    })

    return NextResponse.json({ data, success: true })
  } catch (error) {
    logger.error('Point rule PATCH error', { error })
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/gamification/point-rules/[id]
 * Delete a point rule
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get authenticated user
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

    // Delete point rule (RLS ensures org_id isolation)
    const { error } = await supabase
      .from('point_rule_configs')
      .delete()
      .eq('id', id)
      .eq('org_id', org_id)

    if (error) {
      logger.error('Failed to delete point rule', { error, org_id, rule_id: id })
      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    logger.info('Deleted point rule', { org_id, rule_id: id })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    logger.error('Point rule DELETE error', { error })
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}
