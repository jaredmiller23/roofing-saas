import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for production smoke testing
 * Tests against the deployed production app at https://roofing-saas.vercel.app
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  /* Include smoke tests in addition to spec/test files */
  testMatch: ['**/*.smoke.ts', '**/*.spec.ts', '**/*.test.ts'],

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
    baseURL: 'https://roofing-saas.vercel.app',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on every step for smoke tests */
    screenshot: 'on',

    /* Video recording on first retry for debugging */
    video: 'on-first-retry',

    /* Navigation and action timeouts */
    navigationTimeout: 30000, // Navigation operations timeout
    actionTimeout: 10000, // Individual action timeout (click, fill, etc)

    /* Headless mode disabled for visibility during smoke tests */
    headless: false,

    /* Slow motion for debugging - 500ms between actions */
    launchOptions: { slowMo: 500 },
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup project - runs first to authenticate against production
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

  /* No webServer configuration needed - production app is already running */
})
