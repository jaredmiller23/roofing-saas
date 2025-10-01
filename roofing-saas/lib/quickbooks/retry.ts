/**
 * Retry Logic for QuickBooks API Calls
 *
 * Handles transient failures, rate limiting, and network errors
 */

export interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryableStatusCodes?: number[]
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  retryableStatusCodes: [429, 500, 502, 503, 504],
}

export class RetryableError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly retryAfter?: number
  ) {
    super(message)
    this.name = 'RetryableError'
  }
}

/**
 * Execute a function with exponential backoff retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: Error | undefined
  let delay = opts.initialDelay

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // Don't retry on last attempt
      if (attempt === opts.maxRetries) {
        break
      }

      // Check if error is retryable
      if (!isRetryableError(error, opts.retryableStatusCodes)) {
        throw error
      }

      // Handle rate limiting with Retry-After header
      if (error instanceof RetryableError && error.statusCode === 429) {
        delay = error.retryAfter ? error.retryAfter * 1000 : delay
      }

      // Log retry attempt
      console.warn(
        `[Retry] Attempt ${attempt + 1}/${opts.maxRetries} failed, retrying in ${delay}ms...`,
        { error: lastError.message }
      )

      // Wait before retrying
      await sleep(delay)

      // Exponential backoff
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay)
    }
  }

  throw lastError
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown, retryableStatusCodes: number[]): boolean {
  if (error instanceof RetryableError) {
    return error.statusCode
      ? retryableStatusCodes.includes(error.statusCode)
      : true
  }

  // Check for network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true
  }

  // Check for timeout errors
  if (error instanceof Error && error.message.includes('timeout')) {
    return true
  }

  return false
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Rate limiter using token bucket algorithm
 */
export class RateLimiter {
  private tokens: number
  private lastRefill: number

  constructor(
    private readonly maxTokens: number,
    private readonly refillRate: number // tokens per second
  ) {
    this.tokens = maxTokens
    this.lastRefill = Date.now()
  }

  async acquire(cost = 1): Promise<void> {
    await this.refillTokens()

    if (this.tokens >= cost) {
      this.tokens -= cost
      return
    }

    // Calculate wait time
    const tokensNeeded = cost - this.tokens
    const waitMs = (tokensNeeded / this.refillRate) * 1000

    await sleep(waitMs)
    await this.acquire(cost)
  }

  private async refillTokens(): Promise<void> {
    const now = Date.now()
    const timePassed = (now - this.lastRefill) / 1000
    const tokensToAdd = timePassed * this.refillRate

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd)
    this.lastRefill = now
  }

  getAvailableTokens(): number {
    return Math.floor(this.tokens)
  }
}

// Global rate limiter for QuickBooks API
// QuickBooks limits: 500 requests per minute per realm
export const quickbooksRateLimiter = new RateLimiter(
  500, // max tokens
  8.33 // refill rate (500 per 60 seconds)
)
