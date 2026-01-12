#!/usr/bin/env npx tsx
/**
 * Tennessee Do Not Call List Importer
 *
 * Imports the monthly TN DNC list from the state's tar/zip distribution.
 *
 * Usage:
 *   npx tsx scripts/import-tn-dnc.ts "/path/to/TN Do Not Call.tar"
 *   npx tsx scripts/import-tn-dnc.ts "/path/to/TN Do Not Call/" (extracted folder)
 *
 * What it does:
 *   1. Extracts tar file (if .tar provided)
 *   2. Unzips all area code zip files
 *   3. Parses phone numbers from txt files
 *   4. DELETES all existing state_tn entries for the tenant
 *   5. Bulk inserts new numbers (batched for performance)
 *   6. Records sync job for compliance tracking
 *
 * Requirements:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment
 *   - Or run with: SUPABASE_URL=https://api.jobclarity.io SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx ...
 */

import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// Configuration
const BATCH_SIZE = 5000 // Insert 5000 records at a time
const TENANT_ID = '00000000-0000-0000-0000-000000000000' // Appalachian Storm Restoration

interface ImportStats {
  totalFiles: number
  totalNumbers: number
  inserted: number
  errors: number
  duplicates: number
  startTime: Date
  endTime?: Date
}

function normalizePhoneNumber(phone: string): string {
  // Input is 10 digits like "4235551234"
  // Output is E.164 format "+14235551234"
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return '+1' + digits
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return '+' + digits
  }
  return '+1' + digits
}

async function extractTar(tarPath: string): Promise<string> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tn-dnc-'))
  console.log(`📦 Extracting tar to ${tempDir}...`)
  execSync(`tar -xf "${tarPath}" -C "${tempDir}"`, { stdio: 'inherit' })

  // Find the extracted folder
  const contents = fs.readdirSync(tempDir)
  const folder = contents.find(f => f.includes('Do Not Call'))
  if (folder) {
    return path.join(tempDir, folder)
  }
  return tempDir
}

async function extractZips(folderPath: string): Promise<string[]> {
  const txtFiles: string[] = []
  const zipFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.zip'))

  console.log(`📂 Found ${zipFiles.length} zip files`)

  for (const zipFile of zipFiles) {
    const zipPath = path.join(folderPath, zipFile)
    const txtName = zipFile.replace('.zip', '.txt')
    const txtPath = path.join(folderPath, txtName)

    // Extract zip
    execSync(`unzip -o -q "${zipPath}" -d "${folderPath}"`, { stdio: 'pipe' })

    if (fs.existsSync(txtPath)) {
      txtFiles.push(txtPath)
    }
  }

  return txtFiles
}

function parsePhoneNumbers(txtFiles: string[]): string[] {
  const allNumbers: string[] = []

  for (const txtFile of txtFiles) {
    const content = fs.readFileSync(txtFile, 'utf-8')
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0)

    for (const line of lines) {
      // Validate it's a 10-digit number
      if (/^\d{10}$/.test(line)) {
        allNumbers.push(line)
      }
    }

    const areaCode = path.basename(txtFile).replace(/\D/g, '').slice(-3)
    console.log(`  📄 ${path.basename(txtFile)}: ${lines.length.toLocaleString()} numbers`)
  }

  return allNumbers
}

