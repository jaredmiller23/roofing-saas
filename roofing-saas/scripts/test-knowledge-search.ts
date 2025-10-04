/**
 * Test Knowledge Base Search
 *
 * Tests vector similarity search on roofing knowledge base
 *
 * Usage:
 *   npx tsx scripts/test-knowledge-search.ts "What is the GAF warranty?"
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function generateEmbedding(text: string): Promise<number[] | null> {
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
        model: 'text-embedding-3-small',
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
    return data.data[0].embedding
  } catch (error) {
    console.error('Failed to generate embedding:', error)
    return null
  }
}

async function main() {
  const query = process.argv[2] || "What is the GAF System Plus warranty?"

  console.log('🔍 Testing Knowledge Base Search')
  console.log('=' .repeat(60))
  console.log(`Query: "${query}"\n`)

  // Generate query embedding
  console.log('📝 Generating query embedding...')
  const embedding = await generateEmbedding(query)

  if (!embedding) {
    console.error('❌ Failed to generate embedding')
    process.exit(1)
  }

  console.log(`✅ Generated embedding (${embedding.length} dimensions)\n`)

  // Search knowledge base
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('🔎 Searching knowledge base...')

  const { data: results, error } = await supabase.rpc('search_roofing_knowledge', {
    query_embedding: JSON.stringify(embedding),
    match_threshold: 0.7,
    match_count: 3,
    filter_category: null,
    filter_tenant_id: null
  })

  if (error) {
    console.error('❌ Search error:', error)
    process.exit(1)
  }

  console.log(`\n✅ Found ${results?.length || 0} results\n`)

  if (!results || results.length === 0) {
    console.log('No results found. Try lowering the similarity threshold or rephrasing your query.')
    process.exit(0)
  }

  // Display results
  console.log('=' .repeat(60))
  console.log('📊 Search Results')
  console.log('=' .repeat(60))

  results.forEach((result: any, index: number) => {
    console.log(`\n${index + 1}. ${result.title}`)
    console.log(`   Category: ${result.category}`)
    if (result.subcategory) console.log(`   Subcategory: ${result.subcategory}`)
    if (result.manufacturer) console.log(`   Manufacturer: ${result.manufacturer}`)
    console.log(`   Similarity: ${(result.similarity * 100).toFixed(1)}%`)
    console.log(`   Content: ${result.content.substring(0, 200)}...`)
  })

  console.log('\n' + '='.repeat(60))
  console.log('✨ Search test completed successfully!')
  process.exit(0)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
