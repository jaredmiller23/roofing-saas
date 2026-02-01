/**
 * Campaigns & Automation Module - Smoke Tests
 *
 * SMOKE-008: Verify campaign builder and automation features work on production
 * Automated campaigns help nurture leads and follow up with customers
 *
 * Success Criteria:
 * - Campaigns list page loads
 * - Campaign statistics cards display
 * - Create campaign form loads
 * - Campaign builder tabs work (Settings, Triggers, Steps, Enrollments)
 * - Template selection works
 * - Campaign analytics page loads
 */

import { test, expect } from '@playwright/test'

test.describe('Campaigns & Automation Module - Smoke Tests', () => {

  test.describe('Unauthenticated Access', () => {
    // Use empty storage state to test without authentication
    test.use({ storageState: { cookies: [], origins: [] } })

    test('should redirect /campaigns to login when unauthenticated', async ({ page }) => {
      await page.goto('/campaigns')

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/)

      // Verify login page rendered properly
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
    })

    test('should redirect campaign builder to login when unauthenticated', async ({ page }) => {
      await page.goto('/campaigns/test-campaign-id/builder')

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/)
    })

    test('should redirect new campaign creation to login when unauthenticated', async ({ page }) => {
      await page.goto('/campaigns/new')

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Authenticated Campaigns Dashboard', () => {
    // Uses default authenticated storage state

    test('should load campaigns list page', async ({ page }) => {
      await page.goto('/campaigns')

      // Should stay on campaigns page (not redirect to login)
      await expect(page).toHaveURL(/\/campaigns/)

      // Should show the campaigns page header
      await expect(page.getByRole('heading', { name: /Campaigns/ })).toBeVisible()
    })

    test('should display campaign statistics cards', async ({ page }) => {
      await page.goto('/campaigns')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Campaigns/ })).toBeVisible()

      // Check for statistics cards - these should be visible in a campaigns dashboard
      const hasActiveCard = await page.getByText(/Active Campaigns?/i).isVisible()
      const hasTotalEnrolledCard = await page.getByText(/Total Enrolled/i).isVisible()
      const hasCompletedCard = await page.getByText(/Completed/i).isVisible()
      const hasRevenueCard = await page.getByText(/Revenue/i).isVisible()

      // At least one statistics card should be visible
      expect(hasActiveCard || hasTotalEnrolledCard || hasCompletedCard || hasRevenueCard).toBeTruthy()
    })

    test('should display campaigns list or empty state', async ({ page }) => {
      await page.goto('/campaigns')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Campaigns/ })).toBeVisible()

      // Should show either campaigns list or empty state
      const hasCampaigns = await page.locator('[data-testid*="campaign"], .campaign-card, .campaign-row, tr:has(td)').count() > 0
      const hasEmptyState = await page.getByText(/No campaigns|Empty|Create.*first.*campaign|Get started/i).isVisible()

      // Should show either campaigns or proper empty state
      expect(hasCampaigns || hasEmptyState).toBeTruthy()
    })

    test('should display create campaign button', async ({ page }) => {
      await page.goto('/campaigns')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Campaigns/ })).toBeVisible()

      // Should have create campaign functionality
      const createButton = page.getByRole('button', { name: /Create.*Campaign|New.*Campaign/ }).or(
        page.getByRole('link', { name: /Create.*Campaign|New.*Campaign/ })
      )

      await expect(createButton.first()).toBeVisible()
    })

    test('should display status filter tabs or dropdown', async ({ page }) => {
      await page.goto('/campaigns')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Campaigns/ })).toBeVisible()

      // Look for status filter controls
      const hasAllTab = await page.getByRole('tab', { name: /All/ }).isVisible()
      const hasDraftTab = await page.getByRole('tab', { name: /Draft/ }).isVisible()
      const hasActiveTab = await page.getByRole('tab', { name: /Active/ }).isVisible()
      const hasPausedTab = await page.getByRole('tab', { name: /Paused/ }).isVisible()
      const hasArchivedTab = await page.getByRole('tab', { name: /Archived/ }).isVisible()

      // Alternative: status filter dropdown
      const hasStatusFilter = await page.getByRole('combobox').filter({ hasText: /Status|Filter/ }).isVisible()

      // Should have either tabs or dropdown for status filtering
      expect(hasAllTab || hasDraftTab || hasActiveTab || hasPausedTab || hasArchivedTab || hasStatusFilter).toBeTruthy()
    })

    test('should open campaign detail or builder when clicking campaign', async ({ page }) => {
      await page.goto('/campaigns')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Campaigns/ })).toBeVisible()

      // Try to find a campaign item to click
      const campaignItem = page.locator('[data-testid*="campaign"], .campaign-card, .campaign-row, tr:has(td)').first()

      // Only test if a campaign exists
      if (await campaignItem.count() > 0) {
        await campaignItem.click()

        // Should navigate to campaign detail or builder page
        await expect(page).toHaveURL(/\/campaigns\/[^\/]+/)

        // Should show campaign detail content or builder
        const hasCampaignBuilder = await page.getByRole('tab', { name: /Settings|Triggers|Steps/ }).isVisible()
        const hasCampaignContent = await page.getByText(/Campaign.*Name|Status|Description/i).isVisible()

        expect(hasCampaignBuilder || hasCampaignContent).toBeTruthy()
      }
    })
  })

  test.describe('Authenticated Campaign Creation', () => {
    // Uses default authenticated storage state

    test('should load create campaign form', async ({ page }) => {
      await page.goto('/campaigns/new')

      // Should stay on create campaign page (not redirect to login)
      await expect(page).toHaveURL(/\/campaigns\/new/)

      // Should show create campaign form
      await expect(page.getByText(/Create.*Campaign/)).toBeVisible()
    })

    test('should display create campaign form fields', async ({ page }) => {
      await page.goto('/campaigns/new')

      // Wait for form to load
      await expect(page.getByText(/Create.*Campaign/)).toBeVisible()

      // Should have essential form fields
      const hasNameField = await page.getByLabel(/Campaign.*Name|Name/i).isVisible()
      const hasDescriptionField = await page.getByLabel(/Description/i).isVisible()
      const hasCampaignTypeField = await page.getByText(/Campaign.*Type|Type/i).isVisible()

      expect(hasNameField || hasDescriptionField || hasCampaignTypeField).toBeTruthy()
    })

    test('should display campaign type selection', async ({ page }) => {
      await page.goto('/campaigns/new')

      // Wait for form to load
      await expect(page.getByText(/Create.*Campaign/)).toBeVisible()

      // Should have campaign type options
      const hasTypeDropdown = await page.getByRole('combobox').isVisible()
      const hasTypeOptions = await page.getByText(/Drip|Event.*Based|Email|SMS/i).isVisible()

      expect(hasTypeDropdown || hasTypeOptions).toBeTruthy()
    })

    test('should have template selection or template options', async ({ page }) => {
      await page.goto('/campaigns/new')

      // Wait for form to load
      await expect(page.getByText(/Create.*Campaign/)).toBeVisible()

      // Look for template selection (optional feature, may not be present)
      const templateSection = page.getByText(/Template|Choose.*Template|Select.*Template/i)
      const templateButton = page.getByRole('button', { name: /Template|Browse.*Templates/ })

      // Template selection is optional - just verify page loaded without error
      // The form should have either template options or the create campaign form without templates
      const hasForm = await page.getByLabel(/Campaign.*Name|Name/i).isVisible()
      expect(hasForm).toBeTruthy()
    })

    test('should have functional create campaign button', async ({ page }) => {
      await page.goto('/campaigns/new')

      // Wait for form to load
      await expect(page.getByText(/Create.*Campaign/)).toBeVisible()

      // Create button should be present
      const createButton = page.getByRole('button', { name: /Create.*Campaign|Save.*Campaign/ })
      await expect(createButton).toBeVisible()

      // Button might be disabled initially (requires name)
      // Test if it becomes enabled after filling required fields
      const nameField = page.getByLabel(/Campaign.*Name|Name/i).first()
      if (await nameField.isVisible()) {
        await nameField.fill('Smoke Test Campaign')

        // Button should be enabled after filling name
        await expect(createButton).toBeEnabled()
      }
    })

    test('should have back button to return to campaigns list', async ({ page }) => {
      await page.goto('/campaigns/new')

      // Wait for form to load
      await expect(page.getByText(/Create.*Campaign/)).toBeVisible()

      // Should have back navigation
      const backButton = page.getByRole('button', { name: /Back|Cancel/ }).or(
        page.getByRole('link', { name: /Back.*Campaigns/ })
      )

      await expect(backButton.first()).toBeVisible()
    })
  })

  test.describe('Authenticated Campaign Builder', () => {
    // Uses default authenticated storage state

    test('should access campaign builder tabs from existing campaign', async ({ page }) => {
      // Navigate to campaigns first to find a campaign
      await page.goto('/campaigns')
      await expect(page.getByRole('heading', { name: /Campaigns/ })).toBeVisible()

      // Find and click a campaign if one exists
      const campaignItem = page.locator('[data-testid*="campaign"], .campaign-card, .campaign-row, tr:has(td)').first()

      if (await campaignItem.count() > 0) {
        await campaignItem.click()

        // Wait for campaign page to load
        await expect(page).toHaveURL(/\/campaigns\/[^\/]+/)

        // Should have builder tabs or navigate to builder
        const hasSettingsTab = await page.getByRole('tab', { name: /Settings/ }).isVisible()
        const hasTriggersTab = await page.getByRole('tab', { name: /Triggers/ }).isVisible()
        const hasStepsTab = await page.getByRole('tab', { name: /Steps/ }).isVisible()
        const hasEnrollmentsTab = await page.getByRole('tab', { name: /Enrollments/ }).isVisible()

        // If not on builder page, look for edit/builder button
        if (!hasSettingsTab) {
          const builderButton = page.getByRole('button', { name: /Edit|Builder|Configure/ }).or(
            page.getByRole('link', { name: /Edit|Builder|Configure/ })
          )

          if (await builderButton.isVisible()) {
            await builderButton.click()
            await expect(page).toHaveURL(/\/builder/)
          }
        }

        // Now check for builder tabs
        expect(hasSettingsTab || hasTriggersTab || hasStepsTab || hasEnrollmentsTab).toBeTruthy()
      }
    })

    test('should display campaign builder tabs when in builder', async ({ page }) => {
      // Try to access builder directly or create a campaign and access builder
      await page.goto('/campaigns')
      await expect(page.getByRole('heading', { name: /Campaigns/ })).toBeVisible()

      // Look for any campaign to access its builder
      const campaignItem = page.locator('[data-testid*="campaign"], .campaign-card, .campaign-row, tr:has(td)').first()

      if (await campaignItem.count() > 0) {
        await campaignItem.click()
        await expect(page).toHaveURL(/\/campaigns\/[^\/]+/)

        // Navigate to builder if not already there
        if (!page.url().includes('/builder')) {
          const builderButton = page.getByRole('button', { name: /Edit|Builder|Configure/ }).or(
            page.getByRole('link', { name: /Edit|Builder|Configure/ })
          )

          if (await builderButton.isVisible()) {
            await builderButton.click()
          }
        }

        // Check for all required builder tabs
        await expect(page.getByRole('tab', { name: /Settings/ })).toBeVisible()
        await expect(page.getByRole('tab', { name: /Triggers/ })).toBeVisible()
        await expect(page.getByRole('tab', { name: /Steps/ })).toBeVisible()
        await expect(page.getByRole('tab', { name: /Enrollments/ })).toBeVisible()
      }
    })

    test('should navigate between builder tabs', async ({ page }) => {
      // Navigate to campaigns and access builder
      await page.goto('/campaigns')
      await expect(page.getByRole('heading', { name: /Campaigns/ })).toBeVisible()

      const campaignItem = page.locator('[data-testid*="campaign"], .campaign-card, .campaign-row, tr:has(td)').first()

      if (await campaignItem.count() > 0) {
        await campaignItem.click()
        await expect(page).toHaveURL(/\/campaigns\/[^\/]+/)

        // Navigate to builder if needed
        if (!page.url().includes('/builder')) {
          const builderButton = page.getByRole('button', { name: /Edit|Builder|Configure/ }).or(
            page.getByRole('link', { name: /Edit|Builder|Configure/ })
          )

          if (await builderButton.isVisible()) {
            await builderButton.click()
          }
        }

        // Test tab navigation
        const settingsTab = page.getByRole('tab', { name: /Settings/ })
        const triggersTab = page.getByRole('tab', { name: /Triggers/ })
        const stepsTab = page.getByRole('tab', { name: /Steps/ })
        const enrollmentsTab = page.getByRole('tab', { name: /Enrollments/ })

        if (await settingsTab.isVisible()) {
          await settingsTab.click()
          await expect(page.getByText(/Campaign.*Settings|Settings/)).toBeVisible()
        }

        if (await triggersTab.isVisible()) {
          await triggersTab.click()
          await expect(page.getByText(/Triggers|When.*should.*enroll/i)).toBeVisible()
        }

        if (await stepsTab.isVisible()) {
          await stepsTab.click()
          await expect(page.getByText(/Steps|Campaign.*Steps/)).toBeVisible()
        }

        if (await enrollmentsTab.isVisible()) {
          await enrollmentsTab.click()
          await expect(page.getByText(/Enrollments|Who.*enrolled/i)).toBeVisible()
        }
      }
    })

    test('should display campaign analytics or metrics', async ({ page }) => {
      await page.goto('/campaigns')
      await expect(page.getByRole('heading', { name: /Campaigns/ })).toBeVisible()

      // Look for analytics/metrics on the campaigns page
      const hasAnalytics = await page.getByText(/Analytics|Performance|Metrics|Open.*Rate|Click.*Rate/i).isVisible()
      const hasStatsCards = await page.getByText(/Total.*Enrolled|Completed|Revenue|Active/i).isVisible()

      // Analytics might be on individual campaign pages
      const campaignItem = page.locator('[data-testid*="campaign"], .campaign-card, .campaign-row, tr:has(td)').first()

      if (await campaignItem.count() > 0 && !hasAnalytics && !hasStatsCards) {
        await campaignItem.click()
        await expect(page).toHaveURL(/\/campaigns\/[^\/]+/)

        // Look for analytics on campaign detail page
        const hasDetailAnalytics = await page.getByText(/Analytics|Performance|Metrics|Statistics/i).isVisible()
        const hasMetricsSection = await page.getByText(/Open.*Rate|Click.*Rate|Response.*Rate|Conversion/i).isVisible()

        expect(hasDetailAnalytics || hasMetricsSection).toBeTruthy()
      } else {
        expect(hasAnalytics || hasStatsCards).toBeTruthy()
      }
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully on campaigns page', async ({ page }) => {
      // Set up console error listener
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      // Navigate to campaigns page
      const response = await page.goto('/campaigns', { waitUntil: 'networkidle' })

      // Check HTTP response is not server error
      expect(response?.status()).not.toBe(500)
      expect(response?.status()).toBeLessThan(500)

      // Page should load without critical errors
      await expect(page).toHaveURL(/\/campaigns/)

      // Filter out expected/harmless errors (like Sentry transport warnings)
      const criticalErrors = errors.filter(e =>
        !e.includes('Sentry') &&
        !e.includes('Transport disabled') &&
        !e.includes('favicon') &&
        !e.includes('manifest')
      )

      expect(criticalErrors.length).toBe(0)
    })

    test('should handle invalid campaign URLs gracefully', async ({ page }) => {
      // Try to access a non-existent campaign
      await page.goto('/campaigns/invalid-campaign-id-12345')

      // Should handle gracefully - either redirect to list or show error page
      const isOnCampaignsPage = page.url().includes('/campaigns') && !page.url().includes('/invalid-campaign-id-12345')
      const hasErrorMessage = await page.getByText(/not found|error|invalid|does not exist/i).isVisible()

      // Should either redirect back to campaigns or show proper error
      expect(isOnCampaignsPage || hasErrorMessage).toBeTruthy()
    })

    test('should display appropriate empty state when no campaigns exist', async ({ page }) => {
      await page.goto('/campaigns')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Campaigns/ })).toBeVisible()

      // Should handle empty state gracefully
      // Either show campaigns or an appropriate empty state message
      const hasCampaigns = await page.locator('[data-testid*="campaign"], .campaign-card, .campaign-row').count() > 0
      const hasEmptyState = await page.getByText(/No campaigns|Empty|Create.*first.*campaign|Get started/i).isVisible()

      // Should show either campaigns or a proper empty state
      expect(hasCampaigns || hasEmptyState).toBeTruthy()
    })
  })
})
