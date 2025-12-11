# Testing Strategy

## Overview

This document describes the end-to-end (E2E) testing strategy for the Roofing SAAS application using Playwright. The test suite provides comprehensive coverage of user workflows, error handling, offline functionality, multi-tenant isolation, and cross-browser compatibility.

## User Stories

### As a Developer
- I want automated E2E tests so that I can catch regressions before production
- I want clear test patterns so that I can write consistent, maintainable tests
- I want API mocking utilities so that I can test edge cases and error scenarios

### As a QA Engineer
- I want comprehensive test coverage so that critical user flows are verified
- I want visual test reports so that I can diagnose failures quickly
- I want cross-browser testing so that I can ensure compatibility

### As a DevOps Engineer
- I want CI/CD integration so that tests run automatically on PRs
- I want parallel test execution so that CI pipelines stay fast
- I want test artifacts (screenshots, traces) so that failures can be debugged

---

## Test Framework Configuration

### Playwright Configuration

**File:** `playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
```

### Browser Projects

| Project | Browser | Dependencies | Auth State |
|---------|---------|--------------|------------|
| `setup` | - | None | Creates auth |
| `chromium` | Desktop Chrome | setup | Uses saved auth |
| `webkit` | Desktop Safari | setup | Uses saved auth |
| `firefox` | Desktop Firefox | setup | Uses saved auth |

### Dev Server Configuration

```typescript
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
  timeout: 120000,  // 2 minute startup timeout
}
```

---

## Test Directory Structure

```
e2e/
├── README.md                       # Test documentation
├── auth.setup.ts                   # Authentication setup (124 lines)
├── basic.spec.ts                   # Basic navigation tests
├── e-signature.spec.ts             # E-signature workflow (248 lines)
├── error-states.spec.ts            # Error handling tests (311 lines)
├── multi-tenant.spec.ts            # Tenant isolation tests (342 lines)
├── offline-queue-unit.spec.ts      # Offline queue unit tests
├── offline-workflow.spec.ts        # PWA offline tests (360 lines)
├── pins.spec.ts                    # Map pin tests (241 lines)
├── pipeline.spec.ts                # Pipeline workflow tests (305 lines)
├── projects.comprehensive.spec.ts  # Project views tests (510 lines)
├── pwa-advanced.spec.ts            # PWA features (295 lines)
├── storm-leads.spec.ts             # Storm targeting tests (375 lines)
├── ui-crawler.spec.ts              # Full app crawling (476 lines)
├── voice-assistant.spec.ts         # Voice AI tests (383 lines)
├── workflows.spec.ts               # Workflow automation tests (294 lines)
├── fixtures/
│   └── test-images.ts              # Test image generators
└── utils/
    ├── api-mocks.ts                # API mocking utilities (239 lines)
    ├── error-scenarios.ts          # Error scenario definitions (215 lines)
    └── test-helpers.ts             # Common test utilities (179 lines)
```

---

## Test Categories

### 1. Authentication Setup (`auth.setup.ts`)

**Purpose:** Authenticate test user once, save session state for all subsequent tests.

**Features:**
- Login with test credentials from `.env.test`
- Session state saved to `playwright/.auth/user.json`
- Auto-creates auth directory if needed
- Detailed logging for debugging
- Screenshot capture on failure

**Selectors:**
```typescript
// Flexible selectors for various form implementations
const emailInput = page.locator('input[name="email"], input[type="email"], input[placeholder*="email" i]');
const passwordInput = page.locator('input[name="password"], input[type="password"]');
const submitButton = page.locator('button[type="submit"], button:has-text("Sign in")');
```

### 2. PWA Offline Workflow (`offline-workflow.spec.ts`)

**Purpose:** Test Progressive Web App offline functionality.

**Test Cases:**
| Test | Description |
|------|-------------|
| Service Worker Registration | Verify SW controller is active |
| Offline Indicator | Show offline status in UI |
| Photo Queue Offline | Queue photos to IndexedDB when offline |
| Auto-Upload Online | Upload queued photos when back online |
| Queue Status UI | Display pending/syncing/failed counts |
| Background Sync | Trigger sync when network returns |
| Geolocation Capture | Store GPS with offline photos |
| Image Compression | Compress large images before queue |
| Failed Retry | Retry failed uploads |
| Offline Fallback | Show cached pages when offline |

