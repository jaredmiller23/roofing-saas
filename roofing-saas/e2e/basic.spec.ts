/**
 * Basic Playwright Tests
 * Simple tests to verify Playwright setup works
 */

import { test, expect } from '@playwright/test'

test.describe('Basic Tests', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/')

    // Should redirect to login or show homepage
    await page.waitForLoadState('networkidle')

    // Page should load without errors
    expect(page.url()).toContain('localhost:3000')
  })

  test('should load login page', async ({ page }) => {
    // Override storageState to test unauthenticated state
    // This test needs to see the actual login page, not be redirected as an authenticated user
    await page.context().clearCookies()
    await page.goto('/login')

    // Should see login form
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()

    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toBeVisible()
  })

  test('should have manifest.json', async ({ page }) => {
    const response = await page.request.get('/manifest.json')
    expect(response.ok()).toBe(true)

    const manifest = await response.json()
    expect(manifest.name).toBeDefined()
    expect(manifest.short_name).toBeDefined()
  })
})
