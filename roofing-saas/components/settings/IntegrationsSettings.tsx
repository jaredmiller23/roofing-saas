'use client'

import { QuickBooksIntegration } from './QuickBooksIntegration'
import { Card, CardContent } from '@/components/ui/card'
import { useFeatureAccess } from '@/lib/billing/hooks'
import { FeatureGate } from '@/components/billing/FeatureGate'

export function IntegrationsSettings() {
  const { features, isLoading: featuresLoading } = useFeatureAccess()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Integrations</h2>
        <p className="text-muted-foreground">
          Connect external services to sync data and automate workflows
        </p>
      </div>

      {/* QuickBooks Integration - Gated to Professional+ */}
      {featuresLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="animate-pulse h-32 bg-muted rounded" />
          </CardContent>
        </Card>
      ) : (
        <FeatureGate
          allowed={features.quickbooksIntegration}
          featureName="QuickBooks Integration"
          requiredPlan="Professional"
        >
          <QuickBooksIntegration />
        </FeatureGate>
      )}

      {/* Note: Stripe billing is managed in Settings > Billing. Google Calendar is in Settings > Calendar. */}
    </div>
  )
}
