/**
 * Extract Contacts from Imported Projects
 *
 * Creates contact records from project data and links projects to contacts.
 * Each project in Proline is associated with a customer/contact.
 *
 * Usage:
 *   npx tsx scripts/extract-contacts-from-projects.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import * as path from 'path'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || '478d279b-5b8a-4040-a805-75d595d59702'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface Stats {
  processed: number
  created: number
  updated: number
  linked: number
  errors: number
}

async function extractContacts() {
  console.log('🔍 Extracting contacts from projects...\n')

  const stats: Stats = {
    processed: 0,
    created: 0,
    updated: 0,
    linked: 0,
    errors: 0,
  }

  // Fetch all projects (including those already linked to contacts)
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .eq('tenant_id', DEFAULT_TENANT_ID)
    .eq('is_deleted', false)

  if (error || !projects) {
    console.error('❌ Error fetching projects:', error)
    return stats
  }

  console.log(`Found ${projects.length} projects to process\n`)

  // Group projects by contact name to avoid duplicates
  const contactMap = new Map<string, any[]>()

  for (const project of projects) {
    const name = project.name?.trim()
    if (!name) continue

    if (!contactMap.has(name)) {
      contactMap.set(name, [])
    }
    contactMap.get(name)!.push(project)
  }

  console.log(`Found ${contactMap.size} unique contact names\n`)

  // Create contacts and link projects
  for (const [contactName, relatedProjects] of contactMap.entries()) {
    stats.processed++

    try {
      // Parse name (basic: first word = first name, rest = last name)
      const nameParts = contactName.split(' ')
      const firstName = nameParts[0] || contactName
      const lastName = nameParts.slice(1).join(' ') || ''

      // Extract contact details from first project's raw data
      const firstProject = relatedProjects[0]
      const rawData = firstProject.custom_fields?.raw_import_data || {}

      const email = rawData['Main Contact Email']?.toLowerCase() || null
      const phone = rawData['Main Contact Phone'] || null
      const addressStreet = rawData['Address Line 1'] || null
      const addressCity = rawData['City'] || null
      const addressState = rawData['State'] || null
      const addressZip = rawData['Zip'] || null

      // Determine stage from project status
      const projectStatus = rawData['Status']?.toLowerCase() || ''
      let stage = 'lead' // default
      if (projectStatus === 'won' || projectStatus === 'complete') {
        stage = 'customer'
      } else if (projectStatus === 'lost') {
        stage = 'lost'
      }

      // Check if contact already exists
      const { data: existing } = await supabase
        .from('contacts')
        .select('id')
        .eq('tenant_id', DEFAULT_TENANT_ID)
        .eq('first_name', firstName)
        .eq('last_name', lastName)
        .maybeSingle()

      let contactId: string

      const contactData = {
        tenant_id: DEFAULT_TENANT_ID,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        address_street: addressStreet,
        address_city: addressCity,
        address_state: addressState,
        address_zip: addressZip,
        type: 'customer',
        stage,
      }

      if (existing) {
        // UPDATE existing contact with email/phone/address
        const { error: updateError } = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', existing.id)

        if (updateError) {
          console.error(`❌ Error updating contact ${contactName}:`, updateError.message)
          stats.errors++
          continue
        }

        contactId = existing.id
        stats.updated++
        console.log(`♻️  Updated: ${contactName}`)
      } else {
        // Create new contact
        const { data: newContact, error: createError } = await supabase
          .from('contacts')
          .insert(contactData)
          .select('id')
          .single()

        if (createError || !newContact) {
          console.error(`❌ Error creating contact ${contactName}:`, createError?.message)
          stats.errors++
          continue
        }

        contactId = newContact.id
        stats.created++
        console.log(`🆕 Created: ${contactName}`)
      }

      // Link all related projects to this contact
      const projectIds = relatedProjects.map(p => p.id)
      const { error: linkError } = await supabase
        .from('projects')
        .update({ contact_id: contactId })
        .in('id', projectIds)

      if (linkError) {
        console.error(`❌ Error linking projects for ${contactName}:`, linkError.message)
        stats.errors++
      } else {
        stats.linked += projectIds.length
      }

      // Progress indicator
      if (stats.processed % 100 === 0) {
        console.log(`   Progress: ${stats.processed}/${contactMap.size}`)
      }

    } catch (error: any) {
      console.error(`❌ Error processing ${contactName}:`, error.message)
      stats.errors++
    }
  }

  return stats
}

async function main() {
  console.log('🚀 Contact Extraction from Projects\n')
  console.log('='.repeat(60))
  console.log(`Tenant: ${DEFAULT_TENANT_ID}\n`)
  console.log('='.repeat(60) + '\n')

  const stats = await extractContacts()

  console.log('\n' + '='.repeat(60))
  console.log('📊 EXTRACTION SUMMARY')
  console.log('='.repeat(60))
  console.log(`🆕 Contacts Created:  ${stats.created}`)
  console.log(`♻️  Contacts Found:    ${stats.updated}`)
  console.log(`🔗 Projects Linked:   ${stats.linked}`)
  console.log(`❌ Errors:            ${stats.errors}`)
  console.log(`📈 Total Processed:   ${stats.processed}`)
  console.log('='.repeat(60))

  console.log('\n✨ Extraction complete!')
}

main()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
