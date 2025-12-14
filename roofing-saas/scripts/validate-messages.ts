/**
 * Messages Page Validation Script
 * Phase 2: Validate Communications (SMS/Messages)
 */
import { chromium } from 'playwright'
import path from 'path'

const BASE_URL = 'http://localhost:3000'
const AUTH_FILE = path.join(__dirname, '../playwright/.auth/user.json')
const SCREENSHOTS_DIR = path.join(__dirname, '../validation-screenshots')

async function validateMessages() {
  console.log('🔍 Phase 2: Validating Messages Page\n')

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

    // 1. Navigate to Messages page
    console.log('📍 Step 1: Navigate to /messages')
    await page.goto(`${BASE_URL}/messages`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const pageTitle = await page.locator('h1').first().textContent().catch(() => '')
    console.log(`   Page title: "${pageTitle}"`)

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/messages-01-list.png`,
      fullPage: false
    })

    validations.push({
      test: 'Messages page loads',
      passed: pageTitle?.toLowerCase().includes('message') || page.url().includes('/messages'),
      details: `Page title: "${pageTitle}"`
    })

    // 2. Check for conversation list or empty state
    console.log('💬 Step 2: Check for conversation list...')

    const conversations = await page.locator('.conversation, [data-testid="conversation"], .message-thread').count()
    const messageItems = await page.locator('table tbody tr, .message-item').count()
    const emptyState = await page.locator('text=/No messages|No conversations|Get started/i').count()

    validations.push({
      test: 'Conversation list or empty state shown',
      passed: conversations > 0 || messageItems > 0 || emptyState > 0,
      details: `Conversations: ${conversations}, Items: ${messageItems}, Empty state: ${emptyState > 0}`
    })

    // 3. Check for "New Message" button
    console.log('➕ Step 3: Check for compose button...')

    const composeBtn = page.locator('button:has-text("New Message"), button:has-text("Compose"), button:has-text("Send SMS"), a:has-text("New")').first()
    const composeBtnVisible = await composeBtn.isVisible().catch(() => false)

    validations.push({
      test: 'Compose message button visible',
      passed: composeBtnVisible,
      details: composeBtnVisible ? 'Button found' : 'Button not found'
    })

    // 4. Check for message composer/input
    console.log('📝 Step 4: Check for message composer...')

    const messageInput = await page.locator('textarea, input[type="text"][placeholder*="message" i], [contenteditable="true"]').count()
    const sendButton = await page.locator('button:has-text("Send"), button[type="submit"]').count()

    validations.push({
      test: 'Message input present',
      passed: messageInput > 0,
      details: `Input fields: ${messageInput}, Send buttons: ${sendButton}`
    })

    // 5. Check for contact selection (if composing)
    console.log('👤 Step 5: Check for contact selection...')

    const contactSelector = await page.locator('select, [role="combobox"], input[placeholder*="contact" i], input[placeholder*="phone" i]').count()

    validations.push({
      test: 'Contact selection available',
      passed: contactSelector > 0,
      details: `Found ${contactSelector} contact selection elements`
    })

    // 6. Check for templates
    console.log('📑 Step 6: Check for message templates...')

    const templates = await page.locator('button:has-text("Template"), [data-testid="template"], text=/template/i').count()

    validations.push({
      test: 'Templates accessible',
      passed: templates > 0,
      details: `Found ${templates} template references`
    })

    // 7. Check for filters/tabs
    console.log('🔍 Step 7: Check for filters...')

    const filters = await page.locator('button, [role="tab"]').filter({
      hasText: /All|Inbox|Sent|Unread|SMS|Email/i
    }).count()

    validations.push({
      test: 'Message filters present',
      passed: filters > 0,
      details: `Found ${filters} filter options`
    })

    // Final screenshot
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/messages-02-final.png`,
      fullPage: true
    })

  } catch (error) {
    console.error('❌ Validation error:', error)
    issues.push(`Script error: ${error}`)

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/messages-error.png`,
      fullPage: true
    }).catch(() => {})
  } finally {
    await browser.close()
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📋 MESSAGES PAGE VALIDATION SUMMARY')
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
validateMessages()
  .then(result => {
    process.exit(result.passed ? 0 : 1)
  })
  .catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
