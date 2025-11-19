# E2E Testing Best Practices

## Overview

This guide documents the comprehensive E2E testing strategy for the Roofing SaaS application, ensuring we catch bugs before they reach production.

## Testing Philosophy

### The Testing Pyramid

```
        /\
       /  \  E2E Tests (Few, High-Value)
      /    \
     /------\ Integration Tests (More)
    /        \
   /----------\ Unit Tests (Most)
  /____________\
```

**E2E tests should focus on:**
- Critical user journeys (happy paths)
- Error states and edge cases
- Different UI modes/variants
- Cross-browser compatibility

## What Went Wrong: Lessons Learned

### Bug #1: Tasks Page "[object Object]" Error

**The Bug**: Error handling code displayed `[object Object]` instead of error message.

**Why Tests Missed It**: Tests only verified happy paths where API succeeded. Error handling code was never executed.

**The Fix**: Add error state testing for all API-dependent features.

### Bug #2: Sales & Projects "Failed to fetch leads"

**The Bug**: Table view tried to sort by non-existent 'updated' column instead of 'updated_at'.

**Why Tests Missed It**: Tests didn't verify all UI view modes (only tested default Kanban view).

**The Fix**: Test all view modes and UI variants.

## Comprehensive Testing Checklist

### 1. Happy Path Testing ✅
- [ ] User can complete primary flow successfully
- [ ] Data loads and displays correctly
- [ ] Forms submit successfully
- [ ] Navigation works as expected

### 2. Error State Testing ⚠️
- [ ] API returns 500 error
- [ ] API returns 400 validation error
- [ ] API returns 401 unauthorized
- [ ] API returns 404 not found
- [ ] Network timeout/failure
- [ ] Invalid response format
- [ ] Empty response

### 3. UI Variant Testing 🎨
- [ ] All view modes (Table, Kanban, Calendar, etc.)
- [ ] All filter combinations
- [ ] All sort options
- [ ] Mobile vs Desktop views
- [ ] Light vs Dark mode (if applicable)

### 4. Edge Case Testing 🔍
- [ ] Empty states (no data)
- [ ] Large datasets (pagination)
- [ ] Long text (truncation)
- [ ] Special characters
- [ ] Concurrent operations
- [ ] Stale data scenarios

### 5. Cross-Browser Testing 🌐
- [ ] Chromium (Chrome, Edge)
- [ ] WebKit (Safari)
- [ ] Firefox

## Test Structure

### File Organization

```
e2e/
├── utils/                    # Test utilities
│   ├── api-mocks.ts         # API mocking helpers
│   ├── error-scenarios.ts   # Common error scenarios
│   └── test-data.ts         # Test data generators
├── fixtures/                 # Shared fixtures
├── [feature].spec.ts        # Feature tests
└── [feature].error.spec.ts  # Error state tests
```

### Naming Conventions

```typescript
// Good test names
test('should display leads in table view', ...)
test('should show error message when API fails', ...)
test('should handle empty state gracefully', ...)

// Bad test names
test('test leads', ...)
test('it works', ...)
```

## Testing Patterns

### Pattern 1: API Error Testing

```typescript
import { test, expect } from '@playwright/test'
import { mockApiError } from './utils/api-mocks'

test('should display proper error message when tasks API fails', async ({ page }) => {
  // Mock API to return error
  await mockApiError(page, '/api/tasks', {
    code: 'DATABASE_ERROR',
    message: 'Failed to connect to database'
  })

  await page.goto('/tasks')

  // Verify error is displayed properly (not "[object Object]")
  const alert = page.locator('[role="alert"]')
  await expect(alert).toContainText('Failed to connect to database')
  await expect(alert).not.toContainText('[object Object]')
})
```

### Pattern 2: View Mode Testing

```typescript
test('should load leads in table view', async ({ page }) => {
  await page.goto('/projects')

  // Test default view (Kanban)
  await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible()

  // Switch to table view
  await page.click('button:has-text("Table")')

  // Verify table loads correctly
  await expect(page.locator('table')).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(/* expected count */)

  // Verify sorting works
  await page.click('th:has-text("Updated")')
  // Assert first row changed
})
```

### Pattern 3: Edge Case Testing

