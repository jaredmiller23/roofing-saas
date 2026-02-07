import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export const GET = withAuth(async (_request, { userId, tenantId }) => {
  try {
    const supabase = await createClient()

    // Get user's query history
    const { data: history, error } = await supabase
      .from('query_history')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Failed to fetch query history:', error)
      return errorResponse(InternalError('Failed to fetch query history'))
    }

    // Transform the data to match the expected format
    const transformedHistory = (history || []).map(item => ({
      id: item.id,
      query: item.query_text,
      interpretation: null,
      result: null,
      timestamp: item.created_at,
      executionTime: item.execution_time_ms,
      isFavorite: item.is_favorite,
      userId: item.user_id
    }))

    return successResponse(transformedHistory)

  } catch (error) {
    console.error('Query history fetch failed:', error)
    return errorResponse(InternalError('An unexpected error occurred'))
  }
})
