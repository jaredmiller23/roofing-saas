import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Create Redis instance — null when Upstash is not configured (local dev)
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

function createLimiter(
  limiter: ReturnType<typeof Ratelimit.slidingWindow>,
  prefix: string
): Ratelimit | null {
  if (!redis) return null
  return new Ratelimit({ redis, limiter, analytics: true, prefix })
}

// Rate limiters for different endpoint types
export const signatureDocumentRateLimit = createLimiter(
  Ratelimit.slidingWindow(10, "1 m"),
  "@upstash/ratelimit:signature-documents"
)

export const projectUpdateRateLimit = createLimiter(
  Ratelimit.slidingWindow(5, "1 m"),
  "@upstash/ratelimit:project-updates"
)

export const authRateLimit = createLimiter(
  Ratelimit.slidingWindow(5, "15 m"),
  "@upstash/ratelimit:auth"
)

export const generalRateLimit = createLimiter(
  Ratelimit.slidingWindow(100, "1 m"),
  "@upstash/ratelimit:general"
)

export const ariaRateLimit = createLimiter(
  Ratelimit.slidingWindow(30, "1 m"),
  "@upstash/ratelimit:aria"
)

/**
 * Check rate limit for an authenticated user.
 * Uses sliding window: 100 requests per 1 minute per identifier.
 * Gracefully no-ops when Upstash is not configured (returns { success: true }).
 */
export async function checkRateLimit(
  identifier: string
): Promise<{ success: boolean }> {
  if (!generalRateLimit) {
    return { success: true }
  }

  const result = await generalRateLimit.limit(identifier)
  return { success: result.success }
}

// Helper function to get client identifier (IP or user ID)
export function getClientIdentifier(request: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`
  }

  // Get IP from various headers (for different hosting environments)
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const ip = forwarded ? forwarded.split(",")[0] : realIp

  return ip || "unknown"
}

// Rate limit response helpers
export function createRateLimitResponse(limit: number, remaining: number, reset: Date) {
  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded",
      message: "Too many requests. Please try again later.",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": reset.toISOString(),
        "Retry-After": Math.ceil((reset.getTime() - Date.now()) / 1000).toString(),
      },
    }
  )
}

// Middleware function to apply rate limiting
export async function applyRateLimit(
  request: Request,
  rateLimit: Ratelimit | null,
  identifier?: string
) {
  if (!rateLimit) return null

  const clientId = identifier || getClientIdentifier(request)

  try {
    const result = await rateLimit.limit(clientId)

    if (!result.success) {
      return createRateLimitResponse(
        result.limit,
        result.remaining,
        new Date(result.reset)
      )
    }

    // Return headers for successful requests
    return {
      headers: {
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": new Date(result.reset).toISOString(),
      },
    }
  } catch (error) {
    console.error("Rate limit error:", error)
    // In case of Redis errors, allow the request to proceed
    return null
  }
}