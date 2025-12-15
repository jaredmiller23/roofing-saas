/**
 * Safe SQL Generator
 * Converts query interpretations into safe, parameterized SQL queries
 * with strict security controls and tenant isolation.
 */

import {
  type QueryInterpretation,
  type SQLQuery,
  type QueryContext,
  type QueryFilter,
  type TimeFrame
} from './query-types'

// Whitelist of allowed tables and their safe column mappings
const ALLOWED_TABLES = {
  contacts: {
    tableName: 'contacts',
    columns: {
      id: 'id',
      name: 'name',
      email: 'email',
      phone: 'phone',
      status: 'status',
      source: 'source',
      created_at: 'created_at',
      updated_at: 'updated_at',
      tenant_id: 'tenant_id'
    },
    requiredFilters: ['tenant_id']
  },
  projects: {
    tableName: 'projects',
    columns: {
      id: 'id',
      name: 'name',
      status: 'status',
      value: 'value',
      start_date: 'start_date',
      end_date: 'end_date',
      actual_completion: 'actual_completion',
      created_at: 'created_at',
      tenant_id: 'tenant_id'
    },
    requiredFilters: ['tenant_id']
  },
  project_profit_loss: {
    tableName: 'project_profit_loss',
    columns: {
      id: 'id',
      project_name: 'project_name',
      status: 'status',
      revenue: 'revenue',
      total_estimated_cost: 'total_estimated_cost',
      total_actual_cost: 'total_actual_cost',
      gross_profit: 'gross_profit',
      profit_margin_percent: 'profit_margin_percent',
      actual_completion: 'actual_completion',
      tenant_id: 'tenant_id'
    },
    requiredFilters: ['tenant_id']
  }
} as const

// Maximum result set size to prevent performance issues
const MAX_RESULT_SIZE = 1000
const _MAX_QUERY_COMPLEXITY = 5 // Max number of joins/subqueries

export class SQLGenerator {
  /**
   * Generate a safe SQL query from interpretation
   */
  generateSQL(interpretation: QueryInterpretation, context: QueryContext): SQLQuery {
    const risk = this.assessRisk(interpretation, context)

    if (risk === 'HIGH') {
      throw new Error('Query complexity exceeds safety limits')
    }

    const tables = this.identifyTables(interpretation, context)
    if (tables.length === 0) {
      throw new Error('No valid tables identified for query')
    }

    const primaryTable = tables[0]
    const tableConfig = ALLOWED_TABLES[primaryTable as keyof typeof ALLOWED_TABLES]

    if (!tableConfig) {
      throw new Error(`Table ${primaryTable} is not allowed`)
    }

    const sqlParts = this.buildSQLParts(interpretation, context, tableConfig)
    const parameters = this.extractParameters(interpretation, context)

    const sql = this.assembleSQLQuery(sqlParts)

    return {
      sql,
      parameters,
      tables,
      operations: sqlParts.operations,
      riskLevel: risk
    }
  }

  private assessRisk(interpretation: QueryInterpretation, _context: QueryContext): 'LOW' | 'MEDIUM' | 'HIGH' {
    let riskScore = 0

    // Complex aggregations increase risk
    if (interpretation.groupBy.length > 2) riskScore += 1

    // Multiple filters increase complexity
    if (interpretation.filters.length > 3) riskScore += 1

    // Complex time ranges
    if (interpretation.timeframe?.type === 'custom') riskScore += 1

    // Low confidence interpretations are risky
    if (interpretation.confidence < 0.6) riskScore += 2

    // Multiple metrics
    if (interpretation.metrics.length > 3) riskScore += 1

    if (riskScore >= 4) return 'HIGH'
    if (riskScore >= 2) return 'MEDIUM'
    return 'LOW'
  }

