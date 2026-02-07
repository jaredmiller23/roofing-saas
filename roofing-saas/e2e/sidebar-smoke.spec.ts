/**
 * Sidebar Smoke Test
 *
 * Visits every sidebar navigation link and asserts:
 * - No 500 error pages
 * - No unhandled error boundaries
 * - Page renders meaningful content (not blank)
 *
 * This test uses authenticated state from the setup project.
 * It should run on every deploy to catch silent page breakage.
 */

import { test, expect } from '@playwright/test'

// All sidebar navigation links organized by section
const sidebarLinks = [
  // CORE
  { path: '/en/dashboard', label: 'Dashboard' },
  { path: '/en/contacts', label: 'Contacts' },
  { path: '/en/projects', label: 'Pipeline' },
  { path: '/en/signatures', label: 'Signatures' },
  { path: '/en/tasks', label: 'Tasks' },
  { path: '/en/events', label: 'Events' },

  // SELL
  { path: '/en/knocks', label: 'Knock' },
  { path: '/en/claims', label: 'Claims' },
  { path: '/en/incentives', label: 'Incentives' },
  { path: '/en/insights', label: 'Insights' },

  // COMMUNICATIONS
  { path: '/en/call-logs', label: 'Call Log' },
  { path: '/en/voicemail', label: 'Voicemail' },
  { path: '/en/messages', label: 'Messages' },
  { path: '/en/campaigns', label: 'Campaigns' },

  // AI
  { path: '/en/aria/knowledge', label: 'Knowledge Base' },

  // SETTINGS
  { path: '/en/settings', label: 'Settings' },
]

test.describe('Sidebar Smoke Tests', () => {
  for (const link of sidebarLinks) {
    test(`${link.label} (${link.path}) loads without error`, async ({ page }) => {
      // Navigate to the page
      const response = await page.goto(link.path, { waitUntil: 'domcontentloaded' })

      // Should not return a server error
      const status = response?.status() ?? 0
      expect(status, `${link.path} returned HTTP ${status}`).toBeLessThan(500)

      // Should not show the Next.js error overlay or "Internal Server Error"
      const bodyText = await page.locator('body').innerText()
      expect(bodyText).not.toContain('Internal Server Error')
      expect(bodyText).not.toContain('Application error: a server-side exception has occurred')

      // Page should have meaningful content (not completely blank)
      const bodyHTML = await page.locator('body').innerHTML()
      expect(bodyHTML.length).toBeGreaterThan(100)
    })
  }
})
