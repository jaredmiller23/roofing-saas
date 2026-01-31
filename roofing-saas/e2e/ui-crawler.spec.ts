import { test, expect, Page } from '@playwright/test'

/**
 * UI Crawler - Comprehensive Application Testing
 *
 * This test crawls the entire application to:
 * - Test navigation to all major routes
 * - Verify buttons and interactive elements
 * - Check for console errors
 * - Validate forms and inputs
 * - Generate comprehensive report
 */

// Track issues found during crawling
interface Issue {
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: 'navigation' | 'button' | 'form' | 'console' | 'accessibility' | 'ui'
  page: string
  element?: string
  description: string
  error?: string
}

const issues: Issue[] = []
const consoleErrors: Array<{ page: string; type: string; message: string }> = []

// Helper to track console messages
function setupConsoleTracking(page: Page, pageName: string) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({
        page: pageName,
        type: msg.type(),
        message: msg.text(),
      })
    }
  })

  page.on('pageerror', (error) => {
    issues.push({
      severity: 'high',
      category: 'console',
      page: pageName,
      description: 'JavaScript error occurred',
      error: error.message,
    })
  })
}

// Helper to check if element is clickable
async function isElementClickable(page: Page, selector: string): Promise<boolean> {
  try {
    const element = page.locator(selector).first()
    return await element.isVisible() && (await element.isEnabled())
  } catch {
    return false
  }
}

