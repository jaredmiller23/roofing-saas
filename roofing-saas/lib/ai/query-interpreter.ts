/**
 * Natural Language Query Interpreter
 * Converts natural language questions into structured query interpretations
 * that can be safely converted to SQL.
 */

import {
  type NaturalLanguageQuery,
  type QueryInterpretation,
  type QueryIntent,
  type QueryEntity,
  type QueryFilter,
  type TimeFrame,
  type VisualizationType,
  SCHEMA_MAPPING
} from './query-types'

export class QueryInterpreter {
  private readonly AI_ENABLED = process.env.NODE_ENV === 'production' && process.env.OPENAI_API_KEY

  async interpret(query: NaturalLanguageQuery): Promise<QueryInterpretation> {
    const normalizedQuery = this.normalizeQuery(query.query)

    // Try pattern-based interpretation first (fast, reliable)
    const patternResult = this.interpretWithPatterns(normalizedQuery, query.context)
    if (patternResult.confidence > 0.8) {
      return patternResult
    }

    // Fall back to AI interpretation if available and pattern matching fails
    if (this.AI_ENABLED && patternResult.confidence < 0.6) {
      try {
        const aiResult = await this.interpretWithAI(normalizedQuery, query.context)
        // Combine AI result with pattern result, preferring higher confidence
        return aiResult.confidence > patternResult.confidence ? aiResult : patternResult
      } catch (error) {
        console.error('AI interpretation failed:', error)
        // Fall back to pattern result
      }
    }

    return patternResult
  }

  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, ' ') // Remove special chars except spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
  }

  private interpretWithPatterns(query: string, context: { tenantId: string; userRole?: string }): QueryInterpretation {
    const entities: QueryEntity[] = []
    const filters: QueryFilter[] = []
    let visualization: VisualizationType = 'table'
    let confidence = 0.5

    // Intent detection
    const intent = this.detectIntent(query)
    confidence += intent.confidence * 0.3

    // Entity extraction
    const extractedEntities = this.extractEntities(query, context)
    entities.push(...extractedEntities)
    confidence += extractedEntities.length > 0 ? 0.2 : 0

    // Time frame detection
    const timeframe = this.extractTimeFrame(query)
    if (timeframe) confidence += 0.2

    // Filter detection
    const extractedFilters = this.extractFilters(query)
    filters.push(...extractedFilters)
    confidence += extractedFilters.length > 0 ? 0.1 : 0

    // Metrics extraction
    const metrics = this.extractMetrics(query)
    confidence += metrics.length > 0 ? 0.2 : 0

    // Group by detection
    const groupBy = this.extractGroupBy(query)

    // Visualization suggestion
    visualization = this.suggestVisualization(intent, metrics, groupBy)

    return {
      intent,
      entities,
      metrics,
      filters,
      groupBy,
      timeframe,
      visualization,
      confidence: Math.min(confidence, 1.0)
    }
  }

  private detectIntent(query: string): QueryIntent {
    const patterns = {
      count: /\b(how many|count|number of|total)\b/,
      sum: /\b(total|sum|revenue|value|amount)\b/,
      average: /\b(average|avg|mean)\b/,
      compare: /\b(compare|vs|versus|against|difference)\b/,
      trend: /\b(trend|growth|over time|monthly|yearly)\b/,
      list: /\b(show|list|display|get|find)\b/,
      aggregate: /\b(group|by|breakdown|segment)\b/
    }

    let bestMatch: { type: keyof typeof patterns; confidence: number } = {
      type: 'list',
      confidence: 0.3
    }

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(query)) {
        const matchLength = query.match(pattern)?.[0].length || 0
        // Give count patterns higher priority
        const priorityBonus = type === 'count' ? 0.5 : 0
        const normalizedConfidence = (matchLength / query.length) + priorityBonus
        if (normalizedConfidence > bestMatch.confidence) {
          bestMatch = { type: type as keyof typeof patterns, confidence: normalizedConfidence }
        }
      }
    }

    return {
      type: bestMatch.type,
      subject: this.extractSubject(query),
      action: bestMatch.type,
      confidence: bestMatch.confidence
    }
  }

  private extractSubject(query: string): string {
    const subjects = ['leads', 'customers', 'projects', 'revenue', 'sales', 'profit', 'margin']

    for (const subject of subjects) {
      if (query.includes(subject)) {
        return subject
      }
    }

    // Check schema mappings for alternative names
    for (const [table, config] of Object.entries(SCHEMA_MAPPING)) {
      if (config.commonNames.some(name => query.includes(name))) {
        return table
      }
    }

    return 'unknown'
  }

  private extractEntities(query: string, _context: { tenantId: string; userRole?: string }): QueryEntity[] {
    const entities: QueryEntity[] = []

    // Extract table entities
    for (const [tableName, config] of Object.entries(SCHEMA_MAPPING)) {
      const allNames = [tableName, ...config.commonNames]
      for (const name of allNames) {
        // Use word boundary regex to avoid partial matches
        const wordPattern = new RegExp(`\\b${name.toLowerCase()}\\b`, 'i')
        if (wordPattern.test(query)) {
          entities.push({
            name: tableName,
            type: 'table',
            confidence: 0.8
          })
          break
        }
      }
    }

    // Extract column entities
    const columnPatterns = {
      'status': /\b(status|state|condition)\b/,
      'source': /\b(source|origin|channel)\b/,
      'type': /\b(type|kind|category)\b/,
      'value': /\b(value|amount|price|cost)\b/,
      'date': /\b(date|time|when|created|updated)\b/
    }

    for (const [column, pattern] of Object.entries(columnPatterns)) {
      if (pattern.test(query)) {
        entities.push({
          name: column,
          type: 'column',
          confidence: 0.7
        })
      }
    }

    return entities
  }

  private extractTimeFrame(query: string): TimeFrame | undefined {
    const timePatterns = {
      'this month': { type: 'month' as const, relative: 'this month' },
      'last month': { type: 'month' as const, relative: 'last month' },
      'this year': { type: 'year' as const, relative: 'this year' },
      'last year': { type: 'year' as const, relative: 'last year' },
      'this quarter': { type: 'quarter' as const, relative: 'this quarter' },
      'last quarter': { type: 'quarter' as const, relative: 'last quarter' },
      'this week': { type: 'week' as const, relative: 'this week' },
      'last week': { type: 'week' as const, relative: 'last week' },
      'today': { type: 'day' as const, relative: 'today' },
      'yesterday': { type: 'day' as const, relative: 'yesterday' }
    }

    for (const [pattern, timeframe] of Object.entries(timePatterns)) {
      if (query.includes(pattern)) {
        return timeframe
      }
    }

    // Extract relative periods like "past 30 days"
    const relativeMatch = query.match(/(?:past|last)\s+(\d+)\s+(days?|weeks?|months?|years?)/i)
    if (relativeMatch) {
      const [, amount, unit] = relativeMatch
      return {
        type: unit.replace(/s$/, '') as TimeFrame['type'],
        relative: `past ${amount} ${unit}`
      }
    }

    return undefined
  }

  private extractFilters(query: string): QueryFilter[] {
    const filters: QueryFilter[] = []

    // Status filters
    const statusMatch = query.match(/\b(active|inactive|completed|pending|overdue|cancelled)\b/i)
    if (statusMatch) {
      filters.push({
        column: 'status',
        operator: 'equals',
        value: statusMatch[1].toLowerCase(),
        confidence: 0.8
      })
    }

    // Location filters
    const locationMatch = query.match(/\bin\s+([A-Za-z\s]+?)(?:\s|$)/i)
    if (locationMatch) {
      filters.push({
        column: 'location',
        operator: 'like',
        value: locationMatch[1].trim(),
        confidence: 0.7
      })
    }

    // Numeric comparisons
    const numericMatch = query.match(/\b(above|below|over|under|greater than|less than)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\b/i)
    if (numericMatch) {
      const [, operator, value] = numericMatch
      const op = ['above', 'over', 'greater than'].includes(operator.toLowerCase()) ? 'greater_than' : 'less_than'
      filters.push({
        column: 'value',
        operator: op,
        value: parseFloat(value.replace(/,/g, '')),
        confidence: 0.8
      })
    }

    return filters
  }

  private extractMetrics(query: string): string[] {
    const metrics: string[] = []

    const metricPatterns = {
      'count': /\b(how many|count|number)\b/,
      'sum': /\b(total|sum)\b/,
      'avg': /\b(average|avg|mean)\b/,
      'revenue': /\b(revenue|sales|income)\b/,
      'profit': /\b(profit|margin|earnings)\b/,
      'value': /\b(value|amount|worth)\b/,
      'rate': /\b(rate|percentage|percent)\b/
    }

    for (const [metric, pattern] of Object.entries(metricPatterns)) {
      if (pattern.test(query)) {
        metrics.push(metric)
      }
    }

    return metrics
  }

  private extractGroupBy(query: string): string[] {
    const groupBy: string[] = []

    const groupPatterns = {
      'status': /\bby\s+status\b/,
      'type': /\bby\s+type\b/,
      'source': /\bby\s+source\b/,
      'month': /\bby\s+month\b/,
      'year': /\bby\s+year\b/,
      'quarter': /\bby\s+quarter\b/,
      'rep': /\bby\s+(rep|representative|salesperson)\b/,
      'location': /\bby\s+(location|state|city)\b/
    }

    for (const [column, pattern] of Object.entries(groupPatterns)) {
      if (pattern.test(query)) {
        groupBy.push(column)
      }
    }

    return groupBy
  }

  private suggestVisualization(
    intent: QueryIntent,
    metrics: string[],
    groupBy: string[]
  ): VisualizationType {
    // Single number metrics
    if (metrics.length === 1 && groupBy.length === 0) {
      return 'number'
    }

    // Comparisons and trends
    if (intent.type === 'compare' || intent.type === 'trend') {
      return groupBy.includes('month') || groupBy.includes('year') ? 'line' : 'bar'
    }

    // Aggregations with grouping
    if (groupBy.length > 0) {
      if (groupBy.includes('month') || groupBy.includes('year') || groupBy.includes('quarter')) {
        return metrics.includes('count') ? 'line' : 'area'
      }
      return groupBy.length === 1 ? 'pie' : 'bar'
    }

    // Lists
    if (intent.type === 'list') {
      return 'table'
    }

    // Counts
    if (intent.type === 'count') {
      return 'number'
    }

    return 'table'
  }

  private async interpretWithAI(query: string, context: { tenantId: string; userRole?: string }): Promise<QueryInterpretation> {
    // This would integrate with OpenAI or Anthropic API
    // For now, return a lower confidence pattern-based result
    // In production, this would send a structured prompt to the AI service

    const prompt = this.buildAIPrompt(query, context)

    // Simulated AI response - in production, this would be an actual API call
    const _aiResponse = await this.simulateAIResponse(prompt)

    return {
      intent: {
        type: 'list',
        subject: 'unknown',
        action: 'list',
        confidence: 0.5
      },
      entities: [],
      metrics: [],
      filters: [],
      groupBy: [],
      timeframe: undefined,
      visualization: 'table',
      confidence: 0.5
    }
  }

  private buildAIPrompt(query: string, context: { tenantId: string; userRole?: string }): string {
    const schemaDescription = Object.entries(SCHEMA_MAPPING)
      .map(([table, config]) => `${table}: ${config.description}`)
      .join('\n')

    return `
You are a business intelligence assistant for a roofing SaaS platform.
Convert this natural language query into structured format.

Available data:
${schemaDescription}

User query: "${query}"
User context: Tenant ID ${context.tenantId}, Role: ${context.userRole || 'user'}

Respond with a JSON object containing:
- intent: {type, subject, action, confidence}
- entities: [{name, type, confidence}]
- metrics: [string array]
- filters: [{column, operator, value, confidence}]
- groupBy: [string array]
- timeframe: {type, relative?}
- visualization: string
- confidence: number (0-1)

Focus on safety - only SELECT operations, proper parameterization.
`
  }

  private async simulateAIResponse(_prompt: string): Promise<{ intent: QueryIntent; entities: QueryEntity[]; metrics: string[]; filters: QueryFilter[]; groupBy: string[]; visualization: VisualizationType; confidence: number }> {
    // In production, this would make an actual API call to OpenAI/Anthropic
    // For now, return a placeholder response
    return {
      intent: { type: 'list', subject: 'projects', action: 'list', confidence: 0.7 },
      entities: [],
      metrics: [],
      filters: [],
      groupBy: [],
      visualization: 'table',
      confidence: 0.7
    }
  }
}

// Export a singleton instance
export const queryInterpreter = new QueryInterpreter()