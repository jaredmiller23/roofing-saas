import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the application base URL for building absolute URLs
 * Uses NEXT_PUBLIC_APP_URL if available, otherwise falls back to window.location.origin
 * This ensures consistent URL generation between development and production
 */
export function getAppBaseUrl(): string {
  // In client-side code, prefer NEXT_PUBLIC_APP_URL if configured
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  // Fallback to window.location.origin if available (client-side)
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  // Final fallback for SSR/build time
  return 'http://localhost:3000'
}

/**
 * Wrap a promise with a timeout
 * Rejects if the promise doesn't resolve within the specified time
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Custom error message on timeout
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage))
    }, timeoutMs)

    promise
      .then(result => {
        clearTimeout(timer)
        resolve(result)
      })
      .catch(error => {
        clearTimeout(timer)
        reject(error)
      })
  })
}
