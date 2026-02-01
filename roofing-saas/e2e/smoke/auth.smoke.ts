/**
 * Authentication - Smoke Tests
 *
 * SMOKE-INFRA-003: Verify authentication works on production
 * Auth is foundational - all other smoke tests depend on auth working correctly
 *
 * Success Criteria:
 * - Login page loads and renders correctly
 * - Login with demo@roofingsaas.com / Demo2025! succeeds
 * - Successful login redirects to /dashboard
 * - Dashboard renders without error screens
 * - Session persists on page refresh
 * - Logout works and redirects to /login
 * - Protected routes redirect to /login when unauthenticated
 */

import { test, expect } from '@playwright/test'

// Demo credentials for smoke tests
const DEMO_EMAIL = 'demo@roofingsaas.com'
const DEMO_PASSWORD = 'Demo2025!'

test.describe('Authentication - Smoke Tests', () => {

  test.describe('Unauthenticated Access', () => {
    // Use empty storage state to test without authentication
    test.use({ storageState: { cookies: [], origins: [] } })

    test('should load login page correctly', async ({ page }) => {
      await page.goto('/login')
      await page.waitForLoadState('load')

      // Verify login page rendered properly
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()

      // Should be on login page
      await expect(page).toHaveURL(/\/login/)
    })

    test('should redirect protected routes to login', async ({ page }) => {
      // Clear any existing auth
      await page.context().clearCookies()

      // Try to access protected route (dashboard)
      await page.goto('/dashboard')
      await page.waitForLoadState('load')

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/)

      // Verify login form is visible
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
    })
  })

  test.describe('Authenticated Login Flow', () => {
    // Use empty storage state to start unauthenticated
    test.use({ storageState: { cookies: [], origins: [] } })

    test('should successfully login with demo credentials', async ({ page }) => {
      // Clear any existing auth
      await page.context().clearCookies()

      await page.goto('/login')
      await page.waitForLoadState('load')

      // Fill in demo credentials
      const emailInput = page.locator('input[name="email"], input[type="email"]').first()
      const passwordInput = page.locator('input[name="password"], input[type="password"]').first()

      await emailInput.fill(DEMO_EMAIL)
      await passwordInput.fill(DEMO_PASSWORD)

      // Submit login form
      const submitButton = page.locator('button[type="submit"]').first()
      await submitButton.click({ force: true })

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
    })

    test('should render dashboard without error screens after login', async ({ page }) => {
      // Clear any existing auth
      await page.context().clearCookies()

      // Login first
      await page.goto('/login')
      await page.waitForLoadState('load')

      const emailInput = page.locator('input[name="email"], input[type="email"]').first()
      const passwordInput = page.locator('input[name="password"], input[type="password"]').first()

      await emailInput.fill(DEMO_EMAIL)
      await passwordInput.fill(DEMO_PASSWORD)

      const submitButton = page.locator('button[type="submit"]').first()
      await submitButton.click({ force: true })

      // Wait for dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

      // Dashboard should render without error screens
      await expect(page.getByRole('heading', { name: /dashboard/i }).first()).toBeVisible()

      // Should not show error messages
      const errorVisible = await page.locator('text=/error|failed|something went wrong/i').isVisible({ timeout: 2000 }).catch(() => false)
      expect(errorVisible).toBeFalsy()
    })
  })

  test.describe('Session Persistence', () => {
    // Uses default authenticated storage state

    test('should maintain session on page refresh', async ({ page }) => {
      // Navigate to dashboard (authenticated)
      await page.goto('/dashboard')
      await page.waitForLoadState('load')

      // Verify authenticated and on dashboard
      await expect(page).toHaveURL(/\/dashboard/)

      // Refresh page
      await page.reload()
      await page.waitForLoadState('load')

      // Should still be authenticated and on dashboard
      await expect(page).toHaveURL(/\/dashboard/)
      await expect(page).not.toHaveURL(/\/login/)

      // Dashboard content should be visible
      await expect(page.getByRole('heading', { name: /dashboard/i }).first()).toBeVisible()
    })

    test('should maintain session across navigation', async ({ page }) => {
      // Start at dashboard
      await page.goto('/dashboard')
      await page.waitForLoadState('load')

      // Navigate to different protected routes
      const routes = ['/projects', '/contacts', '/dashboard']

      for (const route of routes) {
        await page.goto(route)
        await page.waitForLoadState('load')

        const url = page.url()
        // Should NOT redirect to login
        expect(url).not.toContain('/login')
        // Should be on expected route
        expect(url).toContain(route)
      }
    })
  })

  test.describe('Logout Flow', () => {
    // Uses default authenticated storage state

    test('should successfully logout and redirect to login', async ({ page }) => {
      // Start from dashboard (authenticated)
      await page.goto('/dashboard')
      await page.waitForLoadState('load')

      // Find logout button (try multiple possible selectors)
      const logoutButton = page.locator('button:has-text("Logout")').or(
        page.locator('button:has-text("Log out")').or(
          page.locator('button:has-text("Sign out")').or(
            page.locator('[data-testid="logout-button"]')
          )
        )
      ).first()

      // Logout button MUST be visible for authenticated users
      await expect(logoutButton).toBeVisible({ timeout: 5000 })

      await logoutButton.click()

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 })

      // Should see login form
      const emailInput = page.locator('input[type="email"]')
      await expect(emailInput).toBeVisible()
    })

    test('should clear session after logout', async ({ page }) => {
      // Start authenticated
      await page.goto('/dashboard')
      await page.waitForLoadState('load')

      // Logout
      const logoutButton = page.locator('button:has-text("Logout")').or(
        page.locator('button:has-text("Log out")').or(
          page.locator('button:has-text("Sign out")')
        )
      ).first()

      // Logout button MUST be visible for authenticated users
      await expect(logoutButton).toBeVisible({ timeout: 5000 })

      await logoutButton.click()
      await page.waitForLoadState('load')

      // Try to access protected route after logout
      await page.goto('/dashboard')
      await page.waitForLoadState('load')

      // Should redirect back to login (session cleared)
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
    })
  })

  test.describe('Error Handling', () => {
    // Use empty storage state to test without authentication
    test.use({ storageState: { cookies: [], origins: [] } })

    test('should handle login page load errors gracefully', async ({ page }) => {
      // Set up console error listener
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      // Navigate to login
      const response = await page.goto('/login', { waitUntil: 'networkidle' })

      // Check HTTP response is not server error
      expect(response?.status()).not.toBe(500)
      expect(response?.status()).toBeLessThan(500)

      // Page should load without critical errors
      await expect(page).toHaveURL(/\/login/)

      // Filter out expected/harmless errors (like Sentry transport warnings)
      const criticalErrors = errors.filter(e =>
        !e.includes('Sentry') &&
        !e.includes('Transport disabled') &&
        !e.includes('favicon')
      )

      expect(criticalErrors.length).toBe(0)
    })

    test('should handle invalid credentials appropriately', async ({ page }) => {
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

      // Wait a moment for error to appear
      await page.waitForTimeout(2000)

      // Should show error message (check for common error patterns)
      const errorVisible = await page.locator('text=/invalid|incorrect|wrong|failed|error/i').isVisible({ timeout: 5000 }).catch(() => false)

      // OR should still be on login page (not redirected)
      const stillOnLogin = page.url().includes('/login')

      // At least one of these should be true
      expect(errorVisible || stillOnLogin).toBeTruthy()
    })
  })
})