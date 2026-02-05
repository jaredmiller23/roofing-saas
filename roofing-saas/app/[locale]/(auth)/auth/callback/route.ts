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

  // Extract locale from the URL path (e.g., '/en/auth/callback' -> 'en')
  const pathParts = requestUrl.pathname.split('/')
  const locale = pathParts[1] || 'en'

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

      // Successful verification - redirect to onboarding for new users
      // The onboarding layout will redirect to dashboard if already completed
      return NextResponse.redirect(new URL(`/${locale}/onboarding`, requestUrl.origin))
    }
  }

  // Error occurred - redirect to login with error message
  return NextResponse.redirect(
    new URL(`/${locale}/login?error=Could not verify email`, requestUrl.origin)
  )
}
