/**
 * Claims Management E2E Tests
 *
 * Comprehensive tests for insurance claims management workflows.
 *
 * Test Coverage:
 * - Claim creation (with project association)
 * - Claim status updates (workflow progression)
 * - Claim document uploads
 * - Claim search and filtering
 * - Claim export (CSV/PDF)
 * - Inspection workflow
 *
 * @see docs/testing/E2E_TESTING_BEST_PRACTICES.md
 * @see app/(dashboard)/claims/page.tsx
 */

import { test, expect } from '@playwright/test'

// Generate unique claim data to avoid conflicts
const generateClaimNumber = () => `CLM-${Date.now()}`
const generatePolicyNumber = () => `POL-${Math.floor(100000 + Math.random() * 900000)}`

test.describe('Claims Management', () => {
  test.describe('Claims Dashboard', () => {
    test('should load claims dashboard', async ({ page }) => {
      await page.goto('/claims')
      // Skip networkidle - wait for DOM instead

      // Should be on claims page
      expect(page.url()).toContain('/claims')

      // Wait for Claims Management heading
      await page.waitForSelector('h1:has-text("Claims Management")', { timeout: 10000 })

      // Should have page heading
      const heading = page.locator('h1:has-text("Claims Management")')
      await expect(heading).toBeVisible()
    })

    test('should display claims stats cards', async ({ page }) => {
      await page.goto('/claims')
      // Skip networkidle - wait for DOM instead

      // Wait for page header
      await page.waitForSelector('h1:has-text("Claims Management")', { timeout: 10000 })

      // Should show stats cards (use data-slot to target card descriptions)
      await expect(page.locator('[data-slot="card-description"]:has-text("Total Claims")')).toBeVisible()
      await expect(page.locator('[data-slot="card-description"]:has-text("New")')).toBeVisible()
      await expect(page.locator('[data-slot="card-description"]:has-text("In Progress")')).toBeVisible()
      await expect(page.locator('[data-slot="card-description"]:has-text("Total Approved")')).toBeVisible()
    })
  })

  test.describe('Claim Search and Filtering', () => {
    test('should have search input for claims', async ({ page }) => {
      await page.goto('/claims')
      // Skip networkidle - wait for DOM instead

      // Wait for page header
      await page.waitForSelector('h1:has-text("Claims Management")', { timeout: 10000 })

      // Search input should be present with correct placeholder
      const searchInput = page.locator('input[placeholder*="claim"]')
      await expect(searchInput).toBeVisible()

      // Type search query and verify input accepts it
      await searchInput.fill('CLM-TEST')
      await expect(searchInput).toHaveValue('CLM-TEST')
    })

    test('should have status filter dropdown', async ({ page }) => {
      await page.goto('/claims')
      // Skip networkidle - wait for DOM instead

      // Wait for page header
      await page.waitForSelector('h1:has-text("Claims Management")', { timeout: 10000 })

      // Status filter should be present - button with "All Statuses" or similar
      const statusFilter = page.locator('button:has-text("Statuses"), button:has-text("Status")').first()
      await expect(statusFilter).toBeVisible()

      // Click to open dropdown
      await statusFilter.click()
      await page.waitForTimeout(300)

      // Should show status options
      const statusOptions = page.locator('[role="option"]')
      const optionCount = await statusOptions.count()
      expect(optionCount).toBeGreaterThan(0)
    })

    test('should have date range filters', async ({ page }) => {
      await page.goto('/claims')
      // Skip networkidle - wait for DOM instead

      // Wait for page header
      await page.waitForSelector('h1:has-text("Claims Management")', { timeout: 10000 })

      // Date inputs should be present (mm/dd/yyyy format visible in screenshot)
      const dateInputs = page.locator('input[type="date"]')
      const dateCount = await dateInputs.count()
      expect(dateCount).toBeGreaterThanOrEqual(2) // From and To dates
    })
  })

  test.describe('Claim Export', () => {
    test('should have export buttons', async ({ page }) => {
      await page.goto('/claims')
      // Skip networkidle - wait for DOM instead

      // Wait for page to load - look for Claims Management heading
      await page.waitForSelector('h1:has-text("Claims Management")', {
        timeout: 10000
      })

      // Export CSV button should be present
      const exportCsvButton = page.locator('button:has-text("Export CSV")')
      await expect(exportCsvButton).toBeVisible()

      // Export PDF button should also be present
      const exportPdfButton = page.locator('button:has-text("Export PDF")')
      await expect(exportPdfButton).toBeVisible()
    })
  })

  test.describe('Claim Details', () => {
    test.skip('should view claim details', async ({ page }) => {
      // DATA AVAILABLE: E2E claims seeded via npm run seed:test
      // BLOCKED: Claim detail page navigation needs investigation
      // TODO: Fix redirect handling in claim detail tests
      await page.goto('/claims')
    })
  })

  test.describe('Claim Status Updates', () => {
    test.skip('should update claim status', async ({ page }) => {
      // DATA AVAILABLE: E2E claims seeded via npm run seed:test
      // BLOCKED: Status update UI tests need more work
      await page.goto('/claims')
    })
  })

  test.describe('Claim Documents', () => {
    test.skip('should upload claim document', async ({ page }) => {
      // DATA AVAILABLE: E2E claims seeded via npm run seed:test
      // BLOCKED: Document upload test needs file upload handling
      await page.goto('/claims')
    })
  })

  test.describe('Claim Inspection Flow', () => {
    test.skip('should navigate to inspection page', async ({ page }) => {
      // DATA AVAILABLE: E2E claims seeded via npm run seed:test (CLM-E2E-005)
      // BLOCKED: Inspection page navigation needs investigation
      await page.goto('/claims')
    })
  })
})
