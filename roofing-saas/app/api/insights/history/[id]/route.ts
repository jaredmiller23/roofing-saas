import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { userId, tenantId } = body
    const resolvedParams = await params
    const queryId = resolvedParams.id

    if (!userId || !tenantId || !queryId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: 'Failed to delete query history' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('Query history deletion failed:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}