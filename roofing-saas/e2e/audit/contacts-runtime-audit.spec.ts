/**
 * Runtime Verification — Batch 1: Contacts
 *
 * Verifies the contacts module against code audit findings.
 * Uses stored auth state from Playwright setup (no manual login).
 */
import { test, expect } from '@playwright/test'

// Use stored auth state
test.use({ storageState: 'playwright/.auth/user.json' })

test.describe('Contacts Runtime Audit', () => {

  test('1. Contacts list page loads and renders table', async ({ page }) => {
    await page.goto(`/en/contacts`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    // Verify page loaded (not redirected to login)
    expect(page.url()).toContain('/contacts')

    // Check for "Add Contact" button
    const addButton = page.locator('a:has-text("Add Contact"), button:has-text("Add Contact")')
    await expect(addButton.first()).toBeVisible({ timeout: 10000 })

    // Check for table or empty state
    const hasTable = await page.locator('table').count()
    const hasEmptyState = await page.locator('text=No contacts found').count()

    console.log(`[AUDIT] Table visible: ${hasTable > 0}, Empty state: ${hasEmptyState > 0}`)
    expect(hasTable > 0 || hasEmptyState > 0).toBeTruthy()

    await page.screenshot({ path: 'e2e/audit/screenshots/contacts-list.png', fullPage: true })
  })

  test('2. Quick filter chips render and are clickable', async ({ page }) => {
    await page.goto(`/en/contacts`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    const chipLabels = ['Urgent', 'High Priority', 'New Leads', 'Active Deals', 'Customers', 'Leads Only']

    for (const label of chipLabels) {
      const chip = page.locator(`button:has-text("${label}")`)
      const count = await chip.count()
      console.log(`[AUDIT] Quick filter "${label}": ${count > 0 ? 'FOUND' : 'MISSING'}`)
    }

    // Click "New Leads" and verify URL updates
    const newLeadsChip = page.locator('button:has-text("New Leads")').first()
    if (await newLeadsChip.count() > 0) {
      await newLeadsChip.click()
      await page.waitForTimeout(2000)
      console.log(`[AUDIT] After clicking "New Leads", URL: ${page.url()}`)
    }
  })

  test('3. Search functionality works', async ({ page }) => {
    await page.goto(`/en/contacts`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    const searchInput = page.locator('#search').first()
    if (await searchInput.count() > 0) {
      await searchInput.fill('test')
      const applyBtn = page.locator('button:has-text("Apply Filters")')
      if (await applyBtn.count() > 0) {
        await applyBtn.first().click()
        await page.waitForTimeout(3000)
      }
      console.log(`[AUDIT] Search applied, URL: ${page.url()}`)
    } else {
      console.log('[AUDIT] Search input with id="search" NOT FOUND')
    }
    await page.screenshot({ path: 'e2e/audit/screenshots/contacts-search-result.png', fullPage: true })
  })

  test('4. Create contact form loads with all sections', async ({ page }) => {
    await page.goto(`/en/contacts/new`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    const fields = [
      'first_name', 'last_name', 'email', 'phone', 'mobile_phone',
      'company', 'contact_category', 'type', 'stage', 'priority',
      'address_street', 'property_type', 'roof_type', 'insurance_carrier', 'job_type'
    ]

    for (const id of fields) {
      const field = page.locator(`#${id}`)
      const count = await field.count()
      console.log(`[AUDIT] Form field "${id}": ${count > 0 ? 'FOUND' : 'MISSING'}`)
    }

    // Consent checkboxes
    for (const id of ['text_consent', 'auto_text_consent', 'auto_call_consent', 'recording_consent']) {
      const field = page.locator(`#${id}`)
      console.log(`[AUDIT] Consent "${id}": ${await field.count() > 0 ? 'FOUND' : 'MISSING'}`)
    }

    // Confirm MISSING fields from code audit
    console.log(`[AUDIT] Tags field: ${await page.locator('#tags').count() > 0 ? 'FOUND' : 'CONFIRMED MISSING'}`)
    console.log(`[AUDIT] Assigned To: ${await page.locator('#assigned_to').count() > 0 ? 'FOUND' : 'CONFIRMED MISSING'}`)

    await page.screenshot({ path: 'e2e/audit/screenshots/contacts-new-form.png', fullPage: true })
  })

  test('5. Create and verify a test contact end-to-end', async ({ page }) => {
    const ts = Date.now()

    await page.goto(`/en/contacts/new`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    await page.fill('#first_name', 'RuntimeAudit')
    await page.fill('#last_name', `Contact${ts}`)
    await page.fill('#email', `audit-${ts}@test.com`)
    await page.fill('#phone', '5559876543')

    const submitBtn = page.locator('button:has-text("Create Contact")')
    await submitBtn.click()

    // Wait for response — could redirect or show dialog
    await page.waitForTimeout(5000)

    const currentUrl = page.url()
    console.log(`[AUDIT] After create, URL: ${currentUrl}`)

    // Handle project prompt if it appears
    const projectPrompt = page.locator('button:has-text("just save"), button:has-text("No")')
    if (await projectPrompt.count() > 0) {
      console.log('[AUDIT] Project prompt dialog appeared')
      await projectPrompt.first().click()
      await page.waitForTimeout(2000)
    }

    // Check for errors
    const errorBanner = page.locator('[role="alert"], .text-red-500, .text-destructive')
    if (await errorBanner.count() > 0) {
      const errorText = await errorBanner.first().textContent()
      console.log(`[AUDIT] ERROR on create: ${errorText}`)
    }

    console.log(`[AUDIT] Final URL: ${page.url()}`)
    await page.screenshot({ path: 'e2e/audit/screenshots/contacts-after-create.png', fullPage: true })
  })

  test('6. Contact detail page — verify present and missing elements', async ({ page }) => {
    await page.goto(`/en/contacts`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    // Click first contact link
    const firstLink = page.locator('table tbody a[href*="/contacts/"]').first()

    if (await firstLink.count() > 0) {
      await firstLink.click()
      await page.waitForTimeout(3000)

      console.log(`[AUDIT] Contact detail URL: ${page.url()}`)

      // PRESENT elements
      console.log(`[AUDIT] Edit button: ${await page.locator('a:has-text("Edit")').count() > 0 ? 'FOUND' : 'MISSING'}`)
      console.log(`[AUDIT] Back button: ${await page.locator('a:has-text("Back")').count() > 0 ? 'FOUND' : 'MISSING'}`)
      console.log(`[AUDIT] Create Project: ${await page.locator('button:has-text("Create Project")').count() > 0 ? 'FOUND' : 'MISSING'}`)

      // MISSING elements (from code audit)
      console.log(`[AUDIT] Delete button: ${await page.locator('button:has-text("Delete")').count() > 0 ? 'UNEXPECTEDLY FOUND' : 'CONFIRMED MISSING'}`)

      // Search for any activity/timeline/history section
      const pageText = await page.textContent('body')
      const hasActivity = pageText?.includes('Activity') || pageText?.includes('Timeline') || pageText?.includes('History')
      console.log(`[AUDIT] Activity/Timeline section: ${hasActivity ? 'FOUND (check context)' : 'CONFIRMED MISSING'}`)

      const hasNotes = pageText?.includes('Notes')
      console.log(`[AUDIT] Notes section: ${hasNotes ? 'FOUND (check context)' : 'CONFIRMED MISSING'}`)

      const hasLeadScore = pageText?.includes('Lead Score') || pageText?.includes('Score Breakdown')
      console.log(`[AUDIT] Lead Score display: ${hasLeadScore ? 'FOUND' : 'CONFIRMED MISSING'}`)

      await page.screenshot({ path: 'e2e/audit/screenshots/contacts-detail.png', fullPage: true })
    } else {
      console.log('[AUDIT] No contacts in table to click')
    }
  })

  test('7. Edit contact form loads pre-populated', async ({ page }) => {
    await page.goto(`/en/contacts`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    const editLink = page.locator('table a[href*="/edit"]').first()

    if (await editLink.count() > 0) {
      await editLink.click()
      await page.waitForTimeout(3000)

      console.log(`[AUDIT] Edit page URL: ${page.url()}`)

      const firstName = await page.locator('#first_name').inputValue()
      console.log(`[AUDIT] First name pre-populated: "${firstName}" (${firstName ? 'YES' : 'EMPTY'})`)

      const updateBtn = page.locator('button:has-text("Update Contact")')
      console.log(`[AUDIT] Update button: ${await updateBtn.count() > 0 ? 'FOUND' : 'MISSING'}`)

      await page.screenshot({ path: 'e2e/audit/screenshots/contacts-edit.png', fullPage: true })
    } else {
      console.log('[AUDIT] No edit links found in contacts table')
    }
  })

  test('8. Bulk actions and pagination', async ({ page }) => {
    await page.goto(`/en/contacts`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    // Check pagination
    const prevBtn = page.locator('button:has-text("Previous")')
    const nextBtn = page.locator('button:has-text("Next")')
    console.log(`[AUDIT] Previous button: ${await prevBtn.count() > 0 ? 'FOUND' : 'MISSING'}`)
    console.log(`[AUDIT] Next button: ${await nextBtn.count() > 0 ? 'FOUND' : 'MISSING'}`)

    // Try selecting all via header checkbox
    const headerCheckbox = page.locator('thead input[type="checkbox"]').first()
    if (await headerCheckbox.count() > 0) {
      await headerCheckbox.check()
      await page.waitForTimeout(500)

      // Look for bulk actions
      const pageText = await page.textContent('body')
      const hasBulkBar = pageText?.includes('Change Stage') || pageText?.includes('Clear')
      console.log(`[AUDIT] Bulk actions bar: ${hasBulkBar ? 'APPEARED' : 'NOT VISIBLE'}`)

      await page.screenshot({ path: 'e2e/audit/screenshots/contacts-bulk-actions.png', fullPage: true })
    } else {
      console.log('[AUDIT] No header checkbox found')
    }
  })

  test('9. Column sorting', async ({ page }) => {
    await page.goto(`/en/contacts`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    const nameHeader = page.locator('th:has-text("Name")').first()
    if (await nameHeader.count() > 0) {
      await nameHeader.click()
      await page.waitForTimeout(2000)
      const url = page.url()
      console.log(`[AUDIT] After Name sort, URL: ${url}`)
      console.log(`[AUDIT] Sort params present: ${url.includes('sort_by') ? 'YES' : 'NO'}`)
    }
  })

  test('10. Delete uses browser confirm()', async ({ page }) => {
    await page.goto(`/en/contacts`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    let dialogMessage = ''
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message()
      console.log(`[AUDIT] Browser dialog: "${dialogMessage}"`)
      await dialog.dismiss()
    })

    // Find delete button (last icon button in first data row)
    const rows = page.locator('table tbody tr')
    if (await rows.count() > 0) {
      // The delete button should be the last button in the row
      const actionButtons = rows.first().locator('td:last-child button, td:last-child a')
      const count = await actionButtons.count()
      console.log(`[AUDIT] Action buttons in first row: ${count}`)

      if (count > 0) {
        // Click the last action button (should be delete)
        await actionButtons.last().click()
        await page.waitForTimeout(1000)
        console.log(`[AUDIT] Browser confirm() used: ${dialogMessage ? 'YES — confirms [P] finding' : 'NO — may use custom dialog or this is not delete button'}`)
      }
    }
  })

})
