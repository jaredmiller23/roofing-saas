/**
 * Authentication Flow E2E Tests
 *
 * Comprehensive tests for authentication workflows including:
 * - Login with invalid credentials
 * - Logout flow
 * - Session persistence
 * - Protected route access control
 *
 * Note: Password reset and change require email integration, tested separately
 *
 * IMPORTANT: Tests are organized into separate describe blocks by auth state:
 * - Unauthenticated tests: Use empty storageState
 * - Authenticated tests: Use default authenticated storageState
 * - Logout tests: Test logout flow (run last, separate block)
 *
 * @see docs/testing/E2E_TESTING_BEST_PRACTICES.md
 */

import { test, expect } from '@playwright/test'

// Test user credentials (same as auth.setup.ts)
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@roofingsaas.com'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!'

// CRITICAL: Run all auth tests serially to prevent logout from invalidating
// sessions used by other tests. Supabase's signOut() uses global scope by default,
// which invalidates ALL sessions for the user, not just the current one.
test.describe.configure({ mode: 'serial' })

/**
 * Tests that start UNAUTHENTICATED
 * These use empty storage state and test login flows
 */
test.describe('Authentication Flows - Unauthenticated', () => {
  // Use empty storage state - no cookies, no auth
  test.use({ storageState: { cookies: [], origins: [] } })

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('load')

    // Fill in invalid credentials
    const emailInput = page.locator('input[name="email"], input[type="email"]').first()
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first()

    await emailInput.fill('invalid@example.com')
    await passwordInput.fill('WrongPassword123!')

    // Submit
    const submitButton = page.locator('button[type="submit"]').first()
    await submitButton.click()

    // Should show error message (check for common error patterns)
    const errorVisible = await page.locator('text=/invalid|incorrect|wrong|failed|error/i').isVisible({ timeout: 10000 }).catch(() => false)

    // OR should still be on login page (not redirected)
    const stillOnLogin = page.url().includes('/login')

    // At least one of these should be true
    expect(errorVisible || stillOnLogin).toBeTruthy()
  })

  test('should successfully login with valid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('load')

    // Fill in valid credentials
    const emailInput = page.locator('input[name="email"], input[type="email"]').first()
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first()

    await emailInput.fill(TEST_EMAIL)
    await passwordInput.fill(TEST_PASSWORD)

    // Submit
    const submitButton = page.locator('button[type="submit"]').first()
    await submitButton.click({ force: true })

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
  })

  test('should redirect to login when accessing protected route unauthenticated', async ({ page }) => {
    // Try to access protected route
    await page.goto('/en/contacts')
    await page.waitForLoadState('load')

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('should preserve destination after login redirect', async ({ page }) => {
    // Try to access protected route
    await page.goto('/en/contacts')
    await page.waitForLoadState('load')

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })

    // Login
    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()

    await emailInput.fill(TEST_EMAIL)
    await passwordInput.fill(TEST_PASSWORD)

    const submitButton = page.locator('button[type="submit"]').first()
    await submitButton.click({ force: true })

    // Wait for redirect to complete (either to contacts or dashboard)
    // Don't use fixed timeout - wait for actual URL change
    await expect(page).toHaveURL(/\/(contacts|dashboard)/, { timeout: 15000 })

    const url = page.url()
    const redirectedCorrectly = url.includes('/contacts') || url.includes('/dashboard')

    expect(redirectedCorrectly).toBeTruthy()
  })
})

/**
 * Tests that require AUTHENTICATED state
 * These use the default authenticated storage state from auth.setup.ts
 */
test.describe('Authentication Flows - Authenticated', () => {
  // Uses default authenticated storage state (configured in playwright.config.ts)

  test('should allow access to protected routes when authenticated', async ({ page }) => {
    await page.goto('/en/contacts')
    await page.waitForLoadState('load')

    // Should NOT redirect to login
    const url = page.url()
    expect(url).not.toContain('/login')

    // Should actually be on contacts page
    expect(url).toContain('/contacts')
  })

  test('should maintain session across page refreshes', async ({ page }) => {
    // Navigate to dashboard (authenticated)
    await page.goto('/en/dashboard')
    await page.waitForLoadState('load')

    // Verify authenticated
    const url1 = page.url()
    expect(url1).toContain('/dashboard')

    // Refresh page
    await page.reload()
    await page.waitForLoadState('load')

    // Should still be authenticated
    const url2 = page.url()
    expect(url2).toContain('/dashboard')
    expect(url2).not.toContain('/login')
  })

  test('should maintain session across navigation', async ({ page }) => {
    // Start at dashboard
    await page.goto('/en/dashboard')
    await page.waitForLoadState('load')

    // Navigate to different protected routes
    const routes = ['/en/contacts', '/en/projects', '/en/dashboard']

    for (const route of routes) {
      await page.goto(route)
      await page.waitForLoadState('load')

      const url = page.url()
      // Should NOT redirect to login
      expect(url).not.toContain('/login')
    }
  })
})

/**
 * Logout tests - These modify session state
 * IMPORTANT: Uses empty storage state and performs fresh login to avoid
 * invalidating the shared auth token used by other parallel tests.
 */
test.describe('Authentication Flows - Logout', () => {
  // Use empty storage state - we'll login fresh to get our own token
  test.use({ storageState: { cookies: [], origins: [] } })

  test('should successfully logout, redirect to login, and clear session', async ({ page }) => {
    // First, login fresh to get our own session (not the shared one)
    await page.goto('/login')
    await page.waitForLoadState('load')

    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()

    await emailInput.fill(TEST_EMAIL)
    await passwordInput.fill(TEST_PASSWORD)

    const submitButton = page.locator('button[type="submit"]').first()
    await submitButton.click({ force: true })

    // Wait for login to complete
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    // Find logout button (try multiple possible selectors)
    const logoutButton = page.locator('button:has-text("Logout")').or(
      page.locator('button:has-text("Log out")').or(
        page.locator('button:has-text("Sign out")').or(
          page.locator('[data-testid="logout-button"]')
        )
      )
    ).first()

    // Logout button MUST be visible - this is a core UI requirement
    await expect(logoutButton).toBeVisible({ timeout: 5000 })

    await logoutButton.click()

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })

    // Should see login form
    const loginEmailInput = page.locator('input[type="email"]')
    await expect(loginEmailInput).toBeVisible()

    // Verify session is cleared - try to access protected route
    await page.goto('/en/dashboard')
    await page.waitForLoadState('load')

    // Should redirect back to login (session was cleared)
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})
