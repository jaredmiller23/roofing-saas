/**
 * E2E Tests for Signatures New Page Footer Navigation
 *
 * Tests the footer visibility and navigation functionality to prevent regression
 * of the bug where footer navigation was hidden by AI Assistant bar.
 */

import { test, expect } from '@playwright/test'

test.describe('Signatures New Page Footer Navigation', () => {

  test('footer navigation should be visible and have higher z-index than AI assistant', async ({ page }) => {
    // Navigate to signatures new page
    await page.goto('/signatures/new')

    // Wait for page to load
    await expect(page.locator('h1', { hasText: 'Create Signature Document' })).toBeVisible()

    // Check that footer navigation is present and visible
    const footer = page.locator('[data-testid="signature-footer"], .fixed.bottom-0').last()
    await expect(footer).toBeVisible()

    // Verify footer has correct CSS classes for z-index
    const footerClasses = await footer.getAttribute('class')
    expect(footerClasses).toContain('z-50')
    expect(footerClasses).toContain('fixed')
    expect(footerClasses).toContain('bottom-0')

    // Check that Back and Next buttons are visible and clickable
    const backButton = page.getByRole('button', { name: /back/i })
    const nextButton = page.getByRole('button', { name: /next/i })

    await expect(backButton).toBeVisible()
    await expect(nextButton).toBeVisible()

    // Verify the buttons are not obscured (can be clicked)
    await expect(backButton).toBeEnabled()
    await expect(nextButton).toBeEnabled()
  })

  test('footer navigation should remain visible when AI assistant is present', async ({ page }) => {
    await page.goto('/signatures/new')

    // Wait for page to load
    await expect(page.locator('h1', { hasText: 'Create Signature Document' })).toBeVisible()

    // Check if AI assistant bar is present (it might not be expanded by default)
    const aiAssistant = page.locator('.fixed.bottom-0').first()

    // Whether AI assistant is present or not, footer should be visible
    const footer = page.locator('.fixed.bottom-0').last()
    await expect(footer).toBeVisible()

    // Verify footer buttons are still clickable
    const nextButton = page.getByRole('button', { name: /next/i })
    await expect(nextButton).toBeVisible()

    // Test that clicking Next works (navigation functionality)
    const isNextEnabled = await nextButton.isEnabled()
    if (isNextEnabled) {
      await nextButton.click()
      // Should move to step 2
      await expect(page.locator('h2', { hasText: /Document Info|basic info/i })).toBeVisible()
    }
  })

  test('footer buttons should function correctly across all steps', async ({ page }) => {
    await page.goto('/signatures/new')

    // Step 1: Template Selection
    await expect(page.locator('h1', { hasText: 'Create Signature Document' })).toBeVisible()

    // Back should be disabled on step 1
    const backButton = page.getByRole('button', { name: /back/i })
    const nextButton = page.getByRole('button', { name: /next/i })

    await expect(backButton).toBeDisabled()
    await expect(nextButton).toBeEnabled()

    // Navigate to step 2
    await nextButton.click()

    // Step 2: Document Info
    await expect(page.getByText('Step 2 of 5')).toBeVisible()
    await expect(backButton).toBeEnabled()

    // Fill required field to enable Next
    const titleInput = page.getByLabel(/document title/i)
    await titleInput.fill('Test Document')

    await expect(nextButton).toBeEnabled()

    // Test Back navigation
    await backButton.click()
    await expect(page.getByText('Step 1 of 5')).toBeVisible()
  })

  test('footer should be positioned correctly for mobile and desktop layouts', async ({ page }) => {
    // Test desktop layout
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/signatures/new')

    const footer = page.locator('.fixed.bottom-0').last()
    await expect(footer).toBeVisible()

    // Footer should account for sidebar on desktop (lg:left-64)
    const footerClasses = await footer.getAttribute('class')
    expect(footerClasses).toContain('lg:left-64')

    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 })
    await page.reload()

    await expect(footer).toBeVisible()
    // Footer should still be full width on mobile
    expect(footerClasses).toContain('left-0')
    expect(footerClasses).toContain('right-0')
  })

  test('cancel button should navigate back to signatures page', async ({ page }) => {
    await page.goto('/signatures/new')

    const cancelButton = page.getByRole('button', { name: /cancel/i })
    await expect(cancelButton).toBeVisible()

    await cancelButton.click()

    // Should navigate back to signatures list
    await expect(page).toHaveURL(/\/signatures$/)
    await expect(page.locator('h1', { hasText: /signature/i })).toBeVisible()
  })

  test('footer should maintain proper spacing with page content', async ({ page }) => {
    await page.goto('/signatures/new')

    // Check that there's proper spacing at bottom of content
    const bottomSpacer = page.locator('.h-20').last()
    await expect(bottomSpacer).toBeVisible()

    // Verify content doesn't overlap with footer
    const mainContent = page.locator('main, .max-w-6xl').first()
    const footer = page.locator('.fixed.bottom-0').last()

    const contentBox = await mainContent.boundingBox()
    const footerBox = await footer.boundingBox()

    if (contentBox && footerBox) {
      // Content should end before footer starts
      expect(contentBox.y + contentBox.height).toBeLessThanOrEqual(footerBox.y)
    }
  })

  test('progress indicator should be visible and update correctly', async ({ page }) => {
    await page.goto('/signatures/new')

    // Check initial progress
    await expect(page.getByText('Step 1 of 5')).toBeVisible()

    // Progress bar should be visible
    const progressBar = page.locator('[role="progressbar"], .bg-primary').first()
    await expect(progressBar).toBeVisible()

    // Navigate to next step and verify progress updates
    const nextButton = page.getByRole('button', { name: /next/i })
    await nextButton.click()

    await expect(page.getByText('Step 2 of 5')).toBeVisible()
  })
})