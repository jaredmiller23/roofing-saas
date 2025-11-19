// =============================================
// Change Password API Route
// =============================================
// Route: POST /api/profile/change-password
// Purpose: Change user's password
// Author: Claude Code
// Date: 2025-11-18
// =============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import type { ChangePasswordInput } from '@/lib/types/user-profile'
import { validatePasswordRequirements } from '@/lib/types/user-profile'

/**
 * POST /api/profile/change-password
 * Change user's password
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ChangePasswordInput = await request.json()

    // Validate request body
    if (!body.current_password || !body.new_password || !body.confirm_password) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate new password matches confirmation
    if (body.new_password !== body.confirm_password) {
      return NextResponse.json(
        { success: false, error: 'New password and confirmation do not match' },
        { status: 400 }
      )
    }

    // Validate new password != current password
    if (body.new_password === body.current_password) {
      return NextResponse.json(
        { success: false, error: 'New password must be different from current password' },
        { status: 400 }
      )
    }

    // Validate password requirements
    const passwordValidation = validatePasswordRequirements(body.new_password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password does not meet requirements',
          validation_errors: passwordValidation.errors,
        },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify current password by attempting to sign in
    // (Supabase doesn't have a direct way to verify current password for logged-in users)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: body.current_password,
    })

    if (signInError) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: body.new_password,
    })

    if (updateError) {
      console.error('Supabase update password error:', updateError)
      return NextResponse.json(
        { success: false, error: updateError.message || 'Failed to change password' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    })
  } catch (error) {
    console.error('Error changing password:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to change password' },
      { status: 500 }
    )
  }
}