async function importToDatabase(
  supabase: ReturnType<typeof createClient>,
  phoneNumbers: string[],
  stats: ImportStats
): Promise<void> {
  console.log(`\n🗑️  Deleting existing state_tn entries...`)

  // Delete all existing TN state DNC entries for this tenant
  const { error: deleteError, count: deleteCount } = await supabase
    .from('dnc_registry')
    .delete({ count: 'exact' })
    .eq('tenant_id', TENANT_ID)
    .eq('reason', 'state_dnc')

  if (deleteError) {
    console.error('❌ Error deleting existing entries:', deleteError)
    throw deleteError
  }

  console.log(`  Deleted ${deleteCount?.toLocaleString() || 0} existing entries`)

  console.log(`\n📥 Importing ${phoneNumbers.length.toLocaleString()} numbers in batches of ${BATCH_SIZE}...`)

  const today = new Date().toISOString().split('T')[0]
  let inserted = 0
  let errors = 0

  for (let i = 0; i < phoneNumbers.length; i += BATCH_SIZE) {
    const batch = phoneNumbers.slice(i, i + BATCH_SIZE)

    const records = batch.map(phone => {
      const normalized = normalizePhoneNumber(phone)

      return {
        tenant_id: TENANT_ID,
        phone_number: normalized,
        source: 'state_tn',
        reason: 'state_dnc',
        is_active: true,
      }
    })

    const { error } = await supabase
      .from('dnc_registry')
      .upsert(records, {
        onConflict: 'tenant_id,phone_number',
        ignoreDuplicates: true,
      })

    if (error) {
      console.error(`  ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message)
      errors += batch.length
    } else {
      inserted += batch.length
    }

    // Progress indicator
    const progress = Math.round(((i + batch.length) / phoneNumbers.length) * 100)
    process.stdout.write(`\r  Progress: ${progress}% (${(i + batch.length).toLocaleString()} / ${phoneNumbers.length.toLocaleString()})`)
  }

  console.log('\n')
  stats.inserted = inserted
  stats.errors = errors
}

async function recordSyncJob(
  supabase: ReturnType<typeof createClient>,
  stats: ImportStats
): Promise<void> {
  console.log('📋 Recording sync job for compliance tracking...')

  const nextSyncDue = new Date()
  nextSyncDue.setDate(nextSyncDue.getDate() + 31) // FTC requires 31-day sync

  const { error } = await supabase
    .from('dnc_sync_jobs')
    .insert({
      tenant_id: TENANT_ID,
      sync_type: 'state_tn',
      status: 'completed',
      started_at: stats.startTime.toISOString(),
      completed_at: new Date().toISOString(),
      records_processed: stats.totalNumbers,
      records_added: stats.inserted,
      records_removed: 0,
      next_sync_due: nextSyncDue.toISOString(),
      source_file: 'TN Do Not Call (monthly distribution)',
    })

  if (error) {
    console.error('  ⚠️ Warning: Could not record sync job:', error.message)
  } else {
    console.log('  ✅ Sync job recorded')
  }
}

async function main() {
  const inputPath = process.argv[2]

  if (!inputPath) {
    console.error('Usage: npx tsx scripts/import-tn-dnc.ts "/path/to/TN Do Not Call.tar"')
    console.error('   or: npx tsx scripts/import-tn-dnc.ts "/path/to/TN Do Not Call/"')
    process.exit(1)
  }

  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables:')
    console.error('   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)')
    console.error('   SUPABASE_SERVICE_ROLE_KEY')
    console.error('')
    console.error('Run with:')
    console.error('  SUPABASE_URL=https://api.jobclarity.io \\')
    console.error('  SUPABASE_SERVICE_ROLE_KEY=eyJ... \\')
    console.error('  npx tsx scripts/import-tn-dnc.ts "/path/to/file.tar"')
    process.exit(1)
  }

  console.log('🏁 Tennessee Do Not Call List Importer')
  console.log('=' .repeat(50))
  console.log(`📍 Supabase: ${supabaseUrl}`)
  console.log(`📍 Tenant: ${TENANT_ID}`)
  console.log('')

  const stats: ImportStats = {
    totalFiles: 0,
    totalNumbers: 0,
    inserted: 0,
    errors: 0,
    duplicates: 0,
    startTime: new Date(),
  }

  try {
    // Determine if input is tar file or folder
    let folderPath: string

    if (inputPath.endsWith('.tar')) {
      if (!fs.existsSync(inputPath)) {
        console.error(`❌ File not found: ${inputPath}`)
        process.exit(1)
      }
      folderPath = await extractTar(inputPath)
    } else {
      if (!fs.existsSync(inputPath) || !fs.statSync(inputPath).isDirectory()) {
        console.error(`❌ Folder not found: ${inputPath}`)
        process.exit(1)
      }
      folderPath = inputPath
    }

    // Extract zip files
    const txtFiles = await extractZips(folderPath)
    stats.totalFiles = txtFiles.length

    if (txtFiles.length === 0) {
      console.error('❌ No txt files found after extraction')
      process.exit(1)
    }

    // Parse phone numbers
    console.log('\n📖 Parsing phone numbers...')
    const phoneNumbers = parsePhoneNumbers(txtFiles)
    stats.totalNumbers = phoneNumbers.length

    console.log(`\n📊 Total: ${phoneNumbers.length.toLocaleString()} phone numbers`)

    // Connect to Supabase
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Import to database
    await importToDatabase(supabase, phoneNumbers, stats)

    // Record sync job
    await recordSyncJob(supabase, stats)

    stats.endTime = new Date()
    const duration = (stats.endTime.getTime() - stats.startTime.getTime()) / 1000

    console.log('=' .repeat(50))
    console.log('✅ Import Complete!')
    console.log('')
    console.log(`  Files processed: ${stats.totalFiles}`)
    console.log(`  Numbers parsed:  ${stats.totalNumbers.toLocaleString()}`)
    console.log(`  Numbers inserted: ${stats.inserted.toLocaleString()}`)
    console.log(`  Errors: ${stats.errors}`)
    console.log(`  Duration: ${duration.toFixed(1)} seconds`)
    console.log('')
    console.log(`  Next sync due: ${new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toLocaleDateString()}`)

  } catch (error) {
    console.error('\n❌ Import failed:', error)
    process.exit(1)
  }
}

main()
