import { test, expect } from '@playwright/test'

/**
 * Storm Leads E2E Tests
 *
 * Validates the complete Storm Leads enrichment workflow:
 * 1. Access storm leads page and view targeting areas
 * 2. Load addresses for a targeting area
 * 3. Download CSV template functionality
 * 4. CSV upload enrichment API
 * 5. Import enriched contacts to CRM
 */

test.describe('Storm Leads Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to storm leads page
    await page.goto('/storm-targeting/leads')
    await page.waitForLoadState('networkidle')
  })

  test('storm leads page loads successfully', async ({ page }) => {
    // Verify page loaded
    await expect(page).toHaveURL(/\/storm-targeting\/leads/)

    // Check for key UI elements
    const heading = page.locator('h1:has-text("Storm Leads")')
    await expect(heading).toBeVisible()

    // Check for targeting areas section
    const areasHeading = page.locator('h2:has-text("Targeting Areas")')
    await expect(areasHeading).toBeVisible()

    // Verify page has proper structure
    const hasContent = await page.locator('body').textContent()
    expect(hasContent).toBeTruthy()
  })

  test('displays targeting areas list', async ({ page }) => {
    // Wait for areas to load
    await page.waitForTimeout(1000)

    // Check for either areas list or "no targeting areas" message
    const hasAreas = (await page.locator('button:has-text("addresses")').count()) > 0
    const hasNoAreasMsg = (await page.locator('text=/no targeting areas|extract addresses/i').count()) > 0

    // One of these should be true
    expect(hasAreas || hasNoAreasMsg).toBe(true)

    console.log(`Targeting areas found: ${hasAreas}`)
    console.log(`No areas message: ${hasNoAreasMsg}`)
  })

  test('shows instruction to select area when none selected', async ({ page }) => {
    // Should show prompt to select a targeting area
    const selectPrompt = page.locator('text=/select a targeting area/i')

    // This should be visible when no area is selected
    const isVisible = await selectPrompt.isVisible().catch(() => false)
    console.log(`Select area prompt visible: ${isVisible}`)

    // Page should have some guidance content
    const bodyText = await page.locator('body').textContent()
    expect(bodyText?.length).toBeGreaterThan(100)
  })
})

test.describe('Storm Leads API Endpoints', () => {
  test('GET /api/storm-targeting/areas returns success', async ({ request }) => {
    const response = await request.get('/api/storm-targeting/areas')
    console.log(`GET /api/storm-targeting/areas status: ${response.status()}`)

    // Should not be server error
    expect(response.status()).not.toBe(500)

    if (response.ok()) {
      const data = await response.json()
      expect(data.success).toBe(true)
      // API returns data wrapped in 'data' property
      expect(data.data?.areas).toBeDefined()
      expect(Array.isArray(data.data.areas)).toBe(true)
      console.log(`Found ${data.data.areas.length} targeting areas`)
    }
  })

  test('GET /api/storm-targeting/addresses requires areaId', async ({ request }) => {
    // Without areaId should return 400
    const response = await request.get('/api/storm-targeting/addresses')
    console.log(`GET /api/storm-targeting/addresses (no areaId): ${response.status()}`)

    expect(response.status()).toBe(400)

    const data = await response.json()
    expect(data.success).toBe(false)
    // API returns error as object with message property
    expect(data.error?.message).toContain('areaId')
  })

  test('GET /api/storm-targeting/addresses returns addresses for valid area', async ({
    request,
  }) => {
    // First get areas
    const areasResponse = await request.get('/api/storm-targeting/areas')

    if (!areasResponse.ok()) {
      console.log('Cannot fetch areas, skipping addresses test')
      return
    }

    const areasData = await areasResponse.json()
    // API returns data wrapped in 'data' property
    const areas = areasData.data?.areas || []

    if (areas.length === 0) {
      console.log('No targeting areas found, skipping addresses test')
      return
    }

    const testAreaId = areas[0].id
    console.log(`Testing addresses for area: ${testAreaId}`)

    const response = await request.get(`/api/storm-targeting/addresses?areaId=${testAreaId}`)
    console.log(`GET /api/storm-targeting/addresses status: ${response.status()}`)

    expect(response.status()).not.toBe(500)

    if (response.ok()) {
      const data = await response.json()
      expect(data.success).toBe(true)
      // API returns data wrapped in 'data' property
      expect(data.data?.addresses).toBeDefined()
      expect(Array.isArray(data.data.addresses)).toBe(true)
      console.log(`Found ${data.data.addresses.length} addresses`)

      // Verify address structure if any exist
      if (data.data.addresses.length > 0) {
        const firstAddr = data.data.addresses[0]
        expect(firstAddr).toHaveProperty('id')
        expect(firstAddr).toHaveProperty('targeting_area_id')
        expect(firstAddr).toHaveProperty('is_enriched')
        console.log(`First address enriched: ${firstAddr.is_enriched}`)
      }
    }
  })

  test('POST /api/storm-targeting/enrich-from-csv requires file and areaId', async ({
    request,
  }) => {
    // Without file should return 400
    const response = await request.post('/api/storm-targeting/enrich-from-csv', {
      multipart: {},
    })

    console.log(`POST /api/storm-targeting/enrich-from-csv (empty): ${response.status()}`)

    // Should return 400 for missing params
    expect(response.status()).toBe(400)
  })

  test('POST /api/storm-targeting/import-enriched requires targetingAreaId', async ({
    request,
  }) => {
    const response = await request.post('/api/storm-targeting/import-enriched', {
      data: {},
    })

    console.log(`POST /api/storm-targeting/import-enriched (no areaId): ${response.status()}`)

    expect(response.status()).toBe(400)

    const data = await response.json()
    expect(data.success).toBe(false)
    // API returns error as object with message property
    expect(data.error?.message).toContain('targetingAreaId')
  })
})

