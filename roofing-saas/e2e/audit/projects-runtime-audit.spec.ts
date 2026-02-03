/**
 * Runtime Verification — Batch 2: Projects/Pipeline
 *
 * Verifies the projects/pipeline module against code audit findings.
 * Uses stored auth state from Playwright setup (no manual login).
 */
import { test, expect } from '@playwright/test'

test.use({ storageState: 'playwright/.auth/user.json' })


test.describe('Projects/Pipeline Runtime Audit', () => {

  test('1. Pipeline page loads with Kanban view', async ({ page }) => {
    await page.goto(`/en/projects`, { waitUntil: 'domcontentloaded' })
    // Wait for view toggle to confirm page is ready
    await expect(page.locator('[data-testid="view-mode-toggle"]')).toBeVisible({ timeout: 10000 })

    expect(page.url()).toContain('/projects')

    // View toggle buttons
    const kanbanBtn = page.locator('button:has-text("Kanban"), button:has-text("Board")')
    const tableBtn = page.locator('button:has-text("Table"), button:has-text("List")')
    console.log(`[AUDIT] Kanban toggle: ${await kanbanBtn.count() > 0 ? 'FOUND' : 'MISSING'}`)
    console.log(`[AUDIT] Table toggle: ${await tableBtn.count() > 0 ? 'FOUND' : 'MISSING'}`)

    // Analytics link
    const analyticsLink = page.locator('a[href*="analytics"]')
    console.log(`[AUDIT] Analytics link: ${await analyticsLink.count() > 0 ? 'FOUND' : 'MISSING'}`)

    // New Opportunity
    const newOpp = page.locator('a:has-text("New Opportunity"), a:has-text("Add")')
    console.log(`[AUDIT] New Opportunity: ${await newOpp.count() > 0 ? 'FOUND' : 'MISSING'}`)

    await page.screenshot({ path: 'e2e/audit/screenshots/projects-pipeline.png', fullPage: true })
  })

  test('2. Pipeline Kanban filters and search', async ({ page }) => {
    await page.goto(`/en/projects`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-testid="view-mode-toggle"]')).toBeVisible({ timeout: 10000 })

    // Quick filter chips
    const chips = ['All', 'Active Sales', 'In Production', 'Closed']
    for (const label of chips) {
      const chip = page.locator(`button:has-text("${label}")`)
      console.log(`[AUDIT] Quick filter "${label}": ${await chip.count() > 0 ? 'FOUND' : 'MISSING'}`)
    }

    // Search input
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]')
    console.log(`[AUDIT] Search input: ${await searchInput.count() > 0 ? 'FOUND' : 'MISSING'}`)

    // Pipeline value stat
    const pageText = await page.textContent('body')
    const hasPipelineValue = pageText?.includes('Pipeline Value') || pageText?.includes('pipeline value')
    console.log(`[AUDIT] Pipeline Value stat: ${hasPipelineValue ? 'FOUND' : 'MISSING'}`)

    // Reset Filters
    const resetBtn = page.locator('button:has-text("Reset")')
    console.log(`[AUDIT] Reset Filters: ${await resetBtn.count() > 0 ? 'FOUND' : 'MISSING'}`)
  })

  test('3. Pipeline Table view loads', async ({ page }) => {
    await page.goto(`/en/projects`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-testid="view-mode-toggle"]')).toBeVisible({ timeout: 10000 })

    // Try switching to table view
    const tableBtn = page.locator('[data-testid="table-view-button"]')
    if (await tableBtn.count() > 0) {
      await tableBtn.first().click()
      // Wait for table view container to appear
      await expect(page.locator('[data-testid="table-view"]')).toBeVisible({ timeout: 10000 })

      // Check for table stats cards
      const pageText = await page.textContent('body')
      const hasStats = pageText?.includes('Total Leads') || pageText?.includes('Total') || pageText?.includes('Pipeline')
      console.log(`[AUDIT] Table view stats: ${hasStats ? 'FOUND' : 'CHECK'}`)

      // Check for table headers
      const hasTable = await page.locator('table').count()
      console.log(`[AUDIT] Table element: ${hasTable > 0 ? 'FOUND' : 'MISSING'}`)

      // Pagination
      const prevBtn = page.locator('button:has-text("Previous")')
      const nextBtn = page.locator('button:has-text("Next")')
      console.log(`[AUDIT] Pagination Previous: ${await prevBtn.count() > 0 ? 'FOUND' : 'MISSING'}`)
      console.log(`[AUDIT] Pagination Next: ${await nextBtn.count() > 0 ? 'FOUND' : 'MISSING'}`)

      await page.screenshot({ path: 'e2e/audit/screenshots/projects-table-view.png', fullPage: true })
    } else {
      console.log('[AUDIT] Could not find Table view toggle')
    }
  })

  test('4. Project detail page loads with tabs', async ({ page }) => {
    await page.goto(`/en/projects`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-testid="view-mode-toggle"]')).toBeVisible({ timeout: 10000 })

    // Find first project link on the page
    const projectLink = page.locator('a[href*="/projects/"]').first()
    if (await projectLink.count() > 0) {
      await projectLink.click()
      // Wait for project detail page to load
      await page.waitForURL(/\/projects\/[a-f0-9-]+/, { timeout: 10000 })

      console.log(`[AUDIT] Project detail URL: ${page.url()}`)

      // Back link
      const backLink = page.locator('a:has-text("Back")')
      console.log(`[AUDIT] Back link: ${await backLink.count() > 0 ? 'FOUND' : 'MISSING'}`)

      // Status badge
      const pageText = await page.textContent('body')

      // Action buttons
      console.log(`[AUDIT] Start Production: ${await page.locator('button:has-text("Start Production")').count() > 0 ? 'FOUND' : 'NOT SHOWN (may be stage-dependent)'}`)
      console.log(`[AUDIT] Job Costing link: ${await page.locator('a:has-text("Job Costing"), a[href*="costing"]').count() > 0 ? 'FOUND' : 'MISSING'}`)
      console.log(`[AUDIT] Claims link: ${await page.locator('a:has-text("Claims"), a[href*="claims"]').count() > 0 ? 'FOUND' : 'MISSING'}`)
      console.log(`[AUDIT] Edit Project link: ${await page.locator('a:has-text("Edit"), a[href*="edit"]').count() > 0 ? 'FOUND' : 'MISSING'}`)

      // Tabs
      const tabs = ['Overview', 'Quote Options', 'Jobs', 'Files', 'Contact']
      for (const tab of tabs) {
        const tabBtn = page.locator(`button:has-text("${tab}"), [role="tab"]:has-text("${tab}")`)
        console.log(`[AUDIT] Tab "${tab}": ${await tabBtn.count() > 0 ? 'FOUND' : 'MISSING'}`)
      }

      // Presence indicator
      const hasPresence = pageText?.includes('viewing') || pageText?.includes('active')
      console.log(`[AUDIT] Presence indicator: ${hasPresence ? 'FOUND' : 'NOT VISIBLE'}`)

      await page.screenshot({ path: 'e2e/audit/screenshots/projects-detail.png', fullPage: true })
    } else {
      console.log('[AUDIT] No project links found on pipeline page')
    }
  })

  test('5. Project detail — Quote Options tab (STUBS check)', async ({ page }) => {
    await page.goto(`/en/projects`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-testid="view-mode-toggle"]')).toBeVisible({ timeout: 10000 })

    const projectLink = page.locator('a[href*="/projects/"]').first()
    if (await projectLink.count() > 0) {
      await projectLink.click()
      await page.waitForURL(/\/projects\/[a-f0-9-]+/, { timeout: 10000 })

      // Click Quote Options tab
      const quoteTab = page.locator('button:has-text("Quote Options"), [role="tab"]:has-text("Quote")')
      if (await quoteTab.count() > 0) {
        await quoteTab.first().click()
        // Wait for tab content to render
        await page.waitForResponse(resp => resp.url().includes('/api/'), { timeout: 5000 }).catch(() => {})

        // STUB: Send Proposal button
        const sendProposal = page.locator('button:has-text("Send Proposal")')
        console.log(`[AUDIT] Send Proposal button: ${await sendProposal.count() > 0 ? 'FOUND (STUB - console.log only)' : 'NOT VISIBLE'}`)

        // STUB: Download PDF button
        const downloadPdf = page.locator('button:has-text("Download"), button:has-text("PDF")')
        console.log(`[AUDIT] Download PDF button: ${await downloadPdf.count() > 0 ? 'FOUND (STUB - console.log only)' : 'NOT VISIBLE'}`)

        // STUB: Create Quote Options
        const createQuote = page.locator('button:has-text("Create Quote")')
        console.log(`[AUDIT] Create Quote Options: ${await createQuote.count() > 0 ? 'FOUND (STUB - disabled)' : 'NOT VISIBLE'}`)

        // View mode toggle
        const summaryBtn = page.locator('button:has-text("Summary")')
        const detailedBtn = page.locator('button:has-text("Detailed")')
        console.log(`[AUDIT] View Summary: ${await summaryBtn.count() > 0 ? 'FOUND' : 'MISSING'}`)
        console.log(`[AUDIT] View Detailed: ${await detailedBtn.count() > 0 ? 'FOUND' : 'MISSING'}`)

        await page.screenshot({ path: 'e2e/audit/screenshots/projects-quote-options.png', fullPage: true })
      } else {
        console.log('[AUDIT] Quote Options tab not found')
      }
    }
  })

  test('6. Project detail — Jobs tab', async ({ page }) => {
    await page.goto(`/en/projects`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-testid="view-mode-toggle"]')).toBeVisible({ timeout: 10000 })

    const projectLink = page.locator('a[href*="/projects/"]').first()
    if (await projectLink.count() > 0) {
      await projectLink.click()
      await page.waitForURL(/\/projects\/[a-f0-9-]+/, { timeout: 10000 })

      const jobsTab = page.locator('button:has-text("Jobs"), [role="tab"]:has-text("Jobs")')
      if (await jobsTab.count() > 0) {
        await jobsTab.first().click()
        // Wait for tab content to render
        await page.waitForResponse(resp => resp.url().includes('/api/'), { timeout: 5000 }).catch(() => {})

        // Create Job link
        const createJob = page.locator('a:has-text("Create Job"), a:has-text("+ Create")')
        console.log(`[AUDIT] Create Job: ${await createJob.count() > 0 ? 'FOUND' : 'MISSING'}`)

        await page.screenshot({ path: 'e2e/audit/screenshots/projects-jobs-tab.png', fullPage: true })
      }
    }
  })

  test('7. Project edit page loads pre-populated', async ({ page }) => {
    await page.goto(`/en/projects`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-testid="view-mode-toggle"]')).toBeVisible({ timeout: 10000 })

    // Navigate to first project
    const projectLink = page.locator('a[href*="/projects/"]').first()
    if (await projectLink.count() > 0) {
      await projectLink.click()
      await page.waitForURL(/\/projects\/[a-f0-9-]+/, { timeout: 10000 })

      // Click edit link
      const editLink = page.locator('a:has-text("Edit"), a[href*="edit"]').first()
      if (await editLink.count() > 0) {
        await editLink.click()
        // Wait for edit page to load
        await page.waitForURL(/\/edit/, { timeout: 10000 })

        console.log(`[AUDIT] Edit page URL: ${page.url()}`)

        // Check form fields
        const nameInput = page.locator('#name, input[name="name"]').first()
        if (await nameInput.count() > 0) {
          const nameVal = await nameInput.inputValue()
          console.log(`[AUDIT] Name pre-populated: "${nameVal}" (${nameVal ? 'YES' : 'EMPTY'})`)
        }

        // Save button
        const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update")')
        console.log(`[AUDIT] Save button: ${await saveBtn.count() > 0 ? 'FOUND' : 'MISSING'}`)

        // Cancel link
        const cancelLink = page.locator('a:has-text("Cancel"), button:has-text("Cancel")')
        console.log(`[AUDIT] Cancel: ${await cancelLink.count() > 0 ? 'FOUND' : 'MISSING'}`)

        await page.screenshot({ path: 'e2e/audit/screenshots/projects-edit.png', fullPage: true })
      } else {
        console.log('[AUDIT] No edit link found on project detail')
      }
    }
  })

  test('8. Job Costing page loads with KPIs', async ({ page }) => {
    await page.goto(`/en/projects`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-testid="view-mode-toggle"]')).toBeVisible({ timeout: 10000 })

    const projectLink = page.locator('a[href*="/projects/"]').first()
    if (await projectLink.count() > 0) {
      await projectLink.click()
      await page.waitForURL(/\/projects\/[a-f0-9-]+/, { timeout: 10000 })

      // Navigate to costing
      const costingLink = page.locator('a:has-text("Job Costing"), a[href*="costing"]').first()
      if (await costingLink.count() > 0) {
        await costingLink.click()
        // Wait for costing page to load
        await page.waitForURL(/\/costing/, { timeout: 10000 })

        console.log(`[AUDIT] Costing URL: ${page.url()}`)

        const pageText = await page.textContent('body')

        // KPI cards
        const kpis = ['Revenue', 'Estimated Cost', 'Actual Cost', 'Profit']
        for (const kpi of kpis) {
          const hasKpi = pageText?.includes(kpi)
          console.log(`[AUDIT] KPI "${kpi}": ${hasKpi ? 'FOUND' : 'MISSING'}`)
        }

        // Add Expense button
        const addExpense = page.locator('button:has-text("Add Expense")')
        console.log(`[AUDIT] Add Expense: ${await addExpense.count() > 0 ? 'FOUND' : 'MISSING'}`)

        // Set Revenue button
        const setRevenue = page.locator('button:has-text("Set Revenue")')
        console.log(`[AUDIT] Set Revenue: ${await setRevenue.count() > 0 ? 'FOUND' : 'MISSING'}`)

        await page.screenshot({ path: 'e2e/audit/screenshots/projects-costing.png', fullPage: true })
      } else {
        console.log('[AUDIT] No Job Costing link found')
      }
    }
  })

  test('9. New Project guidance page', async ({ page }) => {
    await page.goto(`/en/projects/new`, { waitUntil: 'domcontentloaded' })
    // Wait for guidance page content to render
    await expect(page.locator('a:has-text("Contact"), button:has-text("Contact")').first()).toBeVisible({ timeout: 10000 }).catch(() => {})

    console.log(`[AUDIT] /projects/new URL: ${page.url()}`)

    const pageText = await page.textContent('body')

    // Should show guidance — projects created from contacts
    const goToContacts = page.locator('a:has-text("Contact"), button:has-text("Contact")')
    console.log(`[AUDIT] Go to Contacts: ${await goToContacts.count() > 0 ? 'FOUND' : 'MISSING'}`)

    const viewPipeline = page.locator('a:has-text("Pipeline"), a:has-text("Projects")')
    console.log(`[AUDIT] View Pipeline: ${await viewPipeline.count() > 0 ? 'FOUND' : 'MISSING'}`)

    await page.screenshot({ path: 'e2e/audit/screenshots/projects-new-guidance.png', fullPage: true })
  })

  test('10. Project card stage navigation', async ({ page }) => {
    await page.goto(`/en/projects`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-testid="view-mode-toggle"]')).toBeVisible({ timeout: 10000 })

    // Look for stage navigation arrows on project cards
    const stageArrows = page.locator('button[aria-label*="stage"], button:has-text("\u2192"), button:has-text("\u2190")')
    console.log(`[AUDIT] Stage nav buttons: ${await stageArrows.count()} found`)

    // Check for drag-and-drop Kanban columns
    const columns = page.locator('[data-stage], [class*="pipeline-column"], [class*="kanban"]')
    console.log(`[AUDIT] Kanban columns: ${await columns.count()} found`)

    // Check project card structure
    const cards = page.locator('[class*="project-card"], [class*="ProjectCard"]')
    console.log(`[AUDIT] Project cards: ${await cards.count()} found`)

    await page.screenshot({ path: 'e2e/audit/screenshots/projects-kanban-cards.png', fullPage: true })
  })
})
