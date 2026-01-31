// =============================================
// User Profile API Route
// =============================================
// Route: GET/PATCH /api/profile
// Purpose: Get and update user profile data
// Author: Claude Code
// Date: 2025-11-18
// =============================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import type { UpdateProfileInput, UserProfile } from '@/lib/types/user-profile'

/**
 * GET /api/profile
 * Get current user's profile
 */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      throw AuthenticationError()
    }

    // Build profile from user data and metadata
    const profile: UserProfile = {
      id: user.id,
      email: user.email!,
      full_name: user.user_metadata?.full_name || null,
      phone: user.user_metadata?.phone || user.phone || null,
      job_title: user.user_metadata?.job_title || null,
      bio: user.user_metadata?.bio || null,
      avatar_url: user.user_metadata?.avatar_url || null,
      // Address fields
      street_address: user.user_metadata?.street_address || null,
      city: user.user_metadata?.city || null,
      state: user.user_metadata?.state || null,
      zip_code: user.user_metadata?.zip_code || null,
      // Timezone
      timezone: user.user_metadata?.timezone || null,
      created_at: user.created_at,
      updated_at: user.updated_at || user.created_at,
    }

    return successResponse(profile)
  } catch (error) {
    logger.error('Error fetching profile:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * PATCH /api/profile
 * Update user profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      throw AuthenticationError()
    }

    const body: UpdateProfileInput = await request.json()

    // Validate input
    if (!body || typeof body !== 'object') {
      throw ValidationError('Invalid request body')
    }

    const supabase = await createClient()

    // Update user metadata
    const updateData: Record<string, unknown> = {
      data: {
        ...user.user_metadata,
        full_name: body.full_name !== undefined ? body.full_name : user.user_metadata?.full_name,
        phone: body.phone !== undefined ? body.phone : user.user_metadata?.phone,
        job_title: body.job_title !== undefined ? body.job_title : user.user_metadata?.job_title,
        bio: body.bio !== undefined ? body.bio : user.user_metadata?.bio,
        avatar_url: body.avatar_url !== undefined ? body.avatar_url : user.user_metadata?.avatar_url,
        // Address fields
        street_address: body.street_address !== undefined ? body.street_address : user.user_metadata?.street_address,
        city: body.city !== undefined ? body.city : user.user_metadata?.city,
        state: body.state !== undefined ? body.state : user.user_metadata?.state,
        zip_code: body.zip_code !== undefined ? body.zip_code : user.user_metadata?.zip_code,
        // Timezone
        timezone: body.timezone !== undefined ? body.timezone : user.user_metadata?.timezone,
      },
    }

    const { data, error } = await supabase.auth.updateUser(updateData)

    if (error) {
      logger.error('Supabase update user error:', { error })
      throw InternalError(error.message || 'Failed to update profile')
    }

    if (!data.user) {
      throw InternalError('Failed to update profile')
    }

    // Build updated profile
    const updatedProfile: UserProfile = {
      id: data.user.id,
      email: data.user.email!,
      full_name: data.user.user_metadata?.full_name || null,
      phone: data.user.user_metadata?.phone || null,
      job_title: data.user.user_metadata?.job_title || null,
      bio: data.user.user_metadata?.bio || null,
      avatar_url: data.user.user_metadata?.avatar_url || null,
      // Address fields
      street_address: data.user.user_metadata?.street_address || null,
      city: data.user.user_metadata?.city || null,
      state: data.user.user_metadata?.state || null,
      zip_code: data.user.user_metadata?.zip_code || null,
      // Timezone
      timezone: data.user.user_metadata?.timezone || null,
      created_at: data.user.created_at,
      updated_at: data.user.updated_at || data.user.created_at,
    }

    return successResponse(updatedProfile)
  } catch (error) {
    logger.error('Error updating profile:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
