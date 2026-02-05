'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle, SkipForward, ArrowRight } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { OnboardingState } from '@/lib/onboarding/types'

interface CompletionStepProps {
  state: OnboardingState
}

const STEP_LABELS: Record<string, string> = {
  company_setup: 'Company setup',
  priorities: 'Set priorities',
  first_contact: 'Added first contact',
  invite_team: 'Invited team',
}

export function CompletionStep({ state }: CompletionStepProps) {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string || 'en'
  const [saving, setSaving] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Save onboarding completion on mount
  useEffect(() => {
    const completeOnboarding = async () => {
      try {
        const res = await fetch('/api/onboarding/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            priorities: state.priorities,
            stepsCompleted: state.stepsCompleted,
            stepsSkipped: state.stepsSkipped,
          }),
        })

        if (!res.ok) {
          console.error('Failed to save onboarding completion')
          setError('Failed to save — but you can still continue to your dashboard.')
        }
      } catch {
        setError('Failed to save — but you can still continue to your dashboard.')
      } finally {
        setSaving(false)
      }
    }

    completeOnboarding()
  }, [state.priorities, state.stepsCompleted, state.stepsSkipped])

  const handleGoToDashboard = () => {
    router.push(`/${locale}/dashboard`)
  }

  const displaySteps = ['company_setup', 'priorities', 'first_contact', 'invite_team'] as const

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">You&apos;re all set!</h2>
        <p className="mt-2 text-muted-foreground">
          Your workspace is ready. Here&apos;s a summary of what we set up.
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-2">
        {displaySteps.map((step) => {
          const completed = state.stepsCompleted.includes(step)
          const skipped = state.stepsSkipped.includes(step)

          return (
            <div
              key={step}
              className={cn(
                'flex items-center gap-3 py-3 px-4 rounded-lg',
                completed ? 'bg-green-500/5' : 'bg-card'
              )}
            >
              {completed ? (
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              ) : (
                <SkipForward className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              <span className={cn('text-sm', completed ? 'text-foreground' : 'text-muted-foreground')}>
                {STEP_LABELS[step]}
              </span>
              {skipped && (
                <span className="text-xs text-muted-foreground ml-auto">Skipped</span>
              )}
            </div>
          )
        })}
      </div>

      {error && (
        <div className="max-w-md mx-auto rounded-md bg-red-500/10 p-3 text-sm text-red-500">
          {error}
        </div>
      )}

      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={handleGoToDashboard}
          disabled={saving}
          className="gap-2"
        >
          {saving ? 'Finishing up...' : 'Go to Dashboard'}
          {!saving && <ArrowRight className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}
