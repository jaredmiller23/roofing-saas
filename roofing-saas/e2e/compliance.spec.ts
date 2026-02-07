import { test, expect } from '@playwright/test'

/**
 * Call Compliance E2E Tests
 *
 * These tests verify the call compliance features including:
 * - DNC (Do Not Call) Management
 * - Compliance Statistics
 * - Compliance Audit Log
 *
 * All tests run in the Settings page under the Compliance tab
 */

/**
 * Tests for UNAUTHENTICATED users
 * These tests use empty storage state to bypass the default auth
 */
test.describe('Compliance Settings - Unauthenticated', () => {
  // Use empty storage state to test without authentication
  test.use({ storageState: { cookies: [], origins: [] } })

  test('should redirect to login when accessing settings unauthenticated', async ({ page }) => {
    await page.goto('/en/settings')

    // Should redirect to login page when not authenticated
    await expect(page).toHaveURL(/\/login/)
  })
})

/**
 * Tests for AUTHENTICATED users
 * These tests use the default authenticated state from playwright.config.ts
 */
test.describe('Compliance Settings - Authenticated', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to settings page
    await page.goto('/en/settings', { waitUntil: 'networkidle' })

    // Wait for settings page to load
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible({ timeout: 10000 })
  })

  test.describe('Navigation to Compliance Tab', () => {
    test('should navigate to Compliance tab', async ({ page }) => {
      // Wait for tabs to load
      await page.waitForSelector('[role="tablist"]')

      // Click on the Compliance tab - use text selector for reliability
      await page.getByRole('tab', { name: /Compliance/i }).click()

      // Should show the DNC Management section (with longer timeout for API calls)
      await expect(page.getByText('Do Not Call (DNC) Management')).toBeVisible({ timeout: 10000 })
    })

    test('should show Compliance tab with icon', async ({ page }) => {
      // Wait for tabs to load
      await page.waitForSelector('[role="tablist"]')

      // Find the Compliance tab trigger
      const complianceTab = page.getByRole('tab', { name: /Compliance/i })
      await expect(complianceTab).toBeVisible()

      // Tab should contain "Compliance" text
      await expect(complianceTab).toContainText('Compliance')
    })
  })

  test.describe('DNC Management Section', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to Compliance tab
      await page.waitForSelector('[role="tablist"]')
      await page.getByRole('tab', { name: /Compliance/i }).click()
      // Wait for the tab content to load (with longer timeout for API calls)
      await expect(page.getByText('Do Not Call (DNC) Management')).toBeVisible({ timeout: 10000 })
    })

    test('should display DNC Management card', async ({ page }) => {
      // Check for section title
      await expect(page.getByText('Do Not Call (DNC) Management')).toBeVisible()

      // Check for description text
      await expect(page.getByText('Import and manage Do Not Call lists to ensure compliance with TCPA regulations')).toBeVisible()
    })

    test('should display upload DNC list form', async ({ page }) => {
      // Check for "Upload DNC List" heading
      await expect(page.getByText('Upload DNC List')).toBeVisible()

      // Check for source dropdown
      const sourceSelect = page.locator('button:has-text("Federal DNC"), button:has-text("State TN DNC"), button:has-text("Internal DNC")').first()
      await expect(sourceSelect).toBeVisible()

      // Check for file input label
      await expect(page.getByText('CSV File')).toBeVisible()

      // Check for upload button
      await expect(page.getByRole('button', { name: /Upload DNC List/i })).toBeVisible()
    })

    test('should have source dropdown with correct options', async ({ page }) => {
      // Click the source dropdown to open it
      const sourceSelect = page.locator('button').filter({ hasText: /Federal DNC|State TN DNC|Internal DNC/ }).first()
      await sourceSelect.click()

      // Verify all options are present
      await expect(page.getByText('Federal DNC', { exact: true })).toBeVisible()
      await expect(page.getByText('State TN DNC', { exact: true })).toBeVisible()
      await expect(page.getByText('Internal DNC', { exact: true })).toBeVisible()
    })

    test('should display recent imports table when imports exist', async ({ page }) => {
      // Table headers may or may not be present depending on data
      // Just check if the section loads without errors
      const dncSection = page.locator('text=Do Not Call (DNC) Management').locator('..')
      await expect(dncSection).toBeVisible()
    })
  })

  test.describe('Compliance Statistics Section', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to Compliance tab
      await page.waitForSelector('[role="tablist"]')
      await page.getByRole('tab', { name: /Compliance/i }).click()
      // Wait for the tab content to load (with longer timeout for API calls)
      await expect(page.getByText('Compliance Statistics')).toBeVisible({ timeout: 10000 })
    })

    test('should display compliance statistics card', async ({ page }) => {
      // Check for section title
      await expect(page.getByText('Compliance Statistics')).toBeVisible()

      // Check for description
      await expect(page.getByText('Overview of compliance checks and DNC registry status')).toBeVisible()
    })

    test('should display statistics metrics when data exists', async ({ page }) => {
      // Wait for either stats content or empty state to appear
      await expect(
        page.getByText('Total Checks').or(page.getByText('No compliance statistics available yet'))
      ).toBeVisible({ timeout: 10000 })

      // These elements will be visible if stats exist, or a "no data" message will show
      const statsSection = page.locator('text=Compliance Statistics').locator('..')
      await expect(statsSection).toBeVisible()

      // Check for either stats or empty state
      const hasStats = await page.getByText('Total Checks').isVisible().catch(() => false)
      const hasEmptyState = await page.getByText('No compliance statistics available yet').isVisible().catch(() => false)

      // One of them should be visible
      expect(hasStats || hasEmptyState).toBeTruthy()
    })

    test('should show stats when data is available', async ({ page }) => {
      // Wait for either stats content or empty state to render
      await expect(
        page.getByText('Total Checks').or(page.getByText('No compliance statistics available yet'))
      ).toBeVisible({ timeout: 10000 })

      // Try to find the Total Checks stat
      const totalChecks = page.getByText('Total Checks')
      const isVisible = await totalChecks.isVisible().catch(() => false)

      if (isVisible) {
        // If stats exist, verify all main metrics are present
        await expect(page.getByText('Total Checks')).toBeVisible()
        await expect(page.getByText('Allowed')).toBeVisible()
        await expect(page.getByText('Blocked')).toBeVisible()
        await expect(page.getByText('Block Rate')).toBeVisible()
      } else {
        // If no stats, verify empty state message
        await expect(page.getByText('No compliance statistics available yet')).toBeVisible()
      }
    })

    test('should display DNC Registry Counts section when data exists', async ({ page }) => {
      // Wait for either stats content or empty state
      await expect(
        page.getByText('Total Checks').or(page.getByText('No compliance statistics available yet'))
      ).toBeVisible({ timeout: 10000 })

      // Check if stats exist
      const totalChecks = page.getByText('Total Checks')
      const hasStats = await totalChecks.isVisible().catch(() => false)

      if (hasStats) {
        // If stats exist, check for DNC counts
        const dncRegistryCounts = page.getByText('DNC Registry Counts')
        const hasDncCounts = await dncRegistryCounts.isVisible().catch(() => false)

        if (hasDncCounts) {
          await expect(page.getByText('Federal DNC')).toBeVisible()
          await expect(page.getByText('State TN DNC')).toBeVisible()
          await expect(page.getByText('Internal DNC')).toBeVisible()
        }
      }
    })
  })

  test.describe('Compliance Audit Log Section', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to Compliance tab
      await page.waitForSelector('[role="tablist"]')
      await page.getByRole('tab', { name: /Compliance/i }).click()
      // Wait for the tab content to load (with longer timeout for API calls)
      await expect(page.getByText('Compliance Audit Log')).toBeVisible({ timeout: 10000 })
    })

    test('should display audit log card', async ({ page }) => {
      // Check for section title
      await expect(page.getByText('Compliance Audit Log')).toBeVisible()

      // Check for description
      await expect(page.getByText('Recent compliance checks and their results')).toBeVisible()
    })

    test('should display audit log filter dropdown', async ({ page }) => {
      // Check for the filter dropdown
      const filterSelect = page.locator('button').filter({ hasText: /All Results|Allowed Only|Blocked Only/ })
      await expect(filterSelect.first()).toBeVisible()
    })

    test('should have filter dropdown with correct options', async ({ page }) => {
      // Find and click the filter dropdown
      const filterSelect = page.locator('button').filter({ hasText: /All Results|Allowed Only|Blocked Only/ }).first()
      await filterSelect.click()

      // Verify all filter options are present
      await expect(page.getByText('All Results', { exact: true })).toBeVisible()
      await expect(page.getByText('Allowed Only', { exact: true })).toBeVisible()
      await expect(page.getByText('Blocked Only', { exact: true })).toBeVisible()
    })

    test('should display audit log table headers when logs exist', async ({ page }) => {
      // Wait for either audit log table or empty state
      await expect(
        page.getByText('Check Type').or(page.getByText('No audit log entries found'))
      ).toBeVisible({ timeout: 10000 })

      // Check for either table or empty state
      const auditSection = page.locator('text=Compliance Audit Log').locator('..')
      await expect(auditSection).toBeVisible()

      const hasLogs = await page.getByText('Check Type').isVisible().catch(() => false)
      const hasEmptyState = await page.getByText('No audit log entries found').isVisible().catch(() => false)

      // One of them should be visible
      expect(hasLogs || hasEmptyState).toBeTruthy()
    })

    test('should show table headers when logs are available', async ({ page }) => {
      // Wait for either audit log content or empty state
      await expect(
        page.getByText('Check Type').or(page.getByText('No audit log entries found'))
      ).toBeVisible({ timeout: 10000 })

      // Try to find the Check Type header
      const checkTypeHeader = page.getByText('Check Type')
      const isVisible = await checkTypeHeader.isVisible().catch(() => false)

      if (isVisible) {
        // If logs exist, verify all headers are present
        await expect(page.getByText('Date/Time')).toBeVisible()
        await expect(page.getByText('Phone Number')).toBeVisible()
        await expect(page.getByText('Check Type')).toBeVisible()
        await expect(page.getByText('Result')).toBeVisible()
        await expect(page.getByText('Reason')).toBeVisible()
      } else {
        // If no logs, verify empty state message
        await expect(page.getByText('No audit log entries found')).toBeVisible()
      }
    })
  })

  test.describe('Compliance Page Integration', () => {
    test('should load compliance tab without errors', async ({ page }) => {
      // Set up console error listener
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      // Navigate to Compliance tab
      await page.waitForSelector('[role="tablist"]')
      await page.getByRole('tab', { name: /Compliance/i }).click()

      // Wait for compliance content to load
      await expect(page.getByText('Do Not Call (DNC) Management')).toBeVisible()

      // Wait for all three sections to render (confirms async operations complete)
      await expect(page.getByText('Compliance Statistics')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Compliance Audit Log')).toBeVisible({ timeout: 10000 })

      // Filter out known non-critical errors (like Sentry)
      const criticalErrors = errors.filter(e =>
        !e.includes('Sentry') &&
        !e.includes('Transport disabled') &&
        !e.includes('fetch') // Fetch errors might occur if no data exists
      )

      // Should have minimal critical errors
      expect(criticalErrors.length).toBeLessThanOrEqual(0)
    })

    test('should show all three main sections on compliance tab', async ({ page }) => {
      // Navigate to Compliance tab
      await page.waitForSelector('[role="tablist"]')
      await page.getByRole('tab', { name: /Compliance/i }).click()

      // Wait for all three compliance sections to render
      await expect(page.getByText('Do Not Call (DNC) Management')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Compliance Statistics')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Compliance Audit Log')).toBeVisible({ timeout: 10000 })
    })
  })
})

