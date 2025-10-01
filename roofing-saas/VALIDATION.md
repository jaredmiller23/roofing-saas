# Validation Process

This document outlines the validation process for features in the Roofing SaaS project.

## Why We Need This

**The Problem:**
- `npm run build` catches TypeScript errors, but not runtime errors
- Client-side React errors only appear when the browser hydrates components
- Missing `'use client'` directives won't be caught by TypeScript
- Drag-and-drop, animations, and interactive features need browser testing

**The Solution:**
Playwright E2E tests provide automated browser testing to catch runtime issues before deployment.

## Validation Levels

### Level 1: TypeScript & Linting (Automated)
```bash
npm run lint      # ESLint checks
npm run build     # TypeScript compilation
```

**What it catches:**
- Type errors
- Import issues
- Syntax errors
- Unused variables

**What it misses:**
- Runtime errors
- Client-side hydration issues
- Interactive feature bugs
- Missing 'use client' directives

### Level 2: E2E Testing (Playwright)
```bash
npm run dev           # Start dev server first
npm run test:e2e      # Run all E2E tests
npm run test:e2e:ui   # Run tests in UI mode (visual debugging)
```

**What it catches:**
- 500 Internal Server Errors
- Client-side JavaScript errors
- Component rendering issues
- Navigation and routing problems
- Interactive feature bugs

**What it misses:**
- Complex user interactions (needs manual testing)
- Edge cases not covered by tests
- Visual regression bugs

### Level 3: Manual Browser Testing
**What it catches:**
- Visual issues
- UX problems
- Complex interaction bugs
- Cross-browser compatibility issues

## New Feature Checklist

When implementing a new feature:

1. [ ] Write the code
2. [ ] Run `npm run build` - verify TypeScript compilation
3. [ ] Write E2E test in `/e2e/` directory
4. [ ] Run `npm run test:e2e` - verify tests pass
5. [ ] Mark feature as **"Ready for manual testing"** (not "validated")
6. [ ] Ask user to test in browser
7. [ ] Only mark as "validated" after user confirms it works

## Writing E2E Tests

### Test Structure
```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/feature-page')

    // Assertions
    await expect(page).toHaveURL(/feature-page/)
    await expect(page.locator('h1')).toHaveText('Expected Title')
  })
})
```

### Smoke Tests
Every page should have a smoke test to catch 500 errors:

```typescript
test('should not show 500 Internal Server Error', async ({ page }) => {
  await page.goto('/page')

  const title = await page.title()
  expect(title).not.toMatch(/error|500|internal server error/i)
})
```

### Authentication Tests
For protected pages, create auth helper:
```typescript
// e2e/auth.helper.ts
export async function login(page) {
  // Implementation depends on auth strategy
}
```

## Test Organization

```
/e2e/
  ├── pipeline.spec.ts       # Pipeline kanban tests
  ├── contacts.spec.ts       # Contact CRUD tests
  ├── auth.spec.ts          # Authentication tests
  └── helpers/
      ├── auth.helper.ts    # Auth utilities
      └── test-data.ts      # Test data factories
```

## CI/CD Integration

In the future, add to GitHub Actions:
```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e
```

## Best Practices

### DO:
- Write smoke tests for every page
- Test critical user flows
- Use Page Object Model for complex pages
- Keep tests independent (no shared state)
- Use descriptive test names

### DON'T:
- Skip tests because they're "simple"
- Test implementation details
- Use hard-coded delays (use waitFor instead)
- Commit failing tests
- Trust only build passing as "validation"

## Common Issues & Solutions

### Issue: "Port 3000 is in use"
**Solution:** Dev server already running. Just run `npm run test:e2e`

### Issue: "Target closed" or "Navigation timeout"
**Solution:** Dev server not running. Start with `npm run dev` first

### Issue: Tests pass but user reports error
**Solution:** Test might be too shallow. Add more assertions or test different scenarios

## Lessons Learned (October 1, 2025)

### Case Study: Pipeline Page 500 Error

**What Happened:**
- Pipeline page returned 500 Internal Server Error
- Build passed without issues
- Initial Playwright tests passed but missed the bug

**Root Cause:**
Multiple dev servers running simultaneously corrupted `.next/` build cache, causing missing chunk files.

**Why Tests Failed to Catch It:**

**❌ Bad Test (gave false confidence):**
```typescript
test('should not show 500', async ({ page }) => {
  await page.goto('/pipeline')
  const title = await page.title()
  expect(title).not.toMatch(/500/)  // PASSED but page was broken!
})
```

**Problem:** Test didn't wait for full page load or check HTTP status. Page redirected to `/login` (which was also broken) before error fully rendered.

**✅ Good Test (catches real issues):**
```typescript
test('should not show 500', async ({ page }) => {
  const response = await page.goto('/pipeline', { waitUntil: 'networkidle' })

  // Check HTTP status code
  expect(response?.status()).toBe(200)

  // Wait for full render
  await page.waitForLoadState('domcontentloaded')

  // Verify actual content rendered
  await expect(page.locator('input[type="email"]')).toBeVisible()

  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') throw new Error(msg.text())
  })
})
```

**The Fix:**
1. Kill all dev servers
2. Clean build cache: `rm -rf .next`
3. Start single clean server: `npm run dev`

### Critical Testing Rules

1. **Always check HTTP status codes** - Don't just check page content
2. **Wait for full renders** - Use `waitUntil: 'networkidle'`
3. **Verify visible elements** - Check that content actually rendered
4. **Listen for console errors** - Catch JavaScript runtime errors
5. **One dev server only** - Multiple servers corrupt build cache

## Key Takeaway

**Build passing ≠ Feature validated**

**Tests passing ≠ Feature works**

Always run E2E tests WITH proper assertions before claiming a feature is ready:
- ✅ "Build passes, ready for E2E testing"
- ✅ "E2E tests written with HTTP status checks"
- ✅ "Tests pass, ready for manual testing"
- ❌ "Feature validated" (only after user confirms it works)
