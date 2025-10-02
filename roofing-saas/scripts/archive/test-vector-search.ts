/**
 * Test Vector Search for Hybrid RAG
 *
 * This script tests semantic search on the knowledge_base table
 * to verify AI can find relevant projects and contacts.
 *
 * Usage:
 *   npx tsx scripts/test-vector-search.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import * as path from 'path'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error('❌ Missing environment credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

/**
 * Generate embedding using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 1536,
  })
  return response.data[0].embedding
}

/**
 * Search knowledge base using vector similarity
 */
async function searchKnowledgeBase(query: string, matchCount: number = 5) {
  console.log(`\n🔍 Query: "${query}"`)
  console.log('=' .repeat(80))

  // Generate query embedding
  console.log('   Generating query embedding...')
  const queryEmbedding = await generateEmbedding(query)

  // Search using pgvector cosine similarity
  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_count: matchCount,
  })

  if (error) {
    console.error('❌ Search error:', error)
    return []
  }

  // Display results
  console.log(`\n📊 Found ${data.length} results:\n`)

  data.forEach((result: any, index: number) => {
    console.log(`${index + 1}. ${result.title} (Similarity: ${(result.similarity * 100).toFixed(1)}%)`)
    console.log(`   Type: ${result.source_type}`)
    console.log(`   Content preview: ${result.content.substring(0, 150)}...`)
    console.log()
  })

  return data
}

/**
 * Run test queries
 */
async function runTests() {
  console.log('🧪 Testing Vector Search for Hybrid RAG\n')
  console.log('=' .repeat(80))

  // Test queries
  const testQueries = [
    'roofing projects in Tennessee with insurance claims',
    'storm damage repairs',
    'high value projects over $50,000',
    'projects assigned to production team',
    'recent leads from sales pipeline',
  ]

  for (const query of testQueries) {
    await searchKnowledgeBase(query, 3)
    await new Promise(resolve => setTimeout(resolve, 500)) // Rate limiting
  }

  console.log('=' .repeat(80))
  console.log('\n✨ Vector search test complete!')
}

// Run tests
runTests()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
