#!/usr/bin/env npx tsx
/**
 * Deployment Verification Script
 *
 * Verifies that the app is working correctly after deployment.
 * Tests authentication, API endpoints, and critical pages.
 *
 * USAGE:
 *   npx tsx scripts/ops/verify.ts             # Verify production
 *   npx tsx scripts/ops/verify.ts --local     # Verify local
 *   npm run ops:verify                        # Via npm script
 *
 * EXIT CODES:
 *   0 = All checks passed
 *   1 = One or more checks failed
 */

import { chromium, Browser, Page } from 'playwright'
import { testAccount, getBaseUrl, parseEnvironment, type Environment } from './config'

interface CheckResult {
  name: string
  passed: boolean
  message: string
  duration: number
}

const results: CheckResult[] = []

async function runCheck(
  name: string,
  fn: () => Promise<{ passed: boolean; message: string }>
): Promise<boolean> {
  const start = Date.now()
  process.stdout.write(`  ${name}... `)

  try {
    const result = await fn()
    const duration = Date.now() - start

    results.push({ name, ...result, duration })

    if (result.passed) {
      console.log(`✅ (${duration}ms)`)
    } else {
      console.log(`❌ ${result.message}`)
    }

    return result.passed
  } catch (error) {
    const duration = Date.now() - start
    const message = error instanceof Error ? error.message : 'Unknown error'

    results.push({ name, passed: false, message, duration })
    console.log(`❌ ${message}`)

    return false
  }
}

