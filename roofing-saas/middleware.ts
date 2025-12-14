import { NextRequest, NextResponse } from "next/server"
import {
  signatureDocumentRateLimit,
  projectUpdateRateLimit,
  authRateLimit,
  applyRateLimit,
  getClientIdentifier,
} from "./lib/rate-limit"

export async function middleware(request: NextRequest) {
  // Skip rate limiting for static files and internal Next.js routes
  if (
    request.nextUrl.pathname.startsWith("/_next/") ||
    request.nextUrl.pathname.startsWith("/favicon.ico") ||
    request.nextUrl.pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl
  const method = request.method

  // Apply rate limiting to signature documents endpoints
  if (pathname.startsWith("/api/signature-documents/")) {
    const rateLimitResult = await applyRateLimit(request, signatureDocumentRateLimit)

    if (rateLimitResult instanceof Response) {
      return rateLimitResult // Rate limit exceeded
    }

    const response = NextResponse.next()

    // Add rate limit headers to successful responses
    if (rateLimitResult?.headers) {
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
    }

    return response
  }

  // Apply rate limiting to project PATCH endpoints
  if (pathname.match(/^\/api\/projects\/[^/]+$/) && method === "PATCH") {
    const rateLimitResult = await applyRateLimit(request, projectUpdateRateLimit)

    if (rateLimitResult instanceof Response) {
      return rateLimitResult // Rate limit exceeded
    }

    const response = NextResponse.next()

    // Add rate limit headers to successful responses
    if (rateLimitResult?.headers) {
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
    }

    return response
  }

  // Apply rate limiting to auth endpoints
  if (pathname.startsWith("/api/auth/")) {
    const rateLimitResult = await applyRateLimit(request, authRateLimit)

    if (rateLimitResult instanceof Response) {
      return rateLimitResult // Rate limit exceeded
    }

    const response = NextResponse.next()

    // Add rate limit headers to successful responses
    if (rateLimitResult?.headers) {
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
    }

    return response
  }

  return NextResponse.next()
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}