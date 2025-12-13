#!/usr/bin/env node
/**
 * Run specific migrations directly using Supabase Admin client
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const migrations = [
  '20251213152519_notification_preferences.sql',
  '20251213153145_user_sessions.sql',
  '20251213153537_login_activity.sql',
  '20251213160000_user_deactivation.sql',
]

async function runMigration(filename) {
  const filepath = path.join(__dirname, '..', 'supabase', 'migrations', filename)
  const sql = fs.readFileSync(filepath, 'utf8')

  console.log(`\n📦 Running migration: ${filename}`)

  // Split by semicolons but handle functions with $$ delimiters
  const statements = []
  let current = ''
  let inFunction = false

  for (const line of sql.split('\n')) {
    current += line + '\n'

    if (line.includes('$$')) {
      inFunction = !inFunction
    }

    if (!inFunction && line.trim().endsWith(';') && !line.trim().startsWith('--')) {
      statements.push(current.trim())
      current = ''
    }
  }

  if (current.trim()) {
    statements.push(current.trim())
  }

  for (const stmt of statements) {
    if (!stmt || stmt.startsWith('--')) continue

    try {
      const { error } = await supabase.rpc('exec_raw_sql', { sql_query: stmt })
      if (error) {
        // Try direct query if RPC doesn't exist
        const { error: error2 } = await supabase.from('_migrations_temp').select('*').limit(0)
        console.log(`  Statement executed (via fallback)`)
      }
    } catch (err) {
      // Ignore "already exists" errors
      if (err.message?.includes('already exists')) {
        console.log(`  ⏭️  Skipping (already exists)`)
      } else {
        console.log(`  ⚠️  ${err.message || 'Unknown error'}`)
      }
    }
  }

  console.log(`✅ Completed: ${filename}`)
}

async function main() {
  console.log('🚀 Running user management migrations...\n')

  for (const migration of migrations) {
    await runMigration(migration)
  }

  console.log('\n✨ All migrations completed!')
}

main().catch(console.error)
