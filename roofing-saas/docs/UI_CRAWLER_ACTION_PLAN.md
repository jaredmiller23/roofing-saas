# UI Crawler Action Plan
**Date**: November 18, 2025
**Based On**: UI Crawler Test Report
**Status**: Ready for Implementation

---

## Overview

This action plan addresses the findings from the comprehensive UI crawler test. The plan is organized by priority with specific implementation steps, estimated effort, and success criteria.

---

## Priority 1: Critical Issues (Start Immediately)

### Task 1.1: Set Up Authenticated Test Suite
**Priority**: P0 - Critical
**Effort**: 2-4 hours
**Due**: November 19, 2025 (Tomorrow)
**Assignee**: Developer + Claude Code

#### Problem
The crawler cannot test authenticated features because it gets redirected to `/login`. This blocks comprehensive testing of:
- Form submissions
- Button interactions
- Data creation/editing
- Dynamic content loading
- User-specific features

#### Solution
Create an authenticated Playwright test setup using `storageState`.

#### Implementation Steps

**Step 1**: Create auth setup file (30 minutes)
```typescript
// File: /e2e/auth.setup.ts

import { test as setup } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../playwright/.auth/user.json')

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login')

  // Fill in test user credentials
  await page.fill('input[name="email"], input[type="email"]', process.env.TEST_USER_EMAIL || 'test@roofingsaas.com')
  await page.fill('input[name="password"], input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpassword')

  // Click login button
  await page.click('button[type="submit"]')

  // Wait for successful login
  await page.waitForURL('/dashboard', { timeout: 10000 })

  // Save authenticated state
  await page.context().storageState({ path: authFile })
})
```

**Step 2**: Update Playwright config (15 minutes)
```typescript
// File: /playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  // ... existing config ...

  // Add setup project
  projects: [
    // Setup project - runs first to authenticate
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    // Main test project - uses authenticated state
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use authenticated state
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
})
```

**Step 3**: Create test environment file (10 minutes)
```bash
# File: /.env.test

# Test user credentials (create a dedicated test user in Supabase)
TEST_USER_EMAIL=test@roofingsaas.com
TEST_USER_PASSWORD=SecureTestPassword123!

# Test tenant ID (create a dedicated test tenant)
TEST_TENANT_ID=uuid-here
```

**Step 4**: Create test user in Supabase (20 minutes)
1. Open Supabase dashboard → Authentication
2. Create new user: `test@roofingsaas.com`
3. Note the user ID
4. Create test tenant in `tenants` table
5. Link user to tenant in `user_tenants` table
6. Create sample data for testing (optional)

**Step 5**: Update UI crawler to use auth (30 minutes)
```typescript
// File: /e2e/ui-crawler.spec.ts
import { test, expect, Page } from '@playwright/test'

// Tests will automatically use authenticated state from setup
test.describe('UI Crawler - Full Application Test', () => {
  // Tests will run as authenticated user
  test('should crawl dashboard and core pages', async ({ page }) => {
    await page.goto('/dashboard')
    // Should NOT redirect to /login anymore
    await expect(page).toHaveURL(/\/dashboard/)
    // ... rest of test
  })
})
```

**Step 6**: Verify authentication works (30 minutes)
```bash
# Run tests
npm run test:e2e -- e2e/ui-crawler.spec.ts

# Should see:
# ✓ Setup project completes
# ✓ Auth state saved
# ✓ All tests run as authenticated user
# ✓ No redirects to /login
```

#### Success Criteria
- [ ] Auth setup file created and working
- [ ] Test user created in Supabase
- [ ] Playwright config updated
- [ ] UI crawler runs without login redirects
- [ ] All 16 tests pass (was 15/16, now should be 16/16)
- [ ] Authenticated session persists across tests

#### Deliverables
- `/e2e/auth.setup.ts` - Authentication setup
- `/.env.test` - Test environment configuration
- Updated `/playwright.config.ts` - Config with auth
- Test user documentation in `/docs/TESTING.md`

---

## Priority 2: High Priority Issues (This Week)

### Task 2.1: Investigate Territory Map Container Issue
**Priority**: P1 - High
**Effort**: 1-2 hours
**Due**: November 20, 2025
**Assignee**: Developer + Claude Code

#### Problem
Map container not detected on `/territories` page. Could indicate:
- Map not loading
- Selector has changed
- Async loading after authentication
- JavaScript error preventing map render

#### Investigation Steps

