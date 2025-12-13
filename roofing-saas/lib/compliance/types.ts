/**
 * Call Compliance Types
 * TypeScript interfaces for TCPA/TSR call compliance system
 */

/**
 * DNC (Do Not Call) status values
 */
export type DNCStatus = 'clear' | 'federal' | 'state' | 'both' | 'internal'

/**
 * DNC source types
 */
export type DNCSource = 'federal' | 'state_tn' | 'internal'

/**
 * Result of a DNC registry check
 */
export interface DNCCheckResult {
  isListed: boolean
  source?: DNCSource
  listedDate?: Date
  reason?: string
}

/**
 * Result of time restriction validation
 */
export interface TimeRestrictionResult {
  allowed: boolean
  reason?: string
  localTime?: string
  timezone?: string
  localHour?: number
}

/**
 * Individual compliance check result
 */
export interface ComplianceCheck {
  type: 'opt_out' | 'dnc' | 'time' | 'consent'
  passed: boolean
  reason?: string
  metadata?: Record<string, unknown>
}

/**
 * Overall compliance check result
 */
export interface ComplianceCheckResult {
  canCall: boolean
  reason?: string
  warning?: string
  checks: {
    optOut?: ComplianceCheck
    dnc?: ComplianceCheck
    time?: ComplianceCheck
    consent?: ComplianceCheck
  }
}

/**
 * Compliance log entry for audit trail
 */
export interface ComplianceLogEntry {
  tenantId: string
  contactId?: string
  callLogId?: string
  userId?: string
  phoneNumber: string
  checkType: 'dnc_check' | 'time_check' | 'consent_check' | 'opt_out_check'
  result: 'pass' | 'fail' | 'warning'
  reason?: string
  dncSource?: DNCSource
  contactTimezone?: string
  contactLocalTime?: string
  metadata?: Record<string, unknown>
}

/**
 * Parameters for canMakeCall function
 */
export interface CanMakeCallParams {
  phoneNumber: string
  contactId?: string
  tenantId: string
  userId?: string
}

/**
 * Recording consent TwiML configuration
 */
export interface RecordingConsentConfig {
  message?: string
  voice?: 'alice' | 'man' | 'woman'
  language?: string
}