**Key Test Pattern:**
```typescript
test('should queue photo when offline', async ({ page }) => {
  await page.goto('/photos/upload');
  await goOffline(page);  // Simulate network loss

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(TEST_IMAGE_PATH);

  await waitForNotification(page, 'Photo saved - will upload when online');

  const queuedPhotos = await getIndexedDBData(
    page,
    'RoofingSaaSOfflineQueue',
    'queuedPhotos'
  );
  expect(queuedPhotos.length).toBe(1);
  expect(queuedPhotos[0].status).toBe('pending');

  await goOnline(page);  // Restore network
});
```

### 3. Error State Testing (`error-states.spec.ts`)

**Purpose:** Verify graceful error handling across all pages.

**Test Categories:**
- **Tasks Page:** DATABASE_ERROR, QUERY_ERROR, unauthorized, timeout
- **Contacts Page:** API failures, validation errors on create
- **Projects Page:** Pipeline validation errors, stage transition failures
- **Digital Cards Page:** Invalid slug errors
- **API Responses:** Ensure no "[object Object]" in error messages

**Error Scenarios Tested:**
```typescript
const ERROR_SCENARIOS = {
  DATABASE_ERROR: { code: 'DATABASE_ERROR', message: 'Failed to connect to database' },
  QUERY_ERROR: { code: 'QUERY_ERROR', message: 'Invalid database query' },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', message: 'You must be logged in' },
  FORBIDDEN: { code: 'FORBIDDEN', message: 'You do not have permission' },
  NOT_FOUND: { code: 'NOT_FOUND', message: 'Resource was not found' },
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', message: 'Invalid input data' },
  RATE_LIMIT: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' },
  RLS_VIOLATION: { code: 'RLS_VIOLATION', message: 'Access denied by RLS policy' },
};
```

### 4. Multi-Tenant Isolation (`multi-tenant.spec.ts`)

**Purpose:** Verify Row-Level Security enforces tenant boundaries.

**Test Cases:**
| Test | Description |
|------|-------------|
| Contact Isolation | Tenant 2 cannot see Tenant 1's contacts |
| Project Isolation | Cross-tenant project access returns 403/404 |
| API Access Control | API requests respect tenant context |
| Direct URL Access | Direct URL to other tenant's data blocked |
| List View Filtering | Other tenant's data not in list views |

**Test Pattern:**
```typescript
test('should isolate contacts between tenants', async ({ page }) => {
  // Login as tenant 1, create contact
  await login(page, tenant1User.email, tenant1User.password);
  await page.goto('/contacts');
  await page.click('text=New Contact');
  // ... create contact, get ID

  // Logout, login as tenant 2
  await page.click('[data-testid="user-menu"]');
  await page.click('text=Logout');
  await login(page, tenant2User.email, tenant2User.password);

  // Try to access tenant 1's contact
  const response = await page.goto(`/contacts/${tenant1ContactId}`);
  expect([403, 404]).toContain(response?.status() || 0);
});
```

### 5. Projects/Pipeline Testing (`projects.comprehensive.spec.ts`, `pipeline.spec.ts`)

**Purpose:** Test Kanban and table views, stage transitions.

**View Modes Tested:**
- **Kanban View (Default):** Columns for each stage
- **Table View:** Sortable columns, pagination
- **Stage Transitions:** Drag-drop validation

**Bug Prevention:** These tests would catch issues like:
- Bug #2: Table view sorting by wrong column name

### 6. E-Signature Workflow (`e-signature.spec.ts`)

**Purpose:** Test document creation, sending, and signing flow.

**Test Cases:**
- Create new signature document
- Display pending status
- Send document for signature
- Sign document (canvas interaction)
- Complete signing workflow
- View signed document

### 7. PWA Advanced Features (`pwa-advanced.spec.ts`)

**Purpose:** Test service worker and installability.

**Test Cases:**
| Test | Description |
|------|-------------|
| SW Registration | Service worker active after load |
| Installability | PWA meets install criteria |
| Manifest | Valid manifest.json |
| Static Asset Caching | JS/CSS cached by SW |
| Offline Navigation | Navigate to cached pages offline |

