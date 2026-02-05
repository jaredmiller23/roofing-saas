'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2 } from 'lucide-react'
import type { OnboardingState } from '@/lib/onboarding/types'

interface CompanySetupStepProps {
  state: OnboardingState
  onUpdate: (updates: Partial<OnboardingState>) => void
  onNext: () => void
}

export function CompanySetupStep({ state, onUpdate, onNext }: CompanySetupStepProps) {
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save company details to the tenant
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: state.companySetup.name,
          company_phone: state.companySetup.phone,
        }),
      })

      if (!res.ok) {
        // Non-critical — tenant was already created with company name during registration
        console.error('Failed to update company details')
      }

      onNext()
    } catch {
      // Don't block progression on API failure
      onNext()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Building2 className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Set up your company</h2>
        <p className="mt-2 text-muted-foreground">
          Confirm your company details. This is how your team and customers will see you.
        </p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        <div>
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            value={state.companySetup.name}
            onChange={(e) =>
              onUpdate({
                companySetup: { ...state.companySetup, name: e.target.value },
              })
            }
            placeholder="Acme Roofing"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="companyPhone">Company Phone</Label>
          <Input
            id="companyPhone"
            type="tel"
            value={state.companySetup.phone}
            onChange={(e) =>
              onUpdate({
                companySetup: { ...state.companySetup, phone: e.target.value },
              })
            }
            placeholder="(555) 123-4567"
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex justify-end max-w-md mx-auto">
        <Button onClick={handleSave} disabled={saving || !state.companySetup.name.trim()}>
          {saving ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
