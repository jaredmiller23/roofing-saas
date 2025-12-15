import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { queryInterpreter } from '@/lib/ai/query-interpreter'
import { sqlGenerator } from '@/lib/ai/sql-generator'
import {
  type NaturalLanguageQuery,
  type QueryContext,
  type QueryResult,
  type ResultColumn
} from '@/lib/ai/query-types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, userId, tenantId, userRole } = body

    if (!query || !userId || !tenantId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const startTime = Date.now()
    const supabase = await createClient()

    // Verify user has access to tenant
    const { data: userAccess, error: accessError } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .single()

    if (accessError || !userAccess) {
      return NextResponse.json(
        { error: 'Unauthorized access to tenant data' },
        { status: 403 }
      )
    }

    // Build query context
    const context: QueryContext = {
      userId,
      tenantId,
      userRole: userRole || userAccess.role,
      availableTables: ['contacts', 'projects', 'project_profit_loss'],
      permissions: ['SELECT'] // Only allow read operations
    }

    const nlQuery: NaturalLanguageQuery = {
      query: query.trim(),
      context,
      timestamp: new Date()
    }

    // Step 1: Interpret the natural language query
    const interpretation = await queryInterpreter.interpret(nlQuery)

    if (interpretation.confidence < 0.4) {
      return NextResponse.json({
        error: 'Could not understand your question. Please try rephrasing it or be more specific about what data you need.'
      }, { status: 400 })
    }

    // Step 2: Generate safe SQL
    let sqlQuery
    try {
      sqlQuery = sqlGenerator.generateSQL(interpretation, context)
    } catch (sqlError) {
      console.error('SQL generation failed:', sqlError)
      return NextResponse.json({
        error: 'Could not generate a safe query for your request. Please try a different question.'
      }, { status: 400 })
    }

    // Step 3: Execute the query with proper error handling
    let queryResult: QueryResult
    try {
      const executionStartTime = Date.now()

      // Execute the query directly using Supabase's query interface
      let data: Record<string, unknown>[] = []
      let queryError: { message?: string } | null = null

      // Execute the query based on interpretation and table
      const primaryTable = sqlQuery.tables[0]

      // Build query based on intent and operations
      const { intent } = interpretation

      if (primaryTable === 'contacts') {
        // Build contacts query
        let selectColumns = 'id, name, status, email, phone, source, created_at'
        let countMode = false

        if (intent.type === 'count') {
          selectColumns = '*'
          countMode = true
        } else if (intent.type === 'sum' || intent.type === 'average') {
          selectColumns = 'id, name, status, source, created_at'
        }

        let query = supabase.from('contacts').select(selectColumns, countMode ? { count: 'exact' } : undefined)

        // Apply tenant filter
        query = query.eq('tenant_id', context.tenantId)

        // Apply time filters if present
        if (interpretation.timeframe?.relative === 'this month') {
          const startOfMonth = new Date()
          startOfMonth.setDate(1)
          startOfMonth.setHours(0, 0, 0, 0)
          query = query.gte('created_at', startOfMonth.toISOString())
        } else if (interpretation.timeframe?.relative === 'last month') {
          const now = new Date()
          const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
          query = query.gte('created_at', startOfLastMonth.toISOString())
            .lte('created_at', endOfLastMonth.toISOString())
        }

        // Apply status filters
        const statusFilter = interpretation.filters.find(f => f.column === 'status')
        if (statusFilter) {
          query = query.eq('status', statusFilter.value)
        }

        query = query.limit(1000)
        const result = await query
        data = result.data || []
        queryError = result.error

        // Handle count queries
        if (intent.type === 'count') {
          data = [{ total_count: result.count || 0 }]
        }

      } else if (primaryTable === 'projects') {
        // Build projects query
        let selectColumns = 'id, name, status, value, start_date, end_date, actual_completion, created_at'
        let countMode = false

        if (intent.type === 'count') {
          selectColumns = '*'
          countMode = true
        } else if (intent.type === 'sum' || intent.type === 'average') {
          selectColumns = 'value'
        }

        let query = supabase.from('projects').select(selectColumns, countMode ? { count: 'exact' } : undefined)

        // Apply tenant filter
        query = query.eq('tenant_id', context.tenantId)

        // Apply status filters
        const statusFilter = interpretation.filters.find(f => f.column === 'status')
        if (statusFilter) {
          query = query.eq('status', statusFilter.value)
        } else if (intent.subject.includes('active') || nlQuery.query.includes('active')) {
          query = query.eq('status', 'active')
        } else if (intent.subject.includes('overdue')) {
          query = query.lt('end_date', new Date().toISOString()).neq('status', 'completed')
        }

        query = query.limit(1000)
        const result = await query
        data = result.data || []
        queryError = result.error

        // Handle aggregation queries
        if (intent.type === 'count') {
          data = [{ total_count: result.count || 0 }]
        } else if (intent.type === 'sum' && result.data) {
          const total = result.data.reduce((sum: number, row: Record<string, unknown>) => sum + (Number(row.value) || 0), 0)
          data = [{ total_value: total }]
        } else if (intent.type === 'average' && result.data) {
          const total = result.data.reduce((sum: number, row: Record<string, unknown>) => sum + (Number(row.value) || 0), 0)
          const avg = result.data.length > 0 ? total / result.data.length : 0
          data = [{ average_value: avg }]
        }

      } else if (primaryTable === 'project_profit_loss') {
        // Build project profit loss query
        let selectColumns = 'id, project_name, status, revenue, total_estimated_cost, total_actual_cost, gross_profit, profit_margin_percent, actual_completion'

        if (intent.type === 'sum') {
          selectColumns = 'revenue, gross_profit'
        } else if (intent.type === 'average') {
          selectColumns = 'revenue, gross_profit, profit_margin_percent'
        }

        let query = supabase.from('project_profit_loss').select(selectColumns)

        // Apply tenant filter
        query = query.eq('tenant_id', context.tenantId)

        // Apply time filters
        if (interpretation.timeframe?.relative === 'this month') {
          const startOfMonth = new Date()
          startOfMonth.setDate(1)
          startOfMonth.setHours(0, 0, 0, 0)
          query = query.gte('created_at', startOfMonth.toISOString())
        }

        query = query.limit(1000)
        const result = await query
        data = result.data || []
        queryError = result.error

        // Handle revenue aggregations
        if (intent.type === 'sum' && result.data) {
          if (interpretation.metrics.includes('revenue')) {
            const total = result.data.reduce((sum: number, row: Record<string, unknown>) => sum + (Number(row.revenue) || 0), 0)
            data = [{ total_revenue: total }]
          } else if (interpretation.metrics.includes('profit')) {
            const total = result.data.reduce((sum: number, row: Record<string, unknown>) => sum + (Number(row.gross_profit) || 0), 0)
            data = [{ total_profit: total }]
          }
        } else if (intent.type === 'average' && result.data) {
          if (interpretation.metrics.includes('revenue')) {
            const total = result.data.reduce((sum: number, row: Record<string, unknown>) => sum + (Number(row.revenue) || 0), 0)
            const avg = result.data.length > 0 ? total / result.data.length : 0
            data = [{ average_revenue: avg }]
          }
        }

      } else {
        // Default to contacts for unknown tables
        const { data: defaultData, error } = await supabase
          .from('contacts')
          .select('id, name, status, created_at')
          .eq('tenant_id', context.tenantId)
          .limit(100)

        data = defaultData || []
        queryError = error
      }

      const executionTime = Date.now() - executionStartTime

      if (queryError) {
        throw new Error(queryError.message || 'Database query failed')
      }

      // Transform result into standardized format
      const resultColumns: ResultColumn[] = []
      let processedData: Record<string, unknown>[] = []

      if (data && Array.isArray(data) && data.length > 0) {
        // Infer columns from first row
        const firstRow = data[0]
        Object.keys(firstRow).forEach(key => {
          const value = firstRow[key]
          let type: 'string' | 'number' | 'date' | 'boolean' = 'string'

          if (typeof value === 'number') {
            type = 'number'
          } else if (typeof value === 'boolean') {
            type = 'boolean'
          } else if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
            type = 'date'
          }

          resultColumns.push({
            name: key,
            type,
            description: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          })
        })

        processedData = data
      }

      queryResult = {
        success: true,
        data: processedData,
        columns: resultColumns,
        metadata: {
          executionTime,
          rowCount: processedData.length,
          fromCache: false,
          sql: sqlQuery.sql,
          riskLevel: sqlQuery.riskLevel,
          timestamp: new Date()
        },
        visualization: interpretation.visualization
      }

    } catch (dbError) {
      console.error('Database execution failed:', dbError)

      queryResult = {
        success: false,
        data: [],
        columns: [],
        metadata: {
          executionTime: Date.now() - startTime,
          rowCount: 0,
          fromCache: false,
          sql: sqlQuery.sql,
          riskLevel: sqlQuery.riskLevel,
          timestamp: new Date()
        },
        visualization: 'table',
        error: 'Database query failed. Please check your query and try again.'
      }
    }

    // Step 4: Save query to history (only if successful)
    if (queryResult.success) {
      try {
        await supabase
          .from('query_history')
          .insert({
            user_id: userId,
            tenant_id: tenantId,
            query: query.trim(),
            interpretation: interpretation,
            result: queryResult,
            execution_time: queryResult.metadata.executionTime,
            is_favorite: false
          })
      } catch (historyError) {
        // Don't fail the request if history saving fails
        console.error('Failed to save query history:', historyError)
      }
    }

    return NextResponse.json({
      result: queryResult,
      interpretation: interpretation,
      confidence: interpretation.confidence
    })

  } catch (error) {
    console.error('Query processing failed:', error)

    return NextResponse.json({
      error: 'An unexpected error occurred while processing your query. Please try again.'
    }, { status: 500 })
  }
}

// Rate limiting helper (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function _checkRateLimit(userId: string, maxRequests = 50, windowMs = 60000): boolean {
  const now = Date.now()
  const userLimit = rateLimitStore.get(userId)

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(userId, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (userLimit.count >= maxRequests) {
    return false
  }

  userLimit.count++
  return true
}