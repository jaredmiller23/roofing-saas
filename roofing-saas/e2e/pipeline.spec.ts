import { test, expect } from '@playwright/test'

/**
 * Pipeline Page E2E Tests
 *
 * These tests verify the pipeline kanban board functionality
 */

// Helper to create a test user and log in
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function login(page: unknown) {
  // For now, we'll navigate directly to the pipeline
  // In production, you'd want to:
  // 1. Create a test user via Supabase API
  // 2. Log in via the login page
  // 3. Navigate to pipeline

  // Since we need authentication, we'll skip for now and just check if we redirect to login
  await page.goto('/pipeline')
}

test.describe('Pipeline Page', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/pipeline')

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/)
  })

  test('should load pipeline page when authenticated', async ({ page }) => {
    // TODO: Implement proper authentication flow
    // For now, this test will be skipped until we have auth helper
    test.skip()
  })

  test('should display all 7 pipeline stages', async ({ page }) => {
    // TODO: Implement with authentication
    test.skip()

    // Expected stages:
    // - New
    // - Contacted
    // - Qualified
    // - Proposal
    // - Negotiation
    // - Won
    // - Lost
  })

  test('should allow dragging contacts between stages', async ({ page }) => {
    // TODO: Implement drag-and-drop test with authentication
    test.skip()
  })
})

/**
 * Smoke test - verify the page compiles, renders, and doesn't crash
 * This test doesn't require authentication but must wait for full render
 */
test.describe('Pipeline Page - Smoke Tests', () => {
  test('should not show 500 Internal Server Error', async ({ page }) => {
    // Set up console error listener
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Navigate to pipeline - will redirect to login
    const response = await page.goto('/pipeline', { waitUntil: 'networkidle' })

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
})