async function verify(env: Environment) {
  const baseUrl = getBaseUrl(env)

  console.log('\n' + '='.repeat(60))
  console.log(`  DEPLOYMENT VERIFICATION`)
  console.log(`  Environment: ${env}`)
  console.log(`  URL: ${baseUrl}`)
  console.log('='.repeat(60) + '\n')

  let browser: Browser | null = null
  let page: Page | null = null

  try {
    // Launch browser
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext()
    page = await context.newPage()

    // ==========================================================================
    // CHECK 1: App is reachable
    // ==========================================================================
    console.log('1. Connectivity')
    await runCheck('App is reachable', async () => {
      const response = await page!.goto(baseUrl, { timeout: 30000 })
      if (!response) {
        return { passed: false, message: 'No response' }
      }
      if (response.status() >= 400) {
        return { passed: false, message: `HTTP ${response.status()}` }
      }
      return { passed: true, message: 'OK' }
    })

    // ==========================================================================
    // CHECK 2: Authentication
    // ==========================================================================
    console.log('\n2. Authentication')

    await runCheck('Login page loads', async () => {
      await page!.goto(`${baseUrl}/login`, { timeout: 15000 })
      const emailInput = page!.locator('input[type="email"]')
      const visible = await emailInput.isVisible({ timeout: 5000 })
      return {
        passed: visible,
        message: visible ? 'OK' : 'Email input not found',
      }
    })

    // Warm up serverless functions before login attempt to avoid cold start timeouts
    await page!.request.get(`${baseUrl}/api/contacts?limit=1`).catch(() => {})

    await runCheck('Login with test account', async () => {
      await page!.fill('input[type="email"]', testAccount.email)
      await page!.fill('input[type="password"]', testAccount.password)
      await page!.click('button[type="submit"]')

      try {
        await page!.waitForURL(/\/dashboard|\/en\/dashboard/, { timeout: 45000 })
        return { passed: true, message: 'OK' }
      } catch {
        // Wait briefly for error UI to hydrate or late redirect to complete
        await page!.waitForTimeout(2000)
        const url = page!.url()

        // Check if redirect completed during the wait
        if (url.includes('dashboard')) {
          return { passed: true, message: 'OK (late redirect)' }
        }

        if (url.includes('login')) {
          const alertLocator = page!.locator('[role="alert"]')
          const alertVisible = await alertLocator.isVisible().catch(() => false)
          let errorText = 'No error displayed — login timed out (possible cold start)'
          if (alertVisible) {
            // Read from AlertDescription child to avoid empty parent container
            const descText = await alertLocator
              .locator('div[data-slot="alert-description"], p, div')
              .first()
              .textContent()
              .catch(() => '')
            errorText = descText?.trim() || 'Auth timed out (Vercel cold start likely)'
          }
          return { passed: false, message: `Login failed: ${errorText}` }
        }
        return { passed: false, message: `Unexpected redirect to ${url}` }
      }
    })

    // ==========================================================================
    // CHECK 3: Critical Pages
    // ==========================================================================
    console.log('\n3. Critical Pages')

    // Warm-up: ping an API endpoint to wake Vercel serverless functions
    // This prevents the first page check from absorbing cold start latency
    await page!.request.get(`${baseUrl}/api/contacts?limit=1`).catch(() => {})

    const criticalPages = [
      { path: '/en/dashboard', name: 'Dashboard' },
      { path: '/en/contacts', name: 'Contacts' },
      { path: '/en/signatures', name: 'Signatures' },
      { path: '/en/projects', name: 'Projects' },
    ]

    for (const { path, name } of criticalPages) {
      await runCheck(`${name} page loads`, async () => {
        // Use domcontentloaded instead of networkidle — SPA pages have
        // continuous background requests (weather, data refresh) that
        // prevent networkidle from ever settling
        await page!.goto(`${baseUrl}${path}`, {
          timeout: 45000,
          waitUntil: 'domcontentloaded',
        })

        // Wait for meaningful content to appear (not just blank page)
        // Give the page time to hydrate and render initial content
        await page!.waitForLoadState('load', { timeout: 30000 })

        // Check for error indicators
        const pageText = await page!.textContent('body')
        if (
          pageText?.includes('not associated with tenant') ||
          pageText?.includes('No tenant found')
        ) {
          return { passed: false, message: 'Tenant error detected' }
        }

        // Check for visible error alerts
        const errorAlert = page!.locator('[role="alert"]:has-text("error")')
        if (await errorAlert.isVisible().catch(() => false)) {
          const text = await errorAlert.textContent()
          return { passed: false, message: `Error: ${text}` }
        }

        return { passed: true, message: 'OK' }
      })
    }

    // ==========================================================================
    // CHECK 4: API Endpoints
    // ==========================================================================
    console.log('\n4. API Endpoints')

    const apiEndpoints = [
      { path: '/api/contacts?limit=1', name: 'Contacts API' },
      { path: '/api/signature-templates', name: 'Signature Templates API' },
      { path: '/api/projects?limit=1', name: 'Projects API' },
    ]

    for (const { path, name } of apiEndpoints) {
      await runCheck(name, async () => {
        const response = await page!.request.get(`${baseUrl}${path}`, {
          timeout: 45000,
        })
        const status = response.status()

        if (status === 401) {
          return { passed: false, message: 'Unauthorized (auth issue)' }
        }
        if (status >= 400) {
          return { passed: false, message: `HTTP ${status}` }
        }

        return { passed: true, message: `HTTP ${status}` }
      })
    }

    // ==========================================================================
    // SUMMARY
    // ==========================================================================
    console.log('\n' + '='.repeat(60))

    const passed = results.filter((r) => r.passed).length
    const failed = results.filter((r) => !r.passed).length
    const totalTime = results.reduce((sum, r) => sum + r.duration, 0)

    if (failed === 0) {
      console.log(`  ✅ ALL CHECKS PASSED (${passed}/${results.length})`)
    } else {
      console.log(`  ❌ ${failed} CHECK(S) FAILED`)
      console.log('\n  Failed checks:')
      for (const r of results.filter((r) => !r.passed)) {
        console.log(`    - ${r.name}: ${r.message}`)
      }
    }

    console.log(`\n  Total time: ${totalTime}ms`)
    console.log('='.repeat(60) + '\n')

    return failed === 0
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

async function main() {
  const env = parseEnvironment()

  try {
    const success = await verify(env)
    process.exit(success ? 0 : 1)
  } catch (error) {
    console.error('\n❌ Verification failed with error:', error)
    process.exit(1)
  }
}

main()
