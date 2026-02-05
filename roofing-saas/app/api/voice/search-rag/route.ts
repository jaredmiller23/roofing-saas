import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { requireFeature } from '@/lib/billing/feature-gates'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError,
  InternalError
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/embeddings'

/**
 * Knowledge base search result from vector similarity search
 */
interface KnowledgeSearchResult {
  title: string
  content: string
  category: string
  subcategory: string | null
  manufacturer: string | null
  similarity: number
}

/**
 * POST /api/voice/search-rag
 * Search roofing knowledge base using vector similarity
 *
 * Body: { query: string, threshold?: number, limit?: number }
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

    await requireFeature(tenantId, 'aiKnowledgeBase')

    const body = await request.json().catch(() => ({}))
    const { query, threshold = 0.7, limit = 3 } = body

    if (!query) {
      throw InternalError('Query is required')
    }

    logger.apiRequest('POST', '/api/voice/search-rag', { tenantId, query, threshold, limit })

    // Generate embedding for query
    const embeddingResult = await generateEmbedding(query)

    if (!embeddingResult) {
      // Fallback if embedding generation fails
      const fallbackResult = {
        query,
        results: [],
        summary: `I couldn't search the knowledge base for "${query}" at the moment. Please try asking a specific question about roofing materials, warranties, or installation techniques.`,
        fallback: true
      }
      const duration = Date.now() - startTime
      logger.apiResponse('POST', '/api/voice/search-rag', 200, duration)
      return successResponse(fallbackResult)
    }

    // Search knowledge base
    const supabase = await createClient()
    const { data: results, error: searchError } = await supabase.rpc(
      'search_roofing_knowledge',
      {
        query_embedding: JSON.stringify(embeddingResult.embedding),
        match_threshold: threshold,
        match_count: limit,
        filter_category: null,
        filter_tenant_id: tenantId,
      }
    )

    if (searchError) {
      logger.error('Knowledge base search error', { error: searchError })
      throw InternalError('Failed to search knowledge base')
    }

    // Format results for voice assistant
    const resultsArray = (results ?? []) as KnowledgeSearchResult[]
    const formattedResults = resultsArray.map((r: KnowledgeSearchResult) => ({
      title: r.title,
      content: r.content,
      category: r.category,
      subcategory: r.subcategory,
      manufacturer: r.manufacturer,
      relevance: r.similarity
    }))

    // Generate summary from top results
    let summary = ''
    if (formattedResults.length === 0) {
      summary = `I couldn't find specific information about "${query}" in the knowledge base. Could you rephrase your question or ask about a different topic?`
    } else if (formattedResults.length === 1) {
      summary = formattedResults[0].content
    } else {
      // Combine top results into a concise summary
      const topResult = formattedResults[0]
      summary = `${topResult.content}\n\nI also found related information about ${formattedResults.slice(1).map(r => r.title.toLowerCase()).join(' and ')}.`
    }

    const result = {
      query,
      results: formattedResults,
      summary,
      tokens_used: embeddingResult.tokens
    }

    // Log search for analytics
    await supabase.from('knowledge_search_queries').insert({
      tenant_id: tenantId,
      user_id: user.id,
      query_text: query,
      query_embedding: JSON.stringify(embeddingResult.embedding),
      results_count: formattedResults.length,
      top_result_id: null,
      relevance_score: formattedResults.length > 0 ? formattedResults[0].relevance : null,
    })

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/voice/search-rag', 200, duration)
    return successResponse(result)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('RAG search error', { error, duration })
    return errorResponse(error as Error)
  }
}
