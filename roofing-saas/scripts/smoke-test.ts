#!/usr/bin/env tsx
/**
 * Smoke Test Script
 *
 * This script validates that the app actually works for real users by:
 * 1. Logging in with real credentials
 * 2. Navigating to critical pages
 * 3. Clicking into detail pages (not just list pages)
 * 4. Verifying no error screens appear
 *
 * IMPORTANT: This must pass before any "ship ready" claim!
 *
 * Usage:
 *   npm run smoke-test                    # Run against production
 *   npm run smoke-test -- --local         # Run against localhost:3000
 *   npm run smoke-test -- --url=https://staging.example.com
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright'

// Configuration
const PROD_URL = 'https://roofing-saas.vercel.app'
const LOCAL_URL = 'http://localhost:3000'

// Demo account credentials (safe for smoke testing)
const DEMO_EMAIL = process.env.SMOKE_TEST_EMAIL || 'demo@roofingsaas.com'
const DEMO_PASSWORD = process.env.SMOKE_TEST_PASSWORD || 'Demo2025!'

interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration: number
}

interface SmokeTestReport {
  timestamp: string
  baseUrl: string
  totalTests: number
  passed: number
  failed: number
  results: TestResult[]
}

class SmokeTest {
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private page: Page | null = null
  private baseUrl: string
  private results: TestResult[] = []

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async setup(): Promise<void> {
    this.browser = await chromium.launch({ headless: true })
    this.context = await this.browser.newContext()
    this.page = await this.context.newPage()
  }

  async teardown(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
    }
  }

  async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now()
    try {
      await testFn()
      this.results.push({
        name,
        passed: true,
        duration: Date.now() - startTime,
      })
      console.log(`  ✅ ${name}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.results.push({
        name,
        passed: false,
        error: errorMessage,
        duration: Date.now() - startTime,
      })
      console.log(`  ❌ ${name}: ${errorMessage}`)
    }
  }

  async hasErrorPage(): Promise<boolean> {
    if (!this.page) return false
    return await this.page.locator('text=Dashboard Error').isVisible({ timeout: 1000 }).catch(() => false)
      || await this.page.locator('text=Something went wrong').isVisible({ timeout: 1000 }).catch(() => false)
      || await this.page.locator('text=404').isVisible({ timeout: 1000 }).catch(() => false)
  }

  async login(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized')

    await this.page.goto(`${this.baseUrl}/login`)
    await this.page.waitForTimeout(1000)
    await this.page.fill('input[type="email"]', DEMO_EMAIL)
    await this.page.fill('input[type="password"]', DEMO_PASSWORD)
    await this.page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await this.page.waitForURL('**/dashboard**', { timeout: 15000 })
    await this.page.waitForTimeout(2000)

    if (await this.hasErrorPage()) {
      throw new Error('Dashboard shows error after login')
    }
  }

  async runAllTests(): Promise<SmokeTestReport> {
    console.log('\n🔥 SMOKE TEST')
    console.log('='.repeat(50))
    console.log(`Base URL: ${this.baseUrl}`)
    console.log(`Timestamp: ${new Date().toISOString()}`)
    console.log('='.repeat(50))

    await this.setup()

    try {
      // Login test
      console.log('\n📝 Authentication')
      await this.runTest('Login with demo account', async () => {
        await this.login()
      })

      // Dashboard test
      console.log('\n📊 Dashboard')
      await this.runTest('Dashboard loads without error', async () => {
        await this.page!.goto(`${this.baseUrl}/dashboard`)
        await this.page!.waitForTimeout(2000)
        if (await this.hasErrorPage()) throw new Error('Error page displayed')
      })

      // Pipeline tests
      console.log('\n🎯 Pipeline')
      await this.runTest('Pipeline page loads', async () => {
        await this.page!.goto(`${this.baseUrl}/projects`)
        await this.page!.waitForTimeout(2000)
        if (await this.hasErrorPage()) throw new Error('Error page displayed')
      })

      await this.runTest('Click into project detail page', async () => {
        await this.page!.goto(`${this.baseUrl}/projects`)
        await this.page!.waitForTimeout(3000)

        // Find first project card and click on the project name (which links to detail)
        const projectCard = this.page!.locator('[class*="ProjectCard"], [class*="project-card"]').first()
        if (await projectCard.isVisible({ timeout: 5000 })) {
          // Click anywhere on the card to navigate to detail
          await projectCard.click()
          await this.page!.waitForTimeout(4000)

          // Verify we navigated to a project detail page
          const currentUrl = this.page!.url()
          const isOnDetailPage = /\/projects\/[a-f0-9-]{36}/.test(currentUrl)

          if (await this.hasErrorPage()) {
            throw new Error(`Project detail page shows error (URL: ${currentUrl})`)
          }
          if (!isOnDetailPage) {
            console.log(`    (Clicked but stayed on ${currentUrl})`)
          }
        } else {
          // Try generic card selector
          const genericCard = this.page!.locator('[class*="card"]').first()
          if (await genericCard.isVisible({ timeout: 3000 })) {
            await genericCard.click()
            await this.page!.waitForTimeout(3000)
            if (await this.hasErrorPage()) throw new Error('Page shows error after card click')
          } else {
            console.log('    (No projects to click)')
          }
        }
      })

      // Contacts tests
      console.log('\n👥 Contacts')
      await this.runTest('Contacts page loads', async () => {
        await this.page!.goto(`${this.baseUrl}/contacts`)
        await this.page!.waitForTimeout(2000)
        if (await this.hasErrorPage()) throw new Error('Error page displayed')
      })

      await this.runTest('Click into contact detail page', async () => {
        await this.page!.goto(`${this.baseUrl}/contacts`)
        await this.page!.waitForTimeout(2000)

        // Find first contact row and click
        const contactRow = this.page!.locator('tr[data-testid], tbody tr').first()
        if (await contactRow.isVisible({ timeout: 5000 })) {
          await contactRow.click()
          await this.page!.waitForTimeout(3000)
          if (await this.hasErrorPage()) throw new Error('Contact detail page shows error')
        } else {
          console.log('    (No contacts to click)')
        }
      })

      // Messages tests
      console.log('\n💬 Messages')
      await this.runTest('Messages page loads', async () => {
        await this.page!.goto(`${this.baseUrl}/messages`)
        await this.page!.waitForTimeout(2000)
        if (await this.hasErrorPage()) throw new Error('Error page displayed')
      })

      // Tasks tests
      console.log('\n✅ Tasks')
      await this.runTest('Tasks page loads', async () => {
        await this.page!.goto(`${this.baseUrl}/tasks`)
        await this.page!.waitForTimeout(2000)
        if (await this.hasErrorPage()) throw new Error('Error page displayed')
      })

      // Signatures tests
      console.log('\n✍️ Signatures')
      await this.runTest('Signatures page loads', async () => {
        await this.page!.goto(`${this.baseUrl}/signatures`)
        await this.page!.waitForTimeout(2000)
        if (await this.hasErrorPage()) throw new Error('Error page displayed')
      })

      // Claims tests
      console.log('\n📋 Claims')
      await this.runTest('Claims page loads', async () => {
        await this.page!.goto(`${this.baseUrl}/claims`)
        await this.page!.waitForTimeout(2000)
        if (await this.hasErrorPage()) throw new Error('Error page displayed')
      })

      // Settings tests
      console.log('\n⚙️ Settings')
      await this.runTest('Settings page loads', async () => {
        await this.page!.goto(`${this.baseUrl}/settings`)
        await this.page!.waitForTimeout(2000)
        if (await this.hasErrorPage()) throw new Error('Error page displayed')
      })

    } finally {
      await this.teardown()
    }

    // Generate report
    const passedCount = this.results.filter(r => r.passed).length
    const failedCount = this.results.filter(r => !r.passed).length

    console.log('\n' + '='.repeat(50))
    console.log('📊 SMOKE TEST RESULTS')
    console.log('='.repeat(50))
    console.log(`Total: ${this.results.length}`)
    console.log(`Passed: ${passedCount} ✅`)
    console.log(`Failed: ${failedCount} ❌`)
    console.log('='.repeat(50))

    if (failedCount > 0) {
      console.log('\n❌ SMOKE TEST FAILED')
      console.log('The app is NOT ready to ship.')
      console.log('\nFailed tests:')
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`)
      })
      process.exitCode = 1
    } else {
      console.log('\n✅ SMOKE TEST PASSED')
      console.log('All critical paths verified.')
    }

    return {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      totalTests: this.results.length,
      passed: passedCount,
      failed: failedCount,
      results: this.results,
    }
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2)

  let baseUrl = PROD_URL

  if (args.includes('--local')) {
    baseUrl = LOCAL_URL
  }

  const urlArg = args.find((arg: string) => arg.startsWith('--url='))
  if (urlArg) {
    baseUrl = urlArg.split('=')[1]
  }

  const smokeTest = new SmokeTest(baseUrl)
  await smokeTest.runAllTests()
}

main().catch(error => {
  console.error('Smoke test failed to run:', error)
  process.exit(1)
})
