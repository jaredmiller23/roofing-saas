/**
 * E2E Test Utilities
 * Helper functions for Playwright tests
 */

import { Page, expect } from '@playwright/test'

/**
 * Simulate going offline
 */
export async function goOffline(page: Page) {
  await page.context().setOffline(true)
  console.log('📴 Network set to offline')
}

/**
 * Simulate coming back online
 */
export async function goOnline(page: Page) {
  await page.context().setOffline(false)
  console.log('🌐 Network set to online')
}

/**
 * Wait for service worker to be registered
 */
export async function waitForServiceWorker(page: Page) {
  await page.waitForFunction(() => {
    return navigator.serviceWorker.controller !== null
  }, { timeout: 10000 })
  console.log('✅ Service worker registered')
}

/**
 * Check if PWA is installable
 */
export async function checkPWAInstallable(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return 'serviceWorker' in navigator && 'PushManager' in window
  })
}

/**
 * Clear IndexedDB database
 */
export async function clearIndexedDB(page: Page, dbName: string) {
  await page.evaluate((name) => {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(name)
      request.onsuccess = () => {
        console.log(`🗑️ Cleared IndexedDB: ${name}`)
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }, dbName)
}

/**
 * Get IndexedDB data
 */
export async function getIndexedDBData(
  page: Page,
  dbName: string,
  storeName: string
): Promise<any[]> {
  return await page.evaluate(
    ({ db, store }) => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(db)
        request.onsuccess = () => {
          const database = request.result
          const transaction = database.transaction(store, 'readonly')
          const objectStore = transaction.objectStore(store)
          const getAllRequest = objectStore.getAll()

          getAllRequest.onsuccess = () => {
            resolve(getAllRequest.result)
          }
          getAllRequest.onerror = () => reject(getAllRequest.error)
        }
        request.onerror = () => reject(request.error)
      })
    },
    { db: dbName, store: storeName }
  )
}

/**
 * Wait for network idle
 */
export async function waitForNetworkIdle(page: Page, timeout = 3000) {
  await page.waitForLoadState('networkidle', { timeout })
}

/**
 * Mock geolocation
 */
export async function mockGeolocation(
  page: Page,
  latitude: number,
  longitude: number
) {
  await page.context().setGeolocation({ latitude, longitude })
  await page.context().grantPermissions(['geolocation'])
  console.log(`📍 Geolocation mocked: ${latitude}, ${longitude}`)
}

/**
 * Upload test file
 */
export async function uploadTestImage(
  page: Page,
  fileInputSelector: string,
  imagePath: string
) {
  const fileInput = await page.locator(fileInputSelector)
  await fileInput.setInputFiles(imagePath)
  console.log(`📤 Uploaded test image: ${imagePath}`)
}

/**
 * Wait for toast/notification
 */
export async function waitForNotification(
  page: Page,
  message: string,
  timeout = 5000
) {
  await page.waitForSelector(`text=${message}`, { timeout })
  console.log(`✅ Found notification: ${message}`)
}

/**
 * Login helper
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard', { timeout: 10000 })
  console.log(`✅ Logged in as ${email}`)
}

/**
 * Check if element is visible
 */
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout: 5000 })
    return true
  } catch {
    return false
  }
}

/**
 * Get queue status from UI
 */
export async function getQueueStatus(page: Page) {
  // Wait for queue status component
  const queueStatus = await page.locator('[data-testid="offline-queue-status"]')

  if (!(await queueStatus.isVisible())) {
    return { pending: 0, syncing: 0, failed: 0 }
  }

  const pendingText = await queueStatus.locator('text=/\\d+ photo.*queued/').textContent()
  const syncingText = await queueStatus.locator('text=/Uploading \\d+ photo/').textContent()
  const failedText = await queueStatus.locator('text=/\\d+ upload.*failed/').textContent()

  return {
    pending: pendingText ? parseInt(pendingText.match(/\d+/)?.[0] || '0') : 0,
    syncing: syncingText ? parseInt(syncingText.match(/\d+/)?.[0] || '0') : 0,
    failed: failedText ? parseInt(failedText.match(/\d+/)?.[0] || '0') : 0,
  }
}
