#!/usr/bin/env npx tsx
/**
 * Schema Validator
 *
 * Scans the codebase for Supabase query calls (.from, .select, .eq, .rpc, etc.)
 * and cross-references them against the DB schema snapshot.
 *
 * Reports:
 *   P0 - Non-existent tables
 *   P1 - Phantom columns, FK disambiguation, FK target bugs
 *   P2 - Non-existent RPC functions
 *
 * Usage:
 *   npx tsx scripts/schema/validate-schema.ts
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { resolve, relative, extname } from 'path'
import type {
  DbSnapshot,
  ValidationIssue,
  ValidationReport,
  SourceLocation,
  Severity,
  IssueCategory,
} from './schema-types'

const ROOT = resolve(__dirname, '../..')
const SNAPSHOT_PATH = resolve(__dirname, 'db-schema-snapshot.json')
const REPORT_DIR = resolve(__dirname, 'reports')

// Directories to scan
const SCAN_DIRS = ['app', 'lib', 'components', 'hooks'].map(d => resolve(ROOT, d))
const SCAN_EXTENSIONS = new Set(['.ts', '.tsx'])

// Ignore patterns
const IGNORE_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.test\./,
  /\.spec\./,
  /scripts\/schema/,
]

// Tables that exist outside the public schema (e.g. auth.users)
// or are Supabase internals — not bugs when referenced in code.
const ALLOWED_TABLES = new Set([
  'users',    // auth.users — accessed via service role client
  'profiles', // often a view or alias for auth.users metadata
  'files',    // Supabase storage bucket, not a DB table (.storage.from)
])

// ─── File scanning ───

function collectFiles(dir: string): string[] {
  const files: string[] = []
  if (!existsSync(dir)) return files

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = resolve(dir, entry.name)
    if (IGNORE_PATTERNS.some(p => p.test(fullPath))) continue
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath))
    } else if (SCAN_EXTENSIONS.has(extname(entry.name))) {
      files.push(fullPath)
    }
  }
  return files
}

// ─── Pattern extraction ───

interface Extraction {
  table: string
  file: string
  line: number
}

interface ColumnExtraction extends Extraction {
  columns: string[]
  context: string
  confidence: 'high' | 'low'
}

interface FkExtraction {
  table: string
  bare_name: string
  has_disambiguation: boolean
  file: string
  line: number
}

interface RpcExtraction {
  function_name: string
  file: string
  line: number
}

function extractFromCalls(content: string, filePath: string): Extraction[] {
  const results: Extraction[] = []
  const regex = /(?<!\.storage)\.from\(\s*['"`]([a-z_]+)['"`]\s*\)/g
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    let match
    while ((match = regex.exec(lines[i])) !== null) {
      results.push({ table: match[1], file: filePath, line: i + 1 })
    }
  }
  return results
}

function extractRpcCalls(content: string, filePath: string): RpcExtraction[] {
  const results: RpcExtraction[] = []
  const regex = /\.rpc\(\s*['"`]([a-z_]+)['"`]/g
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    let match
    while ((match = regex.exec(lines[i])) !== null) {
      results.push({ function_name: match[1], file: filePath, line: i + 1 })
    }
  }
  return results
}

function extractSelectColumns(content: string, filePath: string): ColumnExtraction[] {
  const results: ColumnExtraction[] = []
  const lines = content.split('\n')

  // Track current .from() table for associating with subsequent .select()
  let currentTable: string | null = null
  let currentTableLine = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Track .from() calls
    const fromMatch = line.match(/\.from\(\s*['"`]([a-z_]+)['"`]\s*\)/)
    if (fromMatch) {
      currentTable = fromMatch[1]
      currentTableLine = i + 1
    }

    // Extract .select() on same or following lines (single-line string)
    const selectMatch = line.match(/\.select\(\s*['"](.+?)['"]\s*\)/)
    if (selectMatch && currentTable) {
      const selectStr = selectMatch[1]
      if (selectStr === '*') continue // Skip wildcard selects

      const columns = parseSelectString(selectStr)
      if (columns.length > 0) {
        results.push({
          table: currentTable,
          columns,
          context: 'select',
          confidence: 'high',
          file: filePath,
          line: i + 1,
        })
      }
    }

    // Multi-line backtick select
    if (line.match(/\.select\(\s*`/) && currentTable) {
      // Collect until closing backtick
      let selectStr = ''
      let j = i
      const startCol = line.indexOf('`')
      selectStr += line.substring(startCol + 1)
      while (j < lines.length - 1 && !selectStr.includes('`')) {
        j++
        selectStr += '\n' + lines[j]
      }
      // Remove trailing backtick and anything after
      const endIdx = selectStr.indexOf('`')
      if (endIdx >= 0) selectStr = selectStr.substring(0, endIdx)

      const hasInterpolation = selectStr.includes('${')
      const columns = parseSelectString(selectStr)
      if (columns.length > 0) {
        results.push({
          table: currentTable,
          columns,
          context: 'select',
          confidence: hasInterpolation ? 'low' : 'high',
          file: filePath,
          line: i + 1,
        })
      }
    }

    // Extract .eq(), .neq(), .is(), .in(), .ilike(), .order() column references
    const filterMatch = line.match(/\.(eq|neq|is|in|ilike|order|lt|gt|gte|lte|like|contains|filter|or)\(\s*['"]([a-z_.\->]+?)['"]/)
    if (filterMatch && currentTable) {
      let col = filterMatch[2]
      // Strip JSONB path operators (e.g., 'custom_fields->key' -> 'custom_fields')
      if (col.includes('->')) col = col.split('->')[0]
      // Strip PostgREST dot notation (e.g., 'custom_fields.key' -> 'custom_fields')
      if (col.includes('.')) col = col.split('.')[0]

      results.push({
        table: currentTable,
        columns: [col],
        context: filterMatch[1],
        confidence: 'high',
        file: filePath,
        line: i + 1,
      })
    }

    // Reset table tracking on empty lines or new statements (if far from .from())
    if (line.trim() === '' || line.match(/^\s*(const|let|var|return|if|for|while|function|async)\b/)) {
      if (i - currentTableLine > 15) {
        currentTable = null
      }
    }
  }

  return results
}

function extractFkTraversals(content: string, filePath: string): FkExtraction[] {
  const results: FkExtraction[] = []
  const lines = content.split('\n')

  let currentTable: string | null = null
  let inSelect = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    const fromMatch = line.match(/\.from\(\s*['"`]([a-z_]+)['"`]\s*\)/)
    if (fromMatch) {
      currentTable = fromMatch[1]
    }

    // Track if we're inside a .select() context
    if (line.match(/\.select\(/)) inSelect = true
    if (inSelect && (line.includes(')') && !line.includes('('))) inSelect = false

    if (!currentTable || !inSelect) continue

    // Find patterns like `contacts(...)` or `contacts:contact_id(...)` inside select strings
    const fkPattern = /\b([a-z_]+)(?::([a-z_]+))?\s*\(/g
    let match
    while ((match = fkPattern.exec(line)) !== null) {
      const name = match[1]
      const fkCol = match[2] || null

      // Skip known non-FK function/method names
      const skipNames = new Set([
        'select', 'from', 'eq', 'neq', 'in', 'is', 'ilike', 'order',
        'lt', 'gt', 'gte', 'lte', 'like', 'filter', 'or', 'and',
        'not', 'match', 'insert', 'update', 'delete', 'upsert',
        'single', 'maybeSingle', 'limit', 'range', 'contains',
        'containedBy', 'overlaps', 'textSearch', 'rpc',
        'map', 'forEach', 'reduce', 'find', 'some', 'every',
        'Array', 'Set', 'Date', 'Math', 'JSON', 'Object', 'String',
        'parseInt', 'parseFloat', 'console', 'Error', 'Promise',
        'catch', 'then', 'finally', 'async', 'await', 'return',
        'function', 'const', 'let', 'var', 'if', 'else', 'new',
      ])
      if (skipNames.has(name)) continue

      results.push({
        table: currentTable,
        bare_name: name,
        has_disambiguation: fkCol !== null,
        file: filePath,
        line: i + 1,
      })
    }
  }

  return results
}

function parseSelectString(selectStr: string): string[] {
  const columns: string[] = []

  // Remove FK traversals - relationship joins, not columns.
  // Patterns: table(cols), alias:fk_col(cols), table!inner(cols), alias:table!fk_col(cols)
  // Iteratively remove innermost to handle nesting.
  let cleaned = selectStr
  let prev = ''
  while (prev !== cleaned) {
    prev = cleaned
    cleaned = cleaned.replace(/[a-z_]+(?::[a-z_]+)?(?:![a-z_]+)?\s*\([^()]*\)/g, '')
  }

  // Split on commas, trim, filter
  const parts = cleaned.split(',').map(s => s.trim()).filter(s => s.length > 0)

  for (const part of parts) {
    if (part === '*') continue
    if (part.startsWith('{')) continue

    const col = part.split(':')[0].trim()
    if (col && /^[a-z_]+$/.test(col)) {
      columns.push(col)
    }
  }

  return columns
}

// ─── Validation logic ───

function validate(snapshot: DbSnapshot, files: string[]): ValidationReport {
  const issues: ValidationIssue[] = []
  const tableNames = new Set(Object.keys(snapshot.tables))
  const rpcNames = new Set(snapshot.rpc_functions)

  const tablesChecked = new Set<string>()
  const columnsChecked = new Set<string>()
  let tablesMissing = 0
  let columnsPhantom = 0
  let fkIssues = 0
  let rpcMissing = 0

  const allFromCalls: Extraction[] = []
  const allColumnExtractions: ColumnExtraction[] = []
  const allFkTraversals: FkExtraction[] = []
  const allRpcCalls: RpcExtraction[] = []

  for (const filePath of files) {
    const content = readFileSync(filePath, 'utf-8')
    const relPath = relative(ROOT, filePath)

    allFromCalls.push(...extractFromCalls(content, relPath))
    allColumnExtractions.push(...extractSelectColumns(content, relPath))
    allFkTraversals.push(...extractFkTraversals(content, relPath))
    allRpcCalls.push(...extractRpcCalls(content, relPath))
  }

  // Check 1: Non-existent tables
  const missingTableRefs = new Map<string, SourceLocation[]>()
  for (const ref of allFromCalls) {
    tablesChecked.add(ref.table)
    if (!tableNames.has(ref.table) && !ALLOWED_TABLES.has(ref.table)) {
      const locs = missingTableRefs.get(ref.table) || []
      locs.push({ file: ref.file, line: ref.line })
      missingTableRefs.set(ref.table, locs)
    }
  }
  for (const [table, refs] of missingTableRefs) {
    tablesMissing++
    issues.push({
      severity: 'P0',
      category: 'non_existent_table',
      table,
      detail: `Table '${table}' does not exist in the database (${refs.length} reference${refs.length > 1 ? 's' : ''})`,
      references: refs,
    })
  }

  // Build FK reachability: tables accessible via FK from each table
  const fkReachable = new Map<string, Set<string>>()
  for (const [tbl, schema] of Object.entries(snapshot.tables)) {
    const reachable = new Set<string>()
    for (const fk of schema.foreign_keys || []) reachable.add(fk.references_table)
    fkReachable.set(tbl, reachable)
  }

  // Check 2: Phantom columns
  for (const ext of allColumnExtractions) {
    if (!tableNames.has(ext.table)) continue
    if (ext.confidence === 'low') continue

    const tableSchema = snapshot.tables[ext.table]
    const reachable = fkReachable.get(ext.table) || new Set<string>()
    for (const col of ext.columns) {
      columnsChecked.add(`${ext.table}.${col}`)
      // Skip FK traversal references (column name is actually a related table name)
      if (tableNames.has(col) && reachable.has(col)) continue
      if (!tableSchema.columns[col]) {
        const existing = issues.find(
          i => i.category === 'phantom_column' && i.table === ext.table && i.column === col
        )
        if (existing) {
          if (!existing.references.some(r => r.file === ext.file && r.line === ext.line)) {
            existing.references.push({ file: ext.file, line: ext.line })
          }
        } else {
          columnsPhantom++
          issues.push({
            severity: 'P1',
            category: 'phantom_column',
            table: ext.table,
            column: col,
            detail: `Column '${col}' does not exist on table '${ext.table}'`,
            references: [{ file: ext.file, line: ext.line }],
          })
        }
      }
    }
  }

  // Check 3: FK disambiguation
  const multiFkTables = new Map<string, Map<string, string[]>>()
  for (const [tableName, schema] of Object.entries(snapshot.tables)) {
    const fksByTarget = new Map<string, string[]>()
    for (const fk of schema.foreign_keys) {
      const cols = fksByTarget.get(fk.references_table) || []
      cols.push(fk.column)
      fksByTarget.set(fk.references_table, cols)
    }
    for (const [target, cols] of fksByTarget) {
      if (cols.length > 1) {
        if (!multiFkTables.has(tableName)) multiFkTables.set(tableName, new Map())
        multiFkTables.get(tableName)!.set(target, cols)
      }
    }
  }

  for (const ext of allFkTraversals) {
    const multiFks = multiFkTables.get(ext.table)
    if (!multiFks) continue

    if (multiFks.has(ext.bare_name) && !ext.has_disambiguation) {
      fkIssues++
      issues.push({
        severity: 'P1',
        category: 'fk_disambiguation',
        table: ext.table,
        detail: `FK traversal '${ext.bare_name}(...)' on '${ext.table}' is ambiguous. Use '${ext.bare_name}:fk_column(...)'.`,
        references: [{ file: ext.file, line: ext.line }],
      })
    }
  }

  // Check 4: FK target bugs (tenant_id -> wrong table)
  for (const [tableName, schema] of Object.entries(snapshot.tables)) {
    for (const fk of schema.foreign_keys) {
      if (fk.column === 'tenant_id' && fk.references_table !== 'tenants') {
        fkIssues++
        issues.push({
          severity: 'P1',
          category: 'fk_target_bug',
          table: tableName,
          column: 'tenant_id',
          detail: `${tableName}.tenant_id references '${fk.references_table}.${fk.references_column}' instead of 'tenants.id'`,
          references: [],
        })
      }
    }
  }

  // Check 5: Non-existent RPC functions
  const missingRpcRefs = new Map<string, SourceLocation[]>()
  for (const ref of allRpcCalls) {
    if (!rpcNames.has(ref.function_name)) {
      const locs = missingRpcRefs.get(ref.function_name) || []
      locs.push({ file: ref.file, line: ref.line })
      missingRpcRefs.set(ref.function_name, locs)
    }
  }
  for (const [fn, refs] of missingRpcRefs) {
    rpcMissing++
    issues.push({
      severity: 'P2',
      category: 'non_existent_rpc',
      table: '',
      detail: `RPC function '${fn}' does not exist (${refs.length} reference${refs.length > 1 ? 's' : ''})`,
      references: refs,
    })
  }

  // Sort by severity
  const severityOrder: Record<Severity, number> = { P0: 0, P1: 1, P2: 2 }
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return {
    validated_at: new Date().toISOString(),
    summary: {
      tables_checked: tablesChecked.size,
      tables_missing: tablesMissing,
      columns_checked: columnsChecked.size,
      columns_phantom: columnsPhantom,
      fk_issues: fkIssues,
      rpc_missing: rpcMissing,
      total_issues: issues.length,
    },
    issues,
  }
}

// ─── Output ───

function printReport(report: ValidationReport) {
  const { summary } = report

  console.log('\n════════════════════════════════════════')
  console.log('  SCHEMA VALIDATION REPORT')
  console.log('════════════════════════════════════════\n')

  console.log(`Tables checked:    ${summary.tables_checked}`)
  console.log(`Tables missing:    ${summary.tables_missing}`)
  console.log(`Columns checked:   ${summary.columns_checked}`)
  console.log(`Columns phantom:   ${summary.columns_phantom}`)
  console.log(`FK issues:         ${summary.fk_issues}`)
  console.log(`RPC missing:       ${summary.rpc_missing}`)
  console.log(`Total issues:      ${summary.total_issues}`)

  if (report.issues.length === 0) {
    console.log('\n  No issues found.')
    return
  }

  console.log('\n────────────────────────────────────────')

  let lastSeverity = ''
  for (const issue of report.issues) {
    if (issue.severity !== lastSeverity) {
      lastSeverity = issue.severity
      console.log(`\n[${issue.severity}] ${getCategoryLabel(issue.category)}`)
      console.log('─'.repeat(40))
    }

    const location = issue.references.length > 0
      ? issue.references.map(r => `    ${r.file}:${r.line}`).join('\n')
      : '    (database-level)'

    console.log(`\n  ${issue.detail}`)
    console.log(location)
  }

  console.log('\n════════════════════════════════════════\n')
}

function getCategoryLabel(cat: IssueCategory): string {
  switch (cat) {
    case 'non_existent_table': return 'NON-EXISTENT TABLES'
    case 'phantom_column': return 'PHANTOM COLUMNS'
    case 'fk_disambiguation': return 'FK DISAMBIGUATION NEEDED'
    case 'fk_target_bug': return 'FK TARGET BUGS'
    case 'non_existent_rpc': return 'NON-EXISTENT RPC FUNCTIONS'
  }
}

// ─── Main ───

async function main() {
  if (!existsSync(SNAPSHOT_PATH)) {
    console.error('No schema snapshot found. Run: npx tsx scripts/schema/snapshot-db-schema.ts')
    process.exit(1)
  }

  const snapshot: DbSnapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf-8'))
  console.log(`Loaded snapshot from ${snapshot.snapshot_at}`)
  console.log(`  ${Object.keys(snapshot.tables).length} tables, ${snapshot.rpc_functions.length} RPC functions`)

  const files: string[] = []
  for (const dir of SCAN_DIRS) {
    files.push(...collectFiles(dir))
  }
  console.log(`Scanning ${files.length} source files...`)

  const report = validate(snapshot, files)

  printReport(report)

  // Save report
  const reportPath = resolve(REPORT_DIR, `audit-${new Date().toISOString().split('T')[0]}.json`)
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n')
  console.log(`Report saved to ${reportPath}`)

  if (report.summary.total_issues > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Validation failed:', err)
  process.exit(1)
})
