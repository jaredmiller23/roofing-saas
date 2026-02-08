'use client'

import { Suspense } from 'react'
import { SettingsLayout } from './SettingsLayout'

/**
 * Settings page component with grouped sidebar navigation.
 *
 * Replaced horizontal tabs (13 items overflowing) with vertical sidebar
 * following industry standard patterns (GitHub, Stripe, HubSpot).
 *
 * Groups:
 * - COMPANY: General, Appearance, Branding
 * - WORKFLOW: Pipeline, Substatuses, Templates, Automations
 * - TEAM & ACCESS: Roles, Security, Compliance
 * - BUSINESS: Incentives, Integrations, Billing
 */
export function SettingsTabs() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <SettingsLayout />
    </Suspense>
  )
}
