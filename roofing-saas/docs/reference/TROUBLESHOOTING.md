# Troubleshooting Guide

Common issues and their solutions for Roofing SaaS development.

## 🔴 500 Internal Server Error

### Symptom
Pages return 500 errors in browser, but build passes without issues.

### Common Causes

#### 1. Corrupted `.next/` Build Cache
**Cause:** Multiple dev servers running simultaneously
**Symptoms:**
```bash
GET /page 500 in 100ms
Error: Failed to load chunk server/chunks/ssr/[root-of-the-server]__xxx._.js
ENOENT: no such file or directory
```

**Solution:**
```bash
# Kill all processes on port 3000
lsof -ti:3000 | xargs kill -9

# Remove corrupted cache
rm -rf .next

# Start fresh
npm run dev
```

#### 2. Missing `'use client'` Directive
**Cause:** React hooks in server components
**Symptoms:**
- 500 error on page load
- Component uses `useState`, `useEffect`, `useDraggable`, etc.
- No error in TypeScript/build

**Solution:**
Add `'use client'` to top of file:
```typescript
'use client'

import { useState } from 'react'
// ... rest of file
```

#### 3. Supabase Client Issues
**Cause:** Missing environment variables or invalid configuration
**Check:**
```bash
# Verify .env.local exists and has:
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

## 🟡 Playwright Tests Passing but Page Broken

### Symptom
`npm run test:e2e` passes, but manual testing shows errors.

### Cause
Tests are too shallow - not checking enough.

### Solution
Ensure tests include:

```typescript
test('page works', async ({ page }) => {
  // 1. Check HTTP status
  const response = await page.goto('/page', { waitUntil: 'networkidle' })
  expect(response?.status()).toBe(200)

  // 2. Wait for full render
  await page.waitForLoadState('domcontentloaded')

  // 3. Verify visible content
  await expect(page.locator('h1')).toBeVisible()

  // 4. Listen for console errors
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  expect(errors.length).toBe(0)
})
```

## 🟠 Port Already in Use

### Symptom
```
Error: Port 3000 is already in use
```

### Solution
```bash
# Find process using port 3000
lsof -ti:3000

# Kill it
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

## 🟢 Database Migration Issues

### Schema Already Exists
**Symptom:** `ERROR: relation "table_name" already exists`

**Solution:**
```sql
-- Drop table first
DROP TABLE IF EXISTS table_name CASCADE;

-- Then create
CREATE TABLE table_name (...);
```

### RLS Policy Blocking Queries
**Symptom:** Empty results or 403 errors on all API routes

**Root Cause:**
The main database schema enables RLS on all tables but only defines policies for `contacts` as an example. Most critically, `tenant_users` has RLS enabled but no SELECT policy, which breaks the `get_user_tenant_id()` function that all other policies depend on.

**Solution:**
Deploy the comprehensive RLS migration that adds all missing policies:

```bash
# In Supabase SQL Editor, run:
# supabase/migrations/20251001_comprehensive_rls_policies.sql
```

This fixes the circular dependency and adds policies for all 17 tables in one atomic operation.

**Debug:**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check policies for a specific table
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Check tenant_users specifically (should have 2 SELECT policies)
SELECT * FROM pg_policies WHERE tablename = 'tenant_users';

-- Verify user has tenant membership
SELECT * FROM tenant_users WHERE user_id = auth.uid();
```

**See Also:** `DATABASE_SETUP.md` for full explanation of the RLS architecture and fix.

## 🔵 TypeScript Errors

### Module Not Found
**Symptom:** `Cannot find module '@/lib/...'`

**Check:**
1. Verify `tsconfig.json` has path mappings:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

2. Restart TypeScript server in VS Code:
   - Cmd+Shift+P
   - "TypeScript: Restart TS Server"

### Type Errors After Package Update
```bash
# Clear node_modules and reinstall
rm -rf node_modules
rm package-lock.json
npm install
```

## 🟣 Drag-and-Drop Not Working

### No Visual Feedback
**Check:** CSS is loaded, cursor changes to `grab`/`grabbing`

### Cards Not Moving
**Verify:**
1. `DndContext` wraps both `Draggable` and `Droppable`
2. IDs are unique strings
3. `onDragEnd` handler is implemented
4. Components have `'use client'` directive

### Drag Works But Doesn't Save
**Check:**
1. API endpoint exists (`/api/contacts/[id]`)
2. PATCH request succeeds (check Network tab)
3. Database has correct RLS policies
4. Optimistic update + error handling implemented

## 🔧 General Debugging Checklist

When something breaks:

1. **Check dev server logs** - Look for actual error messages
2. **Check browser console** - JavaScript errors show here
3. **Check Network tab** - See API request/response status codes
4. **Verify environment variables** - Restart dev server after changes
5. **Clear build cache** - `rm -rf .next` fixes many weird issues
6. **Check git status** - Did you accidentally modify important files?
7. **One dev server only** - Multiple servers cause corruption
8. **Test in incognito** - Rules out browser cache issues

## 📊 Performance Issues

### Slow Page Loads
1. Check bundle size: `npm run build` shows page sizes
2. Lazy load heavy components: `const Heavy = dynamic(() => import('./Heavy'))`
3. Optimize images: Use Next.js `<Image>` component

### Slow Database Queries
```sql
-- Add indexes to frequently queried columns
CREATE INDEX idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX idx_contacts_stage ON contacts(stage);

-- Check query performance
EXPLAIN ANALYZE SELECT * FROM contacts WHERE tenant_id = 'xxx';
```

## 🚨 Emergency: Everything Is Broken

### Nuclear Option
```bash
# 1. Kill all dev servers
lsof -ti:3000 | xargs kill -9

# 2. Clean everything
rm -rf .next
rm -rf node_modules
rm package-lock.json

# 3. Fresh install
npm install

# 4. Start clean
npm run dev
```

### Still Broken?
1. Check git for recent changes: `git log -5 --oneline`
2. Consider reverting last commit: `git revert HEAD`
3. Ask for help with specific error messages

---

**Remember:** When in doubt, clean restart with `rm -rf .next && npm run dev`
