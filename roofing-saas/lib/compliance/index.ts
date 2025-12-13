/**
 * Call Compliance Module
 * TCPA/TSR compliant calling system
 *
 * Main exports:
 * - canMakeCall: Comprehensive compliance check before making calls
 * - checkDNC: Check if phone number is on Do Not Call registry
 * - isWithinCallingHours: Validate calling hours (9am-8pm local time)
 * - generateRecordingAnnouncementTwiML: Generate recording consent TwiML
 * - addToInternalDNC: Add phone number to internal DNC list
 * - removeFromInternalDNC: Remove from internal DNC list
 *
 * @module compliance
 */

// Main compliance orchestration
export {
  canMakeCall,
  getRecentComplianceFailures,
  getComplianceStats,
} from './call-compliance'

// DNC registry operations
export {
  checkDNC,
  addToInternalDNC,
  removeFromInternalDNC,
  getDNCStats,
  hashPhoneNumber,
} from './dnc-service'

// Time restrictions
export {
  isWithinCallingHours,
  isDateWithinCallingHours,
  getCallingHoursDisplay,
  CALLING_HOURS,
} from './time-restrictions'

// Recording consent
export {
  generateRecordingAnnouncementTwiML,
  generateRecordingAnnouncementWithDialTwiML,
  generateConferenceRecordingTwiML,
  isValidTwiMLVoice,
  getSupportedLanguages,
} from './recording-consent'

// Types
export type {
  DNCStatus,
  DNCSource,
  DNCCheckResult,
  TimeRestrictionResult,
  ComplianceCheck,
  ComplianceCheckResult,
  ComplianceLogEntry,
  CanMakeCallParams,
  RecordingConsentConfig,
} from './types'
