import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/dashboard/metrics
 * Returns dashboard metrics data
 * TODO: Replace with real data from database
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const scope = searchParams.get('scope') || 'company'

  // Return mock data for now - replace with real queries later
  const mockData = {
    success: true,
    data: {
      revenue: {
        value: scope === 'company' ? 245000 : scope === 'team' ? 89000 : 34500,
        change: 12.5,
        trend: 'up' as const,
      },
      pipeline: {
        value: scope === 'company' ? 42 : scope === 'team' ? 18 : 7,
        change: 8.3,
        trend: 'up' as const,
      },
      knocks: {
        value: scope === 'company' ? 156 : scope === 'team' ? 67 : 23,
        change: -3.2,
        trend: 'down' as const,
      },
      conversion: {
        value: 24.5,
        change: 2.1,
        trend: 'up' as const,
      },
    },
  }

  return NextResponse.json(mockData)
}
