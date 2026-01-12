/**
 * Claims Components
 */

// Intelligence components
export { AdjusterList } from './AdjusterList'
export { IntelligenceSummary } from './IntelligenceSummary'
export { CarrierIntelligence } from './CarrierIntelligence'
export { PatternAnalytics } from './PatternAnalytics'
export { OutcomeAnalytics } from './OutcomeAnalytics'

// Shared intelligence components
export {
  StatCard,
  ApprovalRateBadge,
  getApprovalRateColor,
  PatternBadge,
  FrequencyBadge,
  getPatternLabel,
  TopItemsTable,
  TopArgumentsTable,
} from './shared'

// Inspection components
export { InspectionWizard } from './InspectionWizard'
export { InspectionSummary } from './InspectionSummary'
export { DamageChecklist } from './DamageChecklist'
export { DamageTypeSelector } from './DamageTypeSelector'
export { LocationVerifier } from './LocationVerifier'

// Claim workflow components
export { ClaimApprovalWorkflow } from './ClaimApprovalWorkflow'
export { ClaimDocuments } from './ClaimDocuments'
export { ClaimPhotoCapture } from './ClaimPhotoCapture'
export { ClaimStatusWorkflow } from './ClaimStatusWorkflow'
export { WeatherEvidence } from './WeatherEvidence'
