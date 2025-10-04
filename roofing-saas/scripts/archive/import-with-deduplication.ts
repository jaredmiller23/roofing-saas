/**
 * Proline Data Import Script with Deduplication
 *
 * This script safely imports projects from Proline CSV exports.
 * Uses proline_id as unique key to prevent duplicates.
 * Can be run multiple times - will update existing records instead of creating duplicates.
 *
 * Usage:
 *   npx tsx scripts/import-with-deduplication.ts <csv-file-path>
 *
 * Example:
 *   npx tsx scripts/import-with-deduplication.ts exports/proline_sales_insurance_complete.csv
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') })

// Supabase configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface ImportStats {
  created: number
  updated: number
  skipped: number
  errors: number
  errorDetails: Array<{ row: number; error: string; data?: any }>
}

interface ProlineProject {
  proline_id: string
  project_number: string
  name: string
  status: string
  pipeline: string
  stage: string
  // Add more fields as they appear in CSV
  [key: string]: any
}

/**
 * Parse CSV file and return array of records
 */
function parseCSV(filePath: string): ProlineProject[] {
  const fileContent = fs.readFileSync(filePath, 'utf-8')

  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  })

  return records
}

/**
 * Map CSV row to our database schema
 */
function mapProlineToProject(row: any, tenantId: string): any {
  return {
    tenant_id: tenantId,
    proline_id: row['ProLine Project ID'] || row['ProLine ID'] || row['proline_id'] || row['ID'],
    project_number: row['Project Number'] || row['project_number'],
    name: row['Project Name'] || row['Name'] || row['name'],
    status: (row['Status'] || row['status'] || '').toLowerCase(),
    type: row['Type'] || row['type'],

    // Contact association (we'll need to look up contact by email/name)
    // For now, store raw data in custom_fields

    // Financial fields
    estimated_value: parseFloat(row['Estimated Value']) || null,
    approved_value: parseFloat(row['Approved Value']) || null,
    final_value: parseFloat(row['Final Value']) || null,
    profit_margin: parseFloat(row['Profit Margin']) || null,

    // Description fields
    description: row['Description'] || row['Notes'],
    scope_of_work: row['Scope of Work'] || row['Services'],

    // Dates
    estimated_start: row['Estimated Start'] || null,
    actual_start: row['Actual Start'] || null,
    actual_completion: row['Actual Completion'] || null,

    // Custom fields (store all extra Proline data)
    custom_fields: {
      proline_pipeline: row['Pipeline'],
      proline_stage: row['Stage'],
      assigned_to: row['Assignee'] || row['Assigned To'],
      inside_sales: row['Inside Sales'],
      production: row['Production'],
      accounting: row['Accounting'],
      adjuster: row['Adjuster'],
      alternate_contact: row['Alternate Contact'],
      organization: row['Organization'],
      category: row['Category'],
      services: row['Services'],
      tags: row['Tags'] ? row['Tags'].split(',').map((t: string) => t.trim()) : [],

      // Insurance fields
      carrier: row['Carrier'],
      policy_number: row['Policy Number'],
      claim_number: row['Claim Number'],
      square_count: row['Square Count'],

      // Location
      area: row['Area'],
      location: row['Location'],

      // Portal
      project_portal_url: row['Project Portal URL'],

      // Raw CSV data (for any fields we missed)
      raw_import_data: row,
    },
  }
}

/**
 * Check if project exists by proline_id
 */
async function projectExists(prolineId: string): Promise<{ exists: boolean; id?: string }> {
  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('proline_id', prolineId)
    .maybeSingle()

  if (error) {
    console.error(`Error checking project existence:`, error)
    return { exists: false }
  }

  return { exists: !!data, id: data?.id }
}

/**
 * Upsert project (insert or update based on proline_id)
 */
async function upsertProject(projectData: any, stats: ImportStats, rowNumber: number): Promise<void> {
  const prolineId = projectData.proline_id

  if (!prolineId) {
    stats.skipped++
    stats.errorDetails.push({
      row: rowNumber,
      error: 'Missing proline_id',
      data: projectData,
    })
    return
  }

  try {
    // Check if exists
    const { exists, id } = await projectExists(prolineId)

    if (exists) {
      // UPDATE existing project
      const { error } = await supabase
        .from('projects')
        .update({
          ...projectData,
          updated_at: new Date().toISOString(),
        })
        .eq('proline_id', prolineId)

      if (error) throw error

      stats.updated++
      console.log(`✅ Updated: ${projectData.name} (${prolineId})`)
    } else {
      // INSERT new project
      const { error } = await supabase
        .from('projects')
        .insert(projectData)

      if (error) throw error

      stats.created++
      console.log(`🆕 Created: ${projectData.name} (${prolineId})`)
    }
  } catch (error: any) {
    stats.errors++
    stats.errorDetails.push({
      row: rowNumber,
      error: error.message,
      data: projectData,
    })
    console.error(`❌ Error on row ${rowNumber}:`, error.message)
  }
}

/**
 * Main import function
 */
async function importProjects(csvFilePath: string, tenantId: string): Promise<void> {
  console.log('🚀 Starting Proline data import with deduplication...\n')
  console.log(`📁 File: ${csvFilePath}`)
  console.log(`🏢 Tenant ID: ${tenantId}\n`)

  const stats: ImportStats = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
  }

  // Parse CSV
  console.log('📖 Parsing CSV file...')
  const records = parseCSV(csvFilePath)
  console.log(`✅ Found ${records.length} records\n`)

  // Process each record
  console.log('⚙️  Processing records...\n')

  for (let i = 0; i < records.length; i++) {
    const row = records[i]
    const projectData = mapProlineToProject(row, tenantId)
    await upsertProject(projectData, stats, i + 1)

    // Progress indicator every 10 records
    if ((i + 1) % 10 === 0) {
      console.log(`   Progress: ${i + 1}/${records.length} records processed`)
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 IMPORT SUMMARY')
  console.log('='.repeat(60))
  console.log(`🆕 Created:  ${stats.created} new projects`)
  console.log(`🔄 Updated:  ${stats.updated} existing projects`)
  console.log(`⏭️  Skipped:  ${stats.skipped} records (missing data)`)
  console.log(`❌ Errors:   ${stats.errors} failed`)
  console.log(`📈 Total:    ${stats.created + stats.updated} projects in database`)
  console.log('='.repeat(60))

  // Print errors if any
  if (stats.errorDetails.length > 0) {
    console.log('\n❌ ERROR DETAILS:')
    stats.errorDetails.forEach((err) => {
      console.log(`\nRow ${err.row}: ${err.error}`)
      if (err.data) {
        console.log(`Data: ${JSON.stringify(err.data, null, 2)}`)
      }
    })
  }

  console.log('\n✨ Import complete!')
}

// CLI execution
const args = process.argv.slice(2)

if (args.length === 0) {
  console.error('Usage: npx tsx scripts/import-with-deduplication.ts <csv-file-path> [tenant-id]')
  console.error('\nExample:')
  console.error('  npx tsx scripts/import-with-deduplication.ts exports/proline_complete.csv')
  process.exit(1)
}

const csvFilePath = args[0]
const tenantId = args[1] || process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000000'

if (!fs.existsSync(csvFilePath)) {
  console.error(`❌ File not found: ${csvFilePath}`)
  process.exit(1)
}

// Run import
importProjects(csvFilePath, tenantId)
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
