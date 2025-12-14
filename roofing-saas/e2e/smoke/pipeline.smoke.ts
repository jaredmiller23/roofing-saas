/**
 * Pipeline/Projects Module - Smoke Tests
 *
 * SMOKE-003: Verify pipeline and project management work on production
 * Pipeline is core to sales workflow - must show all 8 stages correctly
 *
 * Success Criteria:
 * - Pipeline page loads with all 8 stages visible
 * - Kanban board renders correctly
 * - Table view toggle works
 * - Quick filter chips (All, Active, Production, Closed) work
 * - Pipeline value statistics are displayed
 * - Clicking project card opens detail page
 * - Project detail tabs (Overview, Claims, Costing) load
 * - Mark Lost / Reactivate buttons are visible and functional
 * - /pipeline redirects to /projects
 */

import { test, expect } from '@playwright/test'

test.describe('Pipeline Module - Smoke Tests', () => {

  test.describe('Unauthenticated Access', () => {
    // Use empty storage state to test without authentication
    test.use({ storageState: { cookies: [], origins: [] } })

    test('should redirect /pipeline to login via /projects', async ({ page }) => {
      // Test the legacy /pipeline URL redirect chain
      await page.goto('/pipeline')

      // Should eventually end up at login (via /projects redirect)
      await expect(page).toHaveURL(/\/login/)

      // Verify login page rendered properly
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
    })

    test('should redirect /projects to login when unauthenticated', async ({ page }) => {
      await page.goto('/projects')

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Authenticated Pipeline Access', () => {
    // Uses default authenticated storage state

    test('should load pipeline page at /projects', async ({ page }) => {
      await page.goto('/projects')

      // Should stay on projects page (not redirect to login)
      await expect(page).toHaveURL(/\/projects/)

      // Should show the pipeline header
      await expect(page.getByRole('heading', { name: 'Pipeline' })).toBeVisible()
    })

    test('should redirect /pipeline to /projects when authenticated', async ({ page }) => {
      await page.goto('/pipeline')

      // Should end up at /projects (not login) when authenticated
      await expect(page).toHaveURL(/\/projects/)

      // Pipeline content should be visible
      await expect(page.getByRole('heading', { name: 'Pipeline' })).toBeVisible()
    })

    test('should display all 8 pipeline stages in kanban view', async ({ page }) => {
      await page.goto('/projects')

      // Wait for kanban view to load
      await expect(page.getByTestId('kanban-view')).toBeVisible()

      // Expected 8 pipeline stages
      const expectedStages = [
        'Prospect',
        'Qualified',
        'Quote Sent',
        'Negotiation',
        'Won',
        'Production',
        'Complete',
        'Lost'
      ]

      // Each stage should be visible as a column header
      for (const stage of expectedStages) {
        await expect(page.getByRole('heading', { name: stage, level: 3 }).first()).toBeVisible()
      }
    })

    test('should render kanban board correctly', async ({ page }) => {
      await page.goto('/projects')

      // Kanban view should be visible by default
      await expect(page.getByTestId('kanban-view')).toBeVisible()

      // Should not show table view
      await expect(page.getByTestId('table-view')).not.toBeVisible()
    })

    test('should toggle between kanban and table views', async ({ page }) => {
      await page.goto('/projects')

      // Should start in kanban view
      await expect(page.getByTestId('kanban-view')).toBeVisible()

      // Click table view button
      await page.getByTestId('table-view-button').click()

      // Should show table view
      await expect(page.getByTestId('table-view')).toBeVisible()
      await expect(page.getByTestId('kanban-view')).not.toBeVisible()

      // Click kanban view button to switch back
      await page.getByTestId('kanban-view-button').click()

      // Should show kanban view again
      await expect(page.getByTestId('kanban-view')).toBeVisible()
      await expect(page.getByTestId('table-view')).not.toBeVisible()
    })

    test('should display quick filter chips', async ({ page }) => {
      await page.goto('/projects')

      // Wait for kanban view to load
      await expect(page.getByTestId('kanban-view')).toBeVisible()

      // Check for filter buttons: All, Active Sales, In Production, Closed
      await expect(page.getByRole('button', { name: /All/ })).toBeVisible()
      await expect(page.getByRole('button', { name: /Active Sales/ })).toBeVisible()
      await expect(page.getByRole('button', { name: /In Production/ })).toBeVisible()
      await expect(page.getByRole('button', { name: /Closed/ })).toBeVisible()
    })

    test('should test quick filter functionality', async ({ page }) => {
      await page.goto('/projects')

      // Wait for kanban view to load
      await expect(page.getByTestId('kanban-view')).toBeVisible()

      // Click on Active Sales filter
      await page.getByRole('button', { name: /Active Sales/ }).click()

      // Reset button should appear when filters are active
      await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible()

      // Click reset to clear filters
      await page.getByRole('button', { name: 'Reset' }).click()
    })

    test('should display pipeline value statistics', async ({ page }) => {
      await page.goto('/projects')

      // Wait for kanban view to load
      await expect(page.getByTestId('kanban-view')).toBeVisible()

      // Should show total opportunities count
      await expect(page.getByText(/Total: \d+ opportunities/)).toBeVisible()

      // Should show pipeline value
      await expect(page.getByText(/Pipeline Value:/)).toBeVisible()
    })

    test('should open project detail page when clicking project card', async ({ page }) => {
      await page.goto('/projects')

      // Wait for kanban view to load
      await expect(page.getByTestId('kanban-view')).toBeVisible()

      // Try to find a project card to click
      const projectCard = page.locator('[data-testid*="project-card"]').first()

      // Only test if a project card exists
      if (await projectCard.count() > 0) {
        await projectCard.click()

        // Should navigate to a project detail page
        await expect(page).toHaveURL(/\/projects\/[^\/]+/)

        // Should show project detail content
        await expect(page.getByTestId('project-detail-page')).toBeVisible()
      }
    })

    test('should display project detail tabs when on project page', async ({ page }) => {
      // Navigate to projects first
      await page.goto('/projects')
      await expect(page.getByTestId('kanban-view')).toBeVisible()

      // Find and click a project card if one exists
      const projectCard = page.locator('[data-testid*="project-card"]').first()

      if (await projectCard.count() > 0) {
        await projectCard.click()

        // Wait for project detail page
        await expect(page.getByTestId('project-detail-page')).toBeVisible()

        // Check for tabs: Overview, Claims, Costing
        await expect(page.getByRole('tab', { name: /Overview/ })).toBeVisible()
        await expect(page.getByRole('tab', { name: /Claims/ })).toBeVisible()
        await expect(page.getByRole('tab', { name: /Costing/ })).toBeVisible()
      }
    })

    test('should display Mark Lost and Reactivate buttons in project detail', async ({ page }) => {
      // Navigate to projects first
      await page.goto('/projects')
      await expect(page.getByTestId('kanban-view')).toBeVisible()

      // Find and click a project card if one exists
      const projectCard = page.locator('[data-testid*="project-card"]').first()

      if (await projectCard.count() > 0) {
        await projectCard.click()

        // Wait for project detail page
        await expect(page.getByTestId('project-detail-page')).toBeVisible()

        // Should have action buttons visible (Mark Lost or Reactivate depending on project state)
        const markLostButton = page.getByRole('button', { name: /Mark Lost/ })
        const reactivateButton = page.getByRole('button', { name: /Reactivate/ })

        // At least one of these buttons should be visible
        const hasMarkLost = await markLostButton.isVisible()
        const hasReactivate = await reactivateButton.isVisible()

        expect(hasMarkLost || hasReactivate).toBeTruthy()
      }
    })

    test('should handle Mark Lost button functionality', async ({ page }) => {
      // Navigate to projects first
      await page.goto('/projects')
      await expect(page.getByTestId('kanban-view')).toBeVisible()

      // Find and click a project card if one exists
      const projectCard = page.locator('[data-testid*="project-card"]').first()

      if (await projectCard.count() > 0) {
        await projectCard.click()

        // Wait for project detail page
        await expect(page.getByTestId('project-detail-page')).toBeVisible()

        // Check if Mark Lost button is available and functional
        const markLostButton = page.getByRole('button', { name: /Mark Lost/ })

        if (await markLostButton.isVisible()) {
          // Click the Mark Lost button
          await markLostButton.click()

          // Should show confirmation dialog or immediate state change
          // Check for either a confirmation modal or status update
          const hasModal = await page.locator('[role="dialog"]').isVisible()
          const hasStatusUpdate = await page.getByText(/Lost|Marked as Lost/i).isVisible()

          expect(hasModal || hasStatusUpdate).toBeTruthy()
        }
      }
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Set up console error listener
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      // Navigate to projects
      const response = await page.goto('/projects', { waitUntil: 'networkidle' })

      // Check HTTP response is not server error
      expect(response?.status()).not.toBe(500)
      expect(response?.status()).toBeLessThan(500)

      // Page should load without critical errors
      await expect(page).toHaveURL(/\/projects/)

      // Filter out expected/harmless errors (like Sentry transport warnings)
      const criticalErrors = errors.filter(e =>
        !e.includes('Sentry') &&
        !e.includes('Transport disabled') &&
        !e.includes('favicon')
      )

      expect(criticalErrors.length).toBe(0)
    })

    test('should display appropriate message when no projects exist', async ({ page }) => {
      await page.goto('/projects')

      // Wait for kanban view to load
      await expect(page.getByTestId('kanban-view')).toBeVisible()

      // Should handle empty state gracefully
      // Either show projects or an appropriate empty state message
      const hasProjects = await page.locator('[data-testid*="project-card"]').count() > 0
      const hasEmptyState = await page.getByText(/No projects|No opportunities|Get started/i).isVisible()

      // Should show either projects or a proper empty state
      expect(hasProjects || hasEmptyState).toBeTruthy()
    })
  })
})
