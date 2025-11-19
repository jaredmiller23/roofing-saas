# E2E Test Suite Setup & Troubleshooting

## Quick Start

```bash
# Run all tests
npm run test:e2e

# Run specific test file
npx playwright test e2e/basic.spec.ts

# Run with UI mode (interactive)
npm run test:e2e:ui

# View test report
npm run test:e2e:report
```

## ✅ FIXED: Connection Issues (November 18, 2025)

### Problem
All E2E tests were failing with `net::ERR_CONNECTION_REFUSED` because Playwright couldn't connect to the development server.

### Root Cause
The `webServer` configuration in `playwright.config.ts` was commented out, so Playwright wasn't automatically starting the dev server before running tests.

### Solution
1. **Uncommented webServer configuration** in `playwright.config.ts`:
   ```typescript
   webServer: {
     command: 'npm run dev',
     url: 'http://localhost:3000',
     reuseExistingServer: !process.env.CI,
     timeout: 120000,
   }
   ```

2. **Added dotenv configuration** to load test environment variables:
   ```typescript
   import * as dotenv from 'dotenv'
   import * as path from 'path'

   dotenv.config({ path: path.resolve(__dirname, '.env.test') })
   ```

### Test Results After Fix
- **Before**: 0/99 tests passing (all connection refused)
- **After**: 50/99 tests passing (50% success rate)

## Test Environment Configuration

### Prerequisites
1. **Test user exists** in Supabase Auth:
   - Email: `test@roofingsaas.com`
   - Password: `TestPassword123!`
   - Created via: `scripts/create-test-user.ts`

2. **Test tenant configured** in database:
   - Tenant ID: `224f6614-d559-4427-b87d-9132af39a575`
   - Company: Test Company

3. **Environment variables** in `.env.test`:
   ```
   TEST_USER_EMAIL=test@roofingsaas.com
   TEST_USER_PASSWORD=TestPassword123!
   TEST_TENANT_ID=224f6614-d559-4427-b87d-9132af39a575
   TEST_USER_ID=5c349897-07bd-4ac8-9777-62744ce3fc3b
   ```

### Authentication Flow
1. **Setup project** runs first (`e2e/auth.setup.ts`)
2. Authenticates test user and saves session state
3. All other tests reuse authenticated state from `playwright/.auth/user.json`

## Current Test Status (November 18, 2025)

### ✅ Passing Test Suites (50 tests)
- **Basic Tests** (3/3) - Homepage, login, manifest
- **Error State Handling** (7/7) - Error messages, network failures
- **Projects/Sales Page** (partial) - View modes, table/kanban switching
- **UI Crawler** (1/1) - Full app navigation

### ❌ Failing Test Suites (45 tests)

#### 1. E-Signature Tests (8/9 failing)
**Status**: ⏱️ Timeout errors (30 seconds)

**Root Cause**: PDF generation not implemented (TODO comment in code)

**Failing Tests**:
- Create new signature document
- Send document for signature
- Sign document
- Download completed document
- Validate signature
- Track completion status
- Handle expired links
- Multiple signers

**Fix Required**: Implement PDF generation in `/app/api/signature-documents/[id]/download/route.ts` (see task: "CRITICAL: Complete E-Signature PDF Generation")

#### 2. Multi-Tenant Isolation Tests (7/7 failing)
**Status**: 🔒 Data isolation issues

**Root Cause**: Test data setup or RLS policy issues

**Failing Tests**:
- Contact isolation between tenants
- Project isolation between tenants
- Prevent cross-tenant API access
- Maintain tenant context across navigation
- Enforce RLS on database queries
- Tenant-specific search results
- Concurrent access data integrity

**Fix Required**:
- Review multi-tenant test data setup
- Verify RLS policies are working correctly
- Add test tenant creation/cleanup utilities

#### 3. PWA/Offline Workflow Tests (20/20 failing)
**Status**: 🔧 Service worker not functioning in test environment

**Root Cause**: Service worker registration failing or not available during tests

**Failing Tests**:
- Service worker registration
- Offline indicator display
- Photo queue when offline
- Auto-upload when online
- Queue status UI
- Manual sync trigger
- Failed upload retry
- Geolocation capture
- Image compression
- Camera photo capture
- Offline fallback page
- PWA installation
- Static asset caching
- Background sync
- App update notifications

**Fix Required**:
- Configure service worker to work in test environment
- Mock service worker APIs if necessary
- Add PWA test utilities

## Troubleshooting

### Tests Timing Out
- Increase timeout in individual tests
- Check if elements exist before waiting for them
- Verify API endpoints are responding

### Authentication Failures
1. Verify test user exists: Check Supabase Auth dashboard
2. Check `.env.test` credentials match actual user
3. Delete `playwright/.auth/user.json` and re-run setup
4. Review auth.setup.ts logs for specific errors

### RLS Policy Failures
- Verify test tenant exists in `tenants` table
- Check `user_tenants` mapping for test user
- Review RLS policies in Supabase dashboard

### Service Worker Issues
- Check service worker registration in browser DevTools
- Verify PWA manifest is valid
- Test PWA features manually before running automated tests

## Next Steps

### Priority 1: E-Signature Tests
- [ ] Implement PDF generation
- [ ] Wire DocuSign or alternative provider
- [ ] Re-run e-signature test suite
- [ ] Update tests if API contracts changed

### Priority 2: Multi-Tenant Tests
- [ ] Create multi-tenant test data setup utility
- [ ] Add second test tenant for isolation tests
- [ ] Verify all RLS policies
- [ ] Add tenant cleanup after tests

### Priority 3: PWA Tests
- [ ] Research Playwright + service worker testing
- [ ] Mock service worker APIs if needed
- [ ] Add PWA test setup documentation
- [ ] Consider splitting into integration vs E2E

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Test Configuration](https://playwright.dev/docs/test-configuration)
- [Testing Service Workers](https://playwright.dev/docs/service-workers-experimental)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)
