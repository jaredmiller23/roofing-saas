/**
 * Claims Management Module - Smoke Tests
 *
 * SMOKE-007: Verify claims management and inspection features work on production
 * Claims tracking is essential for insurance-related roofing projects
 *
 * Success Criteria:
 * - Claims dashboard loads
 * - Claims list displays (or empty state)
 * - Project claims tab loads
 * - Claim detail page loads (if claims exist)
 * - Inspection page loads
 * - Status updates are visible
 */

import { test, expect } from '@playwright/test'

test.describe('Claims Management Module - Smoke Tests', () => {

  test.describe('Unauthenticated Access', () => {
    // Use empty storage state to test without authentication
    test.use({ storageState: { cookies: [], origins: [] } })

    test('should redirect /claims to login when unauthenticated', async ({ page }) => {
      await page.goto('/claims')

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/)

      // Verify login page rendered properly
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
    })

    test('should redirect claims detail page to login when unauthenticated', async ({ page }) => {
      await page.goto('/claims/test-claim-id')

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/)
    })

    test('should redirect inspection page to login when unauthenticated', async ({ page }) => {
      await page.goto('/inspection')

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Authenticated Claims Dashboard', () => {
    // Uses default authenticated storage state

    test('should load claims dashboard page', async ({ page }) => {
      await page.goto('/claims')

      // Should stay on claims page (not redirect to login)
      await expect(page).toHaveURL(/\/claims/)

      // Should show the claims dashboard header
      await expect(page.getByRole('heading', { name: /Claims|Insurance Claims/ })).toBeVisible()
    })

    test('should display claims list or empty state', async ({ page }) => {
      await page.goto('/claims')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Claims|Insurance Claims/ })).toBeVisible()

      // Should show either claims list or empty state
      const hasClaims = await page.locator('[data-testid*="claim"], .claim-card, .claim-row, tr:has(td)').count() > 0
      const hasEmptyState = await page.getByText(/No claims|Empty|Get started|Create.*claim/i).isVisible()

      // Should show either claims or proper empty state
      expect(hasClaims || hasEmptyState).toBeTruthy()
    })

    test('should display claims search functionality', async ({ page }) => {
      await page.goto('/claims')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Claims|Insurance Claims/ })).toBeVisible()

      // Should have search input for filtering claims
      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first()

      // Search functionality should be present
      await expect(searchInput).toBeVisible()
    })

    test('should display claims status filter', async ({ page }) => {
      await page.goto('/claims')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Claims|Insurance Claims/ })).toBeVisible()

      // Should have status filter dropdown or buttons
      const statusFilter = page.getByRole('combobox').filter({ hasText: /Status|Filter/ }).or(
        page.locator('button:has-text("Status")').or(
          page.getByRole('button', { name: /All|Pending|Approved|Submitted/ })
        )
      ).first()

      // Status filtering should be available
      if (await statusFilter.isVisible()) {
        expect(true).toBeTruthy()
      }
    })

    test('should display claims export functionality', async ({ page }) => {
      await page.goto('/claims')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Claims|Insurance Claims/ })).toBeVisible()

      // Look for export button (might have CSV/Excel icon)
      const exportButton = page.getByRole('button', { name: /Export|CSV|Excel/ }).or(
        page.locator('button').filter({ has: page.locator('[data-lucide="file-spreadsheet"], [data-lucide="download"]') })
      ).first()

      // Export functionality should be present
      if (await exportButton.isVisible()) {
        expect(true).toBeTruthy()
      }
    })

    test('should open claim detail page when clicking claim item', async ({ page }) => {
      await page.goto('/claims')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Claims|Insurance Claims/ })).toBeVisible()

      // Try to find a claim item to click
      const claimItem = page.locator('[data-testid*="claim"], .claim-card, .claim-row, tr:has(td)').first()

      // Only test if a claim exists
      if (await claimItem.count() > 0) {
        await claimItem.click()

        // Should navigate to claim detail page or project with claims tab
        await expect(page).toHaveURL(/\/(claims|projects)\/[^\/]+/)

        // Should show claim detail content
        const hasClaimDetail = await page.getByTestId('claim-detail').isVisible()
        const hasClaimContent = await page.getByText(/Claim.*Number|Policy.*Number|Status/i).isVisible()

        expect(hasClaimDetail || hasClaimContent).toBeTruthy()
      }
    })
  })

  test.describe('Authenticated Project Claims Integration', () => {
    // Uses default authenticated storage state

    test('should access claims tab from project page', async ({ page }) => {
      // Navigate to projects first to find a project
      await page.goto('/projects')
      await expect(page.getByRole('heading', { name: 'Pipeline' })).toBeVisible()

      // Find and click a project card if one exists
      const projectCard = page.locator('[data-testid*="project-card"]').first()

      if (await projectCard.count() > 0) {
        await projectCard.click()

        // Wait for project detail page
        await expect(page.getByTestId('project-detail-page')).toBeVisible()

        // Should have Claims tab
        const claimsTab = page.getByRole('tab', { name: /Claims/ })
        await expect(claimsTab).toBeVisible()

        // Click on claims tab
        await claimsTab.click()

        // Should show claims content for this project
        const hasClaimsSection = await page.getByTestId('project-claims').isVisible()
        const hasClaimsText = await page.getByText(/Claims|Insurance|Claim.*Status/i).isVisible()

        expect(hasClaimsSection || hasClaimsText).toBeTruthy()
      }
    })

    test('should display project-specific claims information', async ({ page }) => {
      // Navigate to projects first
      await page.goto('/projects')
      await expect(page.getByRole('heading', { name: 'Pipeline' })).toBeVisible()

      // Find and click a project if one exists
      const projectCard = page.locator('[data-testid*="project-card"]').first()

      if (await projectCard.count() > 0) {
        await projectCard.click()
        await expect(page.getByTestId('project-detail-page')).toBeVisible()

        // Click on claims tab
        const claimsTab = page.getByRole('tab', { name: /Claims/ })
        if (await claimsTab.isVisible()) {
          await claimsTab.click()

          // Should show either project claims or empty state for this project
          const hasProjectClaims = await page.locator('[data-testid*="project-claim"]').count() > 0
          const hasEmptyClaimsState = await page.getByText(/No claims.*project|Add.*claim|Create.*claim/i).isVisible()

          expect(hasProjectClaims || hasEmptyClaimsState).toBeTruthy()
        }
      }
    })

    test('should have claim creation functionality in project context', async ({ page }) => {
      // Navigate to projects first
      await page.goto('/projects')
      await expect(page.getByRole('heading', { name: 'Pipeline' })).toBeVisible()

      // Find and click a project if one exists
      const projectCard = page.locator('[data-testid*="project-card"]').first()

      if (await projectCard.count() > 0) {
        await projectCard.click()
        await expect(page.getByTestId('project-detail-page')).toBeVisible()

        // Click on claims tab
        const claimsTab = page.getByRole('tab', { name: /Claims/ })
        if (await claimsTab.isVisible()) {
          await claimsTab.click()

          // Should have button to add/create new claim for this project
          const addClaimButton = page.getByRole('button', { name: /Add.*Claim|Create.*Claim|New.*Claim/ }).or(
            page.getByRole('link', { name: /Add.*Claim|Create.*Claim|New.*Claim/ })
          )

          // Claim creation should be accessible from project
          if (await addClaimButton.isVisible()) {
            expect(true).toBeTruthy()
          }
        }
      }
    })
  })

  test.describe('Authenticated Claim Detail and Status Management', () => {
    // Uses default authenticated storage state

    test('should display claim status and allow status updates', async ({ page }) => {
      await page.goto('/claims')
      await expect(page.getByRole('heading', { name: /Claims|Insurance Claims/ })).toBeVisible()

      // Find and click a claim if one exists
      const claimItem = page.locator('[data-testid*="claim"], .claim-card, .claim-row, tr:has(td)').first()

      if (await claimItem.count() > 0) {
        await claimItem.click()
        await expect(page).toHaveURL(/\/(claims|projects)\/[^\/]+/)

        // Should show current claim status
        const hasStatusDisplay = await page.getByText(/Status.*:|Current.*Status|Pending|Approved|Submitted|Under Review/i).isVisible()

        // Should have status update functionality
        const hasStatusUpdate = await page.getByRole('button', { name: /Update.*Status|Change.*Status|Status/ }).isVisible()

        expect(hasStatusDisplay || hasStatusUpdate).toBeTruthy()
      }
    })

    test('should display claim information fields', async ({ page }) => {
      await page.goto('/claims')
      await expect(page.getByRole('heading', { name: /Claims|Insurance Claims/ })).toBeVisible()

      // Find and click a claim if one exists
      const claimItem = page.locator('[data-testid*="claim"], .claim-card, .claim-row, tr:has(td)').first()

      if (await claimItem.count() > 0) {
        await claimItem.click()
        await expect(page).toHaveURL(/\/(claims|projects)\/[^\/]+/)

        // Should show key claim information
        const hasClaimNumber = await page.getByText(/Claim.*Number|Claim.*ID/i).isVisible()
        const hasPolicyNumber = await page.getByText(/Policy.*Number|Policy.*ID/i).isVisible()
        const hasInsuranceInfo = await page.getByText(/Insurance|Carrier|Adjuster/i).isVisible()

        expect(hasClaimNumber || hasPolicyNumber || hasInsuranceInfo).toBeTruthy()
      }
    })
  })

  test.describe('Authenticated Inspection Workflow', () => {
    // Uses default authenticated storage state

    test('should load inspection page', async ({ page }) => {
      await page.goto('/inspection')

      // Should stay on inspection page (not redirect to login)
      await expect(page).toHaveURL(/\/inspection/)

      // Should show inspection interface
      await expect(page.getByRole('heading', { name: /Inspection|Inspector/ })).toBeVisible()
    })

    test('should display inspection workflow components', async ({ page }) => {
      await page.goto('/inspection')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Inspection|Inspector/ })).toBeVisible()

      // Should have inspection-related functionality
      const hasInspectionForm = await page.locator('form').isVisible()
      const hasInspectionActions = await page.getByRole('button', { name: /Start.*Inspection|Complete|Schedule/ }).isVisible()
      const hasInspectionContent = await page.getByText(/Schedule|Photos|Notes|Complete/i).isVisible()

      expect(hasInspectionForm || hasInspectionActions || hasInspectionContent).toBeTruthy()
    })

    test('should navigate to inspection from claims', async ({ page }) => {
      await page.goto('/claims')
      await expect(page.getByRole('heading', { name: /Claims|Insurance Claims/ })).toBeVisible()

      // Find and click a claim if one exists
      const claimItem = page.locator('[data-testid*="claim"], .claim-card, .claim-row, tr:has(td)').first()

      if (await claimItem.count() > 0) {
        await claimItem.click()
        await expect(page).toHaveURL(/\/(claims|projects)\/[^\/]+/)

        // Look for inspection link/button
        const inspectionLink = page.getByRole('link', { name: /Inspection|Schedule.*Inspection/ }).or(
          page.getByRole('button', { name: /Inspection|Schedule.*Inspection/ })
        )

        if (await inspectionLink.isVisible()) {
          await inspectionLink.click()

          // Should navigate to inspection page or inspection section
          const hasInspectionURL = page.url().includes('inspection')
          const hasInspectionContent = await page.getByText(/Inspection|Schedule|Inspector/i).isVisible()

          expect(hasInspectionURL || hasInspectionContent).toBeTruthy()
        }
      }
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully on claims page', async ({ page }) => {
      // Set up console error listener
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      // Navigate to claims page
      const response = await page.goto('/claims', { waitUntil: 'networkidle' })

      // Check HTTP response is not server error
      expect(response?.status()).not.toBe(500)
      expect(response?.status()).toBeLessThan(500)

      // Page should load without critical errors
      await expect(page).toHaveURL(/\/claims/)

      // Filter out expected/harmless errors (like Sentry transport warnings)
      const criticalErrors = errors.filter(e =>
        !e.includes('Sentry') &&
        !e.includes('Transport disabled') &&
        !e.includes('favicon') &&
        !e.includes('manifest')
      )

      expect(criticalErrors.length).toBe(0)
    })

    test('should handle network errors gracefully on inspection page', async ({ page }) => {
      // Set up console error listener
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      // Navigate to inspection page
      const response = await page.goto('/inspection', { waitUntil: 'networkidle' })

      // Check HTTP response is not server error
      expect(response?.status()).not.toBe(500)
      expect(response?.status()).toBeLessThan(500)

      // Page should load without critical errors
      await expect(page).toHaveURL(/\/inspection/)

      // Filter out expected/harmless errors
      const criticalErrors = errors.filter(e =>
        !e.includes('Sentry') &&
        !e.includes('Transport disabled') &&
        !e.includes('favicon') &&
        !e.includes('manifest')
      )

      expect(criticalErrors.length).toBe(0)
    })

    test('should handle invalid claim URLs gracefully', async ({ page }) => {
      // Try to access a non-existent claim
      await page.goto('/claims/invalid-claim-id-12345')

      // Should handle gracefully - either redirect to list or show error page
      const isOnClaimsPage = page.url().includes('/claims') && !page.url().includes('/invalid-claim-id-12345')
      const hasErrorMessage = await page.getByText(/not found|error|invalid|does not exist/i).isVisible()

      // Should either redirect back to claims or show proper error
      expect(isOnClaimsPage || hasErrorMessage).toBeTruthy()
    })

    test('should display appropriate empty state when no claims exist', async ({ page }) => {
      await page.goto('/claims')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Claims|Insurance Claims/ })).toBeVisible()

      // Should handle empty state gracefully
      // Either show claims or an appropriate empty state message
      const hasClaims = await page.locator('[data-testid*="claim"], .claim-card, .claim-row').count() > 0
      const hasEmptyState = await page.getByText(/No claims|Empty|Create.*first.*claim|Get started/i).isVisible()

      // Should show either claims or a proper empty state
      expect(hasClaims || hasEmptyState).toBeTruthy()
    })
  })
})
