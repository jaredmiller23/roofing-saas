// =============================================
// Change Password API Route
// =============================================
// Route: POST /api/profile/change-password
// Purpose: Change user's password
// Author: Claude Code
// Date: 2025-11-18
// =============================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { AuthenticationError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import type { ChangePasswordInput } from '@/lib/types/user-profile'
import { validatePasswordRequirements } from '@/lib/types/user-profile'

/**
 * POST /api/profile/change-password
 * Change user's password
 */
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body: ChangePasswordInput = await request.json()

    // Validate request body
    if (!body.current_password || !body.new_password || !body.confirm_password) {
      throw ValidationError('All fields are required')
    }

    // Validate new password matches confirmation
    if (body.new_password !== body.confirm_password) {
      throw ValidationError('New password and confirmation do not match')
    }

    // Validate new password != current password
    if (body.new_password === body.current_password) {
      throw ValidationError('New password must be different from current password')
    }

    // Validate password requirements
    const passwordValidation = validatePasswordRequirements(body.new_password)
    if (!passwordValidation.valid) {
      throw ValidationError('Password does not meet requirements')
    }

    const supabase = await createClient()

    // Verify current password by attempting to sign in
    // (Supabase doesn't have a direct way to verify current password for logged-in users)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: body.current_password,
    })

    if (signInError) {
      throw AuthenticationError('Current password is incorrect')
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: body.new_password,
    })

    if (updateError) {
      logger.error('Supabase update password error:', { error: updateError })
      throw InternalError(updateError.message || 'Failed to change password')
    }

    return successResponse({
      success: true,
      message: 'Password changed successfully',
    })
  } catch (error) {
    logger.error('Error changing password:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
