/**
 * Storm Alert Acknowledgment API Route
 *
 * POST: Acknowledge a storm alert (add current user to acknowledgedBy list)
 */

import { createClient } from '@/lib/supabase/server'
import { NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { withAuthParams } from '@/lib/auth/with-auth'

export const POST = withAuthParams(async (_request, { userId, tenantId }, { params }) => {
  try {
    const supabase = await createClient()

    const { id } = await params

    // Fetch current alert (scoped to tenant)
    const { data: alert, error: fetchError } = await supabase
      .from('storm_alerts')
      .select('acknowledged_by')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !alert) {
      throw NotFoundError('Alert')
    }

    // Add user to acknowledgedBy array if not already present
    const acknowledgedBy = alert.acknowledged_by || []
    if (!acknowledgedBy.includes(userId)) {
      acknowledgedBy.push(userId)
    }

    // Update alert (scoped to tenant)
    const { error: updateError } = await supabase
      .from('storm_alerts')
      .update({
        acknowledged_by: acknowledgedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (updateError) {
      console.error('Error acknowledging alert:', updateError)
      throw InternalError('Failed to acknowledge alert')
    }

    return successResponse({ acknowledgedBy })
  } catch (error) {
    console.error('Acknowledge alert error:', error)
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
