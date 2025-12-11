'use client'

import { QuickBooksIntegration } from './QuickBooksIntegration'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function IntegrationsSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Integrations</h2>
        <p className="text-gray-600">
          Connect external services to sync data and automate workflows
        </p>
      </div>

      {/* QuickBooks Integration */}
      <QuickBooksIntegration />

      {/* Future integrations can be added here */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-400">More Integrations Coming Soon</CardTitle>
          <CardDescription>
            Additional integrations will be available in future updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg opacity-50">
              <div className="font-medium text-gray-500">Stripe</div>
              <div className="text-sm text-gray-400 mt-1">Payment processing</div>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg opacity-50">
              <div className="font-medium text-gray-500">Zapier</div>
              <div className="text-sm text-gray-400 mt-1">Workflow automation</div>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg opacity-50">
              <div className="font-medium text-gray-500">Google Calendar</div>
              <div className="text-sm text-gray-400 mt-1">Schedule management</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
