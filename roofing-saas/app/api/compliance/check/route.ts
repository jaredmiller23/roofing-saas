import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canMakeCall } from '@/lib/compliance/call-compliance'
import { logger } from '@/lib/logger'

/**
 * GET /api/compliance/check
 *
 * Check if a call can be made to a phone number
 * Performs comprehensive TCPA/TSR compliance validation
 *
 * Query params:
 * - phone: Phone number to check (required)
 * - contactId: Contact ID (optional)
 *
 * Returns:
 * {
 *   success: boolean
 *   data: {
 *     canCall: boolean
 *     reason?: string
 *     warning?: string
 *     checks: { ... }
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get tenant ID from user metadata
    const tenantId = user.user_metadata?.org_id
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No organization found' },
        { status: 400 }
      )
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const phoneNumber = searchParams.get('phone')
    const contactId = searchParams.get('contactId')

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Perform compliance check
    const result = await canMakeCall({
      phoneNumber,
      contactId: contactId || undefined,
      tenantId,
      userId: user.id,
    })

    logger.info('Compliance check completed', {
      phoneNumber,
      contactId,
      tenantId,
      canCall: result.canCall,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    logger.error('Error in compliance check API', { error })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