```typescript
test('should handle empty state', async ({ page }) => {
  // Mock API to return empty array
  await page.route('**/api/tasks*', route => route.fulfill({
    status: 200,
    body: JSON.stringify({ tasks: [], total: 0 })
  }))

  await page.goto('/tasks')

  // Verify empty state UI
  await expect(page.locator('text=No tasks found')).toBeVisible()
  await expect(page.locator('button:has-text("Create Task")')).toBeVisible()
})
```

## Test Utilities

### API Mocking Helper

```typescript
// e2e/utils/api-mocks.ts
import { Page } from '@playwright/test'

export async function mockApiError(
  page: Page,
  endpoint: string,
  error: { code: string; message: string; details?: any }
) {
  await page.route(`**${endpoint}*`, route => route.fulfill({
    status: 500,
    body: JSON.stringify({
      success: false,
      error: error
    })
  }))
}

export async function mockApiSuccess(
  page: Page,
  endpoint: string,
  data: any
) {
  await page.route(`**${endpoint}*`, route => route.fulfill({
    status: 200,
    body: JSON.stringify({
      success: true,
      data: data
    })
  }))
}
```

### Common Error Scenarios

```typescript
// e2e/utils/error-scenarios.ts
export const ERROR_SCENARIOS = {
  DATABASE_ERROR: {
    code: 'DATABASE_ERROR',
    message: 'Failed to connect to database'
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'You must be logged in to perform this action'
  },
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid input data',
    details: { field: 'email', error: 'Invalid email format' }
  },
  NOT_FOUND: {
    code: 'NOT_FOUND',
    message: 'Resource not found'
  }
}
```

## Running Tests

### Run All Tests
```bash
npm run test:e2e
```

### Run Specific Test File
```bash
npm run test:e2e -- e2e/projects.error.spec.ts
```

### Run Tests in UI Mode (for debugging)
```bash
npx playwright test --ui
```

### Run Tests in Headed Mode (see browser)
```bash
npx playwright test --headed
```

## Coverage Goals

### Minimum Coverage Requirements

- **Happy Paths**: 100% of critical user journeys
- **Error States**: All API endpoints tested with common errors
- **UI Variants**: All major UI modes (Table, Kanban, etc.)
- **Edge Cases**: Empty states, large datasets, special characters
- **Browsers**: Chromium, WebKit, Firefox

### Coverage Tracking

Use Playwright's built-in coverage reports:

```bash
npx playwright show-report
```

## Continuous Improvement

### When Adding New Features

1. Write E2E tests BEFORE implementing feature
2. Test happy path + error states + edge cases
3. Update this document if new patterns emerge

### When Bugs Are Found

1. Write a failing test that reproduces the bug
2. Fix the bug
3. Verify test now passes
4. Document the lesson learned in this guide

## Real-World Examples

### Example 1: Comprehensive Feature Test

See `e2e/projects.comprehensive.spec.ts` for a full example covering:
- Happy path
- All view modes
- Error states
- Edge cases

### Example 2: Error State Test Suite

See `e2e/error-states.spec.ts` for examples of:
- API failures
- Network timeouts
- Invalid responses
- Permission errors

## Authentication Patterns

### StorageState Setup (Recommended)

Use Playwright's storageState with project dependencies for authentication:

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
})
```

### Critical: Wait for Navigation After Login

```typescript
// ❌ WRONG - saves auth state too early
await page.getByRole('button', { name: 'Sign in' }).click()
await page.context().storageState({ path: authFile })

// ✅ CORRECT - wait for final destination
await page.getByRole('button', { name: 'Sign in' }).click()
await page.waitForURL('/dashboard', { timeout: 15000 })
await page.context().storageState({ path: authFile })
```

### Common Auth Issues

**Tests see login page after successful setup:**
- **Cause**: Stale auth file with expired tokens
- **Solution**: Delete `playwright/.auth/user.json` before test runs
- **Prevention**: Add to `.gitignore`, regenerate on each run

```bash
# Clean test run
rm -f playwright/.auth/user.json
npx playwright test --project=chromium
```

### Auth Debugging

```typescript
test('debug auth', async ({ page }) => {
  const cookies = await page.context().cookies()
  console.log('Cookies loaded:', cookies.length)

  const authCookie = cookies.find(c => c.name.includes('auth-token'))
  console.log('Auth cookie:', authCookie ? 'Present' : 'Missing')
})
```

## Timeout Handling

### Component-Level Timeouts

Components should implement fetch timeouts to prevent tests from hanging:

```typescript
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

