/**
 * Shared types for the schema validation toolkit.
 */

// --- DB Schema Snapshot ---

export interface ColumnInfo {
  type: string
  nullable: boolean
  default_value: string | null
}

export interface ForeignKey {
  column: string
  references_table: string
  references_column: string
}

export interface TableSchema {
  columns: Record<string, ColumnInfo>
  foreign_keys: ForeignKey[]
}

export interface DbSnapshot {
  snapshot_at: string
  tables: Record<string, TableSchema>
  rpc_functions: string[]
}

// --- Code References ---

export interface SourceLocation {
  file: string
  line: number
}

export interface TableReference extends SourceLocation {
  method: 'from' | 'rpc'
}

export interface ColumnReference extends SourceLocation {
  context: 'select' | 'eq' | 'neq' | 'in' | 'is' | 'ilike' | 'order' | 'insert' | 'update' | 'filter'
  confidence: 'high' | 'low'
}

export interface FkTraversal extends SourceLocation {
  alias: string | null
  fk_column: string | null
  nested_columns: string[]
}

export interface CodeReferences {
  extracted_at: string
  table_references: Record<string, TableReference[]>
  column_references: Record<string, Record<string, ColumnReference[]>>
  fk_traversals: Record<string, FkTraversal[]>
  rpc_references: Record<string, SourceLocation[]>
}

// --- Validation Report ---

export type Severity = 'P0' | 'P1' | 'P2'

export type IssueCategory =
  | 'non_existent_table'
  | 'phantom_column'
  | 'fk_disambiguation'
  | 'fk_target_bug'
  | 'non_existent_rpc'

export interface ValidationIssue {
  severity: Severity
  category: IssueCategory
  table: string
  column?: string
  detail: string
  references: SourceLocation[]
}

export interface ValidationReport {
  validated_at: string
  summary: {
    tables_checked: number
    tables_missing: number
    columns_checked: number
    columns_phantom: number
    fk_issues: number
    rpc_missing: number
    total_issues: number
  }
  issues: ValidationIssue[]
}
