# How to Deploy the RLS Migration

The comprehensive RLS migration is ready to deploy. Since the Supabase CLI isn't linked to the remote project, you'll need to deploy it manually through the Supabase Dashboard.

## Quick Deploy Instructions

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/wfifizczqvogbcqamnmw
   - Navigate to: **SQL Editor**

2. **Create New Query**
   - Click "New Query" button

3. **Copy Migration Content**
   - Open: `/Users/ccai/Roofing SaaS/roofing-saas/supabase/migrations/20251001_comprehensive_rls_policies.sql`
   - Copy all 310 lines

4. **Paste and Run**
   - Paste into SQL Editor
   - Click "Run" or press ⌘+Enter

5. **Verify Success**
   - You should see NOTICEs listing each table and its policy count
   - Final message should be: `SUCCESS: All tables with RLS have policies defined`

## What This Migration Does

- ✅ Fixes circular dependency (tenant_users SELECT policies)
- ✅ Adds RLS policies for all 17 tables
- ✅ Enables proper multi-tenant isolation
- ✅ Removes 403 Forbidden errors from API routes

## After Deployment

The application should work correctly with:
- ✅ Pipeline page loads contacts
- ✅ Dashboard loads data
- ✅ All API routes respect tenant isolation
- ✅ No 403 errors

## Alternative: Use psql

If you prefer command line:

```bash
# Get connection string from Supabase Dashboard > Settings > Database
# Then run:
psql "your-connection-string-here" < supabase/migrations/20251001_comprehensive_rls_policies.sql
```

---

**Status**: Migration file ready at `supabase/migrations/20251001_comprehensive_rls_policies.sql`

**Next**: I'll continue with QuickBooks OAuth integration while you deploy this migration at your convenience.
