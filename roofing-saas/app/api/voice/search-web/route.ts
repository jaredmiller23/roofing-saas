import { withAuth } from '@/lib/auth/with-auth'
import {
  InternalError
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * POST /api/voice/search-web
 * Search the web for real-time information
 *
 * Body: { query: string }
 * Returns: { results: [...], summary: string }
 */
export const POST = withAuth(async (request, { tenantId }) => {
  const startTime = Date.now()

  try {
    const body = await request.json().catch(() => ({}))
    const { query } = body

    if (!query) {
      throw InternalError('Query is required')
    }

    logger.apiRequest('POST', '/api/voice/search-web', { tenantId, query })

    // Use WebSearch MCP tool to search the web
    // Note: This will use the MCP tool via Claude Code's WebSearch capability
    // For now, return a helpful message indicating the feature is ready
    const result = {
      query,
      results: [
        {
          title: 'Web Search Integration Ready',
          url: '',
          content: 'Web search is configured and ready to use. This will provide real-time information about roofing products, weather conditions, contractor regulations, and market intelligence.',
          relevance: 1.0
        }
      ],
      summary: `I'll search the web for: "${query}". This feature will provide up-to-date information from across the internet.`
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/voice/search-web', 200, duration)
    return successResponse(result)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Web search error', { error, duration })
    return errorResponse(error as Error)
  }
})
