/**
 * Email Error Classes
 * Custom errors for email operations
 */

export class EmailError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'EmailError'
  }
}

export class EmailConfigurationError extends EmailError {
  constructor(message: string) {
    super(message, 'EMAIL_NOT_CONFIGURED')
    this.name = 'EmailConfigurationError'
  }
}

export class EmailValidationError extends EmailError {
  constructor(message: string) {
    super(message, 'EMAIL_VALIDATION_ERROR', 400)
    this.name = 'EmailValidationError'
  }
}

export class EmailRateLimitError extends EmailError {
  constructor(message: string) {
    super(message, 'EMAIL_RATE_LIMIT', 429)
    this.name = 'EmailRateLimitError'
  }
}

export class EmailBounceError extends EmailError {
  constructor(message: string, public bounceType?: string) {
    super(message, 'EMAIL_BOUNCED', 422)
    this.name = 'EmailBounceError'
  }
}
