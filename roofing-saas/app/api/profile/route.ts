// =============================================
// User Profile API Route
// =============================================
// Route: GET/PATCH /api/profile
// Purpose: Get and update user profile data
// Author: Claude Code
// Date: 2025-11-18
// =============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import type { UpdateProfileInput, UserProfile } from '@/lib/types/user-profile'

/**
 * GET /api/profile
 * Get current user's profile
 */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      created_at: user.created_at,
      updated_at: user.updated_at || user.created_at,
    }

    return NextResponse.json({ success: true, profile })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    )
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: UpdateProfileInput = await request.json()

    // Validate input
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      )
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
      },
    }

    const { data, error } = await supabase.auth.updateUser(updateData)

    if (error) {
      console.error('Supabase update user error:', error)
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to update profile' },
        { status: 500 }
      )
    }

    if (!data.user) {
      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500 }
      )
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
      created_at: data.user.created_at,
      updated_at: data.user.updated_at || data.user.created_at,
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      message: 'Profile updated successfully',
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
