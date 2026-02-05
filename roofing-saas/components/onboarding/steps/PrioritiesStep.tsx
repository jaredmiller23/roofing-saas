'use client'

import { Button } from '@/components/ui/button'
import { Users, Kanban, FileText, UserPlus, Map } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OnboardingState, OnboardingPriority } from '@/lib/onboarding/types'
import { PRIORITY_OPTIONS } from '@/lib/onboarding/types'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  Kanban,
  FileText,
  UserPlus,
  Map,
}

interface PrioritiesStepProps {
  state: OnboardingState
  onUpdate: (updates: Partial<OnboardingState>) => void
  onNext: () => void
  onSkip: () => void
}

export function PrioritiesStep({ state, onUpdate, onNext, onSkip }: PrioritiesStepProps) {
  const togglePriority = (value: OnboardingPriority) => {
    const current = state.priorities
    const updated = current.includes(value)
      ? current.filter((p) => p !== value)
      : [...current, value]
    onUpdate({ priorities: updated })
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">What matters most to you?</h2>
        <p className="mt-2 text-muted-foreground">
          Select your top priorities so we can tailor your experience. Pick as many as you like.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
        {PRIORITY_OPTIONS.map((option) => {
          const Icon = ICON_MAP[option.icon]
          const isSelected = state.priorities.includes(option.value)

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => togglePriority(option.value)}
              className={cn(
                'flex items-start gap-3 p-4 rounded-lg border text-left transition-colors',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/50'
              )}
            >
              <div
                className={cn(
                  'mt-0.5 w-8 h-8 rounded-md flex items-center justify-center shrink-0',
                  isSelected ? 'bg-primary/10' : 'bg-muted'
                )}
              >
                {Icon && <Icon className={cn('w-4 h-4', isSelected ? 'text-primary' : 'text-muted-foreground')} />}
              </div>
              <div>
                <div className={cn('text-sm font-medium', isSelected ? 'text-foreground' : 'text-foreground')}>
                  {option.label}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{option.description}</div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex justify-between max-w-lg mx-auto">
        <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
          Skip this step
        </Button>
        <Button onClick={onNext} disabled={state.priorities.length === 0}>
          Continue
        </Button>
      </div>
    </div>
  )
}
