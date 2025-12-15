import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { queryId, userId, tenantId } = body

    if (!queryId || !userId || !tenantId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: 'Query not found' },
        { status: 404 }
      )
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
      return NextResponse.json(
        { error: 'Failed to update favorite status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      isFavorite: !currentQuery.is_favorite
    })

  } catch (error) {
    console.error('Favorite toggle failed:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}