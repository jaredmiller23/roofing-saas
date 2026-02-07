import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export const DELETE = withAuthParams(async (_request, { userId, tenantId }, { params }) => {
  try {
    const { id: queryId } = await params

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
})
