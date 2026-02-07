/**
 * Offline Workflow E2E Tests
 * Tests for PWA offline functionality and photo queue system
 *
 * These tests verify:
 * - Service Worker registration
 * - Offline photo capture and queueing
 * - Background Sync API integration
 * - Automatic upload when back online
 * - Queue status UI updates
 * - Failed upload retry logic
 */

import { test, expect } from '@playwright/test'
import {
  goOffline,
  goOnline,
  waitForServiceWorker,
  clearIndexedDB,
  getIndexedDBData,
  mockGeolocation,
  waitForNotification,
  login,
  isVisible,
  getQueueStatus,
} from './utils/test-helpers'
import { createTestImage, cleanupTestImages } from './fixtures/test-images'
import path from 'path'

// Test configuration
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com'
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123'
const TEST_IMAGE_PATH = path.join(__dirname, 'fixtures', 'test-photo.png')

test.describe('PWA Offline Workflow', () => {
  test.beforeAll(async () => {
    // Create test images
    await createTestImage(TEST_IMAGE_PATH)
  })

  test.afterAll(async () => {
    // Cleanup test images
    await cleanupTestImages(path.join(__dirname, 'fixtures'))
  })

  test.beforeEach(async ({ page }) => {
    // Login first (establishes security origin)
    await login(page, TEST_USER_EMAIL, TEST_USER_PASSWORD)

    // Now clear IndexedDB (needs security origin)
    await clearIndexedDB(page, 'RoofingSaaSOfflineQueue')

    // Wait for service worker
    await waitForServiceWorker(page)

    // Mock geolocation
    await mockGeolocation(page, 36.1699, -86.7842) // Nashville, TN
  })

  test('should register service worker on page load', async ({ page }) => {
    const hasServiceWorker = await page.evaluate(() => {
      return navigator.serviceWorker.controller !== null
    })

    expect(hasServiceWorker).toBe(true)
  })

  test('should show offline indicator when network is offline', async ({
    page,
  }) => {
    // Go offline
    await goOffline(page)

    // Check for offline indicator
    const offlineIndicatorVisible = await isVisible(
      page,
      '[data-testid="offline-indicator"]'
    )

    expect(offlineIndicatorVisible).toBe(true)

    // Go back online
    await goOnline(page)
  })

  test('should queue photo when offline', async ({ page }) => {
    // Navigate to photo upload page
    await page.goto('/en/photos/upload')

    // Go offline
    await goOffline(page)

    // Upload photo
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(TEST_IMAGE_PATH)

    // Wait for queue confirmation
    await waitForNotification(page, 'Photo saved - will upload when online')

    // Verify photo is in IndexedDB queue
    const queuedPhotos = await getIndexedDBData(
      page,
      'RoofingSaaSOfflineQueue',
      'queuedPhotos'
    )

    expect(queuedPhotos.length).toBe(1)
    expect(queuedPhotos[0].status).toBe('pending')

    // Go back online
    await goOnline(page)
  })

  test('should automatically upload queued photos when back online', async ({
    page,
  }) => {
    // Navigate to photo upload page
    await page.goto('/en/photos/upload')

    // Go offline
    await goOffline(page)

    // Upload photo
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(TEST_IMAGE_PATH)

    // Wait for queue confirmation
    await waitForNotification(page, 'Photo saved - will upload when online')

    // Verify photo is queued
    let queuedPhotos = await getIndexedDBData(
      page,
      'RoofingSaaSOfflineQueue',
      'queuedPhotos'
    )
    expect(queuedPhotos.length).toBe(1)
    expect(queuedPhotos[0].status).toBe('pending')

    // Go back online
    await goOnline(page)

    // Wait for automatic sync (Background Sync API or network listener)
    // Poll IndexedDB until pending photos are cleared
    await expect(async () => {
      const photos = await getIndexedDBData(page, 'RoofingSaaSOfflineQueue', 'queuedPhotos')
      const pending = photos.filter((p) => p.status === 'pending')
      expect(pending.length).toBe(0)
    }).toPass({ timeout: 10000 })

    // Verify photo was uploaded and marked as completed
    queuedPhotos = await getIndexedDBData(
      page,
      'RoofingSaaSOfflineQueue',
      'queuedPhotos'
    )

    // Photo should be marked as completed or removed from queue
    const pendingPhotos = queuedPhotos.filter((p) => p.status === 'pending')
    expect(pendingPhotos.length).toBe(0)
  })

  test('should show queue status UI with correct counts', async ({ page }) => {
    // Navigate to photo upload page
    await page.goto('/en/photos/upload')

    // Go offline
    await goOffline(page)

    // Upload 3 photos
    for (let i = 0; i < 3; i++) {
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles(TEST_IMAGE_PATH)
      // Wait for queue confirmation before next upload
      await waitForNotification(page, 'Photo saved').catch(() => {})
    }

    // Check queue status UI
    const queueStatus = await getQueueStatus(page)
    expect(queueStatus.pending).toBe(3)

    // Go back online
    await goOnline(page)
  })

  test('should handle manual sync trigger', async ({ page }) => {
    // Navigate to photo upload page
    await page.goto('/en/photos/upload')

    // Go offline
    await goOffline(page)

    // Upload photo
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(TEST_IMAGE_PATH)

    await waitForNotification(page, 'Photo saved - will upload when online')

    // Go back online
    await goOnline(page)

    // Find and click "Sync Now" button
    const syncButton = page.locator('button:has-text("Sync Now")')
    if (await syncButton.isVisible()) {
      await syncButton.click()

      // Wait for sync to complete by polling IndexedDB
      await expect(async () => {
        const photos = await getIndexedDBData(page, 'RoofingSaaSOfflineQueue', 'queuedPhotos')
        const pending = photos.filter((p) => p.status === 'pending')
        expect(pending.length).toBe(0)
      }).toPass({ timeout: 10000 })

      // Verify photo was uploaded
      const queuedPhotos = await getIndexedDBData(
        page,
        'RoofingSaaSOfflineQueue',
        'queuedPhotos'
      )
      const pendingPhotos = queuedPhotos.filter((p) => p.status === 'pending')
      expect(pendingPhotos.length).toBe(0)
    }
  })

  test('should retry failed uploads', async ({ page }) => {
    // Navigate to photo upload page
    await page.goto('/en/photos/upload')

    // Intercept upload API and make it fail
    await page.route('**/api/photos/upload', (route) => {
      route.abort('failed')
    })

    // Try to upload photo (will fail)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(TEST_IMAGE_PATH)

    // Wait for failure by polling IndexedDB for failed status
    await expect(async () => {
      const photos = await getIndexedDBData(page, 'RoofingSaaSOfflineQueue', 'queuedPhotos')
      const failed = photos.filter((p) => p.status === 'failed')
      expect(failed.length).toBeGreaterThan(0)
    }).toPass({ timeout: 10000 })

    // Verify photo is marked as failed
    let queuedPhotos = await getIndexedDBData(
      page,
      'RoofingSaaSOfflineQueue',
      'queuedPhotos'
    )
    const failedPhotos = queuedPhotos.filter((p) => p.status === 'failed')
    expect(failedPhotos.length).toBeGreaterThan(0)

    // Remove route interception (allow uploads to succeed)
    await page.unroute('**/api/photos/upload')

    // Click "Retry Failed" button
    const retryButton = page.locator('button:has-text("Retry Failed")')
    if (await retryButton.isVisible()) {
      await retryButton.click()

      // Wait for retry to complete by polling IndexedDB
      await expect(async () => {
        const photos = await getIndexedDBData(page, 'RoofingSaaSOfflineQueue', 'queuedPhotos')
        const failed = photos.filter((p) => p.status === 'failed')
        expect(failed.length).toBe(0)
      }).toPass({ timeout: 10000 })

      // Verify photo was successfully uploaded
      queuedPhotos = await getIndexedDBData(
        page,
        'RoofingSaaSOfflineQueue',
        'queuedPhotos'
      )
      const stillFailedPhotos = queuedPhotos.filter((p) => p.status === 'failed')
      expect(stillFailedPhotos.length).toBe(0)
    }
  })

  test('should capture geolocation with photos', async ({ page }) => {
    // Navigate to photo upload page
    await page.goto('/en/photos/upload')

    // Go offline
    await goOffline(page)

    // Upload photo
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(TEST_IMAGE_PATH)

    await waitForNotification(page, 'Photo saved - will upload when online')

    // Verify photo has geolocation data
    const queuedPhotos = await getIndexedDBData(
      page,
      'RoofingSaaSOfflineQueue',
      'queuedPhotos'
    )

    expect(queuedPhotos.length).toBe(1)
    expect(queuedPhotos[0].metadata.latitude).toBeDefined()
    expect(queuedPhotos[0].metadata.longitude).toBeDefined()
    expect(queuedPhotos[0].metadata.latitude).toBeCloseTo(36.1699, 2)
    expect(queuedPhotos[0].metadata.longitude).toBeCloseTo(-86.7842, 2)

    // Go back online
    await goOnline(page)
  })

  test('should compress images before queueing', async ({ page }) => {
    // Navigate to photo upload page
    await page.goto('/en/photos/upload')

    // Go offline
    await goOffline(page)

    // Upload photo
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(TEST_IMAGE_PATH)

    // Wait for compression message
    await page.waitForSelector('text=/Compressed \\d+%/')

    // Verify photo was compressed
    const queuedPhotos = await getIndexedDBData(
      page,
      'RoofingSaaSOfflineQueue',
      'queuedPhotos'
    )

    expect(queuedPhotos.length).toBe(1)
    expect(queuedPhotos[0].metadata.notes).toContain('Compressed')

    // Go back online
    await goOnline(page)
  })

  test('should handle camera photo capture', async ({ page, context }) => {
    // Grant camera permissions
    await context.grantPermissions(['camera'])

    // Navigate to photo upload page
    await page.goto('/en/photos/upload')

    // Note: Actual camera testing requires a real device
    // This test verifies the UI is present
    const cameraButton = page.locator('button:has-text("Take Photo")')
    expect(await cameraButton.isVisible()).toBe(true)
  })

  test('should show offline fallback page when navigating offline', async ({
    page,
  }) => {
    // Go offline
    await goOffline(page)

    // Try to navigate to a new page
    await page.goto('/en/contacts')

    // Should show offline page
    const offlinePageVisible = await isVisible(
      page,
      'text=/You.*re Offline/'
    )

    expect(offlinePageVisible).toBe(true)

    // Go back online
    await goOnline(page)
  })
})

test.describe('PWA Installation', () => {
  test('should be installable as PWA', async ({ page }) => {
    await page.goto('/')

    // Check for manifest
    const manifestLink = await page.locator('link[rel="manifest"]')
    expect(await manifestLink.count()).toBe(1)

    // Check manifest URL
    const manifestHref = await manifestLink.getAttribute('href')
    expect(manifestHref).toBe('/manifest.json')

    // Fetch and validate manifest
    const response = await page.request.get('/manifest.json')
    expect(response.ok()).toBe(true)

    const manifest = await response.json()
    expect(manifest.name).toBeDefined()
    expect(manifest.short_name).toBeDefined()
    expect(manifest.start_url).toBeDefined()
    expect(manifest.display).toBe('standalone')
    expect(manifest.icons).toBeDefined()
    expect(manifest.icons.length).toBeGreaterThan(0)
  })

  test('should have service worker with correct scope', async ({ page }) => {
    await page.goto('/')
    await waitForServiceWorker(page)

    const swScope = await page.evaluate(() => {
      return navigator.serviceWorker.controller?.scriptURL
    })

    expect(swScope).toContain('/sw.js')
  })
})
