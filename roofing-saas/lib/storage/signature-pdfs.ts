/**
 * Supabase Storage Helper for Signature PDFs
 * Handles PDF uploads for e-signature documents
 *
 * Client-side functions use @/lib/supabase/client (for user uploads in browser)
 * Server-side functions use @/lib/supabase/server (for API route uploads)
 */

import { createClient } from '@/lib/supabase/client'

const BUCKET_NAME = 'signature-pdfs'
const MAX_FILE_SIZE_MB = 25 // PDFs can be larger than images

export interface PdfUploadResult {
  success: boolean
  data?: {
    path: string
    url: string
    size: number
  }
  error?: string
}

/**
 * Generate a unique filename for the PDF
 * Format: {userId}/{timestamp}_{random}.pdf
 */
export function generatePdfFilename(userId: string, originalFilename: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  // Keep original extension or default to pdf
  const ext = originalFilename.split('.').pop()?.toLowerCase() || 'pdf'

  return `${userId}/${timestamp}_${random}.${ext}`
}

/**
 * Upload a PDF file to Supabase Storage
 */
export async function uploadSignaturePdf(
  file: File,
  userId: string
): Promise<PdfUploadResult> {
  try {
    const supabase = createClient()

    // Validate file type
    if (file.type !== 'application/pdf') {
      return {
        success: false,
        error: 'File must be a PDF document',
      }
    }

    // Validate file size
    const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024
    if (file.size > maxBytes) {
      return {
        success: false,
        error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB} MB`,
      }
    }

    // Generate unique filename
    const filePath = generatePdfFilename(userId, file.name)

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false,
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
        size: file.size,
      },
    }
  } catch (error) {
    console.error('PDF upload error:', error)
    return {
      success: false,
      error: (error as Error).message,
    }
  }
}

/**
 * Delete a PDF from Supabase Storage
 */
export async function deleteSignaturePdf(filePath: string): Promise<{
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
    console.error('PDF delete error:', error)
    return {
      success: false,
      error: (error as Error).message,
    }
  }
}

/**
 * Get public URL for a PDF
 */
export function getPdfUrl(filePath: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath)
  return data.publicUrl
}
