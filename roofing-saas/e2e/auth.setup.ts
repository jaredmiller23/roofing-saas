import { test as setup, expect } from '@playwright/test'
import path from 'path'

/**
 * Authentication Setup for Playwright Tests
 *
 * This setup file runs before all tests to authenticate a test user
 * and save the authenticated state for reuse across all test files.
 *
 * The authenticated state is saved to: playwright/.auth/user.json
 */

// Path where authenticated state will be saved
const authFile = path.join(__dirname, '../playwright/.auth/user.json')

setup('authenticate test user', async ({ page }) => {
  console.log('🔐 Setting up authentication for test user...')

  // Get test credentials from environment
  const testEmail = process.env.TEST_USER_EMAIL || 'test@roofingsaas.com'
  const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!'

  console.log(`📧 Using test email: ${testEmail}`)

  // Navigate to login page
  await page.goto('/login')
  await expect(page).toHaveURL(/\/login/)

  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle')

  // Fill in login credentials
  // Try multiple selectors to handle different form implementations
  const emailInput = page.locator('input[name="email"], input[type="email"], input[placeholder*="email" i]').first()
  const passwordInput = page.locator('input[name="password"], input[type="password"], input[placeholder*="password" i]').first()

  await expect(emailInput).toBeVisible({ timeout: 10000 })
  await expect(passwordInput).toBeVisible({ timeout: 10000 })

  await emailInput.fill(testEmail)
  await passwordInput.fill(testPassword)

  console.log('✍️  Filled in credentials')

  // Find and click the submit button
  const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login")').first()
  await expect(submitButton).toBeVisible()
  // Use force: true to bypass Next.js dev overlay that may block clicks
  await submitButton.click({ force: true })

  console.log('🔘 Clicked login button')

  // Wait for successful login - should redirect to dashboard
  try {
    await page.waitForURL('/dashboard', { timeout: 15000 })
    console.log('✅ Successfully logged in - redirected to /dashboard')
  } catch (error) {
    // If we didn't get to /dashboard, check where we ended up
    const currentUrl = page.url()
    console.error(`❌ Login failed - current URL: ${currentUrl}`)

    // Take a screenshot for debugging
    await page.screenshot({ path: 'playwright/.auth/login-failure.png' })

    // Check for error messages
    const errorMessage = await page.locator('text=/error|invalid|wrong|failed/i').first().textContent().catch(() => null)
    if (errorMessage) {
      console.error(`Error message: ${errorMessage}`)
    }

    throw new Error(`Authentication failed - expected /dashboard, got ${currentUrl}`)
  }

  // Verify we're actually logged in by checking for user-specific elements
  // This could be a user menu, profile link, logout button, etc.
  const loggedInIndicators = [
    page.locator('button:has-text("Logout"), a:has-text("Logout")'),
    page.locator('[data-testid="user-menu"], [aria-label="User menu"]'),
    page.locator('text=/Welcome|Dashboard|Settings/i'),
  ]

  let foundIndicator = false
  for (const indicator of loggedInIndicators) {
    const count = await indicator.count()
    if (count > 0) {
      foundIndicator = true
      console.log('✅ Found logged-in indicator')
      break
    }
  }

  if (!foundIndicator) {
    console.warn('⚠️  No logged-in indicators found - auth might not have persisted')
  }

  // Verify user has org_id and can access data
  console.log('🔍 Verifying user has org access...')
  const response = await page.request.get('/api/contacts?limit=1')
  if (!response.ok()) {
    console.error(`❌ Auth setup failed: User cannot access contacts API (${response.status()})`)
    throw new Error(`Auth setup failed: User cannot access contacts API (${response.status()})`)
  }
  console.log('✅ Auth setup complete - user has valid org access')

  // Save authenticated state to file
  await page.context().storageState({ path: authFile })
  console.log(`💾 Saved authenticated state to: ${authFile}`)

  // Verify the auth file was created
  const fs = require('fs')
  if (fs.existsSync(authFile)) {
    const authData = JSON.parse(fs.readFileSync(authFile, 'utf-8'))
    const cookieCount = authData.cookies?.length || 0
    const storageCount = authData.origins?.length || 0
    console.log(`📦 Auth state saved with ${cookieCount} cookies and ${storageCount} storage origins`)
  } else {
    throw new Error('Auth file was not created!')
  }

  console.log('🎉 Authentication setup complete!')
})

setup('create auth directory if needed', async () => {
  // Ensure the auth directory exists
  const fs = require('fs')
  const authDir = path.join(__dirname, '../playwright/.auth')

  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
    console.log(`📁 Created auth directory: ${authDir}`)
  }
})
