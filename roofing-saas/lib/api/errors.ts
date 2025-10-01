/**
 * Standardized API Error Handling
 *
 * Provides consistent error responses across all API routes
 */

export enum ErrorCode {
  // Authentication errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Authorization errors (403)
  FORBIDDEN = 'FORBIDDEN',
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Resource errors (404)
  NOT_FOUND = 'NOT_FOUND',
  CONTACT_NOT_FOUND = 'CONTACT_NOT_FOUND',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',

  // Conflict errors (409)
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  DUPLICATE_EMAIL = 'DUPLICATE_EMAIL',

  // Integration errors (502, 503)
  QUICKBOOKS_ERROR = 'QUICKBOOKS_ERROR',
  QUICKBOOKS_AUTH_REQUIRED = 'QUICKBOOKS_AUTH_REQUIRED',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly message: string,
    public readonly statusCode: number,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
    Object.setPrototypeOf(this, ApiError.prototype)
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    }
  }
}

// Convenience error creators
export const AuthenticationError = (message = 'Authentication required', details?: unknown) =>
  new ApiError(ErrorCode.UNAUTHORIZED, message, 401, details)

export const AuthorizationError = (message = 'Access denied', details?: unknown) =>
  new ApiError(ErrorCode.FORBIDDEN, message, 403, details)

export const ValidationError = (message = 'Invalid input', details?: unknown) =>
  new ApiError(ErrorCode.VALIDATION_ERROR, message, 400, details)

export const NotFoundError = (resource: string, details?: unknown) =>
  new ApiError(ErrorCode.NOT_FOUND, `${resource} not found`, 404, details)

export const ConflictError = (message = 'Resource already exists', details?: unknown) =>
  new ApiError(ErrorCode.ALREADY_EXISTS, message, 409, details)

export const QuickBooksError = (message: string, details?: unknown) =>
  new ApiError(ErrorCode.QUICKBOOKS_ERROR, message, 502, details)

export const InternalError = (message = 'Internal server error', details?: unknown) =>
  new ApiError(ErrorCode.INTERNAL_ERROR, message, 500, details)

// Error mapping for common scenarios
export function mapSupabaseError(error: { code?: string; message: string }): ApiError {
  switch (error.code) {
    case '23505': // unique_violation
      return new ApiError(
        ErrorCode.ALREADY_EXISTS,
        'A resource with this identifier already exists',
        409,
        { originalError: error.message }
      )
    case '23503': // foreign_key_violation
      return new ApiError(
        ErrorCode.VALIDATION_ERROR,
        'Referenced resource does not exist',
        400,
        { originalError: error.message }
      )
    case 'PGRST116': // single row not found
      return new ApiError(
        ErrorCode.NOT_FOUND,
        'Resource not found',
        404,
        { originalError: error.message }
      )
    case '42P01': // undefined_table
      return new ApiError(
        ErrorCode.INTERNAL_ERROR,
        'Database configuration error',
        500,
        { originalError: error.message }
      )
    default:
      return new ApiError(
        ErrorCode.DATABASE_ERROR,
        error.message || 'Database error occurred',
        500,
        { originalError: error }
      )
  }
}

// Error handler for Zod validation
export function mapZodError(error: unknown): ApiError {
  if (error && typeof error === 'object' && 'issues' in error) {
    const issues = (error as { issues: unknown[] }).issues
    return new ApiError(
      ErrorCode.VALIDATION_ERROR,
      'Validation failed',
      400,
      { issues }
    )
  }
  return new ApiError(ErrorCode.VALIDATION_ERROR, 'Invalid input', 400)
}
