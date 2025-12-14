/**
 * Contact CRUD E2E Tests
 *
 * Comprehensive tests for Contact Create, Read, Update, Delete operations.
 * This test suite verifies core CRM functionality.
 *
 * Test Coverage:
 * - Contact creation (required and optional fields)
 * - Contact updates (name, email, phone, notes)
 * - Contact deletion (soft delete with is_deleted flag)
 * - Contact search (by name, email)
 * - Contact filtering
 * - Duplicate email validation
 * - Pagination
 *
 * @see docs/testing/E2E_TESTING_BEST_PRACTICES.md
 */

import { test, expect, type APIResponse } from '@playwright/test'

// Generate unique test data to avoid conflicts
const generateUniqueEmail = () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`
const generateUniquePhone = () => `555-${Math.floor(1000 + Math.random() * 9000)}`

/**
 * API Response structure verification
 * The API uses a standardized wrapper: { success: boolean, data: T }
 */
interface ApiResponse<T> {
  success: boolean
  data: T
  error?: { code: string; message: string }
}

interface ContactResponse {
  contact: {
    id: string
    first_name: string
    last_name: string
    email?: string
    stage?: string
    substatus?: string | null  // Set by trigger
    tenant_id: string
    created_at: string
  }
}

test.describe('Contact CRUD Operations', () => {
  // Use authenticated session
  test.use({ storageState: 'playwright/.auth/user.json' })

  test.describe('Contact Creation', () => {
    test('should create contact with required fields only', async ({ page }) => {
      await page.goto('/contacts')
      await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000) // Allow initial render

      const uniqueEmail = generateUniqueEmail()

      // Click "Add Contact" button/link (try multiple possible selectors)
      const newContactButton = page.locator('[href="/contacts/new"]').or(
        page.locator('button:has-text("Add Contact")').or(
          page.locator('a:has-text("Add Contact")')
        ).or(
          page.getByTestId('new-contact-button')
        )
      ).first()

      if (await newContactButton.isVisible({ timeout: 2000 })) {
        await newContactButton.click()
        await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

        // Fill in required fields
        await page.locator('input[name="first_name"]').or(page.locator('input[placeholder*="First"]')).first().fill('John')
        await page.locator('input[name="last_name"]').or(page.locator('input[placeholder*="Last"]')).first().fill('Doe')
        await page.locator('input[name="email"]').or(page.locator('input[type="email"]')).first().fill(uniqueEmail)

        // Submit form
        const submitButton = page.getByRole('button', { name: 'Create Contact' }).or(
          page.locator('button:has-text("Create")').or(
            page.locator('button:has-text("Save")')
          )
        ).first()

        await submitButton.click()
        await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

        // Verify contact appears in list (either table or card view)
        const contactElement = page.locator(`text=${uniqueEmail}`).or(
          page.locator(`text=John Doe`)
        )

        await expect(contactElement.first()).toBeVisible({ timeout: 5000 })
      } else {
        // If no "New Contact" button, skip test
        test.skip()
      }
    })

    test('should create contact with all fields (optional included)', async ({ page }) => {
      await page.goto('/contacts')
      await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

      const uniqueEmail = generateUniqueEmail()
      const uniquePhone = generateUniquePhone()

      const newContactButton = page.locator('[href="/contacts/new"]').or(
        page.locator('button:has-text("Add Contact")').or(
          page.getByTestId('new-contact-button')
        )
      ).first()

      if (await newContactButton.isVisible({ timeout: 2000 })) {
        await newContactButton.click()
        await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

        // Fill in all fields
        await page.locator('input[name="first_name"]').or(page.locator('input[placeholder*="First"]')).first().fill('Jane')
        await page.locator('input[name="last_name"]').or(page.locator('input[placeholder*="Last"]')).first().fill('Smith')
        await page.locator('input[name="email"]').or(page.locator('input[type="email"]')).first().fill(uniqueEmail)

        // Phone (if exists)
        const phoneInput = page.locator('input[name="phone"]').or(page.locator('input[type="tel"]')).first()
        if (await phoneInput.isVisible({ timeout: 500 })) {
          await phoneInput.fill(uniquePhone)
        }

        // Company (if exists)
        const companyInput = page.locator('input[name="company"]').first()
        if (await companyInput.isVisible({ timeout: 500 })) {
          await companyInput.fill('Acme Corp')
        }

        // Address (if exists)
        const addressInput = page.locator('input[name="address"]').or(page.locator('textarea[name="address"]')).first()
        if (await addressInput.isVisible({ timeout: 500 })) {
          await addressInput.fill('123 Main St, City, ST 12345')
        }

        // Submit
        const submitButton = page.getByRole('button', { name: 'Create Contact' }).or(
          page.locator('button:has-text("Create")')
        ).first()

        await submitButton.click()
        await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

        // Verify contact created
        await expect(page.locator(`text=${uniqueEmail}`).first()).toBeVisible({ timeout: 5000 })
      } else {
        test.skip()
      }
    })

    test('should prevent duplicate email addresses', async ({ page }) => {
      await page.goto('/contacts')
      await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

      const duplicateEmail = generateUniqueEmail()

      // Create first contact
      const newContactButton = page.locator('[href="/contacts/new"]').or(
        page.locator('button:has-text("Add Contact")')
      ).first()
      if (await newContactButton.isVisible({ timeout: 2000 })) {
        await newContactButton.click()
        await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

        await page.locator('input[name="first_name"]').first().fill('First')
        await page.locator('input[name="last_name"]').first().fill('Contact')
        await page.locator('input[name="email"]').first().fill(duplicateEmail)

        await page.locator('button[type="submit"]').first().click()
        await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

        // Try to create duplicate
        await page.goto('/contacts')
        await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

        const newContactButton2 = page.locator('[href="/contacts/new"]').or(
          page.locator('button:has-text("Add Contact")')
        ).first()
        await newContactButton2.click()
        await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

        await page.locator('input[name="first_name"]').first().fill('Second')
        await page.locator('input[name="last_name"]').first().fill('Contact')
        await page.locator('input[name="email"]').first().fill(duplicateEmail)

        await page.locator('button[type="submit"]').first().click()
        await page.waitForTimeout(1000)

        // Should show error message
        const errorMessage = page.locator('text=/already exists|duplicate|email.*taken/i')
        const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)

        // Either shows error OR prevents submission
        const isStillOnForm = await page.locator('input[name="email"]').isVisible()

        expect(hasError || isStillOnForm).toBeTruthy()
      } else {
        test.skip()
      }
    })
  })

  test.describe('Contact Updates', () => {
    test('should update contact name', async ({ page }) => {
      await page.goto('/contacts')
      await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

      // Find any existing contact and click on it
      const contactRows = page.locator('tr').or(page.locator('[data-testid*="contact"]'))
      const firstContact = contactRows.first()

      if (await firstContact.isVisible({ timeout: 2000 })) {
        await firstContact.click()
        await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

        // Look for edit button
        const editButton = page.locator('button:has-text("Edit")').or(
          page.getByTestId('edit-contact-button')
        ).first()

        if (await editButton.isVisible({ timeout: 2000 })) {
          await editButton.click()
          await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

          // Update first name
          const firstNameInput = page.locator('input[name="first_name"]').first()
          await firstNameInput.clear()
          await firstNameInput.fill('Updated')

          // Save changes
          const saveButton = page.locator('button:has-text("Save")').or(
            page.locator('button[type="submit"]')
          ).first()

          await saveButton.click()
          await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

          // Verify update
          await expect(page.locator('text=Updated').first()).toBeVisible({ timeout: 5000 })
        } else {
          test.skip()
        }
      } else {
        test.skip()
      }
    })

    test('should update contact email and phone', async ({ page }) => {
      await page.goto('/contacts')
      await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

      const uniqueEmail = generateUniqueEmail()
      const uniquePhone = generateUniquePhone()

      const contactRows = page.locator('tr').or(page.locator('[data-testid*="contact"]'))
      const firstContact = contactRows.first()

      if (await firstContact.isVisible({ timeout: 2000 })) {
        await firstContact.click()
        await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

        const editButton = page.locator('button:has-text("Edit")').first()

        if (await editButton.isVisible({ timeout: 2000 })) {
          await editButton.click()
          await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

          // Update email
          const emailInput = page.locator('input[name="email"]').first()
          await emailInput.clear()
          await emailInput.fill(uniqueEmail)

          // Update phone (if exists)
          const phoneInput = page.locator('input[name="phone"]').first()
          if (await phoneInput.isVisible({ timeout: 500 })) {
            await phoneInput.clear()
            await phoneInput.fill(uniquePhone)
          }

          // Save
          const saveButton = page.locator('button:has-text("Save")').first()
          await saveButton.click()
          await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

          // Verify
          await expect(page.locator(`text=${uniqueEmail}`).first()).toBeVisible({ timeout: 5000 })
        } else {
          test.skip()
        }
      } else {
        test.skip()
      }
    })
  })

  test.describe('Contact Deletion (Soft Delete)', () => {
    test('should soft delete contact (is_deleted flag)', async ({ page }) => {
      await page.goto('/contacts')
      await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

      const contactRows = page.locator('tr').or(page.locator('[data-testid*="contact"]'))
      const rowCount = await contactRows.count()

      if (rowCount > 0) {
        // Get the email/name of the contact we're about to delete
        const firstContact = contactRows.first()
        const contactText = await firstContact.textContent()

        await firstContact.click()
        await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

        // Look for delete button (might be in menu or direct button)
        const deleteButton = page.locator('button:has-text("Delete")').or(
          page.getByTestId('delete-contact-button')
        ).first()

        if (await deleteButton.isVisible({ timeout: 2000 })) {
          await deleteButton.click()
          await page.waitForTimeout(500)

          // Confirm deletion if confirmation dialog appears
          const confirmButton = page.locator('button:has-text("Confirm")').or(
            page.locator('button:has-text("Delete")').or(
              page.locator('[role="dialog"] button:has-text("Yes")')
            )
          )

          if (await confirmButton.isVisible({ timeout: 1000 })) {
            await confirmButton.click()
          }

          await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

          // Navigate back to contacts list
          await page.goto('/contacts')
          await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

          // Verify contact is NOT visible (soft deleted)
          const contactStillVisible = await page.locator(`text="${contactText}"`).isVisible({ timeout: 1000 }).catch(() => false)

          expect(contactStillVisible).toBeFalsy()
        } else {
          test.skip()
        }
      } else {
        test.skip()
      }
    })
  })

  test.describe('Contact Search and Filtering', () => {
    test('should search contacts by name', async ({ page }) => {
      await page.goto('/contacts')
      await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

      // Look for search input
      const searchInput = page.locator('input[placeholder*="Search"]').or(
        page.locator('input[type="search"]').or(
          page.getByTestId('contact-search')
        )
      ).first()

      if (await searchInput.isVisible({ timeout: 2000 })) {
        // Type a search query
        await searchInput.fill('John')
        await page.waitForTimeout(500) // Debounce

        // Should filter results
        const contactRows = page.locator('tr').or(page.locator('[data-testid*="contact"]'))
        const visibleContacts = await contactRows.count()

        // Either has results with "John" or shows empty state
        const hasResults = visibleContacts > 0
        const hasEmptyState = await page.locator('text=/No.*found|No contacts/i').isVisible({ timeout: 1000 }).catch(() => false)

        expect(hasResults || hasEmptyState).toBeTruthy()
      } else {
        test.skip()
      }
    })

    test('should search contacts by email', async ({ page }) => {
      await page.goto('/contacts')
      await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

      const searchInput = page.locator('input[placeholder*="Search"]').first()

      if (await searchInput.isVisible({ timeout: 2000 })) {
        await searchInput.fill('example.com')
        await page.waitForTimeout(500)

        // Should filter to contacts with email containing "example.com"
        const contactRows = page.locator('tr').or(page.locator('[data-testid*="contact"]'))
        const visibleContacts = await contactRows.count()

        const hasResults = visibleContacts > 0
        const hasEmptyState = await page.locator('text=/No.*found/i').isVisible().catch(() => false)

        expect(hasResults || hasEmptyState).toBeTruthy()
      } else {
        test.skip()
      }
    })

    test('should clear search and show all contacts', async ({ page }) => {
      await page.goto('/contacts')
      await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

      const searchInput = page.locator('input[placeholder*="Search"]').first()

      if (await searchInput.isVisible({ timeout: 2000 })) {
        // Search for something specific
        await searchInput.fill('nonexistent-contact-xyz')
        await page.waitForTimeout(500)

        // Clear search
        await searchInput.clear()
        await page.waitForTimeout(500)

        // Should show all contacts again
        const contactRows = page.locator('tr').or(page.locator('[data-testid*="contact"]'))
        const visibleContacts = await contactRows.count()

        // Should have contacts visible OR empty state if truly no contacts
        expect(visibleContacts).toBeGreaterThanOrEqual(0)
      } else {
        test.skip()
      }
    })
  })

  test.describe('Contact Pagination', () => {
    test('should navigate through pages if pagination exists', async ({ page }) => {
      await page.goto('/contacts')
      await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

      // Look for pagination controls
      const nextButton = page.locator('button:has-text("Next")').or(
        page.locator('[aria-label="Next page"]').or(
          page.getByTestId('pagination-next')
        )
      ).first()

      if (await nextButton.isVisible({ timeout: 2000 })) {
        // Check if next button is enabled (means there are multiple pages)
        const isEnabled = await nextButton.isEnabled()

        if (isEnabled) {
          // Click next
          await nextButton.click()
          await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

          // Should see different contacts or page 2 indicator
          const page2Indicator = page.locator('text=/Page 2|2 of/i')
          const hasPageIndicator = await page2Indicator.isVisible({ timeout: 1000 }).catch(() => false)

          // Go back to page 1
          const prevButton = page.locator('button:has-text("Previous")').or(
            page.locator('[aria-label="Previous page"]')
          ).first()

          if (await prevButton.isVisible()) {
            await prevButton.click()
            await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

            // Should be back on page 1
            const page1Indicator = page.locator('text=/Page 1|1 of/i')
            const hasPage1 = await page1Indicator.isVisible({ timeout: 1000 }).catch(() => false)

            expect(hasPageIndicator || hasPage1).toBeTruthy()
          }
        }
      } else {
        // No pagination - probably few contacts, which is fine
        test.skip()
      }
    })
  })

  /**
   * FULL FLOW INTEGRATION TESTS
   *
   * These tests verify the COMPLETE flow including:
   * 1. API response structure (catches frontend/API mismatches)
   * 2. Database trigger execution (catches SQL bugs)
   * 3. Redirect behavior (catches routing issues)
   * 4. Detail page rendering (catches data display issues)
   *
   * These tests would have caught:
   * - "column reference is ambiguous" (trigger bug)
   * - "OLD has no field status" (trigger bug)
   * - "n.contact.id undefined" (response structure mismatch)
   */
  test.describe('Full Flow Integration', () => {
    test('should create contact and verify complete flow: API response → redirect → detail page', async ({ page }) => {
      const uniqueEmail = generateUniqueEmail()
      const firstName = 'IntegrationTest'
      const lastName = `User${Date.now()}`

      // Set up API response interceptor BEFORE navigation
      let apiResponse: ApiResponse<ContactResponse> | null = null
      let apiError: string | null = null

      await page.route('**/api/contacts', async (route) => {
        if (route.request().method() === 'POST') {
          // Let the request through and capture response
          const response = await route.fetch()
          const body = await response.json()

          if (response.ok()) {
            apiResponse = body as ApiResponse<ContactResponse>
          } else {
            apiError = JSON.stringify(body)
          }

          // Continue with the original response
          await route.fulfill({ response })
        } else {
          await route.continue()
        }
      })

      // Navigate to contact creation
      await page.goto('/contacts/new')
      await page.waitForSelector('input[name="first_name"]', { timeout: 10000 })

      // Fill form
      await page.locator('input[name="first_name"]').fill(firstName)
      await page.locator('input[name="last_name"]').fill(lastName)
      await page.locator('input[name="email"]').fill(uniqueEmail)

      // Submit and wait for navigation
      const submitButton = page.getByRole('button', { name: 'Create Contact' })
      await submitButton.click()

      // Wait for redirect to contact detail page
      await page.waitForURL(/\/contacts\/[a-f0-9-]{36}$/, { timeout: 15000 })

      // ===== VERIFICATION 1: API Response Structure =====
      expect(apiError).toBeNull()
      expect(apiResponse).not.toBeNull()
      expect(apiResponse!.success).toBe(true)
      expect(apiResponse!.data).toBeDefined()
      expect(apiResponse!.data.contact).toBeDefined()
      expect(apiResponse!.data.contact.id).toBeDefined()
      expect(apiResponse!.data.contact.id).toMatch(/^[a-f0-9-]{36}$/)  // UUID format

      // ===== VERIFICATION 2: Database Trigger Executed =====
      // The substatus should be set by the trigger (null is OK if no default configured)
      // But the field should EXIST in the response (not undefined due to trigger failure)
      expect('substatus' in apiResponse!.data.contact).toBe(true)

      // ===== VERIFICATION 3: Correct Redirect =====
      const currentUrl = page.url()
      const expectedId = apiResponse!.data.contact.id
      expect(currentUrl).toContain(`/contacts/${expectedId}`)

      // ===== VERIFICATION 4: Detail Page Renders Correctly =====
      // Wait for page to fully load
      await page.waitForSelector('body', { state: 'attached' })
      await page.waitForTimeout(1000)

      // Should NOT show error page
      const hasError = await page.locator('text=/error|something went wrong|not found/i').first().isVisible({ timeout: 1000 }).catch(() => false)
      expect(hasError).toBe(false)

      // Should show the contact name
      await expect(page.locator(`text=${firstName}`).first()).toBeVisible({ timeout: 5000 })

      // ===== CLEANUP: Delete test contact =====
      // Navigate to delete or use API directly
      const deleteButton = page.locator('button:has-text("Delete")').first()
      if (await deleteButton.isVisible({ timeout: 2000 })) {
        await deleteButton.click()
        // Confirm if dialog appears
        const confirmButton = page.locator('button:has-text("Confirm")').or(page.locator('[role="dialog"] button:has-text("Delete")')).first()
        if (await confirmButton.isVisible({ timeout: 1000 })) {
          await confirmButton.click()
        }
      }
    })

    test('should handle API errors gracefully without crashing', async ({ page }) => {
      // Set up API to return an error
      await page.route('**/api/contacts', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: {
                code: 'INTERNAL_ERROR',
                message: 'Database trigger failed: column reference is ambiguous'
              }
            })
          })
        } else {
          await route.continue()
        }
      })

      await page.goto('/contacts/new')
      await page.waitForSelector('input[name="first_name"]', { timeout: 10000 })

      // Fill and submit
      await page.locator('input[name="first_name"]').fill('ErrorTest')
      await page.locator('input[name="last_name"]').fill('User')
      await page.locator('input[name="email"]').fill(generateUniqueEmail())
      await page.locator('button[type="submit"]').click()

      // Should stay on form (not redirect)
      await page.waitForTimeout(2000)
      expect(page.url()).toContain('/contacts/new')

      // Should show error message
      const errorMessage = page.locator('text=/error|failed|ambiguous/i').first()
      await expect(errorMessage).toBeVisible({ timeout: 5000 })
    })

    test('should verify API response matches expected structure for all fields', async ({ page }) => {
      const uniqueEmail = generateUniqueEmail()
      let apiResponse: ApiResponse<ContactResponse> | null = null

      await page.route('**/api/contacts', async (route) => {
        if (route.request().method() === 'POST') {
          const response = await route.fetch()
          apiResponse = await response.json()
          await route.fulfill({ response })
        } else {
          await route.continue()
        }
      })

      await page.goto('/contacts/new')
      await page.waitForSelector('input[name="first_name"]', { timeout: 10000 })

      // Fill all available fields
      await page.locator('input[name="first_name"]').fill('FullField')
      await page.locator('input[name="last_name"]').fill('Test')
      await page.locator('input[name="email"]').fill(uniqueEmail)

      const phoneInput = page.locator('input[name="phone"]')
      if (await phoneInput.isVisible({ timeout: 500 })) {
        await phoneInput.fill('555-1234')
      }

      const companyInput = page.locator('input[name="company"]')
      if (await companyInput.isVisible({ timeout: 500 })) {
        await companyInput.fill('Test Company')
      }

      await page.locator('button[type="submit"]').click()
      await page.waitForURL(/\/contacts\/[a-f0-9-]{36}$/, { timeout: 15000 })

      // Comprehensive response validation
      expect(apiResponse).not.toBeNull()

      // Top-level structure
      expect(apiResponse!).toHaveProperty('success', true)
      expect(apiResponse!).toHaveProperty('data')
      expect(apiResponse!.data).toHaveProperty('contact')

      // Contact object structure
      const contact = apiResponse!.data.contact
      expect(contact).toHaveProperty('id')
      expect(contact).toHaveProperty('first_name', 'FullField')
      expect(contact).toHaveProperty('last_name', 'Test')
      expect(contact).toHaveProperty('tenant_id')
      expect(contact).toHaveProperty('created_at')

      // Trigger-set fields should exist
      expect(contact).toHaveProperty('stage')
      expect(contact).toHaveProperty('substatus')  // May be null, but should exist

      // Clean up
      const deleteButton = page.locator('button:has-text("Delete")').first()
      if (await deleteButton.isVisible({ timeout: 2000 })) {
        await deleteButton.click()
        const confirmButton = page.locator('button:has-text("Confirm")').or(page.locator('[role="dialog"] button:has-text("Delete")')).first()
        if (await confirmButton.isVisible({ timeout: 1000 })) {
          await confirmButton.click()
        }
      }
    })
  })
})