**Step 1**: Check map with authentication (20 minutes)
```typescript
// File: /e2e/territory-map.spec.ts
import { test, expect } from '@playwright/test'

test('territory map loads correctly', async ({ page }) => {
  await page.goto('/territories')

  // Wait for map to load
  await page.waitForSelector('.leaflet-container', { timeout: 10000 })

  // Verify map elements
  expect(await page.locator('.leaflet-container').count()).toBeGreaterThan(0)
  expect(await page.locator('.leaflet-map-pane').count()).toBeGreaterThan(0)
  expect(await page.locator('.leaflet-control-zoom').count()).toBeGreaterThan(0)

  // Verify map is interactive
  const mapContainer = page.locator('.leaflet-container')
  await expect(mapContainer).toBeVisible()

  // Take screenshot for verification
  await page.screenshot({ path: 'test-results/territory-map.png' })
})
```

**Step 2**: Check actual implementation (30 minutes)
Read and verify these files:
- `/app/(dashboard)/territories/page.tsx`
- `/app/(dashboard)/territories/[id]/page.tsx`
- `/components/territories/TerritoryMapClient.tsx`
- `/components/territories/TerritoryMapDirect.tsx`
- `/components/territories/TerritoryMapWrapper.tsx`

Look for:
- How map container is created
- What selectors are used
- If there are async loading delays
- Any error handling that might prevent rendering

**Step 3**: Test with browser console (15 minutes)
```typescript
test('check for map JavaScript errors', async ({ page }) => {
  const errors: string[] = []

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })

  page.on('pageerror', error => {
    errors.push(error.message)
  })

  await page.goto('/territories')
  await page.waitForLoadState('networkidle')

  // Check for errors
  if (errors.length > 0) {
    console.log('Map loading errors:', errors)
  }

  expect(errors).toHaveLength(0)
})
```

**Step 4**: Verify Leaflet library (15 minutes)
```bash
# Check if Leaflet is installed
npm list react-leaflet leaflet

# If not installed, install it
npm install react-leaflet leaflet
npm install -D @types/leaflet
```

#### Resolution Options

**Option A**: Map loads after auth (most likely)
- Update crawler to wait longer
- Add explicit wait for `.leaflet-container`
- Update success - issue was false positive

**Option B**: Selector changed
- Update test selectors
- Use data-testid attributes for more reliable testing
- Update crawler with new selectors

**Option C**: Real bug found
- Fix map initialization code
- Add error handling
- Deploy fix and retest

#### Success Criteria
- [ ] Root cause identified
- [ ] Map loads correctly with authentication
- [ ] Test passes consistently
- [ ] No JavaScript errors on map page
- [ ] Documentation updated with findings

---

### Task 2.2: Add Cross-Browser Testing (Safari/WebKit)
**Priority**: P1 - High
**Effort**: 1 hour
**Due**: November 20, 2025
**Assignee**: Developer + Claude Code

#### Problem
Currently only testing on Chromium. Need to test on:
- **Safari/WebKit** - Critical for Mac/iOS users (client is on Mac)
- **Firefox** - Additional coverage

#### Implementation Steps

**Step 1**: Update Playwright config (10 minutes)
```typescript
// File: /playwright.config.ts
export default defineConfig({
  // ... existing config ...

  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    // Chromium
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },

    // WebKit (Safari) - ADD THIS
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },

    // Firefox - ADD THIS
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
})
```

**Step 2**: Install WebKit browser (5 minutes)
```bash
# Install WebKit
npx playwright install webkit

# Install Firefox
npx playwright install firefox

# Verify installation
npx playwright install --dry-run
```

**Step 3**: Run cross-browser tests (30 minutes)
```bash
# Run on all browsers
npm run test:e2e

# Run on specific browser
npm run test:e2e -- --project=webkit
npm run test:e2e -- --project=firefox

# Generate report
npm run test:e2e:report
```

**Step 4**: Document browser-specific issues (15 minutes)
Create table of browser compatibility:

| Feature | Chromium | WebKit | Firefox | Notes |
|---------|----------|--------|---------|-------|
| Map rendering | ✅ | ? | ? | To test |
| Canvas signatures | ✅ | ? | ? | To test |
| File uploads | ✅ | ? | ? | To test |
| WebRTC (voice) | ✅ | ? | ? | May need webkit-specific handling |

#### Success Criteria
- [ ] WebKit tests running
- [ ] Firefox tests running
- [ ] Browser compatibility documented
- [ ] Any browser-specific issues identified and documented
- [ ] All 3 browsers passing tests

---

## Priority 3: Medium Priority (This Month)

### Task 3.1: Enhanced Interactive Element Testing
**Priority**: P2 - Medium
**Effort**: 4-6 hours
**Due**: November 25, 2025

#### Goal
Create comprehensive tests for interactive elements that weren't detected in initial crawler (likely due to authentication).

#### Sub-tasks

**3.1.1: Form Submission Tests** (2 hours)
Create tests for:
- Contact creation form
- Project creation form
- Task creation form
- Settings update forms

