/**
 * Contact CRUD E2E Tests
 *
 * Tests for Contact Create, Read, Update, Delete operations.
 * These tests ASSERT that UI elements exist and FAIL if they don't.
 *
 * @see docs/testing/E2E_TESTING_BEST_PRACTICES.md
 */

import { test, expect } from '@playwright/test'

// Generate unique test data to avoid conflicts
const generateUniqueEmail = () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`

test.describe('Contact CRUD Operations', () => {
  // Use authenticated session
  test.use({ storageState: 'playwright/.auth/user.json' })

  test.describe('Contact List Page', () => {
    test('should load contacts page with Add Contact link', async ({ page }) => {
      await page.goto('/en/contacts')

      // Page should have title
      await expect(page.locator('h1:has-text("Contacts")')).toBeVisible({ timeout: 10000 })

      // Add Contact link should exist - this is a Link, not a button
      const addContactLink = page.locator('a[href="/contacts/new"]')
      await expect(addContactLink).toBeVisible({ timeout: 5000 })
      await expect(addContactLink).toHaveText(/Add Contact/)
    })

    test('should have search functionality', async ({ page }) => {
      await page.goto('/en/contacts')
      await expect(page.locator('h1:has-text("Contacts")')).toBeVisible({ timeout: 10000 })

      // Search input should exist (has id="search" and specific placeholder)
      const searchInput = page.locator('#search')
      await expect(searchInput).toBeVisible({ timeout: 5000 })

      // Should be able to type in search
      await searchInput.fill('test search')
      await expect(searchInput).toHaveValue('test search')
    })
  })

  test.describe('Contact Creation', () => {
    test('should navigate to new contact form', async ({ page }) => {
      await page.goto('/en/contacts')
      await expect(page.locator('h1:has-text("Contacts")')).toBeVisible({ timeout: 10000 })

      // Click Add Contact link
      await page.click('a[href="/contacts/new"]')

      // Should be on new contact page
      await expect(page).toHaveURL(/\/contacts\/new/)
      await expect(page.locator('h1:has-text("Add New Contact")')).toBeVisible({ timeout: 10000 })
    })

    test('should display contact form with required fields', async ({ page }) => {
      await page.goto('/en/contacts/new')

      // Wait for form to load
      await expect(page.locator('h1:has-text("Add New Contact")')).toBeVisible({ timeout: 10000 })

      // Required fields should exist (using id selectors which match the form)
      await expect(page.locator('#first_name')).toBeVisible()
      await expect(page.locator('#last_name')).toBeVisible()
      await expect(page.locator('#email')).toBeVisible()
      await expect(page.locator('#phone')).toBeVisible()

      // Submit button should exist (specifically the form's Create Contact button)
      await expect(page.getByRole('button', { name: 'Create Contact' })).toBeVisible()
    })

    test('should create contact with required fields', async ({ page }) => {
      const uniqueEmail = generateUniqueEmail()
      const firstName = `Test${Date.now()}`
      const lastName = 'User'

      await page.goto('/en/contacts/new')
      await expect(page.locator('h1:has-text("Add New Contact")')).toBeVisible({ timeout: 10000 })

      // Fill required fields
      await page.locator('#first_name').fill(firstName)
      await page.locator('#last_name').fill(lastName)
      await page.locator('#email').fill(uniqueEmail)

      // Submit form
      await page.getByRole('button', { name: 'Create Contact' }).click()

      // Should redirect to contact detail page (with optional locale prefix)
      await page.waitForURL(/\/contacts\/[a-f0-9-]{36}$/, { timeout: 20000 })

      // Should show the contact name
      await expect(page.locator(`text=${firstName}`).first()).toBeVisible({ timeout: 5000 })
    })

    test('should create contact with all fields', async ({ page }) => {
      const uniqueEmail = generateUniqueEmail()
      const firstName = `Full${Date.now()}`
      const lastName = 'Contact'

      await page.goto('/en/contacts/new')
      await expect(page.locator('h1:has-text("Add New Contact")')).toBeVisible({ timeout: 10000 })

      // Fill all available fields
      await page.locator('#first_name').fill(firstName)
      await page.locator('#last_name').fill(lastName)
      await page.locator('#email').fill(uniqueEmail)
      await page.locator('#phone').fill('555-123-4567')
      await page.locator('#company').fill('Test Company')
      await page.locator('#address_street').fill('123 Main St')
      await page.locator('#address_city').fill('Nashville')
      await page.locator('#address_state').fill('TN')
      await page.locator('#address_zip').fill('37201')

      // Submit form
      await page.getByRole('button', { name: 'Create Contact' }).click()

      // Should redirect to contact detail page
      await page.waitForURL(/\/contacts\/[a-f0-9-]{36}$/, { timeout: 20000 })
    })

    test('should show validation errors for empty required fields', async ({ page }) => {
      await page.goto('/en/contacts/new')
      await expect(page.locator('h1:has-text("Add New Contact")')).toBeVisible({ timeout: 10000 })

      // Try to submit empty form
      await page.getByRole('button', { name: 'Create Contact' }).click()

      // Should stay on form (not redirect)
      await expect(page).toHaveURL(/\/contacts\/new/)

      // Should show validation errors (the form uses Zod validation)
      // First name and last name are required
      const errorMessages = page.locator('p.text-red-500')
      await expect(errorMessages.first()).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Contact Detail Page', () => {
    test('should navigate to contact detail from list', async ({ page }) => {
      await page.goto('/en/contacts')
      await expect(page.locator('h1:has-text("Contacts")')).toBeVisible({ timeout: 10000 })

      // Wait for contacts table/list to load
      // Click on first contact row (if exists)
      const contactRows = page.locator('table tbody tr').or(page.locator('[data-testid="contact-row"]'))
      const rowCount = await contactRows.count()

      if (rowCount > 0) {
        // Click on first row
        await contactRows.first().click()

        // Should navigate to detail page
        await expect(page).toHaveURL(/\/contacts\/[a-f0-9-]{36}$/, { timeout: 10000 })
      } else {
        // No contacts exist - create one first
        await page.click('a[href="/contacts/new"]')
        await page.locator('#first_name').fill('DetailTest')
        await page.locator('#last_name').fill('User')
        await page.locator('#email').fill(generateUniqueEmail())
        await page.getByRole('button', { name: 'Create Contact' }).click()

        // Should be on detail page
        await expect(page).toHaveURL(/\/contacts\/[a-f0-9-]{36}$/, { timeout: 15000 })
      }
    })
  })

  test.describe('API Response Verification', () => {
    test('should create contact and verify API response structure', async ({ page }) => {
      const uniqueEmail = generateUniqueEmail()
      const firstName = 'APITest'
      const lastName = `User${Date.now()}`

      // Intercept API response - only capture POST to /api/contacts (not sub-routes)
      let apiResponse: Record<string, unknown> | null = null

      await page.route(/\/api\/contacts$/, async (route) => {
        if (route.request().method() === 'POST') {
          const response = await route.fetch()
          apiResponse = await response.json()
          await route.fulfill({ response })
        } else {
          await route.continue()
        }
      })

      await page.goto('/en/contacts/new')
      await expect(page.locator('#first_name')).toBeVisible({ timeout: 10000 })

      // Fill and submit
      await page.locator('#first_name').fill(firstName)
      await page.locator('#last_name').fill(lastName)
      await page.locator('#email').fill(uniqueEmail)
      await page.getByRole('button', { name: 'Create Contact' }).click()

      // Wait for redirect
      await page.waitForURL(/\/contacts\/[a-f0-9-]{36}$/, { timeout: 20000 })

      // Verify API response structure
      expect(apiResponse).not.toBeNull()
      expect(apiResponse).toHaveProperty('success', true)
      expect(apiResponse).toHaveProperty('data')

      const data = apiResponse!.data as { contact: { id: string; first_name: string } }
      expect(data).toHaveProperty('contact')
      expect(data.contact).toHaveProperty('id')
      expect(data.contact.id).toMatch(/^[a-f0-9-]{36}$/)
      expect(data.contact.first_name).toBe(firstName)
    })

    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error - only intercept POST to /api/contacts (not sub-routes)
      await page.route(/\/api\/contacts$/, async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: {
                code: 'INTERNAL_ERROR',
                message: 'Database error'
              }
            })
          })
        } else {
          await route.continue()
        }
      })

      await page.goto('/en/contacts/new')
      await expect(page.locator('#first_name')).toBeVisible({ timeout: 10000 })

      // Fill and submit
      await page.locator('#first_name').fill('ErrorTest')
      await page.locator('#last_name').fill('User')
      await page.locator('#email').fill(generateUniqueEmail())
      await page.getByRole('button', { name: 'Create Contact' }).click()

      // Should stay on form (not redirect) — wait for error message to appear
      await expect(
        page.locator('.bg-red-50, .text-red-800, .text-destructive').first()
      ).toBeVisible({ timeout: 10000 })
      await expect(page).toHaveURL(/\/contacts\/new/)

      // Should show error message in form (uses bg-red-50 border-red-200 text-red-800)
      const errorMessage = page.locator('.bg-red-50, .text-red-800, .text-destructive')
      await expect(errorMessage.first()).toBeVisible({ timeout: 5000 })
    })
  })
})
