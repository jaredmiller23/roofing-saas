#!/usr/bin/env npx tsx
/**
 * Lightweight Smoke Test
 *
 * HTTP-only health checks that run without Playwright or browser dependencies.
 * Designed for CI/CD post-deploy verification where installing browsers is impractical.
 *
 * Checks:
 *   1. /api/health returns 200 with status: 'healthy'
 *   2. Landing page (/) returns 200
 *   3. /en/login returns 200
 *
 * USAGE:
 *   npx tsx scripts/ops/smoke-test.ts                              # Verify production
 *   npx tsx scripts/ops/smoke-test.ts --local                     # Verify local
 *   VERIFY_URL=https://example.vercel.app npx tsx scripts/ops/smoke-test.ts  # Custom URL
 *   npm run ops:smoke                                              # Via npm script
 *
 * EXIT CODES:
 *   0 = All checks passed
 *   1 = One or more checks failed
 */

interface CheckResult {
  name: string
  passed: boolean
  message: string
  duration: number
}

const results: CheckResult[] = []

// Individual check timeout — accounts for Vercel cold starts
const CHECK_TIMEOUT_MS = 45_000

function getBaseUrl(): string {
  // 1. VERIFY_URL env var (set by GitHub Actions from deployment_status event)
  if (process.env.VERIFY_URL) {
    return process.env.VERIFY_URL.replace(/\/+$/, '')
  }

  // 2. CLI args
  const args = process.argv.slice(2)
  if (args.includes('--local')) {
    return 'http://localhost:3000'
  }
  const urlArg = args.find((arg) => arg.startsWith('--url='))
  if (urlArg) {
    return urlArg.split('=')[1].replace(/\/+$/, '')
  }

  // 3. Default to production
  return 'https://roofing-saas.vercel.app'
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'RoofingSaaS-SmokeTest/1.0',
      },
    })
    return response
  } finally {
    clearTimeout(timer)
  }
}

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
      console.log(`PASS (${duration}ms)`)
    } else {
      console.log(`FAIL - ${result.message}`)
    }

    return result.passed
  } catch (error) {
    const duration = Date.now() - start
    const message = error instanceof Error ? error.message : 'Unknown error'

    results.push({ name, passed: false, message, duration })
    console.log(`FAIL - ${message}`)

    return false
  }
}

async function main() {
  const baseUrl = getBaseUrl()

  console.log('')
  console.log('='.repeat(60))
  console.log('  POST-DEPLOY SMOKE TEST')
  console.log(`  URL: ${baseUrl}`)
  console.log(`  Time: ${new Date().toISOString()}`)
  console.log('='.repeat(60))
  console.log('')

  // ========================================================================
  // CHECK 1: Health endpoint
  // ========================================================================
  console.log('1. Health Endpoint')
  await runCheck('/api/health returns healthy', async () => {
    const response = await fetchWithTimeout(
      `${baseUrl}/api/health`,
      CHECK_TIMEOUT_MS
    )

    if (response.status !== 200) {
      return {
        passed: false,
        message: `HTTP ${response.status} (expected 200)`,
      }
    }

    const body = await response.json()

    if (body.status !== 'healthy') {
      // Include check details for debugging
      const failedChecks = Object.entries(body.checks || {})
        .filter(([, v]) => (v as { status: string }).status !== 'ok')
        .map(([k, v]) => `${k}: ${(v as { error?: string }).error || 'error'}`)
        .join(', ')

      return {
        passed: false,
        message: `status=${body.status}${failedChecks ? ` (${failedChecks})` : ''}`,
      }
    }

    const version = body.version || 'unknown'
    return { passed: true, message: `healthy (version: ${version})` }
  })

  // ========================================================================
  // CHECK 2: Landing page
  // ========================================================================
  console.log('\n2. Landing Page')
  await runCheck('/ returns 200', async () => {
    const response = await fetchWithTimeout(baseUrl, CHECK_TIMEOUT_MS)

    // Accept 200 or redirects that resolve to 200 (fetch follows redirects)
    if (response.status >= 400) {
      return {
        passed: false,
        message: `HTTP ${response.status}`,
      }
    }

    return { passed: true, message: `HTTP ${response.status}` }
  })

  // ========================================================================
  // CHECK 3: Login page
  // ========================================================================
  console.log('\n3. Login Page')
  await runCheck('/en/login returns 200', async () => {
    const response = await fetchWithTimeout(
      `${baseUrl}/en/login`,
      CHECK_TIMEOUT_MS
    )

    if (response.status >= 400) {
      return {
        passed: false,
        message: `HTTP ${response.status}`,
      }
    }

    // Verify we got HTML back (not a JSON error)
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html')) {
      return {
        passed: false,
        message: `Unexpected content-type: ${contentType}`,
      }
    }

    return { passed: true, message: `HTTP ${response.status}` }
  })

  // ========================================================================
  // SUMMARY
  // ========================================================================
  console.log('')
  console.log('='.repeat(60))

  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0)

  if (failed === 0) {
    console.log(`  ALL CHECKS PASSED (${passed}/${results.length})`)
  } else {
    console.log(`  ${failed} CHECK(S) FAILED`)
    console.log('')
    console.log('  Failed checks:')
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`    - ${r.name}: ${r.message}`)
    }
  }

  console.log(`\n  Total time: ${totalTime}ms`)
  console.log('='.repeat(60))
  console.log('')

  process.exit(failed === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error('Smoke test failed with error:', error)
  process.exit(1)
})
