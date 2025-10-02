# E2E Tests

End-to-end tests for the Roofing SaaS application using Playwright.

## Test Suites

### 1. Offline Workflow Tests (`offline-workflow.spec.ts`)

Tests the PWA offline functionality including:
- Service Worker registration and lifecycle
- Offline photo capture and queueing (IndexedDB + Dexie)
- Background Sync API integration
- Automatic upload when network returns
- Queue status UI and real-time updates
- Failed upload retry logic
- Geolocation capture
- Image compression
- Camera photo capture
- Offline fallback pages
- PWA installation and manifest

### 2. Pipeline Tests (`pipeline.spec.ts`)

Tests contact pipeline functionality.

## Setup

### Prerequisites

1. **Test User**: Create a test user in your Supabase database
2. **Environment Variables**: Set up test credentials

```bash
export TEST_USER_EMAIL="test@example.com"
export TEST_USER_PASSWORD="testpassword123"
```

Or create a `.env.test` file:

```
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123
```

### Install Dependencies

```bash
npm install
npx playwright install chromium
```

## Running Tests

### Run All Tests

```bash
npm run test:e2e
```

### Run Specific Test Suite

```bash
npx playwright test offline-workflow
npx playwright test pipeline
```

### Run in UI Mode (Interactive)

```bash
npx playwright test --ui
```

### Run in Debug Mode

```bash
npx playwright test --debug
```

### Run Headed (See Browser)

```bash
npx playwright test --headed
```

### Run Specific Test

```bash
npx playwright test -g "should queue photo when offline"
```

## Test Structure

```
e2e/
├── offline-workflow.spec.ts   # Offline PWA tests
├── pipeline.spec.ts           # Pipeline workflow tests
├── utils/
│   └── test-helpers.ts        # Shared test utilities
├── fixtures/
│   └── test-images.ts         # Test image generators
└── README.md                  # This file
```

## Test Utilities

### `test-helpers.ts`

Provides helper functions:
- `goOffline(page)` - Simulate offline mode
- `goOnline(page)` - Restore online mode
- `waitForServiceWorker(page)` - Wait for SW registration
- `clearIndexedDB(page, dbName)` - Clear offline database
- `getIndexedDBData(page, dbName, storeName)` - Read queue data
- `mockGeolocation(page, lat, lng)` - Mock device location
- `uploadTestImage(page, selector, path)` - Upload test files
- `login(page, email, password)` - Authenticate test user
- `getQueueStatus(page)` - Read queue counts from UI

### `test-images.ts`

Provides test image generators:
- `createTestImage(path)` - Create small test PNG
- `createLargeTestImage(path)` - Create large test PNG
- `cleanupTestImages(dir)` - Remove test files

## Writing New Tests

### Basic Test Template

```typescript
import { test, expect } from '@playwright/test'
import { login, waitForServiceWorker } from './utils/test-helpers'

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER_EMAIL, TEST_USER_PASSWORD)
    await waitForServiceWorker(page)
  })

  test('should do something', async ({ page }) => {
    // Your test code here
    await page.goto('/my-feature')
    await expect(page.locator('h1')).toHaveText('My Feature')
  })
})
```

### Offline Test Template

```typescript
import { goOffline, goOnline, getIndexedDBData } from './utils/test-helpers'

test('should work offline', async ({ page }) => {
  await page.goto('/photos/upload')

  // Go offline
  await goOffline(page)

  // Perform offline action
  // ... your test code

  // Verify data is queued
  const queuedData = await getIndexedDBData(
    page,
    'RoofingSaaSOfflineQueue',
    'queuedPhotos'
  )
  expect(queuedData.length).toBeGreaterThan(0)

  // Go back online
  await goOnline(page)
})
```

## Mobile Device Testing

### iOS Testing

Requires macOS with Xcode:

```bash
npx playwright test --project=webkit
```

### Android Testing

Requires Android SDK:

```bash
npx playwright test --project=chromium --device="Pixel 5"
```

### Real Device Testing

For actual mobile device testing:

1. Deploy app to staging environment
2. Use remote debugging with Playwright
3. Or use BrowserStack/Sauce Labs integration

## Continuous Integration

### GitHub Actions Example

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
        env:
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Debugging Failed Tests

### View Test Report

```bash
npx playwright show-report
```

### View Trace

```bash
npx playwright show-trace trace.zip
```

### Screenshots

Failed tests automatically capture screenshots in:
```
test-results/
├── offline-workflow-should-queue-photo-when-offline/
│   └── test-failed-1.png
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Clear IndexedDB before each test
3. **Wait Strategies**: Use `waitForSelector` instead of `waitForTimeout`
4. **Assertions**: Use Playwright's built-in `expect` for auto-retry
5. **Page Objects**: Consider creating page objects for complex flows
6. **Parallel Execution**: Tests run in parallel by default
7. **Flaky Tests**: Use `test.retry()` or fix timing issues

## Troubleshooting

### Service Worker Not Registered

- Make sure dev server is running
- Check service worker is enabled in development
- Clear browser cache and reload

### IndexedDB Not Found

- Verify database name matches app code
- Check browser console for errors
- Ensure Dexie.js is initialized

### Photo Upload Fails

- Check API authentication
- Verify Supabase credentials
- Ensure storage bucket exists and has correct RLS policies

### Tests Timeout

- Increase timeout in `playwright.config.ts`:
  ```typescript
  use: {
    actionTimeout: 30000,
    navigationTimeout: 30000,
  }
  ```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- [PWA Testing Guide](https://web.dev/pwa-testing/)
- [IndexedDB Testing](https://developer.chrome.com/docs/devtools/storage/indexeddb/)
