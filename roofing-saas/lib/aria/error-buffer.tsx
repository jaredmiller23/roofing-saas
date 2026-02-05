'use client'

/**
 * ARIA Error Buffer - Client-side error capture for ARIA 2.0
 *
 * Captures recent API errors so ARIA can see what went wrong without the user
 * having to describe the error. This gives ARIA self-awareness of platform issues.
 *
 * Features:
 * - Ring buffer: keeps last MAX_ERRORS errors
 * - TTL: errors older than TTL_MS are automatically pruned
 * - Event-driven: listens for 'aria:api-error' custom events
 * - React integration: useErrorBuffer hook for components
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { ARIACapturedError, ARIAErrorContext } from './types'

// Configuration
const MAX_ERRORS = 10
const TTL_MS = 30 * 60 * 1000 // 30 minutes

// Custom event type for API errors
export interface ARIAApiErrorEvent extends CustomEvent {
  detail: Omit<ARIACapturedError, 'timestamp'>
}

// Declare the custom event on the window
declare global {
  interface WindowEventMap {
    'aria:api-error': ARIAApiErrorEvent
  }
}

/**
 * Emit an API error event that the error buffer will capture
 * Called from lib/api/client.ts when an API error occurs
 */
export function emitApiError(error: Omit<ARIACapturedError, 'timestamp'>) {
  if (typeof window === 'undefined') return

  const event = new CustomEvent('aria:api-error', {
    detail: error,
  })
  window.dispatchEvent(event)
}

/**
 * Sanitize request body to remove sensitive fields before storing
 */
function sanitizeRequestBody(body: unknown): Record<string, unknown> | undefined {
  if (!body || typeof body !== 'object') return undefined

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'authorization',
    'credit_card',
    'ssn',
    'social_security',
  ]

  const sanitized = { ...(body as Record<string, unknown>) }

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]'
    }
    // Check nested objects one level deep
    for (const key of Object.keys(sanitized)) {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        const nested = sanitized[key] as Record<string, unknown>
        if (field in nested) {
          nested[field] = '[REDACTED]'
        }
      }
    }
  }

  return sanitized
}

// Context type
interface ErrorBufferContextType {
  errors: ARIACapturedError[]
  getErrorContext: () => ARIAErrorContext
  clearErrors: () => void
}

const ErrorBufferContext = createContext<ErrorBufferContextType | null>(null)

/**
 * Provider component that captures and stores API errors
 */
export function ErrorBufferProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<ARIACapturedError[]>([])

  // Prune expired errors
  const pruneExpired = useCallback(() => {
    const now = Date.now()
    setErrors((prev) =>
      prev.filter((error) => {
        const errorTime = new Date(error.timestamp).getTime()
        return now - errorTime < TTL_MS
      })
    )
  }, [])

  // Add a new error to the buffer
  const addError = useCallback((error: Omit<ARIACapturedError, 'timestamp'>) => {
    const captured: ARIACapturedError = {
      ...error,
      timestamp: new Date().toISOString(),
      requestBody: sanitizeRequestBody(error.requestBody),
    }

    setErrors((prev) => {
      // Add to front, keep only MAX_ERRORS
      const updated = [captured, ...prev].slice(0, MAX_ERRORS)
      return updated
    })
  }, [])

  // Listen for error events
  useEffect(() => {
    const handleError = (event: ARIAApiErrorEvent) => {
      addError(event.detail)
    }

    window.addEventListener('aria:api-error', handleError)

    // Prune expired errors periodically
    const pruneInterval = setInterval(pruneExpired, 60 * 1000) // Every minute

    return () => {
      window.removeEventListener('aria:api-error', handleError)
      clearInterval(pruneInterval)
    }
  }, [addError, pruneExpired])

  // Get error context for ARIA
  const getErrorContext = useCallback((): ARIAErrorContext => {
    // Prune expired before returning
    const now = Date.now()
    const validErrors = errors.filter((error) => {
      const errorTime = new Date(error.timestamp).getTime()
      return now - errorTime < TTL_MS
    })

    return {
      recentErrors: validErrors,
      currentPage: typeof window !== 'undefined' ? window.location.pathname : '',
    }
  }, [errors])

  // Clear all errors (useful after ARIA acknowledges them)
  const clearErrors = useCallback(() => {
    setErrors([])
  }, [])

  return (
    <ErrorBufferContext.Provider value={{ errors, getErrorContext, clearErrors }}>
      {children}
    </ErrorBufferContext.Provider>
  )
}

/**
 * Hook to access the error buffer
 */
export function useErrorBuffer() {
  const context = useContext(ErrorBufferContext)
  if (!context) {
    // Return a no-op version if used outside provider (e.g., in tests)
    return {
      errors: [] as ARIACapturedError[],
      getErrorContext: () => ({ recentErrors: [], currentPage: '' }),
      clearErrors: () => {},
    }
  }
  return context
}
