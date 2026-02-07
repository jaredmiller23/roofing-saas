/**
 * Storm Alert Dismissal API Route
 *
 * POST: Dismiss a storm alert (mark as dismissed)
 */

import { createClient } from '@/lib/supabase/server'
import { InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { withAuthParams } from '@/lib/auth/with-auth'

export const POST = withAuthParams(async (_request, { tenantId }, { params }) => {
  try {
    const supabase = await createClient()

    const { id } = await params

    // Update alert to dismissed (scoped to tenant)
    const { error: updateError } = await supabase
      .from('storm_alerts')
      .update({
        dismissed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (updateError) {
      console.error('Error dismissing alert:', updateError)
      throw InternalError('Failed to dismiss alert')
    }

    return successResponse(null)
  } catch (error) {
    console.error('Dismiss alert error:', error)
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
