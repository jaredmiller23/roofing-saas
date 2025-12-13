// =============================================
// Profile Photo Upload API Route
// =============================================
// Route: POST /api/profile/upload-photo
// Purpose: Upload and update user's profile photo
// Author: Claude Code
// Date: 2025-11-18
// =============================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * POST /api/profile/upload-photo
 * Upload profile photo to Supabase Storage and update user metadata
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      throw AuthenticationError()
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      throw ValidationError('No file provided')
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      throw ValidationError('Invalid file type. Only images are allowed.')
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > maxSize) {
      throw ValidationError('File too large. Maximum size is 5MB.')
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
        logger.warn('Failed to delete old avatar:', { error })
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
      logger.error('Supabase storage upload error:', { error: uploadError })
      throw InternalError('Failed to upload photo')
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(uploadData.path)

    const avatarUrl = urlData.publicUrl

    // Update user metadata with new avatar URL
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        avatar_url: avatarUrl,
      },
    })

    if (updateError) {
      logger.error('Supabase update user metadata error:', { error: updateError })
      throw InternalError('Failed to update profile photo')
    }

    return successResponse({
      success: true,
      avatar_url: avatarUrl,
      message: 'Profile photo updated successfully',
    })
  } catch (error) {
    logger.error('Error uploading profile photo:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
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
      throw AuthenticationError()
    }

    const avatarUrl = user.user_metadata?.avatar_url

    if (!avatarUrl) {
      throw NotFoundError('No profile photo to delete')
    }

    const supabase = await createClient()

    // Extract file path from URL
    const filePath = avatarUrl.split('/').slice(-2).join('/')

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('profile-photos')
      .remove([filePath])

    if (deleteError) {
      logger.error('Supabase storage delete error:', { error: deleteError })
      throw InternalError('Failed to delete photo from storage')
    }

    // Update user metadata to remove avatar URL
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        avatar_url: null,
      },
    })

    if (updateError) {
      logger.error('Supabase update user metadata error:', { error: updateError })
      throw InternalError('Failed to update profile')
    }

    return successResponse({
      success: true,
      message: 'Profile photo deleted successfully',
    })
  } catch (error) {
    logger.error('Error deleting profile photo:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
