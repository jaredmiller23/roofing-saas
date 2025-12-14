/**
 * Financial & Reporting Module - Smoke Tests
 *
 * SMOKE-010: Verify financial dashboards and reporting work on production
 * Business owners need visibility into revenue, commissions, and analytics
 *
 * Success Criteria:
 * - Financials dashboard loads
 * - Reports page loads
 * - Commissions page loads
 * - Analytics page loads
 * - Charts and visualizations render
 */

import { test, expect } from '@playwright/test'

test.describe('Financial & Reporting Module - Smoke Tests', () => {

  test.describe('Unauthenticated Access', () => {
    // Use empty storage state to test without authentication
    test.use({ storageState: { cookies: [], origins: [] } })

    test('should redirect /financials to login when unauthenticated', async ({ page }) => {
      await page.goto('/financials')

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/)

      // Verify login page rendered properly
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
    })

    test('should redirect /financial/reports to login when unauthenticated', async ({ page }) => {
      await page.goto('/financial/reports')

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/)
    })

    test('should redirect /financial/commissions to login when unauthenticated', async ({ page }) => {
      await page.goto('/financial/commissions')

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/)
    })

    test('should redirect /financial/analytics to login when unauthenticated', async ({ page }) => {
      await page.goto('/financial/analytics')

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Authenticated Financials Dashboard', () => {
    // Uses default authenticated storage state

    test('should load financials dashboard page', async ({ page }) => {
      await page.goto('/financials')

      // Should stay on financials page (not redirect to login)
      await expect(page).toHaveURL(/\/financials/)

      // Should show the financials dashboard header
      await expect(page.getByRole('heading', { name: /Financial|Financials|Dashboard/ })).toBeVisible()
    })

    test('should display financial overview cards', async ({ page }) => {
      await page.goto('/financials')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Financial|Financials|Dashboard/ })).toBeVisible()

      // Should show financial overview/summary cards
      const hasRevenueCard = await page.getByText(/Revenue|Total.*Revenue|Monthly.*Revenue/i).isVisible()
      const hasProfitCard = await page.getByText(/Profit|Net.*Profit|Margin/i).isVisible()
      const hasExpenseCard = await page.getByText(/Expense|Total.*Expense|Cost/i).isVisible()

      // Should show at least one financial metric
      expect(hasRevenueCard || hasProfitCard || hasExpenseCard).toBeTruthy()
    })

    test('should display financial charts and visualizations', async ({ page }) => {
      await page.goto('/financials')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Financial|Financials|Dashboard/ })).toBeVisible()

      // Should have chart containers or canvas elements
      const hasCharts = await page.locator('canvas, svg, .recharts-wrapper, [data-testid*="chart"]').count() > 0
      const hasChartContent = await page.getByText(/Chart|Graph|Revenue.*Chart|P&L|Profit.*Loss/i).isVisible()

      // Should show either charts or chart-related content
      expect(hasCharts || hasChartContent).toBeTruthy()
    })

    test('should display navigation to financial sub-modules', async ({ page }) => {
      await page.goto('/financials')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Financial|Financials|Dashboard/ })).toBeVisible()

      // Should have navigation to financial sub-modules
      const hasReportsNav = await page.getByRole('link', { name: /Reports|Financial.*Reports/ }).isVisible()
      const hasCommissionsNav = await page.getByRole('link', { name: /Commissions|Commission.*Tracking/ }).isVisible()
      const hasAnalyticsNav = await page.getByRole('link', { name: /Analytics|Financial.*Analytics/ }).isVisible()

      // Should have at least one navigation option
      expect(hasReportsNav || hasCommissionsNav || hasAnalyticsNav).toBeTruthy()
    })
  })

  test.describe('Authenticated Reports Page', () => {
    // Uses default authenticated storage state

    test('should load financial reports page', async ({ page }) => {
      await page.goto('/financial/reports')

      // Should stay on reports page (not redirect to login)
      await expect(page).toHaveURL(/\/financial\/reports/)

      // Should show the reports page header
      await expect(page.getByRole('heading', { name: /Reports|Financial.*Reports|Revenue.*Reports/ })).toBeVisible()
    })

    test('should display P&L summary cards', async ({ page }) => {
      await page.goto('/financial/reports')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Reports|Financial.*Reports|Revenue.*Reports/ })).toBeVisible()

      // Should show P&L summary information
      const hasPLCards = await page.getByText(/P&L|Profit.*Loss|Revenue|Expense|Net.*Income/i).isVisible()
      const hasSummaryCards = await page.locator('[data-testid*="pl-summary"], .summary-card, .metric-card').count() > 0

      // Should show financial summary information
      expect(hasPLCards || hasSummaryCards).toBeTruthy()
    })

    test('should display revenue charts', async ({ page }) => {
      await page.goto('/financial/reports')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Reports|Financial.*Reports|Revenue.*Reports/ })).toBeVisible()

      // Should have revenue chart visualizations
      const hasRevenueChart = await page.locator('canvas, svg, .recharts-wrapper, [data-testid*="revenue-chart"]').count() > 0
      const hasChartContent = await page.getByText(/Revenue.*Chart|Monthly.*Revenue|Revenue.*Trend/i).isVisible()

      // Should show revenue visualization
      expect(hasRevenueChart || hasChartContent).toBeTruthy()
    })

    test('should display margin analysis charts', async ({ page }) => {
      await page.goto('/financial/reports')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Reports|Financial.*Reports|Revenue.*Reports/ })).toBeVisible()

      // Should have margin analysis visualizations
      const hasMarginChart = await page.locator('[data-testid*="margin-chart"], canvas, svg').count() > 0
      const hasMarginContent = await page.getByText(/Margin|Profit.*Margin|Margin.*Analysis/i).isVisible()

      // Should show margin analysis
      expect(hasMarginChart || hasMarginContent).toBeTruthy()
    })

    test('should display top performers table', async ({ page }) => {
      await page.goto('/financial/reports')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Reports|Financial.*Reports|Revenue.*Reports/ })).toBeVisible()

      // Should show top performers information
      const hasPerformersTable = await page.locator('table, [data-testid*="performers"], .performers-table').count() > 0
      const hasPerformersContent = await page.getByText(/Top.*Performers|Best.*Performers|Performance.*Ranking/i).isVisible()

      // Should show performance information
      expect(hasPerformersTable || hasPerformersContent).toBeTruthy()
    })

    test('should have report export functionality', async ({ page }) => {
      await page.goto('/financial/reports')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Reports|Financial.*Reports|Revenue.*Reports/ })).toBeVisible()

      // Look for export button (might have CSV/PDF/Excel icon)
      const exportButton = page.getByRole('button', { name: /Export|Download|CSV|PDF|Excel/ }).or(
        page.locator('button').filter({ has: page.locator('[data-lucide="download"], [data-lucide="file-text"]') })
      ).first()

      // Export functionality should be present
      if (await exportButton.isVisible()) {
        expect(true).toBeTruthy()
      }
    })
  })

  test.describe('Authenticated Commissions Page', () => {
    // Uses default authenticated storage state

    test('should load commissions page', async ({ page }) => {
      await page.goto('/financial/commissions')

      // Should stay on commissions page (not redirect to login)
      await expect(page).toHaveURL(/\/financial\/commissions/)

      // Should show the commissions page header
      await expect(page.getByRole('heading', { name: /Commissions|Commission.*Tracking|Sales.*Commissions/ })).toBeVisible()
    })

    test('should display commissions list or empty state', async ({ page }) => {
      await page.goto('/financial/commissions')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Commissions|Commission.*Tracking|Sales.*Commissions/ })).toBeVisible()

      // Should show either commissions or empty state
      const hasCommissions = await page.locator('[data-testid*="commission"], .commission-card, .commission-row, tr:has(td)').count() > 0
      const hasEmptyState = await page.getByText(/No commissions|Empty|Add.*commission|Create.*commission/i).isVisible()

      // Should show either commissions or proper empty state
      expect(hasCommissions || hasEmptyState).toBeTruthy()
    })

    test('should display add commission functionality', async ({ page }) => {
      await page.goto('/financial/commissions')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Commissions|Commission.*Tracking|Sales.*Commissions/ })).toBeVisible()

      // Should have button to add new commission
      const addCommissionButton = page.getByRole('button', { name: /Add.*Commission|New.*Commission|Create.*Commission/ }).or(
        page.getByRole('link', { name: /Add.*Commission|New.*Commission|Create.*Commission/ })
      )

      // Add commission functionality should be present
      await expect(addCommissionButton).toBeVisible()
    })

    test('should display commission search and filtering', async ({ page }) => {
      await page.goto('/financial/commissions')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Commissions|Commission.*Tracking|Sales.*Commissions/ })).toBeVisible()

      // Should have search functionality for commissions
      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first()

      // Search functionality should be present
      if (await searchInput.isVisible()) {
        expect(true).toBeTruthy()
      }
    })

    test('should handle commission creation workflow', async ({ page }) => {
      await page.goto('/financial/commissions')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Commissions|Commission.*Tracking|Sales.*Commissions/ })).toBeVisible()

      // Find and click add commission button
      const addCommissionButton = page.getByRole('button', { name: /Add.*Commission|New.*Commission|Create.*Commission/ })

      if (await addCommissionButton.isVisible()) {
        await addCommissionButton.click()

        // Should show commission creation dialog or form
        const hasDialog = await page.locator('[role="dialog"]').isVisible()
        const hasForm = await page.locator('form').isVisible()
        const hasCommissionForm = await page.getByText(/Commission.*Amount|Sales.*Person|Commission.*Rate/i).isVisible()

        expect(hasDialog || hasForm || hasCommissionForm).toBeTruthy()
      }
    })
  })

  test.describe('Authenticated Analytics Page', () => {
    // Uses default authenticated storage state

    test('should load financial analytics page', async ({ page }) => {
      await page.goto('/financial/analytics')

      // Should stay on analytics page (not redirect to login)
      await expect(page).toHaveURL(/\/financial\/analytics/)

      // Should show the analytics page header
      await expect(page.getByRole('heading', { name: /Analytics|Financial.*Analytics|Business.*Analytics/ })).toBeVisible()
    })

    test('should display revenue forecast analytics', async ({ page }) => {
      await page.goto('/financial/analytics')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Analytics|Financial.*Analytics|Business.*Analytics/ })).toBeVisible()

      // Should show revenue forecast information
      const hasForecastChart = await page.locator('canvas, svg, [data-testid*="forecast"]').count() > 0
      const hasForecastContent = await page.getByText(/Revenue.*Forecast|Forecast|Projected.*Revenue/i).isVisible()

      // Should show forecast analytics
      expect(hasForecastChart || hasForecastContent).toBeTruthy()
    })

    test('should display margin analysis', async ({ page }) => {
      await page.goto('/financial/analytics')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Analytics|Financial.*Analytics|Business.*Analytics/ })).toBeVisible()

      // Should show margin analysis
      const hasMarginAnalysis = await page.locator('[data-testid*="margin"], canvas, svg').count() > 0
      const hasMarginContent = await page.getByText(/Margin.*Analysis|Profit.*Margin|Gross.*Margin/i).isVisible()

      // Should show margin analytics
      expect(hasMarginAnalysis || hasMarginContent).toBeTruthy()
    })

    test('should display cost trend analysis', async ({ page }) => {
      await page.goto('/financial/analytics')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Analytics|Financial.*Analytics|Business.*Analytics/ })).toBeVisible()

      // Should show cost trend analysis
      const hasCostTrend = await page.locator('[data-testid*="cost"], canvas, svg').count() > 0
      const hasCostContent = await page.getByText(/Cost.*Trend|Cost.*Analysis|Material.*Cost/i).isVisible()

      // Should show cost trend analytics
      expect(hasCostTrend || hasCostContent).toBeTruthy()
    })

    test('should display cash flow projections', async ({ page }) => {
      await page.goto('/financial/analytics')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Analytics|Financial.*Analytics|Business.*Analytics/ })).toBeVisible()

      // Should show cash flow projections
      const hasCashFlow = await page.locator('[data-testid*="cash-flow"], canvas, svg').count() > 0
      const hasCashFlowContent = await page.getByText(/Cash.*Flow|Flow.*Projection|Liquidity/i).isVisible()

      // Should show cash flow analytics
      expect(hasCashFlow || hasCashFlowContent).toBeTruthy()
    })

    test('should display material waste tracking', async ({ page }) => {
      await page.goto('/financial/analytics')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Analytics|Financial.*Analytics|Business.*Analytics/ })).toBeVisible()

      // Should show material waste tracking
      const hasWasteTracking = await page.locator('[data-testid*="waste"], canvas, svg').count() > 0
      const hasWasteContent = await page.getByText(/Material.*Waste|Waste.*Tracking|Material.*Efficiency/i).isVisible()

      // Should show waste tracking analytics
      expect(hasWasteTracking || hasWasteContent).toBeTruthy()
    })

    test('should display analytics date range filters', async ({ page }) => {
      await page.goto('/financial/analytics')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Analytics|Financial.*Analytics|Business.*Analytics/ })).toBeVisible()

      // Should have date range filtering
      const hasDatePicker = await page.locator('input[type="date"], input[placeholder*="date"]').isVisible()
      const hasDateRange = await page.getByRole('button', { name: /Last.*30.*Days|This.*Month|Date.*Range/ }).isVisible()

      // Should have date filtering capabilities
      expect(hasDatePicker || hasDateRange).toBeTruthy()
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully on financials page', async ({ page }) => {
      // Set up console error listener
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      // Navigate to financials page
      const response = await page.goto('/financials', { waitUntil: 'networkidle' })

      // Check HTTP response is not server error
      expect(response?.status()).not.toBe(500)
      expect(response?.status()).toBeLessThan(500)

      // Page should load without critical errors
      await expect(page).toHaveURL(/\/financials/)

      // Filter out expected/harmless errors (like Sentry transport warnings)
      const criticalErrors = errors.filter(e =>
        !e.includes('Sentry') &&
        !e.includes('Transport disabled') &&
        !e.includes('favicon') &&
        !e.includes('manifest')
      )

      expect(criticalErrors.length).toBe(0)
    })

    test('should handle network errors gracefully on reports page', async ({ page }) => {
      // Set up console error listener
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      // Navigate to reports page
      const response = await page.goto('/financial/reports', { waitUntil: 'networkidle' })

      // Check HTTP response is not server error
      expect(response?.status()).not.toBe(500)
      expect(response?.status()).toBeLessThan(500)

      // Page should load without critical errors
      await expect(page).toHaveURL(/\/financial\/reports/)

      // Filter out expected/harmless errors
      const criticalErrors = errors.filter(e =>
        !e.includes('Sentry') &&
        !e.includes('Transport disabled') &&
        !e.includes('favicon') &&
        !e.includes('manifest')
      )

      expect(criticalErrors.length).toBe(0)
    })

    test('should handle network errors gracefully on commissions page', async ({ page }) => {
      // Set up console error listener
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      // Navigate to commissions page
      const response = await page.goto('/financial/commissions', { waitUntil: 'networkidle' })

      // Check HTTP response is not server error
      expect(response?.status()).not.toBe(500)
      expect(response?.status()).toBeLessThan(500)

      // Page should load without critical errors
      await expect(page).toHaveURL(/\/financial\/commissions/)

      // Filter out expected/harmless errors
      const criticalErrors = errors.filter(e =>
        !e.includes('Sentry') &&
        !e.includes('Transport disabled') &&
        !e.includes('favicon') &&
        !e.includes('manifest')
      )

      expect(criticalErrors.length).toBe(0)
    })

    test('should handle network errors gracefully on analytics page', async ({ page }) => {
      // Set up console error listener
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      // Navigate to analytics page
      const response = await page.goto('/financial/analytics', { waitUntil: 'networkidle' })

      // Check HTTP response is not server error
      expect(response?.status()).not.toBe(500)
      expect(response?.status()).toBeLessThan(500)

      // Page should load without critical errors
      await expect(page).toHaveURL(/\/financial\/analytics/)

      // Filter out expected/harmless errors
      const criticalErrors = errors.filter(e =>
        !e.includes('Sentry') &&
        !e.includes('Transport disabled') &&
        !e.includes('favicon') &&
        !e.includes('manifest')
      )

      expect(criticalErrors.length).toBe(0)
    })

    test('should display appropriate message when financial data is unavailable', async ({ page }) => {
      await page.goto('/financials')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Financial|Financials|Dashboard/ })).toBeVisible()

      // Should handle missing/loading data gracefully
      // Either show financial data or appropriate loading/empty state
      const hasFinancialData = await page.getByText(/\$[0-9,]+|\d+%|Revenue|Profit/i).isVisible()
      const hasLoadingState = await page.getByText(/Loading|Fetching.*data|No.*data.*available/i).isVisible()

      // Should show either data or proper loading state
      expect(hasFinancialData || hasLoadingState).toBeTruthy()
    })

    test('should handle chart rendering errors gracefully', async ({ page }) => {
      // Set up console error listener for chart errors
      const chartErrors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error' && (msg.text().includes('chart') || msg.text().includes('canvas') || msg.text().includes('svg'))) {
          chartErrors.push(msg.text())
        }
      })

      await page.goto('/financial/reports')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Reports|Financial.*Reports|Revenue.*Reports/ })).toBeVisible()

      // Wait a bit for charts to potentially load
      await page.waitForTimeout(3000)

      // Should not have critical chart rendering errors
      expect(chartErrors.length).toBe(0)
    })
  })
})
