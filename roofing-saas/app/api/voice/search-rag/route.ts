import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError,
  InternalError
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * POST /api/voice/search-rag
 * Search Archon RAG knowledge base for roofing information
 *
 * Body: { query: string }
 * Returns: { results: [...], summary: string }
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => ({}))
    const { query } = body

    if (!query) {
      throw InternalError('Query is required')
    }

    logger.apiRequest('POST', '/api/voice/search-rag', { tenantId, query })

    // Search the web for roofing information
    // This provides real-time access to manufacturer specs, warranties, best practices
    // const searchQuery = `roofing ${query} warranty specifications installation` // TODO: Use for web search API

    // For now, return a helpful response structure
    // In production, this would call a web search API
    const result = {
      query,
      results: [
        {
          content: `Searching for roofing information about: ${query}. This will provide manufacturer specifications, warranty details, installation guidelines, and industry best practices.`,
          relevance: 1.0,
          source: 'Web Search'
        }
      ],
      summary: `I'm searching for roofing information about "${query}". For accurate warranty and specification details, I recommend checking the manufacturer's official documentation or consulting with your supplier.`
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/voice/search-rag', 200, duration)
    return successResponse(result)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('RAG search error', { error, duration })
    return errorResponse(error as Error)
  }
}
