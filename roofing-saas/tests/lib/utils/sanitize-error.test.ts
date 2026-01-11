import { describe, it, expect } from 'vitest'
import { sanitizeError, sanitizeContext } from '@/lib/utils/sanitize-error'

describe('sanitizeError', () => {
  describe('basic error handling', () => {
    it('sanitizes standard Error objects', () => {
      const error = new Error('Something went wrong')
      const result = sanitizeError(error)

      expect(result.name).toBe('Error')
      expect(result.message).toBe('Something went wrong')
      expect(result.stack).toBeDefined()
    })

    it('handles non-Error values', () => {
      expect(sanitizeError('string error')).toEqual({
        name: 'UnknownError',
        message: 'string error',
      })

      expect(sanitizeError(null)).toEqual({
        name: 'UnknownError',
        message: 'null',
      })

      expect(sanitizeError(undefined)).toEqual({
        name: 'UnknownError',
        message: 'undefined',
      })
    })
  })

  describe('PII redaction', () => {
    it('redacts email addresses in error messages', () => {
      const error = new Error('User john.doe@example.com not found')
      const result = sanitizeError(error)

      expect(result.message).toBe('User [REDACTED:email] not found')
      expect(result.message).not.toContain('john.doe@example.com')
    })

    it('redacts phone numbers', () => {
      const error = new Error('Failed to send SMS to 555-123-4567')
      const result = sanitizeError(error)

      expect(result.message).toBe('Failed to send SMS to [REDACTED:phone]')
    })

    it('redacts SSN patterns', () => {
      const error = new Error('Invalid SSN: 123-45-6789')
      const result = sanitizeError(error)

      expect(result.message).toBe('Invalid SSN: [REDACTED:ssn]')
    })

    it('redacts API tokens', () => {
      const error = new Error('Invalid token: sk-abc123def456ghi789jkl012')
      const result = sanitizeError(error)

      expect(result.message).toContain('[REDACTED:token]')
    })

    it('redacts Bearer tokens', () => {
      const error = new Error('Auth failed: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U')
      const result = sanitizeError(error)

      expect(result.message).toContain('[REDACTED:bearer]')
    })

    it('redacts credit card numbers', () => {
      const error = new Error('Card declined: 4111-1111-1111-1111')
      const result = sanitizeError(error)

      expect(result.message).toContain('[REDACTED:cc]')
    })
  })

  describe('stack trace sanitization', () => {
    it('truncates long stack traces', () => {
      const error = new Error('Test error')
      // Stack typically has many lines
      const result = sanitizeError(error)

      if (result.stack) {
        const lineCount = result.stack.split('\n').length
        expect(lineCount).toBeLessThanOrEqual(8)
      }
    })

    it('redacts home directory paths', () => {
      const error = new Error('Test error')
      // Simulate a stack with user path
      error.stack = `Error: Test error
    at Object.<anonymous> (/Users/johndoe/projects/app/src/file.ts:10:5)
    at Module._compile (node:internal/modules/cjs/loader:1275:14)`

      const result = sanitizeError(error)

      expect(result.stack).not.toContain('johndoe')
      expect(result.stack).toContain('/***')
    })
  })

  describe('Supabase/Postgres error handling', () => {
    it('preserves error codes', () => {
      const error = new Error('Database error') as Error & { code: string }
      error.code = 'PGRST116'

      const result = sanitizeError(error)

      expect(result.code).toBe('PGRST116')
    })

    it('sanitizes error details', () => {
      const error = new Error('Query failed') as Error & { details: string }
      error.details = 'User john@example.com has invalid email'

      const result = sanitizeError(error)

      expect(result.details).toContain('[REDACTED:email]')
      expect(result.details).not.toContain('john@example.com')
    })
  })
})

describe('sanitizeContext', () => {
  it('redacts sensitive keys with informative PII tags when patterns match', () => {
    const context = {
      userId: '123',
      password: 'supersecret',
      email: 'user@example.com',
      token: 'abc123',
      apiKey: 'key-456',
    }

    const result = sanitizeContext(context)

    expect(result.userId).toBe('123')
    // password has no PII pattern match, falls back to [REDACTED]
    expect(result.password).toBe('[REDACTED]')
    // token has no PII pattern match, falls back to [REDACTED]
    expect(result.token).toBe('[REDACTED]')
    expect(result.apiKey).toBe('[REDACTED]')
    // email value matches PII pattern, gets informative [REDACTED:email]
    expect(result.email).toBe('[REDACTED:email]')
  })

  it('handles nested objects with informative PII tags', () => {
    const context = {
      user: {
        id: '123',
        email: 'test@example.com',
        password: 'secret',
      },
    }

    const result = sanitizeContext(context) as { user: Record<string, unknown> }

    expect(result.user.id).toBe('123')
    // email value matches PII pattern, gets informative [REDACTED:email]
    expect(result.user.email).toBe('[REDACTED:email]')
    // password has no PII pattern match, falls back to [REDACTED]
    expect(result.user.password).toBe('[REDACTED]')
  })

  it('sanitizes error objects in context', () => {
    const context = {
      error: new Error('Failed for user bob@test.com'),
      status: 500,
    }

    const result = sanitizeContext(context) as { error: { message: string }; status: number }

    expect(result.status).toBe(500)
    expect(result.error.message).toContain('[REDACTED:email]')
    expect(result.error.message).not.toContain('bob@test.com')
  })

  it('handles arrays with PII values', () => {
    // Use a non-sensitive key name so we test the PII pattern matching
    const context = {
      recipients: ['a@b.com', 'c@d.com'],
    }

    const result = sanitizeContext(context) as { recipients: string[] }

    // Email addresses in values are redacted via PII pattern
    expect(result.recipients).toEqual(['[REDACTED:email]', '[REDACTED:email]'])
  })

  it('redacts array values under sensitive keys with informative tags', () => {
    // The key 'emails' is sensitive, but array values still get PII pattern matching
    const context = {
      emails: ['a@b.com', 'c@d.com'],
    }

    const result = sanitizeContext(context) as { emails: string[] }

    // Email addresses match PII pattern, get informative [REDACTED:email]
    expect(result.emails).toEqual(['[REDACTED:email]', '[REDACTED:email]'])
  })
})
