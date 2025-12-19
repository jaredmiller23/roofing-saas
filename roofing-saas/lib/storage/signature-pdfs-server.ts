/**
 * Server-side Supabase Storage Helper for Signature PDFs
 * Used in API routes for uploading generated PDFs
 *
 * This uses a direct service role client which bypasses RLS
 * and doesn't require request cookies - works in any server context
 */

import { createClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client with service role for server-side operations
 * This client bypasses RLS and doesn't need cookies
 */
function createStorageClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || ''

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  })
}

const BUCKET_NAME = 'signature-pdfs'

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
  const ext = originalFilename.split('.').pop()?.toLowerCase() || 'pdf'

  return `${userId}/${timestamp}_${random}.${ext}`
}

/**
 * Upload a PDF file to Supabase Storage from server context
 * Uses admin client for API route usage
 */
export async function uploadSignaturePdfFromServer(
  fileBuffer: Buffer | Uint8Array,
  userId: string,
  filename: string = 'generated.pdf'
): Promise<PdfUploadResult> {
  try {
    const supabase = createStorageClient()

    // Generate unique filename
    const filePath = generatePdfFilename(userId, filename)

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Server storage upload error:', error)
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
        size: fileBuffer.length,
      },
    }
  } catch (error) {
    console.error('Server PDF upload error:', error)
    return {
      success: false,
      error: (error as Error).message,
    }
  }
}
