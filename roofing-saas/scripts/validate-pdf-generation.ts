/**
 * Minimal validation script for PDF generation
 * Uses Playwright to create a document from a template and verify PDF is generated
 */
import { chromium } from 'playwright'

const BASE_URL = 'https://roofing-saas.vercel.app'
const TEST_EMAIL = 'claude-test@roofingsaas.com'
const TEST_PASSWORD = 'ClaudeTest2025!Secure'
// Template with HTML content in Clarity AI Development tenant
const TEMPLATE_ID = '2b249c64-8c24-4b7f-a52b-adcacbfd8855'

async function validatePDFGeneration() {
  console.log('🚀 Starting PDF generation validation...\n')
  console.log('Template ID:', TEMPLATE_ID, '\n')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Enable console logging from the browser
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('[Signatures]')) {
      console.log('   Browser:', msg.text())
    }
  })

  try {
    // Step 1: Login
    console.log('1️⃣ Logging in...')
    await page.goto(`${BASE_URL}/en/login`)
    await page.fill('input[name="email"]', TEST_EMAIL)
    await page.fill('input[name="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard|\/en\/dashboard/, { timeout: 15000 })
    console.log('   ✅ Logged in successfully\n')

    // Step 2: Navigate directly to new document with template pre-selected
    console.log('2️⃣ Navigating to new document with template...')
    await page.goto(`${BASE_URL}/en/signatures/new?templateId=${TEMPLATE_ID}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(5000) // Wait for templates to load and pre-select
    await page.screenshot({ path: 'validation-01-new-doc.png' })

    // Check what step we're on
    const stepIndicator = page.locator('[class*="step"]').first()
    const pageContent = await page.content()

    if (pageContent.includes('No templates available')) {
      console.log('   ❌ Templates failed to load')
      console.log('   This is a bug - the /api/signature-templates endpoint may be failing')
      await browser.close()
      return
    }

    if (pageContent.includes('Step 1')) {
      console.log('   ⚠️ Still on Step 1 - template may not have auto-selected')
      console.log('   Checking if templates loaded...')

      // Click on a template card if visible
      const templateCard = page.locator('[class*="template"]').first()
      if (await templateCard.isVisible({ timeout: 2000 })) {
        await templateCard.click()
        await page.waitForTimeout(1000)
      }

      // Click Next to proceed
      const nextBtn = page.getByRole('button', { name: /next/i })
      if (await nextBtn.isVisible({ timeout: 2000 })) {
        await nextBtn.click()
        await page.waitForTimeout(1000)
      }
    }

    console.log('   ✅ On document creation page\n')

    // Step 3: Fill required fields and navigate through wizard
    console.log('3️⃣ Filling document details...')

    // Fill title if visible
    const titleInput = page.locator('input[name="title"]')
    if (await titleInput.isVisible({ timeout: 3000 })) {
      await titleInput.fill('PDF Generation Test ' + Date.now())
      console.log('   Filled title')
    }

    await page.screenshot({ path: 'validation-02-form.png' })

    // Navigate through wizard steps
    // Step 1 -> Step 2: Click Next
    let nextButton = page.getByRole('button', { name: /^next$/i })
    if (await nextButton.isVisible({ timeout: 2000 }) && await nextButton.isEnabled()) {
      await nextButton.click()
      await page.waitForTimeout(1000)
      console.log('   Clicked Next to Document Info')
    }

    await page.screenshot({ path: 'validation-03-docinfo.png' })

    // Step 2 -> Step 3: Click Next
    nextButton = page.getByRole('button', { name: /^next$/i })
    if (await nextButton.isVisible({ timeout: 2000 }) && await nextButton.isEnabled()) {
      await nextButton.click()
      await page.waitForTimeout(1000)
      console.log('   Clicked Next to Place Fields')
    }

    await page.screenshot({ path: 'validation-04-placefields.png' })

    // Template already has signature field defined, so we can proceed directly
    console.log('   Template has pre-defined signature field')
    await page.screenshot({ path: 'validation-05-fieldadded.png' })

    // Step 3 -> Step 4: Click Review button
    const reviewButton = page.getByRole('button', { name: /review/i })
    if (await reviewButton.isVisible({ timeout: 3000 }) && await reviewButton.isEnabled()) {
      await reviewButton.click()
      await page.waitForTimeout(1000)
      console.log('   Clicked Review')
    } else {
      console.log('   ⚠️ Review button not available - signature field may not have been added')
      // Take diagnostic screenshot
      await page.screenshot({ path: 'validation-05-stuck.png' })
    }

    await page.screenshot({ path: 'validation-06-review.png' })

    // Step 4: Submit the document
    console.log('\n4️⃣ Creating document...')

    // Set up response listener BEFORE clicking
    const responsePromise = page.waitForResponse(
      resp => resp.url().includes('/api/signature-documents') && resp.request().method() === 'POST',
      { timeout: 120000 } // 2 minute timeout for PDF generation
    )

    // Find and click Create/Submit button
    const createButton = page.getByRole('button', { name: /create|submit|save|finish/i })
    if (await createButton.isVisible({ timeout: 5000 })) {
      console.log('   Clicking Create button...')
      await createButton.click()
    } else {
      console.log('   ❌ Could not find Create button')
      await page.screenshot({ path: 'validation-error-no-button.png' })
      await browser.close()
      return
    }

    // Wait for API response
    console.log('   Waiting for API response (PDF generation can take 30-60 seconds)...')
    const response = await responsePromise
    const data = await response.json()

    await page.screenshot({ path: 'validation-04-result.png' })

    // Step 5: Analyze results
    console.log('\n📊 RESULTS:')
    console.log('   HTTP Status:', response.status())

    if (data.document) {
      console.log('   Document ID:', data.document.id)
      console.log('   Template ID:', data.document.template_id || 'NULL')
      console.log('   File URL:', data.document.file_url || 'NULL')

      if (data.document.file_url) {
        console.log('\n✅ SUCCESS! PDF was generated!')
        console.log('   PDF URL:', data.document.file_url)
      } else if (data.document.template_id) {
        console.log('\n⚠️ PARTIAL: Document created with template but no PDF')
        console.log('   template_id fix is working')
        console.log('   But PDF generation failed - check Vercel logs')
      } else {
        console.log('\n❌ FAILED: No template_id in response')
        console.log('   The template_id fix may not be working')
      }
    } else {
      console.log('   ❌ No document in response')
      console.log('   Full response:', JSON.stringify(data, null, 2))
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error)
    await page.screenshot({ path: 'validation-error.png' })
  } finally {
    await browser.close()
  }
}

validatePDFGeneration().catch(console.error)