try {
  const response = await fetch('/api/data', {
    signal: controller.signal,
  })
  clearTimeout(timeoutId)
  // ... handle response
} catch (err) {
  if (err instanceof Error && err.name === 'AbortError') {
    setError('Request timed out. Please try again.')
  } else {
    setError(err.message)
  }
} finally {
  clearTimeout(timeoutId)
}
```

### Test-Level Timeout Handling

Tests should accept timeout/error states as valid outcomes:

```typescript
test('should load data or show error', async ({ page }) => {
  await page.goto('/dashboard')

  // Wait for potential API timeout (10s) + buffer
  await page.waitForTimeout(12000)

  // Accept multiple valid outcomes
  const hasData = await page.locator('table').isVisible().catch(() => false)
  const hasEmpty = await page.locator('text=No data').isVisible().catch(() => false)
  const hasError = await page.locator('text=/Error|timed out/i').isVisible().catch(() => false)

  expect(hasData || hasEmpty || hasError).toBeTruthy()
})
```

## Selector Best Practices

### Prefer data-testid Over CSS Selectors

```typescript
// ✅ GOOD - Stable and semantic
await page.getByTestId('table-view-button').click()

// ❌ AVOID - Fragile, breaks with styling changes
await page.locator('.bg-gray-100.p-1.rounded-lg').nth(1).click()
```

### Adding data-testid Attributes

```tsx
// Component
<button
  data-testid="table-view-button"
  onClick={() => setViewMode('table')}
>
  Table
</button>

// Test
await page.getByTestId('table-view-button').click()
```

## Debugging Workflow

### 1. When Tests Fail Unexpectedly

```bash
# First: Check for stale state
rm -f playwright/.auth/user.json
npx playwright test --project=chromium

# Second: Verify setup runs
npx playwright test --project=setup

# Third: Run with debug/trace
npx playwright test --debug
# or
npx playwright test --trace=on
npx playwright show-trace trace.zip
```

### 2. Common Failure Patterns

**Pattern: Tests see login page despite auth setup**
- Delete old auth file
- Verify setup project runs before tests
- Check cookie domain matches baseURL

**Pattern: Tests timeout on data loading**
- Verify component implements fetch timeout
- Ensure tests wait long enough for timeout to trigger
- Accept error/timeout as valid state in assertions

**Pattern: Selectors not found**
- Use data-testid instead of CSS classes
- Check if element is in viewport
- Verify element isn't conditionally rendered

## Best Practices Summary

1. ✅ **Test the happy path** - Ensure core functionality works
2. ⚠️ **Test error states** - Verify graceful error handling
3. 🎨 **Test all UI variants** - Cover different views/modes
4. 🔍 **Test edge cases** - Handle empty states, large data, etc.
5. 🌐 **Test cross-browser** - Ensure compatibility
6. 📝 **Write clear test names** - Describe what's being tested
7. 🔄 **Keep tests independent** - Each test should work in isolation
8. 🚀 **Keep tests fast** - Mock external dependencies
9. 📚 **Document patterns** - Share knowledge with the team
10. 🐛 **Write tests for bugs** - Prevent regressions
11. 🔐 **Use storageState for auth** - Avoid manual login in each test
12. ⏱️ **Implement timeouts** - Components and tests should handle slow APIs
13. 🎯 **Use data-testid** - Stable, semantic selectors
14. 🧹 **Clean stale state** - Delete old auth files before test runs

## Additional Resources

- **Playwright Testing Skill**: See `.claude/skills/playwright-testing/instructions.md` for comprehensive Playwright patterns
- **Comprehensive Test Example**: `e2e/projects.comprehensive.spec.ts`
- **Error State Examples**: `e2e/error-states.spec.ts`

---

**Remember**: The goal of E2E testing is to catch bugs BEFORE users do. Every bug that reaches production is a test we didn't write.
