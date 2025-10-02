/**
 * Sync CRM to Knowledge Base (Hybrid RAG)
 *
 * This script syncs projects and contacts from CRM tables to the knowledge_base
 * table for AI chatbot vector search.
 *
 * Usage:
 *   npx tsx scripts/sync-to-knowledge-base.ts
 *
 * Options:
 *   --limit N     Limit to N records (default: all)
 *   --type TYPE   Sync only 'projects' or 'contacts' (default: both)
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
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || '478d279b-5b8a-4040-a805-75d595d59702'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

if (!OPENAI_API_KEY) {
  console.error('❌ Missing OpenAI API key. Please add OPENAI_API_KEY to .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

interface SyncStats {
  processed: number
  created: number
  updated: number
  errors: number
  errorDetails: Array<{ id: string; error: string }>
}

/**
 * Transform project to searchable text chunk
 */
function projectToChunk(project: any): string {
  const customFields = typeof project.custom_fields === 'string'
    ? JSON.parse(project.custom_fields)
    : project.custom_fields || {}

  return `
Project: ${project.name} (#${project.project_number})
Status: ${project.status}
Type: ${project.type || 'Not specified'}
Pipeline: ${customFields.proline_pipeline || 'N/A'}
Stage: ${customFields.proline_stage || 'N/A'}
Assigned to: ${customFields.assigned_to || 'Unassigned'}

Description: ${project.description || 'No description'}
Scope of Work: ${project.scope_of_work || 'Not specified'}

Financial:
- Estimated Value: $${project.estimated_value || 0}
- Approved Value: $${project.approved_value || 0}

Services: ${customFields.services || 'Not specified'}
Category: ${customFields.category || 'Not specified'}
Tags: ${Array.isArray(customFields.tags) ? customFields.tags.join(', ') : 'None'}

Location: ${customFields.location || 'Not specified'}
Address: ${customFields.address?.line1 || ''} ${customFields.address?.city || ''}, ${customFields.address?.state || ''}
  `.trim()
}

/**
 * Transform contact to searchable text chunk
 */
function contactToChunk(contact: any): string {
  return `
Contact: ${contact.first_name} ${contact.last_name}
Email: ${contact.email || 'Not provided'}
Phone: ${contact.phone || 'Not provided'}

Type: ${contact.type || 'General'}
Status: ${contact.status || 'Active'}

Company: ${contact.company || 'N/A'}
Address: ${contact.address || 'Not specified'}

Tags: ${Array.isArray(contact.tags) ? contact.tags.join(', ') : 'None'}
Notes: ${contact.notes || 'No notes'}
  `.trim()
}

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
 * Check if knowledge base entry exists
 */
async function entryExists(sourceId: string, sourceType: string): Promise<{ exists: boolean; id?: string }> {
  const { data, error } = await supabase
    .from('knowledge_base')
    .select('id')
    .eq('source_id', sourceId)
    .eq('source_type', sourceType)
    .maybeSingle()

  if (error) {
    console.error(`Error checking entry existence:`, error)
    return { exists: false }
  }

  return { exists: !!data, id: data?.id }
}

/**
 * Sync a single record to knowledge base
 */