  private identifyTables(interpretation: QueryInterpretation, context: QueryContext): string[] {
    const tables: string[] = []

    // Check entities for table references
    for (const entity of interpretation.entities) {
      if (entity.type === 'table' && entity.name in ALLOWED_TABLES) {
        tables.push(entity.name)
      }
    }

    // Fallback based on intent subject
    if (tables.length === 0) {
      const subjectMap: Record<string, string> = {
        leads: 'contacts',
        customers: 'contacts',
        contacts: 'contacts',
        projects: 'projects',
        revenue: 'project_profit_loss',
        profit: 'project_profit_loss',
        financial: 'project_profit_loss'
      }

      const mappedTable = subjectMap[interpretation.intent.subject]
      if (mappedTable && mappedTable in ALLOWED_TABLES) {
        tables.push(mappedTable)
      }
    }

    // Default to contacts if no table identified
    if (tables.length === 0) {
      tables.push('contacts')
    }

    return tables.filter(table => context.availableTables.includes(table))
  }

  private buildSQLParts(
    interpretation: QueryInterpretation,
    context: QueryContext,
    tableConfig: typeof ALLOWED_TABLES[keyof typeof ALLOWED_TABLES]
  ) {
    const operations: ('SELECT' | 'COUNT' | 'SUM' | 'AVG' | 'GROUP BY')[] = ['SELECT']

    // Build SELECT clause
    const selectClause = this.buildSelectClause(interpretation, tableConfig, operations)

    // Build FROM clause
    const fromClause = `FROM ${tableConfig.tableName}`

    // Build WHERE clause with tenant isolation
    const { whereClause, parameterCount } = this.buildWhereClause(interpretation, context, tableConfig)

    // Build GROUP BY clause
    const groupByClause = this.buildGroupByClause(interpretation, tableConfig, operations)

    // Build ORDER BY clause
    const orderByClause = this.buildOrderByClause(interpretation, tableConfig)

    // Build LIMIT clause
    const limitClause = `LIMIT ${MAX_RESULT_SIZE}`

    return {
      selectClause,
      fromClause,
      whereClause,
      groupByClause,
      orderByClause,
      limitClause,
      operations,
      parameterCount
    }
  }

  private buildSelectClause(
    interpretation: QueryInterpretation,
    tableConfig: typeof ALLOWED_TABLES[keyof typeof ALLOWED_TABLES],
    operations: ('SELECT' | 'COUNT' | 'SUM' | 'AVG' | 'GROUP BY')[]
  ): string {
    const columns: string[] = []

    // Handle aggregation intent
    if (interpretation.intent.type === 'count') {
      operations.push('COUNT')
      columns.push('COUNT(*) as total_count')
    } else if (interpretation.intent.type === 'sum' && interpretation.metrics.includes('revenue')) {
      operations.push('SUM')
      if ('revenue' in tableConfig.columns) {
        columns.push('SUM(revenue) as total_revenue')
      }
    } else if (interpretation.intent.type === 'average' && interpretation.metrics.includes('value')) {
      operations.push('AVG')
      if ('value' in tableConfig.columns) {
        columns.push('AVG(value) as average_value')
      } else if ('revenue' in tableConfig.columns) {
        columns.push('AVG(revenue) as average_revenue')
      }
    }

    // Add group by columns to select
    for (const groupCol of interpretation.groupBy) {
      const safeColumn = this.getSafeColumnName(groupCol, tableConfig)
      if (safeColumn && !columns.find(col => col.includes(safeColumn))) {
        columns.push(safeColumn)
      }
    }

    // Default select for list queries
    if (columns.length === 0) {
      const defaultColumns = ['id', 'name', 'status', 'created_at']
      for (const col of defaultColumns) {
        const safeColumn = this.getSafeColumnName(col, tableConfig)
        if (safeColumn) {
          columns.push(safeColumn)
        }
      }
    }

    return `SELECT ${columns.join(', ')}`
  }

