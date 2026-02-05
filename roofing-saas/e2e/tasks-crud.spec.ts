/**
 * Task CRUD E2E Tests
 *
 * Tests for Task Create, Read, Edit, Status Transition, and Delete.
 * Uses authenticated session from playwright setup.
 */

import { test, expect } from '@playwright/test'

test.describe('Task CRUD Operations', () => {
  test.use({ storageState: 'playwright/.auth/user.json' })

  test.describe('Task List Page', () => {
    test('should load tasks page with create button', async ({ page }) => {
      await page.goto('/tasks')

      // Page heading
      await expect(page.locator('h1').filter({ hasText: 'Tasks' })).toBeVisible({ timeout: 10000 })

      // New Task button should exist
      const newTaskBtn = page.getByRole('link', { name: /New Task/ })
      await expect(newTaskBtn).toBeVisible({ timeout: 5000 })
    })

    test('should have board view toggle', async ({ page }) => {
      await page.goto('/tasks')
      await expect(page.locator('h1').filter({ hasText: 'Tasks' })).toBeVisible({ timeout: 10000 })

      const boardBtn = page.getByRole('link', { name: /Board/ })
      await expect(boardBtn).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Task Creation', () => {
    test('should navigate to new task form', async ({ page }) => {
      await page.goto('/tasks')
      await expect(page.locator('h1').filter({ hasText: 'Tasks' })).toBeVisible({ timeout: 10000 })

      await page.getByRole('link', { name: /New Task/ }).click()

      await expect(page).toHaveURL(/\/tasks\/new/)
      await expect(page.locator('h1').filter({ hasText: 'New Task' })).toBeVisible({ timeout: 10000 })
    })

    test('should display task form with all sections', async ({ page }) => {
      await page.goto('/tasks/new')
      await expect(page.locator('h1').filter({ hasText: 'New Task' })).toBeVisible({ timeout: 10000 })

      // Basic Information section
      await expect(page.locator('h2').filter({ hasText: 'Basic Information' })).toBeVisible()
      await expect(page.locator('input[name="title"]')).toBeVisible()

      // Dates & Time section
      await expect(page.locator('h2').filter({ hasText: 'Dates & Time' })).toBeVisible()

      // Assignments section
      await expect(page.locator('h2').filter({ hasText: 'Assignments' })).toBeVisible()

      // Tags & Reminders section
      await expect(page.locator('h2').filter({ hasText: 'Tags & Reminders' })).toBeVisible()

      // Submit button
      await expect(page.getByRole('button', { name: 'Create Task' })).toBeVisible()
    })

    test('should show validation error for empty title', async ({ page }) => {
      await page.goto('/tasks/new')
      await expect(page.locator('h1').filter({ hasText: 'New Task' })).toBeVisible({ timeout: 10000 })

      // Submit without filling title
      await page.getByRole('button', { name: 'Create Task' }).click()

      // Should stay on form
      await expect(page).toHaveURL(/\/tasks\/new/)

      // Should show validation error
      const errorMsg = page.locator('p.text-red-500')
      await expect(errorMsg.first()).toBeVisible({ timeout: 5000 })
    })

    test('should create task with required fields', async ({ page }) => {
      const taskTitle = `E2E Task ${Date.now()}`

      await page.goto('/tasks/new')
      await expect(page.locator('h1').filter({ hasText: 'New Task' })).toBeVisible({ timeout: 10000 })

      // Fill required fields
      await page.locator('input[name="title"]').fill(taskTitle)
      await page.locator('textarea[name="description"]').fill('Created by E2E test')
      await page.locator('select[name="priority"]').selectOption('high')

      // Submit
      await page.getByRole('button', { name: 'Create Task' }).click()

      // Should redirect to tasks list
      await page.waitForURL(/\/tasks$/, { timeout: 15000 })

      // Task should appear in list
      await expect(page.locator(`text=${taskTitle}`).first()).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Task Edit', () => {
    test('should edit an existing task', async ({ page }) => {
      // First create a task
      const originalTitle = `Edit Me ${Date.now()}`
      const updatedTitle = `Updated ${Date.now()}`

      await page.goto('/tasks/new')
      await expect(page.locator('input[name="title"]')).toBeVisible({ timeout: 10000 })
      await page.locator('input[name="title"]').fill(originalTitle)
      await page.getByRole('button', { name: 'Create Task' }).click()
      await page.waitForURL(/\/tasks$/, { timeout: 15000 })

      // Find and click Edit on the created task
      const taskCard = page.locator(`text=${originalTitle}`).first()
      await expect(taskCard).toBeVisible({ timeout: 10000 })

      // Navigate to task detail first
      await taskCard.click()
      await page.waitForURL(/\/tasks\/[a-f0-9-]+/, { timeout: 10000 })

      // Click Edit button
      await page.getByRole('link', { name: /Edit/ }).click()
      await page.waitForURL(/\/tasks\/[a-f0-9-]+\/edit/, { timeout: 10000 })

      // Update title
      const titleInput = page.locator('input[name="title"]')
      await expect(titleInput).toBeVisible({ timeout: 10000 })
      await titleInput.clear()
      await titleInput.fill(updatedTitle)

      // Save
      await page.getByRole('button', { name: 'Update Task' }).click()
      await page.waitForURL(/\/tasks$/, { timeout: 15000 })

      // Verify updated title appears
      await expect(page.locator(`text=${updatedTitle}`).first()).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Task Status Transition', () => {
    test('should change task status via edit form', async ({ page }) => {
      // Create a task in todo status
      const taskTitle = `Status Test ${Date.now()}`

      await page.goto('/tasks/new')
      await expect(page.locator('input[name="title"]')).toBeVisible({ timeout: 10000 })
      await page.locator('input[name="title"]').fill(taskTitle)
      await page.locator('select[name="status"]').selectOption('todo')
      await page.getByRole('button', { name: 'Create Task' }).click()
      await page.waitForURL(/\/tasks$/, { timeout: 15000 })

      // Navigate to task detail
      await page.locator(`text=${taskTitle}`).first().click()
      await page.waitForURL(/\/tasks\/[a-f0-9-]+/, { timeout: 10000 })

      // Go to edit
      await page.getByRole('link', { name: /Edit/ }).click()
      await page.waitForURL(/\/tasks\/[a-f0-9-]+\/edit/, { timeout: 10000 })

      // Change status to in_progress
      await page.locator('select[name="status"]').selectOption('in_progress')
      await page.getByRole('button', { name: 'Update Task' }).click()
      await page.waitForURL(/\/tasks$/, { timeout: 15000 })

      // Navigate back to task to verify
      await page.locator(`text=${taskTitle}`).first().click()
      await page.waitForURL(/\/tasks\/[a-f0-9-]+/, { timeout: 10000 })

      // Should show In Progress status
      await expect(page.locator('text=In Progress').first()).toBeVisible({ timeout: 5000 })
    })
  })
})
