/**
 * Common Error Scenarios for Testing
 *
 * Pre-defined error objects that match the application's
 * standardized error response format.
 */

export const ERROR_SCENARIOS = {
  /**
   * Database connection/query errors
   */
  DATABASE_ERROR: {
    code: 'DATABASE_ERROR',
    message: 'Failed to connect to database',
    details: {
      type: 'connection_error',
      hint: 'Check database connection settings'
    }
  },

  /**
   * Query errors (like missing column)
   */
  QUERY_ERROR: {
    code: 'QUERY_ERROR',
    message: 'Invalid database query',
    details: {
      error: 'column "updated" does not exist',
      hint: 'Perhaps you meant to reference the column "updated_at"'
    }
  },

  /**
   * Unauthorized access (not logged in)
   */
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'You must be logged in to perform this action'
  },

  /**
   * Forbidden (logged in but no permission)
   */
  FORBIDDEN: {
    code: 'FORBIDDEN',
    message: 'You do not have permission to perform this action',
    details: {
      required_role: 'admin',
      current_role: 'user'
    }
  },

  /**
   * Resource not found (404)
   */
  NOT_FOUND: {
    code: 'NOT_FOUND',
    message: 'The requested resource was not found'
  },

  /**
   * Validation error (invalid input)
   */
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid input data',
    details: {
      errors: [
        { field: 'email', message: 'Invalid email format' },
        { field: 'phone', message: 'Phone number must be 10 digits' }
      ]
    }
  },

  /**
   * Required field missing
   */
  MISSING_REQUIRED_FIELD: (field: string) => ({
    code: 'VALIDATION_ERROR',
    message: `Missing required field: ${field}`,
    details: {
      field,
      type: 'required'
    }
  }),

  /**
   * Duplicate resource (409 conflict)
   */
  DUPLICATE_RESOURCE: (resource: string) => ({
    code: 'DUPLICATE_RESOURCE',
    message: `${resource} already exists`,
    details: {
      resource,
      suggestion: 'Use PATCH to update existing resource'
    }
  }),

  /**
   * Rate limit exceeded
   */
  RATE_LIMIT: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Please try again later.',
    details: {
      retry_after: 60
    }
  },

  /**
   * Internal server error (500)
   */
  INTERNAL_SERVER_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred'
  },

  /**
   * Service unavailable (maintenance mode)
   */
  SERVICE_UNAVAILABLE: {
    code: 'SERVICE_UNAVAILABLE',
    message: 'Service temporarily unavailable',
    details: {
      maintenance: true,
      estimated_time: '30 minutes'
    }
  },

  /**
   * Invalid API key/token
   */
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid login credentials'
  },

  /**
   * Session expired
   */
  SESSION_EXPIRED: {
    code: 'SESSION_EXPIRED',
    message: 'Your session has expired. Please log in again.'
  },

  /**
   * Tenant-specific errors
   */
  NO_TENANT_ACCESS: {
    code: 'NO_TENANT_ACCESS',
    message: 'User not associated with any tenant',
    details: {
      hint: 'Contact administrator to be added to a tenant'
    }
  },

  /**
   * RLS policy violation
   */
  RLS_VIOLATION: {
    code: 'RLS_VIOLATION',
    message: 'Access denied by row-level security policy',
    details: {
      table: 'contacts',
      policy: 'tenant_isolation'
    }
  },

  /**
   * File upload errors
   */
  FILE_TOO_LARGE: (maxSize: string) => ({
    code: 'FILE_TOO_LARGE',
    message: `File size exceeds maximum allowed size of ${maxSize}`,
    details: {
      max_size: maxSize
    }
  }),

  INVALID_FILE_TYPE: (allowedTypes: string[]) => ({
    code: 'INVALID_FILE_TYPE',
    message: 'Invalid file type',
    details: {
      allowed_types: allowedTypes
    }
  }),

  /**
   * Network/timeout errors
   */
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'Network request failed. Please check your connection.'
  },

  TIMEOUT_ERROR: {
    code: 'TIMEOUT_ERROR',
    message: 'Request timed out. Please try again.'
  }
}

/**
 * HTTP Status Codes for different error types
 */
export const ERROR_STATUS_CODES = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  DUPLICATE_RESOURCE: 409,
  RATE_LIMIT_EXCEEDED: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
}
