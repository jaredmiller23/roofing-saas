import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Auth callback handler for email verification and OAuth
 *
 * This route handles:
 * - Email verification confirmations
 * - Password reset confirmations
 * - OAuth provider callbacks
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
      // Successful verification - redirect to dashboard or specified page
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  // Error occurred - redirect to login with error message
  return NextResponse.redirect(
    new URL('/login?error=Could not verify email', requestUrl.origin)
  )
}
