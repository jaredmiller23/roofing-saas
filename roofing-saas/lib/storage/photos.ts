/**
 * Supabase Storage Helper for Photos
 * Handles photo uploads, downloads, and management
 */

import { createClient } from '@/lib/supabase/client'
import imageCompression from 'browser-image-compression'

const BUCKET_NAME = 'property-photos'
const MAX_FILE_SIZE_MB = 10
const MAX_DIMENSION = 1920 // Max width or height in pixels
const COMPRESSION_QUALITY = 0.8 // 0-1, higher = better quality

export interface PhotoUploadOptions {
  file: File
  userId: string
  contactId?: string
  projectId?: string
  metadata?: {
    location?: string
    notes?: string
    latitude?: number
    longitude?: number
    [key: string]: unknown
  }
}

export interface CompressedPhotoResult {
  file: File
  originalSize: number
  compressedSize: number
  compressionRatio: number
}

/**
 * Compress an image file before upload
 * Reduces file size while maintaining acceptable quality
 */
export async function compressImage(file: File): Promise<CompressedPhotoResult> {
  const originalSize = file.size

  // Compression options
  const options = {
    maxSizeMB: MAX_FILE_SIZE_MB,
    maxWidthOrHeight: MAX_DIMENSION,
    useWebWorker: true,
    fileType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
    initialQuality: COMPRESSION_QUALITY,
  }

  try {
    const compressedFile = await imageCompression(file, options)
    const compressedSize = compressedFile.size

    return {
      file: compressedFile,
      originalSize,
      compressedSize,
      compressionRatio: ((originalSize - compressedSize) / originalSize) * 100,
    }
  } catch (error) {
    console.error('Image compression failed:', error)
    // If compression fails, return original file
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 0,
    }
  }
}

/**
 * Generate a unique filename for the photo
 * Format: {userId}/{year}/{month}/IMG_{timestamp}_{random}.{ext}
 */
export function generatePhotoFilename(userId: string, originalFilename: string): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const timestamp = now.getTime()
  const random = Math.random().toString(36).substring(2, 8)
  const ext = originalFilename.split('.').pop() || 'jpg'

  return `${userId}/${year}/${month}/IMG_${timestamp}_${random}.${ext}`
}

/**
 * Upload a photo to Supabase Storage
 */
export async function uploadPhoto(options: PhotoUploadOptions): Promise<{
  success: boolean
  data?: {
    path: string
    url: string
    size: number
    originalSize: number
    compressionRatio: number
  }
  error?: string
}> {
  try {
    const supabase = createClient()

    // Validate file type
    if (!options.file.type.startsWith('image/')) {
      return {
        success: false,
        error: 'File must be an image',
      }
    }

    // Validate file size (before compression)
    const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024
    if (options.file.size > maxBytes * 2) {
      // Allow 2x the limit before compression
      return {
        success: false,
        error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB * 2} MB`,
      }
    }

    // Compress the image
    const { file: compressedFile, originalSize, compressedSize, compressionRatio } = await compressImage(options.file)

    // Generate unique filename
    const filePath = generatePhotoFilename(options.userId, options.file.name)

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, compressedFile, {
        contentType: compressedFile.type,
        cacheControl: '3600',
        upsert: false, // Prevent overwriting existing files
      })

    if (error) {
      console.error('Storage upload error:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath)

    return {
      success: true,
      data: {
        path: filePath,
        url: urlData.publicUrl,
        size: compressedSize,
        originalSize,
        compressionRatio,
      },
    }
  } catch (error) {
    console.error('Photo upload error:', error)
    return {
      success: false,
      error: (error as Error).message,
    }
  }
}

/**
 * Delete a photo from Supabase Storage
 */
export async function deletePhoto(filePath: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createClient()

    const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath])

    if (error) {
      console.error('Storage delete error:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('Photo delete error:', error)
    return {
      success: false,
      error: (error as Error).message,
    }
  }
}

/**
 * Get public URL for a photo
 */
export function getPhotoUrl(filePath: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath)
  return data.publicUrl
}

/**
 * Get signed URL for a photo (for temporary access)
 */
export async function getSignedPhotoUrl(
  filePath: string,
  expiresIn: number = 3600 // Default 1 hour
): Promise<{
  success: boolean
  url?: string
  error?: string
}> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(filePath, expiresIn)

    if (error) {
      console.error('Signed URL error:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      url: data.signedUrl,
    }
  } catch (error) {
    console.error('Signed URL error:', error)
    return {
      success: false,
      error: (error as Error).message,
    }
  }
}

/**
 * List photos for a user
 */
export async function listUserPhotos(
  userId: string,
  options?: {
    limit?: number
    offset?: number
  }
): Promise<{
  success: boolean
  data?: Array<{
    name: string
    id: string
    updated_at: string
    created_at: string
    last_accessed_at: string
    metadata: Record<string, unknown>
  }>
  error?: string
}> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.storage.from(BUCKET_NAME).list(userId, {
      limit: options?.limit || 100,
      offset: options?.offset || 0,
      sortBy: { column: 'created_at', order: 'desc' },
    })

    if (error) {
      console.error('List photos error:', error)
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('List photos error:', error)
    return {
      success: false,
      error: (error as Error).message,
    }
  }
}
