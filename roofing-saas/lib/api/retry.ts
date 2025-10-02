/**
 * Retry Utility
 * Provides exponential backoff retry logic for API calls
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryableErrors?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryableErrors'>> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
};

/**
 * Execute a function with exponential backoff retry logic
 *
 * @param fn - Async function to execute
 * @param options - Retry configuration options
 * @returns Promise with the result of the function
 * @throws The last error if all retry attempts fail
 *
 * @example
 * const result = await withRetry(async () => {
 *   return await apiCall();
 * }, {
 *   maxAttempts: 5,
 *   initialDelay: 500
 * });
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = DEFAULT_OPTIONS.maxAttempts,
    initialDelay = DEFAULT_OPTIONS.initialDelay,
    maxDelay = DEFAULT_OPTIONS.maxDelay,
    backoffFactor = DEFAULT_OPTIONS.backoffFactor,
    retryableErrors = () => true, // Retry all errors by default
  } = options;

  let lastError: unknown;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if this is the last attempt
      if (attempt === maxAttempts) {
        break;
      }

      // Check if error is retryable
      if (!retryableErrors(error)) {
        throw error;
      }

      // Log retry attempt
      console.warn(
        `Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`,
        error instanceof Error ? error.message : error
      );

      // Wait before retrying
      await sleep(delay);

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  // All attempts failed, throw the last error
  throw lastError;
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Utility to check if an error is a network error (usually retryable)
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;

  // Check for common network error patterns
  const networkErrorPatterns = [
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNRESET',
    'ENETUNREACH',
    'network',
    'timeout',
    'fetch failed',
  ];

  const errorObj = error as { message?: string };
  const errorString = errorObj.message?.toLowerCase() || String(error).toLowerCase();

  return networkErrorPatterns.some((pattern) =>
    errorString.includes(pattern.toLowerCase())
  );
}

/**
 * Utility to check if an error is a rate limit error (usually retryable with backoff)
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error) return false;

  const errorObj = error as { statusCode?: number; status?: number; message?: string };

  // Check for rate limit status codes
  if (errorObj.statusCode === 429 || errorObj.status === 429) {
    return true;
  }

  // Check for rate limit message patterns
  const rateLimitPatterns = ['rate limit', 'too many requests', '429'];

  const errorString = errorObj.message?.toLowerCase() || String(error).toLowerCase();

  return rateLimitPatterns.some((pattern) =>
    errorString.includes(pattern.toLowerCase())
  );
}

/**
 * Utility to check if an error is a server error (5xx, usually retryable)
 */
export function isServerError(error: unknown): boolean {
  if (!error) return false;

  const errorObj = error as { statusCode?: number; status?: number };
  const statusCode = errorObj.statusCode || errorObj.status;

  return typeof statusCode === 'number' && statusCode >= 500 && statusCode < 600;
}

/**
 * Default retry strategy that retries on network errors, rate limits, and server errors
 */
export function defaultRetryStrategy(error: unknown): boolean {
  return isNetworkError(error) || isRateLimitError(error) || isServerError(error);
}

/**
 * Pre-configured retry options for API calls
 */
export const API_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryableErrors: defaultRetryStrategy,
};

/**
 * Pre-configured retry options for critical operations (more aggressive)
 */
export const CRITICAL_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 5,
  initialDelay: 500,
  maxDelay: 30000,
  backoffFactor: 2,
  retryableErrors: defaultRetryStrategy,
};

/**
 * Pre-configured retry options for background tasks (less aggressive)
 */
export const BACKGROUND_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 2000,
  maxDelay: 60000,
  backoffFactor: 3,
  retryableErrors: defaultRetryStrategy,
};