```typescript
// File: /e2e/forms.spec.ts
test('should create new contact', async ({ page }) => {
  await page.goto('/contacts')
  await page.click('a[href="/contacts/new"]')

  // Fill form
  await page.fill('[name="first_name"]', 'Test')
  await page.fill('[name="last_name"]', 'Contact')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="phone"]', '555-1234')

  // Submit
  await page.click('button[type="submit"]')

  // Verify success
  await expect(page).toHaveURL(/\/contacts\/[a-f0-9-]+/)
  await expect(page.locator('text=Test Contact')).toBeVisible()
})
```

**3.1.2: Button Click Tests** (1 hour)
Test all action buttons:
- "New Contact" button
- "New Project" button
- "Log Knock" button
- "Create Campaign" button

**3.1.3: Drag-and-Drop Tests** (1 hour)
Test pipeline kanban board:
```typescript
test('should drag project between pipeline stages', async ({ page }) => {
  await page.goto('/pipeline')

  // Find a project card
  const projectCard = page.locator('[draggable="true"]').first()

  // Drag to different column
  await projectCard.dragTo(page.locator('[data-column="qualified"]'))

  // Verify move
  await expect(page.locator('[data-column="qualified"] >> text=Project Name')).toBeVisible()
})
```

**3.1.4: File Upload Tests** (1 hour)
Test file uploads:
```typescript
test('should upload project file', async ({ page }) => {
  await page.goto('/project-files/new')

  // Upload file
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles('test-data/sample.pdf')

  // Submit
  await page.click('button[type="submit"]')

  // Verify upload
  await expect(page.locator('text=sample.pdf')).toBeVisible()
})
```

**3.1.5: Canvas Interaction Tests** (1 hour)
Test e-signature canvas:
```typescript
test('should draw signature on canvas', async ({ page }) => {
  await page.goto('/signatures/new')

  // Find canvas
  const canvas = page.locator('canvas')

  // Draw signature
  const box = await canvas.boundingBox()
  if (box) {
    await page.mouse.move(box.x + 50, box.y + 50)
    await page.mouse.down()
    await page.mouse.move(box.x + 150, box.y + 100)
    await page.mouse.up()
  }

  // Verify signature drawn
  // Check canvas has content (not blank)
})
```

#### Success Criteria
- [ ] All form submission tests passing
- [ ] All button click tests passing
- [ ] Drag-and-drop working on pipeline
- [ ] File uploads functional
- [ ] Canvas signatures working
- [ ] 95%+ test coverage on interactive elements

---

### Task 3.2: Add Accessibility Testing
**Priority**: P2 - Medium
**Effort**: 3-4 hours
**Due**: November 27, 2025

#### Goal
Ensure WCAG 2.1 AA compliance and catch accessibility issues.

#### Implementation Steps

**Step 1**: Install axe-core (10 minutes)
```bash
npm install -D @axe-core/playwright
```

**Step 2**: Create accessibility test suite (2 hours)
```typescript
// File: /e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility Tests', () => {
  test('dashboard should not have accessibility violations', async ({ page }) => {
    await page.goto('/dashboard')

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('contacts page should not have violations', async ({ page }) => {
    await page.goto('/contacts')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  // Add test for each major page
})
```

**Step 3**: Document violations and create remediation plan (1 hour)
- Run tests
- Document all violations
- Prioritize by severity
- Create issues for each violation

**Step 4**: Fix critical violations (1 hour)
Common issues to fix:
- Missing alt text on images
- Insufficient color contrast
- Missing ARIA labels on buttons
- Form inputs without labels
- Missing heading hierarchy

#### Success Criteria
- [ ] Axe-core integrated
- [ ] All major pages tested
- [ ] Violations documented
- [ ] Critical violations fixed
- [ ] CI/CD includes accessibility tests

---

### Task 3.3: Add Performance Monitoring
**Priority**: P2 - Medium
**Effort**: 2-3 hours
**Due**: November 28, 2025

#### Goal
Track page load performance and Core Web Vitals.

#### Implementation Steps

**Step 1**: Add Lighthouse CI (1 hour)
```bash
# Install Lighthouse CI
npm install -D @lhci/cli

# Create Lighthouse config
# File: lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/dashboard',
        'http://localhost:3000/contacts',
        'http://localhost:3000/projects',
        // Add more URLs
      ],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
  },
}
```

**Step 2**: Add performance tests to Playwright (1 hour)
```typescript
// File: /e2e/performance.spec.ts
test('dashboard should load within 3 seconds', async ({ page }) => {
  const startTime = Date.now()

  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')

  const loadTime = Date.now() - startTime

  expect(loadTime).toBeLessThan(3000)
  console.log(`Dashboard loaded in ${loadTime}ms`)
})
```

