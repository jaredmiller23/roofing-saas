/**
 * Storm Alert Acknowledgment API Route
 *
 * POST: Acknowledge a storm alert (add current user to acknowledgedBy list)
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AuthenticationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

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
      throw AuthenticationError()
    }

    const { id } = await context.params

    // Fetch current alert
    const { data: alert, error: fetchError } = await supabase
      .from('storm_alerts')
      .select('acknowledged_by')
      .eq('id', id)
      .single()

    if (fetchError || !alert) {
      throw NotFoundError('Alert')
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
      throw InternalError('Failed to acknowledge alert')
    }

    return successResponse({ acknowledgedBy })
  } catch (error) {
    console.error('Acknowledge alert error:', error)
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