### 8. UI Crawler (`ui-crawler.spec.ts`)

**Purpose:** Comprehensive automated UI exploration.

**Features:**
- Crawl all major routes
- Track navigation links
- Test buttons and forms
- Capture console errors
- Track JavaScript exceptions
- Generate comprehensive report

**Issue Tracking:**
```typescript
interface Issue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'navigation' | 'button' | 'form' | 'console' | 'accessibility' | 'ui';
  page: string;
  element?: string;
  description: string;
  error?: string;
}
```

### 9. Storm Leads Testing (`storm-leads.spec.ts`)

**Purpose:** Test storm targeting and lead import workflows.

### 10. Voice Assistant Testing (`voice-assistant.spec.ts`)

**Purpose:** Test voice AI integration and CRM commands.

---

## Test Utilities

### `test-helpers.ts` - Common Functions

| Function | Purpose |
|----------|---------|
| `goOffline(page)` | Simulate network loss |
| `goOnline(page)` | Restore network |
| `waitForServiceWorker(page)` | Wait for SW registration |
| `checkPWAInstallable(page)` | Check PWA criteria |
| `clearIndexedDB(page, dbName)` | Clear offline database |
| `getIndexedDBData(page, db, store)` | Read IndexedDB data |
| `mockGeolocation(page, lat, lng)` | Mock device location |
| `uploadTestImage(page, selector, path)` | Upload test file |
| `waitForNotification(page, message)` | Wait for toast |
| `login(page, email, password)` | Authenticate user |
| `isVisible(page, selector)` | Check element visibility |
| `getQueueStatus(page)` | Read queue counts |
| `waitForNetworkIdle(page, timeout)` | Wait for network quiet |

### `api-mocks.ts` - API Mocking

| Function | Purpose |
|----------|---------|
| `mockApiError(page, endpoint, error, status)` | Mock error response |
| `mockApiSuccess(page, endpoint, data, pagination)` | Mock success response |
| `mockApiEmpty(page, endpoint, dataKey)` | Mock empty data |
| `mockApiTimeout(page, endpoint)` | Mock network timeout |
| `mockApiUnauthorized(page, endpoint)` | Mock 401 response |
| `mockApiValidationError(page, endpoint, details)` | Mock 400 validation |
| `mockApiLargeDataset(page, endpoint, key, total)` | Mock pagination |
| `mockContactsApi(page, contacts)` | Mock contacts list |
| `mockTasksApi(page, tasks)` | Mock tasks list |
| `clearApiMocks(page)` | Remove all mocks |

**Mock Example:**
```typescript
await mockApiError(page, '/api/tasks', {
  code: 'DATABASE_ERROR',
  message: 'Failed to connect to database',
  details: { type: 'connection_error' }
}, 500);
```

### `error-scenarios.ts` - Predefined Errors

Common error scenarios for consistent testing:
- `DATABASE_ERROR` - Connection failures
- `QUERY_ERROR` - SQL/query issues
- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - No permission
- `NOT_FOUND` - 404 errors
- `VALIDATION_ERROR` - Invalid input
- `RATE_LIMIT` - Too many requests
- `RLS_VIOLATION` - Tenant isolation
- `FILE_TOO_LARGE(size)` - Upload limits
- `INVALID_FILE_TYPE(types)` - File type validation
- `SESSION_EXPIRED` - Auth timeout

---

## Test Data

### Environment Variables (`.env.test`)

```bash
TEST_USER_EMAIL=test@roofingsaas.com
TEST_USER_PASSWORD=TestPassword123!
TEST_TENANT_ID=224f6614-d559-4427-b87d-9132af39a575
TEST_USER_ID=5c349897-07bd-4ac8-9777-62744ce3fc3b
```

### Test User Setup

1. Create user in Supabase Authentication
2. Create tenant in `tenants` table
3. Link user to tenant in `user_tenants` table
4. Update `.env.test` with IDs

---

## Running Tests

### NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run test:e2e` | Run all E2E tests |
| `npm run test:e2e:ui` | Interactive Playwright UI |
| `npm run test:e2e:report` | View HTML test report |

