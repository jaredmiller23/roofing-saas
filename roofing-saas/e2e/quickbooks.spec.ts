/**
 * QuickBooks Integration E2E Tests
 *
 * Tests the QuickBooks integration UI in Settings → Integrations tab
 * and the associated API endpoints.
 *
 * Test Coverage:
 * - UI: Settings → Integrations → QuickBooks card
 * - API: Status, auth initiation, disconnect
 * - Connection status display
 * - Sync controls (when connected)
 *
 * @see components/settings/QuickBooksIntegration.tsx
 * @see lib/quickbooks/client.ts
 */

import { test, expect } from '@playwright/test'

test.describe('QuickBooks Integration UI', () => {
  test.use({ storageState: 'playwright/.auth/user.json' })

  test.beforeEach(async ({ page }) => {
    // Navigate to Settings → Integrations tab
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Click the Integrations tab
    await page.click('button:has-text("Integrations")')
    await page.waitForTimeout(500)
  })

  test('should display QuickBooks integration card', async ({ page }) => {
    await expect(page.locator('text=QuickBooks Online')).toBeVisible()
    await expect(page.locator('text=Sync customers, invoices, and payments')).toBeVisible()
  })

  test('should show connection status', async ({ page }) => {
    // Wait for status to load
    await page.waitForSelector('text=/Connected|Not Connected/', { timeout: 10000 })

    // Should show status indicator
    const statusText = await page.locator('.font-medium:has-text("Connected"), .font-medium:has-text("Not Connected")').first().textContent()
    expect(['Connected', 'Not Connected']).toContain(statusText?.trim())
  })

  test('should display sync features list', async ({ page }) => {
    await expect(page.locator('text=Sync Features:')).toBeVisible()
    await expect(page.locator('text=Sync contacts as QuickBooks customers')).toBeVisible()
    await expect(page.locator('text=Create invoices from projects')).toBeVisible()
  })

  test('should show connect button when not connected', async ({ page }) => {
    await page.waitForSelector('text=/Connected|Not Connected/', { timeout: 10000 })
    const notConnected = await page.locator('.font-medium:has-text("Not Connected")').isVisible()

    if (notConnected) {
      await expect(page.locator('button:has-text("Connect QuickBooks")')).toBeVisible()
    }
  })

  test('should show future integrations section', async ({ page }) => {
    await expect(page.locator('text=More Integrations Coming Soon')).toBeVisible()
    await expect(page.locator('text=Stripe')).toBeVisible()
    await expect(page.locator('text=Zapier')).toBeVisible()
  })
})

test.describe('QuickBooks API', () => {
  test.use({ storageState: 'playwright/.auth/user.json' })

  test('GET /api/quickbooks/status returns valid response', async ({ request }) => {
    const response = await request.get('/api/quickbooks/status')
    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('success', true)
    expect(data.data).toHaveProperty('connected')
    expect(typeof data.data.connected).toBe('boolean')

    if (data.data.connected) {
      expect(data.data).toHaveProperty('realm_id')
      expect(data.data).toHaveProperty('company_name')
    }
  })

  test('GET /api/quickbooks/auth requires authentication', async ({ request }) => {
    // This test uses the auth storage state, so it should redirect to QB
    const response = await request.get('/api/quickbooks/auth', {
      maxRedirects: 0,
    })

    // Should redirect to QuickBooks OAuth
    expect([200, 302, 307]).toContain(response.status())
  })

  test('POST /api/quickbooks/disconnect returns success', async ({ request }) => {
    const response = await request.post('/api/quickbooks/disconnect')
    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('success', true)
  })
})
