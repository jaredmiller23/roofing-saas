/**
 * Knowledge Base Semantic Search API
 * Search roofing knowledge using vector similarity
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/embeddings'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { query, category, threshold = 0.7, limit = 5 } = body

    if (!query) {
      return NextResponse.json(
        { error: 'Query text is required' },
        { status: 400 }
      )
    }

    // Generate embedding for query
    const embeddingResult = await generateEmbedding(query)

    if (!embeddingResult) {
      return NextResponse.json(
        { error: 'Failed to generate query embedding' },
        { status: 500 }
      )
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
      return NextResponse.json(
        { error: 'Search failed' },
        { status: 500 }
      )
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

    return NextResponse.json({
      results: results || [],
      query,
      tokens_used: embeddingResult.tokens,
      threshold,
    })
  } catch (error) {
    logger.error('Knowledge search API error', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
