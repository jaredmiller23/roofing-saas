/**
 * Type definitions for the Business Intelligence query system
 */

export interface QueryContext {
  userId: string
  tenantId: string
  userRole?: string
  availableTables: string[]
  permissions: string[]
}

export interface NaturalLanguageQuery {
  query: string
  context: QueryContext
  timestamp?: Date
}

export interface SQLQuery {
  sql: string
  parameters: Record<string, any>
  tables: string[]
  operations: ('SELECT' | 'COUNT' | 'SUM' | 'AVG' | 'GROUP BY')[]
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
}

export interface QueryInterpretation {
  intent: QueryIntent
  entities: QueryEntity[]
  metrics: string[]
  filters: QueryFilter[]
  groupBy: string[]
  timeframe?: TimeFrame
  visualization: VisualizationType
  confidence: number
}

export interface QueryIntent {
  type: 'count' | 'sum' | 'average' | 'compare' | 'trend' | 'list' | 'aggregate'
  subject: string
  action: string
  confidence: number
}

export interface QueryEntity {
  name: string
  type: 'table' | 'column' | 'value'
  value?: string
  confidence: number
}

export interface QueryFilter {
  column: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'like' | 'in' | 'between'
  value: any
  confidence: number
}

export interface TimeFrame {
  type: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
  start?: Date
  end?: Date
  relative?: string // 'this month', 'last quarter', etc.
}

export interface QueryResult {
  success: boolean
  data: any[]
  columns: ResultColumn[]
  metadata: QueryMetadata
  visualization: VisualizationType
  error?: string
}

export interface ResultColumn {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean'
  format?: string
  description?: string
}

export interface QueryMetadata {
  executionTime: number
  rowCount: number
  fromCache: boolean
  sql: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  timestamp: Date
}

export type VisualizationType =
  | 'table'
  | 'bar'
  | 'line'
  | 'pie'
  | 'area'
  | 'scatter'
  | 'number'
  | 'progress'

export interface QuerySuggestion {
  id: string
  title: string
  description: string
  query: string
  category: string
  icon?: string
  estimatedTime?: number
  popularity?: number
}

export interface QueryHistory {
  id: string
  query: string
  interpretation: QueryInterpretation
  result: QueryResult
  timestamp: Date
  executionTime: number
  isFavorite: boolean
  userId: string
}

export interface SchemaInfo {
  tables: TableInfo[]
  relationships: TableRelationship[]
  lastUpdated: Date
}

export interface TableInfo {
  name: string
  description?: string
  columns: ColumnInfo[]
  rowCount?: number
  permissions: string[]
}

export interface ColumnInfo {
  name: string
  type: string
  description?: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  isNullable: boolean
  enumValues?: string[]
}

export interface TableRelationship {
  fromTable: string
  toTable: string
  fromColumn: string
  toColumn: string
  type: 'one-to-one' | 'one-to-many' | 'many-to-many'
}

// Common query patterns for different business domains
export const COMMON_QUERY_PATTERNS = {
  LEADS: [
    'How many leads did we get this {timeframe}?',
    'What is our lead conversion rate?',
    'Which lead source performs best?',
    'Show me leads by status',
  ],
  PROJECTS: [
    'How many active projects do we have?',
    'What is our average project value?',
    'Show me overdue projects',
    'Which projects are most profitable?',
  ],
  REVENUE: [
    'What was our revenue this {timeframe}?',
    'Compare {timeframe1} vs {timeframe2} revenue',
    'What is our revenue growth rate?',
    'Show me revenue by project type',
  ],
  PERFORMANCE: [
    'Which sales rep has the highest close rate?',
    'What is our team performance this month?',
    'Show me top performing projects',
    'Which location generates most revenue?',
  ],
} as const

// Database schema mapping for the roofing SaaS
export const SCHEMA_MAPPING = {
  contacts: {
    table: 'contacts',
    description: 'Customer and prospect information',
    commonNames: ['customers', 'clients', 'prospects', 'leads'],
    keyColumns: ['name', 'email', 'phone', 'status', 'source']
  },
  projects: {
    table: 'projects',
    description: 'Project information and status',
    commonNames: ['jobs', 'work orders', 'projects'],
    keyColumns: ['name', 'status', 'value', 'start_date', 'end_date']
  },
  project_profit_loss: {
    table: 'project_profit_loss',
    description: 'Financial data for projects',
    commonNames: ['profit loss', 'financials', 'pnl', 'revenue'],
    keyColumns: ['revenue', 'total_actual_cost', 'gross_profit', 'profit_margin_percent']
  }
} as const

export type SchemaTable = keyof typeof SCHEMA_MAPPING