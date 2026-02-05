'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserPlus } from 'lucide-react'
import type { OnboardingState } from '@/lib/onboarding/types'

interface FirstContactStepProps {
  state: OnboardingState
  onUpdate: (updates: Partial<OnboardingState>) => void
  onNext: () => void
  onSkip: () => void
}

export function FirstContactStep({ state, onUpdate, onNext, onSkip }: FirstContactStepProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!firstName.trim()) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          contact_type: 'homeowner',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error?.message || 'Failed to create contact')
        setSaving(false)
        return
      }

      const data = await res.json()
      onUpdate({
        firstContact: {
          created: true,
          contactId: data.data?.id || null,
        },
      })
      onNext()
    } catch {
      setError('An error occurred. You can add contacts later from the dashboard.')
      setSaving(false)
    }
  }

  // If contact was already created (e.g., user went back), show success
  if (state.firstContact.created) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
            <UserPlus className="w-6 h-6 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Contact added</h2>
          <p className="mt-2 text-muted-foreground">
            Your first contact has been created. You can add more from the dashboard.
          </p>
        </div>
        <div className="flex justify-end max-w-md mx-auto">
          <Button onClick={onNext}>Continue</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <UserPlus className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Add your first contact</h2>
        <p className="mt-2 text-muted-foreground">
          Start building your contact list. Add a homeowner, referral partner, or anyone you work with.
        </p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        {error && (
          <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Jane"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Smith"
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="contactEmail">Email</Label>
          <Input
            id="contactEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="contactPhone">Phone</Label>
          <Input
            id="contactPhone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex justify-between max-w-md mx-auto">
        <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
          I&apos;ll do this later
        </Button>
        <Button onClick={handleSave} disabled={saving || !firstName.trim()}>
          {saving ? 'Adding...' : 'Add Contact'}
        </Button>
      </div>
    </div>
  )
}
