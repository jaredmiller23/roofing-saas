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
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/contacts', label: 'Contacts' },
  { path: '/projects', label: 'Pipeline' },
  { path: '/signatures', label: 'Signatures' },
  { path: '/tasks', label: 'Tasks' },
  { path: '/events', label: 'Events' },

  // SELL
  { path: '/knocks', label: 'Knock' },
  { path: '/claims', label: 'Claims' },
  { path: '/incentives', label: 'Incentives' },
  { path: '/insights', label: 'Insights' },

  // COMMUNICATIONS
  { path: '/call-logs', label: 'Call Log' },
  { path: '/voicemail', label: 'Voicemail' },
  { path: '/messages', label: 'Messages' },
  { path: '/campaigns', label: 'Campaigns' },

  // AI
  { path: '/aria/knowledge', label: 'Knowledge Base' },

  // SETTINGS
  { path: '/settings', label: 'Settings' },
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
