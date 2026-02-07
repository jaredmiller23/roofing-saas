/**
 * Signatures API Regression Test
 *
 * Tests the fix for "failed to fetch sig docs" error when accessing /signatures page.
 * This test ensures the signature_documents table exists and the API endpoint works correctly.
 *
 * Issue Fixed: ACES Task 907FD2A1-FIXSIGNA001
 */

import { test, expect } from '@playwright/test'

test.describe('Signatures API Regression Tests', () => {
  // Tests use storageState authentication from playwright.config.ts
  // No manual login needed - already authenticated via setup project

  test('should successfully fetch signature documents via API', async ({ page }) => {
    // Make API request to the signatures endpoint
    const response = await page.request.get('/api/signature-documents')

    // Should return 200 OK (no longer "failed to fetch sig docs")
    expect(response.ok()).toBe(true)
    expect(response.status()).toBe(200)

    // Response should be valid JSON with expected structure
    const responseBody = await response.json()
    expect(responseBody).toHaveProperty('success', true)
    expect(responseBody).toHaveProperty('data')
    expect(responseBody.data).toHaveProperty('documents')
    expect(Array.isArray(responseBody.data.documents)).toBe(true)
  })

  test('should load signatures page without error', async ({ page }) => {
    // Navigate to signatures page
    await page.goto('/en/signatures')

    // Should not show "failed to fetch sig docs" error
    const errorMessage = page.locator('text=/failed to fetch|fetch.*failed|error.*fetch/i')
    await expect(errorMessage).toHaveCount(0)

    // Should show the signatures page title (be more specific to avoid multiple h1s)
    await expect(page.locator('h1:has-text("E-Signatures")')).toBeVisible()

    // Should show either the documents list or empty state, but not an error
    const loadingIndicator = page.locator('text=/loading/i')
    const documentsContainer = page.locator('[data-testid="documents-list"], .space-y-4')
    const emptyState = page.locator('text=/no documents/i')

    // Wait for loading to complete
    await expect(loadingIndicator).toHaveCount(0, { timeout: 10000 })

    // Should show either documents or empty state
    const hasDocuments = await documentsContainer.count() > 0
    const hasEmptyState = await emptyState.count() > 0

    expect(hasDocuments || hasEmptyState).toBe(true)
  })

  test('should handle API filters correctly', async ({ page }) => {
    // Test with status filter
    const response = await page.request.get('/api/signature-documents?status=draft')

    expect(response.ok()).toBe(true)
    const responseBody = await response.json()
    expect(responseBody.success).toBe(true)
    expect(responseBody.data).toHaveProperty('documents')
  })

  test('should handle pagination parameters', async ({ page }) => {
    // Test with limit and offset
    const response = await page.request.get('/api/signature-documents?limit=10&offset=0')

    expect(response.ok()).toBe(true)
    const responseBody = await response.json()
    expect(responseBody.success).toBe(true)
    expect(responseBody.data).toHaveProperty('documents')
    expect(responseBody.data).toHaveProperty('limit', 10)
    expect(responseBody.data).toHaveProperty('offset', 0)
  })

  test('should ensure table exists and query structure is correct', async ({ page }) => {
    // This test verifies the core fix: ensuring the signature_documents table exists
    // and has the correct structure that the API expects
    const response = await page.request.get('/api/signature-documents?limit=1')

    expect(response.ok()).toBe(true)
    const responseBody = await response.json()

    // The response structure should match what the frontend expects
    expect(responseBody.success).toBe(true)
    expect(responseBody.data).toHaveProperty('documents')
    expect(responseBody.data).toHaveProperty('total')
    expect(responseBody.data).toHaveProperty('limit', 1)
    expect(responseBody.data).toHaveProperty('offset', 0)
  })
})