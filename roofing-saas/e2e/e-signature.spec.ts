/**
 * E-Signature Workflow E2E Tests
 * Tests document creation, signing flow, and completion
 */

import { test, expect } from '@playwright/test'
import { waitForNotification, waitForNetworkIdle } from './utils/test-helpers'

test.describe('E-Signature Workflow', () => {
  // Tests use storageState authentication from playwright.config.ts
  // No manual login needed - already authenticated via setup project

  test('should create a new signature document', async ({ page }) => {
    // Navigate to signatures page
    await page.goto('/signatures')
    await expect(page).toHaveTitle(/Signatures/i)

    // Click "New Document" button
    await page.click('text=New Document')
    await page.waitForURL('/signatures/new')

    // Fill in document details
    await page.fill('input[name="title"]', 'Test Contract - E2E')
    await page.fill('textarea[name="description"]', 'End-to-end test contract document')

    // Select contact/recipient
    await page.click('[data-testid="recipient-select"]')
    await page.click('text=John Doe') // Assuming test data exists

    // Add signature fields
    await page.locator('button', { hasText: 'Add Signature Field' }).click()
    await page.locator('button', { hasText: 'Add Date Field' }).click()

    // Save document
    await page.locator('button', { hasText: 'Create Document' }).click()

    // Should show success notification
    await waitForNotification(page, 'Document created successfully')

    // Should redirect to documents list
    await page.waitForURL('/signatures')

    // Document should appear in list
    const documentCard = page.locator('text=Test Contract - E2E')
    await expect(documentCard).toBeVisible()
  })

  test('should display document in pending status', async ({ page }) => {
    await page.goto('/signatures')

    // Find a pending document
    const pendingDoc = page.locator('[data-status="pending"]').first()
    await expect(pendingDoc).toBeVisible()

    // Should show "Awaiting Signature" status
    const statusBadge = pendingDoc.locator('[data-testid="status-badge"]')
    await expect(statusBadge).toContainText(/pending|awaiting/i)
  })

  test('should send document for signature', async ({ page }) => {
    await page.goto('/signatures')

    // Create and send a document
    await page.click('text=New Document')
    await page.fill('input[name="title"]', 'Contract for Signing')
    await page.click('[data-testid="recipient-select"]')
    await page.locator('[role="option"]', { hasText: 'Jane Smith' }).click()
    await page.locator('button', { hasText: 'Create & Send' }).click()

    // Should show email sent confirmation
    await page.waitForSelector('text=/sent|email/i', { timeout: 5000 })

    // Document should show as sent
    const sentDoc = page.locator('text=Contract for Signing')
    const status = sentDoc.locator('[data-testid="status-badge"]')
    await expect(status).toContainText(/sent|pending/i)
  })

  test('should sign a document', async ({ page }) => {
    // This would typically be done by the recipient
    // For testing, we navigate to a signing link directly

    // Assuming we have a test document with a signing token
    const testSigningToken = 'test-token-12345'
    await page.goto(`/signatures/sign/${testSigningToken}`)

    // Should see the document content
    const documentTitle = page.locator('h1')
    await expect(documentTitle).toBeVisible()

    // Click to start signing
    await page.click('button:has-text("Start Signing")')

    // Sign the signature field
    const signatureCanvas = page.locator('canvas[data-testid="signature-canvas"]')
    await expect(signatureCanvas).toBeVisible()

    // Draw a simple signature (simulate mouse movement)
    const box = await signatureCanvas.boundingBox()
    if (box) {
      await page.mouse.move(box.x + 50, box.y + 50)
      await page.mouse.down()
      await page.mouse.move(box.x + 150, box.y + 50)
      await page.mouse.move(box.x + 150, box.y + 100)
      await page.mouse.up()
    }

    // Accept and submit signature
    await page.click('button:has-text("Accept Signature")')
    await page.click('button:has-text("Submit Document")')

    // Should show completion message
    await page.waitForSelector('text=/completed|signed/i', { timeout: 5000 })

    // Should show success page
    await expect(page.locator('text=Document Signed Successfully')).toBeVisible()
  })

  test('should download completed document', async ({ page }) => {
    await page.goto('/signatures')

    // Find a completed document
    const completedDoc = page.locator('[data-status="completed"]').first()

    // Click download button
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      completedDoc.locator('button:has-text("Download")').click()
    ])

    // Verify download
    expect(download.suggestedFilename()).toMatch(/\.pdf$/)

    // Save the download to verify it exists
    const path = await download.path()
    expect(path).toBeTruthy()
  })

  test('should validate signature before submission', async ({ page }) => {
    const testToken = 'test-token-validation'
    await page.goto(`/signatures/sign/${testToken}`)

    await page.click('button:has-text("Start Signing")')

    // Try to submit without signing
    await page.click('button:has-text("Submit Document")')

    // Should show validation error
    await expect(page.locator('text=/signature.*required/i')).toBeVisible()

    // Should prevent submission
    await expect(page).toHaveURL(new RegExp(`/sign/${testToken}`))
  })

  test('should track signature completion status', async ({ page }) => {
    await page.goto('/signatures')

    // Check statistics
    const stats = page.locator('[data-testid="signature-stats"]')
    await expect(stats).toBeVisible()

    // Should show counts
    const pendingCount = stats.locator('[data-testid="pending-count"]')
    const completedCount = stats.locator('[data-testid="completed-count"]')

    await expect(pendingCount).toHaveText(/\d+/)
    await expect(completedCount).toHaveText(/\d+/)
  })

  test('should handle expired signing links', async ({ page }) => {
    const expiredToken = 'expired-token-12345'
    await page.goto(`/signatures/sign/${expiredToken}`)

    // Should show error message
    await expect(page.locator('text=/expired|no longer valid/i')).toBeVisible()

    // Should not show signing interface
    await expect(page.locator('canvas[data-testid="signature-canvas"]')).not.toBeVisible()
  })

  test('should support multiple signers', async ({ page }) => {
    await page.goto('/signatures/new')

    // Create document with multiple signers
    await page.fill('input[name="title"]', 'Multi-Signer Contract')

    // Add first signer
    await page.click('[data-testid="add-signer"]')
    await page.fill('[data-testid="signer-0-email"]', 'signer1@example.com')
    await page.fill('[data-testid="signer-0-name"]', 'Signer One')

    // Add second signer
    await page.click('[data-testid="add-signer"]')
    await page.fill('[data-testid="signer-1-email"]', 'signer2@example.com')
    await page.fill('[data-testid="signer-1-name"]', 'Signer Two')

    // Create document
    await page.click('button:has-text("Create Document")')

    await waitForNotification(page, 'Document created')

    // Should show both signers in document details
    await page.click('text=Multi-Signer Contract')
    await expect(page.locator('text=Signer One')).toBeVisible()
    await expect(page.locator('text=Signer Two')).toBeVisible()
    await expect(page.locator('[data-testid="signer-status"]')).toHaveCount(2)
  })
})
