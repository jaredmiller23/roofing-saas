/**
 * User Profile type definitions
 *
 * Profile data is stored in Supabase auth.users.user_metadata
 */

export interface UserProfile {
  id: string
  email: string
  full_name?: string | null
  phone?: string | null
  job_title?: string | null
  bio?: string | null
  avatar_url?: string | null
  created_at: string
  updated_at: string
}

export interface UpdateProfileInput {
  full_name?: string
  phone?: string
  job_title?: string
  bio?: string
  avatar_url?: string
}

export interface ChangePasswordInput {
  current_password: string
  new_password: string
  confirm_password: string
}

export interface UserSession {
  id: string
  user_id: string
  created_at: string
  expires_at: string
  last_active: string
  ip_address?: string
  user_agent?: string
  device_info?: {
    browser?: string
    os?: string
    device?: string
  }
}

/**
 * Password strength levels
 */
export enum PasswordStrength {
  WEAK = 'weak',
  FAIR = 'fair',
  GOOD = 'good',
  STRONG = 'strong',
}

/**
 * Password requirements
 */
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
} as const

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): PasswordStrength {
  let strength = 0

  // Length check
  if (password.length >= 8) strength++
  if (password.length >= 12) strength++

  // Character variety checks
  if (/[a-z]/.test(password)) strength++
  if (/[A-Z]/.test(password)) strength++
  if (/[0-9]/.test(password)) strength++
  if (/[^a-zA-Z0-9]/.test(password)) strength++

  if (strength <= 2) return PasswordStrength.WEAK
  if (strength <= 3) return PasswordStrength.FAIR
  if (strength <= 4) return PasswordStrength.GOOD
  return PasswordStrength.STRONG
}

/**
 * Check if password meets requirements
 */
export function validatePasswordRequirements(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`)
  }

  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (PASSWORD_REQUIREMENTS.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get strength color for UI display
 */
export function getPasswordStrengthColor(strength: PasswordStrength): string {
  switch (strength) {
    case PasswordStrength.WEAK:
      return 'bg-red-500'
    case PasswordStrength.FAIR:
      return 'bg-orange-500'
    case PasswordStrength.GOOD:
      return 'bg-yellow-500'
    case PasswordStrength.STRONG:
      return 'bg-green-500'
  }
}

/**
 * Get strength label for UI display
 */
export function getPasswordStrengthLabel(strength: PasswordStrength): string {
  switch (strength) {
    case PasswordStrength.WEAK:
      return 'Weak'
    case PasswordStrength.FAIR:
      return 'Fair'
    case PasswordStrength.GOOD:
      return 'Good'
    case PasswordStrength.STRONG:
      return 'Strong'
  }
}
