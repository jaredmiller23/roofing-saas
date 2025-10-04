/**
 * OpenAI Embeddings Service
 * Generate vector embeddings for semantic search
 */

import { logger } from '@/lib/logger'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const EMBEDDING_MODEL = 'text-embedding-3-small' // 1536 dimensions, $0.02 per 1M tokens
const MAX_BATCH_SIZE = 100 // OpenAI limit

export interface EmbeddingResult {
  embedding: number[]
  tokens: number
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult | null> {
  if (!OPENAI_API_KEY) {
    logger.warn('OpenAI API key not configured')
    return null
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
        encoding_format: 'float', // Standard float array
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      logger.error('OpenAI embedding API error', { status: response.status, error })
      return null
    }

    const data = await response.json()

    return {
      embedding: data.data[0].embedding,
      tokens: data.usage.total_tokens,
    }
  } catch (error) {
    logger.error('Failed to generate embedding', { error })
    return null
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * Automatically handles batching and rate limiting
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<{ embeddings: number[][]; totalTokens: number } | null> {
  if (!OPENAI_API_KEY) {
    logger.warn('OpenAI API key not configured')
    return null
  }

  if (texts.length === 0) {
    return { embeddings: [], totalTokens: 0 }
  }

  try {
    const allEmbeddings: number[][] = []
    let totalTokens = 0

    // Process in batches
    for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
      const batch = texts.slice(i, i + MAX_BATCH_SIZE)

      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: batch,
          encoding_format: 'float',
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        logger.error('OpenAI batch embedding API error', { status: response.status, error })
        return null
      }

      const data = await response.json()

      // Collect embeddings in order
      for (const item of data.data) {
        allEmbeddings.push(item.embedding)
      }

      totalTokens += data.usage.total_tokens

      // Rate limiting: small delay between batches
      if (i + MAX_BATCH_SIZE < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return { embeddings: allEmbeddings, totalTokens }
  } catch (error) {
    logger.error('Failed to generate batch embeddings', { error })
    return null
  }
}

/**
 * Generate embedding for roofing knowledge entry
 * Combines title and content for better semantic representation
 */
export async function generateKnowledgeEmbedding(
  title: string,
  content: string
): Promise<EmbeddingResult | null> {
  // Combine title and content with newline separator
  // Title gets more weight by being at the start
  const text = `${title}\n\n${content}`

  return generateEmbedding(text)
}

/**
 * Calculate cosine similarity between two embeddings
 * Returns value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have same dimensions')
  }

  let dotProduct = 0
  let magnitudeA = 0
  let magnitudeB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    magnitudeA += a[i] * a[i]
    magnitudeB += b[i] * b[i]
  }

  magnitudeA = Math.sqrt(magnitudeA)
  magnitudeB = Math.sqrt(magnitudeB)

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0
  }

  return dotProduct / (magnitudeA * magnitudeB)
}

/**
 * Estimate token count for text (approximate)
 * Useful for cost estimation before API call
 */
export function estimateTokenCount(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English
  return Math.ceil(text.length / 4)
}

/**
 * Calculate embedding cost
 * text-embedding-3-small: $0.02 per 1M tokens
 */
export function calculateEmbeddingCost(tokens: number): number {
  return (tokens / 1_000_000) * 0.02
}