### Playwright CLI

```bash
# Run specific test file
npx playwright test offline-workflow

# Run specific test by name
npx playwright test -g "should queue photo when offline"

# Run in headed mode (see browser)
npx playwright test --headed

# Run in debug mode
npx playwright test --debug

# Run specific browser
npx playwright test --project=chromium
npx playwright test --project=webkit
npx playwright test --project=firefox
```

---

## CI/CD Integration

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

### CI Configuration

| Setting | Local | CI |
|---------|-------|-----|
| `fullyParallel` | true | true |
| `retries` | 0 | 2 |
| `workers` | auto | 1 |
| `forbidOnly` | false | true |
| `reuseExistingServer` | true | false |

---

## Debugging Tests

### Test Reports

```bash
# Generate and view HTML report
npx playwright show-report
```

### Trace Viewer

```bash
# View trace from failed test
npx playwright show-trace trace.zip
```

### Screenshots

Failed tests auto-capture screenshots to:
```
test-results/
├── offline-workflow-should-queue-photo/
│   └── test-failed-1.png
```

### Console Logging

Tests include emoji-coded logging:
- `🔐` Authentication
- `📧` Email/credentials
- `📴` Offline mode
- `🌐` Online mode
- `✅` Success
- `❌` Failure
- `📤` Upload
- `📍` Geolocation
- `💾` Storage

---

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Clear IndexedDB/localStorage in `beforeEach`
- Don't rely on test execution order

### 2. Wait Strategies
```typescript
// GOOD: Use Playwright auto-retry assertions
await expect(page.locator('h1')).toHaveText('Dashboard');

// AVOID: Fixed timeouts
await page.waitForTimeout(5000);  // Flaky!
```

### 3. Selectors
```typescript
// BEST: Test IDs
page.getByTestId('submit-button')

// GOOD: Role-based
page.getByRole('button', { name: 'Submit' })

// OK: Text content
page.getByText('Submit')

// AVOID: Fragile CSS/XPath
page.locator('.btn-primary.submit-form')
```

### 4. Assertions
```typescript
// Use Playwright's expect for auto-retry
await expect(element).toBeVisible();
await expect(element).toHaveText('Expected');
await expect(element).toHaveCount(3);
```

### 5. Page Objects (Optional)
Consider for complex flows:
```typescript
class ContactsPage {
  constructor(private page: Page) {}

  async createContact(data: ContactData) {
    await this.page.click('text=New Contact');
    await this.page.fill('input[name="first_name"]', data.firstName);
    // ...
  }
}
```

---

## Troubleshooting

### Service Worker Not Registered
1. Ensure dev server is running
2. Check SW enabled in development
3. Clear browser cache

### IndexedDB Not Found
1. Verify database name matches app code
2. Check browser console for errors
3. Ensure Dexie.js is initialized

### Photo Upload Fails
1. Check API authentication
2. Verify Supabase credentials
3. Ensure storage bucket exists with RLS policies

### Tests Timeout
Increase timeouts in `playwright.config.ts`:
```typescript
use: {
  actionTimeout: 30000,
  navigationTimeout: 30000,
}
```

### Flaky Tests
1. Use `test.retry(n)` for known flaky tests
2. Fix timing issues with proper waits
3. Check for race conditions

---

## File References

