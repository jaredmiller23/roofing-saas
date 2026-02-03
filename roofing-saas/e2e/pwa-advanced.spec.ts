/**
 * PWA Advanced Feature Tests
 * Tests service worker, offline capabilities, and PWA installation
 */

import { test, expect } from '@playwright/test'
import {
  login,
  waitForServiceWorker,
  checkPWAInstallable,
  goOffline,
  goOnline,
  clearIndexedDB
} from './utils/test-helpers'

test.describe('PWA Advanced Features', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'test@example.com', 'testpassword123')
  })

  test('should register service worker', async ({ page }) => {
    await page.goto('/dashboard')

    // Wait for service worker to register
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        return registration.active !== null
      }
      return false
    })

    expect(swRegistered).toBe(true)
  })

  test('should be installable as PWA', async ({ page }) => {
    await page.goto('/dashboard')

    const isInstallable = await checkPWAInstallable(page)
    expect(isInstallable).toBe(true)

    // Check manifest is accessible
    const manifestResponse = await page.request.get('/manifest.json')
    expect(manifestResponse.ok()).toBe(true)

    const manifest = await manifestResponse.json()
    expect(manifest.name).toBeDefined()
    expect(manifest.short_name).toBeDefined()
    expect(manifest.icons).toBeDefined()
    expect(manifest.display).toBe('standalone')
  })

  test('should cache static assets', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForServiceWorker(page)

    // Check that service worker has cached resources
    const cachedResources = await page.evaluate(async () => {
      const cacheNames = await caches.keys()
      const allCaches = await Promise.all(
        cacheNames.map(async name => {
          const cache = await caches.open(name)
          const keys = await cache.keys()
          return keys.map(req => req.url)
        })
      )
      return allCaches.flat()
    })

    // Should have cached some resources
    expect(cachedResources.length).toBeGreaterThan(0)

    // Should cache common assets
    const hasCachedJS = cachedResources.some(url => url.endsWith('.js'))
    const hasCachedCSS = cachedResources.some(url => url.endsWith('.css'))

    expect(hasCachedJS || hasCachedCSS).toBe(true)
  })

  test('should work offline after initial load', async ({ page }) => {
    // Load page while online
    await page.goto('/dashboard')
    await waitForServiceWorker(page)

    // Wait for content to load
    await page.waitForSelector('[data-testid="dashboard-content"]', { timeout: 10000 })

    // Go offline
    await goOffline(page)

    // Navigate to another cached page
    await page.goto('/contacts')

    // Page should still load (from cache or service worker)
    await page.waitForLoadState('domcontentloaded')

    // Should show offline indicator
    const offlineIndicator = page.locator('[data-testid="offline-indicator"]')
    await expect(offlineIndicator).toBeVisible()
  })

  test('should queue actions while offline', async ({ page }) => {
    await page.goto('/knocks')
    await waitForServiceWorker(page)

    // Go offline
    await goOffline(page)

    // Try to log a knock while offline
    await page.click('text=Log Knock')
    await page.fill('input[name="address"]', '123 Offline Test St')
    await page.selectOption('select[name="disposition"]', 'interested')
    await page.locator('button', { hasText: 'Save' }).click()

    // Should show queued notification
    const queueNotification = page.locator('text=/queued|offline/i')
    await expect(queueNotification).toBeVisible()

    // Check IndexedDB for queued item
    const queuedItems = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('offline-queue', 1)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      const transaction = db.transaction(['queue'], 'readonly')
      const store = transaction.objectStore('queue')
      const items = await new Promise<any[]>((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      return items
    })

    expect(queuedItems.length).toBeGreaterThan(0)
  })

  test('should sync queued actions when back online', async ({ page }) => {
    await page.goto('/knocks')
    await waitForServiceWorker(page)

    // Queue an action while offline
    await goOffline(page)
    await page.click('text=Log Knock')
    await page.fill('input[name="address"]', '456 Sync Test Ave')
    await page.selectOption('select[name="disposition"]', 'not_home')
    await page.locator('button', { hasText: 'Save' }).click()

    // Go back online
    await goOnline(page)

    // Poll for sync to complete — queue should be empty
    await expect(async () => {
      const queueStatus = await page.evaluate(async () => {
        try {
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('offline-queue', 1)
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
          })
          const transaction = db.transaction(['queue'], 'readonly')
          const store = transaction.objectStore('queue')
          const count = await new Promise<number>((resolve) => {
            const req = store.count()
            req.onsuccess = () => resolve(req.result)
          })
          db.close()
          return count
        } catch { return -1 }
      })
      expect(queueStatus).toBe(0)
    }).toPass({ timeout: 15000 })

    // Check that queue is empty
    const queueStatus = await page.evaluate(async () => {
      try {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('offline-queue', 1)
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })

        const transaction = db.transaction(['queue'], 'readonly')
        const store = transaction.objectStore('queue')
        const items = await new Promise<any[]>((resolve, reject) => {
          const request = store.getAll()
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })

        return { isEmpty: items.length === 0, count: items.length }
      } catch (error) {
        return { isEmpty: false, count: -1, error: String(error) }
      }
    })

    // Queue should be empty after sync
    expect(queueStatus.isEmpty).toBe(true)

    // Verify data was actually saved
    await page.goto('/knocks')
    await expect(page.locator('text=456 Sync Test Ave')).toBeVisible()
  })

  test('should handle app update notifications', async ({ page }) => {
    await page.goto('/dashboard')
    await waitForServiceWorker(page)

    // Simulate service worker update
    await page.evaluate(() => {
      // Dispatch custom event that app uses for update notifications
      window.dispatchEvent(new CustomEvent('sw-update-available'))
    })

    // Should show update notification
    const updateNotification = page.locator('text=/update.*available|new version/i')
    await expect(updateNotification).toBeVisible({ timeout: 5000 })

    // Should have reload/update button
    const updateButton = page.locator('button:has-text(/reload|update/i)')
    await expect(updateButton).toBeVisible()
  })

  test('should persist user session across app restarts', async ({ page, context }) => {
    await page.goto('/dashboard')

    // Get user info
    const userName = await page.locator('[data-testid="user-name"]').textContent()

    // Close and reopen page (simulating app restart)
    await page.close()

    const newPage = await context.newPage()
    await newPage.goto('/dashboard')

    // Should still be logged in
    await expect(newPage).toHaveURL(/dashboard/)

    // User info should be the same
    const newUserName = await newPage.locator('[data-testid="user-name"]').textContent()
    expect(newUserName).toBe(userName)
  })

  test('should handle background sync', async ({ page }) => {
    test.skip(!process.env.ENABLE_BACKGROUND_SYNC, 'Background sync not enabled')

    await page.goto('/dashboard')
    await waitForServiceWorker(page)

    // Check if background sync is supported
    const bgSyncSupported = await page.evaluate(() => {
      return 'sync' in window.ServiceWorkerRegistration.prototype
    })

    if (!bgSyncSupported) {
      test.skip(true, 'Background sync not supported in this browser')
    }

    // Register a sync event
    const syncRegistered = await page.evaluate(async () => {
      try {
        const registration = await navigator.serviceWorker.ready
        // @ts-ignore - Background Sync API may not be in all type definitions
        if ('sync' in registration) {
          // @ts-ignore
          await registration.sync.register('sync-offline-queue')
          return true
        }
        return false
      } catch (error) {
        return false
      }
    })

    expect(syncRegistered).toBe(true)
  })

  test('should maintain PWA state during updates', async ({ page }) => {
    await page.goto('/dashboard')

    // Add some data to IndexedDB
    await page.evaluate(() => {
      localStorage.setItem('pwa-test-key', 'test-value')
    })

    // Reload page (simulating app update)
    await page.reload()

    // Data should persist
    const storedValue = await page.evaluate(() => {
      return localStorage.getItem('pwa-test-key')
    })

    expect(storedValue).toBe('test-value')
  })
})
