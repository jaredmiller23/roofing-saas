import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import {
  signatureDocumentRateLimit,
  projectUpdateRateLimit,
  authRateLimit,
  applyRateLimit,
} from './lib/rate-limit'
import { locales, defaultLocale } from './lib/i18n/config'
import { shouldBlockRequest } from './lib/auth/mfa-enforcement'

// Create i18n middleware instance
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localeDetection: true,
})

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
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  // Handle i18n routing first (locale detection, redirects)
  // Skip for API routes, static assets, auth routes, root landing page,
  // and paths that already have a locale prefix
  // These routes exist outside the [locale] directory structure
  const authRoutes = ['/login', '/register', '/reset-password', '/auth']
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  const isRootPath = pathname === '/'
  const hasLocalePrefix = locales.some(locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`)

  // Only run i18n middleware for paths that need locale prefix added
  if (!pathname.startsWith('/api/') &&
      !pathname.startsWith('/_next/') &&
      !isAuthRoute &&
      !isRootPath &&
      !hasLocalePrefix) {
    const intlResponse = intlMiddleware(request)
    // If intl middleware wants to redirect, return that response
    if (intlResponse.headers.get('x-middleware-rewrite') ||
        intlResponse.status === 307 ||
        intlResponse.status === 308) {
      return intlResponse
    }
  }

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

  // Trim env vars to handle potential trailing newlines (common copy-paste issue)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
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
  // Note: These are checked without locale prefix since i18n routing happens first
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

  // Strip locale prefix for route matching (e.g., /en/login -> /login)
  const pathnameWithoutLocale = locales.reduce(
    (path, locale) => path.replace(new RegExp(`^/${locale}`), ''),
    pathname
  ) || '/'

  const isPublicRoute = publicRoutes.some(route =>
    pathnameWithoutLocale.startsWith(route)
  )

  // Protect authenticated routes
  if (!user && !isPublicRoute) {
    // No user, redirect to login page
    // Use explicit URL construction to avoid locale prefix bleeding through
    // Extract origin from request.url to avoid any nextUrl modifications
    const origin = new URL(request.url).origin
    return NextResponse.redirect(new URL('/login', origin))
  }

  // If user is logged in and tries to access auth pages, redirect to dashboard
  if (user && (
    pathnameWithoutLocale.startsWith('/login') ||
    pathnameWithoutLocale.startsWith('/register')
  )) {
    // Redirect to locale-prefixed dashboard since dashboard pages are under [locale]
    const locale = locales.find(l => pathname.startsWith(`/${l}`)) || defaultLocale
    const origin = new URL(request.url).origin
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, origin))
  }

  // Check MFA enforcement for authenticated users accessing protected routes
  if (user && !isPublicRoute) {
    try {
      const blockResult = await shouldBlockRequest(pathnameWithoutLocale)
      if (blockResult.shouldBlock && blockResult.redirectPath) {
        const locale = locales.find(l => pathname.startsWith(`/${l}`)) || defaultLocale
        const origin = new URL(request.url).origin
        return NextResponse.redirect(new URL(`/${locale}${blockResult.redirectPath}`, origin))
      }
    } catch (error) {
      // Log error but don't block the request - MFA enforcement should be graceful
      console.error('MFA enforcement check failed:', error)
    }
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
     *
     * Also includes i18n locale paths:
     * - / (root for locale redirect)
     * - /(en|es|fr)/:path* (locale-prefixed paths)
     */
    '/',
    '/(en|es|fr)/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