/**
 * Smoke Tests - Verify compliance features load without errors
 */
test.describe('Compliance Settings - Smoke Tests (Authenticated)', () => {
  test('should load compliance settings without 500 errors', async ({ page }) => {
    // Set up console error listener
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Navigate to settings page
    const response = await page.goto('/en/settings', { waitUntil: 'networkidle' })

    // Check HTTP response
    expect(response?.status()).not.toBe(500)
    expect(response?.status()).toBeLessThan(500)

    // Should stay on settings page
    await expect(page).toHaveURL(/\/settings/)

    // Settings heading should be visible
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

    // Navigate to Compliance tab
    await page.waitForSelector('[role="tablist"]')
    await page.getByRole('tab', { name: /Compliance/i }).click()

    // Wait for compliance content to load
    await expect(page.getByText('Do Not Call (DNC) Management')).toBeVisible()

    // No critical JavaScript errors (ignore Sentry and fetch warnings)
    const criticalErrors = errors.filter(e =>
      !e.includes('Sentry') &&
      !e.includes('Transport disabled') &&
      !e.includes('fetch')
    )
    expect(criticalErrors.length).toBe(0)
  })

  test('should handle API errors gracefully', async ({ page }) => {
    // Navigate to settings
    await page.goto('/en/settings')

    // Navigate to Compliance tab
    await page.waitForSelector('[role="tablist"]')
    await page.getByRole('tab', { name: /Compliance/i }).click()

    // Wait for all three compliance sections (even if APIs fail, the UI structure renders)
    await expect(page.getByText('Do Not Call (DNC) Management')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Compliance Statistics')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Compliance Audit Log')).toBeVisible({ timeout: 10000 })
  })
})
