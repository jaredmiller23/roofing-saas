import { test, expect } from '@playwright/test'

/**
 * Workflow Automation E2E Tests
 *
 * Tests the workflow automation system in Settings > Automations
 * Verifies template creation, workflow toggling, and deletion
 */

/**
 * Tests for UNAUTHENTICATED users
 */
test.describe('Workflow Automations - Unauthenticated', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('should redirect to login when accessing settings without auth', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/login/)
  })
})

/**
 * Tests for AUTHENTICATED users
 */
test.describe('Workflow Automations - Authenticated', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Settings page
    await page.goto('/settings')

    // Click on Automations tab
    await page.getByRole('tab', { name: /Automations/ }).click()

    // Wait for the automations content to load
    await expect(page.getByText('Workflow Automations')).toBeVisible()
  })

  test('should display the Automations tab in Settings', async ({ page }) => {
    // Verify the Automations tab is visible and clickable
    const automationsTab = page.getByRole('tab', { name: /Automations/ })
    await expect(automationsTab).toBeVisible()
  })

  test('should show Quick Start Templates section', async ({ page }) => {
    // Verify Quick Start Templates header
    await expect(page.getByText('Quick Start Templates')).toBeVisible()
    await expect(page.getByText('One-click setup for common automations')).toBeVisible()
  })

  test('should display all workflow templates', async ({ page }) => {
    // Expected templates
    const templates = [
      'Project Won Notification',
      'Create Production Task on Win',
      'Post-Job Survey',
      'Job Completion Follow-up Task',
      'Stage Change SMS Alert'
    ]

    for (const template of templates) {
      await expect(page.getByText(template).first()).toBeVisible()
    }
  })

  test('should show trigger badges on templates', async ({ page }) => {
    // Verify trigger badges are displayed
    await expect(page.getByText('Project Won').first()).toBeVisible()
    await expect(page.getByText('Job Completed').first()).toBeVisible()
    await expect(page.getByText('Stage Changed').first()).toBeVisible()
  })

  test('should show Your Automations section', async ({ page }) => {
    // Verify Your Automations section exists
    await expect(page.getByText('Your Automations')).toBeVisible()

    // Should show count of configured workflows
    await expect(page.getByText(/workflow[s]? configured/)).toBeVisible()
  })

  test('should show How It Works section', async ({ page }) => {
    // Verify the How It Works educational section
    await expect(page.getByText('How Automations Work')).toBeVisible()
    await expect(page.getByText('Trigger Event')).toBeVisible()
    await expect(page.getByText('Workflow Runs')).toBeVisible()
    await expect(page.getByText('Action Complete')).toBeVisible()
  })

  test('should have Add Automation buttons on templates', async ({ page }) => {
    // Each template should have an "Add Automation" or "Already Added" button
    const addButtons = page.getByRole('button', { name: /Add Automation|Already Added/ })
    await expect(addButtons.first()).toBeVisible()
  })
})

/**
 * Workflow CRUD Operations Tests
 * These tests create, toggle, and delete workflows
 */
