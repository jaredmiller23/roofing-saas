import { NextResponse } from 'next/server'

/**
 * GET /api/dashboard/activity
 * Returns recent activity feed data
 * TODO: Replace with real data from database
 */
export async function GET() {
  // Return mock data for now - replace with real queries later
  const mockData = {
    success: true,
    data: {
      activities: [
        {
          id: '1',
          type: 'sale',
          title: 'New Sale Closed',
          description: 'Johnson Roofing Project - $45,000',
          user: { name: 'Sarah M.', avatar: undefined },
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          value: 45000,
        },
        {
          id: '2',
          type: 'lead',
          title: 'New Lead Captured',
          description: 'Storm damage inquiry from 123 Oak St',
          user: { name: 'Mike R.', avatar: undefined },
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        },
        {
          id: '3',
          type: 'appointment',
          title: 'Inspection Scheduled',
          description: 'Williams residence - Tomorrow 10am',
          user: { name: 'Tom K.', avatar: undefined },
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        },
        {
          id: '4',
          type: 'milestone',
          title: 'Monthly Goal Reached',
          description: 'Team exceeded $200k target by 15%',
          user: { name: 'Team', avatar: undefined },
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          badge: '🎉',
        },
      ],
    },
  }

  return NextResponse.json(mockData)
}
