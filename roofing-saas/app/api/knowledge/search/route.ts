/**
 * Knowledge Base Semantic Search API
 * Search roofing knowledge using vector similarity
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/embeddings'
import { logger } from '@/lib/logger'
import { AuthenticationError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw AuthenticationError()
    }

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

    // Get tenant ID from JWT
    const tenantId = user.user_metadata?.tenant_id

    // Search using database function
    const { data: results, error: searchError } = await supabase.rpc(
      'search_roofing_knowledge',
      {
        query_embedding: JSON.stringify(embeddingResult.embedding),
        match_threshold: threshold,
        match_count: limit,
        filter_category: category || null,
        filter_tenant_id: tenantId || null,
      }
    )

    if (searchError) {
      logger.error('Knowledge search error', { error: searchError })
      throw InternalError('Search failed')
    }

    // Log search query for analytics
    await supabase.from('knowledge_search_queries').insert({
      tenant_id: tenantId,
      user_id: user.id,
      query_text: query,
      query_embedding: JSON.stringify(embeddingResult.embedding),
      results_count: results?.length || 0,
      top_result_id: results && results.length > 0 ? results[0].id : null,
      relevance_score: results && results.length > 0 ? results[0].similarity : null,
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
}
