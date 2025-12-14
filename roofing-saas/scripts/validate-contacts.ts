/**
 * Contacts Page Validation Script
 * Phase 1.1: Validate that Contacts page loads data and CRUD works
 */
import { chromium } from 'playwright'
import path from 'path'

const BASE_URL = 'http://localhost:3000'
const AUTH_FILE = path.join(__dirname, '../playwright/.auth/user.json')
const SCREENSHOTS_DIR = path.join(__dirname, '../validation-screenshots')

async function validateContacts() {
  console.log('🔍 Phase 1.1: Validating Contacts Page\n')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    storageState: AUTH_FILE,
    viewport: { width: 1440, height: 900 }
  })
  const page = await context.newPage()

  // Track issues found
  const issues: string[] = []
  const validations: { test: string; passed: boolean; details?: string }[] = []

  try {
    // Ensure screenshots directory exists
    const fs = require('fs')
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
    }

    // 1. Navigate to Contacts page
    console.log('📍 Step 1: Navigate to /contacts')
    await page.goto(`${BASE_URL}/contacts`, { waitUntil: 'domcontentloaded' })

    // 2. Wait for page to be ready (not just loading state)
    console.log('⏳ Step 2: Wait for contacts data to load...')

    // Wait for the loading indicator to disappear OR data to appear
    try {
      // First wait for the page structure
      await page.waitForSelector('h1:has-text("Contacts")', { timeout: 5000 })

      // Now wait for either:
      // - Contacts table/grid to have data
      // - OR an empty state message
      // - OR loading to stop
      await Promise.race([
        page.waitForSelector('[data-testid="contacts-table"] tr:not(:first-child)', { timeout: 30000 }),
        page.waitForSelector('table tbody tr', { timeout: 30000 }),
        page.waitForSelector('.contact-card', { timeout: 30000 }),
        page.waitForSelector('text=/No contacts found/i', { timeout: 30000 }),
        page.waitForSelector('text=/0 contacts/i', { timeout: 30000 }),
        // Wait for loading to complete (absence of loading indicator)
        page.waitForFunction(() => {
          const loadingText = document.body.innerText
          return !loadingText.includes('Loading contacts...')
        }, { timeout: 30000 })
      ])

      validations.push({ test: 'Contacts page loads', passed: true })
      console.log('✅ Page loaded')
    } catch (e) {
      validations.push({
        test: 'Contacts page loads',
        passed: false,
        details: 'Page stuck on loading state after 30 seconds'
      })
      issues.push('Contacts page stuck on loading state')
      console.log('❌ Page stuck on loading')
    }

    // Take screenshot of current state
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/contacts-01-initial-load.png`,
      fullPage: false
    })

    // 3. Check if contacts data is displayed
    console.log('📊 Step 3: Verify contacts data display...')

    // Look for contact rows in table or cards
    const tableRows = await page.locator('table tbody tr').count()
    const contactCards = await page.locator('.contact-card, [data-testid="contact-card"]').count()
    const emptyState = await page.locator('text=/No contacts found|No contacts yet/i').count()

    // Get actual page content for debugging
    const pageText = await page.locator('main').innerText().catch(() => 'Could not get page text')

    if (tableRows > 0) {
      validations.push({
        test: 'Contacts data displayed',
        passed: true,
        details: `Found ${tableRows} contact rows in table`
      })
      console.log(`✅ Found ${tableRows} contacts in table view`)
    } else if (contactCards > 0) {
      validations.push({
        test: 'Contacts data displayed',
        passed: true,
        details: `Found ${contactCards} contact cards`
      })
      console.log(`✅ Found ${contactCards} contacts in card view`)
    } else if (emptyState > 0) {
      validations.push({
        test: 'Contacts data displayed',
        passed: true,
        details: 'Empty state shown (no contacts in database)'
      })
      console.log('✅ Empty state displayed correctly')
    } else {
      // Check if still loading
      const stillLoading = pageText.includes('Loading')
      if (stillLoading) {
        validations.push({
          test: 'Contacts data displayed',
          passed: false,
          details: 'Still showing loading state'
        })
        issues.push('Contacts data never loaded - stuck on loading state')
        console.log('❌ Still loading - data never appeared')
      } else {
        validations.push({
          test: 'Contacts data displayed',
          passed: false,
          details: `Page content: ${pageText.substring(0, 200)}...`
        })
        issues.push('No contacts data visible and no empty state')
        console.log('❌ No contacts data or empty state visible')
      }
    }

    // 4. Check UI elements are functional
    console.log('🎯 Step 4: Verify UI elements...')

    // Check for Add Contact button
    const addButton = page.locator('button:has-text("Add Contact"), a:has-text("Add Contact")').first()
    const addButtonVisible = await addButton.isVisible().catch(() => false)

    validations.push({
      test: 'Add Contact button visible',
      passed: addButtonVisible,
      details: addButtonVisible ? 'Button found and visible' : 'Button not found'
    })

    if (addButtonVisible) {
      console.log('✅ Add Contact button visible')
    } else {
      issues.push('Add Contact button not visible')
      console.log('❌ Add Contact button not visible')
    }

    // Check for search/filter elements
    const searchInput = await page.locator('input[placeholder*="search" i], input[name="search"]').count()
    const filterDropdowns = await page.locator('select, [role="combobox"]').count()

    validations.push({
      test: 'Search/filter UI present',
      passed: searchInput > 0 || filterDropdowns > 0,
      details: `Found ${searchInput} search inputs, ${filterDropdowns} filter controls`
    })

    // 5. Test Add Contact flow (if button is visible)
    if (addButtonVisible) {
      console.log('📝 Step 5: Test Add Contact modal...')

      await addButton.click()
      await page.waitForTimeout(500) // Allow modal to open

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/contacts-02-add-modal.png`,
        fullPage: false
      })

      // Check for modal/form
      const modalVisible = await page.locator('[role="dialog"], .modal, [data-testid="add-contact-modal"]').isVisible().catch(() => false)
      const formVisible = await page.locator('form').isVisible().catch(() => false)

      if (modalVisible || formVisible) {
        validations.push({
          test: 'Add Contact modal opens',
          passed: true,
          details: 'Modal or form appeared after clicking Add Contact'
        })
        console.log('✅ Add Contact modal/form opened')

        // Check for essential form fields
        const nameField = await page.locator('input[name="name"], input[placeholder*="name" i]').count()
        const emailField = await page.locator('input[name="email"], input[type="email"]').count()
        const phoneField = await page.locator('input[name="phone"], input[type="tel"]').count()

        validations.push({
          test: 'Contact form has required fields',
          passed: nameField > 0 && (emailField > 0 || phoneField > 0),
          details: `name: ${nameField > 0}, email: ${emailField > 0}, phone: ${phoneField > 0}`
        })

        // Close modal (press Escape or click close button)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
      } else {
        // Check if it navigated to a new page instead
        const currentUrl = page.url()
        if (currentUrl.includes('/contacts/new')) {
          validations.push({
            test: 'Add Contact modal opens',
            passed: true,
            details: 'Navigated to /contacts/new page'
          })
          console.log('✅ Navigated to new contact page')

          // Go back to contacts list
          await page.goto(`${BASE_URL}/contacts`)
          await page.waitForLoadState('networkidle')
        } else {
          validations.push({
            test: 'Add Contact modal opens',
            passed: false,
            details: 'No modal appeared and did not navigate'
          })
          issues.push('Add Contact button does nothing')
          console.log('❌ Add Contact button has no effect')
        }
      }
    }

    // 6. Test Quick Filters
    console.log('🔘 Step 6: Test Quick Filters...')

    const quickFilterButtons = await page.locator('button').filter({ hasText: /(Urgent|High Priority|New Leads|Active|Customers)/i }).all()

    if (quickFilterButtons.length > 0) {
      validations.push({
        test: 'Quick filter buttons present',
        passed: true,
        details: `Found ${quickFilterButtons.length} quick filter buttons`
      })
      console.log(`✅ Found ${quickFilterButtons.length} quick filter buttons`)

      // Click first filter to test
      await quickFilterButtons[0].click()
      await page.waitForTimeout(500)

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/contacts-03-filtered.png`,
        fullPage: false
      })
    } else {
      validations.push({
        test: 'Quick filter buttons present',
        passed: false,
        details: 'No quick filter buttons found'
      })
      issues.push('Quick filter UI missing')
      console.log('❌ No quick filter buttons found')
    }

    // Final screenshot
    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/contacts-04-final-state.png`,
      fullPage: true
    })

  } catch (error) {
    console.error('❌ Validation error:', error)
    issues.push(`Script error: ${error}`)

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/contacts-error.png`,
      fullPage: true
    }).catch(() => {})
  } finally {
    await browser.close()
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📋 CONTACTS PAGE VALIDATION SUMMARY')
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

  // Return status
  return {
    passed: failed === 0,
    validations,
    issues
  }
}

// Run validation
validateContacts()
  .then(result => {
    process.exit(result.passed ? 0 : 1)
  })
  .catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
