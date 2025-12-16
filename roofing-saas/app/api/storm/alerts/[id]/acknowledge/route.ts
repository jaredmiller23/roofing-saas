/**
 * Storm Alert Acknowledgment API Route
 *
 * POST: Acknowledge a storm alert (add current user to acknowledgedBy list)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
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

    const { id } = await context.params

    // Fetch current alert
    const { data: alert, error: fetchError } = await supabase
      .from('storm_alerts')
      .select('acknowledged_by')
      .eq('id', id)
      .single()

    if (fetchError || !alert) {
      return NextResponse.json(
        { success: false, error: 'Alert not found' },
        { status: 404 }
      )
    }

    // Add user to acknowledgedBy array if not already present
    const acknowledgedBy = alert.acknowledged_by || []
    if (!acknowledgedBy.includes(user.id)) {
      acknowledgedBy.push(user.id)
    }

    // Update alert
    const { error: updateError } = await supabase
      .from('storm_alerts')
      .update({
        acknowledged_by: acknowledgedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error acknowledging alert:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to acknowledge alert' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Alert acknowledged successfully',
      acknowledgedBy,
    })
  } catch (error) {
    console.error('Acknowledge alert error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
