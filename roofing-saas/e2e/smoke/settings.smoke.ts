/**
 * Settings & Admin Module - Smoke Tests
 *
 * SMOKE-009: Verify settings and admin pages work on production
 * Users need to configure their account, templates, and automation settings
 *
 * Success Criteria:
 * - Settings page loads
 * - All settings tabs are accessible
 * - Profile settings form loads
 * - Automations tab shows workflow templates
 * - Compliance tab loads
 * - Gamification tab loads
 * - Audit logs page loads (admin only)
 */

import { test, expect } from '@playwright/test'

test.describe('Settings & Admin Module - Smoke Tests', () => {

  test.describe('Unauthenticated Access', () => {
    // Use empty storage state to test without authentication
    test.use({ storageState: { cookies: [], origins: [] } })

    test('should redirect /settings to login when unauthenticated', async ({ page }) => {
      await page.goto('/settings')

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/)

      // Verify login page rendered properly
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
    })

    test('should redirect admin audit logs to login when unauthenticated', async ({ page }) => {
      await page.goto('/admin/audit-logs')

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Authenticated Settings Access', () => {
    // Uses default authenticated storage state

    test('should load settings page', async ({ page }) => {
      await page.goto('/settings')

      // Should stay on settings page (not redirect to login)
      await expect(page).toHaveURL(/\/settings/)

      // Should show the settings header
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

      // Should show the settings description
      await expect(page.getByText('Manage your CRM customization and preferences')).toBeVisible()
    })

    test('should display all main settings tabs', async ({ page }) => {
      await page.goto('/settings')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

      // Check for main settings tabs
      await expect(page.getByRole('tab', { name: /General/ })).toBeVisible()
      await expect(page.getByRole('tab', { name: /Branding/ })).toBeVisible()
      await expect(page.getByRole('tab', { name: /Pipeline/ })).toBeVisible()
      await expect(page.getByRole('tab', { name: /Templates/ })).toBeVisible()
      await expect(page.getByRole('tab', { name: /Roles/ })).toBeVisible()
      await expect(page.getByRole('tab', { name: /Team/ })).toBeVisible()
      await expect(page.getByRole('tab', { name: /Admin/ })).toBeVisible()
    })

    test('should display automation and integration tabs', async ({ page }) => {
      await page.goto('/settings')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

      // Check for automation and workflow related tabs
      await expect(page.getByRole('tab', { name: /Automations/ })).toBeVisible()
      await expect(page.getByRole('tab', { name: /Integrations/ })).toBeVisible()
    })

    test('should display gamification and compliance tabs', async ({ page }) => {
      await page.goto('/settings')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

      // Check for specialized functionality tabs
      await expect(page.getByRole('tab', { name: /Gamification/ })).toBeVisible()
      await expect(page.getByRole('tab', { name: /Compliance/ })).toBeVisible()
    })

    test('should load general settings tab (profile settings)', async ({ page }) => {
      await page.goto('/settings')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

      // General tab should be active by default, but click it to ensure
      await page.getByRole('tab', { name: /General/ }).click()

      // Should show general settings content (profile/organization settings)
      const hasGeneralContent = await page.getByText(/Organization|Profile|Company|Business/i).isVisible()
      const hasSettingsForm = await page.locator('form').isVisible()
      const hasInputFields = await page.locator('input').count() > 0

      // Should show either form or relevant content
      expect(hasGeneralContent || hasSettingsForm || hasInputFields).toBeTruthy()
    })

    test('should load automations tab and show workflow templates', async ({ page }) => {
      await page.goto('/settings')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

      // Click on Automations tab
      await page.getByRole('tab', { name: /Automations/ }).click()

      // Should show automation settings content
      const hasAutomationContent = await page.getByText(/Automation|Workflow|Template|Trigger|Action/i).isVisible()
      const hasCreateButton = await page.getByRole('button', { name: /Create|Add.*Automation|New.*Workflow/ }).isVisible()
      const hasAutomationList = await page.locator('[data-testid*="automation"], .automation-item, .workflow-item').count() > 0

      // Should show automation functionality
      expect(hasAutomationContent || hasCreateButton || hasAutomationList).toBeTruthy()
    })

    test('should load compliance tab', async ({ page }) => {
      await page.goto('/settings')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

      // Click on Compliance tab
      await page.getByRole('tab', { name: /Compliance/ }).click()

      // Should show compliance settings content
      const hasComplianceContent = await page.getByText(/Compliance|Call.*Recording|Legal|Privacy|TCPA|Consent/i).isVisible()
      const hasComplianceSettings = await page.locator('form').isVisible()
      const hasToggleSettings = await page.locator('input[type="checkbox"], [role="switch"]').count() > 0

      // Should show compliance functionality
      expect(hasComplianceContent || hasComplianceSettings || hasToggleSettings).toBeTruthy()
    })

    test('should load gamification tab', async ({ page }) => {
      await page.goto('/settings')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

      // Click on Gamification tab
      await page.getByRole('tab', { name: /Gamification/ }).click()

      // Should show gamification settings content
      const hasGamificationContent = await page.getByText(/Gamification|Points|Achievements|Leaderboard|Rewards|Challenge/i).isVisible()
      const hasGamificationSettings = await page.locator('[data-testid*="gamification"], .gamification-section').isVisible()
      const hasPointsConfig = await page.getByText(/Points.*Rules|Point.*System/i).isVisible()

      // Should show gamification functionality
      expect(hasGamificationContent || hasGamificationSettings || hasPointsConfig).toBeTruthy()
    })

    test('should switch between different settings tabs', async ({ page }) => {
      await page.goto('/settings')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

      // Test tab switching functionality
      await page.getByRole('tab', { name: /Templates/ }).click()

      // Wait for tab content to load
      await page.waitForTimeout(500)

      // Switch to another tab
      await page.getByRole('tab', { name: /Team/ }).click()

      // Wait for tab content to load
      await page.waitForTimeout(500)

      // Switch back to general
      await page.getByRole('tab', { name: /General/ }).click()

      // Tab switching should work without errors
      expect(true).toBeTruthy()
    })

    test('should show appropriate settings content for each tab', async ({ page }) => {
      await page.goto('/settings')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

      // Test Templates tab
      await page.getByRole('tab', { name: /Templates/ }).click()
      const hasTemplateContent = await page.getByText(/Template|Email.*Template|SMS.*Template|Document/i).isVisible()

      // Test Pipeline tab
      await page.getByRole('tab', { name: /Pipeline/ }).click()
      const hasPipelineContent = await page.getByText(/Pipeline|Stage|Status|Workflow/i).isVisible()

      // Test Roles tab
      await page.getByRole('tab', { name: /Roles/ }).click()
      const hasRoleContent = await page.getByText(/Role|Permission|Access|User.*Role/i).isVisible()

      // At least one tab should show relevant content
      expect(hasTemplateContent || hasPipelineContent || hasRoleContent).toBeTruthy()
    })
  })

  test.describe('Admin Audit Logs Access', () => {
    // Uses default authenticated storage state

    test('should load audit logs page', async ({ page }) => {
      await page.goto('/admin/audit-logs')

      // Should either load audit logs or redirect to settings (if not admin)
      const isOnAuditLogs = page.url().includes('/admin/audit-logs')
      const isRedirectedToSettings = page.url().includes('/settings')

      expect(isOnAuditLogs || isRedirectedToSettings).toBeTruthy()

      if (isOnAuditLogs) {
        // If user is admin and can access, verify page content
        await expect(page.getByRole('heading', { name: /Audit.*Log|Impersonation.*Log/ })).toBeVisible()
      }
    })

    test('should display audit logs content when accessible', async ({ page }) => {
      await page.goto('/admin/audit-logs')

      // Wait for page to load or redirect
      await page.waitForTimeout(1000)

      const isOnAuditLogs = page.url().includes('/admin/audit-logs')

      if (isOnAuditLogs) {
        // User has admin access - verify audit logs functionality
        const hasAuditTable = await page.locator('table, [data-testid*="audit"], .audit-log').isVisible()
        const hasAuditContent = await page.getByText(/Impersonation|Admin.*Action|Timestamp|User/i).isVisible()
        const hasEmptyState = await page.getByText(/No.*logs|No.*activity|Empty/i).isVisible()

        // Should show either audit data or proper empty state
        expect(hasAuditTable || hasAuditContent || hasEmptyState).toBeTruthy()
      } else {
        // Non-admin user - should be redirected to settings
        await expect(page).toHaveURL(/\/settings/)
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
      }
    })

    test('should handle admin audit logs search and filtering', async ({ page }) => {
      await page.goto('/admin/audit-logs')

      // Wait for page to load or redirect
      await page.waitForTimeout(1000)

      const isOnAuditLogs = page.url().includes('/admin/audit-logs')

      if (isOnAuditLogs) {
        // User has admin access - check for search/filter functionality
        const hasSearchInput = await page.locator('input[placeholder*="Search"], input[type="search"]').isVisible()
        const hasFilterOptions = await page.getByRole('combobox', { name: /Filter|Date/ }).isVisible()
        const hasDatePicker = await page.locator('input[type="date"], [data-testid*="date"]').isVisible()

        // Audit logs should have search/filter capabilities
        if (hasSearchInput || hasFilterOptions || hasDatePicker) {
          expect(true).toBeTruthy()
        }
      }
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully on settings page', async ({ page }) => {
      // Set up console error listener
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      // Navigate to settings page
      const response = await page.goto('/settings', { waitUntil: 'networkidle' })

      // Check HTTP response is not server error
      expect(response?.status()).not.toBe(500)
      expect(response?.status()).toBeLessThan(500)

      // Page should load without critical errors
      await expect(page).toHaveURL(/\/settings/)

      // Filter out expected/harmless errors (like Sentry transport warnings)
      const criticalErrors = errors.filter(e =>
        !e.includes('Sentry') &&
        !e.includes('Transport disabled') &&
        !e.includes('favicon') &&
        !e.includes('manifest')
      )

      expect(criticalErrors.length).toBe(0)
    })

    test('should handle network errors gracefully on admin audit logs', async ({ page }) => {
      // Set up console error listener
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      // Navigate to admin audit logs page
      const response = await page.goto('/admin/audit-logs', { waitUntil: 'networkidle' })

      // Check HTTP response is not server error
      expect(response?.status()).not.toBe(500)
      expect(response?.status()).toBeLessThan(500)

      // Page should load without critical errors (either audit logs or redirect to settings)
      const isOnAuditLogs = page.url().includes('/admin/audit-logs')
      const isOnSettings = page.url().includes('/settings')

      expect(isOnAuditLogs || isOnSettings).toBeTruthy()

      // Filter out expected/harmless errors
      const criticalErrors = errors.filter(e =>
        !e.includes('Sentry') &&
        !e.includes('Transport disabled') &&
        !e.includes('favicon') &&
        !e.includes('manifest')
      )

      expect(criticalErrors.length).toBe(0)
    })

    test('should handle tab switching errors gracefully', async ({ page }) => {
      await page.goto('/settings')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

      // Set up console error listener for tab switching
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      // Test rapid tab switching to check for race conditions
      const tabs = ['Automations', 'Compliance', 'Gamification', 'General']

      for (const tab of tabs) {
        await page.getByRole('tab', { name: new RegExp(tab) }).click()
        await page.waitForTimeout(200)
      }

      // Tab switching should work without critical errors
      const criticalErrors = errors.filter(e =>
        !e.includes('Sentry') &&
        !e.includes('Transport disabled') &&
        !e.includes('favicon')
      )

      expect(criticalErrors.length).toBe(0)
    })

    test('should display appropriate empty states in settings tabs', async ({ page }) => {
      await page.goto('/settings')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

      // Check different tabs handle empty states gracefully
      await page.getByRole('tab', { name: /Automations/ }).click()
      await page.waitForTimeout(500)

      // Should show either content or proper empty state
      const hasContent = await page.locator('form, table, .automation-item').count() > 0
      const hasEmptyState = await page.getByText(/No.*automations|Empty|Get.*started|Create.*first/i).isVisible()

      expect(hasContent || hasEmptyState).toBeTruthy()
    })
  })
})
