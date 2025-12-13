/**
 * ARIA Knowledge Functions
 * Roofing knowledge base search and Q&A
 */

import { ariaFunctionRegistry } from '../function-registry'
import { generateEmbedding } from '@/lib/embeddings'
import { logger } from '@/lib/logger'

// =============================================================================
// Search Knowledge Base
// =============================================================================

ariaFunctionRegistry.register({
  name: 'search_knowledge',
  category: 'knowledge',
  description: 'Search the roofing knowledge base for information',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'search_knowledge',
    description: 'Search the roofing knowledge base for information about roofing topics, procedures, materials, or pricing',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query or question',
        },
        category: {
          type: 'string',
          enum: ['materials', 'procedures', 'pricing', 'insurance', 'weather', 'general'],
          description: 'Optional category to filter results',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 3)',
        },
      },
      required: ['query'],
    },
  },
  execute: async (args, context) => {
    const { query, category, limit = 3 } = args as {
      query: string
      category?: string
      limit?: number
    }

    try {
      // Generate embedding for the query
      const embeddingResult = await generateEmbedding(query)

      if (!embeddingResult) {
        return {
          success: false,
          error: 'Failed to process search query. Please try again.',
        }
      }

      // Search knowledge base using vector similarity
      const { data: results, error: searchError } = await context.supabase.rpc(
        'search_roofing_knowledge',
        {
          query_embedding: JSON.stringify(embeddingResult.embedding),
          match_threshold: 0.65,
          match_count: limit,
          filter_category: category || null,
          filter_tenant_id: context.tenantId || null,
        }
      )

      if (searchError) {
        logger.error('ARIA search_knowledge error:', { error: searchError })
        return {
          success: false,
          error: 'Knowledge search failed',
        }
      }

      if (!results || results.length === 0) {
        return {
          success: true,
          data: [],
          message: `No results found for "${query}". This might be a specialized question - I can search online for more information if needed.`,
        }
      }

      // Format results for voice-friendly response
      interface KnowledgeResult {
        id: string
        title: string
        content: string
        category: string
        similarity: number
      }

      const formattedResults = (results as KnowledgeResult[]).map((r) => ({
        id: r.id,
        title: r.title,
        content: r.content,
        category: r.category,
        relevance: Math.round(r.similarity * 100),
      }))

      // Build response message
      const topResult = formattedResults[0]
      const responseMessage = formattedResults.length === 1
        ? `Found: ${topResult.title}. ${topResult.content.substring(0, 200)}...`
        : `Found ${formattedResults.length} relevant results. The top match is about ${topResult.title}.`

      return {
        success: true,
        data: formattedResults,
        message: responseMessage,
      }
    } catch (error) {
      logger.error('ARIA search_knowledge error:', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Knowledge search failed',
      }
    }
  },
})

// =============================================================================
// Ask Roofing Question
// =============================================================================

ariaFunctionRegistry.register({
  name: 'ask_roofing_question',
  category: 'knowledge',
  description: 'Answer common roofing questions from the knowledge base',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'ask_roofing_question',
    description: 'Get answers to common roofing questions like pricing, materials, timeline, warranty, insurance claims',
    parameters: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The question to answer',
        },
        topic: {
          type: 'string',
          enum: ['pricing', 'materials', 'timeline', 'warranty', 'insurance', 'repair_vs_replace', 'weather', 'maintenance'],
          description: 'The topic category for the question',
        },
      },
      required: ['question'],
    },
  },
  execute: async (args, context) => {
    const { question, topic } = args as {
      question: string
      topic?: string
    }

    try {
      // Generate embedding for the question
      const embeddingResult = await generateEmbedding(question)

      if (!embeddingResult) {
        return {
          success: false,
          error: 'Failed to process question. Please try again.',
        }
      }

      // Map topic to category
      const categoryMap: Record<string, string> = {
        pricing: 'pricing',
        materials: 'materials',
        timeline: 'procedures',
        warranty: 'general',
        insurance: 'insurance',
        repair_vs_replace: 'procedures',
        weather: 'weather',
        maintenance: 'procedures',
      }

      const filterCategory = topic ? categoryMap[topic] || null : null

      // Search for best matching answer
      const { data: results, error: searchError } = await context.supabase.rpc(
        'search_roofing_knowledge',
        {
          query_embedding: JSON.stringify(embeddingResult.embedding),
          match_threshold: 0.70, // Higher threshold for Q&A
          match_count: 1,
          filter_category: filterCategory,
          filter_tenant_id: context.tenantId || null,
        }
      )

      if (searchError) {
        logger.error('ARIA ask_roofing_question error:', { error: searchError })
        return {
          success: false,
          error: 'Failed to search knowledge base',
        }
      }

      interface KnowledgeResult {
        id: string
        title: string
        content: string
        category: string
        similarity: number
      }

      if (!results || results.length === 0) {
        // No matching answer - provide fallback response
        return {
          success: true,
          data: { source: 'not_found' },
          message: `I don't have a specific answer for that question in my knowledge base. I'd recommend speaking with one of our roofing specialists who can give you more detailed information. Would you like me to schedule a callback?`,
        }
      }

      const answer = results[0] as KnowledgeResult
      const confidence = Math.round(answer.similarity * 100)

      // Build a conversational response
      let response = answer.content

      // Add confidence qualifier for lower-confidence answers
      if (confidence < 80) {
        response = `Based on our knowledge base: ${response}`
      }

      // Track Q&A for analytics (non-blocking, fire-and-forget)
      void context.supabase.from('knowledge_search_queries').insert({
        tenant_id: context.tenantId,
        user_id: context.userId,
        query_text: question,
        results_count: 1,
        top_result_id: answer.id,
        relevance_score: answer.similarity,
        metadata: { topic, via: 'aria_qa' },
      })

      return {
        success: true,
        data: {
          source: 'local',
          confidence,
          category: answer.category,
          title: answer.title,
        },
        message: response,
      }
    } catch (error) {
      logger.error('ARIA ask_roofing_question error:', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to answer question',
      }
    }
  },
})
