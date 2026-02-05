/**
 * Onboarding Types
 *
 * Shared types for the post-signup onboarding wizard and dashboard checklist.
 */

export type OnboardingStep =
  | 'company_setup'
  | 'priorities'
  | 'first_contact'
  | 'invite_team'
  | 'complete'

export type OnboardingPriority =
  | 'contact_management'
  | 'sales_pipeline'
  | 'estimates_invoices'
  | 'team_management'
  | 'territory_mapping'

export interface OnboardingState {
  currentStep: OnboardingStep
  companySetup: {
    name: string
    phone: string
    logoUrl: string | null
    primaryColor: string | null
  }
  priorities: OnboardingPriority[]
  firstContact: {
    created: boolean
    contactId: string | null
  }
  inviteTeam: {
    emails: string[]
    invited: boolean
  }
  stepsCompleted: OnboardingStep[]
  stepsSkipped: OnboardingStep[]
}

export interface OnboardingData {
  wizard_completed: boolean
  wizard_completed_at: string | null
  steps_completed: OnboardingStep[]
  steps_skipped: OnboardingStep[]
  priorities: OnboardingPriority[]
  checklist: ChecklistState
}

export interface ChecklistState {
  add_contact: boolean
  create_project: boolean
  setup_pipeline: boolean
  send_estimate: boolean
  invite_team: boolean
  log_call: boolean
  dismissed: boolean
  dismissed_at: string | null
}

export interface ChecklistItem {
  key: keyof Omit<ChecklistState, 'dismissed' | 'dismissed_at'>
  label: string
  description: string
  href: string
  completed: boolean
}

export const PRIORITY_OPTIONS: { value: OnboardingPriority; label: string; description: string; icon: string }[] = [
  {
    value: 'contact_management',
    label: 'Contact Management',
    description: 'Track homeowners, adjusters, and referral partners',
    icon: 'Users',
  },
  {
    value: 'sales_pipeline',
    label: 'Sales Pipeline',
    description: 'Manage deals from lead to close',
    icon: 'Kanban',
  },
  {
    value: 'estimates_invoices',
    label: 'Estimates & Invoices',
    description: 'Create and send professional quotes',
    icon: 'FileText',
  },
  {
    value: 'team_management',
    label: 'Team Management',
    description: 'Coordinate crews and track performance',
    icon: 'UserPlus',
  },
  {
    value: 'territory_mapping',
    label: 'Territory Mapping',
    description: 'Map neighborhoods and track door knocks',
    icon: 'Map',
  },
]
