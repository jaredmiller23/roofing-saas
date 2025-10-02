# Territory Visibility Troubleshooting Guide

**Issue**: Territory created successfully but not showing in list view
**Date**: October 1, 2025 (Evening)
**Status**: 🔍 Investigating

---

## What We've Done So Far

1. ✅ **Created territories table** with proper RLS policies
2. ✅ **Fixed RLS recursion issue** on tenant_users table (previous session)
3. ✅ **Applied SELECT policy** to tenant_users table
4. ✅ **Enhanced debug logging** in territories API route
5. ✅ **Created diagnostic SQL script**

---

## Diagnostic Tools Available

### 1. SQL Diagnostic Script

**Location**: `supabase/diagnostics/territory_debug.sql`

**How to Use**:
1. Open Supabase Dashboard > SQL Editor
2. Copy and paste the entire content of `territory_debug.sql`
3. Click "Run"
4. Review the 10 diagnostic checks

**What It Checks**:
- ✅ Territories exist in database (bypassing RLS)
- ✅ Your current authenticated user ID
- ✅ Your tenant membership
- ✅ Territories visible with RLS enabled
- ✅ RLS policies on territories table
- ✅ RLS policies on tenant_users table
- ✅ Tenant ID matching
- ✅ RLS subquery test
- ✅ Territory count by tenant
- ✅ RLS enabled status

### 2. Enhanced API Debug Logging

**What Changed**: Updated `/app/api/territories/route.ts` with detailed logging

**What It Logs**:
```typescript
{
  resultCount: 0,           // Number of territories returned
  totalCount: 0,            // Total from query count
  tenantId: "uuid...",      // Tenant ID being queried
  userId: "uuid...",        // Current user ID
  hasData: false,           // Whether data array exists
  firstTerritory: {...}     // First territory if any
}
```

**How to See It**:
1. Refresh the `/territories` page in your browser
2. Check the terminal where `npm run dev` is running
3. Look for `[INFO] TERRITORIES DEBUG` or `=== TERRITORIES DEBUG ===`

---

## Troubleshooting Steps

### Step 1: Run SQL Diagnostic

**Action**: Run `supabase/diagnostics/territory_debug.sql` in Supabase SQL Editor

**Look For**:
- Check #1: Does it show any territories?
- Check #3: Does it show your tenant membership?
- Check #4: Does it show territories with RLS enabled?
- Check #7: Do the tenant IDs match?

**Expected Results**:

✅ **If Working Correctly**:
```sql
-- Check #1: Should show 1+ territories
-- Check #3: Should show your user_id + tenant_id
-- Check #4: Should show same territories as Check #1
-- Check #7: Should show "MATCH ✓"
```

❌ **If Broken**:
```sql
-- Check #1: Shows territories BUT
-- Check #4: Shows 0 territories
-- This means RLS is blocking the query
```

### Step 2: Check API Debug Output

**Action**: Refresh `/territories` page and check terminal output

**Look For**:
```
[INFO] TERRITORIES DEBUG {
  "resultCount": 0,    // <-- Should be 1 or more
  "tenantId": "...",   // <-- Note this UUID
  "userId": "..."      // <-- Note this UUID
}
```

**Compare**: Does the `tenantId` from the API match the `tenant_id` from SQL Check #3?

### Step 3: Verify Migration Applied

**Action**: Check if the SELECT policy exists

**SQL to Run**:
```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'tenant_users'
  AND policyname = 'Users can select their tenant membership';
```

**Expected**: Should return 1 row with the policy

**If Empty**: The migration didn't apply correctly, run it again:
```sql
-- Re-run the migration from:
-- supabase/migrations/20251001_fix_tenant_users_select_policy.sql
```

---

## Common Issues & Solutions

### Issue A: Migration Didn't Apply

**Symptoms**:
- SQL Check #6 doesn't show SELECT policy on tenant_users
- SQL Check #4 returns 0 territories

**Solution**:
```sql
-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their own tenant membership" ON tenant_users;
DROP POLICY IF EXISTS "Users can view members of their tenant" ON tenant_users;

-- Create the SELECT policy
CREATE POLICY "Users can select their tenant membership"
  ON tenant_users
  FOR SELECT
  USING (user_id = auth.uid());
```

### Issue B: Tenant ID Mismatch

**Symptoms**:
- SQL Check #7 shows "MISMATCH ✗"
- Territory was created with wrong tenant_id

**Solution**:
1. First, verify your correct tenant_id:
```sql
SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid();
```

2. Update the territory (replace UUIDs with actual values):
```sql
UPDATE territories
SET tenant_id = 'your-correct-tenant-id'
WHERE id = 'territory-id';
```

### Issue C: No Tenant Membership

**Symptoms**:
- SQL Check #3 returns 0 rows
- User is not linked to any tenant

**Solution**:
```sql
-- Insert tenant membership (replace with your actual IDs)
INSERT INTO tenant_users (user_id, tenant_id, role)
VALUES (
  auth.uid(),
  'your-tenant-id',
  'owner'
);
```

### Issue D: RLS Not Enabled

**Symptoms**:
- SQL Check #10 shows `rls_enabled = false`

**Solution**:
```sql
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
```

---

## Next Steps

**Priority 1** (5 minutes):
1. ✅ Run SQL diagnostic script
2. ✅ Note which checks pass/fail
3. ✅ Identify the issue from sections above

**Priority 2** (5 minutes):
1. ✅ Apply the appropriate fix
2. ✅ Re-run diagnostic script to verify
3. ✅ Refresh territories page

**Priority 3** (2 minutes):
1. ✅ Check API debug output
2. ✅ Verify territory shows in list

---

## Success Indicators

You'll know it's working when:

1. ✅ SQL Check #4 shows territories (with RLS enabled)
2. ✅ SQL Check #7 shows "MATCH ✓"
3. ✅ API debug shows `resultCount: 1` (or more)
4. ✅ Territory appears in the UI list

---

## Still Not Working?

If you've tried everything above and it's still not working:

1. **Capture diagnostic output**:
   - Run SQL diagnostic and save all results
   - Capture API debug logging from terminal
   - Take screenshot of empty territories list

2. **Check for errors**:
   - Browser console (F12 > Console tab)
   - Terminal where dev server is running
   - Supabase logs in Dashboard

3. **Verify basics**:
   ```sql
   -- Am I authenticated?
   SELECT auth.uid();  -- Should return your user UUID

   -- Do I have a tenant?
   SELECT * FROM tenant_users WHERE user_id = auth.uid();

   -- Do territories exist?
   SELECT COUNT(*) FROM territories;
   ```

---

## Technical Details

### Why This Happened

The territories RLS policies check tenant membership with:
```sql
tenant_id IN (
  SELECT tenant_id
  FROM tenant_users
  WHERE user_id = auth.uid()
)
```

This subquery needs a SELECT policy on `tenant_users` to work. When we fixed the recursive RLS policy in a previous session, we removed the problematic policy but didn't ensure a proper SELECT policy was in place.

### The Fix

Adding a simple, non-recursive SELECT policy to `tenant_users`:
```sql
CREATE POLICY "Users can select their tenant membership"
  ON tenant_users
  FOR SELECT
  USING (user_id = auth.uid());
```

This allows users to query their own tenant membership, which enables the territories RLS policies to work correctly.

---

**Last Updated**: October 1, 2025 (10:55 PM)
