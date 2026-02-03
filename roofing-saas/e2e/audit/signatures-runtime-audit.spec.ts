/**
 * Runtime Verification — Batch 3: Signatures
 *
 * Verifies the signatures module against code audit findings.
 * Key focus: template PATCH/DELETE broken, document CRUD, wizard flow.
 */
import { test, expect } from '@playwright/test'

test.use({ storageState: 'playwright/.auth/user.json' })


test.describe('Signatures Runtime Audit', () => {

  test('1. Signatures list page loads', async ({ page }) => {
    await page.goto(`/en/signatures`, { waitUntil: 'domcontentloaded' })
    // Wait for page to be ready
    const newDoc = page.locator('a:has-text("New Document"), button:has-text("New Document")')
    await expect(newDoc.first()).toBeVisible({ timeout: 10000 })

    expect(page.url()).toContain('/signatures')

    // Key elements
    const templates = page.locator('a:has-text("Templates"), button:has-text("Templates")')
    console.log(`[AUDIT] New Document button: FOUND`)
    console.log(`[AUDIT] Templates button: ${await templates.count() > 0 ? 'FOUND' : 'MISSING'}`)

    // Search + status filter
    const search = page.locator('input[placeholder*="Search"], input[placeholder*="search"]')
    console.log(`[AUDIT] Search input: ${await search.count() > 0 ? 'FOUND' : 'MISSING'}`)

    const statusFilter = page.locator('select, [role="combobox"]')
    console.log(`[AUDIT] Status filter: ${await statusFilter.count() > 0 ? 'FOUND' : 'MISSING'}`)

    await page.screenshot({ path: 'e2e/audit/screenshots/signatures-list.png', fullPage: true })
  })

  test('2. Create document wizard — Step 1 (templates)', async ({ page }) => {
    await page.goto(`/en/signatures/new`, { waitUntil: 'domcontentloaded' })
    // Wait for wizard to load — look for template section or "Start from Scratch"
    await expect(page.locator('text=Template, text=Scratch, text=Blank').first()).toBeVisible({ timeout: 10000 }).catch(() => {})

    console.log(`[AUDIT] Wizard URL: ${page.url()}`)

    const pageText = await page.textContent('body')

    // Step 1 elements
    const hasStartFromScratch = pageText?.includes('Start from Scratch') || pageText?.includes('Blank')
    console.log(`[AUDIT] Start from Scratch: ${hasStartFromScratch ? 'FOUND' : 'MISSING'}`)

    // Template cards should show
    const hasTemplateSection = pageText?.includes('Template') || pageText?.includes('template')
    console.log(`[AUDIT] Template section: ${hasTemplateSection ? 'FOUND' : 'MISSING'}`)

    await page.screenshot({ path: 'e2e/audit/screenshots/signatures-wizard-step1.png', fullPage: true })
  })

  test('3. Create document wizard — Step 2 (details)', async ({ page }) => {
    await page.goto(`/en/signatures/new`, { waitUntil: 'domcontentloaded' })
    // Wait for wizard step 1 to load
    await expect(page.locator('text=Template, text=Scratch, text=Blank').first()).toBeVisible({ timeout: 10000 }).catch(() => {})

    // Try to advance to step 2 by clicking "Start from Scratch" or equivalent
    const scratch = page.locator('button:has-text("Start from Scratch"), button:has-text("Blank"), button:has-text("Skip")')
    if (await scratch.count() > 0) {
      await scratch.first().click()
      // Wait for next step to render
      await page.waitForResponse(resp => resp.url().includes('/api/'), { timeout: 5000 }).catch(() => {})
    }

    // Also try clicking Next if visible
    const nextBtn = page.locator('button:has-text("Next")')
    if (await nextBtn.count() > 0) {
      await nextBtn.first().click()
      // Wait for step transition
      await page.waitForResponse(resp => resp.url().includes('/api/'), { timeout: 5000 }).catch(() => {})
    }

    // Check for step 2 fields
    const titleInput = page.locator('input[name="title"], #title, input[placeholder*="title"]')
    const descInput = page.locator('textarea[name="description"], #description')
    console.log(`[AUDIT] Title input: ${await titleInput.count() > 0 ? 'FOUND' : 'MISSING'}`)
    console.log(`[AUDIT] Description input: ${await descInput.count() > 0 ? 'FOUND' : 'MISSING'}`)

    await page.screenshot({ path: 'e2e/audit/screenshots/signatures-wizard-step2.png', fullPage: true })
  })

  test('4. Templates list page loads', async ({ page }) => {
    await page.goto(`/en/signatures/templates`, { waitUntil: 'domcontentloaded' })
    // Wait for templates page to be ready
    const newTemplate = page.locator('a:has-text("New Template"), button:has-text("New Template")')
    await expect(newTemplate.first()).toBeVisible({ timeout: 10000 }).catch(() => {})

    expect(page.url()).toContain('/templates')

    // Key elements
    console.log(`[AUDIT] New Template button: ${await newTemplate.count() > 0 ? 'FOUND' : 'MISSING'}`)

    const search = page.locator('input[placeholder*="Search"], input[placeholder*="search"]')
    console.log(`[AUDIT] Search input: ${await search.count() > 0 ? 'FOUND' : 'MISSING'}`)

    // Template cards
    const pageText = await page.textContent('body')
    const hasTemplates = pageText?.includes('template') || pageText?.includes('Template')
    console.log(`[AUDIT] Template content: ${hasTemplates ? 'FOUND' : 'EMPTY'}`)

    await page.screenshot({ path: 'e2e/audit/screenshots/signatures-templates.png', fullPage: true })
  })

  test('5. Create template page loads with editor', async ({ page }) => {
    await page.goto(`/en/signatures/templates/new`, { waitUntil: 'domcontentloaded' })
    // Wait for form to load
    const nameInput = page.locator('input[name="name"], #name, input[placeholder*="name"]')
    await expect(nameInput.first()).toBeVisible({ timeout: 10000 }).catch(() => {})

    console.log(`[AUDIT] Template name: ${await nameInput.count() > 0 ? 'FOUND' : 'MISSING'}`)

    // PDF upload zone
    const pageText = await page.textContent('body')
    const hasUpload = pageText?.includes('Upload') || pageText?.includes('upload') || pageText?.includes('PDF') || pageText?.includes('drop')
    console.log(`[AUDIT] PDF upload zone: ${hasUpload ? 'FOUND' : 'MISSING'}`)

    // Field palette
    const hasFieldPalette = pageText?.includes('Signature') || pageText?.includes('signature')
    console.log(`[AUDIT] Field palette: ${hasFieldPalette ? 'FOUND' : 'MISSING'}`)

    // Create Template button
    const createBtn = page.locator('button:has-text("Create Template")')
    console.log(`[AUDIT] Create Template button: ${await createBtn.count() > 0 ? 'FOUND' : 'MISSING'}`)

    await page.screenshot({ path: 'e2e/audit/screenshots/signatures-template-new.png', fullPage: true })
  })

  test('6. Template PATCH verification — confirms [B] finding', async ({ page }) => {
    // Navigate to templates list to find any existing template
    await page.goto(`/en/signatures/templates`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('a:has-text("New Template"), button:has-text("New Template")').first()).toBeVisible({ timeout: 10000 }).catch(() => {})

    // Look for any template edit link
    const editLink = page.locator('a[href*="/signatures/templates/"]').first()
    if (await editLink.count() > 0) {
      await editLink.click()
      // Wait for template detail page to load
      await page.waitForURL(/\/signatures\/templates\//, { timeout: 10000 })

      console.log(`[AUDIT] Template detail URL: ${page.url()}`)

      // Try to find and click save button
      const saveBtn = page.locator('button:has-text("Save")')
      console.log(`[AUDIT] Save button: ${await saveBtn.count() > 0 ? 'FOUND' : 'MISSING'}`)

      // If save exists, try clicking it to see if PATCH fails
      if (await saveBtn.count() > 0) {
        // Listen for network errors
        const responsePromise = page.waitForResponse(
          resp => resp.url().includes('/api/signature-templates/'),
          { timeout: 5000 }
        ).catch(() => null)

        await saveBtn.first().click()
        const response = await responsePromise

        if (response) {
          console.log(`[AUDIT] PATCH response status: ${response.status()} — ${response.status() === 405 ? 'CONFIRMED BROKEN (405)' : response.status() === 200 ? 'UNEXPECTEDLY WORKING' : 'OTHER STATUS'}`)
        } else {
          console.log('[AUDIT] No network response captured (may use client-side only or timed out)')
        }
      }

      await page.screenshot({ path: 'e2e/audit/screenshots/signatures-template-edit.png', fullPage: true })
    } else {
      console.log('[AUDIT] No template links found to test PATCH')
    }
  })

  test('7. Document detail page structure', async ({ page }) => {
    // Navigate to signatures list and click first document
    await page.goto(`/en/signatures`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('a:has-text("New Document"), button:has-text("New Document")').first()).toBeVisible({ timeout: 10000 })

    const docLink = page.locator('a[href*="/signatures/"]').first()
    if (await docLink.count() > 0) {
      // Filter out template/new links
      const links = page.locator('a[href*="/signatures/"]:not([href*="template"]):not([href*="new"])')
      if (await links.count() > 0) {
        await links.first().click()
        // Wait for document detail page to load
        await page.waitForURL(/\/signatures\/[a-f0-9-]+/, { timeout: 10000 })

        console.log(`[AUDIT] Document detail URL: ${page.url()}`)

        const pageText = await page.textContent('body')

        // Expected elements
        const hasBack = await page.locator('a:has-text("Back")').count() > 0
        const hasStatus = pageText?.includes('Draft') || pageText?.includes('Sent') || pageText?.includes('Signed')
        const hasTimeline = pageText?.includes('Created') || pageText?.includes('Timeline')

        console.log(`[AUDIT] Back link: ${hasBack ? 'FOUND' : 'MISSING'}`)
        console.log(`[AUDIT] Status display: ${hasStatus ? 'FOUND' : 'MISSING'}`)
        console.log(`[AUDIT] Timeline section: ${hasTimeline ? 'FOUND' : 'MISSING'}`)

        // Action buttons (status-dependent)
        console.log(`[AUDIT] Send button: ${await page.locator('button:has-text("Send"), a:has-text("Send")').count() > 0 ? 'FOUND' : 'NOT SHOWN'}`)
        console.log(`[AUDIT] Delete button: ${await page.locator('button:has-text("Delete")').count() > 0 ? 'FOUND' : 'NOT SHOWN'}`)

        await page.screenshot({ path: 'e2e/audit/screenshots/signatures-detail.png', fullPage: true })
      } else {
        console.log('[AUDIT] No document links found (only template links)')
      }
    } else {
      console.log('[AUDIT] No documents to view')
    }
  })

  test('8. Send page structure', async ({ page }) => {
    // Try to reach send page (need a draft document)
    await page.goto(`/en/signatures`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('a:has-text("New Document"), button:has-text("New Document")').first()).toBeVisible({ timeout: 10000 })

    // Look for Send button (only appears on draft documents)
    const sendBtn = page.locator('a:has-text("Send"), button:has-text("Send")')
    if (await sendBtn.count() > 0) {
      await sendBtn.first().click()
      // Wait for send page to load
      await page.waitForURL(/\/send|\/signatures\//, { timeout: 10000 }).catch(() => {})

      console.log(`[AUDIT] Send page URL: ${page.url()}`)

      // Check for send form fields
      const recipientName = page.locator('input[name="recipient_name"], input[placeholder*="Name"], input[placeholder*="name"]')
      const recipientEmail = page.locator('input[name="recipient_email"], input[placeholder*="email"], input[type="email"]')
      console.log(`[AUDIT] Recipient name: ${await recipientName.count() > 0 ? 'FOUND' : 'MISSING'}`)
      console.log(`[AUDIT] Recipient email: ${await recipientEmail.count() > 0 ? 'FOUND' : 'MISSING'}`)

      const sendDocBtn = page.locator('button:has-text("Send Document")')
      console.log(`[AUDIT] Send Document button: ${await sendDocBtn.count() > 0 ? 'FOUND' : 'MISSING'}`)

      await page.screenshot({ path: 'e2e/audit/screenshots/signatures-send.png', fullPage: true })
    } else {
      console.log('[AUDIT] No Send button found (no draft documents available)')
    }
  })
})
