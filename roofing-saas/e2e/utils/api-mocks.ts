/**
 * API Mocking Utilities for E2E Tests
 *
 * These utilities help create consistent API mocks for testing
 * different scenarios including success, error, and edge cases.
 */

import { Page, Route } from '@playwright/test'

/**
 * Mock an API endpoint to return an error response
 *
 * @example
 * ```typescript
 * await mockApiError(page, '/api/tasks', {
 *   code: 'DATABASE_ERROR',
 *   message: 'Failed to connect to database'
 * })
 * ```
 */
export async function mockApiError(
  page: Page,
  endpoint: string,
  error: { code: string; message: string; details?: any },
  statusCode = 500
) {
  await page.route(`**${endpoint}*`, (route: Route) => route.fulfill({
    status: statusCode,
    contentType: 'application/json',
    body: JSON.stringify({
      success: false,
      error: error
    })
  }))
}

/**
 * Mock an API endpoint to return successful response
 *
 * @example
 * ```typescript
 * await mockApiSuccess(page, '/api/tasks', { tasks: [...], total: 10 })
 * ```
 */
export async function mockApiSuccess(
  page: Page,
  endpoint: string,
  data: any,
  pagination?: { page: number; limit: number; total: number; hasMore: boolean }
) {
  await page.route(`**${endpoint}*`, (route: Route) => {
    const response: any = {
      success: true,
      data: data
    }

    if (pagination) {
      response.pagination = pagination
    }

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    })
  })
}

/**
 * Mock an API endpoint to return empty data
 *
 * @example
 * ```typescript
 * await mockApiEmpty(page, '/api/tasks', 'tasks')
 * ```
 */
export async function mockApiEmpty(
  page: Page,
  endpoint: string,
  dataKey: string = 'data'
) {
  await page.route(`**${endpoint}*`, (route: Route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      [dataKey]: [],
      total: 0,
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        hasMore: false
      }
    })
  }))
}

/**
 * Mock an API endpoint to timeout/fail
 *
 * @example
 * ```typescript
 * await mockApiTimeout(page, '/api/tasks')
 * ```
 */
export async function mockApiTimeout(
  page: Page,
  endpoint: string
) {
  await page.route(`**${endpoint}*`, (route: Route) => route.abort('timedout'))
}

/**
 * Mock an API endpoint to return unauthorized error
 *
 * @example
 * ```typescript
 * await mockApiUnauthorized(page, '/api/tasks')
 * ```
 */
export async function mockApiUnauthorized(
  page: Page,
  endpoint: string
) {
  await mockApiError(page, endpoint, {
    code: 'UNAUTHORIZED',
    message: 'You must be logged in to perform this action'
  }, 401)
}

/**
 * Mock an API endpoint to return validation error
 *
 * @example
 * ```typescript
 * await mockApiValidationError(page, '/api/tasks', {
 *   field: 'title',
 *   error: 'Title is required'
 * })
 * ```
 */
export async function mockApiValidationError(
  page: Page,
  endpoint: string,
  details: any
) {
  await mockApiError(page, endpoint, {
    code: 'VALIDATION_ERROR',
    message: 'Invalid input data',
    details: details
  }, 400)
}

/**
 * Mock API to return large dataset (for testing pagination)
 *
 * @example
 * ```typescript
 * await mockApiLargeDataset(page, '/api/contacts', 'contacts', 1000)
 * ```
 */
export async function mockApiLargeDataset(
  page: Page,
  endpoint: string,
  dataKey: string,
  totalItems: number,
  pageSize: number = 50
) {
  await page.route(`**${endpoint}*`, (route: Route) => {
    const url = new URL(route.request().url())
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || String(pageSize))

    // Generate mock items for this page
    const startIndex = (page - 1) * limit
    const endIndex = Math.min(startIndex + limit, totalItems)
    const items = Array.from({ length: endIndex - startIndex }, (_, i) => ({
      id: `item-${startIndex + i + 1}`,
      name: `Item ${startIndex + i + 1}`,
      created_at: new Date().toISOString()
    }))

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        [dataKey]: items,
        total: totalItems,
        pagination: {
          page,
          limit,
          total: totalItems,
          hasMore: endIndex < totalItems
        }
      })
    })
  })
}

/**
 * Mock contacts API with custom data
 */
export async function mockContactsApi(
  page: Page,
  contacts: any[] = []
) {
  await mockApiSuccess(page, '/api/contacts', {
    contacts,
    total: contacts.length
  }, {
    page: 1,
    limit: 50,
    total: contacts.length,
    hasMore: false
  })
}

/**
 * Mock tasks API with custom data
 */
export async function mockTasksApi(
  page: Page,
  tasks: any[] = []
) {
  await mockApiSuccess(page, '/api/tasks', {
    tasks,
    total: tasks.length
  })
}

/**
 * Clear all route mocks
 */
export async function clearApiMocks(page: Page) {
  await page.unroute('**/*')
}