| File | Full Path |
|------|-----------|
| `playwright.config.ts` | `/Users/ccai/roofing saas/roofing-saas/playwright.config.ts` |
| `e2e/README.md` | `/Users/ccai/roofing saas/roofing-saas/e2e/README.md` |
| `e2e/auth.setup.ts` | `/Users/ccai/roofing saas/roofing-saas/e2e/auth.setup.ts` |
| `e2e/offline-workflow.spec.ts` | `/Users/ccai/roofing saas/roofing-saas/e2e/offline-workflow.spec.ts` |
| `e2e/error-states.spec.ts` | `/Users/ccai/roofing saas/roofing-saas/e2e/error-states.spec.ts` |
| `e2e/multi-tenant.spec.ts` | `/Users/ccai/roofing saas/roofing-saas/e2e/multi-tenant.spec.ts` |
| `e2e/projects.comprehensive.spec.ts` | `/Users/ccai/roofing saas/roofing-saas/e2e/projects.comprehensive.spec.ts` |
| `e2e/pwa-advanced.spec.ts` | `/Users/ccai/roofing saas/roofing-saas/e2e/pwa-advanced.spec.ts` |
| `e2e/e-signature.spec.ts` | `/Users/ccai/roofing saas/roofing-saas/e2e/e-signature.spec.ts` |
| `e2e/ui-crawler.spec.ts` | `/Users/ccai/roofing saas/roofing-saas/e2e/ui-crawler.spec.ts` |
| `e2e/pins.spec.ts` | `/Users/ccai/roofing saas/roofing-saas/e2e/pins.spec.ts` |
| `e2e/pipeline.spec.ts` | `/Users/ccai/roofing saas/roofing-saas/e2e/pipeline.spec.ts` |
| `e2e/storm-leads.spec.ts` | `/Users/ccai/roofing saas/roofing-saas/e2e/storm-leads.spec.ts` |
| `e2e/voice-assistant.spec.ts` | `/Users/ccai/roofing saas/roofing-saas/e2e/voice-assistant.spec.ts` |
| `e2e/workflows.spec.ts` | `/Users/ccai/roofing saas/roofing-saas/e2e/workflows.spec.ts` |
| `e2e/utils/test-helpers.ts` | `/Users/ccai/roofing saas/roofing-saas/e2e/utils/test-helpers.ts` |
| `e2e/utils/api-mocks.ts` | `/Users/ccai/roofing saas/roofing-saas/e2e/utils/api-mocks.ts` |
| `e2e/utils/error-scenarios.ts` | `/Users/ccai/roofing saas/roofing-saas/e2e/utils/error-scenarios.ts` |
| `.env.test` | `/Users/ccai/roofing saas/roofing-saas/.env.test` |

---

## Validation Record

### Files Examined (18 total)
- `/Users/ccai/roofing saas/roofing-saas/playwright.config.ts` - 92 lines, Playwright configuration
- `/Users/ccai/roofing saas/roofing-saas/e2e/README.md` - 296 lines, test documentation
- `/Users/ccai/roofing saas/roofing-saas/e2e/auth.setup.ts` - 124 lines, auth setup
- `/Users/ccai/roofing saas/roofing-saas/e2e/offline-workflow.spec.ts` - 360 lines, PWA tests
- `/Users/ccai/roofing saas/roofing-saas/e2e/error-states.spec.ts` - 311 lines, error handling
- `/Users/ccai/roofing saas/roofing-saas/e2e/multi-tenant.spec.ts` - 342 lines, RLS tests
- `/Users/ccai/roofing saas/roofing-saas/e2e/projects.comprehensive.spec.ts` - 510 lines, project views
- `/Users/ccai/roofing saas/roofing-saas/e2e/pwa-advanced.spec.ts` - 295 lines, PWA features
- `/Users/ccai/roofing saas/roofing-saas/e2e/e-signature.spec.ts` - 248 lines, e-signature workflow
- `/Users/ccai/roofing saas/roofing-saas/e2e/ui-crawler.spec.ts` - 476 lines, UI crawling
- `/Users/ccai/roofing saas/roofing-saas/e2e/utils/test-helpers.ts` - 179 lines, helper functions
- `/Users/ccai/roofing saas/roofing-saas/e2e/utils/api-mocks.ts` - 239 lines, API mocking
- `/Users/ccai/roofing saas/roofing-saas/e2e/utils/error-scenarios.ts` - 215 lines, error definitions
- `/Users/ccai/roofing saas/roofing-saas/.env.test` - 23 lines, test credentials
- Directory listing of `/Users/ccai/roofing saas/roofing-saas/e2e/` - 14 spec files confirmed

### Verification Steps
1. Read playwright.config.ts for framework settings
2. Read README.md for test documentation
3. Read auth.setup.ts for authentication flow
4. Read all major spec files for test patterns
5. Read utility files for helper functions
6. Verified all file paths exist via ls/Glob
7. Cross-referenced test patterns with actual code

### Validated By
PRD Documentation Agent - Session 32
Date: 2025-12-11T16:45:00Z
