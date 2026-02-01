/**
 * Production Metrics Collector
 *
 * Records timing data to Supabase for production latency analysis.
 * Claude can query this data directly via the SQL API.
 *
 * Table: performance_metrics
 */

export interface SpanRecord {
  op: string
  name: string
  duration_ms: number
  status: 'ok' | 'error'
  attributes: Record<string, string | number | boolean>
  error?: string
}

// Buffer spans and flush periodically to reduce DB writes
const spanBuffer: SpanRecord[] = []
const FLUSH_INTERVAL_MS = 5000 // Flush every 5 seconds
const MAX_BUFFER_SIZE = 50 // Or when buffer reaches 50 spans
let flushTimeout: NodeJS.Timeout | null = null

/**
 * Record a span to the metrics buffer
 * Spans are batched and written to Supabase periodically
 */
export function recordSpan(span: SpanRecord): void {
  spanBuffer.push(span)

  // Flush if buffer is full
  if (spanBuffer.length >= MAX_BUFFER_SIZE) {
    flushSpans()
    return
  }

  // Schedule flush if not already scheduled
  if (!flushTimeout) {
    flushTimeout = setTimeout(() => {
      flushSpans()
    }, FLUSH_INTERVAL_MS)
  }
}

/**
 * Flush buffered spans to Supabase
 */
async function flushSpans(): Promise<void> {
  if (flushTimeout) {
    clearTimeout(flushTimeout)
    flushTimeout = null
  }

  if (spanBuffer.length === 0) return

  // Take all spans from buffer
  const spans = spanBuffer.splice(0, spanBuffer.length)

  // Get Supabase URL and service key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    // Can't write to Supabase, just log to console in dev
    if (process.env.NODE_ENV === 'development') {
      console.log('[Metrics] Would write spans:', spans.length)
    }
    return
  }

  try {
    const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development'

    const records = spans.map(span => ({
      op: span.op,
      name: span.name,
      duration_ms: span.duration_ms,
      status: span.status,
      attributes: span.attributes,
      error: span.error || null,
      environment,
    }))

    const response = await fetch(`${supabaseUrl}/rest/v1/performance_metrics`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(records),
    })

    if (!response.ok) {
      console.error('[Metrics] Failed to write spans:', response.status)
    }
  } catch (error) {
    // Don't let metrics collection break the app
    console.error('[Metrics] Error flushing spans:', error)
  }
}

// Flush on process exit (best effort)
if (typeof process !== 'undefined' && process.on) {
  process.on('beforeExit', () => {
    flushSpans()
  })
}
