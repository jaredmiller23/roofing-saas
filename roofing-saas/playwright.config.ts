import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load test environment variables from .env.test
dotenv.config({ path: path.resolve(__dirname, '.env.test') })

/**
 * Determine the base URL for tests
 * - PLAYWRIGHT_BASE_URL env var takes precedence (allows testing any environment)
 * - TEST_ENV=production uses the Vercel production URL
 * - Default: localhost:3000 for local development
 */
const PRODUCTION_URL = 'https://roofing-saas.vercel.app'
const isProduction = process.env.TEST_ENV === 'production'
const baseURL = process.env.PLAYWRIGHT_BASE_URL || (isProduction ? PRODUCTION_URL : 'http://localhost:3000')

// Log which environment we're testing
console.log(`\n🎯 Playwright testing against: ${baseURL}`)
if (isProduction) {
  console.log('   (Production mode - webServer disabled)')
}

/**
 * Playwright configuration for E2E testing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: 'html',

  /* Test timeout: 60 seconds (up from default 30s) */
  timeout: 60000,

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL,

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Navigation and action timeouts */
    navigationTimeout: 30000, // Navigation operations timeout
    actionTimeout: 10000, // Individual action timeout (click, fill, etc)
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup project - runs first to authenticate
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Chromium tests with authentication
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use authenticated state from setup
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // WebKit (Safari) tests with authentication
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        // Use authenticated state from setup
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Firefox tests with authentication
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // Use authenticated state from setup
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  /* Automatically start dev server before running tests (only for local testing) */
  webServer: isProduction ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