test.describe('Workflow CRUD Operations', () => {
  test('should create workflow from template', async ({ page }) => {
    // Navigate to Settings > Automations
    await page.goto('/settings')
    await page.getByRole('tab', { name: /Automations/ }).click()
    await expect(page.getByText('Workflow Automations')).toBeVisible()

    // Find a template that hasn't been created yet (look for "Add Automation" button)
    const addButton = page.getByRole('button', { name: 'Add Automation' }).first()

    // Check if there's an available template to add
    const isAddButtonVisible = await addButton.isVisible().catch(() => false)

    if (isAddButtonVisible) {
      // Click to create workflow
      await addButton.click()

      // Wait for API call and UI update
      await page.waitForResponse(resp =>
        resp.url().includes('/api/workflows') && resp.status() === 200
      )

      // The button should change to "Already Added"
      await expect(page.getByRole('button', { name: /Already Added/ }).first()).toBeVisible()

      // Workflow should appear in "Your Automations" section
      const workflowCount = page.getByText(/\d+ workflow[s]? configured/)
      await expect(workflowCount).toBeVisible()
    } else {
      // All templates already added, verify at least one workflow exists
      await expect(page.getByText(/\d+ workflow[s]? configured/)).toBeVisible()
    }
  })

  test('should toggle workflow active state', async ({ page }) => {
    // Navigate to Settings > Automations
    await page.goto('/settings')
    await page.getByRole('tab', { name: /Automations/ }).click()
    await expect(page.getByText('Workflow Automations')).toBeVisible()

    // Wait for workflows to load
    await page.waitForTimeout(1000)

    // Find a workflow toggle switch
    const switches = page.locator('[role="switch"]')
    const switchCount = await switches.count()

    if (switchCount > 0) {
      const firstSwitch = switches.first()
      const initialState = await firstSwitch.getAttribute('data-state')

      // Toggle the switch
      await firstSwitch.click()

      // Wait for API response
      await page.waitForResponse(resp =>
        resp.url().includes('/api/workflows/') && resp.request().method() === 'PATCH'
      )

      // Switch state should change
      const newState = await firstSwitch.getAttribute('data-state')
      expect(newState).not.toBe(initialState)

      // Toggle back to original state
      await firstSwitch.click()
      await page.waitForResponse(resp =>
        resp.url().includes('/api/workflows/') && resp.request().method() === 'PATCH'
      )
    } else {
      // No workflows exist, skip this test
      test.skip()
    }
  })

  test('should show active/paused status indicators', async ({ page }) => {
    // Navigate to Settings > Automations
    await page.goto('/settings')
    await page.getByRole('tab', { name: /Automations/ }).click()
    await expect(page.getByText('Workflow Automations')).toBeVisible()

    // Wait for workflows to load
    await page.waitForTimeout(1000)

    // Check for active or paused indicators
    const hasActiveIndicator = await page.getByText('Active').first().isVisible().catch(() => false)
    const hasPausedIndicator = await page.getByText('Paused').first().isVisible().catch(() => false)

    // At least one status indicator should be visible if workflows exist
    const workflowCountText = await page.getByText(/\d+ workflow[s]? configured/).textContent()
    const workflowCount = parseInt(workflowCountText?.match(/\d+/)?.[0] || '0')

    if (workflowCount > 0) {
      expect(hasActiveIndicator || hasPausedIndicator).toBe(true)
    }
  })
})

/**
 * Smoke tests for Settings page stability
 */
test.describe('Settings Automations - Smoke Tests', () => {
  test('should load settings page without 500 errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    const response = await page.goto('/settings', { waitUntil: 'networkidle' })

    expect(response?.status()).not.toBe(500)
    expect(response?.status()).toBeLessThan(500)

    // Should stay on settings page
    await expect(page).toHaveURL(/\/settings/)
  })

  test('should switch to Automations tab without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/settings')

    // Click Automations tab
    await page.getByRole('tab', { name: /Automations/ }).click()

    // Content should load
    await expect(page.getByText('Workflow Automations')).toBeVisible()

    // Filter out non-critical errors
    const criticalErrors = errors.filter(e =>
      !e.includes('Sentry') &&
      !e.includes('Transport disabled') &&
      !e.includes('hydration')
    )

    expect(criticalErrors.length).toBe(0)
  })

  test('should handle API calls gracefully', async ({ page }) => {
    await page.goto('/settings')
    await page.getByRole('tab', { name: /Automations/ }).click()

    // Wait for workflows API call
    const response = await page.waitForResponse(
      resp => resp.url().includes('/api/workflows') && resp.request().method() === 'GET',
      { timeout: 10000 }
    ).catch(() => null)

    // API should respond successfully
    if (response) {
      expect(response.status()).toBeLessThan(500)
    }

    // UI should render regardless of API response
    await expect(page.getByText('Quick Start Templates')).toBeVisible()
  })
})
