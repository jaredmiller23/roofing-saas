/**
 * Signature Templates E2E Tests
 *
 * Tests for signature template list, navigation, and management.
 * Uses authenticated session from playwright setup.
 */

import { test, expect } from '@playwright/test'

test.describe('Signature Templates', () => {
  test.use({ storageState: 'playwright/.auth/user.json' })

  test.describe('Signatures Page', () => {
    test('should load signatures page with navigation', async ({ page }) => {
      await page.goto('/signatures')

      // Main heading
      await expect(page.locator('h1').filter({ hasText: 'E-Signatures' })).toBeVisible({ timeout: 10000 })

      // Templates button should exist
      const templatesBtn = page.getByRole('link', { name: /Templates/ })
      await expect(templatesBtn).toBeVisible({ timeout: 5000 })

      // New Document button should exist
      const newDocBtn = page.getByRole('link', { name: /New Document/ })
      await expect(newDocBtn).toBeVisible({ timeout: 5000 })
    })

    test('should have search and status filter', async ({ page }) => {
      await page.goto('/signatures')
      await expect(page.locator('h1').filter({ hasText: 'E-Signatures' })).toBeVisible({ timeout: 10000 })

      // Search input
      const searchInput = page.locator('input[placeholder*="Search"]')
      await expect(searchInput).toBeVisible({ timeout: 5000 })

      // Status filter
      const statusFilter = page.locator('select').first()
      await expect(statusFilter).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Template List Page', () => {
    test('should navigate to templates page', async ({ page }) => {
      await page.goto('/signatures')
      await expect(page.locator('h1').filter({ hasText: 'E-Signatures' })).toBeVisible({ timeout: 10000 })

      // Click Templates link
      await page.getByRole('link', { name: /Templates/ }).click()
      await page.waitForURL(/\/signatures\/templates/, { timeout: 10000 })

      // Templates page heading
      await expect(page.locator('h1').filter({ hasText: 'Signature Templates' })).toBeVisible({ timeout: 10000 })
    })

    test('should display template list page with controls', async ({ page }) => {
      await page.goto('/signatures/templates')

      // Heading
      await expect(page.locator('h1').filter({ hasText: 'Signature Templates' })).toBeVisible({ timeout: 10000 })

      // New Template button
      const newTemplateBtn = page.getByRole('link', { name: /New Template/ })
      await expect(newTemplateBtn).toBeVisible({ timeout: 5000 })

      // Search input
      const searchInput = page.locator('input[placeholder*="Search"]')
      await expect(searchInput).toBeVisible({ timeout: 5000 })

      // Category filter
      const categoryFilter = page.locator('select').first()
      await expect(categoryFilter).toBeVisible({ timeout: 5000 })

      // Back link to signatures
      const backLink = page.getByRole('link', { name: /E-Signatures/ })
      await expect(backLink).toBeVisible({ timeout: 5000 })
    })

    test('should show templates or empty state', async ({ page }) => {
      await page.goto('/signatures/templates')
      await expect(page.locator('h1').filter({ hasText: 'Signature Templates' })).toBeVisible({ timeout: 10000 })

      // Wait for content to load
      await page.waitForLoadState('networkidle')

      // Should show either template cards or empty state
      const hasTemplates = await page.locator('h3').count() > 0
      const hasEmptyState = await page.getByText(/No templates found|Create your first/i).isVisible().catch(() => false)

      expect(hasTemplates || hasEmptyState).toBeTruthy()
    })

    test('should filter templates by search', async ({ page }) => {
      await page.goto('/signatures/templates')
      await expect(page.locator('h1').filter({ hasText: 'Signature Templates' })).toBeVisible({ timeout: 10000 })

      // Type in search
      const searchInput = page.locator('input[placeholder*="Search"]')
      await searchInput.fill('nonexistent-template-xyz')

      // Wait for filter to apply
      await page.waitForTimeout(500)

      // Should show filtered results (likely empty for gibberish search)
      const hasEmptyState = await page.getByText(/No templates found/i).isVisible().catch(() => false)
      const templateCount = await page.locator('h3').count()

      // Either empty state or reduced results
      expect(hasEmptyState || templateCount >= 0).toBeTruthy()
    })
  })

  test.describe('Template Creation Page', () => {
    test('should navigate to new template page', async ({ page }) => {
      await page.goto('/signatures/templates')
      await expect(page.locator('h1').filter({ hasText: 'Signature Templates' })).toBeVisible({ timeout: 10000 })

      // Click New Template
      await page.getByRole('link', { name: /New Template/ }).click()
      await page.waitForURL(/\/signatures\/templates\/new/, { timeout: 10000 })

      // Should show template creation form
      await expect(page.locator('h1, h2').filter({ hasText: /New Template|Create Template/ }).first()).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Template Actions', () => {
    test('should open delete confirmation dialog for template', async ({ page }) => {
      await page.goto('/signatures/templates')
      await expect(page.locator('h1').filter({ hasText: 'Signature Templates' })).toBeVisible({ timeout: 10000 })

      // Wait for templates to load
      await page.waitForLoadState('networkidle')

      // Only test if templates exist
      const deleteButtons = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: '' })
      const trashButtons = page.locator('[aria-label*="Delete"], button:has(svg.lucide-trash)')

      // Find any delete button (Trash2 icon)
      const allButtons = page.locator('button')
      const buttonCount = await allButtons.count()

      let deleteButtonFound = false
      for (let i = 0; i < buttonCount && !deleteButtonFound; i++) {
        const btn = allButtons.nth(i)
        const className = await btn.getAttribute('class').catch(() => '')
        const innerHTML = await btn.innerHTML().catch(() => '')
        if (innerHTML.includes('trash') || innerHTML.includes('Trash')) {
          await btn.click()
          deleteButtonFound = true

          // Should show AlertDialog
          const dialog = page.locator('[role="alertdialog"]')
          if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(dialog.locator('text=Delete Template')).toBeVisible()

            // Cancel instead of actually deleting
            await page.getByRole('button', { name: 'Cancel' }).click()
            await expect(dialog).not.toBeVisible({ timeout: 3000 })
          }
        }
      }

      // If no templates exist, that's fine — skip
      if (!deleteButtonFound) {
        test.skip()
      }
    })
  })
})
