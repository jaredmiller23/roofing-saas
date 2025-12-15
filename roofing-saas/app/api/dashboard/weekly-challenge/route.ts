import { NextResponse } from 'next/server'

/**
 * GET /api/dashboard/weekly-challenge
 * Returns weekly challenge data
 * TODO: Replace with real data from database
 */
export async function GET() {
  // Return mock data for now - replace with real queries later
  const mockData = {
    success: true,
    data: {
      challenge: {
        id: '1',
        title: 'Door Knock Challenge',
        description: 'Complete 50 door knocks this week',
        startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString(),
        target: 50,
        current: 34,
        participants: 8,
        prize: '$500 bonus',
        status: 'active',
      },
    },
  }

  return NextResponse.json(mockData)
}
