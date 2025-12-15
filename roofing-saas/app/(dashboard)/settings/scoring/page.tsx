import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { ScoringSettingsClient } from './ScoringSettingsClient'

/**
 * Lead Scoring Settings Page
 * Configure scoring rules, thresholds, and automation settings
 */
export default async function ScoringSettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Lead Scoring Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure AI-powered lead qualification and scoring rules
          </p>
        </div>

        {/* Settings Client Component */}
        <ScoringSettingsClient user={user} />
      </div>
    </div>
  )
}
