/**
 * Onboarding State Management
 *
 * Follows the InspectionWizard pattern: typed step unions, navigation helpers,
 * progress calculation. Used by the OnboardingWizard client component.
 */

import type { OnboardingState, OnboardingStep } from './types'

const STEP_ORDER: OnboardingStep[] = [
  'company_setup',
  'priorities',
  'first_contact',
  'invite_team',
  'complete',
]

export function createInitialState(
  companyName: string,
  companyPhone: string
): OnboardingState {
  return {
    currentStep: 'company_setup',
    companySetup: {
      name: companyName,
      phone: companyPhone,
      logoUrl: null,
      primaryColor: null,
    },
    priorities: [],
    firstContact: {
      created: false,
      contactId: null,
    },
    inviteTeam: {
      emails: [],
      invited: false,
    },
    stepsCompleted: [],
    stepsSkipped: [],
  }
}

export function getNextStep(state: OnboardingState): OnboardingStep | null {
  const currentIndex = STEP_ORDER.indexOf(state.currentStep)
  if (currentIndex === -1 || currentIndex >= STEP_ORDER.length - 1) return null
  return STEP_ORDER[currentIndex + 1]
}

export function getPreviousStep(state: OnboardingState): OnboardingStep | null {
  const currentIndex = STEP_ORDER.indexOf(state.currentStep)
  if (currentIndex <= 0) return null
  return STEP_ORDER[currentIndex - 1]
}

export function calculateProgress(state: OnboardingState): number {
  const currentIndex = STEP_ORDER.indexOf(state.currentStep)
  // Progress based on current step position (0-100)
  return Math.round((currentIndex / (STEP_ORDER.length - 1)) * 100)
}

export function getStepNumber(step: OnboardingStep): number {
  return STEP_ORDER.indexOf(step) + 1
}

export function getTotalSteps(): number {
  // Exclude 'complete' from the count shown to users
  return STEP_ORDER.length - 1
}

export function isSkippableStep(step: OnboardingStep): boolean {
  return step === 'priorities' || step === 'first_contact' || step === 'invite_team'
}

export function markStepCompleted(
  state: OnboardingState,
  step: OnboardingStep
): OnboardingState {
  if (state.stepsCompleted.includes(step)) return state
  return {
    ...state,
    stepsCompleted: [...state.stepsCompleted, step],
    stepsSkipped: state.stepsSkipped.filter(s => s !== step),
  }
}

export function markStepSkipped(
  state: OnboardingState,
  step: OnboardingStep
): OnboardingState {
  if (state.stepsSkipped.includes(step)) return state
  return {
    ...state,
    stepsSkipped: [...state.stepsSkipped, step],
    stepsCompleted: state.stepsCompleted.filter(s => s !== step),
  }
}
