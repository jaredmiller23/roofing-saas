/**
 * Metrics API
 *
 * GET /api/dev/metrics - View timing data and summary stats from production
 * DELETE /api/dev/metrics - Clear metrics (dev only)
 */
import { NextRequest, NextResponse } from 'next/server'

interface PerformanceMetric {
  id: string
  created_at: string
  op: string
  name: string
  duration_ms: number
  status: string
  attributes: Record<string, unknown>
  error: string | null
  environment: string
}

async function queryMetrics(since: string, orderBy: string, limit: number): Promise<PerformanceMetric[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase not configured')
  }

  const params = new URLSearchParams({
    select: '*',
    created_at: `gte.${since}`,
    order: orderBy,
    limit: String(limit),
  })

  const response = await fetch(`${supabaseUrl}/rest/v1/performance_metrics?${params}`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Query failed: ${response.status}`)
  }

  return response.json()
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const hours = parseInt(searchParams.get('hours') || '1')
  const limit = parseInt(searchParams.get('limit') || '500')
  const format = searchParams.get('format') || 'summary'

  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

  try {
    if (format === 'raw') {
      const spans = await queryMetrics(since, 'created_at.desc', limit)
      return NextResponse.json({ spans, count: spans.length })
    }

    // Get spans ordered by duration for analysis
    const spans = await queryMetrics(since, 'duration_ms.desc', limit)

    if (spans.length === 0) {
      return NextResponse.json({
        message: 'No metrics recorded yet. Deploy and use the app to generate traffic.',
        query: { since, hours },
      })
    }

    // Calculate summary stats
    const byOperation: Record<string, { count: number; total_ms: number; max_ms: number; durations: number[] }> = {}

    for (const span of spans) {
      const key = span.op
      if (!byOperation[key]) {
        byOperation[key] = { count: 0, total_ms: 0, max_ms: 0, durations: [] }
      }
      byOperation[key].count++
      byOperation[key].total_ms += span.duration_ms
      byOperation[key].max_ms = Math.max(byOperation[key].max_ms, span.duration_ms)
      byOperation[key].durations.push(span.duration_ms)
    }

    // Calculate p95 and avg for each operation
    const summary: Record<string, { count: number; avg_ms: number; p95_ms: number; max_ms: number }> = {}
    for (const [op, stats] of Object.entries(byOperation)) {
      stats.durations.sort((a, b) => a - b)
      summary[op] = {
        count: stats.count,
        avg_ms: Math.round(stats.total_ms / stats.count),
        p95_ms: stats.durations[Math.floor(stats.durations.length * 0.95)] || 0,
        max_ms: stats.max_ms,
      }
    }

    // Get slowest individual spans
    const slowest = spans.slice(0, 10).map(s => ({
      op: s.op,
      name: s.name,
      duration_ms: s.duration_ms,
      status: s.status,
      error: s.error,
      created_at: s.created_at,
    }))

    // Get errors
    const errors = spans
      .filter(s => s.status === 'error')
      .slice(0, 10)
      .map(s => ({
        op: s.op,
        name: s.name,
        duration_ms: s.duration_ms,
        error: s.error,
        created_at: s.created_at,
      }))

    return NextResponse.json({
      generated_at: new Date().toISOString(),
      query: { since, hours, total_spans: spans.length },
      by_operation: summary,
      slowest,
      errors,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  await fetch(`${supabaseUrl}/rest/v1/performance_metrics?id=neq.00000000-0000-0000-0000-000000000000`, {
    method: 'DELETE',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
  })

  return NextResponse.json({ success: true, message: 'Metrics cleared' })
}
