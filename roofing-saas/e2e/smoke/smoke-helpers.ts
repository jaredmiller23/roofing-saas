/**
 * Smoke Test Helpers
 * Shared utilities for smoke tests to reduce duplication and improve maintainability
 */

import { Page, expect } from '@playwright/test'
import path from 'path'
import { promises as fs } from 'fs'

/**
 * Default credentials for smoke tests
 */
const DEFAULT_EMAIL = 'demo@roofingsaas.com'
const DEFAULT_PASSWORD = 'Demo2025!'

/**
 * Login helper with default demo credentials
 * @param page Playwright page object
 * @param email Email address (defaults to demo@roofingsaas.com)
 * @param password Password (defaults to Demo2025!)
 */
export async function login(
  page: Page,
  email: string = DEFAULT_EMAIL,
  password: string = DEFAULT_PASSWORD
) {
  console.log(`🔐 Logging in as ${email}`)

  await page.goto('/login')
  await expect(page).toHaveURL(/\/login/)

  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle')

  // Try multiple selectors to handle different form implementations
  const emailInput = page.locator('input[name="email"], input[type="email"], input[placeholder*="email" i]').first()
  const passwordInput = page.locator('input[name="password"], input[type="password"], input[placeholder*="password" i]').first()

  await expect(emailInput).toBeVisible({ timeout: 10000 })
  await expect(passwordInput).toBeVisible({ timeout: 10000 })

  await emailInput.fill(email)
  await passwordInput.fill(password)

  // Find and click the submit button
  const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login")').first()
  await expect(submitButton).toBeVisible()
  await submitButton.click({ force: true })

  // Wait for successful login - should redirect to dashboard
  try {
    await page.waitForURL('/dashboard', { timeout: 15000 })
    console.log(`✅ Successfully logged in as ${email}`)
  } catch (error) {
    const currentUrl = page.url()
    console.error(`❌ Login failed for ${email} - current URL: ${currentUrl}`)
    throw new Error(`Login failed - expected /dashboard, got ${currentUrl}`)
  }
}

/**
 * Capture and save screenshot with timestamp
 * @param page Playwright page object
 * @param name Screenshot name (will be prefixed with timestamp)
 */
export async function captureScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const screenshotName = `${timestamp}_${name}.png`
  const screenshotPath = path.join('playwright/.screenshots', screenshotName)

  // Ensure screenshot directory exists
  const screenshotDir = path.dirname(screenshotPath)
  await fs.mkdir(screenshotDir, { recursive: true })

  await page.screenshot({ path: screenshotPath, fullPage: true })
  console.log(`📸 Screenshot saved: ${screenshotPath}`)

  return screenshotPath
}

/**
 * Check if page shows error screen or error indicators
 * @param page Playwright page object
 * @returns true if error is detected, false otherwise
 */
export async function hasErrorPage(page: Page): Promise<boolean> {
  try {
    // Check for common error page indicators
    const errorIndicators = [
      'text=/error|Error|ERROR/i',
      'text=/404|Not Found/i',
      'text=/500|Internal Server Error/i',
      'text=/Something went wrong/i',
      'text=/Oops/i',
      '[data-testid*="error"]',
      '.error-page',
      '.error-container',
      '.error-message'
    ]

    for (const indicator of errorIndicators) {
      const element = page.locator(indicator).first()
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`❌ Error indicator found: ${indicator}`)
        return true
      }
    }

    // Check for HTTP error status in URL or page title
    const title = await page.title()
    if (title.match(/error|404|500/i)) {
      console.log(`❌ Error detected in page title: ${title}`)
      return true
    }

    return false
  } catch (error) {
    console.warn(`⚠️ Error checking for error page: ${error}`)
    return false
  }
}

/**
 * Standard wait pattern for page to fully load
 * @param page Playwright page object
 * @param timeout Maximum wait time in milliseconds (default: 10000)
 */
export async function waitForPageLoad(page: Page, timeout: number = 10000) {
  try {
    // Wait for network idle (no network requests for at least 500ms)
    await page.waitForLoadState('networkidle', { timeout })

    // Wait for DOM content to be loaded
    await page.waitForLoadState('domcontentloaded', { timeout })

    // Wait for React hydration — body should have meaningful content
    await expect(page.locator('body')).not.toHaveText(/^\s*$/, { timeout: 5000 }).catch(() => {})

    console.log('✅ Page fully loaded')
  } catch (error) {
    console.warn(`⚠️ Page load timeout after ${timeout}ms: ${error}`)
    throw error
  }
}

/**
 * Wait for specific API response
 * @param page Playwright page object
 * @param urlPattern URL pattern to match (string or regex)
 * @param timeout Maximum wait time in milliseconds (default: 10000)
 * @returns The response object
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout: number = 10000
) {
  try {
    const response = await page.waitForResponse(
      (response) => {
        const url = response.url()
        const matches = typeof urlPattern === 'string'
          ? url.includes(urlPattern)
          : urlPattern.test(url)
        return matches && response.status() < 400
      },
      { timeout }
    )

    console.log(`✅ API response received: ${response.url()} (${response.status()})`)
    return response
  } catch (error) {
    console.warn(`⚠️ API response timeout for pattern ${urlPattern}: ${error}`)
    throw error
  }
}

/**
 * Check for success/error toast notifications
 * @param page Playwright page object
 * @param type Type of toast to check for ('success', 'error', or 'any')
 * @param timeout Maximum wait time in milliseconds (default: 5000)
 * @returns true if toast is found, false otherwise
 */
export async function checkForToast(
  page: Page,
  type: 'success' | 'error' | 'any' = 'any',
  timeout: number = 5000
): Promise<boolean> {
  try {
    let selectors: string[]

    switch (type) {
      case 'success':
        selectors = [
          'text=/success|Success|SUCCESS/i',
          '.toast-success',
          '.notification-success',
          '[data-testid*="success"]',
          '.alert-success'
        ]
        break
      case 'error':
        selectors = [
          'text=/error|Error|ERROR|failed|Failed/i',
          '.toast-error',
          '.notification-error',
          '[data-testid*="error"]',
          '.alert-error',
          '.alert-danger'
        ]
        break
      case 'any':
      default:
        selectors = [
          '.toast',
          '.notification',
          '.alert',
          '[role="alert"]',
          '[data-testid*="toast"]',
          '[data-testid*="notification"]'
        ]
        break
    }

    for (const selector of selectors) {
      const element = page.locator(selector).first()
      if (await element.isVisible({ timeout: timeout / selectors.length }).catch(() => false)) {
        const text = await element.textContent().catch(() => 'unknown')
        console.log(`✅ Toast found (${type}): ${text}`)
        return true
      }
    }

    console.log(`ℹ️ No ${type} toast found within ${timeout}ms`)
    return false
  } catch (error) {
    console.warn(`⚠️ Error checking for toast: ${error}`)
    return false
  }
}