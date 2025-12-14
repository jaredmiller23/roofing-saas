import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  signatureDocumentRateLimit,
  projectUpdateRateLimit,
  authRateLimit,
  applyRateLimit,
} from './lib/rate-limit'

/**
 * Proxy middleware for authentication, tenant context, and rate limiting
 *
 * This proxy:
 * 1. Applies rate limiting to sensitive endpoints
 * 2. Refreshes the Supabase auth session
 * 3. Validates tenant access (future: subdomain routing)
 * 4. Protects authenticated routes
 * 5. Handles cookie management for auth state
 *
 * Note: For Phase 1, we're starting with a single tenant.
 * Multi-tenant subdomain routing will be added in a future phase.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  // Apply rate limiting to signature documents endpoints
  if (pathname.startsWith('/api/signature-documents/')) {
    const rateLimitResult = await applyRateLimit(request, signatureDocumentRateLimit)
    if (rateLimitResult instanceof Response) {
      return rateLimitResult // Rate limit exceeded
    }
  }

  // Apply rate limiting to project PATCH endpoints
  if (pathname.match(/^\/api\/projects\/[^/]+$/) && method === 'PATCH') {
    const rateLimitResult = await applyRateLimit(request, projectUpdateRateLimit)
    if (rateLimitResult instanceof Response) {
      return rateLimitResult // Rate limit exceeded
    }
  }

  // Apply rate limiting to auth endpoints
  if (pathname.startsWith('/api/auth/')) {
    const rateLimitResult = await applyRateLimit(request, authRateLimit)
    if (rateLimitResult instanceof Response) {
      return rateLimitResult // Rate limit exceeded
    }
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public routes that don't require authentication
  const publicRoutes = [
    '/', // Marketing landing page
    '/login',
    '/register',
    '/reset-password',
    '/auth/callback',
    '/auth/update-password',
    '/sign', // E-signature signing pages (public access with token)
    // Test endpoints (development only)
    '/api/sms/test',
    // Webhooks (called by external services)
    '/api/sms/webhook',
    '/api/email/webhook',
    '/api/voice/webhook',
    '/api/voice/twiml',
    '/api/voice/recording',
  ]

  const isPublicRoute = publicRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Protect authenticated routes
  if (!user && !isPublicRoute) {
    // No user, redirect to login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user is logged in and tries to access auth pages, redirect to dashboard
  if (user && (
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register')
  )) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
