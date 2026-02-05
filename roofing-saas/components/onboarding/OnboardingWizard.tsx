'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  createInitialState,
  getNextStep,
  getPreviousStep,
  calculateProgress,
  getStepNumber,
  getTotalSteps,
  markStepCompleted,
  markStepSkipped,
} from '@/lib/onboarding/onboarding-state'
import type { OnboardingState, OnboardingStep } from '@/lib/onboarding/types'
import { CompanySetupStep } from './steps/CompanySetupStep'
import { PrioritiesStep } from './steps/PrioritiesStep'
import { FirstContactStep } from './steps/FirstContactStep'
import { InviteTeamStep } from './steps/InviteTeamStep'
import { CompletionStep } from './steps/CompletionStep'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface OnboardingWizardProps {
  tenantName: string
  tenantPhone: string
}

export function OnboardingWizard({ tenantName, tenantPhone }: OnboardingWizardProps) {
  const [state, setState] = useState<OnboardingState>(() =>
    createInitialState(tenantName, tenantPhone)
  )

  const progress = calculateProgress(state)
  const stepNumber = getStepNumber(state.currentStep)
  const totalSteps = getTotalSteps()

  // Save progress on step change (non-blocking)
  useEffect(() => {
    if (state.currentStep === 'complete') return

    const saveProgress = async () => {
      try {
        await fetch('/api/onboarding/progress', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentStep: state.currentStep,
            stepsCompleted: state.stepsCompleted,
            stepsSkipped: state.stepsSkipped,
            priorities: state.priorities,
          }),
        })
      } catch {
        // Non-critical — progress save is a nice-to-have
      }
    }

    saveProgress()
  }, [state.currentStep, state.stepsCompleted, state.stepsSkipped, state.priorities])

  const updateState = useCallback((updates: Partial<OnboardingState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }, [])

  const goToStep = useCallback((step: OnboardingStep) => {
    setState((prev) => ({ ...prev, currentStep: step }))
  }, [])

  const handleNext = useCallback(() => {
    setState((prev) => {
      const updated = markStepCompleted(prev, prev.currentStep)
      const nextStep = getNextStep(updated)
      if (nextStep) {
        return { ...updated, currentStep: nextStep }
      }
      return updated
    })
  }, [])

  const handleSkip = useCallback(() => {
    setState((prev) => {
      const updated = markStepSkipped(prev, prev.currentStep)
      const nextStep = getNextStep(updated)
      if (nextStep) {
        return { ...updated, currentStep: nextStep }
      }
      return updated
    })
  }, [])

  const handleBack = useCallback(() => {
    const prevStep = getPreviousStep(state)
    if (prevStep) goToStep(prevStep)
  }, [state, goToStep])

  const renderStep = () => {
    switch (state.currentStep) {
      case 'company_setup':
        return (
          <CompanySetupStep
            state={state}
            onUpdate={updateState}
            onNext={handleNext}
          />
        )
      case 'priorities':
        return (
          <PrioritiesStep
            state={state}
            onUpdate={updateState}
            onNext={handleNext}
            onSkip={handleSkip}
          />
        )
      case 'first_contact':
        return (
          <FirstContactStep
            state={state}
            onUpdate={updateState}
            onNext={handleNext}
            onSkip={handleSkip}
          />
        )
      case 'invite_team':
        return (
          <InviteTeamStep
            state={state}
            onUpdate={updateState}
            onNext={handleNext}
            onSkip={handleSkip}
          />
        )
      case 'complete':
        return <CompletionStep state={state} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with progress */}
      <div className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {state.currentStep !== 'company_setup' && state.currentStep !== 'complete' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="gap-1 text-muted-foreground"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              )}
              {state.currentStep !== 'complete' && (
                <span className="text-sm text-muted-foreground">
                  Step {stepNumber} of {totalSteps}
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {renderStep()}
        </div>
      </div>
    </div>
  )
}
