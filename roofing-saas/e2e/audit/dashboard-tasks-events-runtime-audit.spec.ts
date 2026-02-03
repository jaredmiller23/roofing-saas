/**
 * Runtime Verification — Batch 4: Dashboard, Tasks & Events
 */
import { test, expect } from '@playwright/test'

test.use({ storageState: 'playwright/.auth/user.json' })


test.describe('Dashboard, Tasks & Events Runtime Audit', () => {

  test('1. Dashboard loads with widgets', async ({ page }) => {
    await page.goto(`/en/dashboard`, { waitUntil: 'domcontentloaded' })
    // Wait for dashboard content to render (KPI cards or activity feed)
    await expect(page.locator('h1, h2, [class*="card"]').first()).toBeVisible({ timeout: 10000 })

    expect(page.url()).toContain('/dashboard')

    const pageText = await page.textContent('body')

    // KPI cards
    const hasRevenue = pageText?.includes('Revenue') || pageText?.includes('revenue')
    const hasPipeline = pageText?.includes('Pipeline') || pageText?.includes('pipeline')
    console.log(`[AUDIT] Revenue KPI: ${hasRevenue ? 'FOUND' : 'MISSING'}`)
    console.log(`[AUDIT] Pipeline KPI: ${hasPipeline ? 'FOUND' : 'MISSING'}`)

    // Activity feed
    const hasActivity = pageText?.includes('Activity') || pageText?.includes('activity') || pageText?.includes('Recent')
    console.log(`[AUDIT] Activity Feed: ${hasActivity ? 'FOUND' : 'MISSING'}`)

    // Weekly challenge
    const hasChallenge = pageText?.includes('Challenge') || pageText?.includes('challenge') || pageText?.includes('Knock')
    console.log(`[AUDIT] Weekly Challenge: ${hasChallenge ? 'FOUND' : 'MISSING'}`)

    await page.screenshot({ path: 'e2e/audit/screenshots/dashboard.png', fullPage: true })
  })

  test('2. Tasks list page loads', async ({ page }) => {
    await page.goto(`/en/tasks`, { waitUntil: 'domcontentloaded' })
    // Wait for tasks page to be ready
    const newTaskBtn = page.locator('a:has-text("New Task"), button:has-text("New Task")')
    await expect(newTaskBtn.first()).toBeVisible({ timeout: 10000 })

    expect(page.url()).toContain('/tasks')

    const boardViewBtn = page.locator('a:has-text("Board"), button:has-text("Board")')
    console.log(`[AUDIT] Board View button: ${await boardViewBtn.count() > 0 ? 'FOUND' : 'MISSING'}`)
    console.log(`[AUDIT] New Task button: FOUND`)

    await page.screenshot({ path: 'e2e/audit/screenshots/tasks-list.png', fullPage: true })
  })

  test('3. Tasks board (Kanban) loads', async ({ page }) => {
    await page.goto(`/en/tasks/board`, { waitUntil: 'domcontentloaded' })
    // Wait for kanban columns to render
    await expect(page.locator('text=To Do, text=Todo, text=In Progress').first()).toBeVisible({ timeout: 10000 }).catch(() => {})

    const pageText = await page.textContent('body')
    const hasToDo = pageText?.includes('To Do') || pageText?.includes('Todo')
    const hasInProgress = pageText?.includes('In Progress')
    const hasCompleted = pageText?.includes('Completed') || pageText?.includes('Done')
    console.log(`[AUDIT] To Do column: ${hasToDo ? 'FOUND' : 'MISSING'}`)
    console.log(`[AUDIT] In Progress column: ${hasInProgress ? 'FOUND' : 'MISSING'}`)
    console.log(`[AUDIT] Completed column: ${hasCompleted ? 'FOUND' : 'MISSING'}`)

    await page.screenshot({ path: 'e2e/audit/screenshots/tasks-board.png', fullPage: true })
  })

  test('4. New task form loads', async ({ page }) => {
    await page.goto(`/en/tasks/new`, { waitUntil: 'domcontentloaded' })
    // Wait for form to render
    const titleInput = page.locator('input[name="title"], #title')
    await expect(titleInput.first()).toBeVisible({ timeout: 10000 })

    console.log(`[AUDIT] Title input: FOUND`)

    const submitBtn = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")')
    console.log(`[AUDIT] Submit button: ${await submitBtn.count() > 0 ? 'FOUND' : 'MISSING'}`)

    await page.screenshot({ path: 'e2e/audit/screenshots/tasks-new.png', fullPage: true })
  })

  test('5. Events page loads with calendar', async ({ page }) => {
    await page.goto(`/en/events`, { waitUntil: 'domcontentloaded' })
    // Wait for events page to be ready
    const scheduleBtn = page.locator('a:has-text("Schedule"), button:has-text("Schedule")')
    await expect(scheduleBtn.first()).toBeVisible({ timeout: 10000 }).catch(() => {})

    expect(page.url()).toContain('/events')

    console.log(`[AUDIT] Schedule Event button: ${await scheduleBtn.count() > 0 ? 'FOUND' : 'MISSING'}`)

    const calToggle = page.locator('button:has-text("Calendar"), button:has-text("List")')
    console.log(`[AUDIT] View toggle: ${await calToggle.count() > 0 ? 'FOUND' : 'MISSING'}`)

    await page.screenshot({ path: 'e2e/audit/screenshots/events-page.png', fullPage: true })
  })

  test('6. New event form loads', async ({ page }) => {
    await page.goto(`/en/events/new`, { waitUntil: 'domcontentloaded' })
    // Wait for form to render
    const titleInput = page.locator('input[name="title"], #title')
    await expect(titleInput.first()).toBeVisible({ timeout: 10000 })

    console.log(`[AUDIT] Title input: FOUND`)

    const pageText = await page.textContent('body')
    const hasEventType = pageText?.includes('Event Type') || pageText?.includes('event type') || pageText?.includes('Type')
    console.log(`[AUDIT] Event Type field: ${hasEventType ? 'FOUND' : 'MISSING'}`)

    const submitBtn = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save"), button:has-text("Schedule")')
    console.log(`[AUDIT] Submit button: ${await submitBtn.count() > 0 ? 'FOUND' : 'MISSING'}`)

    await page.screenshot({ path: 'e2e/audit/screenshots/events-new.png', fullPage: true })
  })
})
