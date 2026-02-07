/**
 * Contact Edit & Delete E2E Tests
 *
 * Tests for contact detail page, edit flow, and delete flow.
 * Complements contacts.spec.ts which covers Create/Read.
 * Uses authenticated session from playwright setup.
 */

import { test, expect } from '@playwright/test'

const generateUniqueEmail = () =>
  `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`

test.describe('Contact Edit & Delete Operations', () => {
  test.use({ storageState: 'playwright/.auth/user.json' })

  test.describe('Contact Detail Page', () => {
    test('should display contact info sections and action buttons', async ({ page }) => {
      const firstName = `Detail${Date.now()}`
      const lastName = 'Verify'

      // Create a contact first
      await page.goto('/en/contacts/new')
      await expect(page.locator('#first_name')).toBeVisible({ timeout: 10000 })
      await page.locator('#first_name').fill(firstName)
      await page.locator('#last_name').fill(lastName)
      await page.locator('#email').fill(generateUniqueEmail())
      await page.locator('#phone').fill('555-000-1111')
      await page.getByRole('button', { name: 'Create Contact' }).click()
      await page.waitForURL(/\/contacts\/[a-f0-9-]{36}$/, { timeout: 20000 })

      // Verify header shows contact name
      await expect(page.locator('h1').filter({ hasText: firstName })).toBeVisible({ timeout: 10000 })

      // Verify Contact Information section
      await expect(page.locator('h2').filter({ hasText: 'Contact Information' })).toBeVisible()

      // Verify action buttons: Edit, Delete, Back
      await expect(page.getByRole('link', { name: /Edit/ })).toBeVisible()
      await expect(page.getByRole('button', { name: /Delete/ })).toBeVisible()
      await expect(page.locator('a[href="/contacts"]').filter({ hasText: 'Back' })).toBeVisible()
    })

    test('should show workflow guidance when no projects exist', async ({ page }) => {
      const firstName = `Workflow${Date.now()}`

      // Create a fresh contact (no projects)
      await page.goto('/en/contacts/new')
      await expect(page.locator('#first_name')).toBeVisible({ timeout: 10000 })
      await page.locator('#first_name').fill(firstName)
      await page.locator('#last_name').fill('Guide')
      await page.locator('#email').fill(generateUniqueEmail())
      await page.getByRole('button', { name: 'Create Contact' }).click()
      await page.waitForURL(/\/contacts\/[a-f0-9-]{36}$/, { timeout: 20000 })

      // Should show workflow guidance banner
      await expect(
        page.locator('h3').filter({ hasText: 'Next Step: Create a Project' })
      ).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Contact Edit', () => {
    test('should navigate to edit page with pre-filled data', async ({ page }) => {
      const firstName = `EditNav${Date.now()}`
      const lastName = 'Original'

      // Create a contact
      await page.goto('/en/contacts/new')
      await expect(page.locator('#first_name')).toBeVisible({ timeout: 10000 })
      await page.locator('#first_name').fill(firstName)
      await page.locator('#last_name').fill(lastName)
      await page.locator('#email').fill(generateUniqueEmail())
      await page.getByRole('button', { name: 'Create Contact' }).click()
      await page.waitForURL(/\/contacts\/[a-f0-9-]{36}$/, { timeout: 20000 })

      // Click Edit
      await page.getByRole('link', { name: /Edit/ }).click()
      await page.waitForURL(/\/contacts\/[a-f0-9-]+\/edit/, { timeout: 10000 })

      // Verify edit page heading
      await expect(page.locator('h1').filter({ hasText: 'Edit Contact' })).toBeVisible({ timeout: 10000 })

      // Verify form fields are pre-filled
      await expect(page.locator('#first_name')).toHaveValue(firstName)
      await expect(page.locator('#last_name')).toHaveValue(lastName)

      // Verify Update Contact button exists
      await expect(page.getByRole('button', { name: 'Update Contact' })).toBeVisible()
    })

    test('should edit a contact and verify changes', async ({ page }) => {
      const firstName = `Edit${Date.now()}`
      const lastName = 'Target'
      const email = generateUniqueEmail()

      await page.goto('/en/contacts/new')
      await expect(page.locator('#first_name')).toBeVisible({ timeout: 10000 })
      await page.locator('#first_name').fill(firstName)
      await page.locator('#last_name').fill(lastName)
      await page.locator('#email').fill(email)
      await page.getByRole('button', { name: 'Create Contact' }).click()
      await page.waitForURL(/\/contacts\/[a-f0-9-]{36}$/, { timeout: 20000 })

      // Click Edit
      await page.getByRole('link', { name: /Edit/ }).click()
      await page.waitForURL(/\/contacts\/[a-f0-9-]+\/edit/, { timeout: 10000 })

      // Update first name
      const updatedName = `Updated${Date.now()}`
      const firstNameInput = page.locator('#first_name')
      await expect(firstNameInput).toBeVisible({ timeout: 10000 })
      await firstNameInput.clear()
      await firstNameInput.fill(updatedName)

      // Save changes
      await page.getByRole('button', { name: 'Update Contact' }).click()

      // Should redirect back to detail page
      await page.waitForURL(/\/contacts\/[a-f0-9-]{36}$/, { timeout: 20000 })

      // Verify updated name is displayed
      await expect(page.locator(`text=${updatedName}`).first()).toBeVisible({ timeout: 10000 })
    })

    test('should show validation errors on edit when required fields are cleared', async ({ page }) => {
      const firstName = `Validate${Date.now()}`
      const email = generateUniqueEmail()

      await page.goto('/en/contacts/new')
      await expect(page.locator('#first_name')).toBeVisible({ timeout: 10000 })
      await page.locator('#first_name').fill(firstName)
      await page.locator('#last_name').fill('Test')
      await page.locator('#email').fill(email)
      await page.getByRole('button', { name: 'Create Contact' }).click()
      await page.waitForURL(/\/contacts\/[a-f0-9-]{36}$/, { timeout: 20000 })

      // Go to edit
      await page.getByRole('link', { name: /Edit/ }).click()
      await page.waitForURL(/\/contacts\/[a-f0-9-]+\/edit/, { timeout: 10000 })

      // Clear required first name
      const firstNameInput = page.locator('#first_name')
      await expect(firstNameInput).toBeVisible({ timeout: 10000 })
      await firstNameInput.clear()

      // Try to submit
      await page.getByRole('button', { name: 'Update Contact' }).click()

      // Should stay on edit page
      await expect(page).toHaveURL(/\/contacts\/[a-f0-9-]+\/edit/)

      // Should show validation error
      const errorMsg = page.locator('p.text-red-500')
      await expect(errorMsg.first()).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Contact Delete', () => {
    test('should delete a contact via native confirm and redirect to list', async ({ page }) => {
      const firstName = `Delete${Date.now()}`
      const lastName = 'Me'
      const email = generateUniqueEmail()

      await page.goto('/en/contacts/new')
      await expect(page.locator('#first_name')).toBeVisible({ timeout: 10000 })
      await page.locator('#first_name').fill(firstName)
      await page.locator('#last_name').fill(lastName)
      await page.locator('#email').fill(email)
      await page.getByRole('button', { name: 'Create Contact' }).click()
      await page.waitForURL(/\/contacts\/[a-f0-9-]{36}$/, { timeout: 20000 })

      await expect(page.locator(`text=${firstName}`).first()).toBeVisible({ timeout: 5000 })

      // Handle the native window.confirm() dialog
      page.on('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm')
        await dialog.accept()
      })

      // Click Delete button
      await page.getByRole('button', { name: /Delete/ }).click()

      // Should redirect to contacts list
      await page.waitForURL(/\/contacts$/, { timeout: 15000 })
      await expect(page.locator('h1').filter({ hasText: 'Contacts' })).toBeVisible({ timeout: 10000 })
    })

    test('should cancel delete when dismissing confirm dialog', async ({ page }) => {
      const firstName = `KeepMe${Date.now()}`
      const email = generateUniqueEmail()

      await page.goto('/en/contacts/new')
      await expect(page.locator('#first_name')).toBeVisible({ timeout: 10000 })
      await page.locator('#first_name').fill(firstName)
      await page.locator('#last_name').fill('DontDelete')
      await page.locator('#email').fill(email)
      await page.getByRole('button', { name: 'Create Contact' }).click()
      await page.waitForURL(/\/contacts\/[a-f0-9-]{36}$/, { timeout: 20000 })

      // Capture the current URL (detail page)
      const detailUrl = page.url()

      // Handle the native confirm dialog by dismissing it
      page.on('dialog', async (dialog) => {
        await dialog.dismiss()
      })

      // Click Delete button
      await page.getByRole('button', { name: /Delete/ }).click()

      // Should stay on the same detail page
      await expect(page).toHaveURL(detailUrl, { timeout: 5000 })

      // Contact name should still be visible
      await expect(page.locator('h1').filter({ hasText: firstName })).toBeVisible()
    })
  })
})
