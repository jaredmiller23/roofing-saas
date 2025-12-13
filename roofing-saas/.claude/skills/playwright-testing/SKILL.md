---
name: playwright-testing
description: Expert guidance on Playwright E2E testing patterns for Next.js + Supabase applications. Use when writing or debugging Playwright tests, setting up authentication, troubleshooting test failures, or implementing error handling in tests.
allowed-tools: Bash, Read, Glob, Grep
---

# Playwright E2E Testing Skill

## Purpose
Provides expert guidance on Playwright E2E testing patterns, authentication, error handling, and debugging for Next.js + Supabase applications.

## When to Use This Skill
- Writing or debugging Playwright E2E tests
- Setting up authentication for test suites
- Troubleshooting test failures
- Implementing error handling in tests

## Authentication Patterns

### StorageState Setup (Recommended)

**Pattern**: Use project dependencies with setup project

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    // Setup project - runs FIRST
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Test projects - depend on setup
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'], // Wait for setup
    },
  ],
})
```

**Critical: Wait for Navigation After Login**
```typescript
// WRONG - saves too early
await page.getByRole('button', { name: 'Sign in' }).click()
await page.context().storageState({ path: authFile })

// CORRECT - wait for final destination
await page.getByRole('button', { name: 'Sign in' }).click()
await page.waitForURL('/dashboard', { timeout: 15000 })
await page.context().storageState({ path: authFile })
```

### Common Authentication Issues

1. **Tests see login page after successful setup**
   - **Cause**: Stale auth file with expired tokens
   - **Solution**: Delete `playwright/.auth/user.json` before test runs
   - **Prevention**: Add to `.gitignore`, regenerate on each run

2. **Cookie domain mismatch**
   - **Cause**: Setup uses different URL than tests
   - **Solution**: Ensure consistent `baseURL` in config

3. **Supabase token expiration**
   - **Tokens expire**: 3600 seconds (1 hour) by default
   - **Solution**: For long test suites, re-authenticate or use longer-lived tokens

## Error Handling in Tests

### Accept Error States as Valid Outcomes

Tests should handle API failures gracefully:

```typescript
// GOOD - Accepts error/timeout as valid state
test('should load data or show error', async ({ page }) => {
  await page.goto('/dashboard')

  // Wait for potential timeout
  await page.waitForTimeout(12000) // API has 10s timeout + buffer

  // Accept multiple valid outcomes
  const hasData = await page.locator('table').isVisible().catch(() => false)
  const hasEmpty = await page.locator('text=No data').isVisible().catch(() => false)
  const hasError = await page.locator('text=/Error|timed out/i').isVisible().catch(() => false)

  expect(hasData || hasEmpty || hasError).toBeTruthy()
})
```

### Component Timeout Handling

Components should implement fetch timeouts:

```typescript
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 10000)

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

## Debugging Workflow

### 1. When Tests Fail Unexpectedly

**First: Check for Stale State**
```bash
# Delete auth file and run fresh
rm -f playwright/.auth/user.json
npx playwright test --project=chromium
```

**Second: Verify Setup Runs**
```bash
# Check if setup completed successfully
npx playwright test --project=setup
```

**Third: Run with Debug/Trace**
```bash
# Debug mode
npx playwright test --debug

# Or generate trace
npx playwright test --trace=on
npx playwright show-trace trace.zip
```

### 2. Authentication Debugging

**Verify cookies are loaded:**
```typescript
test('debug auth', async ({ page }) => {
  const cookies = await page.context().cookies()
  console.log('Cookies:', cookies.length)

  const authCookie = cookies.find(c => c.name.includes('auth-token'))
  console.log('Auth cookie:', authCookie ? 'Present' : 'Missing')
})
```

**Check localStorage:**
```typescript
const storage = await page.evaluate(() =>
  Object.keys(localStorage)
)
console.log('LocalStorage keys:', storage)
```

### 3. Test Selectors

**Prefer data-testid over CSS selectors:**
```typescript
// GOOD - Stable and semantic
await page.getByTestId('table-view-button').click()

// AVOID - Fragile, breaks with styling changes
await page.locator('.bg-gray-100.p-1.rounded-lg').nth(1).click()
```

## Test Organization

### File Naming Conventions
- `*.setup.ts` - Setup/auth files
- `*.spec.ts` - Test files
- `*.comprehensive.spec.ts` - Full feature test suites
- `error-states.spec.ts` - Error handling tests

### Test Structure
```typescript
test.describe('Feature Name', () => {
  test.describe('Sub-feature', () => {
    test('should do specific thing', async ({ page }) => {
      // Arrange
      await page.goto('/page')

      // Act
      await page.getByTestId('button').click()

      // Assert
      await expect(page.getByTestId('result')).toBeVisible()
    })
  })
})
```

## Common Patterns

### Wait for Network Idle
```typescript
await page.goto('/page')
await page.waitForLoadState('networkidle')
```

### Set Viewport Size
```typescript
// For responsive tests
await page.setViewportSize({ width: 1280, height: 720 })
```

### Clear Cookies for Unauthenticated Tests
```typescript
test('should show login page', async ({ page }) => {
  await page.context().clearCookies()
  await page.goto('/login')

  await expect(page.locator('input[type="email"]')).toBeVisible()
})
```

### Handle Async States
```typescript
// Wait with timeout for elements that may not appear
const hasElement = await page.locator('.element')
  .isVisible({ timeout: 2000 })
  .catch(() => false)
```

## Best Practices Summary

1. Use storageState with project dependencies for auth
2. Wait for navigation/elements after login before saving state
3. Delete old auth files to avoid stale state
4. Accept error/timeout states as valid test outcomes
5. Use data-testid attributes for reliable selectors
6. Implement fetch timeouts in components
7. Run with fresh state when debugging failures
8. Use debug/trace mode to investigate issues
9. Don't use manual login in individual tests (use storageState)
10. Don't rely on CSS class selectors (use semantic selectors)

## References
- [Playwright Authentication Guide](https://playwright.dev/docs/auth)
- [Project Dependencies](https://playwright.dev/docs/test-projects)
- [StorageState API](https://playwright.dev/docs/api/class-browsercontext#browser-context-storage-state)
