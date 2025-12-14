import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Create Redis instance
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

// Rate limiters for different endpoint types
export const signatureDocumentRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
  analytics: true,
  prefix: "@upstash/ratelimit:signature-documents",
})

export const projectUpdateRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 requests per minute for updates
  analytics: true,
  prefix: "@upstash/ratelimit:project-updates",
})

export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 requests per 15 minutes for auth
  analytics: true,
  prefix: "@upstash/ratelimit:auth",
})

export const generalRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 requests per minute general
  analytics: true,
  prefix: "@upstash/ratelimit:general",
})

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
  rateLimit: Ratelimit,
  identifier?: string
) {
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