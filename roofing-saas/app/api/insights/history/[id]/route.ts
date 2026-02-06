import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { AuthorizationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const queryId = resolvedParams.id

    // Server-side authentication
    const user = await getCurrentUser()
    if (!user) {
      return errorResponse(AuthorizationError('Authentication required'))
    }

    const userId = user.id
    const tenantId = await getUserTenantId(userId)
    if (!tenantId) {
      return errorResponse(AuthorizationError('No tenant access'))
    }

    const supabase = await createClient()

    // Delete the query history item
    const { error } = await supabase
      .from('query_history')
      .delete()
      .eq('id', queryId)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Failed to delete query history:', error)
      return errorResponse(InternalError('Failed to delete query history'))
    }

    return successResponse(null)

  } catch (error) {
    console.error('Query history deletion failed:', error)
    return errorResponse(InternalError('An unexpected error occurred'))
  }
}