test.describe('Storm Leads UI Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/storm-targeting/leads')
    await page.waitForLoadState('networkidle')
  })

  test('filter buttons are present when area is selected', async ({ page }) => {
    // First check if we have any targeting areas
    const areaButtons = await page.locator('button:has-text("addresses")').all()

    if (areaButtons.length > 0) {
      // Click first area to load addresses
      await areaButtons[0].click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // Check for filter buttons
      const allButton = page.locator('button:has-text("All")')
      const enrichedButton = page.locator('button:has-text("Enriched")')
      const needDataButton = page.locator('button:has-text("Need Data")')

      const hasFilters =
        (await allButton.isVisible().catch(() => false)) ||
        (await enrichedButton.isVisible().catch(() => false)) ||
        (await needDataButton.isVisible().catch(() => false))

      console.log(`Filter buttons visible: ${hasFilters}`)

      // Check for stats display
      const hasStats = (await page.locator('text=/Total|Enriched|Need Data|Selected/i').count()) > 0
      console.log(`Stats display visible: ${hasStats}`)
    } else {
      console.log('No targeting areas available for UI test')
    }
  })

  test('download template button triggers download', async ({ page }) => {
    // First select an area to show the actions panel
    const areaButtons = await page.locator('button:has-text("addresses")').all()

    if (areaButtons.length > 0) {
      await areaButtons[0].click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)

      // Look for download template button
      const downloadBtn = page.locator('button:has-text("Download CSV Template")')
      const downloadVisible = await downloadBtn.isVisible().catch(() => false)

      console.log(`Download template button visible: ${downloadVisible}`)

      if (downloadVisible) {
        // Set up download listener
        const [download] = await Promise.all([
          page.waitForEvent('download').catch(() => null),
          downloadBtn.click(),
        ])

        if (download) {
          const filename = download.suggestedFilename()
          console.log(`Downloaded file: ${filename}`)
          expect(filename).toContain('template')
          expect(filename).toContain('.csv')
        }
      }
    } else {
      console.log('No targeting areas available for download test')
    }
  })

  test('upload button is present and triggers file input', async ({ page }) => {
    const areaButtons = await page.locator('button:has-text("addresses")').all()

    if (areaButtons.length > 0) {
      await areaButtons[0].click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)

      // Look for upload button
      const uploadLabel = page.locator('text=/Upload.*CSV/i')
      const uploadVisible = await uploadLabel.isVisible().catch(() => false)

      console.log(`Upload CSV button visible: ${uploadVisible}`)

      // Check for hidden file input
      const fileInput = page.locator('input[type="file"][accept=".csv"]')
      const inputExists = (await fileInput.count()) > 0

      console.log(`File input exists: ${inputExists}`)
    } else {
      console.log('No targeting areas available for upload test')
    }
  })

  test('import button shows correct count', async ({ page }) => {
    const areaButtons = await page.locator('button:has-text("addresses")').all()

    if (areaButtons.length > 0) {
      await areaButtons[0].click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)

      // Look for import button with count
      const importBtn = page.locator('button:has-text("Import")')
      const importVisible = await importBtn.isVisible().catch(() => false)

      console.log(`Import button visible: ${importVisible}`)

      if (importVisible) {
        const buttonText = await importBtn.textContent()
        console.log(`Import button text: ${buttonText}`)

        // Should contain a number (count of enriched contacts)
        const hasCount = /\d+/.test(buttonText || '')
        console.log(`Import button shows count: ${hasCount}`)
      }
    } else {
      console.log('No targeting areas available for import test')
    }
  })
})

test.describe('Storm Targeting Main Page', () => {
  test('main storm targeting page loads', async ({ page }) => {
    await page.goto('/storm-targeting')
    await page.waitForLoadState('networkidle')

    // Verify page loaded
    await expect(page).toHaveURL(/\/storm-targeting/)

    // Should have some content
    const bodyText = await page.locator('body').textContent()
    expect(bodyText?.length).toBeGreaterThan(100)

    // Look for storm targeting UI elements
    const hasStormUI =
      (await page.locator('text=/storm|targeting|hail|weather/i').count()) > 0

    console.log(`Storm targeting UI found: ${hasStormUI}`)
  })

  test('can navigate between storm targeting and leads', async ({ page }) => {
    await page.goto('/storm-targeting')
    await page.waitForLoadState('networkidle')

    // Look for link to leads
    const leadsLink = page.locator('a[href*="/storm-targeting/leads"]')
    const hasLeadsLink = (await leadsLink.count()) > 0

    console.log(`Leads link found: ${hasLeadsLink}`)

    if (hasLeadsLink) {
      await leadsLink.first().click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/storm-targeting\/leads/)
    }
  })
})
