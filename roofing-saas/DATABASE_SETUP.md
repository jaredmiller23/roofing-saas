# Database Setup Guide

## Overview

This document explains how to set up the Roofing SaaS database schema in Supabase, including all Row-Level Security (RLS) policies.

## Initial Schema Deployment

The main database schema is defined in `/Users/ccai/Roofing SaaS/DATABASE_SCHEMA_v2.sql`. However, this schema has an **incomplete RLS configuration** that requires a migration to fix.

## The RLS Problem

The `DATABASE_SCHEMA_v2.sql` file:
1. ✅ Enables RLS on all tables (lines 597-613)
2. ✅ Defines `get_user_tenant_id()` function that queries `tenant_users` (lines 616-621)
3. ❌ Only creates policies for `contacts` table as an "example" (lines 624-638)
4. ❌ **Critical bug**: `tenant_users` has RLS enabled but no SELECT policy!

This creates a **circular dependency**:
- `get_user_tenant_id()` needs to query `tenant_users`
- But `tenant_users` has RLS enabled with no SELECT policy
- So the query is blocked, returning NULL
- Which blocks all other RLS checks
- **Result**: 403 Forbidden on all API routes!

## The Fix: Comprehensive RLS Migration

The migration `supabase/migrations/20251001_comprehensive_rls_policies.sql` fixes this globally by:

1. **First**: Adds SELECT policy to `tenant_users` (fixes circular dependency)
2. **Then**: Adds all four CRUD policies (SELECT, INSERT, UPDATE, DELETE) for every table

This ensures:
- No table has RLS enabled without policies
- The `get_user_tenant_id()` function works correctly
- All API routes can properly check tenant isolation

## Deployment Order

### Option 1: Fresh Database (Recommended for Development)

```sql
-- 1. Run the main schema (this enables RLS but leaves gaps)
-- Execute DATABASE_SCHEMA_v2.sql in Supabase SQL Editor

-- 2. Immediately run the comprehensive RLS migration
-- Execute supabase/migrations/20251001_comprehensive_rls_policies.sql
```

### Option 2: Existing Database

If you already ran the main schema and encountered 403 errors:

```sql
-- Just run the comprehensive RLS migration
-- Execute supabase/migrations/20251001_comprehensive_rls_policies.sql
```

The migration includes verification that will:
- List all tables and their policy counts
- Warn if any table has RLS but no policies
- Confirm success when complete

## Testing RLS Policies

After deployment, test with:

```sql
-- 1. Create a test user via Supabase Auth

-- 2. Create tenant membership
INSERT INTO tenant_users (tenant_id, user_id)
VALUES ('[your-tenant-id]', '[your-user-id]');

-- 3. Test queries (should work now)
SELECT * FROM contacts; -- Should return only contacts in your tenant
SELECT * FROM projects; -- Should return only projects in your tenant
```

## Why This Approach?

**Why not fix the original schema?**
- The original schema is a reference document
- Migrations allow versioned, incremental fixes
- Easier to track what changed and why

**Why one comprehensive migration instead of per-table?**
- Atomic: All tables get policies in one transaction
- Clear: One place to see all RLS rules
- Safe: No intermediate states where some tables work and others don't
- Faster: No need to go table-by-table during development

**Why the specific order in the migration?**
- `tenant_users` SELECT policy MUST come first to fix circular dependency
- Other policies depend on `get_user_tenant_id()` working
- Verification runs last to confirm all policies are in place

## Common Issues

### Issue: "403 Forbidden" on all API routes
**Cause**: RLS policies not deployed or tenant_users policy missing
**Fix**: Run comprehensive RLS migration

### Issue: "User not associated with tenant"
**Cause**: Missing entry in `tenant_users` table
**Fix**: Insert tenant membership record

### Issue: "RLS policy already exists"
**Cause**: Trying to re-run migration
**Fix**: Check `pg_policies` table to see what's already there

## Future Additions

When adding new tables:

1. Enable RLS: `ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;`
2. Add all four policies:
   ```sql
   CREATE POLICY "Users can view new_table in their tenant"
   ON new_table FOR SELECT
   USING (tenant_id = get_user_tenant_id());

   -- Repeat for INSERT, UPDATE, DELETE
   ```
3. Create a new dated migration file
4. Test thoroughly before deploying to production

## References

- Main Schema: `/Users/ccai/Roofing SaaS/DATABASE_SCHEMA_v2.sql`
- RLS Migration: `/Users/ccai/Roofing SaaS/roofing-saas/supabase/migrations/20251001_comprehensive_rls_policies.sql`
- Supabase RLS Docs: https://supabase.com/docs/guides/auth/row-level-security
