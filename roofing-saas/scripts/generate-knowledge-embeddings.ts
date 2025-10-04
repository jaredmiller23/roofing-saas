/**
 * Generate Embeddings for Knowledge Base (Service Script)
 *
 * Run this script to generate OpenAI embeddings for all roofing knowledge entries.
 * Uses service role key to bypass RLS.
 *
 * Usage:
 *   npx tsx scripts/generate-knowledge-embeddings.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const EMBEDDING_MODEL = 'text-embedding-3-small'

interface EmbeddingResult {
  embedding: number[]
  tokens: number
}

async function generateEmbedding(text: string): Promise<EmbeddingResult | null> {
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not configured')
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
        encoding_format: 'float',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI API error:', response.status, error)
      return null
    }

    const data = await response.json()

    return {
      embedding: data.data[0].embedding,
      tokens: data.usage.total_tokens,
    }
  } catch (error) {
    console.error('Failed to generate embedding:', error)
    return null
  }
}

async function generateKnowledgeEmbedding(
  title: string,
  content: string
): Promise<EmbeddingResult | null> {
  const text = `${title}\n\n${content}`
  return generateEmbedding(text)
}

function calculateEmbeddingCost(tokens: number): number {
  return (tokens / 1_000_000) * 0.02
}

async function main() {
  console.log('🚀 Starting knowledge base embedding generation...\n')

  // Check environment variables
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in environment')
    process.exit(1)
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment')
    process.exit(1)
  }

  // Create Supabase client with service role (bypasses RLS)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Get all knowledge entries without embeddings
  const { data: knowledge, error: fetchError } = await supabase
    .from('roofing_knowledge')
    .select('id, title, content, category')
    .is('embedding', null)
    .eq('is_active', true)

  if (fetchError) {
    console.error('❌ Failed to fetch knowledge entries:', fetchError)
    process.exit(1)
  }

  if (!knowledge || knowledge.length === 0) {
    console.log('✅ All knowledge entries already have embeddings')
    process.exit(0)
  }

  console.log(`📝 Found ${knowledge.length} entries without embeddings\n`)

  // Generate embeddings
  let totalTokens = 0
  let successCount = 0
  const errors: string[] = []

  for (let i = 0; i < knowledge.length; i++) {
    const entry = knowledge[i]
    const progress = `[${i + 1}/${knowledge.length}]`

    try {
      console.log(`${progress} Processing: ${entry.title}`)

      const result = await generateKnowledgeEmbedding(entry.title, entry.content)

      if (result) {
        // Update knowledge entry with embedding
        const { error: updateError } = await supabase
          .from('roofing_knowledge')
          .update({ embedding: JSON.stringify(result.embedding) })
          .eq('id', entry.id)

        if (updateError) {
          const errMsg = `Failed to update ${entry.id}: ${updateError.message}`
          errors.push(errMsg)
          console.error(`  ❌ ${errMsg}`)
        } else {
          successCount++
          totalTokens += result.tokens
          console.log(`  ✅ Generated (${result.tokens} tokens)`)
        }
      } else {
        const errMsg = `Failed to generate embedding for ${entry.id}`
        errors.push(errMsg)
        console.error(`  ❌ ${errMsg}`)
      }

      // Rate limiting: small delay between requests
      if (i < knowledge.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (error) {
      const errMsg = `Error processing ${entry.id}: ${error}`
      errors.push(errMsg)
      console.error(`  ❌ ${errMsg}`)
    }
  }

  const estimatedCost = calculateEmbeddingCost(totalTokens)

  console.log('\n' + '='.repeat(60))
  console.log('📊 Summary')
  console.log('='.repeat(60))
  console.log(`✅ Successfully processed: ${successCount}/${knowledge.length}`)
  console.log(`📝 Total tokens used: ${totalTokens.toLocaleString()}`)
  console.log(`💰 Estimated cost: $${estimatedCost.toFixed(4)}`)

  if (errors.length > 0) {
    console.log(`\n❌ Errors (${errors.length}):`)
    errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`))
    process.exit(1)
  }

  console.log('\n✨ All embeddings generated successfully!')
  process.exit(0)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
