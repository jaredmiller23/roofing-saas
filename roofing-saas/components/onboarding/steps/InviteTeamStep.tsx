'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Users, X, Mail } from 'lucide-react'
import type { OnboardingState } from '@/lib/onboarding/types'

interface InviteTeamStepProps {
  state: OnboardingState
  onUpdate: (updates: Partial<OnboardingState>) => void
  onNext: () => void
  onSkip: () => void
}

export function InviteTeamStep({ state, onUpdate, onNext, onSkip }: InviteTeamStepProps) {
  const [emailInput, setEmailInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addEmail = () => {
    const trimmed = emailInput.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) return
    if (state.inviteTeam.emails.includes(trimmed)) return

    onUpdate({
      inviteTeam: {
        ...state.inviteTeam,
        emails: [...state.inviteTeam.emails, trimmed],
      },
    })
    setEmailInput('')
  }

  const removeEmail = (email: string) => {
    onUpdate({
      inviteTeam: {
        ...state.inviteTeam,
        emails: state.inviteTeam.emails.filter((e) => e !== email),
      },
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addEmail()
    }
  }

  const handleSendInvites = async () => {
    if (state.inviteTeam.emails.length === 0) return
    setSending(true)
    setError(null)

    try {
      // Send invites one at a time using the existing team endpoint
      for (const email of state.inviteTeam.emails) {
        const res = await fetch('/api/admin/team', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            role: 'member',
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          console.error(`Failed to invite ${email}:`, data.error?.message)
        }
      }

      onUpdate({
        inviteTeam: { ...state.inviteTeam, invited: true },
      })
      onNext()
    } catch {
      setError('Some invites may have failed. You can manage your team from Settings later.')
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Invite your team</h2>
        <p className="mt-2 text-muted-foreground">
          Add your crew, office staff, or sales reps. They&apos;ll get an email to set up their account.
        </p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        {error && (
          <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500">
            {error}
          </div>
        )}

        <div>
          <Label htmlFor="teamEmail">Email Address</Label>
          <div className="mt-1 flex gap-2">
            <Input
              id="teamEmail"
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="teammate@company.com"
            />
            <Button
              type="button"
              variant="outline"
              onClick={addEmail}
              disabled={!emailInput.trim() || !emailInput.includes('@')}
            >
              Add
            </Button>
          </div>
        </div>

        {state.inviteTeam.emails.length > 0 && (
          <div className="space-y-2">
            {state.inviteTeam.emails.map((email) => (
              <div
                key={email}
                className="flex items-center justify-between py-2 px-3 rounded-md bg-card border border-border"
              >
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  {email}
                </div>
                <button
                  type="button"
                  onClick={() => removeEmail(email)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${email}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between max-w-md mx-auto">
        <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
          I&apos;m the only one for now
        </Button>
        <Button
          onClick={handleSendInvites}
          disabled={sending || state.inviteTeam.emails.length === 0}
        >
          {sending ? 'Sending invites...' : `Send ${state.inviteTeam.emails.length > 0 ? state.inviteTeam.emails.length + ' ' : ''}Invite${state.inviteTeam.emails.length !== 1 ? 's' : ''}`}
        </Button>
      </div>
    </div>
  )
}
