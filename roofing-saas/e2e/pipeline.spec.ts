import { test, expect } from '@playwright/test'

/**
 * Pipeline Page E2E Tests
 *
 * These tests verify the pipeline kanban board functionality at /projects
 * (Note: /pipeline redirects to /projects)
 *
 * Current Pipeline Stages (8 total):
 * - Prospect
 * - Qualified
 * - Quote Sent
 * - Negotiation
 * - Won
 * - Production
 * - Complete
 * - Lost
 */

/**
 * Tests for UNAUTHENTICATED users
 * These tests use empty storage state to bypass the default auth
 */
test.describe('Pipeline Page - Unauthenticated', () => {
  // Use empty storage state to test without authentication
  test.use({ storageState: { cookies: [], origins: [] } })

  test('should redirect to login when not authenticated', async ({ page }) => {
    // Go to projects page (where pipeline lives)
    await page.goto('/projects')

    // Should redirect to login page when not authenticated
    await expect(page).toHaveURL(/\/login/)
  })

  test('should redirect /pipeline to /projects then to login', async ({ page }) => {
    // Test the legacy /pipeline URL still works (redirects to /projects)
    await page.goto('/pipeline')

    // Should eventually end up at login (via /projects redirect)
    await expect(page).toHaveURL(/\/login/)
  })
})

/**
 * Tests for AUTHENTICATED users
 * These tests use the default authenticated state from playwright.config.ts
 */
test.describe('Pipeline Page - Authenticated', () => {
  test('should load pipeline page when authenticated', async ({ page }) => {
    await page.goto('/projects')

    // Should stay on projects page (not redirect to login)
    await expect(page).toHaveURL(/\/projects/)

    // Should show the pipeline header
    await expect(page.getByRole('heading', { name: 'Pipeline' })).toBeVisible()
  })

  test('should display all 8 pipeline stages', async ({ page }) => {
    await page.goto('/projects')

    // Wait for the kanban view to load
    await expect(page.getByTestId('kanban-view')).toBeVisible()

    // Expected stages (8 total)
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

  test('should show pipeline value statistics', async ({ page }) => {
    await page.goto('/projects')

    // Wait for the kanban view to load
    await expect(page.getByTestId('kanban-view')).toBeVisible()

    // Should show total opportunities count
    await expect(page.getByText(/Total: \d+ opportunities/)).toBeVisible()

    // Should show pipeline value
    await expect(page.getByText(/Pipeline Value:/)).toBeVisible()
  })

  test('should support quick filter chips', async ({ page }) => {
    await page.goto('/projects')

    // Wait for the kanban view to load
    await expect(page.getByTestId('kanban-view')).toBeVisible()

    // Check for filter buttons: All, Active Sales, In Production, Closed
    await expect(page.getByRole('button', { name: /All/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Active Sales/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /In Production/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Closed/ })).toBeVisible()
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

    // Click kanban view button
    await page.getByTestId('kanban-view-button').click()

    // Should show kanban view again
    await expect(page.getByTestId('kanban-view')).toBeVisible()
    await expect(page.getByTestId('table-view')).not.toBeVisible()
  })

  test('should have working search input', async ({ page }) => {
    await page.goto('/projects')

    // Wait for the kanban view to load
    await expect(page.getByTestId('kanban-view')).toBeVisible()

    // Find and interact with search input
    const searchInput = page.getByPlaceholder(/Search opportunities/)
    await expect(searchInput).toBeVisible()

    // Type in search box
    await searchInput.fill('test search')
    await expect(searchInput).toHaveValue('test search')
  })

  test('should allow toggling individual pipeline stages', async ({ page }) => {
    await page.goto('/projects')

    // Wait for the kanban view to load
    await expect(page.getByTestId('kanban-view')).toBeVisible()

    // Find a stage toggle button (e.g., "Lost")
    const lostButton = page.locator('button').filter({ hasText: 'Lost' }).first()
    await expect(lostButton).toBeVisible()

    // Click to toggle (should filter the view)
    await lostButton.click()

    // The button should change appearance (this is a toggle)
    // Reset button should appear when filters are active
    await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible()
  })
})

/**
 * Smoke tests - verify pages load without errors
 * Split by authentication state for proper testing
 */
test.describe('Pipeline Page - Smoke Tests (Unauthenticated)', () => {
  // Use empty storage state to test without authentication
  test.use({ storageState: { cookies: [], origins: [] } })

  test('should not show 500 Internal Server Error', async ({ page }) => {
    // Set up console error listener
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Navigate to projects - will redirect to login for unauthenticated users
    const response = await page.goto('/projects', { waitUntil: 'networkidle' })

    // Check HTTP response
    expect(response?.status()).not.toBe(500)
    expect(response?.status()).toBeLessThan(500)

    // Wait for page to fully render
    await page.waitForLoadState('domcontentloaded')

    // Check page title
    const title = await page.title()
    expect(title).not.toMatch(/error|500|internal server error/i)

    // Should redirect to login page
    const url = page.url()
    expect(url).toContain('/login')

    // Verify login page rendered (should have form inputs)
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()

    // No JavaScript errors should have been thrown
    expect(errors.length).toBe(0)
  })

  test('should render login page without errors', async ({ page }) => {
    const response = await page.goto('/login', { waitUntil: 'networkidle' })

    // Should return 200, not 500
    expect(response?.status()).toBe(200)

    // Wait for form to render
    await page.waitForSelector('form')

    // Login form should have email and password fields
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    const submitButton = page.locator('button[type="submit"]')

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(submitButton).toBeVisible()
  })

  test('should handle /pipeline redirect without errors', async ({ page }) => {
    const response = await page.goto('/pipeline', { waitUntil: 'networkidle' })

    // Should handle redirect chain successfully
    expect(response?.status()).not.toBe(500)
    expect(response?.status()).toBeLessThan(500)

    // Should end up at login (via /projects redirect)
    await expect(page).toHaveURL(/\/login/)
  })
})

/**
 * Authenticated smoke tests - verify pipeline loads properly when logged in
 */
test.describe('Pipeline Page - Smoke Tests (Authenticated)', () => {
  test('should load pipeline without 500 errors', async ({ page }) => {
    // Set up console error listener
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Navigate to projects - should stay on page when authenticated
    const response = await page.goto('/projects', { waitUntil: 'networkidle' })

    // Check HTTP response
    expect(response?.status()).not.toBe(500)
    expect(response?.status()).toBeLessThan(500)

    // Should stay on projects page
    await expect(page).toHaveURL(/\/projects/)

    // Pipeline heading should be visible
    await expect(page.getByRole('heading', { name: 'Pipeline' })).toBeVisible()

    // No critical JavaScript errors (ignore Sentry transport warnings)
    const criticalErrors = errors.filter(e => !e.includes('Sentry') && !e.includes('Transport disabled'))
    expect(criticalErrors.length).toBe(0)
  })

  test('should handle /pipeline redirect when authenticated', async ({ page }) => {
    const response = await page.goto('/pipeline', { waitUntil: 'networkidle' })

    // Should handle redirect chain successfully
    expect(response?.status()).not.toBe(500)
    expect(response?.status()).toBeLessThan(500)

    // Should end up at /projects (not login) when authenticated
    await expect(page).toHaveURL(/\/projects/)
  })
})
