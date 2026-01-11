/**
 * Error Sanitization Utility
 *
 * Strips sensitive data from error objects before logging.
 * Prevents PII leakage in logs, Sentry, and other telemetry.
 *
 * @module lib/utils/sanitize-error
 */

// Keys that may contain sensitive data
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'key',
  'api_key',
  'apikey',
  'auth',
  'authorization',
  'bearer',
  'credit',
  'card',
  'ssn',
  'social',
  'phone',
  'email',
  'address',
  'dob',
  'birth',
  'date_of_birth',
  'driver',
  'license',
  'passport',
  'bank',
  'account',
  'routing',
  'cvv',
  'cvc',
  'pin',
  'otp',
  'code',
  'verification',
  'cookie',
  'session',
  'refresh',
  'access_token',
  'id_token',
  'jwt',
])

// Patterns for detecting PII in string values
const PII_PATTERNS: { name: string; pattern: RegExp }[] = [
  // Email addresses
  { name: 'email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
  // Phone numbers (various formats)
  { name: 'phone', pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
  // SSN
  { name: 'ssn', pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g },
  // Credit card numbers (basic pattern)
  { name: 'cc', pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g },
  // API keys/tokens (common formats)
  { name: 'token', pattern: /\b(?:sk|pk|api|key|token)[-_][a-zA-Z0-9]{20,}\b/gi },
  // Bearer tokens
  { name: 'bearer', pattern: /Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_.+/=]*/gi },
  // UUIDs that look like user IDs in error messages (redact conservatively)
  // NOT redacting all UUIDs as they're needed for debugging, only in certain contexts
]

/**
 * Redact PII patterns from a string.
 * Returns the redacted string and whether any patterns matched.
 */
function redactPII(text: string): { result: string; matched: boolean } {
  let result = text
  let matched = false
  for (const { name, pattern } of PII_PATTERNS) {
    const newResult = result.replace(pattern, `[REDACTED:${name}]`)
    if (newResult !== result) {
      matched = true
      result = newResult
    }
  }
  return { result, matched }
}

/**
 * Redact a string value, with fallback for sensitive keys.
 * - If PII patterns match, use informative [REDACTED:type] output
 * - If no patterns match but key is sensitive, use plain [REDACTED]
 */
function redactValue(value: string, isSensitive: boolean): string {
  const { result, matched } = redactPII(value)
  if (matched) {
    return result
  }
  // No PII pattern matched, but if the key is sensitive, still redact
  return isSensitive ? '[REDACTED]' : result
}

/**
 * Check if a key name suggests sensitive data
 */
function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase()
  return SENSITIVE_KEYS.has(lowerKey) ||
    Array.from(SENSITIVE_KEYS).some(sensitive => lowerKey.includes(sensitive))
}

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: unknown, depth: number = 0, parentKeyIsSensitive: boolean = false): unknown {
  // Prevent infinite recursion
  if (depth > 5) {
    return '[MAX_DEPTH]'
  }

  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === 'string') {
    return redactValue(obj, parentKeyIsSensitive)
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.slice(0, 10).map(item => sanitizeObject(item, depth + 1, parentKeyIsSensitive))
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {}
    const entries = Object.entries(obj)

    // Limit to first 20 keys to prevent log bloat
    for (const [key, value] of entries.slice(0, 20)) {
      const keyIsSensitive = isSensitiveKey(key)
      if (typeof value === 'string') {
        sanitized[key] = redactValue(value, keyIsSensitive)
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value, depth + 1, keyIsSensitive)
      } else {
        sanitized[key] = value
      }
    }

    if (entries.length > 20) {
      sanitized['...truncated'] = `${entries.length - 20} more keys`
    }

    return sanitized
  }

  return String(obj)
}

/**
 * Truncate and sanitize a stack trace
 */
function sanitizeStack(stack: string | undefined): string | undefined {
  if (!stack) return undefined

  return stack
    .split('\n')
    .slice(0, 8) // First 8 lines only
    .map(line => {
      // Remove absolute paths that might reveal system info
      return line
        .replace(/\/Users\/[^/]+/g, '/***')
        .replace(/\/home\/[^/]+/g, '/***')
        .replace(/C:\\Users\\[^\\]+/g, 'C:\\***')
    })
    .join('\n')
}

export interface SanitizedError {
  name: string
  message: string
  stack?: string
  code?: string | number
  details?: string
  hint?: string
  statusCode?: number
}

/**
 * Sanitize an error object for safe logging
 *
 * @example
 * ```ts
 * try {
 *   await riskyOperation()
 * } catch (error) {
 *   logger.error('Operation failed', { error: sanitizeError(error) })
 * }
 * ```
 */
export function sanitizeError(error: unknown): SanitizedError {
  // Handle non-Error values
  if (!(error instanceof Error)) {
    const message = typeof error === 'string' ? error : String(error)
    return {
      name: 'UnknownError',
      message: redactPII(message).result,
    }
  }

  const sanitized: SanitizedError = {
    name: error.name || 'Error',
    message: redactPII(error.message || 'Unknown error').result,
    stack: sanitizeStack(error.stack),
  }

  // Handle Supabase/Postgres errors
  const err = error as Error & {
    code?: string | number
    details?: string
    hint?: string
    statusCode?: number
  }

  if (err.code !== undefined) {
    sanitized.code = err.code
  }

  if (err.details) {
    sanitized.details = redactPII(String(err.details)).result
  }

  if (err.hint) {
    sanitized.hint = redactPII(String(err.hint)).result
  }

  if (err.statusCode !== undefined) {
    sanitized.statusCode = err.statusCode
  }

  return sanitized
}

/**
 * Sanitize a log context object
 *
 * @example
 * ```ts
 * logger.error('API failed', sanitizeContext({
 *   userId: '123',
 *   email: 'user@example.com', // Will be redacted
 *   error: new Error('Token invalid: sk-secret-123'),
 * }))
 * ```
 */
export function sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(context)) {
    if (key === 'error') {
      sanitized.error = sanitizeError(value)
    } else {
      // Pass whether the key is sensitive so values get properly redacted
      sanitized[key] = sanitizeObject(value, 0, isSensitiveKey(key))
    }
  }

  return sanitized
}
