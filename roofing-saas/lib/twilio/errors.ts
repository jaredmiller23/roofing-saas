/**
 * Twilio Error Classes
 */

export class TwilioError extends Error {
  code: string
  details?: unknown

  constructor(message: string, options?: { code?: string; details?: unknown; originalError?: unknown }) {
    super(message)
    this.name = 'TwilioError'
    this.code = options?.code || 'TWILIO_ERROR'
    this.details = options?.details

    if (options?.originalError && options.originalError instanceof Error) {
      this.stack = options.originalError.stack
    }
  }
}

export class TwilioConfigurationError extends TwilioError {
  constructor(message: string, details?: unknown) {
    super(message, { code: 'TWILIO_CONFIG_ERROR', details })
    this.name = 'TwilioConfigurationError'
  }
}

export class TwilioRateLimitError extends TwilioError {
  constructor(message: string, details?: unknown) {
    super(message, { code: 'TWILIO_RATE_LIMIT', details })
    this.name = 'TwilioRateLimitError'
  }
}

export class TwilioValidationError extends TwilioError {
  constructor(message: string, details?: unknown) {
    super(message, { code: 'TWILIO_VALIDATION_ERROR', details })
    this.name = 'TwilioValidationError'
  }
}
