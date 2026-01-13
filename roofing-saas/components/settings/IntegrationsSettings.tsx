'use client'

import { QuickBooksIntegration } from './QuickBooksIntegration'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

      {/* Future integrations can be added here */}
      <Card>
        <CardHeader>
          <CardTitle className="text-muted-foreground">More Integrations Coming Soon</CardTitle>
          <CardDescription>
            Additional integrations will be available in future updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border rounded-lg opacity-50">
              <div className="font-medium text-muted-foreground">Stripe</div>
              <div className="text-sm text-muted-foreground mt-1">Payment processing</div>
            </div>
            <div className="p-4 border border rounded-lg opacity-50">
              <div className="font-medium text-muted-foreground">Zapier</div>
              <div className="text-sm text-muted-foreground mt-1">Workflow automation</div>
            </div>
            <div className="p-4 border border rounded-lg opacity-50">
              <div className="font-medium text-muted-foreground">Google Calendar</div>
              <div className="text-sm text-muted-foreground mt-1">Schedule management</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
