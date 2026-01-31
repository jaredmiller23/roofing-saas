#!/usr/bin/env npx tsx
/**
 * DB Schema Snapshot
 *
 * Queries the NAS Supabase database and saves the complete schema
 * (tables, columns, FKs, RPC functions) to a local JSON file.
 *
 * Usage:
 *   npx tsx scripts/schema/snapshot-db-schema.ts
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from env or .env.local
 */

import { writeFileSync } from 'fs'
import { resolve } from 'path'
import type { DbSnapshot, TableSchema, ForeignKey, ColumnInfo } from './schema-types'

const API_URL = process.env.SUPABASE_URL
  || process.env.NEXT_PUBLIC_SUPABASE_URL
  || 'https://api.jobclarity.io'

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NjgxNTM0OTYsImV4cCI6MjA4MzUxMzQ5Nn0.LrwZtkvBuHPDTNVsBROk8KEdSuJpUVpDVsOmdbSgbSU'

async function querySql(sql: string): Promise<unknown[]> {
  const res = await fetch(`${API_URL}/rest/v1/rpc/query_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql_text: sql }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`query_sql failed (${res.status}): ${text}`)
  }

  return res.json()
}

async function main() {
  console.log('Snapshotting DB schema from', API_URL)

  // 1. Get all tables
  console.log('  Fetching tables...')
  const tablesRaw = await querySql(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type IN ('BASE TABLE', 'VIEW')
     ORDER BY table_name`
  ) as Array<{ table_name: string }>

  // 2. Get all columns
  console.log('  Fetching columns...')
  const columnsRaw = await querySql(
    `SELECT table_name, column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public'
     ORDER BY table_name, ordinal_position`
  ) as Array<{
    table_name: string
    column_name: string
    data_type: string
    is_nullable: string
    column_default: string | null
  }>

  // 3. Get all foreign keys
  console.log('  Fetching foreign keys...')
  const fksRaw = await querySql(
    `SELECT
       tc.table_name,
       kcu.column_name,
       ccu.table_name AS foreign_table_name,
       ccu.column_name AS foreign_column_name
     FROM information_schema.table_constraints AS tc
     JOIN information_schema.key_column_usage AS kcu
       ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
     JOIN information_schema.constraint_column_usage AS ccu
       ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_schema = 'public'
     ORDER BY tc.table_name, kcu.column_name`
  ) as Array<{
    table_name: string
    column_name: string
    foreign_table_name: string
    foreign_column_name: string
  }>

  // 4. Get all RPC functions
  console.log('  Fetching RPC functions...')
  const rpcsRaw = await querySql(
    `SELECT routine_name
     FROM information_schema.routines
     WHERE routine_schema = 'public'
       AND routine_type = 'FUNCTION'
     ORDER BY routine_name`
  ) as Array<{ routine_name: string }>

  // Build snapshot
  const tables: Record<string, TableSchema> = {}

  for (const { table_name } of tablesRaw) {
    tables[table_name] = { columns: {}, foreign_keys: [] }
  }

  for (const col of columnsRaw) {
    if (!tables[col.table_name]) continue
    const info: ColumnInfo = {
      type: col.data_type,
      nullable: col.is_nullable === 'YES',
      default_value: col.column_default,
    }
    tables[col.table_name].columns[col.column_name] = info
  }

  for (const fk of fksRaw) {
    if (!tables[fk.table_name]) continue
    const entry: ForeignKey = {
      column: fk.column_name,
      references_table: fk.foreign_table_name,
      references_column: fk.foreign_column_name,
    }
    tables[fk.table_name].foreign_keys.push(entry)
  }

  const rpcFunctions = [...new Set(rpcsRaw.map(r => r.routine_name))].sort()

  const snapshot: DbSnapshot = {
    snapshot_at: new Date().toISOString(),
    tables,
    rpc_functions: rpcFunctions,
  }

  // Write to file
  const outPath = resolve(__dirname, 'db-schema-snapshot.json')
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + '\n')

  const tableCount = Object.keys(tables).length
  const columnCount = Object.values(tables).reduce(
    (sum, t) => sum + Object.keys(t.columns).length, 0
  )
  const fkCount = Object.values(tables).reduce(
    (sum, t) => sum + t.foreign_keys.length, 0
  )

  console.log(`\nSnapshot saved to ${outPath}`)
  console.log(`  ${tableCount} tables, ${columnCount} columns, ${fkCount} FKs, ${rpcFunctions.length} RPC functions`)
}

main().catch((err) => {
  console.error('Snapshot failed:', err)
  process.exit(1)
})
