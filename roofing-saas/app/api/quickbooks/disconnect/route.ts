import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { getUserTenantId } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

/**
 * Disconnect QuickBooks integration
 * POST /api/quickbooks/disconnect
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's tenant
    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant found' },
        { status: 400 }
      )
    }

    // Deactivate connection (soft delete - keep for audit)
    const supabase = await createClient()
    const { error } = await supabase
      .from('quickbooks_connections')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Failed to disconnect QuickBooks:', error)
      return NextResponse.json(
        { error: 'Failed to disconnect' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    )
  }
}
