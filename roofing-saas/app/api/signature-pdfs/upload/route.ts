import { NextRequest } from 'next/server'
import { uploadSignaturePdfFromServer } from '@/lib/storage/signature-pdfs-server'
import { withAuth } from '@/lib/auth/with-auth'
import { ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export const POST = withAuth(async (request: NextRequest, { userId }) => {
  try {
    // Get the file from form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      throw ValidationError('No file provided')
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      throw ValidationError('File must be a PDF document')
    }

    // Validate file size (25 MB max)
    const maxBytes = 25 * 1024 * 1024
    if (file.size > maxBytes) {
      throw ValidationError('File too large. Maximum size is 25 MB')
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload using server-side function (uses service role, bypasses RLS)
    const result = await uploadSignaturePdfFromServer(buffer, userId, file.name)

    if (!result.success) {
      throw InternalError(result.error || 'Failed to upload PDF')
    }

    return successResponse(result.data)
  } catch (error) {
    console.error('PDF upload API error:', error)
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
