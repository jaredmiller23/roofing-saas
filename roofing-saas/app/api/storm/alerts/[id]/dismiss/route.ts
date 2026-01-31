/**
 * Storm Alert Dismissal API Route
 *
 * POST: Dismiss a storm alert (mark as dismissed)
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AuthenticationError, AuthorizationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { getUserTenantId } from '@/lib/auth/session'

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

    // Get tenant for multi-tenant isolation
    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    const { id } = await context.params

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
}
