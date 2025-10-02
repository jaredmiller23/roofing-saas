/**
 * Import Enzy Leads into Contacts
 *
 * This script imports lead data from Enzy (door-knocking app) into the contacts table.
 * Uses name matching to update existing contacts or create new ones.
 *
 * Usage:
 *   npx tsx scripts/import-enzy-leads.ts <json-file-path>
 *
 * Example:
 *   npx tsx scripts/import-enzy-leads.ts data/enzy-leads.json
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
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

interface EnzyLead {
  customerName: string
  setter: string
  closer: string
  address: string
  appointment: string
  team: string
  leadStatus: string
}

interface ImportStats {
  processed: number
  created: number
  updated: number
  skipped: number
  errors: number
  errorDetails: Array<{ lead: string; error: string }>
}

/**
 * Parse full name into first and last name
 */
function parseName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim()
  const parts = trimmed.split(/\s+/)

  if (parts.length === 0) {
    return { firstName: '', lastName: '' }
  } else if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' }
  } else {
    const firstName = parts[0]
    const lastName = parts.slice(1).join(' ')
    return { firstName, lastName }
  }
}

/**
 * Parse address into components
 */
function parseAddress(fullAddress: string): {
  street: string
  city: string
  state: string
  zip: string
} {
  // Example: "244 Stone Edge Cir, Kingsport, TN 37660, USA"
  const parts = fullAddress.split(',').map(p => p.trim())

  if (parts.length < 3) {
    return {
      street: fullAddress,
      city: '',
      state: '',
      zip: '',
    }
  }

  const street = parts[0] || ''
  const city = parts[1] || ''

  // Extract state and zip from "TN 37660"
  const stateZip = parts[2]?.split(/\s+/) || []
  const state = stateZip[0] || ''
  const zip = stateZip[1] || ''

  return { street, city, state, zip }
}

/**
 * Check if contact exists by name matching
 */
async function findContactByName(
  firstName: string,
  lastName: string
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from('contacts')
    .select('id')
    .eq('tenant_id', DEFAULT_TENANT_ID)
    .eq('first_name', firstName)
    .eq('last_name', lastName)
    .eq('is_deleted', false)
    .maybeSingle()

  if (error) {
    console.error(`Error checking contact:`, error)
    return null
  }

  return data
}

/**
 * Import a single Enzy lead
 */
async function importLead(lead: EnzyLead, stats: ImportStats): Promise<void> {
  try {
    const { firstName, lastName } = parseName(lead.customerName)

    if (!firstName) {
      stats.skipped++
      console.log(`⏭️  Skipped: Empty name`)
      return
    }

    // Parse address
    const address = parseAddress(lead.address)

    // Check if contact exists
    const existing = await findContactByName(firstName, lastName)

    const contactData = {
      tenant_id: DEFAULT_TENANT_ID,
      first_name: firstName,
      last_name: lastName,
      address_street: address.street,
      address_city: address.city,
      address_state: address.state,
      address_zip: address.zip,
      type: 'lead',
      stage: 'lead',
      source: 'enzy',
      custom_fields: {
        enzy_lead_status: lead.leadStatus,
        enzy_setter: lead.setter,
        enzy_closer: lead.closer,
        enzy_appointment: lead.appointment,
        enzy_team: lead.team,
        imported_at: new Date().toISOString(),
      },
    }

    if (existing) {
      // UPDATE existing contact
      const { error: updateError } = await supabase
        .from('contacts')
        .update({
          ...contactData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (updateError) {
        throw updateError
      }

      stats.updated++
      console.log(`♻️  Updated: ${firstName} ${lastName}`)
    } else {
      // CREATE new contact
      const { error: createError } = await supabase
        .from('contacts')
        .insert(contactData)

      if (createError) {
        throw createError
      }

      stats.created++
      console.log(`🆕 Created: ${firstName} ${lastName}`)
    }

    stats.processed++
  } catch (error: any) {
    stats.errors++
    stats.errorDetails.push({
      lead: lead.customerName,
      error: error.message,
    })
    console.error(`❌ Error importing ${lead.customerName}:`, error.message)
  }
}

/**
 * Main import function
 */
async function importEnzyLeads(jsonFilePath: string): Promise<void> {
  console.log('🚀 Importing Enzy Leads\n')
  console.log('='.repeat(60))
  console.log(`File: ${jsonFilePath}`)
  console.log(`Tenant: ${DEFAULT_TENANT_ID}\n`)
  console.log('='.repeat(60) + '\n')

  const stats: ImportStats = {
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
  }

  // Read JSON file
  console.log('📖 Reading JSON file...')
  const fileContent = fs.readFileSync(jsonFilePath, 'utf-8')
  const data = JSON.parse(fileContent)

  // Handle both array and object with leads array
  const leads: EnzyLead[] = Array.isArray(data) ? data : data.leads || []

  console.log(`✅ Found ${leads.length} leads\n`)

  // Process each lead
  console.log('⚙️  Processing leads...\n')

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i]
    await importLead(lead, stats)

    // Progress indicator
    if ((i + 1) % 10 === 0) {
      console.log(`   Progress: ${i + 1}/${leads.length}`)
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 IMPORT SUMMARY')
  console.log('='.repeat(60))
  console.log(`🆕 Created:    ${stats.created}`)
  console.log(`♻️  Updated:    ${stats.updated}`)
  console.log(`⏭️  Skipped:    ${stats.skipped}`)
  console.log(`❌ Errors:     ${stats.errors}`)
  console.log(`📈 Total:      ${stats.processed}`)
  console.log('='.repeat(60))

  // Print errors if any
  if (stats.errorDetails.length > 0) {
    console.log('\n❌ ERROR DETAILS:')
    stats.errorDetails.forEach((err) => {
      console.log(`\n  Lead: ${err.lead}`)
      console.log(`  Error: ${err.error}`)
    })
  }

  console.log('\n✨ Import complete!')
}

// CLI execution
const args = process.argv.slice(2)

if (args.length === 0) {
  console.error('Usage: npx tsx scripts/import-enzy-leads.ts <json-file-path>')
  console.error('\nExample:')
  console.error('  npx tsx scripts/import-enzy-leads.ts data/enzy-leads.json')
  process.exit(1)
}

const jsonFilePath = args[0]

if (!fs.existsSync(jsonFilePath)) {
  console.error(`❌ File not found: ${jsonFilePath}`)
  process.exit(1)
}

// Run import
importEnzyLeads(jsonFilePath)
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
