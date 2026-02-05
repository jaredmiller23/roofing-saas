/**
 * Signatures E2E Tests
 *
 * Tests for signature document management and templates.
 * Covers: list page, search/filter, document actions, templates page.
 */

import { test, expect } from '@playwright/test'

test.describe('Signatures Management', () => {
  test.use({ storageState: 'playwright/.auth/user.json' })

  test.describe('Signatures List Page', () => {
    test('should load signatures page with header and action buttons', async ({ page }) => {
      await page.goto('/signatures')

      await expect(page.locator('h1:has-text("E-Signatures")')).toBeVisible({ timeout: 10000 })

      // Action buttons
      await expect(page.getByRole('button', { name: /New Document/ })).toBeVisible()
      await expect(page.getByRole('button', { name: /Templates/ })).toBeVisible()
    })

    test('should have search and status filter', async ({ page }) => {
      await page.goto('/signatures')
      await expect(page.locator('h1:has-text("E-Signatures")')).toBeVisible({ timeout: 10000 })

      // Search input
      const searchInput = page.locator('input[placeholder="Search documents..."]')
      await expect(searchInput).toBeVisible()
      await searchInput.fill('test query')
      await expect(searchInput).toHaveValue('test query')

      // Status filter dropdown
      const statusFilter = page.locator('select').first()
      await expect(statusFilter).toBeVisible()
      await statusFilter.selectOption('draft')
      await expect(statusFilter).toHaveValue('draft')
    })

    test('should display documents or empty state', async ({ page }) => {
      await page.goto('/signatures')
      await expect(page.locator('h1:has-text("E-Signatures")')).toBeVisible({ timeout: 10000 })

      // Wait for loading to complete
      await page.waitForLoadState('networkidle')

      // Should show either document cards or empty state
      const hasDocuments = await page.locator('.space-y-4 .bg-card').count() > 0
      const hasEmptyState = await page.getByText('No documents found').isVisible().catch(() => false)

      expect(hasDocuments || hasEmptyState).toBeTruthy()
    })
  })

  test.describe('Signature Document Actions', () => {
    test('should navigate to document detail by clicking title', async ({ page }) => {
      await page.goto('/signatures')
      await expect(page.locator('h1:has-text("E-Signatures")')).toBeVisible({ timeout: 10000 })
      await page.waitForLoadState('networkidle')

      // Find a document title (h3 inside document cards)
      const docTitle = page.locator('h3.text-lg.font-semibold.text-foreground.cursor-pointer').first()

      if (await docTitle.isVisible().catch(() => false)) {
        await docTitle.click()
        await expect(page).toHaveURL(/\/signatures\/[a-f0-9-]{36}$/, { timeout: 10000 })
      }
    })

    test('should open edit dialog from actions dropdown', async ({ page }) => {
      await page.goto('/signatures')
      await expect(page.locator('h1:has-text("E-Signatures")')).toBeVisible({ timeout: 10000 })
      await page.waitForLoadState('networkidle')

      // Find the first actions dropdown (MoreVertical button with sr-only "Actions" text)
      const actionsButton = page.getByRole('button', { name: 'Actions' }).first()

      if (await actionsButton.isVisible().catch(() => false)) {
        await actionsButton.click()

        // Look for Edit menu item
        const editItem = page.getByRole('menuitem', { name: 'Edit' })
        if (await editItem.isVisible().catch(() => false)) {
          await editItem.click()

          // Verify edit dialog appears
          await expect(page.getByText('Edit Document')).toBeVisible({ timeout: 5000 })
          await expect(page.locator('#edit-title')).toBeVisible()
          await expect(page.locator('#edit-description')).toBeVisible()

          // Close dialog
          await page.getByRole('button', { name: 'Cancel' }).click()
        }
      }
    })

    test('should open delete confirmation from actions dropdown', async ({ page }) => {
      await page.goto('/signatures')
      await expect(page.locator('h1:has-text("E-Signatures")')).toBeVisible({ timeout: 10000 })
      await page.waitForLoadState('networkidle')

      const actionsButton = page.getByRole('button', { name: 'Actions' }).first()

      if (await actionsButton.isVisible().catch(() => false)) {
        await actionsButton.click()

        const deleteItem = page.getByRole('menuitem', { name: 'Delete' })
        if (await deleteItem.isVisible().catch(() => false)) {
          await deleteItem.click()

          // Verify delete confirmation dialog
          await expect(page.getByText('Delete Document')).toBeVisible({ timeout: 5000 })
          await expect(page.getByText('This action cannot be undone')).toBeVisible()

          // Cancel to avoid actual deletion
          await page.getByRole('button', { name: 'Cancel' }).click()
        }
      }
    })
  })

  test.describe('Signature Templates Page', () => {
    test('should navigate to templates page', async ({ page }) => {
      await page.goto('/signatures')
      await expect(page.locator('h1:has-text("E-Signatures")')).toBeVisible({ timeout: 10000 })

      await page.getByRole('button', { name: /Templates/ }).click()
      await expect(page).toHaveURL(/\/signatures\/templates/)
      await expect(page.locator('h1:has-text("Signature Templates")')).toBeVisible({ timeout: 10000 })
    })

    test('should display templates or empty state', async ({ page }) => {
      await page.goto('/signatures/templates')
      await expect(page.locator('h1:has-text("Signature Templates")')).toBeVisible({ timeout: 10000 })
      await page.waitForLoadState('networkidle')

      const hasTemplates = await page.locator('.bg-card.rounded-lg.shadow-sm.border').count() > 0
      const hasEmptyState = await page.getByText('No templates found').isVisible().catch(() => false)

      expect(hasTemplates || hasEmptyState).toBeTruthy()
    })

    test('should have New Template button', async ({ page }) => {
      await page.goto('/signatures/templates')
      await expect(page.locator('h1:has-text("Signature Templates")')).toBeVisible({ timeout: 10000 })

      await expect(page.getByRole('button', { name: /New Template/ })).toBeVisible()
    })

    test('should have search and category filter', async ({ page }) => {
      await page.goto('/signatures/templates')
      await expect(page.locator('h1:has-text("Signature Templates")')).toBeVisible({ timeout: 10000 })

      const searchInput = page.locator('input[placeholder="Search templates..."]')
      await expect(searchInput).toBeVisible()

      const categoryFilter = page.locator('select').first()
      await expect(categoryFilter).toBeVisible()
      await categoryFilter.selectOption('contracts')
      await expect(categoryFilter).toHaveValue('contracts')
    })
  })
})