  private buildWhereClause(
    interpretation: QueryInterpretation,
    context: QueryContext,
    tableConfig: typeof ALLOWED_TABLES[keyof typeof ALLOWED_TABLES]
  ): { whereClause: string; parameterCount: number } {
    const conditions: string[] = []
    let parameterCount = 1

    // MANDATORY: Tenant isolation
    conditions.push(`tenant_id = $${parameterCount}`)
    parameterCount++

    // Add user filters
    for (const filter of interpretation.filters) {
      const safeColumn = this.getSafeColumnName(filter.column, tableConfig)
      if (!safeColumn) continue

      const condition = this.buildFilterCondition(filter, safeColumn, parameterCount)
      if (condition) {
        conditions.push(condition.condition)
        parameterCount += condition.paramCount
      }
    }

    // Add timeframe filters
    if (interpretation.timeframe) {
      const timeCondition = this.buildTimeFrameCondition(interpretation.timeframe, tableConfig, parameterCount)
      if (timeCondition) {
        conditions.push(timeCondition.condition)
        parameterCount += timeCondition.paramCount
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    return { whereClause, parameterCount }
  }

  private buildFilterCondition(
    filter: QueryFilter,
    safeColumn: string,
    parameterCount: number
  ): { condition: string; paramCount: number } | null {
    switch (filter.operator) {
      case 'equals':
        return {
          condition: `${safeColumn} = $${parameterCount}`,
          paramCount: 1
        }
      case 'not_equals':
        return {
          condition: `${safeColumn} != $${parameterCount}`,
          paramCount: 1
        }
      case 'greater_than':
        return {
          condition: `${safeColumn} > $${parameterCount}`,
          paramCount: 1
        }
      case 'less_than':
        return {
          condition: `${safeColumn} < $${parameterCount}`,
          paramCount: 1
        }
      case 'like':
        return {
          condition: `${safeColumn} ILIKE $${parameterCount}`,
          paramCount: 1
        }
      case 'in':
        // Handle array values safely
        if (Array.isArray(filter.value)) {
          const placeholders = filter.value.map((_, i) => `$${parameterCount + i}`).join(', ')
          return {
            condition: `${safeColumn} IN (${placeholders})`,
            paramCount: filter.value.length
          }
        }
        return null
      default:
        return null
    }
  }

  private buildTimeFrameCondition(
    timeframe: TimeFrame,
    tableConfig: typeof ALLOWED_TABLES[keyof typeof ALLOWED_TABLES],
    parameterCount: number
  ): { condition: string; paramCount: number } | null {
    // Find a date column to filter on
    const dateColumns = ['created_at', 'updated_at', 'start_date', 'end_date', 'actual_completion']
    const dateColumn = dateColumns.find(col => col in tableConfig.columns)

    if (!dateColumn) return null

    const safeColumn = tableConfig.columns[dateColumn as keyof typeof tableConfig.columns]

    // Use the existing getTimeFrameDates function
    if (!timeframe.relative) return null

    const { startDate, endDate } = this.getTimeFrameDates(timeframe.relative)
    if (!startDate || !endDate) return null

    return {
      condition: `${safeColumn} BETWEEN $${parameterCount} AND $${parameterCount + 1}`,
      paramCount: 2
    }
  }

  private buildGroupByClause(
    interpretation: QueryInterpretation,
    tableConfig: typeof ALLOWED_TABLES[keyof typeof ALLOWED_TABLES],
    operations: ('SELECT' | 'COUNT' | 'SUM' | 'AVG' | 'GROUP BY')[]
  ): string {
    if (interpretation.groupBy.length === 0) return ''

    const groupColumns: string[] = []
    for (const groupCol of interpretation.groupBy) {
      const safeColumn = this.getSafeColumnName(groupCol, tableConfig)
      if (safeColumn) {
        groupColumns.push(safeColumn)
      }
    }

    if (groupColumns.length > 0) {
      operations.push('GROUP BY')
      return `GROUP BY ${groupColumns.join(', ')}`
    }

    return ''
  }

  private buildOrderByClause(
    interpretation: QueryInterpretation,
    tableConfig: typeof ALLOWED_TABLES[keyof typeof ALLOWED_TABLES]
  ): string {
    // Default ordering - prefer date columns, then name/id
    const orderColumns = ['created_at', 'updated_at', 'name', 'id']

    for (const col of orderColumns) {
      const safeColumn = this.getSafeColumnName(col, tableConfig)
      if (safeColumn) {
        return `ORDER BY ${safeColumn} DESC`
      }
    }

    return ''
  }

  private getSafeColumnName(
    columnName: string,
    tableConfig: typeof ALLOWED_TABLES[keyof typeof ALLOWED_TABLES]
  ): string | null {
    // Direct column mapping
    if (columnName in tableConfig.columns) {
      return tableConfig.columns[columnName as keyof typeof tableConfig.columns]
    }

    // Common aliases
    const aliases: Record<string, string> = {
      count: 'id', // For COUNT operations
      total: 'id',
      revenue: 'revenue',
      profit: 'gross_profit',
      margin: 'profit_margin_percent',
      value: 'value',
      amount: 'value',
      date: 'created_at',
      time: 'created_at'
    }

    const aliasedColumn = aliases[columnName]
    if (aliasedColumn && aliasedColumn in tableConfig.columns) {
      return tableConfig.columns[aliasedColumn as keyof typeof tableConfig.columns]
    }

    return null
  }

  private extractParameters(interpretation: QueryInterpretation, context: QueryContext): Record<string, unknown> {
    const parameters: Record<string, unknown> = {}
    let paramIndex = 1

    // Tenant ID is always first parameter
    parameters[`$${paramIndex}`] = context.tenantId
    paramIndex++

    // Filter parameters
    for (const filter of interpretation.filters) {
      if (filter.operator === 'in' && Array.isArray(filter.value)) {
        for (const value of filter.value) {
          parameters[`$${paramIndex}`] = value
          paramIndex++
        }
      } else if (filter.operator === 'like') {
        parameters[`$${paramIndex}`] = `%${filter.value}%`
        paramIndex++
      } else {
        parameters[`$${paramIndex}`] = filter.value
        paramIndex++
      }
    }

    // Timeframe parameters
    if (interpretation.timeframe?.relative) {
      const { startDate, endDate } = this.getTimeFrameDates(interpretation.timeframe.relative)
      if (startDate && endDate) {
        parameters[`$${paramIndex}`] = startDate.toISOString()
        parameters[`$${paramIndex + 1}`] = endDate.toISOString()
      }
    }

    return parameters
  }

  private getTimeFrameDates(relative: string): { startDate: Date | null; endDate: Date | null } {
    const now = new Date()

    switch (relative) {
      case 'this month':
        return {
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: now
        }
      case 'last month':
        return {
          startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          endDate: new Date(now.getFullYear(), now.getMonth(), 0)
        }
      case 'this year':
        return {
          startDate: new Date(now.getFullYear(), 0, 1),
          endDate: now
        }
      case 'last year':
        return {
          startDate: new Date(now.getFullYear() - 1, 0, 1),
          endDate: new Date(now.getFullYear() - 1, 11, 31)
        }
      default:
        return { startDate: null, endDate: null }
    }
  }

  private assembleSQLQuery(sqlParts: { selectClause: string; fromClause: string; whereClause: string; groupByClause: string; orderByClause: string; limitClause: string }): string {
    const parts = [
      sqlParts.selectClause,
      sqlParts.fromClause,
      sqlParts.whereClause,
      sqlParts.groupByClause,
      sqlParts.orderByClause,
      sqlParts.limitClause
    ].filter(Boolean)

    return parts.join('\n')
  }
}

// Export singleton instance
export const sqlGenerator = new SQLGenerator()