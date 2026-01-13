import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Auth callback handler for email verification and OAuth
 *
 * This route handles:
 * - Email verification confirmations
 * - Password reset confirmations
 * - OAuth provider callbacks
 * - Initial trial subscription setup
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()

    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Setup trial subscription for new users
      try {
        const response = await fetch(
          new URL('/api/billing/setup-trial', requestUrl.origin),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Forward the cookies for auth
              Cookie: request.headers.get('Cookie') || '',
            },
          }
        );

        if (!response.ok) {
          console.error('Failed to setup trial:', await response.text());
        }
      } catch (setupError) {
        // Log but don't block - user can still access the app
        console.error('Trial setup error:', setupError);
      }

      // Successful verification - redirect to dashboard or specified page
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  // Error occurred - redirect to login with error message
  return NextResponse.redirect(
    new URL('/login?error=Could not verify email', requestUrl.origin)
  )
}
