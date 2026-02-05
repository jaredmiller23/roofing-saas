/**
 * Trial Nurture Email Types
 */

export type TrialEmailKey =
  | 'welcome'
  | 'getting_started'
  | 'feature_spotlight'
  | 'social_proof'
  | 'final_reminder'

export interface TrialEmailRecord {
  id: string
  tenant_id: string
  email_key: TrialEmailKey
  recipient_email: string
  sent_at: string
  resend_id: string | null
  opened_at: string | null
  clicked_at: string | null
}

export interface TrialEmailScheduleEntry {
  key: TrialEmailKey
  day: number
  behavioral: boolean
}

/** Variant for the Day 2 getting-started email based on user activity */
export type GettingStartedVariant =
  | 'no_onboarding'
  | 'no_contacts'
  | 'no_projects'
  | 'active_user'

/** Feature item for the Day 5 spotlight email */
export interface FeatureHighlight {
  title: string
  description: string
  icon: string
  link: string
}
