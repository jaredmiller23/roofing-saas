/**
 * Tasks, Events & Jobs Module - Smoke Tests
 *
 * SMOKE-012: Verify tasks, events, and job management work on production
 * These features support day-to-day operations and work coordination
 *
 * Success Criteria:
 * - Tasks list page loads
 * - Task board (kanban) loads
 * - Events page loads
 * - Event creation accessible
 * - Jobs page loads
 * - Job detail page loads
 * - Project files page loads
 */

import { test, expect } from '@playwright/test'

test.describe('Tasks, Events & Jobs Module - Smoke Tests', () => {

  test.describe('Unauthenticated Access', () => {
    // Use empty storage state to test without authentication
    test.use({ storageState: { cookies: [], origins: [] } })

    test('should redirect /tasks to login when unauthenticated', async ({ page }) => {
      await page.goto('/tasks')

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/)

      // Verify login page rendered properly
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
    })

    test('should redirect /events to login when unauthenticated', async ({ page }) => {
      await page.goto('/events')

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/)
    })

    test('should redirect /events/new to login when unauthenticated', async ({ page }) => {
      await page.goto('/events/new')

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/)
    })

    test('should redirect /jobs to login when unauthenticated', async ({ page }) => {
      await page.goto('/jobs')

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/)
    })

    test('should redirect project files page to login when unauthenticated', async ({ page }) => {
      await page.goto('/projects/test-project-id/files')

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Authenticated Tasks Access', () => {
    // Uses default authenticated storage state

    test('should load tasks list page', async ({ page }) => {
      await page.goto('/tasks')

      // Should stay on tasks page (not redirect to login)
      await expect(page).toHaveURL(/\/tasks/)

      // Should show the tasks page header
      await expect(page.getByRole('heading', { name: /Tasks/ })).toBeVisible()
    })

    test('should display task list view or empty state', async ({ page }) => {
      await page.goto('/tasks')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Tasks/ })).toBeVisible()

      // Should show either tasks list or empty state
      const hasTasks = await page.locator('[data-testid*="task"], .task-card, .task-row, tr:has(td)').count() > 0
      const hasEmptyState = await page.getByText(/No tasks|Empty|Create.*first.*task|Get started/i).isVisible()

      // Should show either tasks or proper empty state
      expect(hasTasks || hasEmptyState).toBeTruthy()
    })

    test('should display task board (kanban) view', async ({ page }) => {
      await page.goto('/tasks')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Tasks/ })).toBeVisible()

      // Look for kanban board or view switcher
      const hasKanbanView = await page.getByTestId('kanban-view').isVisible()
      const hasKanbanText = await page.getByText(/Kanban|Board|Columns/i).isVisible()
      const hasViewSwitcher = await page.getByRole('button', { name: /Board|Kanban|View/ }).isVisible()

      // Should have kanban functionality available
      expect(hasKanbanView || hasKanbanText || hasViewSwitcher).toBeTruthy()
    })

    test('should display task creation controls', async ({ page }) => {
      await page.goto('/tasks')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Tasks/ })).toBeVisible()

      // Should have create task functionality
      const createButton = page.getByRole('button', { name: /Create.*Task|New.*Task|Add.*Task/ }).or(
        page.getByRole('link', { name: /Create.*Task|New.*Task|Add.*Task/ })
      )

      await expect(createButton.first()).toBeVisible()
    })

    test('should display task status filters or categories', async ({ page }) => {
      await page.goto('/tasks')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Tasks/ })).toBeVisible()

      // Look for status filter controls
      const hasStatusTabs = await page.getByRole('tab', { name: /All|Open|In Progress|Done|Completed/ }).isVisible()
      const hasStatusFilter = await page.getByRole('combobox').filter({ hasText: /Status|Filter/ }).isVisible()
      const hasFilterButtons = await page.getByRole('button', { name: /All|Open|In Progress|Complete/ }).isVisible()

      // Should have some form of status filtering
      expect(hasStatusTabs || hasStatusFilter || hasFilterButtons).toBeTruthy()
    })

    test('should navigate task board columns if kanban view is available', async ({ page }) => {
      await page.goto('/tasks')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Tasks/ })).toBeVisible()

      // Check if kanban view is available
      const kanbanView = page.getByTestId('kanban-view')

      if (await kanbanView.isVisible()) {
        // Common task status columns
        const expectedColumns = [
          /To Do|Backlog|Open/i,
          /In Progress|Doing|Active/i,
          /Done|Complete|Completed/i
        ]

        // At least one column should be visible
        let columnFound = false
        for (const columnPattern of expectedColumns) {
          const hasColumn = await page.getByRole('heading', { name: columnPattern }).isVisible()
          if (hasColumn) {
            columnFound = true
            break
          }
        }

        expect(columnFound).toBeTruthy()
      }
    })

    test('should handle task interaction if tasks exist', async ({ page }) => {
      await page.goto('/tasks')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Tasks/ })).toBeVisible()

      // Try to find a task item to interact with
      const taskItem = page.locator('[data-testid*="task"], .task-card, .task-row, tr:has(td)').first()

      // Only test if a task exists
      if (await taskItem.count() > 0) {
        await taskItem.click()

        // Should navigate to task detail or show task info
        const hasTaskDetail = await page.getByText(/Task.*Details|Description|Due.*Date|Assignee/i).isVisible()
        const hasTaskModal = await page.locator('[role="dialog"]').isVisible()
        const isOnTaskPage = page.url().includes('/task')

        expect(hasTaskDetail || hasTaskModal || isOnTaskPage).toBeTruthy()
      }
    })
  })

  test.describe('Authenticated Events Access', () => {
    // Uses default authenticated storage state

    test('should load events page', async ({ page }) => {
      await page.goto('/events')

      // Should stay on events page (not redirect to login)
      await expect(page).toHaveURL(/\/events/)

      // Should show the events page header
      await expect(page.getByRole('heading', { name: /Events/ })).toBeVisible()
    })

    test('should display events list or calendar view', async ({ page }) => {
      await page.goto('/events')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Events/ })).toBeVisible()

      // Should show either events list, calendar, or empty state
      const hasEvents = await page.locator('[data-testid*="event"], .event-card, .event-row, tr:has(td)').count() > 0
      const hasCalendar = await page.getByText(/Calendar|Month|Week|Day/i).isVisible()
      const hasEmptyState = await page.getByText(/No events|Empty|Create.*first.*event|Get started/i).isVisible()

      // Should show either events, calendar, or proper empty state
      expect(hasEvents || hasCalendar || hasEmptyState).toBeTruthy()
    })

    test('should have event creation accessible', async ({ page }) => {
      await page.goto('/events')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Events/ })).toBeVisible()

      // Should have create event functionality
      const createButton = page.getByRole('button', { name: /Create.*Event|New.*Event|Add.*Event/ }).or(
        page.getByRole('link', { name: /Create.*Event|New.*Event|Add.*Event/ })
      )

      // Test if create button exists and is clickable
      if (await createButton.first().isVisible()) {
        await createButton.first().click()

        // Should navigate to create event form or show modal
        const isOnCreatePage = page.url().includes('/events/new')
        const hasEventForm = await page.getByText(/Create.*Event|New.*Event|Event.*Title|Event.*Name/i).isVisible()
        const hasModal = await page.locator('[role="dialog"]').isVisible()

        expect(isOnCreatePage || hasEventForm || hasModal).toBeTruthy()
      }
    })

    test('should load event creation form page', async ({ page }) => {
      await page.goto('/events/new')

      // Should stay on event creation page
      await expect(page).toHaveURL(/\/events\/new/)

      // Should show create event form
      await expect(page.getByText(/Create.*Event|New.*Event/)).toBeVisible()
    })

    test('should display event creation form fields', async ({ page }) => {
      await page.goto('/events/new')

      // Wait for form to load
      await expect(page.getByText(/Create.*Event|New.*Event/)).toBeVisible()

      // Should have essential event form fields
      const hasTitleField = await page.getByLabel(/Event.*Title|Title|Name/i).isVisible()
      const hasDateField = await page.getByLabel(/Date|Start.*Date|When/i).isVisible()
      const hasTimeField = await page.getByLabel(/Time|Start.*Time/i).isVisible()
      const hasDescriptionField = await page.getByLabel(/Description|Details/i).isVisible()

      expect(hasTitleField || hasDateField || hasTimeField || hasDescriptionField).toBeTruthy()
    })

    test('should display calendar navigation if calendar view exists', async ({ page }) => {
      await page.goto('/events')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Events/ })).toBeVisible()

      // Look for calendar navigation controls
      const hasCalendarNav = await page.getByRole('button', { name: /Previous|Next|Today/ }).isVisible()
      const hasViewSwitcher = await page.getByRole('button', { name: /Month|Week|Day|List/ }).isVisible()
      const hasDatePicker = await page.locator('input[type="date"], input[type="month"]').isVisible()

      // Calendar features should be present - at least one navigation option
      // This is a smoke test, so we verify calendar UI loads, not specific behavior
      expect(hasCalendarNav || hasViewSwitcher || hasDatePicker).toBeTruthy()
    })

    test('should handle event interaction if events exist', async ({ page }) => {
      await page.goto('/events')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Events/ })).toBeVisible()

      // Try to find an event item to interact with
      const eventItem = page.locator('[data-testid*="event"], .event-card, .event-row, tr:has(td)').first()

      // Only test if an event exists
      if (await eventItem.count() > 0) {
        await eventItem.click()

        // Should navigate to event detail or show event info
        const hasEventDetail = await page.getByText(/Event.*Details|Description|Date.*Time|Attendees/i).isVisible()
        const hasEventModal = await page.locator('[role="dialog"]').isVisible()
        const isOnEventPage = page.url().includes('/event')

        expect(hasEventDetail || hasEventModal || isOnEventPage).toBeTruthy()
      }
    })
  })

  test.describe('Authenticated Jobs Access', () => {
    // Uses default authenticated storage state

    test('should load jobs page', async ({ page }) => {
      await page.goto('/jobs')

      // Should stay on jobs page (not redirect to login)
      await expect(page).toHaveURL(/\/jobs/)

      // Should show the jobs page header
      await expect(page.getByRole('heading', { name: /Jobs/ })).toBeVisible()
    })

    test('should display jobs list or empty state', async ({ page }) => {
      await page.goto('/jobs')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Jobs/ })).toBeVisible()

      // Should show either jobs list or empty state
      const hasJobs = await page.locator('[data-testid*="job"], .job-card, .job-row, tr:has(td)').count() > 0
      const hasEmptyState = await page.getByText(/No jobs|Empty|Create.*first.*job|Get started/i).isVisible()

      // Should show either jobs or proper empty state
      expect(hasJobs || hasEmptyState).toBeTruthy()
    })

    test('should display job creation controls', async ({ page }) => {
      await page.goto('/jobs')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Jobs/ })).toBeVisible()

      // Should have create job functionality
      const createButton = page.getByRole('button', { name: /Create.*Job|New.*Job|Add.*Job/ }).or(
        page.getByRole('link', { name: /Create.*Job|New.*Job|Add.*Job/ })
      )

      // Should have create job functionality visible
      await expect(createButton.first()).toBeVisible()
    })

    test('should display job status filters or categories', async ({ page }) => {
      await page.goto('/jobs')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Jobs/ })).toBeVisible()

      // Look for status filter controls
      const hasStatusTabs = await page.getByRole('tab', { name: /All|Active|Pending|Completed|Cancelled/ }).isVisible()
      const hasStatusFilter = await page.getByRole('combobox').filter({ hasText: /Status|Filter/ }).isVisible()
      const hasFilterButtons = await page.getByRole('button', { name: /All|Active|Pending|Complete/ }).isVisible()

      // Should have some form of status filtering
      expect(hasStatusTabs || hasStatusFilter || hasFilterButtons).toBeTruthy()
    })

    test('should load job detail page when clicking job', async ({ page }) => {
      await page.goto('/jobs')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Jobs/ })).toBeVisible()

      // Try to find a job item to click
      const jobItem = page.locator('[data-testid*="job"], .job-card, .job-row, tr:has(td)').first()

      // Only test if a job exists
      if (await jobItem.count() > 0) {
        await jobItem.click()

        // Should navigate to job detail page
        const isOnJobPage = page.url().includes('/job')
        const hasJobDetail = await page.getByText(/Job.*Details|Description|Status|Client/i).isVisible()
        const hasJobModal = await page.locator('[role="dialog"]').isVisible()

        expect(isOnJobPage || hasJobDetail || hasJobModal).toBeTruthy()
      }
    })

    test('should handle job detail page functionality if accessible', async ({ page }) => {
      await page.goto('/jobs')

      // Wait for page to load
      await expect(page.getByRole('heading', { name: /Jobs/ })).toBeVisible()

      // Try to find and access a job detail
      const jobItem = page.locator('[data-testid*="job"], .job-card, .job-row, tr:has(td)').first()

      if (await jobItem.count() > 0) {
        await jobItem.click()

        // If we're on a job detail page, check for common job detail elements
        if (page.url().includes('/job')) {
          const hasJobInfo = await page.getByText(/Job.*Information|Details|Status|Timeline/i).isVisible()
          const hasJobActions = await page.getByRole('button', { name: /Edit|Update|Complete|Cancel/ }).isVisible()

          expect(hasJobInfo || hasJobActions).toBeTruthy()
        }
      }
    })
  })

  test.describe('Authenticated Project Files Access', () => {
    // Uses default authenticated storage state

    test('should access project files from projects page', async ({ page }) => {
      // Navigate to projects first to find a project
      await page.goto('/projects')
      await expect(page.getByRole('heading', { name: 'Pipeline' })).toBeVisible()

      // Try to find a project card to access
      const projectCard = page.locator('[data-testid*="project-card"]').first()

      if (await projectCard.count() > 0) {
        await projectCard.click()

        // Should navigate to project detail page
        await expect(page).toHaveURL(/\/projects\/[^\/]+/)

        // Look for files tab or files section
        const filesTab = page.getByRole('tab', { name: /Files/ })
        const filesLink = page.getByRole('link', { name: /Files/ })
        const filesButton = page.getByRole('button', { name: /Files/ })

        if (await filesTab.isVisible()) {
          await filesTab.click()
          await expect(page.getByText(/Project.*Files|Files|Documents/i)).toBeVisible()
        } else if (await filesLink.isVisible()) {
          await filesLink.click()
          await expect(page).toHaveURL(/\/files/)
        } else if (await filesButton.isVisible()) {
          await filesButton.click()
        }
      }
    })

    test('should load project files page directly if accessible', async ({ page }) => {
      // Try to access project files page directly
      // This might redirect if project doesn't exist, which is expected
      await page.goto('/projects/test-project-id/files')

      // Should either load files page or redirect appropriately
      const isOnFilesPage = page.url().includes('/files')
      const hasFilesContent = await page.getByText(/Project.*Files|Files|Documents/i).isVisible()
      const isOnProjectPage = page.url().includes('/projects')

      // Should handle gracefully - either show files or redirect to valid project page
      expect(isOnFilesPage || hasFilesContent || isOnProjectPage).toBeTruthy()
    })

    test('should display files upload or management interface', async ({ page }) => {
      // Navigate to projects first
      await page.goto('/projects')
      await expect(page.getByRole('heading', { name: 'Pipeline' })).toBeVisible()

      // Try to access files functionality through project
      const projectCard = page.locator('[data-testid*="project-card"]').first()

      if (await projectCard.count() > 0) {
        await projectCard.click()
        await expect(page).toHaveURL(/\/projects\/[^\/]+/)

        // Look for files functionality
        const filesTab = page.getByRole('tab', { name: /Files/ })

        if (await filesTab.isVisible()) {
          await filesTab.click()

          // Check for file management features
          const hasUploadButton = await page.getByRole('button', { name: /Upload|Add.*File/ }).isVisible()
          const hasFilesList = await page.locator('[data-testid*="file"], .file-row, .file-card').isVisible()
          const hasEmptyState = await page.getByText(/No files|Empty|Upload.*first.*file/i).isVisible()

          expect(hasUploadButton || hasFilesList || hasEmptyState).toBeTruthy()
        }
      }
    })

    test('should handle file management actions if files exist', async ({ page }) => {
      // Navigate through projects to access files
      await page.goto('/projects')
      await expect(page.getByRole('heading', { name: 'Pipeline' })).toBeVisible()

      const projectCard = page.locator('[data-testid*="project-card"]').first()

      if (await projectCard.count() > 0) {
        await projectCard.click()
        await expect(page).toHaveURL(/\/projects\/[^\/]+/)

        const filesTab = page.getByRole('tab', { name: /Files/ })

        if (await filesTab.isVisible()) {
          await filesTab.click()

          // Check for file actions
          const fileItem = page.locator('[data-testid*="file"], .file-row, .file-card').first()

          if (await fileItem.count() > 0) {
            // File management functionality should work
            const hasFileActions = await page.getByRole('button', { name: /Download|Delete|View/ }).isVisible()
            const hasFileLink = await page.getByRole('link', { name: /Download|View/ }).isVisible()

            expect(hasFileActions || hasFileLink).toBeTruthy()
          }
        }
      }
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully on tasks page', async ({ page }) => {
      // Set up console error listener
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      // Navigate to tasks page
      const response = await page.goto('/tasks', { waitUntil: 'networkidle' })

      // Check HTTP response is not server error
      expect(response?.status()).not.toBe(500)
      expect(response?.status()).toBeLessThan(500)

      // Page should load without critical errors
      await expect(page).toHaveURL(/\/tasks/)

      // Filter out expected/harmless errors
      const criticalErrors = errors.filter(e =>
        !e.includes('Sentry') &&
        !e.includes('Transport disabled') &&
        !e.includes('favicon') &&
        !e.includes('manifest')
      )

      expect(criticalErrors.length).toBe(0)
    })

    test('should handle network errors gracefully on events page', async ({ page }) => {
      // Set up console error listener
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      // Navigate to events page
      const response = await page.goto('/events', { waitUntil: 'networkidle' })

      // Check HTTP response is not server error
      expect(response?.status()).not.toBe(500)
      expect(response?.status()).toBeLessThan(500)

      // Page should load without critical errors
      await expect(page).toHaveURL(/\/events/)

      // Filter out expected/harmless errors
      const criticalErrors = errors.filter(e =>
        !e.includes('Sentry') &&
        !e.includes('Transport disabled') &&
        !e.includes('favicon') &&
        !e.includes('manifest')
      )

      expect(criticalErrors.length).toBe(0)
    })

    test('should handle network errors gracefully on jobs page', async ({ page }) => {
      // Set up console error listener
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      // Navigate to jobs page
      const response = await page.goto('/jobs', { waitUntil: 'networkidle' })

      // Check HTTP response is not server error
      expect(response?.status()).not.toBe(500)
      expect(response?.status()).toBeLessThan(500)

      // Page should load without critical errors
      await expect(page).toHaveURL(/\/jobs/)

      // Filter out expected/harmless errors
      const criticalErrors = errors.filter(e =>
        !e.includes('Sentry') &&
        !e.includes('Transport disabled') &&
        !e.includes('favicon') &&
        !e.includes('manifest')
      )

      expect(criticalErrors.length).toBe(0)
    })

    test('should handle invalid task URLs gracefully', async ({ page }) => {
      // Try to access a non-existent task
      await page.goto('/tasks/invalid-task-id-12345')

      // Should handle gracefully - either redirect to list or show error page
      const isOnTasksPage = page.url().includes('/tasks') && !page.url().includes('/invalid-task-id-12345')
      const hasErrorMessage = await page.getByText(/not found|error|invalid|does not exist/i).isVisible()

      // Should either redirect back to tasks or show proper error
      expect(isOnTasksPage || hasErrorMessage).toBeTruthy()
    })

    test('should handle invalid event URLs gracefully', async ({ page }) => {
      // Try to access a non-existent event
      await page.goto('/events/invalid-event-id-12345')

      // Should handle gracefully
      const isOnEventsPage = page.url().includes('/events') && !page.url().includes('/invalid-event-id-12345')
      const hasErrorMessage = await page.getByText(/not found|error|invalid|does not exist/i).isVisible()

      expect(isOnEventsPage || hasErrorMessage).toBeTruthy()
    })

    test('should handle invalid job URLs gracefully', async ({ page }) => {
      // Try to access a non-existent job
      await page.goto('/jobs/invalid-job-id-12345')

      // Should handle gracefully
      const isOnJobsPage = page.url().includes('/jobs') && !page.url().includes('/invalid-job-id-12345')
      const hasErrorMessage = await page.getByText(/not found|error|invalid|does not exist/i).isVisible()

      expect(isOnJobsPage || hasErrorMessage).toBeTruthy()
    })
  })
})
