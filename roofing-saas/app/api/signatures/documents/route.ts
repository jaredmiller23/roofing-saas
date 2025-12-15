import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * GET /api/signatures/documents
 * List signature documents with filtering - redirects to main endpoint
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    logger.apiRequest('GET', '/api/signatures/documents', { tenantId })

    // Redirect to the main signature-documents endpoint
    const searchParams = request.nextUrl.searchParams
    const mainEndpoint = `/api/signature-documents?${searchParams.toString()}`
    
    const response = await fetch(new URL(mainEndpoint, request.url))
    const data = await response.json()

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/signatures/documents', response.status, duration)

    if (!response.ok) {
      return errorResponse(new Error(data.error?.message || 'Failed to fetch documents'))
    }

    return successResponse(data.data || data)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error fetching signature documents', { error, duration })
    return errorResponse(error as Error)
  }
}
