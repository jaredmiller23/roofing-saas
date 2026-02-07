import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const checks: Record<string, { status: 'ok' | 'error'; latency_ms: number; error?: string }> = {}

  // Database connectivity check
  const dbStart = Date.now()
  try {
    const supabase = await createAdminClient()
    const { error } = await supabase.from('tenants').select('id').limit(1)
    if (error) throw error
    checks.database = { status: 'ok', latency_ms: Date.now() - dbStart }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown database error'
    checks.database = { status: 'error', latency_ms: Date.now() - dbStart, error: message }
  }

  const allHealthy = Object.values(checks).every(c => c.status === 'ok')

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
      checks
    },
    { status: allHealthy ? 200 : 503 }
  )
}
