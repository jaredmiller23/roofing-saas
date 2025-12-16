/**
 * Storm Alert Dismissal API Route
 *
 * POST: Dismiss a storm alert (mark as dismissed)
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

    // Update alert to dismissed
    const { error: updateError } = await supabase
      .from('storm_alerts')
      .update({
        dismissed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error dismissing alert:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to dismiss alert' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Alert dismissed successfully',
    })
  } catch (error) {
    console.error('Dismiss alert error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