async function syncRecord(
  record: any,
  sourceType: 'project' | 'contact',
  stats: SyncStats
): Promise<void> {
  try {
    // Transform to searchable text
    const content = sourceType === 'project'
      ? projectToChunk(record)
      : contactToChunk(record)

    // Generate embedding
    console.log(`   Generating embedding for ${record.name || `${record.first_name} ${record.last_name}`}...`)
    const embedding = await generateEmbedding(content)

    // Check if exists
    const { exists, id } = await entryExists(record.id, sourceType)

    const knowledgeBaseData = {
      tenant_id: DEFAULT_TENANT_ID,
      source_id: record.id,
      source_type: sourceType,
      title: sourceType === 'project'
        ? `${record.name} (#${record.project_number})`
        : `${record.first_name} ${record.last_name}`,
      content: content,
      embedding: `[${embedding.join(',')}]`, // PostgreSQL vector format
      metadata: {
        [sourceType === 'project' ? 'project_number' : 'email']:
          sourceType === 'project' ? record.project_number : record.email,
        status: record.status,
        updated_at: new Date().toISOString(),
      },
    }

    if (exists) {
      // UPDATE
      const { error } = await supabase
        .from('knowledge_base')
        .update({ ...knowledgeBaseData, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      stats.updated++
      console.log(`   ✅ Updated: ${knowledgeBaseData.title}`)
    } else {
      // INSERT
      const { error } = await supabase
        .from('knowledge_base')
        .insert(knowledgeBaseData)

      if (error) throw error
      stats.created++
      console.log(`   🆕 Created: ${knowledgeBaseData.title}`)
    }

    stats.processed++
  } catch (error: any) {
    stats.errors++
    stats.errorDetails.push({
      id: record.id,
      error: error.message,
    })
    console.error(`   ❌ Error: ${error.message}`)
  }
}

/**
 * Sync projects to knowledge base
 */
async function syncProjects(limit?: number): Promise<SyncStats> {
  console.log('📂 Syncing Projects...\n')

  const stats: SyncStats = {
    processed: 0,
    created: 0,
    updated: 0,
    errors: 0,
    errorDetails: [],
  }

  // Fetch ALL synced project IDs (paginate if needed)
  let allSyncedIds: string[] = []
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data: syncedPage } = await supabase
      .from('knowledge_base')
      .select('source_id')
      .eq('source_type', 'project')
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (!syncedPage || syncedPage.length === 0) break

    allSyncedIds.push(...syncedPage.map(s => s.source_id))
    if (syncedPage.length < pageSize) break
    page++
  }

  // Fetch ALL projects (paginate if needed)
  let allProjects: any[] = []
  let projectPage = 0
  const projectPageSize = 1000

  while (true) {
    const { data: projectsPage, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .range(projectPage * projectPageSize, (projectPage + 1) * projectPageSize - 1)

    if (fetchError) {
      console.error('❌ Error fetching projects:', fetchError)
      return stats
    }

    if (!projectsPage || projectsPage.length === 0) break

    allProjects.push(...projectsPage)
    if (projectsPage.length < projectPageSize) break
    projectPage++
  }

  // Use already-fetched synced IDs
  const syncedIds = new Set(allSyncedIds)

  // Filter to only unsynced projects
  const projects = allProjects.filter(p => !syncedIds.has(p.id))

  console.log(`   Already synced: ${syncedIds.size} projects`)
  console.log(`   Fetched: ${allProjects?.length || 0} projects`)
  console.log(`   To sync: ${projects.length} new projects\n`)

  for (const project of projects) {
    await syncRecord(project, 'project', stats)

    // Rate limit: 500 requests/min for OpenAI
    if (stats.processed % 10 === 0) {
      console.log(`   Progress: ${stats.processed}/${projects.length}`)
      await new Promise(resolve => setTimeout(resolve, 100)) // Small delay
    }
  }

  return stats
}

/**
 * Sync contacts to knowledge base
 */
async function syncContacts(limit?: number): Promise<SyncStats> {
  console.log('📇 Syncing Contacts...\n')

  const stats: SyncStats = {
    processed: 0,
    created: 0,
    updated: 0,
    errors: 0,
    errorDetails: [],
  }

  let query = supabase
    .from('contacts')
    .select('*')
    .eq('is_deleted', false)

  if (limit) {
    query = query.limit(limit)
  } else {
    // Supabase default limit is 1000, so set a higher limit to get all records
    query = query.limit(5000)
  }

  const { data: contacts, error } = await query

  if (error) {
    console.error('❌ Error fetching contacts:', error)
    return stats
  }

  console.log(`Found ${contacts.length} contacts\n`)

  for (const contact of contacts) {
    await syncRecord(contact, 'contact', stats)

    if (stats.processed % 10 === 0) {
      console.log(`   Progress: ${stats.processed}/${contacts.length}`)
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return stats
}

/**
 * Main sync function
 */
async function main() {
  console.log('🚀 Syncing CRM to Knowledge Base (Hybrid RAG)\n')
  console.log('='.repeat(60))

  const args = process.argv.slice(2)
  const limitArg = args.find(arg => arg.startsWith('--limit'))
  const typeArg = args.find(arg => arg.startsWith('--type'))

  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined
  const type = typeArg ? typeArg.split('=')[1] : 'both'

  console.log(`\nOptions:`)
  console.log(`  Limit: ${limit || 'all'}`)
  console.log(`  Type: ${type}\n`)
  console.log('='.repeat(60) + '\n')

  let projectStats: SyncStats | null = null
  let contactStats: SyncStats | null = null

  if (type === 'both' || type === 'projects') {
    projectStats = await syncProjects(limit)
  }

  if (type === 'both' || type === 'contacts') {
    contactStats = await syncContacts(limit)
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 SYNC SUMMARY')
  console.log('='.repeat(60))

  if (projectStats) {
    console.log('\nProjects:')
    console.log(`  🆕 Created:   ${projectStats.created}`)
    console.log(`  🔄 Updated:   ${projectStats.updated}`)
    console.log(`  ❌ Errors:    ${projectStats.errors}`)
    console.log(`  📈 Total:     ${projectStats.processed}`)
  }

  if (contactStats) {
    console.log('\nContacts:')
    console.log(`  🆕 Created:   ${contactStats.created}`)
    console.log(`  🔄 Updated:   ${contactStats.updated}`)
    console.log(`  ❌ Errors:    ${contactStats.errors}`)
    console.log(`  📈 Total:     ${contactStats.processed}`)
  }

  console.log('='.repeat(60))

  // Print error details
  const allErrors = [
    ...(projectStats?.errorDetails || []),
    ...(contactStats?.errorDetails || []),
  ]

  if (allErrors.length > 0) {
    console.log('\n❌ ERROR DETAILS:')
    allErrors.forEach(err => {
      console.log(`\n  ID: ${err.id}`)
      console.log(`  Error: ${err.error}`)
    })
  }

  console.log('\n✨ Sync complete!')
}

// Run
main()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
