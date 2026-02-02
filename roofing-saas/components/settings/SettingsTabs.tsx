'use client'

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
  return <SettingsLayout />
}
