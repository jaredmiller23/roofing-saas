#!/usr/bin/env tsx
/**
 * Debug script to capture the actual JavaScript error
 * when navigating to a specific page
 */

import { chromium } from 'playwright'

const DEMO_EMAIL = 'claude-test@roofingsaas.com'
const DEMO_PASSWORD = 'ClaudeTest2025!Secure'
// Use production by default, can be overridden with --local flag
const BASE_URL = process.argv.includes('--local') ? 'http://localhost:3000' : 'https://roofing-saas.vercel.app'

async function debugPage(targetPath: string) {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const errors: string[] = []
  const logs: string[] = []

  // Capture all console messages
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`
    logs.push(text)
    if (msg.type() === 'error') {
      errors.push(text)
    }
  })

  // Capture page errors (uncaught exceptions)
  page.on('pageerror', err => {
    errors.push(`[PAGE ERROR] ${err.message}\n${err.stack}`)
  })

  try {
    console.log('1. Logging in...')
    await page.goto(`${BASE_URL}/login`)
    await page.waitForSelector('input[type="email"]', { timeout: 10000 })
    await page.fill('input[type="email"]', DEMO_EMAIL)
    await page.fill('input[type="password"]', DEMO_PASSWORD)
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 15000 })
    console.log(`   Login successful, redirected to: ${page.url()}`)

    console.log(`2. Navigating to ${targetPath}...`)
    await page.goto(`${BASE_URL}${targetPath}`)
    await page.waitForTimeout(5000) // Wait longer for API calls
    console.log(`   Current URL: ${page.url()}`)

    // Check for error boundary
    const hasError = await page.locator('text=Dashboard Error').isVisible().catch(() => false)
    const hasSomethingWrong = await page.locator('text=Something went wrong').isVisible().catch(() => false)

    if (hasError || hasSomethingWrong) {
      console.log('\n⚠️  ERROR BOUNDARY TRIGGERED!')

      // Try to capture the dev error message
      const devError = await page.locator('.text-xs.font-mono').textContent().catch(() => null)
      if (devError) {
        console.log(`   Dev Error: ${devError}`)
      }

      // Take a screenshot
      await page.screenshot({ path: '/tmp/error-page.png' })
      console.log('   Screenshot saved to /tmp/error-page.png')
    }

    // Also check page title for error indicators
    const title = await page.title().catch(() => '')
    console.log(`Page title: ${title}`)

    console.log('\n=== SIGNATURE-RELATED LOGS ===')
    logs.filter(l => l.includes('[Signatures]')).forEach(l => console.log(l))
    console.log('=== END SIGNATURE LOGS ===')

    console.log('\n=== CAPTURED ERRORS ===')
    errors.forEach(e => console.log(e))
    console.log('=== END ERRORS ===')

    if (errors.length === 0 && !hasError) {
      console.log('\n✅ No errors captured! Page seems to work.')
    }

  } catch (e) {
    console.error('Script error:', e)
  } finally {
    await browser.close()
  }
}

// Parse command line argument for target path
const targetPath = process.argv[2] || '/en/projects'
console.log(`\nDebugging page: ${targetPath}\n`)
debugPage(targetPath).catch(console.error)
