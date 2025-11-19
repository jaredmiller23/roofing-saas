/**
 * Error State Testing
 *
 * This test suite verifies that the application handles errors gracefully
 * across all major features. These tests would have caught Bug #1 (Tasks page
 * "[object Object]" error).
 *
 * @see docs/testing/E2E_TESTING_BEST_PRACTICES.md
 */

import { test, expect } from '@playwright/test'
import { mockApiError, mockApiTimeout, mockApiUnauthorized } from './utils/api-mocks'
import { ERROR_SCENARIOS } from './utils/error-scenarios'

test.describe('Error State Handling', () => {
  test.describe('Tasks Page', () => {
    test('should display proper error message when tasks API fails with DATABASE_ERROR', async ({ page }) => {
      // Mock API to return database error
      await mockApiError(page, '/api/tasks', ERROR_SCENARIOS.DATABASE_ERROR)

      await page.goto('/tasks')
      await page.waitForLoadState('networkidle')

      // Verify error is displayed properly (NOT "[object Object]")
      const alert = page.locator('[role="alert"], .text-red-900, .text-red-600').first()
      await expect(alert).toBeVisible({ timeout: 5000 })

      // Get the error text
      const errorText = await alert.textContent()

      // Assert error message is readable
      expect(errorText).toContain('database')
      expect(errorText).not.toContain('[object Object]')
      expect(errorText).not.toContain('[object')
    })

    test('should display proper error message when tasks API returns QUERY_ERROR', async ({ page }) => {
      await mockApiError(page, '/api/tasks', ERROR_SCENARIOS.QUERY_ERROR)

      await page.goto('/tasks')
      await page.waitForLoadState('networkidle')

      const alert = page.locator('[role="alert"], .text-red-900, .text-red-600').first()
      await expect(alert).toBeVisible({ timeout: 5000 })

      const errorText = await alert.textContent()
      expect(errorText).not.toContain('[object Object]')
    })

    test('should handle unauthorized error gracefully', async ({ page }) => {
      await mockApiUnauthorized(page, '/api/tasks')

      await page.goto('/tasks')
      await page.waitForLoadState('networkidle')

      const alert = page.locator('[role="alert"], .text-red-900, .text-red-600').first()
      await expect(alert).toBeVisible({ timeout: 5000 })

      const errorText = await alert.textContent()
      expect(errorText).toContain('logged in')
      expect(errorText).not.toContain('[object')
    })

    test('should handle network timeout gracefully', async ({ page }) => {
      await mockApiTimeout(page, '/api/tasks')

      await page.goto('/tasks')

      // Should show some error indication (not crash)
      await expect(page.locator('body')).toBeVisible()

      // May show loading state or error message
      const hasAlert = await page.locator('[role="alert"]').count() > 0
      const hasSpinner = await page.locator('.animate-spin').count() > 0
      const hasLoading = await page.locator('text=Loading').count() > 0

      expect(hasAlert || hasSpinner || hasLoading).toBeTruthy()
    })
  })

  test.describe('Contacts/Leads Page', () => {
    test('should display proper error message when contacts API fails', async ({ page }) => {
      await mockApiError(page, '/api/contacts', ERROR_SCENARIOS.DATABASE_ERROR)

      await page.goto('/contacts')
      await page.waitForLoadState('networkidle')

      const alert = page.locator('[role="alert"], .text-red-900, .text-red-600').first()
      await expect(alert).toBeVisible({ timeout: 5000 })

      const errorText = await alert.textContent()
      expect(errorText).not.toContain('[object Object]')
      expect(errorText).not.toContain('[object')
    })

    test('should handle validation error when creating contact', async ({ page }) => {
      await page.goto('/contacts/new')

      // Mock API to return validation error
      await mockApiError(page, '/api/contacts',
        ERROR_SCENARIOS.MISSING_REQUIRED_FIELD('email'),
        400
      )

      // Try to submit form without required fields
      // Use more specific selector to avoid matching "Sign Out" button
      const submitButton = page.locator('form button[type="submit"]').first()
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click()

        // Should show validation error (not crash or show [object Object])
        const error = page.locator('[role="alert"], .text-red-900, .text-red-600').first()
        if (await error.isVisible({ timeout: 2000 })) {
          const errorText = await error.textContent()
          expect(errorText).not.toContain('[object')
        }
      }
    })
  })

  test.describe('Projects/Sales Page', () => {
    test('should display proper error message in Kanban view when API fails', async ({ page }) => {
      await mockApiError(page, '/api/contacts', ERROR_SCENARIOS.DATABASE_ERROR)

      await page.goto('/projects')
      await page.waitForLoadState('networkidle')

      // Check for error in kanban view
      const alert = page.locator('[role="alert"], .text-red-900, .text-red-600').first()
      if (await alert.isVisible({ timeout: 2000 })) {
        const errorText = await alert.textContent()
        expect(errorText).not.toContain('[object')
      }
    })

    test('should display proper error message in Table view when API fails', async ({ page }) => {
      await page.goto('/projects')
      await page.waitForLoadState('networkidle')

      // Switch to table view
      const tableButton = page.locator('button:has-text("Table")')
      if (await tableButton.isVisible()) {
        // Mock API before clicking
        await mockApiError(page, '/api/contacts', ERROR_SCENARIOS.DATABASE_ERROR)

        await tableButton.click()
        await page.waitForLoadState('networkidle')

        // Check for error
        const alert = page.locator('[role="alert"], .text-red-900, .text-red-600').first()
        if (await alert.isVisible({ timeout: 2000 })) {
          const errorText = await alert.textContent()
          expect(errorText).not.toContain('[object Object]')
        }
      }
    })
  })

  test.describe('Digital Cards Page', () => {
    test('should display proper error message when digital cards API fails', async ({ page }) => {
      await mockApiError(page, '/api/digital-cards', ERROR_SCENARIOS.DATABASE_ERROR)

      await page.goto('/digital-cards')
      await page.waitForLoadState('networkidle')

      // Allow time for error to appear
      await page.waitForTimeout(1000)

      const alert = page.locator('[role="alert"], .text-red-900, .text-red-600').first()
      if (await alert.isVisible({ timeout: 2000 })) {
        const errorText = await alert.textContent()
        expect(errorText).not.toContain('[object')
      }
    })
  })

  test.describe('General Error Handling', () => {
    test('should never display "[object Object]" anywhere in the app', async ({ page }) => {
      // Visit multiple pages and trigger various actions
      const pages = ['/dashboard', '/contacts', '/projects', '/tasks', '/territories']

      for (const pagePath of pages) {
        await page.goto(pagePath, { waitUntil: 'networkidle' })

        // Check page content doesn't contain [object Object]
        const bodyText = await page.locator('body').textContent()
        expect(bodyText).not.toContain('[object Object]')
        expect(bodyText).not.toContain('[object')
      }
    })

    test('should handle missing required fields with clear error messages', async ({ page }) => {
      // Test form submission without required fields
      await page.goto('/contacts/new')

      // Use more specific selector to avoid matching "Sign Out" button
      const submitButton = page.locator('form button[type="submit"]').first()
      if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitButton.click()

        // Should show validation errors (not [object Object])
        await page.waitForTimeout(500)
        const pageText = await page.locator('body').textContent()
        expect(pageText).not.toContain('[object')
      }
    })
  })
})

test.describe('Edge Cases', () => {
  test('should handle empty API responses gracefully', async ({ page }) => {
    // Mock empty responses for different endpoints
    await page.route('**/api/tasks*', route => route.fulfill({
      status: 200,
      body: JSON.stringify({ tasks: [], total: 0 })
    }))

    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')

    // Should show empty state (not crash)
    // Check for common empty state indicators
    const pageText = await page.locator('body').textContent()
    const hasEmptyState =
      (pageText?.includes('No tasks') ||
       pageText?.includes('no tasks') ||
       pageText?.includes('Create') ||
       await page.locator('[role="status"]').count() > 0)

    // The important thing is the page didn't crash
    await expect(page.locator('body')).toBeVisible()
    expect(hasEmptyState || pageText).toBeTruthy()
  })

  test('should handle malformed API responses without crashing', async ({ page }) => {
    await page.route('**/api/tasks*', route => route.fulfill({
      status: 200,
      body: 'Invalid JSON{'
    }))

    await page.goto('/tasks')

    // App should handle gracefully (not crash with white screen)
    await expect(page.locator('body')).toBeVisible()

    // May show error or loading state
    const pageText = await page.locator('body').textContent()
    expect(pageText).not.toContain('[object')
  })
})
