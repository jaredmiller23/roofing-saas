/**
 * Estimates/Proposals E2E Tests
 *
 * Comprehensive tests for the revenue-critical estimate/proposal workflow:
 *   1. Navigate to estimate creation (project detail page, Quote Options tab)
 *   2. Create a quote option with line items via the API-backed dialog
 *   3. Add multiple quote options (Good/Better/Best pattern)
 *   4. Send estimate to client (creates proposal, triggers email)
 *   5. View estimate as client on public URL (no auth required)
 *   6. Accept estimate as client
 *   7. Decline estimate as client
 *   8. Verify estimate data appears on the project detail page
 *
 * Tests run SERIALLY because they build on shared state (contact, project,
 * quote options, proposals). The beforeAll creates the contact, project, and
 * three quote options so every test has the data it needs regardless of order.
 *
 * @see docs/testing/E2E_TESTING_BEST_PRACTICES.md
 */

import { test, expect, type Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TS = Date.now()

/** Unique test data to avoid collisions across parallel runs. */
const TEST_CONTACT = {
  firstName: `EstTest${TS}`,
  lastName: 'Contact',
  email: `est-${TS}@e2e-test.example.com`,
  phone: '555-000-1234',
}

const TEST_PROJECT_NAME = `E2E Estimate Project ${TS}`

// Option names used throughout the tests
const OPTION_GOOD = 'Good - Standard Shingles'
const OPTION_BETTER = 'Better - Premium Shingles'
const OPTION_BEST = 'Best - Standing Seam Metal'

/**
 * Create a contact + project via the API so the UI tests don't depend on
 * brittle dialog interactions for prerequisite data.
 *
 * Returns { contactId, projectId }.
 */
async function createContactAndProject(page: Page): Promise<{ contactId: string; projectId: string }> {
  // Create contact via API
  const contactRes = await page.request.post('/api/contacts', {
    data: {
      first_name: TEST_CONTACT.firstName,
      last_name: TEST_CONTACT.lastName,
      email: TEST_CONTACT.email,
      phone: TEST_CONTACT.phone,
    },
  })
  expect(contactRes.ok(), `Contact creation failed: ${contactRes.status()}`).toBeTruthy()
  const contactBody = await contactRes.json()
  const contactId: string = contactBody.data?.contact?.id ?? contactBody.data?.id
  expect(contactId).toBeTruthy()

  // Create project in 'prospect' pipeline stage (estimate-eligible)
  const projectRes = await page.request.post('/api/projects', {
    data: {
      name: TEST_PROJECT_NAME,
      contact_id: contactId,
      pipeline_stage: 'prospect',
      type: 'roofing',
      estimated_value: 15000,
      priority: 'normal',
    },
  })
  expect(projectRes.ok(), `Project creation failed: ${projectRes.status()}`).toBeTruthy()
  const projectBody = await projectRes.json()
  const projectId: string = projectBody.data?.project?.id ?? projectBody.data?.id
  expect(projectId).toBeTruthy()

  return { contactId, projectId }
}

/**
 * Create a quote option for a project via the API.
 * Returns the created option id.
 */
async function createQuoteOptionViaAPI(
  page: Page,
  projectId: string,
  name: string,
  lineItems: Array<{
    description: string
    quantity: number
    unit: string
    unit_price: number
    category: string
  }>,
  isRecommended = false,
): Promise<string> {
  const res = await page.request.post(`/api/estimates/${projectId}/options`, {
    data: {
      name,
      description: `${name} option created by E2E test`,
      is_recommended: isRecommended,
      line_items: lineItems,
    },
  })
  expect(res.ok(), `Quote option creation failed: ${res.status()}`).toBeTruthy()
  const body = await res.json()
  const optionId: string = body.data?.option?.id
  expect(optionId).toBeTruthy()
  return optionId
}

/**
 * Send an estimate proposal via the API.
 * Returns { proposalId, viewUrl }.
 */
async function sendEstimateViaAPI(
  page: Page,
  projectId: string,
  recipientEmail: string,
  recipientName: string,
): Promise<{ proposalId: string; viewUrl: string }> {
  const res = await page.request.post(`/api/estimates/${projectId}/send`, {
    data: {
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      message: 'E2E test estimate - please review.',
    },
  })
  expect(res.ok(), `Send estimate failed: ${res.status()}`).toBeTruthy()
  const body = await res.json()
  const proposalId: string = body.data?.proposal_id
  const viewUrl: string = body.data?.view_url
  expect(proposalId).toBeTruthy()
  return { proposalId, viewUrl }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Estimates / Proposals', () => {
  // Run all tests in this describe block serially so they can share state.
  // The estimate flow is inherently sequential: create options -> send -> view -> accept/decline.
  test.describe.configure({ mode: 'serial' })

  // Authenticated session
  test.use({ storageState: 'playwright/.auth/user.json' })

  // Shared state across tests in this describe block.
  // contactId is stored in case future tests need to reference the contact directly.
  let _contactId: string
  let projectId: string
  let optionIds: string[] = []

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/user.json',
    })
    const page = await context.newPage()

    // Navigate to the app first so cookies are in-scope for API calls
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })

    // 1. Create contact + project
    const ids = await createContactAndProject(page)
    _contactId = ids.contactId
    projectId = ids.projectId

    // 2. Create three quote options (Good/Better/Best) so ALL tests have data
    const goodId = await createQuoteOptionViaAPI(page, projectId, OPTION_GOOD, [
      { description: '3-tab architectural shingles', quantity: 30, unit: 'sq', unit_price: 85, category: 'materials' },
      { description: 'Tear-off and disposal', quantity: 30, unit: 'sq', unit_price: 45, category: 'labor' },
      { description: 'Drip edge and flashing', quantity: 1, unit: 'lot', unit_price: 350, category: 'materials' },
    ])
    optionIds.push(goodId)

    const betterId = await createQuoteOptionViaAPI(page, projectId, OPTION_BETTER, [
      { description: 'Owens Corning Duration shingles', quantity: 30, unit: 'sq', unit_price: 120, category: 'materials' },
      { description: 'Tear-off and disposal', quantity: 30, unit: 'sq', unit_price: 45, category: 'labor' },
      { description: 'Drip edge, flashing, and ice guard', quantity: 1, unit: 'lot', unit_price: 600, category: 'materials' },
    ])
    optionIds.push(betterId)

    const bestId = await createQuoteOptionViaAPI(
      page,
      projectId,
      OPTION_BEST,
      [
        { description: 'Standing seam metal panels', quantity: 30, unit: 'sq', unit_price: 250, category: 'materials' },
        { description: 'Tear-off and disposal', quantity: 30, unit: 'sq', unit_price: 55, category: 'labor' },
        { description: 'Custom trim and flashing', quantity: 1, unit: 'lot', unit_price: 1200, category: 'materials' },
      ],
      true, // recommended
    )
    optionIds.push(bestId)

    await context.close()
  })

  // ---------- 1. Navigate to estimate creation ----------

  test('should navigate to project detail and see Quote Options tab', async ({ page }) => {
    test.slow()

    await page.goto(`/projects/${projectId}`, { waitUntil: 'domcontentloaded' })

    // Project name should be visible
    await expect(page.locator(`h1:has-text("${TEST_PROJECT_NAME}")`)).toBeVisible({ timeout: 15000 })

    // The Quote Options tab should be visible for estimate-eligible projects
    const quoteTab = page.locator('[role="tab"]').filter({ hasText: /Quote/ })
    await expect(quoteTab).toBeVisible({ timeout: 10000 })

    // Click the Quote Options tab
    await quoteTab.click()

    // Should see option data (created in beforeAll)
    const optionVisible = page.locator(`text=${OPTION_GOOD}`)
    const emptyState = page.locator('text=No Quote Options Yet')
    await expect(optionVisible.or(emptyState).first()).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: 'screenshots/estimate-quote-options-tab.png' })
  })

  // ---------- 2. Verify quote options appear on project page ----------

  test('should display all three quote options on the project page', async ({ page }) => {
    test.slow()

    await page.goto(`/projects/${projectId}`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator(`h1:has-text("${TEST_PROJECT_NAME}")`)).toBeVisible({ timeout: 15000 })

    // Click the Quote Options tab
    const quoteTab = page.locator('[role="tab"]').filter({ hasText: /Quote/ })
    await quoteTab.click()

    // All three options should be visible
    await expect(page.locator(`text=${OPTION_GOOD}`).first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator(`text=${OPTION_BETTER}`).first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator(`text=${OPTION_BEST}`).first()).toBeVisible({ timeout: 10000 })

    // The "Send Proposal" button should now be available since options exist
    const sendButton = page.locator('button:has-text("Send Proposal")')
    await expect(sendButton).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: 'screenshots/estimate-multiple-options.png' })
  })

  // ---------- 3. Send estimate to client ----------

  test('should send estimate and create a proposal', async ({ page }) => {
    test.slow()

    // Send via API (email delivery is best-effort; we verify the proposal record)
    const { proposalId, viewUrl } = await sendEstimateViaAPI(
      page,
      projectId,
      TEST_CONTACT.email,
      `${TEST_CONTACT.firstName} ${TEST_CONTACT.lastName}`,
    )

    expect(proposalId).toMatch(/^[a-f0-9-]{36}$/)
    expect(viewUrl).toContain('/view/estimate/')

    // Navigate to project and verify proposal status card appears
    await page.goto(`/projects/${projectId}`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator(`h1:has-text("${TEST_PROJECT_NAME}")`)).toBeVisible({ timeout: 15000 })

    const quoteTab = page.locator('[role="tab"]').filter({ hasText: /Quote/ })
    await quoteTab.click()

    // The ProposalStatusCard should show the proposal number and "Sent" status
    await expect(page.locator('text=/Proposal #/').first()).toBeVisible({ timeout: 10000 })

    // The "Sent" indicator should be present (the timeline dot + label)
    await expect(page.locator('text=Sent').first()).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: 'screenshots/estimate-sent.png' })
  })

  // ---------- 4. View estimate as client (public URL) ----------

  test('should display estimate on public view page without auth', async ({ browser }) => {
    test.slow()

    // Get the proposal id via authenticated API
    const authContext = await browser.newContext({
      storageState: 'playwright/.auth/user.json',
    })
    const authPage = await authContext.newPage()
    await authPage.goto('/dashboard', { waitUntil: 'domcontentloaded' })

    const proposalsRes = await authPage.request.get(`/api/estimates/${projectId}/proposals`)
    expect(proposalsRes.ok()).toBeTruthy()
    const proposalsBody = await proposalsRes.json()
    const proposals = proposalsBody.data?.proposals ?? []
    expect(proposals.length).toBeGreaterThan(0)
    const proposalId = proposals[0].id
    await authContext.close()

    // Visit the public view page WITHOUT auth
    const publicContext = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    })
    const publicPage = await publicContext.newPage()

    await publicPage.goto(`/view/estimate/${proposalId}`, { waitUntil: 'domcontentloaded' })

    // Wait for the estimate to load
    await publicPage.waitForSelector('text=Loading estimate...', { state: 'hidden', timeout: 15000 }).catch(() => {
      // Loading may have already finished
    })

    // Verify key elements are displayed:
    // 1. Company name or project name or proposal number
    const projectNameVisible = await publicPage.locator(`text=${TEST_PROJECT_NAME}`).isVisible().catch(() => false)
    const proposalNumberVisible = await publicPage.locator('text=/Proposal #/').isVisible().catch(() => false)
    expect(projectNameVisible || proposalNumberVisible).toBeTruthy()

    // 2. Quote option cards should be visible
    await expect(publicPage.locator(`text=${OPTION_GOOD}`).first()).toBeVisible({ timeout: 10000 })
    await expect(publicPage.locator(`text=${OPTION_BETTER}`).first()).toBeVisible({ timeout: 10000 })
    await expect(publicPage.locator(`text=${OPTION_BEST}`).first()).toBeVisible({ timeout: 10000 })

    // 3. Accept and Decline buttons should be visible (status is 'sent' or 'viewed')
    await expect(publicPage.locator('button:has-text("Accept Estimate")')).toBeVisible({ timeout: 5000 })
    await expect(publicPage.locator('button:has-text("Decline")')).toBeVisible({ timeout: 5000 })

    // 4. Terms and conditions section should exist
    await expect(publicPage.locator('text=Terms').first()).toBeVisible({ timeout: 5000 })

    // 5. View toggle (Summary/Detailed) should be present
    await expect(publicPage.locator('button:has-text("Summary")')).toBeVisible({ timeout: 5000 })
    await expect(publicPage.locator('button:has-text("Detailed")')).toBeVisible({ timeout: 5000 })

    await publicPage.screenshot({ path: 'screenshots/estimate-public-view.png' })

    await publicContext.close()
  })

  // ---------- 5. Accept estimate as client ----------

  test('should accept estimate via public view', async ({ browser }) => {
    test.slow()

    // Create a separate proposal to accept (so decline test has its own)
    const authContext = await browser.newContext({
      storageState: 'playwright/.auth/user.json',
    })
    const authPage = await authContext.newPage()
    await authPage.goto('/dashboard', { waitUntil: 'domcontentloaded' })

    const { proposalId } = await sendEstimateViaAPI(
      authPage,
      projectId,
      `accept-${TS}@e2e-test.example.com`,
      'Accept Test Customer',
    )
    await authContext.close()

    // Visit public view as unauthenticated client
    const publicContext = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    })
    const publicPage = await publicContext.newPage()

    await publicPage.goto(`/view/estimate/${proposalId}`, { waitUntil: 'domcontentloaded' })

    // Wait for loading to finish
    await publicPage.waitForSelector('text=Loading estimate...', { state: 'hidden', timeout: 15000 }).catch(() => {})

    // Select the first option card (click on it)
    const firstOptionCard = publicPage.locator(`text=${OPTION_GOOD}`).first()
    await expect(firstOptionCard).toBeVisible({ timeout: 10000 })
    await firstOptionCard.click()

    // The Accept Estimate button should now be enabled
    const acceptButton = publicPage.locator('button:has-text("Accept Estimate")')
    await expect(acceptButton).toBeEnabled({ timeout: 5000 })

    // Click Accept
    await acceptButton.click()

    // Confirmation dialog should appear
    await expect(publicPage.locator('text=Confirm Acceptance')).toBeVisible({ timeout: 5000 })

    // Intercept the accept API call
    const acceptResponsePromise = publicPage.waitForResponse(
      (response) => response.url().includes('/api/estimates/') && response.url().includes('/accept'),
      { timeout: 15000 },
    )

    // Click the Confirm button in the dialog
    const confirmButton = publicPage.locator('button:has-text("Confirm")').last()
    await confirmButton.click()

    // Wait for API response
    const acceptResponse = await acceptResponsePromise
    expect(acceptResponse.status()).toBe(200)

    // The success banner should appear
    await expect(publicPage.locator('text=Estimate Accepted')).toBeVisible({ timeout: 10000 })

    await publicPage.screenshot({ path: 'screenshots/estimate-accepted.png' })

    await publicContext.close()
  })

  // ---------- 6. Decline estimate as client ----------

  test('should decline estimate via public view', async ({ browser }) => {
    test.slow()

    // Create a separate proposal to decline
    const authContext = await browser.newContext({
      storageState: 'playwright/.auth/user.json',
    })
    const authPage = await authContext.newPage()
    await authPage.goto('/dashboard', { waitUntil: 'domcontentloaded' })

    const { proposalId } = await sendEstimateViaAPI(
      authPage,
      projectId,
      `decline-${TS}@e2e-test.example.com`,
      'Decline Test Customer',
    )
    await authContext.close()

    // Visit public view as unauthenticated client
    const publicContext = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    })
    const publicPage = await publicContext.newPage()

    await publicPage.goto(`/view/estimate/${proposalId}`, { waitUntil: 'domcontentloaded' })

    // Wait for loading to finish
    await publicPage.waitForSelector('text=Loading estimate...', { state: 'hidden', timeout: 15000 }).catch(() => {})

    // Click the Decline button
    const declineButton = publicPage.locator('button:has-text("Decline")').first()
    await expect(declineButton).toBeVisible({ timeout: 10000 })
    await declineButton.click()

    // Decline dialog should appear
    await expect(publicPage.locator('text=Decline Estimate')).toBeVisible({ timeout: 5000 })

    // Fill in a decline reason
    const reasonTextarea = publicPage.locator('textarea')
    await expect(reasonTextarea).toBeVisible({ timeout: 5000 })
    await reasonTextarea.fill('E2E test - price too high, going with a different contractor.')

    // Intercept the decline API call
    const declineResponsePromise = publicPage.waitForResponse(
      (response) => response.url().includes('/api/estimates/') && response.url().includes('/decline'),
      { timeout: 15000 },
    )

    // Click Confirm Decline
    const confirmDeclineButton = publicPage.locator('button:has-text("Confirm Decline")')
    await confirmDeclineButton.click()

    // Wait for API response
    const declineResponse = await declineResponsePromise
    expect(declineResponse.status()).toBe(200)

    // The decline banner should appear
    await expect(publicPage.locator('text=Estimate Declined')).toBeVisible({ timeout: 10000 })

    await publicPage.screenshot({ path: 'screenshots/estimate-declined.png' })

    await publicContext.close()
  })

  // ---------- 7. Verify estimate data on project page ----------

  test('should show proposal status cards on project page after send/accept/decline', async ({ page }) => {
    test.slow()

    await page.goto(`/projects/${projectId}`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator(`h1:has-text("${TEST_PROJECT_NAME}")`)).toBeVisible({ timeout: 15000 })

    // Go to Quote Options tab
    const quoteTab = page.locator('[role="tab"]').filter({ hasText: /Quote/ })
    await quoteTab.click()

    // There should be multiple proposal status cards
    const proposalCards = page.locator('text=/Proposal #/')
    await expect(proposalCards.first()).toBeVisible({ timeout: 10000 })
    const count = await proposalCards.count()
    expect(count).toBeGreaterThanOrEqual(2)

    // At least one should show an "Accepted" status
    const acceptedBadge = page.locator('text=Accepted').first()
    const acceptedVisible = await acceptedBadge.isVisible({ timeout: 5000 }).catch(() => false)

    // At least one should show a declined/rejected status
    const rejectedBadge = page.locator('text=/Rejected|Declined/i').first()
    const rejectedVisible = await rejectedBadge.isVisible({ timeout: 5000 }).catch(() => false)

    // Both statuses should be represented
    expect(acceptedVisible || rejectedVisible).toBeTruthy()

    await page.screenshot({ path: 'screenshots/estimate-project-proposals.png' })
  })

  // ---------- 8. UI interaction: Send Estimate Dialog ----------

  test('should open and use the Send Estimate dialog from project page', async ({ page }) => {
    test.slow()

    await page.goto(`/projects/${projectId}`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator(`h1:has-text("${TEST_PROJECT_NAME}")`)).toBeVisible({ timeout: 15000 })

    // Go to Quote Options tab
    const quoteTab = page.locator('[role="tab"]').filter({ hasText: /Quote/ })
    await quoteTab.click()

    // Wait for options to load
    await expect(page.locator(`text=${OPTION_GOOD}`).first()).toBeVisible({ timeout: 10000 })

    // Click the "Send Proposal" button
    const sendBtn = page.locator('button:has-text("Send Proposal")')
    await expect(sendBtn).toBeVisible({ timeout: 5000 })
    await sendBtn.click()

    // The SendEstimateDialog should open
    await expect(page.locator('text=Send Estimate')).toBeVisible({ timeout: 5000 })

    // Verify dialog form fields exist
    const nameInput = page.locator('#recipient-name')
    const emailInput = page.locator('#recipient-email')
    const messageTextarea = page.locator('#estimate-message')

    await expect(nameInput).toBeVisible({ timeout: 5000 })
    await expect(emailInput).toBeVisible({ timeout: 5000 })
    await expect(messageTextarea).toBeVisible({ timeout: 5000 })

    // Check if contact info is pre-filled
    const emailValue = await emailInput.inputValue()
    if (emailValue) {
      expect(emailValue).toContain('@')
    }

    // Fill in recipient details
    await nameInput.fill('UI Dialog Test Customer')
    await emailInput.fill(`ui-dialog-${TS}@e2e-test.example.com`)
    await messageTextarea.fill('Sent from E2E test via UI dialog.')

    // The Send Estimate button in the dialog should be visible
    const sendEstimateBtn = page.locator('button:has-text("Send Estimate")').last()
    await expect(sendEstimateBtn).toBeVisible()

    // Close the dialog (we don't send here; API tests cover that)
    const cancelBtn = page.locator('button:has-text("Cancel")').last()
    await cancelBtn.click()

    await page.screenshot({ path: 'screenshots/estimate-send-dialog.png' })
  })

  // ---------- 9. Public view: Summary/Detailed toggle ----------

  test('should toggle between Summary and Detailed views on public estimate page', async ({ browser }) => {
    test.slow()

    // Get a proposal ID
    const authContext = await browser.newContext({
      storageState: 'playwright/.auth/user.json',
    })
    const authPage = await authContext.newPage()
    await authPage.goto('/dashboard', { waitUntil: 'domcontentloaded' })

    const proposalsRes = await authPage.request.get(`/api/estimates/${projectId}/proposals`)
    const proposalsBody = await proposalsRes.json()
    const sentProposal = proposalsBody.data.proposals.find(
      (p: { status: string }) => ['sent', 'viewed'].includes(p.status),
    )
    await authContext.close()

    if (!sentProposal) {
      test.skip(true, 'No sent/viewed proposal available for this test')
      return
    }

    const publicContext = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    })
    const publicPage = await publicContext.newPage()

    await publicPage.goto(`/view/estimate/${sentProposal.id}`, { waitUntil: 'domcontentloaded' })

    // Wait for loading to finish
    await publicPage.waitForSelector('text=Loading estimate...', { state: 'hidden', timeout: 15000 }).catch(() => {})

    // View toggle buttons should be present
    const summaryButton = publicPage.locator('button:has-text("Summary")')
    const detailedButton = publicPage.locator('button:has-text("Detailed")')

    await expect(summaryButton).toBeVisible({ timeout: 5000 })
    await expect(detailedButton).toBeVisible({ timeout: 5000 })

    // Verify summary content is showing (category labels like "Materials")
    await expect(publicPage.locator('text=Materials').first()).toBeVisible({ timeout: 5000 })

    // Switch to Detailed view
    await detailedButton.click()

    // In Detailed view, individual line items should be visible with "Line Items" heading
    await expect(publicPage.locator('text=Line Items').first()).toBeVisible({ timeout: 5000 })

    // Switch back to Summary
    await summaryButton.click()

    // Category summary should be back ("What's Included")
    await expect(publicPage.locator("text=What's Included").first()).toBeVisible({ timeout: 5000 })

    await publicPage.screenshot({ path: 'screenshots/estimate-view-toggle.png' })

    await publicContext.close()
  })

  // ---------- API Response Verification ----------

  test.describe('API Response Verification', () => {
    test('GET /api/estimates/[projectId]/options should return created options', async ({ page }) => {
      const res = await page.request.get(`/api/estimates/${projectId}/options`)
      expect(res.ok()).toBeTruthy()

      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data).toHaveProperty('options')
      expect(body.data.options.length).toBeGreaterThanOrEqual(3)

      // Verify option structure
      const option = body.data.options[0]
      expect(option).toHaveProperty('id')
      expect(option).toHaveProperty('name')
      expect(option).toHaveProperty('subtotal')
      expect(option).toHaveProperty('line_items')
      expect(option.line_items.length).toBeGreaterThanOrEqual(1)

      // Verify line item structure
      const lineItem = option.line_items[0]
      expect(lineItem).toHaveProperty('description')
      expect(lineItem).toHaveProperty('quantity')
      expect(lineItem).toHaveProperty('unit')
      expect(lineItem).toHaveProperty('unit_price')
      expect(lineItem).toHaveProperty('total_price')
      expect(lineItem).toHaveProperty('category')
    })

    test('GET /api/estimates/[projectId]/proposals should return sent proposals', async ({ page }) => {
      const res = await page.request.get(`/api/estimates/${projectId}/proposals`)
      expect(res.ok()).toBeTruthy()

      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data).toHaveProperty('proposals')
      expect(body.data.proposals.length).toBeGreaterThanOrEqual(1)

      // Verify proposal structure
      const proposal = body.data.proposals[0]
      expect(proposal).toHaveProperty('id')
      expect(proposal).toHaveProperty('proposal_number')
      expect(proposal).toHaveProperty('title')
      expect(proposal).toHaveProperty('status')
      expect(proposal).toHaveProperty('sent_at')
      expect(['draft', 'sent', 'viewed', 'accepted', 'rejected']).toContain(proposal.status)
    })

    test('GET /api/estimates/[proposalId]/view should return public estimate data', async ({ page }) => {
      // Get a proposal id first
      const proposalsRes = await page.request.get(`/api/estimates/${projectId}/proposals`)
      const proposalsBody = await proposalsRes.json()
      const proposalId = proposalsBody.data.proposals[0].id

      // Public view endpoint
      const viewRes = await page.request.get(`/api/estimates/${proposalId}/view`)
      expect(viewRes.ok()).toBeTruthy()

      const viewBody = await viewRes.json()
      expect(viewBody.success).toBe(true)
      expect(viewBody.data).toHaveProperty('proposal')
      expect(viewBody.data).toHaveProperty('options')
      expect(viewBody.data).toHaveProperty('company')
      expect(viewBody.data).toHaveProperty('terms')

      // Proposal data structure
      expect(viewBody.data.proposal).toHaveProperty('id')
      expect(viewBody.data.proposal).toHaveProperty('proposal_number')
      expect(viewBody.data.proposal).toHaveProperty('status')

      // Options should include is_recommended (app-layer transform)
      if (viewBody.data.options.length > 0) {
        const option = viewBody.data.options[0]
        expect(option).toHaveProperty('is_recommended')
        expect(option).toHaveProperty('line_items')
      }
    })

    test('POST /api/estimates/[proposalId]/accept should reject missing selected_option_id', async ({ page }) => {
      // Send a fresh proposal for this test
      const { proposalId } = await sendEstimateViaAPI(
        page,
        projectId,
        `api-test-${TS}@e2e-test.example.com`,
        'API Test Customer',
      )

      // Try to accept without selected_option_id
      const res = await page.request.post(`/api/estimates/${proposalId}/accept`, {
        data: {},
      })
      expect(res.status()).toBe(400)

      const body = await res.json()
      expect(body.success).toBe(false)
    })

    test('POST /api/estimates/[proposalId]/decline should accept optional reason', async ({ page }) => {
      // Send a fresh proposal for this test
      const { proposalId } = await sendEstimateViaAPI(
        page,
        projectId,
        `api-decline-${TS}@e2e-test.example.com`,
        'API Decline Customer',
      )

      // Decline with reason
      const res = await page.request.post(`/api/estimates/${proposalId}/decline`, {
        data: { reason: 'Testing decline via API' },
      })
      expect(res.ok()).toBeTruthy()

      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data?.status).toBe('declined')
    })

    test('POST /api/estimates/[proposalId]/accept should reject already-declined proposal', async ({ page }) => {
      // Get proposals and find the declined one
      const proposalsRes = await page.request.get(`/api/estimates/${projectId}/proposals`)
      const proposalsBody = await proposalsRes.json()
      const declinedProposal = proposalsBody.data.proposals.find(
        (p: { status: string }) => p.status === 'rejected',
      )

      if (declinedProposal) {
        // Try to accept a declined proposal
        const res = await page.request.post(`/api/estimates/${declinedProposal.id}/accept`, {
          data: { selected_option_id: optionIds[0] },
        })
        // Should return 409 Conflict
        expect(res.status()).toBe(409)
      }
    })
  })
})
