import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

/**
 * Check Google Calendar connection status
 * GET /api/calendar/google/status
 *
 * Returns:
 * - connected: boolean
 * - calendarUrl: string | null (public calendar embed URL if available)
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Check if user has Google Calendar connected
    // This would typically check a user_settings table or similar
    const { data: settings } = await supabase
      .from('user_settings')
      .select('google_calendar_connected, google_calendar_url')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      connected: settings?.google_calendar_connected || false,
      calendarUrl: settings?.google_calendar_url || null
    })
  } catch (error) {
    console.error('Error checking Google Calendar status:', error)
    // Return not connected by default if table doesn't exist yet
    return NextResponse.json({
      connected: false,
      calendarUrl: null
    })
  }
}
