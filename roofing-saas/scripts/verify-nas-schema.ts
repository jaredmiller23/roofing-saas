#!/usr/bin/env npx tsx
/**
 * NAS Schema Verification Script
 *
 * Audits the NAS Supabase database to find schema mismatches
 * between what the app code expects and what actually exists.
 *
 * Usage:
 *   SUPABASE_URL=https://api.jobclarity.io \
 *   SUPABASE_SERVICE_ROLE_KEY=xxx \
 *   npx tsx scripts/verify-nas-schema.ts
 *
 * Requires: exec_sql and query_sql functions created on NAS
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface ColumnCheck {
  column: string
  type: string
  required: boolean
  codeLocation?: string
}

interface TableCheck {
  table: string
  columns: ColumnCheck[]
  critical: boolean
}

// Define what the app expects
const EXPECTED_SCHEMA: TableCheck[] = [
  {
    table: 'dnc_registry',
    critical: true,
    columns: [
      { column: 'id', type: 'uuid', required: true },
      { column: 'tenant_id', type: 'uuid', required: true },
      { column: 'phone_number', type: 'text', required: true },
      { column: 'phone_hash', type: 'text', required: false, codeLocation: 'dnc-service.ts:42' },
      { column: 'area_code', type: 'text', required: false, codeLocation: 'dnc-service.ts:121' },
      { column: 'source', type: 'text', required: true },
      { column: 'reason', type: 'text', required: false },
      { column: 'is_active', type: 'boolean', required: true, codeLocation: 'dnc-service.ts:259' },
      { column: 'expires_at', type: 'timestamptz', required: false },
      { column: 'listed_date', type: 'date', required: false, codeLocation: 'dnc-service.ts:137' },
      { column: 'metadata', type: 'jsonb', required: false, codeLocation: 'dnc-service.ts:138' },
      { column: 'added_by', type: 'uuid', required: false },
      { column: 'added_at', type: 'timestamptz', required: false },
    ],
  },
  {
    table: 'call_compliance_log',
    critical: true,
    columns: [
      { column: 'id', type: 'uuid', required: true },
      { column: 'tenant_id', type: 'uuid', required: true },
      { column: 'contact_id', type: 'uuid', required: false },
      { column: 'call_log_id', type: 'uuid', required: false },
      { column: 'user_id', type: 'uuid', required: false, codeLocation: 'call-compliance.ts:351' },
      { column: 'phone_number', type: 'text', required: true },
      { column: 'check_type', type: 'text', required: true, codeLocation: 'call-compliance.ts:353' },
      { column: 'result', type: 'text', required: true, codeLocation: 'call-compliance.ts:354' },
      { column: 'reason', type: 'text', required: false },
      { column: 'dnc_source', type: 'text', required: false, codeLocation: 'call-compliance.ts:356' },
      { column: 'contact_timezone', type: 'text', required: false },
      { column: 'contact_local_time', type: 'text', required: false },
      { column: 'metadata', type: 'jsonb', required: false },
      { column: 'created_at', type: 'timestamptz', required: true },
    ],
  },
  {
    table: 'dnc_sync_jobs',
    critical: true,
    columns: [
      { column: 'id', type: 'uuid', required: true },
      { column: 'tenant_id', type: 'uuid', required: true },
      { column: 'sync_type', type: 'text', required: true },
      { column: 'status', type: 'text', required: true },
      { column: 'started_at', type: 'timestamptz', required: false },
      { column: 'completed_at', type: 'timestamptz', required: false },
      { column: 'records_processed', type: 'integer', required: false },
      { column: 'records_added', type: 'integer', required: false },
      { column: 'records_removed', type: 'integer', required: false },
      { column: 'next_sync_due', type: 'timestamptz', required: false },
      { column: 'source_file', type: 'text', required: false },
    ],
  },
  {
    table: 'call_opt_out_queue',
    critical: true,
    columns: [
      { column: 'id', type: 'uuid', required: true },
      { column: 'tenant_id', type: 'uuid', required: true },
      { column: 'contact_id', type: 'uuid', required: false },
      { column: 'phone_number', type: 'text', required: true },
      { column: 'opt_out_requested_at', type: 'timestamptz', required: true },
      { column: 'deadline', type: 'timestamptz', required: true },
      { column: 'processed_at', type: 'timestamptz', required: false },
      { column: 'status', type: 'text', required: true },
    ],
  },
  {
    table: 'contacts',
    critical: false, // Table exists, just checking columns
    columns: [
      { column: 'call_opt_out', type: 'boolean', required: false, codeLocation: 'call-compliance.ts:92' },
      { column: 'call_opt_out_date', type: 'timestamptz', required: false },
      { column: 'call_consent', type: 'text', required: false, codeLocation: 'call-compliance.ts:78' },
      { column: 'call_consent_date', type: 'timestamptz', required: false },
      { column: 'dnc_status', type: 'text', required: false, codeLocation: 'call-compliance.ts:78' },
      { column: 'dnc_check_date', type: 'timestamptz', required: false },
      { column: 'dnc_internal_listed', type: 'boolean', required: false, codeLocation: 'dnc-service.ts:162' },
      { column: 'dnc_last_checked', type: 'timestamptz', required: false, codeLocation: 'dnc-service.ts:163' },
    ],
  },
  {
    table: 'activities',
    critical: false,
    columns: [
      { column: 'is_deleted', type: 'boolean', required: false, codeLocation: 'multiple compliance files' },
    ],
  },
]

interface SchemaResult {
  table: string
  exists: boolean
  missingColumns: string[]
  existingColumns: string[]
  critical: boolean
}

async function checkTableExists(tableName: string): Promise<boolean> {
  // Try to query the table - if it doesn't exist, we get PGRST205
  const { error } = await supabase.from(tableName).select('*').limit(0)

  if (error?.code === 'PGRST205') {
    return false
  }
  return true
}

async function getTableColumns(tableName: string): Promise<string[]> {
  // Use query_sql to get column info from information_schema
  const { data, error } = await supabase.rpc('query_sql', {
    sql_text: `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = '${tableName}'
      ORDER BY ordinal_position
    `,
  })

  if (error) {
    console.error(`Error querying columns for ${tableName}:`, error.message)
    return []
  }

  if (!data || !Array.isArray(data)) {
    return []
  }

  return data.map((row: { column_name: string }) => row.column_name)
}

async function verifySchema(): Promise<SchemaResult[]> {
  const results: SchemaResult[] = []

  console.log('🔍 NAS Schema Verification')
  console.log('=' .repeat(60))
  console.log(`📍 Supabase: ${supabaseUrl}`)
  console.log('')

  // First, check if query_sql function exists
  const { error: rpcError } = await supabase.rpc('query_sql', {
    sql_text: 'SELECT 1 as test',
  })

  if (rpcError) {
    console.error('❌ query_sql function not available!')
    console.error('   Please run the exec_sql setup SQL on NAS first.')
    console.error('   Error:', rpcError.message)
    process.exit(1)
  }

  console.log('✅ query_sql function available\n')

  for (const check of EXPECTED_SCHEMA) {
    console.log(`Checking ${check.table}...`)

    const exists = await checkTableExists(check.table)

    if (!exists) {
      console.log(`  ❌ Table does not exist${check.critical ? ' (CRITICAL)' : ''}`)
      results.push({
        table: check.table,
        exists: false,
        missingColumns: check.columns.map((c) => c.column),
        existingColumns: [],
        critical: check.critical,
      })
      continue
    }

    console.log(`  ✅ Table exists`)

    const existingColumns = await getTableColumns(check.table)
    const expectedColumns = check.columns.map((c) => c.column)
    const missingColumns = expectedColumns.filter((col) => !existingColumns.includes(col))

    if (missingColumns.length > 0) {
      console.log(`  ⚠️  Missing columns: ${missingColumns.join(', ')}`)
    } else {
      console.log(`  ✅ All expected columns present`)
    }

    results.push({
      table: check.table,
      exists: true,
      missingColumns,
      existingColumns,
      critical: check.critical,
    })
  }

  return results
}

function generateCorrectiveSQL(results: SchemaResult[]): string {
  const statements: string[] = []

  statements.push('-- NAS Schema Corrections')
  statements.push('-- Generated: ' + new Date().toISOString())
  statements.push('-- Run this SQL to fix schema mismatches')
  statements.push('')

  for (const result of results) {
    if (!result.exists) {
      // Generate CREATE TABLE
      const tableCheck = EXPECTED_SCHEMA.find((t) => t.table === result.table)
      if (tableCheck) {
        statements.push(`-- Create missing table: ${result.table}`)

        if (result.table === 'call_compliance_log') {
          statements.push(`
CREATE TABLE IF NOT EXISTS call_compliance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  contact_id UUID,
  call_log_id UUID,
  user_id UUID,
  phone_number TEXT NOT NULL,
  check_type TEXT NOT NULL,
  result TEXT NOT NULL,
  reason TEXT,
  dnc_source TEXT,
  contact_timezone TEXT,
  contact_local_time TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_call_compliance_log_tenant_id ON call_compliance_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_call_compliance_log_created_at ON call_compliance_log(created_at DESC);

ALTER TABLE call_compliance_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage compliance log"
  ON call_compliance_log FOR ALL
  USING (auth.role() = 'service_role');
`)
        }

        if (result.table === 'call_opt_out_queue') {
          statements.push(`
CREATE TABLE IF NOT EXISTS call_opt_out_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  contact_id UUID,
  phone_number TEXT NOT NULL,
  opt_out_requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deadline TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_call_opt_out_queue_tenant_id ON call_opt_out_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_call_opt_out_queue_deadline ON call_opt_out_queue(deadline);
CREATE INDEX IF NOT EXISTS idx_call_opt_out_queue_status ON call_opt_out_queue(status);

ALTER TABLE call_opt_out_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage opt-out queue"
  ON call_opt_out_queue FOR ALL
  USING (auth.role() = 'service_role');
`)
        }
      }
    } else if (result.missingColumns.length > 0) {
      // Generate ALTER TABLE ADD COLUMN
      statements.push(`-- Add missing columns to ${result.table}`)
      for (const col of result.missingColumns) {
        const colDef = EXPECTED_SCHEMA.find((t) => t.table === result.table)?.columns.find(
          (c) => c.column === col
        )
        if (colDef) {
          let sqlType = colDef.type.toUpperCase()
          if (sqlType === 'TIMESTAMPTZ') sqlType = 'TIMESTAMPTZ'
          if (sqlType === 'JSONB') sqlType = 'JSONB'

          let defaultVal = ''
          if (colDef.type === 'boolean') defaultVal = ' DEFAULT false'
          if (col === 'is_active') defaultVal = ' DEFAULT true'

          statements.push(
            `ALTER TABLE ${result.table} ADD COLUMN IF NOT EXISTS ${col} ${sqlType}${defaultVal};`
          )
        }
      }
      statements.push('')
    }
  }

  return statements.join('\n')
}

async function main() {
  try {
    const results = await verifySchema()

    console.log('\n' + '=' .repeat(60))
    console.log('📊 SUMMARY')
    console.log('=' .repeat(60))

    const critical = results.filter((r) => r.critical && (!r.exists || r.missingColumns.length > 0))
    const warnings = results.filter(
      (r) => !r.critical && r.exists && r.missingColumns.length > 0
    )
    const ok = results.filter((r) => r.exists && r.missingColumns.length === 0)

    console.log(`\n✅ OK: ${ok.length} tables`)
    ok.forEach((r) => console.log(`   - ${r.table}`))

    if (warnings.length > 0) {
      console.log(`\n⚠️  Warnings: ${warnings.length} tables with missing columns`)
      warnings.forEach((r) => console.log(`   - ${r.table}: ${r.missingColumns.join(', ')}`))
    }

    if (critical.length > 0) {
      console.log(`\n❌ CRITICAL: ${critical.length} tables need attention`)
      critical.forEach((r) => {
        if (!r.exists) {
          console.log(`   - ${r.table}: TABLE MISSING`)
        } else {
          console.log(`   - ${r.table}: ${r.missingColumns.join(', ')}`)
        }
      })
    }

    // Generate corrective SQL
    const needsFixes = results.filter((r) => !r.exists || r.missingColumns.length > 0)
    if (needsFixes.length > 0) {
      console.log('\n' + '=' .repeat(60))
      console.log('🔧 CORRECTIVE SQL')
      console.log('=' .repeat(60))
      const sql = generateCorrectiveSQL(needsFixes)
      console.log(sql)

      // Also output to file
      const fs = await import('fs')
      const sqlPath = '/Users/ccai/Roofing SaaS/roofing-saas/scripts/nas-schema-corrections.sql'
      fs.writeFileSync(sqlPath, sql)
      console.log(`\n📝 SQL also written to: ${sqlPath}`)
    } else {
      console.log('\n✅ No schema corrections needed!')
    }

    // Exit with error code if critical issues
    if (critical.length > 0) {
      process.exit(1)
    }
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
