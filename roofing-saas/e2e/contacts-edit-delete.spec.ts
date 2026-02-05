/**
 * Contact Edit & Delete E2E Tests
 *
 * Tests for Contact Edit and Delete operations.
 * Complements contacts.spec.ts which covers Create/Read.
 * Uses authenticated session from playwright setup.
 */

import { test, expect } from '@playwright/test'

const generateUniqueEmail = () =>
  `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`

test.describe('Contact Edit & Delete Operations', () => {
  test.use({ storageState: 'playwright/.auth/user.json' })

  test.describe('Contact Edit', () => {
    test('should edit a contact and verify changes', async ({ page }) => {
      // Create a contact first
      const firstName = `Edit${Date.now()}`
      const lastName = 'Target'
      const email = generateUniqueEmail()

      await page.goto('/contacts/new')
      await expect(page.locator('#first_name')).toBeVisible({ timeout: 10000 })

      await page.locator('#first_name').fill(firstName)
      await page.locator('#last_name').fill(lastName)
      await page.locator('#email').fill(email)
      await page.getByRole('button', { name: 'Create Contact' }).click()

      // Wait for redirect to detail page
      await page.waitForURL(/\/contacts\/[a-f0-9-]{36}$/, { timeout: 20000 })

      // Verify on detail page
      await expect(page.locator(`text=${firstName}`).first()).toBeVisible({ timeout: 5000 })

      // Click Edit button
      await page.getByRole('link', { name: /Edit/ }).click()
      await page.waitForURL(/\/contacts\/[a-f0-9-]+\/edit/, { timeout: 10000 })

      // Update first name
      const updatedName = `Updated${Date.now()}`
      const firstNameInput = page.locator('#first_name')
      await expect(firstNameInput).toBeVisible({ timeout: 10000 })
      await firstNameInput.clear()
      await firstNameInput.fill(updatedName)

      // Add phone number
      await page.locator('#phone').fill('555-987-6543')

      // Save changes
      await page.getByRole('button', { name: /Update Contact|Save/ }).click()

      // Should redirect back to detail page
      await page.waitForURL(/\/contacts\/[a-f0-9-]{36}$/, { timeout: 20000 })

      // Verify updated name is displayed
      await expect(page.locator(`text=${updatedName}`).first()).toBeVisible({ timeout: 10000 })
    })

    test('should show validation errors on edit when required fields are cleared', async ({ page }) => {
      // Create a contact
      const firstName = `Validate${Date.now()}`
      const email = generateUniqueEmail()

      await page.goto('/contacts/new')
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
      await page.getByRole('button', { name: /Update Contact|Save/ }).click()

      // Should stay on edit page
      await expect(page).toHaveURL(/\/contacts\/[a-f0-9-]+\/edit/)

      // Should show validation error
      const errorMsg = page.locator('p.text-red-500')
      await expect(errorMsg.first()).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Contact Delete', () => {
    test('should delete a contact and verify removal', async ({ page }) => {
      // Create a contact to delete
      const firstName = `Delete${Date.now()}`
      const lastName = 'Me'
      const email = generateUniqueEmail()

      await page.goto('/contacts/new')
      await expect(page.locator('#first_name')).toBeVisible({ timeout: 10000 })
      await page.locator('#first_name').fill(firstName)
      await page.locator('#last_name').fill(lastName)
      await page.locator('#email').fill(email)
      await page.getByRole('button', { name: 'Create Contact' }).click()
      await page.waitForURL(/\/contacts\/[a-f0-9-]{36}$/, { timeout: 20000 })

      // Verify on detail page
      await expect(page.locator(`text=${firstName}`).first()).toBeVisible({ timeout: 5000 })

      // Click Delete button
      const deleteBtn = page.getByRole('button', { name: /Delete/ })
      await expect(deleteBtn).toBeVisible({ timeout: 5000 })
      await deleteBtn.click()

      // Confirm deletion in dialog (AlertDialog or native confirm)
      const confirmBtn = page.getByRole('button', { name: /Delete|Confirm/ }).last()
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click()
      }

      // Should redirect to contacts list
      await page.waitForURL(/\/contacts$/, { timeout: 15000 })

      // Deleted contact should not appear in list
      // Wait for list to load
      await expect(page.locator('h1').filter({ hasText: 'Contacts' })).toBeVisible({ timeout: 10000 })

      // The contact should be gone (soft deleted)
      const deletedContact = page.locator(`text=${firstName} ${lastName}`)
      await expect(deletedContact).not.toBeVisible({ timeout: 5000 })
    })
  })
})
