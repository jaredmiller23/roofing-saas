#!/usr/bin/env tsx
/**
 * Proline Data Migration Script
 *
 * Migrates 7 CSV files from Proline CRM to new multi-tenant schema:
 * - Total records: ~3,206 projects
 * - Creates contacts (deduplicated)
 * - Creates projects
 * - Links projects to contacts
 * - Preserves financial data, status history, and custom fields
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase credentials')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Default tenant (Demo Company) and user from database
const TENANT_ID = '478d279b-5b8a-4040-a805-75d595d59702'
const SYSTEM_USER_ID = '29e3230c-02d2-4de9-8934-f61db9e9629f' // jaredmiller23@yahoo.com

// CSV file paths
const PROLINE_DIR = `${process.env.HOME}/Library/CloudStorage/GoogleDrive-jaredbmiller78@gmail.com/My Drive/CLIENT_cCAi/Appalachian Storm Restoration/Proline Downloads`

const CSV_FILES = [
  'ProLine_Projects_Export_1734987590363x184116595099697150_9-11-25_20-43-55.csv',
  'ProLine_Projects_Export_1734987590363x184116595099697150_9-11-25_20-50-21.csv',
  'ProLine_Projects_Export_1734987590363x184116595099697150_9-11-25_20-51-33.csv',
  'ProLine_Projects_Export_1734987590363x184116595099697150_9-11-25_20-52-30.csv',
  'Proline New Batch 1.csv',
  'Proline New Batch Leads 2.csv',
  'Proline New Batch Leads 4.csv',
]

interface ProlineRecord {
  'Project Name': string
  'Project Number': string
  'Location': string
  'Status': string
  'Pipeline': string
  'Stage': string
  'Assigned To': string
  'Main Contact First Name': string
  'Main Contact Last Name': string
  'Main Contact Phone': string
  'Main Contact Email': string
  'Main Contact ID': string
  'Address Line 1': string
  'Address Line 2': string
  'City': string
  'State': string
  'Zip': string
  'Category': string
  'Type': string
  'Services': string
  'Tags': string
  'Lead Source': string
  'Referrer Name': string
  'Referrer Email': string
  'Project Notes': string
  'Quoted Value': string
  'Approved Value': string
  'Gross Revenue': string
  'Net Revenue': string
  'Gross Profit': string
  'Gross Margin': string
  'Project Costs': string
  'Created': string
  'Modified': string
  '[Status] Lead Date': string
  '[Status] Inspection Date': string
  '[Status] Open Date': string
  '[Status] Won Date': string
  '[Status] Complete Date': string
  '[Status] Close Date': string
  '[Status] Lost Date': string
  '[Status] Disqualified Date': string
  'ProLine Project ID': string
}

// Map Proline status to our pipeline stages
function mapStatus(status: string, pipeline: string): string {
  const statusLower = status.toLowerCase()

  if (statusLower.includes('complete') || statusLower.includes('close')) return 'won'
  if (statusLower.includes('lost') || statusLower.includes('disqualified')) return 'lost'
  if (statusLower.includes('won')) return 'won'
  if (statusLower.includes('inspection')) return 'proposal'
  if (statusLower.includes('open')) return 'negotiation'

  return 'lead' // Default to lead
}

// Normalize phone numbers
function normalizePhone(phone: string): string {
  if (!phone) return ''
  return phone.replace(/\D/g, '').slice(-10) // Last 10 digits
}

// Parse CSV value
function parseValue(value: string): number {
  if (!value) return 0
  const parsed = parseFloat(value.replace(/[$,]/g, ''))
  return isNaN(parsed) ? 0 : parsed
}

async function main() {
  console.log('🚀 Starting Proline Data Migration\n')

  // Step 1: Read all CSV files
  console.log('📖 Step 1: Reading CSV files...')
  const allRecords: ProlineRecord[] = []

  for (const file of CSV_FILES) {
    const filePath = `${PROLINE_DIR}/${file}`
    console.log(`   Reading: ${file}`)

    try {
      const csvContent = readFileSync(filePath, 'utf-8')
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      })

      allRecords.push(...records)
      console.log(`   ✅ Loaded ${records.length} records`)
    } catch (error) {
      console.error(`   ❌ Failed to read ${file}:`, error)
    }
  }

  console.log(`\n📊 Total records loaded: ${allRecords.length}\n`)

  // Step 2: Extract and deduplicate contacts
  console.log('👥 Step 2: Extracting contacts...')
  const contactsMap = new Map<string, any>()

  for (const record of allRecords) {
    const email = record['Main Contact Email']?.trim().toLowerCase()
    const phone = normalizePhone(record['Main Contact Phone'])
    const firstName = record['Main Contact First Name']
    const lastName = record['Main Contact Last Name']

    // Create unique key (prefer email, fallback to phone)
    const key = email || phone || `${firstName}_${lastName}_${Math.random()}`

    if (!contactsMap.has(key)) {
      const addressStreet = [record['Address Line 1'], record['Address Line 2']]
        .filter(Boolean)
        .join(', ')

      contactsMap.set(key, {
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        phone: phone || null,
        address_street: addressStreet || null,
        address_city: record['City'] || null,
        address_state: record['State'] || null,
        address_zip: record['Zip'] || null,
        tenant_id: TENANT_ID,
        created_by: SYSTEM_USER_ID,
        source: record['Lead Source'] || 'Proline Import',
        proline_contact_id: record['Main Contact ID'],
      })
    }
  }

  console.log(`   Found ${contactsMap.size} unique contacts\n`)

  // Step 3: Insert contacts
  console.log('💾 Step 3: Importing contacts to database...')
  const contactsToInsert = Array.from(contactsMap.values()).map(contact => ({
    ...contact,
    custom_fields: {
      proline_contact_id: contact.proline_contact_id
    }
  }))

  // Remove proline_contact_id from top level (store in custom_fields)
  contactsToInsert.forEach(c => delete c.proline_contact_id)

  const contactsResult = await supabase
    .from('contacts')
    .insert(contactsToInsert)
    .select('id, email, phone, custom_fields')

  if (contactsResult.error) {
    console.error('❌ Failed to insert contacts:', contactsResult.error)
    throw contactsResult.error
  }

  console.log(`   ✅ Inserted ${contactsResult.data.length} contacts\n`)

  // Create lookup map for contacts
  const contactLookup = new Map<string, string>()
  contactsResult.data.forEach((contact: any) => {
    const prolineId = contact.custom_fields?.proline_contact_id
    const key = contact.email?.toLowerCase() || contact.phone || prolineId
    if (key) {
      contactLookup.set(key, contact.id)
    }
  })

  // Step 4: Create projects
  console.log('📋 Step 4: Importing projects to database...')
  const projectsToInsert = allRecords.map(record => {
    // Find contact ID
    const email = record['Main Contact Email']?.trim().toLowerCase()
    const phone = normalizePhone(record['Main Contact Phone'])
    const contactId = contactLookup.get(email || phone)

    if (!contactId) {
      console.warn(`⚠️  No contact found for project: ${record['Project Name']}`)
    }

    // Calculate profit margin if we have gross revenue and profit
    const grossRevenue = parseValue(record['Gross Revenue'])
    const grossProfit = parseValue(record['Gross Profit'])
    const profitMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) : 0

    return {
      name: record['Project Name'],
      contact_id: contactId,
      tenant_id: TENANT_ID,
      created_by: SYSTEM_USER_ID,
      status: mapStatus(record['Status'], record['Pipeline']),
      type: record['Type'] || 'roofing',
      project_number: record['Project Number'],
      // Financial fields (map to actual schema)
      estimated_value: parseValue(record['Quoted Value']) || parseValue(record['Approved Value']),
      approved_value: parseValue(record['Approved Value']),
      final_value: grossRevenue > 0 ? grossRevenue : null,
      profit_margin: profitMargin,
      // Description
      description: record['Project Notes'] || '',
      scope_of_work: record['Services'] || '',
      // Dates
      created_at: record['Created'] || new Date().toISOString(),
      updated_at: record['Modified'] || new Date().toISOString(),
      estimated_start: record['[Status] Open Date'] || null,
      actual_start: record['[Status] Open Date'] || null,
      actual_completion: record['[Status] Complete Date'] || record['[Status] Close Date'] || null,
      // Custom fields for Proline-specific data
      custom_fields: {
        proline_project_id: record['ProLine Project ID'],
        proline_pipeline: record['Pipeline'],
        proline_stage: record['Stage'],
        proline_category: record['Category'],
        assigned_to: record['Assigned To'],
        lead_source: record['Lead Source'],
        referrer_name: record['Referrer Name'],
        referrer_email: record['Referrer Email'],
        location: record['Location'],
        address_line_1: record['Address Line 1'],
        address_line_2: record['Address Line 2'],
        city: record['City'],
        state: record['State'],
        zip: record['Zip'],
        gross_revenue: grossRevenue,
        net_revenue: parseValue(record['Net Revenue']),
        gross_profit: grossProfit,
        gross_margin: parseValue(record['Gross Margin']),
        project_costs: parseValue(record['Project Costs']),
        status_dates: {
          lead: record['[Status] Lead Date'] || null,
          inspection: record['[Status] Inspection Date'] || null,
          open: record['[Status] Open Date'] || null,
          won: record['[Status] Won Date'] || null,
          complete: record['[Status] Complete Date'] || null,
          close: record['[Status] Close Date'] || null,
          disqualified: record['[Status] Disqualified Date'] || null,
          lost: record['[Status] Lost Date'] || null,
        },
        tags: record['Tags'] ? record['Tags'].split(',').map((t: string) => t.trim()) : [],
      }
    }
  })

  // Insert in batches of 100
  const BATCH_SIZE = 100
  let insertedCount = 0

  for (let i = 0; i < projectsToInsert.length; i += BATCH_SIZE) {
    const batch = projectsToInsert.slice(i, i + BATCH_SIZE)
    const result = await supabase.from('projects').insert(batch)

    if (result.error) {
      console.error(`❌ Failed to insert batch ${i / BATCH_SIZE + 1}:`, result.error)
    } else {
      insertedCount += batch.length
      console.log(`   ✅ Inserted batch ${i / BATCH_SIZE + 1}/${Math.ceil(projectsToInsert.length / BATCH_SIZE)} (${insertedCount}/${projectsToInsert.length})`)
    }
  }

  console.log(`\n✅ Migration Complete!\n`)
  console.log('📊 Summary:')
  console.log(`   Contacts: ${contactsResult.data.length} imported`)
  console.log(`   Projects: ${insertedCount} imported`)
  console.log(`   Total records processed: ${allRecords.length}`)
  console.log('')
  console.log('🎉 Data migration successful!')
  console.log('   Navigate to http://localhost:3000/contacts to view imported data')
}

main().catch(console.error)
