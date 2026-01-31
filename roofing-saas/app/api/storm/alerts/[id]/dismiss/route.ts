/**
 * Storm Alert Dismissal API Route
 *
 * POST: Dismiss a storm alert (mark as dismissed)
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AuthenticationError, InternalError } from '@/lib/api/errors'
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
      throw InternalError('Failed to dismiss alert')
    }

    return successResponse(null)
  } catch (error) {
    console.error('Dismiss alert error:', error)
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
