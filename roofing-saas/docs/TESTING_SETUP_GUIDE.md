# Testing Setup Guide
**Purpose**: Set up authenticated Playwright E2E testing

---

## Prerequisites

- Supabase project is set up and running
- Environment variables configured in `.env.local`
- Dev server can run (`npm run dev`)

---

## Step 1: Create Test User in Supabase

### Option A: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: `wfifizczqvogbcqamnmw`

2. **Navigate to Authentication**
   - Click "Authentication" in the left sidebar
   - Click "Users" tab

3. **Add New User**
   - Click "+ Add User" button
   - Fill in the form:
     - **Email**: `test@roofingsaas.com`
     - **Password**: `TestPassword123!`
     - **Auto Confirm User**: ✅ Check this box (important!)
   - Click "Create User"

4. **Note the User ID**
   - After creation, you'll see the user in the list
   - Copy the UUID (it looks like: `550e8400-e29b-41d4-a716-446655440000`)
   - Save this for later

5. **Verify User**
   - The user should show as "Confirmed" in the status column
   - Email should be verified automatically

### Option B: Using SQL (Advanced)

```sql
-- Create test user via SQL
-- Note: This requires service_role key access

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmed_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@roofingsaas.com',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  now()
) RETURNING id;
```

---

## Step 2: Update Test Environment File

1. **Open `.env.test`** in your editor

2. **Update with test user credentials**:
   ```env
   TEST_USER_EMAIL=test@roofingsaas.com
   TEST_USER_PASSWORD=TestPassword123!
   TEST_USER_ID=<paste-user-id-from-step-1>
   ```

3. **Save the file**

---

## Step 3: Verify Test User Can Log In

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Open browser** to http://localhost:3000/login

3. **Log in with test credentials**:
   - Email: `test@roofingsaas.com`
   - Password: `TestPassword123!`

4. **Verify successful login**:
   - Should redirect to `/dashboard`
   - Should see the app interface
   - If it fails, check:
     - Email is confirmed in Supabase
     - Password is correct
     - User exists in auth.users table

---

## Step 4: Run Authentication Setup

This will test the Playwright auth setup and save the authenticated state:

```bash
# Run just the auth setup
npx playwright test --project=setup

# You should see:
# ✅ Created auth directory
# ✅ Successfully logged in - redirected to /dashboard
# ✅ Found logged-in indicator
# ✅ Saved authenticated state
# ✅ Auth state saved with N cookies and N storage origins
```

**If it fails**:
- Check screenshot at `playwright/.auth/login-failure.png`
- Verify test user credentials in `.env.test`
- Ensure dev server is running on port 3000
- Check console output for error messages

---

## Step 5: Run UI Crawler with Authentication

Now run the full test suite with authentication:

```bash
# Run all tests (will use authenticated state)
npm run test:e2e

# Run just the UI crawler
npm run test:e2e -- e2e/ui-crawler.spec.ts

# Run on all browsers
npm run test:e2e -- --project=chromium --project=webkit --project=firefox
```

**Expected Results**:
- ✅ Setup project runs first
- ✅ All tests run as authenticated user
- ✅ No redirects to /login
- ✅ 16/16 tests pass (was 15/16 before auth)
- ✅ Interactive elements now visible

---

## Troubleshooting

### Test User Can't Log In

**Problem**: Login fails with "Invalid credentials"

**Solutions**:
1. Verify email is confirmed in Supabase dashboard
2. Check password is exactly: `TestPassword123!`
3. Try resetting password in Supabase dashboard
4. Ensure user is in `auth.users` table

### Auth State Not Persisting

**Problem**: Tests redirect to /login even with auth setup

**Solutions**:
1. Check `playwright/.auth/user.json` exists
2. Verify file contains cookies and storage state
3. Delete auth file and re-run setup:
   ```bash
   rm playwright/.auth/user.json
   npx playwright test --project=setup
   ```
4. Check Supabase session expiry settings

### Tests Fail on Specific Pages

**Problem**: Some pages return 403 or redirect even when authenticated

**Solutions**:
1. Verify user has necessary permissions/roles
2. Check if pages require additional tenant setup
3. Review RLS policies in Supabase
4. Check browser console for API errors

### WebKit/Firefox Tests Fail

**Problem**: Auth works on Chromium but not other browsers

**Solutions**:
1. Install browsers:
   ```bash
   npx playwright install webkit
   npx playwright install firefox
   ```
2. Clear auth state and re-run setup
3. Check browser-specific cookie/storage issues
4. Run with headed mode to debug:
   ```bash
   npx playwright test --project=webkit --headed
   ```

---

## Advanced: Creating Test Data

Once the test user is set up, you may want to create sample data for testing:

### Manual Approach

1. Log in as test user
2. Create sample contacts, projects, etc. through the UI
3. These will be used by tests

### Automated Approach (Script)

Create `scripts/seed-test-data.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seedTestData() {
  // Create sample contacts
  await supabase.from('contacts').insert([
    {
      first_name: 'Test',
      last_name: 'Contact 1',
      email: 'test1@example.com',
      phone: '555-0001',
    },
    // ... more test data
  ])
}

seedTestData()
```

Run with:
```bash
tsx scripts/seed-test-data.ts
```

---

## Files Created

```
/e2e/auth.setup.ts                 # Auth setup for Playwright
/playwright.config.ts              # Updated with auth projects
/.env.test                         # Test credentials
/.gitignore                        # Excludes playwright/.auth/
/docs/TESTING_SETUP_GUIDE.md       # This guide
```

---

## Security Notes

⚠️ **Important Security Considerations**:

1. **Never commit `.env.test`** with real credentials
2. **Auth state is gitignored** (`playwright/.auth/`)
3. **Use dedicated test user** - don't use production accounts
4. **Separate test environment** recommended for staging
5. **Reset test data** between test runs if needed
6. **Service role key** should only be used in secure environments

---

## Next Steps

After completing setup:

1. ✅ Test user created and verified
2. ✅ Auth setup runs successfully
3. ✅ UI crawler passes 16/16 tests
4. 🎯 Add more interactive element tests
5. 🎯 Set up test data seeding
6. 🎯 Add to CI/CD pipeline

---

## Quick Reference

### Create Test User
```
Supabase Dashboard > Authentication > Users > Add User
Email: test@roofingsaas.com
Password: TestPassword123!
Auto Confirm: ✅
```

### Run Auth Setup
```bash
npx playwright test --project=setup
```

### Run All Tests
```bash
npm run test:e2e
```

### Debug Failed Auth
```bash
# Check screenshot
open playwright/.auth/login-failure.png

# Run in headed mode
npx playwright test --project=setup --headed --debug
```

---

**Status**: Ready for implementation
**Estimated Time**: 10-15 minutes
**Difficulty**: Easy (mostly point-and-click)
