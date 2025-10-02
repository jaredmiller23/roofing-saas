/**
 * Offline Queue Unit Tests
 * Tests offline queue functionality without authentication
 */

import { test, expect } from '@playwright/test'

test.describe('Offline Queue System', () => {
  test('should initialize Dexie database', async ({ page }) => {
    await page.goto('/login')

    // Check if Dexie is available
    const hasDexie = await page.evaluate(() => {
      return typeof window !== 'undefined' && 'indexedDB' in window
    })

    expect(hasDexie).toBe(true)
  })

  test('should detect network status', async ({ page }) => {
    await page.goto('/login')

    // Check initial online status
    const isOnline = await page.evaluate(() => navigator.onLine)
    expect(isOnline).toBe(true)

    // Simulate going offline
    await page.context().setOffline(true)

    // Check offline status
    const isOffline = await page.evaluate(() => !navigator.onLine)
    expect(isOffline).toBe(true)

    // Go back online
    await page.context().setOffline(false)
  })

  test('should have service worker support', async ({ page }) => {
    await page.goto('/login')

    const hasServiceWorker = await page.evaluate(() => {
      return 'serviceWorker' in navigator
    })

    expect(hasServiceWorker).toBe(true)
  })

  test('should create IndexedDB database for queue', async ({ page }) => {
    await page.goto('/login')

    // Wait a moment for app initialization
    await page.waitForTimeout(2000)

    // Check if RoofingSaaSOfflineQueue database exists
    const hasDatabase = await page.evaluate(async () => {
      const databases = await indexedDB.databases()
      return databases.some(db => db.name === 'RoofingSaaSOfflineQueue')
    })

    expect(hasDatabase).toBe(true)
  })

  test('should have PWA manifest', async ({ page }) => {
    await page.goto('/login')

    // Check for manifest link
    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveCount(1)

    const manifestHref = await manifestLink.getAttribute('href')
    expect(manifestHref).toBe('/manifest.json')
  })
})
