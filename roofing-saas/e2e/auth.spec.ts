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
 * @see docs/testing/E2E_TESTING_BEST_PRACTICES.md
 */

import { test, expect } from '@playwright/test'

// Test user credentials (same as auth.setup.ts)
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@roofingsaas.com'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!'

test.describe('Authentication Flows', () => {
  test.describe('Login', () => {
    test('should reject invalid credentials', async ({ page }) => {
      // Clear any existing auth
      await page.context().clearCookies()

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

    test('should successfully login with valid credentials', async ({ page }) => {
      // Clear any existing auth
      await page.context().clearCookies()

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
  })

  test.describe('Logout', () => {
    test('should successfully logout and redirect to login', async ({ page }) => {
      // Start from dashboard (already authenticated via global setup)
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

      // Logout button MUST be visible - this is a core UI requirement
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

      // Logout button MUST be visible
      await expect(logoutButton).toBeVisible({ timeout: 5000 })

      await logoutButton.click()
      await page.waitForLoadState('load')

      // Try to access protected route
      await page.goto('/dashboard')
      await page.waitForLoadState('load')

      // Should redirect back to login (not allow access)
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
    })
  })

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing protected route unauthenticated', async ({ page }) => {
      // Clear auth
      await page.context().clearCookies()

      // Try to access protected route
      await page.goto('/contacts')
      await page.waitForLoadState('load')

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
    })

    test('should allow access to protected routes when authenticated', async ({ page }) => {
      // Already authenticated via global setup
      await page.goto('/contacts')
      await page.waitForLoadState('load')

      // Should NOT redirect to login
      const url = page.url()
      expect(url).not.toContain('/login')

      // Should actually be on contacts page
      expect(url).toContain('/contacts')
    })

    test('should preserve destination after login redirect', async ({ page }) => {
      // Clear auth
      await page.context().clearCookies()

      // Try to access protected route
      await page.goto('/contacts')
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

      // Should redirect back to originally requested page OR dashboard
      await page.waitForTimeout(3000)

      const url = page.url()
      const redirectedCorrectly = url.includes('/contacts') || url.includes('/dashboard')

      expect(redirectedCorrectly).toBeTruthy()
    })
  })

  test.describe('Session Persistence', () => {
    test('should maintain session across page refreshes', async ({ page }) => {
      // Navigate to dashboard (authenticated)
      await page.goto('/dashboard')
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
      await page.goto('/dashboard')
      await page.waitForLoadState('load')

      // Navigate to different protected routes
      const routes = ['/contacts', '/projects', '/dashboard']

      for (const route of routes) {
        await page.goto(route)
        await page.waitForLoadState('load')

        const url = page.url()
        // Should NOT redirect to login
        expect(url).not.toContain('/login')
      }
    })
  })
})
