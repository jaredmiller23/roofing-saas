/**
 * Point Rules API
 * CRUD operations for custom point-earning rules
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pointRuleConfigSchema } from '@/lib/gamification/types'
import { logger } from '@/lib/logger'

/**
 * GET /api/gamification/point-rules
 * Fetch all point rules for the organization
 */
export async function GET() {
  try {
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

    // Fetch point rules
    const { data, error } = await supabase
      .from('point_rule_configs')
      .select('*')
      .eq('org_id', org_id)
      .order('category', { ascending: true })
      .order('action_name', { ascending: true })

    if (error) {
      logger.error('Failed to fetch point rules', { error, org_id })
      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    logger.info('Fetched point rules', { org_id, count: data?.length || 0 })

    return NextResponse.json({ data, success: true })
  } catch (error) {
    logger.error('Point rules GET error', { error })
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}

/**
 * POST /api/gamification/point-rules
 * Create a new point rule
 */
export async function POST(request: Request) {
  try {
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
    const validationResult = pointRuleConfigSchema.safeParse(body)

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

    // Insert point rule
    const { data, error } = await supabase
      .from('point_rule_configs')
      .insert({
        ...validated,
        org_id,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create point rule', { error, org_id, action_type: validated.action_type })

      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A point rule with this action type already exists', success: false },
          { status: 409 }
        )
      }

      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    logger.info('Created point rule', {
      org_id,
      rule_id: data.id,
      action_type: data.action_type,
      points: data.points_value,
    })

    return NextResponse.json({ data, success: true }, { status: 201 })
  } catch (error) {
    logger.error('Point rules POST error', { error })
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}
