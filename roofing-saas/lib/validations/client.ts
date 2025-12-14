'use client'

/**
 * Client-side validation helpers
 *
 * Provides real-time validation for forms before submission.
 * These mirror the Zod schemas in contact.ts but work in the browser.
 */

export interface ValidationResult {
  valid: boolean
  error?: string
}

export interface FormValidationResult {
  valid: boolean
  errors: Record<string, string>
}

// Email regex pattern
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// URL regex pattern (simple)
const URL_REGEX = /^https?:\/\/.+/

/**
 * Validate a single field
 */
export function validateField(fieldName: string, value: unknown): ValidationResult {
  switch (fieldName) {
    case 'first_name':
      if (!value || (typeof value === 'string' && value.trim().length === 0)) {
        return { valid: false, error: 'First name is required' }
      }
      if (typeof value === 'string' && value.length > 100) {
        return { valid: false, error: 'First name must be 100 characters or less' }
      }
      return { valid: true }

    case 'last_name':
      if (!value || (typeof value === 'string' && value.trim().length === 0)) {
        return { valid: false, error: 'Last name is required' }
      }
      if (typeof value === 'string' && value.length > 100) {
        return { valid: false, error: 'Last name must be 100 characters or less' }
      }
      return { valid: true }

    case 'email':
      if (value && typeof value === 'string' && value.trim().length > 0) {
        if (!EMAIL_REGEX.test(value)) {
          return { valid: false, error: 'Please enter a valid email address' }
        }
      }
      return { valid: true }

    case 'phone':
    case 'mobile_phone':
      // Optional, no specific format required
      return { valid: true }

    case 'website':
      if (value && typeof value === 'string' && value.trim().length > 0) {
        if (!URL_REGEX.test(value)) {
          return { valid: false, error: 'Please enter a valid URL (starting with http:// or https://)' }
        }
      }
      return { valid: true }

    case 'address_state':
      if (value && typeof value === 'string' && value.length > 2) {
        return { valid: false, error: 'State should be a 2-letter abbreviation' }
      }
      return { valid: true }

    case 'address_zip':
      if (value && typeof value === 'string' && value.length > 10) {
        return { valid: false, error: 'ZIP code is too long' }
      }
      return { valid: true }

    case 'roof_age':
      if (value !== undefined && value !== '') {
        const num = typeof value === 'string' ? parseInt(value) : value
        if (typeof num === 'number' && (isNaN(num) || num < 0 || num > 200)) {
          return { valid: false, error: 'Roof age must be between 0 and 200 years' }
        }
      }
      return { valid: true }

    case 'square_footage':
      if (value !== undefined && value !== '') {
        const num = typeof value === 'string' ? parseInt(value) : value
        if (typeof num === 'number' && (isNaN(num) || num <= 0)) {
          return { valid: false, error: 'Square footage must be a positive number' }
        }
      }
      return { valid: true }

    case 'stories':
      if (value !== undefined && value !== '') {
        const num = typeof value === 'string' ? parseInt(value) : value
        if (typeof num === 'number' && (isNaN(num) || num < 1 || num > 10)) {
          return { valid: false, error: 'Stories must be between 1 and 10' }
        }
      }
      return { valid: true }

    default:
      return { valid: true }
  }
}

/**
 * Validate the entire contact form
 */
export function validateContactForm(data: Record<string, unknown>): FormValidationResult {
  const errors: Record<string, string> = {}

  // Required fields
  const firstNameResult = validateField('first_name', data.first_name)
  if (!firstNameResult.valid && firstNameResult.error) {
    errors.first_name = firstNameResult.error
  }

  const lastNameResult = validateField('last_name', data.last_name)
  if (!lastNameResult.valid && lastNameResult.error) {
    errors.last_name = lastNameResult.error
  }

  // Optional fields with format validation
  const fieldsToValidate = [
    'email',
    'website',
    'address_state',
    'address_zip',
    'roof_age',
    'square_footage',
    'stories',
  ]

  for (const field of fieldsToValidate) {
    const result = validateField(field, data[field])
    if (!result.valid && result.error) {
      errors[field] = result.error
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Clear an error when field value changes
 */
export function clearFieldError(
  fieldName: string,
  errors: Record<string, string>
): Record<string, string> {
  const { [fieldName]: _, ...rest } = errors
  return rest
}