**Step 3**: Add Core Web Vitals tracking (1 hour)
```typescript
test('measure Core Web Vitals', async ({ page }) => {
  await page.goto('/dashboard')

  // Measure LCP (Largest Contentful Paint)
  const lcp = await page.evaluate(() => {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        resolve(lastEntry.renderTime || lastEntry.loadTime)
      }).observe({ entryTypes: ['largest-contentful-paint'] })
    })
  })

  expect(lcp).toBeLessThan(2500) // LCP should be < 2.5s
})
```

#### Success Criteria
- [ ] Lighthouse CI integrated
- [ ] Performance budgets set
- [ ] Core Web Vitals tracked
- [ ] Performance tests passing
- [ ] Performance reports generated

---

## Priority 4: Low Priority (Nice to Have)

### Task 4.1: Visual Regression Testing
**Effort**: 2-3 hours
**Due**: December 5, 2025

Create baseline screenshots and compare on changes:
```typescript
test('visual regression - dashboard', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveScreenshot('dashboard.png')
})
```

### Task 4.2: Mobile/Responsive Testing
**Effort**: 3-4 hours
**Due**: December 10, 2025

Test on mobile viewports:
```typescript
test.use({
  ...devices['iPhone 13 Pro'],
  storageState: 'playwright/.auth/user.json'
})

test('mobile dashboard', async ({ page }) => {
  await page.goto('/dashboard')
  // Test mobile navigation, hamburger menu, etc.
})
```

### Task 4.3: PWA Installation Testing
**Effort**: 2-3 hours
**Due**: December 12, 2025

Test PWA installation flow and offline functionality.

### Task 4.4: API Contract Testing
**Effort**: 4-5 hours
**Due**: December 15, 2025

Intercept API calls and validate responses:
```typescript
test('API returns valid contact data', async ({ page }) => {
  await page.route('**/api/contacts', route => {
    const response = route.fetch()
    expect(response.status()).toBe(200)
    expect(response.json()).toMatchSchema(contactSchema)
  })

  await page.goto('/contacts')
})
```

---

## Timeline Summary

| Week | Tasks | Status |
|------|-------|--------|
| Nov 18-22 | P1: Auth setup, map investigation, browser testing | 🔴 In Progress |
| Nov 25-29 | P2: Interactive tests, accessibility, performance | 🟡 Planned |
| Dec 2-6 | P3: Visual regression | 🟡 Planned |
| Dec 9-13 | P4: Mobile testing, PWA | 🟡 Planned |
| Dec 16+ | P4: API testing | 🟡 Planned |

---

## Resource Requirements

### Development Time
- **Week 1 (P1)**: 4-6 hours
- **Week 2 (P2)**: 9-13 hours
- **Week 3-4 (P3/P4)**: 11-15 hours
- **Total**: ~25-35 hours over 4 weeks

### Tools & Services
- ✅ Playwright (already installed)
- ⬜ @axe-core/playwright (accessibility)
- ⬜ Lighthouse CI (performance)
- ⬜ Percy or Chromatic (visual regression, optional)

### Test Data
- ⬜ Create test user in Supabase
- ⬜ Create test tenant
- ⬜ Seed test data (contacts, projects, etc.)
- ⬜ Sample files for upload testing

---

## Success Metrics

### Test Coverage
- **Current**: 93.75% pass rate (15/16 tests)
- **Target Week 1**: 100% pass rate with auth
- **Target Week 2**: 95%+ coverage of interactive elements
- **Target Week 4**: Full E2E coverage

### Quality Metrics
- **Console Errors**: 0 (currently achieved ✅)
- **Accessibility Violations**: 0 critical/serious
- **Performance**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- **Cross-browser**: All tests pass on Chrome, Safari, Firefox

### Confidence Level
- **Current**: Medium (basic page load tests)
- **After P1**: High (authenticated testing)
- **After P2**: Very High (comprehensive coverage)
- **After P4**: Exceptional (production-ready)

---

## Next Steps

1. **Immediate** (Today): Review this action plan with team
2. **Tomorrow**: Start Task 1.1 (Auth setup)
3. **This Week**: Complete all P1 tasks
4. **Next Week**: Begin P2 tasks
5. **Ongoing**: Monitor test results, update as needed

---

## Questions & Decisions Needed

1. **Test User**: Who will create the test user in Supabase?
2. **Test Data**: How much sample data should we seed?
3. **CI/CD**: Should we add tests to GitHub Actions now or after P1?
4. **Visual Regression**: Do we want to invest in Percy/Chromatic?
5. **Mobile Testing**: Which devices should we prioritize?

---

**Document Owner**: Development Team
**Last Updated**: November 18, 2025
**Next Review**: November 25, 2025
