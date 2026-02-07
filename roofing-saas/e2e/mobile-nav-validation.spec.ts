/**
 * Mobile Navigation Validation
 *
 * Quick validation that the Instagram-style bottom nav is working
 * with the correct business workflow buttons.
 *
 * IMPORTANT: Must enable Instagram nav style in settings for the
 * FieldWorkerLayoutIG to render with the bottom nav.
 */

import { test, expect } from '@playwright/test'

test.describe('Mobile Navigation Validation', () => {
  test.use({
    viewport: { width: 375, height: 812 }, // iPhone X dimensions
  })

  test('can enable Instagram nav style and see bottom nav', async ({ page }) => {
    // Step 1: Go to settings
    await page.goto('/en/settings')
    await page.waitForLoadState('networkidle')

    // Step 2: Click on the Appearance tab to see nav style options
    const appearanceTab = page.getByRole('tab', { name: /appearance/i })
    await expect(appearanceTab).toBeVisible({ timeout: 10000 })
    await appearanceTab.click()
    // Wait for Appearance tab content to render
    await expect(
      page.locator('#nav-instagram').or(page.locator('input[type="radio"][value="instagram"]'))
    ).toBeVisible({ timeout: 5000 })
    console.log('✓ Clicked Appearance tab')

    // Step 3: Find and click on Field mode radio button
    const fieldModeRadio = page.locator('input[type="radio"][value="field"]')
      .or(page.getByLabel(/field/i).locator('input[type="radio"]'))

    if (await fieldModeRadio.isVisible()) {
      await fieldModeRadio.click({ force: true })
      console.log('✓ Selected Field mode')
    }

    // Step 4: Find and click on Instagram nav style radio button
    const instagramRadio = page.locator('#nav-instagram')
      .or(page.locator('input[type="radio"][value="instagram"]'))

    await expect(instagramRadio).toBeVisible({ timeout: 5000 })
    await instagramRadio.click({ force: true })
    console.log('✓ Selected Instagram nav style')

    // Wait for preference to save to DB
    await page.waitForResponse(
      resp => resp.url().includes('/api/') && resp.request().method() !== 'GET',
      { timeout: 5000 }
    ).catch(() => {})

    // Step 5: Navigate to dashboard
    await page.goto('/en/dashboard')
    await page.waitForLoadState('networkidle')

    // Step 6: Verify the bottom navigation is visible with correct buttons
    const bottomNav = page.locator('nav[aria-label="Bottom navigation"]')
    await expect(bottomNav).toBeVisible({ timeout: 15000 })
    console.log('✓ Bottom navigation visible')

    // Check for the correct navigation buttons in bottom nav using testIds
    // Should be: Pipeline, Signatures, Voice, Knock, Claims
    const navItems = [
      { testId: 'nav-tab-pipeline', label: 'Pipeline' },
      { testId: 'nav-tab-signatures', label: 'Signatures' },
      { testId: 'voice-assistant-button', label: 'Voice' },
      { testId: 'nav-tab-knock', label: 'Knock' },
      { testId: 'nav-tab-claims', label: 'Claims' },
    ]

    for (const item of navItems) {
      const navItem = page.getByTestId(item.testId)
      await expect(navItem).toBeVisible({ timeout: 5000 })
      console.log(`✓ Found nav button: ${item.label}`)
    }

    // Verify OLD social-style labels are NOT present in the bottom nav
    const oldLabels = ['Home', 'Search', 'Activity', 'Profile']
    for (const label of oldLabels) {
      const oldItem = bottomNav.getByText(label, { exact: true })
      await expect(oldItem).not.toBeVisible()
      console.log(`✓ Old nav button NOT present: ${label}`)
    }
  })

  test('top bar has notifications and settings buttons (Instagram mode)', async ({ page }) => {
    // This test runs AFTER the first test which enables Instagram mode
    // So the session should already have Instagram nav style set
    await page.goto('/en/dashboard')
    await page.waitForLoadState('networkidle')

    // In Instagram layout, the top bar has Notifications and Settings buttons
    const notificationsButton = page.getByRole('button', { name: /notifications/i })
    const settingsButton = page.getByRole('button', { name: /settings/i })

    await expect(notificationsButton).toBeVisible({ timeout: 10000 })
    await expect(settingsButton).toBeVisible({ timeout: 10000 })
    console.log('✓ Top bar has Notifications and Settings buttons')
  })

  test('AI assistant bar is visible at bottom', async ({ page }) => {
    await page.goto('/en/dashboard')
    await page.waitForLoadState('networkidle')

    // Look for AI assistant bar with "Ask anything..." button
    const aiAssistantBar = page.getByRole('button', { name: /ask anything/i })

    await expect(aiAssistantBar).toBeVisible({ timeout: 10000 })
    console.log('✓ AI assistant bar visible')
  })

  test('voice button is present in bottom nav', async ({ page }) => {
    await page.goto('/en/dashboard')
    await page.waitForLoadState('networkidle')

    // Find voice button (center of bottom nav)
    const voiceButton = page.getByTestId('voice-assistant-button')

    await expect(voiceButton).toBeVisible({ timeout: 10000 })

    // Verify it has the correct aria-label
    await expect(voiceButton).toHaveAttribute('aria-label', /voice/i)
    console.log('✓ Voice button present in bottom nav')
  })
})
