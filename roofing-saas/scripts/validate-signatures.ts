/**
 * E-Signatures Page Validation Script
 * Phase 3: Validate E-Signatures functionality
 */
import { chromium } from 'playwright'
import path from 'path'

const BASE_URL = 'http://localhost:3000'
const AUTH_FILE = path.join(__dirname, '../playwright/.auth/user.json')
const SCREENSHOTS_DIR = path.join(__dirname, '../validation-screenshots')

async function validateSignatures() {
  console.log('🔍 Phase 3: Validating E-Signatures Page\n')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    storageState: AUTH_FILE,
    viewport: { width: 1440, height: 900 }
  })
  const page = await context.newPage()

  const issues: string[] = []
  const validations: { test: string; passed: boolean; details?: string }[] = []

  try {
    const fs = require('fs')
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
    }

    // 1. Navigate to Signatures page
    console.log('📍 Step 1: Navigate to /signatures')
    await page.goto(`${BASE_URL}/signatures`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const pageTitle = await page.locator('h1').first().textContent().catch(() => '')
    console.log(`   Page title: "${pageTitle}"`)

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/signatures-01-list.png`,
      fullPage: false
    })

    validations.push({
      test: 'Signatures page loads',
      passed: pageTitle?.toLowerCase().includes('signature') || pageTitle?.toLowerCase().includes('document'),
      details: `Page title: "${pageTitle}"`
    })

    // 2. Check for document list or empty state
    console.log('📄 Step 2: Check for document list...')

    const documentItems = await page.locator('table tbody tr, .document-item, [data-testid="document-row"]').count()
    const emptyState = await page.locator('text=/No documents|No signatures|Get started/i').count()

    validations.push({
      test: 'Document list or empty state shown',
      passed: documentItems > 0 || emptyState > 0,
      details: `Found ${documentItems} documents, empty state: ${emptyState > 0}`
    })

    // 3. Check for "New Document" or "Request Signature" button
    console.log('➕ Step 3: Check for create button...')

    const createBtn = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Request"), a:has-text("New Document")').first()
    const createBtnVisible = await createBtn.isVisible().catch(() => false)

    validations.push({
      test: 'Create document button visible',
      passed: createBtnVisible,
      details: createBtnVisible ? 'Button found' : 'Button not found'
    })

    if (createBtnVisible) {
      console.log('✅ Create button visible')
    } else {
      issues.push('Create document button not found')
      console.log('❌ Create button not visible')
    }

    // 4. Navigate to create new signature request
    console.log('📝 Step 4: Test create signature flow...')

    // Try clicking create button or navigating directly
    if (createBtnVisible) {
      await createBtn.click()
      await page.waitForTimeout(1500)
    } else {
      await page.goto(`${BASE_URL}/signatures/new`)
      await page.waitForTimeout(1500)
    }

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/signatures-02-new.png`,
      fullPage: false
    })

    // Check if we're on the new signature page
    const onNewPage = page.url().includes('/signatures/new') || page.url().includes('/new')
    const hasForm = await page.locator('form, [data-testid="signature-form"]').count() > 0
    const hasUpload = await page.locator('input[type="file"], [data-testid="upload"], text=/upload|drag|drop/i').count() > 0

    validations.push({
      test: 'New signature page accessible',
      passed: onNewPage || hasForm || hasUpload,
      details: `URL includes /new: ${onNewPage}, has form: ${hasForm}, has upload: ${hasUpload}`
    })

    // 5. Check for signature creation form elements
    console.log('📋 Step 5: Check form elements...')

    const titleField = await page.locator('input[name="title"], input[placeholder*="title" i], input[name="name"]').count()
    const recipientField = await page.locator('input[name="email"], input[type="email"], input[placeholder*="email" i]').count()
    const fileUpload = await page.locator('input[type="file"]').count()
    const submitBtn = await page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Create")').count()

    validations.push({
      test: 'Signature form has required fields',
      passed: titleField > 0 || recipientField > 0 || fileUpload > 0,
      details: `title: ${titleField}, email: ${recipientField}, file: ${fileUpload}, submit: ${submitBtn}`
    })

    // 6. Check for document templates (if any)
    console.log('📑 Step 6: Check for templates...')

    const templates = await page.locator('text=/template/i, [data-testid="template"]').count()

    validations.push({
      test: 'Templates section present',
      passed: templates > 0,
      details: `Found ${templates} template references`
    })

    // Go back to signatures list
    await page.goto(`${BASE_URL}/signatures`)
    await page.waitForTimeout(1500)

    // 7. Check for status filters
    console.log('🔍 Step 7: Check for status filters...')

    const statusFilters = await page.locator('button, [role="tab"]').filter({
      hasText: /All|Pending|Completed|Signed|Draft|Expired/i
    }).count()

    validations.push({
      test: 'Status filters present',
      passed: statusFilters > 0,
      details: `Found ${statusFilters} status filter options`
    })

    // Final screenshot
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/signatures-03-final.png`,
      fullPage: true
    })

  } catch (error) {
    console.error('❌ Validation error:', error)
    issues.push(`Script error: ${error}`)

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/signatures-error.png`,
      fullPage: true
    }).catch(() => {})
  } finally {
    await browser.close()
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📋 E-SIGNATURES PAGE VALIDATION SUMMARY')
  console.log('='.repeat(60))

  const passed = validations.filter(v => v.passed).length
  const failed = validations.filter(v => !v.passed).length

  console.log(`\n✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)

  console.log('\n📝 Test Results:')
  validations.forEach(v => {
    const icon = v.passed ? '✅' : '❌'
    console.log(`  ${icon} ${v.test}`)
    if (v.details) {
      console.log(`     └─ ${v.details}`)
    }
  })

  if (issues.length > 0) {
    console.log('\n⚠️  Issues Found:')
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`)
    })
  }

  console.log('\n📸 Screenshots saved to:', SCREENSHOTS_DIR)
  console.log('='.repeat(60))

  return {
    passed: failed === 0,
    validations,
    issues
  }
}

// Run
validateSignatures()
  .then(result => {
    process.exit(result.passed ? 0 : 1)
  })
  .catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
