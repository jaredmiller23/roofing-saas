/**
 * Call Compliance Module
 * TCPA/TSR compliant calling system
 *
 * Main exports:
 * - canMakeCall: Comprehensive compliance check before making calls (ALL checks block)
 * - checkDNC: Check if phone number is on Do Not Call registry
 * - isWithinCallingHours: Validate calling hours (9am-8pm local time)
 * - generateRecordingAnnouncementTwiML: Generate recording consent TwiML
 * - addToInternalDNC: Add phone number to internal DNC list
 * - removeFromInternalDNC: Remove from internal DNC list
 * - captureCallConsent: Capture PEWC with IP, timestamp, method, legal text
 * - revokeConsent: Process opt-out requests
 * - getConsentProof: Retrieve consent proof for audits/lawsuits
 *
 * Legal Requirements (as of April 2025):
 * - TCPA requires Prior Express Written Consent (PEWC) for autodialed calls
 * - FTC requires DNC sync every 31 days
 * - Opt-out must be honored within 10 business days
 * - Single follow-up allowed within 10 minutes of STOP
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

// Consent capture (PEWC proof)
export {
  captureCallConsent,
  revokeConsent,
  getConsentProof,
  extractIpAddress,
  extractUserAgent,
  formatConsentText,
  TCPA_CALL_CONSENT_TEXT,
  TCPA_SMS_CONSENT_TEXT,
  TCPA_COMBINED_CONSENT_TEXT,
  RECORDING_CONSENT_TEXT,
} from './consent-capture'

// Opt-out processing (April 2025 TCPA rules)
export {
  processOptOut,
  sendOptOutFollowUp,
  markOptOutProcessed,
  getPendingOptOuts,
  getOptOutStats,
  calculateBusinessDaysDeadline,
  calculateFollowUpWindowEnd,
  isWithinFollowUpWindow,
} from './opt-out-processor'

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

export type {
  ConsentMethod,
  ConsentType,
  ConsentCaptureParams,
  ConsentProof,
  ConsentCaptureResult,
} from './consent-capture'

export type {
  OptOutType,
  OptOutSource,
  OptOutRequest,
  OptOutResult,
  OptOutQueueEntry,
} from './opt-out-processor'

// Recording consent state detection
export {
  getRecordingConsentRequirement,
  getMostRestrictiveConsentRequirement,
  getRecordingAnnouncementText,
  extractAreaCode,
  isTwoPartyState,
  TWO_PARTY_CONSENT_STATES,
  AREA_CODE_TO_STATE,
} from './recording-states'

export type {
  RecordingConsentType,
  RecordingConsentResult,
  TwoPartyState,
} from './recording-states'

// DNC sync service
export {
  getDNCSyncStatus,
  createDNCSyncJob,
  updateDNCSyncJob,
  importDNCBatch,
  getDNCSyncHistory,
  getTenantsWithOverdueDNCSync,
} from './dnc-sync-service'

export type {
  DNCRegistrySource,
  DNCSyncJob,
  DNCSyncStatus,
} from './dnc-sync-service'
