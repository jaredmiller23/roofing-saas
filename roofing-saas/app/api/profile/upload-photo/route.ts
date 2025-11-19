// =============================================
// Profile Photo Upload API Route
// =============================================
// Route: POST /api/profile/upload-photo
// Purpose: Upload and update user's profile photo
// Author: Claude Code
// Date: 2025-11-18
// =============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

/**
 * POST /api/profile/upload-photo
 * Upload profile photo to Supabase Storage and update user metadata
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    // Delete old avatar if exists
    const oldAvatarUrl = user.user_metadata?.avatar_url
    if (oldAvatarUrl) {
      try {
        // Extract file path from URL
        const oldFilePath = oldAvatarUrl.split('/').slice(-2).join('/')
        await supabase.storage.from('profile-photos').remove([oldFilePath])
      } catch (error) {
        // Ignore errors when deleting old avatar
        console.warn('Failed to delete old avatar:', error)
      }
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: 'Failed to upload photo' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(uploadData.path)

    const avatarUrl = urlData.publicUrl

    // Update user metadata with new avatar URL
    const { data, error: updateError } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        avatar_url: avatarUrl,
      },
    })

    if (updateError) {
      console.error('Supabase update user metadata error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update profile photo' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      avatar_url: avatarUrl,
      message: 'Profile photo updated successfully',
    })
  } catch (error) {
    console.error('Error uploading profile photo:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload profile photo' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/profile/upload-photo
 * Delete user's profile photo
 */
export async function DELETE() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const avatarUrl = user.user_metadata?.avatar_url

    if (!avatarUrl) {
      return NextResponse.json(
        { success: false, error: 'No profile photo to delete' },
        { status: 404 }
      )
    }

    const supabase = await createClient()

    // Extract file path from URL
    const filePath = avatarUrl.split('/').slice(-2).join('/')

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('profile-photos')
      .remove([filePath])

    if (deleteError) {
      console.error('Supabase storage delete error:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete photo from storage' },
        { status: 500 }
      )
    }

    // Update user metadata to remove avatar URL
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        avatar_url: null,
      },
    })

    if (updateError) {
      console.error('Supabase update user metadata error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Profile photo deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting profile photo:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete profile photo' },
      { status: 500 }
    )
  }
}
