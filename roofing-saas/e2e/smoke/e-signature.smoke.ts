/**
 * E-Signature Module - Smoke Tests
 *
 * SMOKE-005: Verify e-signature and document signing work on production
 * E-signature is critical for closing deals - customers sign contracts digitally
 *
 * Success Criteria:
 * - Signatures list page loads
 * - Signature statistics (sent, pending, signed) display
 * - New document form loads
 * - Templates page loads
 * - Template editor loads
 * - Document detail page loads
 * - Send for signature UI is accessible
 */

import { test, expect } from '@playwright/test'

test.describe('E-Signature Module - Smoke Tests', () => {

  test.describe('Unauthenticated Access', () => {
    // Use empty storage state to test without authentication
    test.use({ storageState: { cookies: [], origins: [] } })

    test('should redirect /signatures to login when unauthenticated', async ({ page }) => {
      await page.goto('/signatures')

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/)

      // Verify login page rendered properly
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
    })

    test('should redirect /signatures/new to login when unauthenticated', async ({ page }) => {
      await page.goto('/signatures/new')

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/)
    })

    test('should redirect /signatures/templates to login when unauthenticated', async ({ page }) => {
      await page.goto('/signatures/templates')

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Authenticated E-Signature Access', () => {
    // Uses default authenticated storage state

    test('should load signatures list page', async ({ page }) => {
      await page.goto('/signatures')

      // Should stay on signatures page (not redirect to login)
      await expect(page).toHaveURL(/\/signatures/)

      // Should show the signatures page header
      await expect(page.getByRole('heading', { name: /Signatures|Documents/ })).toBeVisible()
    })

    test('should display signature statistics', async ({ page }) => {
      await page.goto('/signatures')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Signatures|Documents/ })).toBeVisible()

      // Should show signature statistics - look for numbers and common labels
      const statisticsSection = page.locator('[data-testid="signature-stats"], [data-testid="signature-statistics"], .statistics, .stats')

      // Try to find statistics in different possible locations
      const hasPendingStats = await page.getByText(/pending.*\d+|\d+.*pending/i).isVisible()
      const hasSentStats = await page.getByText(/sent.*\d+|\d+.*sent/i).isVisible()
      const hasSignedStats = await page.getByText(/signed.*\d+|\d+.*signed|completed.*\d+|\d+.*completed/i).isVisible()
      const hasStatsSection = await statisticsSection.isVisible()

      // At least one form of statistics should be visible
      expect(hasPendingStats || hasSentStats || hasSignedStats || hasStatsSection).toBeTruthy()
    })

    test('should load new document form', async ({ page }) => {
      await page.goto('/signatures/new')

      // Should stay on new document page
      await expect(page).toHaveURL(/\/signatures\/new/)

      // Should show form elements for creating a new document
      await expect(page.getByRole('heading', { name: /New Document|Create Document|New Signature/ })).toBeVisible()

      // Should have basic form inputs
      const hasDocumentTitle = await page.locator('input[name="title"], input[placeholder*="title"], input[placeholder*="name"]').isVisible()
      const hasRecipientField = await page.locator('[data-testid*="recipient"], input[placeholder*="recipient"], input[placeholder*="email"]').isVisible()

      expect(hasDocumentTitle || hasRecipientField).toBeTruthy()
    })

    test('should access new document form from signatures page', async ({ page }) => {
      await page.goto('/signatures')

      // Look for "New Document" or "Create" button
      const newDocButton = page.getByRole('button', { name: /New Document|Create Document|New|Add Document/ })

      if (await newDocButton.isVisible()) {
        await newDocButton.click()

        // Should navigate to new document page
        await expect(page).toHaveURL(/\/signatures\/new|\/signatures\/create/)

        // Should show new document form
        await expect(page.getByRole('heading', { name: /New Document|Create Document|New Signature/ })).toBeVisible()
      }
    })

    test('should load templates page', async ({ page }) => {
      await page.goto('/signatures/templates')

      // Should stay on templates page
      await expect(page).toHaveURL(/\/signatures\/templates/)

      // Should show the templates page header
      await expect(page.getByRole('heading', { name: /Templates|Document Templates/ })).toBeVisible()
    })

    test('should access templates from signatures navigation', async ({ page }) => {
      await page.goto('/signatures')

      // Look for templates navigation link
      const templatesLink = page.getByRole('link', { name: /Templates|Document Templates/ }).or(
        page.getByRole('button', { name: /Templates|Document Templates/ })
      ).or(
        page.locator('nav').getByText(/Templates/)
      )

      if (await templatesLink.isVisible()) {
        await templatesLink.click()

        // Should navigate to templates page
        await expect(page).toHaveURL(/\/signatures\/templates/)

        // Should show templates content
        await expect(page.getByRole('heading', { name: /Templates|Document Templates/ })).toBeVisible()
      }
    })

    test('should load template editor when creating/editing template', async ({ page }) => {
      await page.goto('/signatures/templates')

      // Look for "New Template" or "Create Template" button
      const newTemplateButton = page.getByRole('button', { name: /New Template|Create Template|Add Template/ })

      if (await newTemplateButton.isVisible()) {
        await newTemplateButton.click()

        // Should show template editor
        await expect(page).toHaveURL(/\/signatures\/templates\/new|\/signatures\/templates\/create|\/signatures\/templates\/edit/)

        // Should show template editor interface
        const hasTemplateEditor = await page.getByRole('heading', { name: /Template Editor|Edit Template|New Template/ }).isVisible()
        const hasEditorInterface = await page.locator('[data-testid="template-editor"], .template-editor, canvas, [contenteditable]').isVisible()

        expect(hasTemplateEditor || hasEditorInterface).toBeTruthy()
      }
    })

    test('should open document detail page when clicking document', async ({ page }) => {
      await page.goto('/signatures')

      // Wait for signatures page to load
      await expect(page.getByRole('heading', { name: /Signatures|Documents/ })).toBeVisible()

      // Try to find a document card or row to click
      const documentItem = page.locator('[data-testid*="document"], [data-testid*="signature"], .document-card, .document-row, tr').first()

      // Only test if a document exists
      if (await documentItem.count() > 0) {
        // Click on the first document
        await documentItem.click()

        // Should navigate to document detail page
        await expect(page).toHaveURL(/\/signatures\/[^\/]+/)

        // Should show document detail content
        const hasDetailPage = await page.getByTestId('document-detail').isVisible()
        const hasDocumentContent = await page.getByRole('heading').first().isVisible()

        expect(hasDetailPage || hasDocumentContent).toBeTruthy()
      }
    })

    test('should display send for signature UI in document detail', async ({ page }) => {
      // First navigate to signatures page
      await page.goto('/signatures')
      await expect(page.getByRole('heading', { name: /Signatures|Documents/ })).toBeVisible()

      // Find and click a document if one exists
      const documentItem = page.locator('[data-testid*="document"], [data-testid*="signature"], .document-card, .document-row, tr').first()

      if (await documentItem.count() > 0) {
        await documentItem.click()

        // Wait for document detail page
        await expect(page).toHaveURL(/\/signatures\/[^\/]+/)

        // Look for send for signature functionality
        const sendButton = page.getByRole('button', { name: /Send.*Signature|Send.*Sign|Send Document|Share|Send/ })
        const sendLink = page.getByRole('link', { name: /Send.*Signature|Send.*Sign|Send Document/ })
        const sendUI = page.locator('[data-testid*="send"], .send-signature, .share-document')

        const hasSendButton = await sendButton.isVisible()
        const hasSendLink = await sendLink.isVisible()
        const hasSendUI = await sendUI.isVisible()

        // At least one send functionality should be accessible
        expect(hasSendButton || hasSendLink || hasSendUI).toBeTruthy()
      }
    })

    test('should handle empty state gracefully', async ({ page }) => {
      await page.goto('/signatures')

      // Wait for signatures page to load
      await expect(page.getByRole('heading', { name: /Signatures|Documents/ })).toBeVisible()

      // Should handle empty state gracefully
      const hasDocuments = await page.locator('[data-testid*="document"], [data-testid*="signature"], .document-card, .document-row').count() > 0
      const hasEmptyState = await page.getByText(/No documents|No signatures|Get started|Create your first|Empty/i).isVisible()

      // Should show either documents or a proper empty state
      expect(hasDocuments || hasEmptyState).toBeTruthy()
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Set up console error listener
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      // Navigate to signatures page
      const response = await page.goto('/signatures', { waitUntil: 'networkidle' })

      // Check HTTP response is not server error
      expect(response?.status()).not.toBe(500)
      expect(response?.status()).toBeLessThan(500)

      // Page should load without critical errors
      await expect(page).toHaveURL(/\/signatures/)

      // Filter out expected/harmless errors (like Sentry transport warnings)
      const criticalErrors = errors.filter(e =>
        !e.includes('Sentry') &&
        !e.includes('Transport disabled') &&
        !e.includes('favicon') &&
        !e.includes('manifest')
      )

      expect(criticalErrors.length).toBe(0)
    })

    test('should handle invalid document URLs gracefully', async ({ page }) => {
      // Try to access a non-existent document
      await page.goto('/signatures/invalid-document-id-12345')

      // Should handle gracefully - either redirect to list or show error page
      const isOnSignaturesPage = page.url().includes('/signatures') && !page.url().includes('/invalid-document-id-12345')
      const hasErrorMessage = await page.getByText(/not found|error|invalid|does not exist/i).isVisible()

      // Should either redirect back to signatures or show proper error
      expect(isOnSignaturesPage || hasErrorMessage).toBeTruthy()
    })
  })
})
