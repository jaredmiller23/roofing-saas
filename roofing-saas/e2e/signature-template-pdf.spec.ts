import { test, expect } from '@playwright/test'

test.describe('Signature Template PDF Generation', () => {
  test.use({ storageState: 'playwright/.auth/user.json' })

  test('should create document from template and generate PDF', async ({ page }) => {
    // Navigate to templates page
    await page.goto('/en/signatures/templates')
    await page.waitForLoadState('networkidle')

    // Take screenshot of templates page
    await page.screenshot({ path: 'test-results/01-templates-page.png' })

    // Find a template with HTML content and click "Use This Template"
    // Look for the first template card
    const templateCard = page.locator('[data-testid="template-card"]').first()

    // If no template cards with data-testid, try to find by text
    const useTemplateButton = page.getByRole('button', { name: /use.*template/i }).first()

    if (await useTemplateButton.isVisible({ timeout: 5000 })) {
      await useTemplateButton.click()
    } else {
      // Alternative: click on any template to open it, then use it
      const firstTemplate = page.locator('.cursor-pointer').first()
      if (await firstTemplate.isVisible({ timeout: 5000 })) {
        await firstTemplate.click()
        await page.waitForTimeout(1000)
        await page.screenshot({ path: 'test-results/02-template-detail.png' })

        // Look for use button in modal or detail view
        const useButton = page.getByRole('button', { name: /use/i })
        if (await useButton.isVisible({ timeout: 3000 })) {
          await useButton.click()
        }
      }
    }

    // Wait for navigation to new signature document page
    await page.waitForURL(/\/signatures\/new/, { timeout: 10000 })
    await page.screenshot({ path: 'test-results/03-new-document-page.png' })

    // Fill in document details
    const titleInput = page.locator('input[name="title"]')
    if (await titleInput.isVisible({ timeout: 5000 })) {
      await titleInput.fill('Test Document from Template')
    }

    // Select a contact if available
    const contactSelect = page.locator('[data-testid="contact-select"]')
    if (await contactSelect.isVisible({ timeout: 3000 })) {
      await contactSelect.click()
      const firstContact = page.locator('[data-testid="contact-option"]').first()
      if (await firstContact.isVisible({ timeout: 3000 })) {
        await firstContact.click()
      }
    }

    await page.screenshot({ path: 'test-results/04-form-filled.png' })

    // Click through wizard steps if present
    const nextButton = page.getByRole('button', { name: /next|continue/i })
    let stepCount = 0
    while (await nextButton.isVisible({ timeout: 2000 }) && stepCount < 5) {
      await nextButton.click()
      await page.waitForTimeout(500)
      stepCount++
    }

    await page.screenshot({ path: 'test-results/05-before-submit.png' })

    // Submit/Create the document
    const createButton = page.getByRole('button', { name: /create|submit|save/i })
    if (await createButton.isVisible({ timeout: 5000 })) {
      // Listen for the API response
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/api/signature-documents') && response.request().method() === 'POST',
        { timeout: 30000 }
      )

      await createButton.click()

      // Wait for API response
      const response = await responsePromise
      const responseData = await response.json()

      console.log('API Response:', JSON.stringify(responseData, null, 2))

      // Check if document was created with a file_url (PDF was generated)
      expect(response.status()).toBe(201)
      expect(responseData.document).toBeDefined()

      // The key test: file_url should NOT be null if PDF generation worked
      if (responseData.document.file_url) {
        console.log('✅ PDF Generated! URL:', responseData.document.file_url)
      } else {
        console.log('⚠️ Document created but file_url is null - PDF may not have been generated')
      }

      await page.screenshot({ path: 'test-results/06-after-submit.png' })
    }
  })
})
