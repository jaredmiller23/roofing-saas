/**
 * Knowledge Base Semantic Search API
 * Search roofing knowledge using vector similarity
 */

import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { generateEmbedding } from '@/lib/embeddings'
import { incrementAiUsage, calculateEmbeddingCostCents } from '@/lib/billing/ai-usage'
import { logger } from '@/lib/logger'
import { ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export const POST = withAuth(async (request, { userId, tenantId }) => {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const { query, category, threshold = 0.7, limit = 5 } = body

    if (!query) {
      throw ValidationError('Query text is required')
    }

    // Generate embedding for query
    const embeddingResult = await generateEmbedding(query)

    if (!embeddingResult) {
      throw InternalError('Failed to generate query embedding')
    }

    // Track embedding token usage (fire-and-forget)
    if (embeddingResult.tokens > 0) {
      const costCents = calculateEmbeddingCostCents(embeddingResult.tokens)
      incrementAiUsage(tenantId, embeddingResult.tokens, costCents).catch(err =>
        logger.error('Failed to track embedding usage', { error: err })
      )
    }

    // Search using database function
    const { data: results, error: searchError } = await supabase.rpc(
      'search_roofing_knowledge',
      {
        query_embedding: JSON.stringify(embeddingResult.embedding),
        match_threshold: threshold,
        match_count: limit,
        filter_category: category || null,
        filter_tenant_id: tenantId,
      }
    )

    if (searchError) {
      logger.error('Knowledge search error', { error: searchError })
      throw InternalError('Search failed')
    }

    // Log search query for analytics
    const searchResults = results as { id: string; similarity: number }[] | null
    await supabase.from('knowledge_search_queries').insert({
      tenant_id: tenantId,
      user_id: userId,
      query_text: query,
      query_embedding: JSON.stringify(embeddingResult.embedding),
      results_count: searchResults?.length ?? 0,
      top_result_id: searchResults && searchResults.length > 0 ? searchResults[0].id : null,
      relevance_score: searchResults && searchResults.length > 0 ? searchResults[0].similarity : null,
    })

    return successResponse({
      results: results || [],
      query,
      tokens_used: embeddingResult.tokens,
      threshold,
    })
  } catch (error) {
    logger.error('Knowledge search API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
