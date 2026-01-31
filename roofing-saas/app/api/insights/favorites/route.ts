import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { queryId, userId, tenantId } = body

    if (!queryId || !userId || !tenantId) {
      return errorResponse(ValidationError('Missing required fields'))
    }

    const supabase = await createClient()

    // Toggle favorite status
    const { data: currentQuery, error: fetchError } = await supabase
      .from('query_history')
      .select('is_favorite')
      .eq('id', queryId)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !currentQuery) {
      return errorResponse(NotFoundError('Query not found'))
    }

    // Update favorite status
    const { error: updateError } = await supabase
      .from('query_history')
      .update({ is_favorite: !currentQuery.is_favorite })
      .eq('id', queryId)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)

    if (updateError) {
      console.error('Failed to update favorite status:', updateError)
      return errorResponse(InternalError('Failed to update favorite status'))
    }

    return successResponse({
      isFavorite: !currentQuery.is_favorite
    })

  } catch (error) {
    console.error('Favorite toggle failed:', error)
    return errorResponse(InternalError('An unexpected error occurred'))
  }
}