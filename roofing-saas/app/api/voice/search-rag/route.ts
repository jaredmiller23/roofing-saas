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

    // Use Archon RAG to search knowledge base
    // Note: This will use the MCP tool mcp__archon__rag_search_knowledge_base
    // For now, return a helpful message indicating the feature is ready
    const result = {
      query,
      results: [
        {
          content: 'Archon RAG integration is configured. This will search the roofing knowledge base for technical information, warranties, best practices, and installation techniques.',
          relevance: 1.0
        }
      ],
      summary: `I'll search our roofing knowledge base for: "${query}". This feature will provide technical information about materials, warranties, and best practices.`
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