test.describe('UI Crawler - Full Application Test', () => {
  test.beforeEach(async ({ page }) => {
    // Clear issues for each test
    issues.length = 0
    consoleErrors.length = 0
  })

  test('should crawl dashboard and core pages', async ({ page }) => {
    setupConsoleTracking(page, 'Dashboard')

    // Test dashboard page
    console.log('Testing: Dashboard')
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)

    // Check for common UI elements
    const hasHeader = await page.locator('header, nav').count() > 0
    if (!hasHeader) {
      issues.push({
        severity: 'high',
        category: 'ui',
        page: '/dashboard',
        description: 'No header or navigation found',
      })
    }

    // Test navigation links
    const navLinks = await page.locator('a[href^="/"]').all()
    console.log(`Found ${navLinks.length} navigation links`)

    for (const link of navLinks.slice(0, 10)) {
      const href = await link.getAttribute('href')
      const text = await link.textContent()
      if (href && !href.includes('logout')) {
        try {
          const isVisible = await link.isVisible()
          if (!isVisible) {
            issues.push({
              severity: 'low',
              category: 'navigation',
              page: '/dashboard',
              element: `Link: ${text}`,
              description: 'Navigation link not visible',
            })
          }
        } catch (error) {
          // Link might have disappeared, that's ok
        }
      }
    }
  })

  test('should test contacts module', async ({ page }) => {
    setupConsoleTracking(page, 'Contacts')
    console.log('Testing: Contacts Module')

    // Contacts list
    await page.goto('/contacts')
    await page.waitForLoadState('networkidle')

    // Check for "New Contact" button or similar action
    const actionButtons = [
      'button:has-text("New")',
      'button:has-text("Add")',
      'button:has-text("Create")',
      'a[href*="/new"]',
    ]

    let foundActionButton = false
    for (const selector of actionButtons) {
      if (await isElementClickable(page, selector)) {
        foundActionButton = true
        break
      }
    }

    if (!foundActionButton) {
      issues.push({
        severity: 'medium',
        category: 'button',
        page: '/contacts',
        description: 'No action button found for creating new contact',
      })
    }

    // Check for search/filter
    const hasSearch =
      (await page.locator('input[type="search"], input[placeholder*="Search"]').count()) > 0
    if (!hasSearch) {
      issues.push({
        severity: 'low',
        category: 'ui',
        page: '/contacts',
        description: 'No search functionality visible',
      })
    }
  })

  test('should test projects/pipeline module', async ({ page }) => {
    setupConsoleTracking(page, 'Projects')
    console.log('Testing: Projects/Pipeline Module')

    // Test projects page
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    // Test pipeline page
    await page.goto('/pipeline')
    await page.waitForLoadState('networkidle')

    // Check for drag-and-drop elements (kanban board)
    const hasDraggable = (await page.locator('[draggable="true"]').count()) > 0
    console.log(`Pipeline has draggable elements: ${hasDraggable}`)
  })

  test('should test field activity and mapping features', async ({ page }) => {
    setupConsoleTracking(page, 'Field Activity')
    console.log('Testing: Field Activity Module')

    await page.goto('/knocks')
    await page.waitForLoadState('networkidle')

    // Check for map container
    const hasMap =
      (await page.locator('.leaflet-container, [class*="map"], #map').count()) > 0
    if (!hasMap) {
      issues.push({
        severity: 'medium',
        category: 'ui',
        page: '/knocks',
        description: 'Map container not found',
      })
    }

    // Check for territory controls
    const hasControls = (await page.locator('button, .leaflet-control').count()) > 0
    console.log(`Territory controls found: ${hasControls}`)
  })

  test('should test storm targeting features', async ({ page }) => {
    setupConsoleTracking(page, 'Storm Targeting')
    console.log('Testing: Storm Targeting Module')

    await page.goto('/storm-targeting')
    await page.waitForLoadState('networkidle')

    // Check for leads page
    await page.goto('/storm-targeting/leads')
    await page.waitForLoadState('networkidle')

    // Look for enrichment or processing controls
    const buttons = await page.locator('button').all()
    console.log(`Found ${buttons.length} buttons on storm targeting leads page`)
  })

  test('should test knocking/field features', async ({ page }) => {
    setupConsoleTracking(page, 'Knocks')
    console.log('Testing: Knocks Module')

    await page.goto('/knocks')
    await page.waitForLoadState('networkidle')

    // Check for knock logging button
    const hasNewKnock = (await page.locator('a[href*="/knocks/new"]').count()) > 0
    console.log(`New knock button found: ${hasNewKnock}`)
  })

  test('should test e-signature functionality', async ({ page }) => {
    setupConsoleTracking(page, 'E-Signature')
    console.log('Testing: E-Signature Module')

    await page.goto('/signatures')
    await page.waitForLoadState('networkidle')

    // Check for signature list or creation
    const hasSignatureUI =
      (await page.locator('canvas, [class*="signature"]').count()) > 0 ||
      (await page.locator('a[href*="/signatures/new"]').count()) > 0

    console.log(`Signature UI elements found: ${hasSignatureUI}`)
  })

  test('should test voice assistant features', async ({ page }) => {
    setupConsoleTracking(page, 'Voice')
    console.log('Testing: Voice Assistant Module')

    // Test voice page
    await page.goto('/voice')
    await page.waitForLoadState('networkidle')

    // Test voice assistant page
    await page.goto('/voice-assistant')
    await page.waitForLoadState('networkidle')

    // Check for microphone/audio controls
    const hasAudioControls =
      (await page.locator('button:has-text("Start"), button:has-text("Record")').count()) >
        0 ||
      (await page.locator('[class*="audio"], [class*="voice"]').count()) > 0

    console.log(`Audio controls found: ${hasAudioControls}`)
  })

  test('should test tasks and calendar', async ({ page }) => {
    setupConsoleTracking(page, 'Tasks')
    console.log('Testing: Tasks Module')

    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')

    // Test board view
    await page.goto('/tasks/board')
    await page.waitForLoadState('networkidle')

    // Check for task board columns
    const hasColumns = (await page.locator('[class*="column"], [class*="lane"]').count()) > 0
    console.log(`Task board columns found: ${hasColumns}`)

    // Test events/calendar
    await page.goto('/events')
    await page.waitForLoadState('networkidle')
  })

  test('should test financial modules', async ({ page }) => {
    setupConsoleTracking(page, 'Financials')
    console.log('Testing: Financial Modules')

    // Test financial reports
    await page.goto('/financial/reports')
    await page.waitForLoadState('networkidle')

    // Test commissions
    await page.goto('/financial/commissions')
    await page.waitForLoadState('networkidle')

    // Test analytics
    await page.goto('/financial/analytics')
    await page.waitForLoadState('networkidle')

    // Test reports
    await page.goto('/financial/reports')
    await page.waitForLoadState('networkidle')

    // Check for charts or data visualization
    const hasCharts = (await page.locator('svg, canvas, [class*="chart"]').count()) > 0
    console.log(`Financial charts found: ${hasCharts}`)
  })

  test('should test campaigns and automation', async ({ page }) => {
    setupConsoleTracking(page, 'Campaigns')
    console.log('Testing: Campaigns Module')

    await page.goto('/campaigns')
    await page.waitForLoadState('networkidle')

    // Test templates
    await page.goto('/campaigns/templates')
    await page.waitForLoadState('networkidle')

    // Check for campaign creation
    const hasNewCampaign = (await page.locator('a[href*="/campaigns/new"]').count()) > 0
    console.log(`New campaign button found: ${hasNewCampaign}`)
  })

  test('should test settings and profile', async ({ page }) => {
    setupConsoleTracking(page, 'Settings')
    console.log('Testing: Settings Module')

    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Test profile settings
    await page.goto('/settings/profile')
    await page.waitForLoadState('networkidle')

    // Test my-card settings
    await page.goto('/settings/my-card')
    await page.waitForLoadState('networkidle')

    // Check for form inputs
    const hasInputs = (await page.locator('input, textarea, select').count()) > 0
    if (!hasInputs) {
      issues.push({
        severity: 'high',
        category: 'form',
        page: '/settings',
        description: 'No form inputs found in settings',
      })
    }
  })

  test('should test gamification features', async ({ page }) => {
    setupConsoleTracking(page, 'Gamification')
    console.log('Testing: Gamification Module')

    await page.goto('/gamification')
    await page.waitForLoadState('networkidle')

    // Check for points/badges display
    const hasGamificationUI =
      (await page.locator('[class*="badge"], [class*="achievement"], [class*="points"]').count()) >
      0
    console.log(`Gamification UI found: ${hasGamificationUI}`)

    // Test incentives
    await page.goto('/incentives')
    await page.waitForLoadState('networkidle')
  })

  test('should test surveys', async ({ page }) => {
    setupConsoleTracking(page, 'Surveys')
    console.log('Testing: Surveys')

    // Note: Organizations was merged into contacts (migration 20251119000600)
    // The /organizations page no longer exists

    await page.goto('/surveys')
    await page.waitForLoadState('networkidle')

    // Check for survey creation
    const hasSurveyCreation = (await page.locator('a[href*="/surveys/new"]').count()) > 0
    console.log(`Survey creation link found: ${hasSurveyCreation}`)
  })

  test('should test call logs and jobs', async ({ page }) => {
    setupConsoleTracking(page, 'Call Logs')
    console.log('Testing: Call Logs and Jobs')

    await page.goto('/call-logs')
    await page.waitForLoadState('networkidle')

    await page.goto('/jobs')
    await page.waitForLoadState('networkidle')

    // Check for job creation
    const hasJobCreation = (await page.locator('a[href*="/jobs/new"]').count()) > 0
    console.log(`Job creation link found: ${hasJobCreation}`)
  })

  test('should test project files', async ({ page }) => {
    setupConsoleTracking(page, 'Project Files')
    console.log('Testing: Project Files Module')

    await page.goto('/project-files')
    await page.waitForLoadState('networkidle')

    // Check for file upload or creation
    const hasFileUpload =
      (await page.locator('input[type="file"]').count()) > 0 ||
      (await page.locator('a[href*="/project-files/new"]').count()) > 0

    console.log(`File upload/creation found: ${hasFileUpload}`)
  })

  test.afterAll(async () => {
    // Generate comprehensive report
    console.log('\n\n=================================')
    console.log('UI CRAWLER TEST RESULTS')
    console.log('=================================\n')

    console.log(`Total Issues Found: ${issues.length}`)
    console.log(`Console Errors: ${consoleErrors.length}\n`)

    if (issues.length > 0) {
      console.log('ISSUES BY SEVERITY:')
      const bySeverity = {
        critical: issues.filter((i) => i.severity === 'critical'),
        high: issues.filter((i) => i.severity === 'high'),
        medium: issues.filter((i) => i.severity === 'medium'),
        low: issues.filter((i) => i.severity === 'low'),
      }

      console.log(`  Critical: ${bySeverity.critical.length}`)
      console.log(`  High: ${bySeverity.high.length}`)
      console.log(`  Medium: ${bySeverity.medium.length}`)
      console.log(`  Low: ${bySeverity.low.length}\n`)

      console.log('DETAILED ISSUES:')
      issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. [${issue.severity.toUpperCase()}] ${issue.category}`)
        console.log(`   Page: ${issue.page}`)
        if (issue.element) console.log(`   Element: ${issue.element}`)
        console.log(`   Description: ${issue.description}`)
        if (issue.error) console.log(`   Error: ${issue.error}`)
      })
    }

    if (consoleErrors.length > 0) {
      console.log('\n\nCONSOLE ERRORS:')
      consoleErrors.forEach((error, index) => {
        console.log(`\n${index + 1}. Page: ${error.page}`)
        console.log(`   Type: ${error.type}`)
        console.log(`   Message: ${error.message}`)
      })
    }

    console.log('\n=================================')
    console.log('CRAWL COMPLETE')
    console.log('=================================\n')
  })
})
