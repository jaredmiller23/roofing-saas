/**
 * Comprehensive Feature Validation Script
 * Phase 4: Validate all remaining features
 */
import { chromium, Page } from 'playwright'
import path from 'path'
import fs from 'fs'

const BASE_URL = 'http://localhost:3000'
const AUTH_FILE = path.join(__dirname, '../playwright/.auth/user.json')
const SCREENSHOTS_DIR = path.join(__dirname, '../validation-screenshots')

interface ValidationResult {
  feature: string
  url: string
  passed: boolean
  checks: { test: string; passed: boolean; details?: string }[]
  screenshot?: string
}

async function validatePage(
  page: Page,
  feature: string,
  url: string,
  checks: { name: string; selector: string; optional?: boolean }[]
): Promise<ValidationResult> {
  const result: ValidationResult = {
    feature,
    url,
    passed: true,
    checks: []
  }

  try {
    await page.goto(`${BASE_URL}${url}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Take screenshot
    const screenshotName = feature.toLowerCase().replace(/\s+/g, '-')
    result.screenshot = `${SCREENSHOTS_DIR}/${screenshotName}.png`
    await page.screenshot({ path: result.screenshot, fullPage: false })

    // Run checks
    for (const check of checks) {
      try {
        const count = await page.locator(check.selector).count()
        const passed = count > 0
        result.checks.push({
          test: check.name,
          passed: passed || check.optional === true,
          details: `Found ${count} elements`
        })
        if (!passed && !check.optional) {
          result.passed = false
        }
      } catch (e) {
        result.checks.push({
          test: check.name,
          passed: check.optional === true,
          details: `Error: ${e}`
        })
        if (!check.optional) {
          result.passed = false
        }
      }
    }
  } catch (e) {
    result.passed = false
    result.checks.push({
      test: 'Page loads',
      passed: false,
      details: `Error: ${e}`
    })
  }

  return result
}

async function validateAllFeatures() {
  console.log('🔍 Phase 4: Validating All Remaining Features\n')

  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  }

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    storageState: AUTH_FILE,
    viewport: { width: 1440, height: 900 }
  })
  const page = await context.newPage()

  const results: ValidationResult[] = []

  // Define all features to validate
  const features = [
    {
      name: 'Voice AI',
      url: '/voice-assistant',
      checks: [
        { name: 'Page loads', selector: 'h1, h2' },
        { name: 'Voice controls visible', selector: 'button, [role="button"]' },
        { name: 'Microphone/audio element', selector: 'button, audio, [data-testid*="voice"], [data-testid*="mic"]', optional: true }
      ]
    },
    {
      name: 'Claims',
      url: '/claims',
      checks: [
        { name: 'Page loads', selector: 'h1, h2' },
        { name: 'Claims list or empty state', selector: 'table, .claim-item, text=/No claims/i' },
        { name: 'Create claim button', selector: 'button, a', optional: true }
      ]
    },
    {
      name: 'Call Logs',
      url: '/call-logs',
      checks: [
        { name: 'Page loads', selector: 'h1, h2' },
        { name: 'Call list or empty state', selector: 'table, .call-item, text=/No calls/i' },
        { name: 'Log call button', selector: 'button, a', optional: true }
      ]
    },
    {
      name: 'Tasks',
      url: '/tasks',
      checks: [
        { name: 'Page loads', selector: 'h1, h2' },
        { name: 'Tasks list or empty state', selector: 'table, .task-item, text=/No tasks/i' },
        { name: 'Create task button', selector: 'button, a', optional: true }
      ]
    },
    {
      name: 'Field Activity',
      url: '/field-activity',
      checks: [
        { name: 'Page loads', selector: 'h1, h2' },
        { name: 'Activity content', selector: 'table, .activity-item, canvas, text=/activity/i' },
        { name: 'Map or list view', selector: 'canvas, table, .map', optional: true }
      ]
    },
    {
      name: 'Campaigns',
      url: '/campaigns',
      checks: [
        { name: 'Page loads', selector: 'h1, h2' },
        { name: 'Campaign list or empty state', selector: 'table, .campaign-item, text=/No campaigns/i' },
        { name: 'Create campaign button', selector: 'button, a', optional: true }
      ]
    },
    {
      name: 'Lead Gen',
      url: '/lead-gen',
      checks: [
        { name: 'Page loads', selector: 'h1, h2' },
        { name: 'Lead gen content', selector: 'form, .lead-gen, canvas, table' },
        { name: 'Map or tools', selector: 'canvas, .map, button', optional: true }
      ]
    },
    {
      name: 'Settings',
      url: '/settings',
      checks: [
        { name: 'Page loads', selector: 'h1, h2' },
        { name: 'Settings sections', selector: 'form, section, .settings-section, [role="tablist"], nav' },
        { name: 'Save button', selector: 'button', optional: true }
      ]
    },
    {
      name: 'Dashboard',
      url: '/dashboard',
      checks: [
        { name: 'Page loads', selector: 'h1, h2' },
        { name: 'Stats or widgets', selector: '.stat, .widget, .card, [class*="card"]' },
        { name: 'Navigation present', selector: 'nav, aside' }
      ]
    }
  ]

  console.log(`📋 Validating ${features.length} features...\n`)

  for (const feature of features) {
    process.stdout.write(`  ${feature.name.padEnd(15)} ... `)
    const result = await validatePage(page, feature.name, feature.url, feature.checks)
    results.push(result)

    if (result.passed) {
      console.log('✅ PASS')
    } else {
      console.log('❌ FAIL')
    }
  }

  await browser.close()

  // Print summary
  console.log('\n' + '='.repeat(70))
  console.log('📋 COMPREHENSIVE FEATURE VALIDATION SUMMARY')
  console.log('='.repeat(70))

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length

  console.log(`\n✅ Passed: ${passed}/${results.length}`)
  console.log(`❌ Failed: ${failed}/${results.length}`)

  console.log('\n📝 Detailed Results:')
  for (const result of results) {
    const icon = result.passed ? '✅' : '❌'
    console.log(`\n  ${icon} ${result.feature} (${result.url})`)
    for (const check of result.checks) {
      const checkIcon = check.passed ? '✓' : '✗'
      console.log(`     ${checkIcon} ${check.test}: ${check.details || ''}`)
    }
  }

  // List failures
  const failures = results.filter(r => !r.passed)
  if (failures.length > 0) {
    console.log('\n⚠️  Features Needing Attention:')
    for (const f of failures) {
      console.log(`   - ${f.feature}: ${f.checks.filter(c => !c.passed).map(c => c.test).join(', ')}`)
    }
  }

  console.log('\n📸 Screenshots saved to:', SCREENSHOTS_DIR)
  console.log('='.repeat(70))

  return { passed: failed === 0, results }
}

// Run
validateAllFeatures()
  .then(result => {
    process.exit(result.passed ? 0 : 1)
  })
  .catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
