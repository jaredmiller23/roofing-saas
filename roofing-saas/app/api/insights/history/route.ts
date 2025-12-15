import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant')
    const userId = searchParams.get('userId')

    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: 'Missing tenant or userId parameter' },
        { status: 400 }
      )
    }

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
      return NextResponse.json(
        { error: 'Failed to fetch query history' },
        { status: 500 }
      )
    }

    // Transform the data to match the expected format
    const transformedHistory = (history || []).map(item => ({
      id: item.id,
      query: item.query,
      interpretation: item.interpretation,
      result: item.result,
      timestamp: item.created_at,
      executionTime: item.execution_time,
      isFavorite: item.is_favorite,
      userId: item.user_id
    }))

    return NextResponse.json({
      history: transformedHistory
    })

  } catch (error) {
    console.error('Query history fetch failed:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}