import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'

/**
 * Initiate Google Calendar OAuth connection
 * POST /api/calendar/google/connect
 *
 * Note: This requires Google Cloud Platform setup:
 * 1. Create project at console.cloud.google.com
 * 2. Enable Google Calendar API
 * 3. Create OAuth 2.0 credentials
 * 4. Add redirect URI: {APP_URL}/api/calendar/google/callback
 * 5. Add credentials to .env.local:
 *    - GOOGLE_CLIENT_ID
 *    - GOOGLE_CLIENT_SECRET
 */
export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if Google OAuth is configured
    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/google/callback`

    if (!clientId) {
      return NextResponse.json({
        error: 'Google Calendar integration not configured',
        message: 'Please contact your administrator to set up Google Calendar integration. Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables.'
      }, { status: 503 })
    }

    // Build Google OAuth URL
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ]

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.append('client_id', clientId)
    authUrl.searchParams.append('redirect_uri', redirectUri)
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('scope', scopes.join(' '))
    authUrl.searchParams.append('access_type', 'offline')
    authUrl.searchParams.append('prompt', 'consent')
    authUrl.searchParams.append('state', user.id) // Pass user ID for callback

    return NextResponse.json({
      authUrl: authUrl.toString()
    })
  } catch (error) {
    console.error('Error initiating Google Calendar connection:', error)
    return NextResponse.json(
      { error: 'Failed to initiate connection' },
      { status: 500 }
    )
  }
}
