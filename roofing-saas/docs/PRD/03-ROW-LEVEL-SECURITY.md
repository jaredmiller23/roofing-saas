# Row-Level Security (RLS) System

## Document Information
| Field | Value |
|-------|-------|
| Document Type | PRD Section |
| Section | 03 - Row-Level Security |
| Version | 1.0 |
| Last Updated | 2025-12-10 |
| Status | Complete |

---

## Overview

The Roofing SAAS implements **PostgreSQL Row-Level Security (RLS)** as the foundational mechanism for multi-tenant data isolation. RLS ensures that users can only access data belonging to their tenant, enforced at the database level regardless of how the data is queried.

### Key Principles

1. **Database-Level Enforcement**: Security policies are enforced by PostgreSQL, not application code
2. **Tenant Isolation**: Users can never access data from other tenants
3. **Zero Trust**: Even if application bugs exist, RLS prevents data leaks
4. **Transparent to Application**: Queries don't need tenant filters - RLS applies automatically

---

## Architecture

### Multi-Tenant Data Model

Every tenant-scoped table includes a `tenant_id` column that references the `tenants` table:

```sql
-- Example: contacts table structure
CREATE TABLE contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- ... other columns
);
```

### Core Tables

| Table | RLS Enabled | Tenant Column |
|-------|-------------|---------------|
| `tenants` | No (public) | N/A |
| `tenant_users` | Yes | `tenant_id` |
| `contacts` | Yes | `tenant_id` |
| `projects` | Yes | `tenant_id` |
| `activities` | Yes | `tenant_id` |
| `communications` | Yes | `tenant_id` |
| `documents` | Yes | `tenant_id` |
| `photos` | Yes | `tenant_id` |
| `campaigns` | Yes | `tenant_id` |
| `gamification_scores` | Yes | `tenant_id` |
| `gamification_activities` | Yes | `tenant_id` |
| `kpi_snapshots` | Yes | `tenant_id` |
| `report_schedules` | Yes | `tenant_id` |
| `voice_sessions` | Yes | `tenant_id` |
| `voice_conversations` | Yes | `session_id` (indirect) |
| `knowledge_base` | Yes | `tenant_id` |
| `commission_rules` | Yes | `tenant_id` |
| `commissions` | Yes | `tenant_id` |

---

## Core Helper Functions

### `get_user_tenant_id()`

The primary function used in all RLS policies to determine the current user's tenant.

**Location**: `DATABASE_SCHEMA_v2.sql:616`

```sql
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM tenant_users
  WHERE user_id = auth.uid()
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER;
```

**Behavior**:
- Returns the `tenant_id` from `tenant_users` for the authenticated user
- Uses `SECURITY DEFINER` to execute with elevated privileges
- Returns `NULL` if user has no tenant association (blocks all access)

### `auth.uid()`

Built-in Supabase function that returns the authenticated user's UUID from the JWT token.

**Usage**: Called by `get_user_tenant_id()` to identify the current user.

### `get_effective_user_id()`

Supports admin impersonation by returning either the impersonated user or the actual user.

**Location**: `20251119000200_admin_impersonation.sql:78`

```sql
CREATE OR REPLACE FUNCTION get_effective_user_id()
RETURNS UUID AS $$
DECLARE
  impersonated_user_id UUID;
  is_admin BOOLEAN;
BEGIN
  -- Try to get impersonated user ID from session variable
  BEGIN
    impersonated_user_id := current_setting('app.impersonated_user_id', true)::uuid;
  EXCEPTION
    WHEN OTHERS THEN
      impersonated_user_id := NULL;
  END;

  -- If impersonation is active, validate that current user is admin
  IF impersonated_user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM tenant_users
      WHERE user_id = auth.uid()
        AND role = 'admin'
    ) INTO is_admin;

    IF is_admin THEN
      RETURN impersonated_user_id;
    END IF;
  END IF;

  -- Default: return actual authenticated user
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### `set_impersonation_session()`

Sets PostgreSQL session variables for impersonation.

**Location**: `20251119000200_admin_impersonation.sql:153`

```sql
CREATE OR REPLACE FUNCTION set_impersonation_session(
  p_admin_user_id UUID,
  p_impersonated_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.impersonated_user_id', p_impersonated_user_id::text, false);
  PERFORM set_config('app.admin_user_id', p_admin_user_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## RLS Policy Patterns

### Standard CRUD Policy Pattern

Every tenant-scoped table follows this consistent pattern:

```sql
-- Enable RLS on the table
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view records in their tenant
CREATE POLICY "Users can view [table] in their tenant"
  ON table_name FOR SELECT
  USING (tenant_id = get_user_tenant_id());

-- INSERT: Users can create records in their tenant
CREATE POLICY "Users can insert [table] in their tenant"
  ON table_name FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

-- UPDATE: Users can modify records in their tenant
CREATE POLICY "Users can update [table] in their tenant"
  ON table_name FOR UPDATE
  USING (tenant_id = get_user_tenant_id());

-- DELETE: Users can remove records in their tenant
CREATE POLICY "Users can delete [table] in their tenant"
  ON table_name FOR DELETE
  USING (tenant_id = get_user_tenant_id());
```

### User-Specific Policies

Some tables restrict operations to the record owner:

```sql
-- Gamification: Users can only insert/update their own scores
CREATE POLICY "Users can insert their own gamification scores"
ON gamification_scores FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id() AND user_id = auth.uid());

CREATE POLICY "Users can update their own gamification scores"
ON gamification_scores FOR UPDATE
USING (tenant_id = get_user_tenant_id() AND user_id = auth.uid());
```

### Indirect Tenant Policies

Tables without direct `tenant_id` use subqueries:

```sql
-- Voice conversations reference sessions which have tenant_id
CREATE POLICY "Users can view voice conversations in their sessions"
ON voice_conversations FOR SELECT
USING (
  session_id IN (
    SELECT id FROM voice_sessions WHERE tenant_id = get_user_tenant_id()
  )
);
```

---

## Critical Bug: Circular Dependency

### The Problem

Initial RLS implementation had a **circular dependency** that blocked all queries:

1. `get_user_tenant_id()` queries `tenant_users` table
2. `tenant_users` has RLS enabled
3. RLS on `tenant_users` calls `get_user_tenant_id()`
4. **Infinite loop / immediate failure**

### The Solution

The `tenant_users` table needed a special policy that doesn't use `get_user_tenant_id()`:

```sql
-- Special policy for tenant_users that avoids circular dependency
CREATE POLICY "Users can view their own tenant membership"
  ON tenant_users FOR SELECT
  USING (user_id = auth.uid());
```

**Documentation**: `/Users/ccai/roofing saas/roofing-saas/docs/reference/RLS_FIX_SUMMARY.md`

### Verification

After the fix, 46/50 E2E tests pass successfully.

---

## Server-Side Implementation

### Supabase Client Configuration

**File**: `/Users/ccai/roofing saas/roofing-saas/lib/supabase/server.ts`

```typescript
export async function createClient() {
  const cookieStore = await cookies()

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Handled by middleware
          }
        },
      },
    }
  )

  // Handle impersonation sessions
  const impersonationCookie = cookieStore.get(IMPERSONATION_COOKIE_NAME)
  if (impersonationCookie) {
    // Set Postgres session variables for RLS
    await client.rpc('set_impersonation_session', {
      p_admin_user_id: sessionData.admin_user_id,
      p_impersonated_user_id: sessionData.impersonated_user_id,
    })
  }

  return client
}
```

### Admin Client (Bypasses RLS)

```typescript
export async function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,  // Service role bypasses RLS
    { cookies: { /* ... */ } }
  )
}
```

**Warning**: The admin client should only be used for:
- Creating users programmatically
- Bulk data operations
- System-level queries

---

## JWT Claims and Tenant Context

### Tenant ID in JWT

User's tenant is stored in JWT claims for quick access:

```typescript
// Reading tenant from JWT
const userTenantId = user.app_metadata?.tenant_id;
```

### Application-Level Validation

Beyond RLS, the application validates tenant access:

```typescript
// app/[tenant]/layout.tsx
export default async function TenantLayout({ children, params }) {
  const tenant = await getTenant(params.tenant);

  if (!tenant) {
    notFound();
  }

  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const userTenantId = user.app_metadata?.tenant_id;
  if (userTenantId !== tenant.id) {
    // Access denied - user doesn't belong to this tenant
    return <AccessDenied />;
  }

  return children;
}
```

---

## Verification Queries

### Check RLS Status on All Tables

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### List All Policies

```sql
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Verify Tables Have Policies

```sql
DO $$
DECLARE
  table_record RECORD;
  policy_count INTEGER;
  tables_without_policies TEXT := '';
BEGIN
  FOR table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND rowsecurity = true
  LOOP
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = table_record.tablename;

    IF policy_count = 0 THEN
      tables_without_policies := tables_without_policies || table_record.tablename || ', ';
    END IF;

    RAISE NOTICE 'Table: % - Policies: %', table_record.tablename, policy_count;
  END LOOP;

  IF tables_without_policies != '' THEN
    RAISE WARNING 'Tables with RLS enabled but no policies: %', RTRIM(tables_without_policies, ', ');
  ELSE
    RAISE NOTICE 'SUCCESS: All tables with RLS have policies defined';
  END IF;
END $$;
```

---

## Security Considerations

### What RLS Protects Against

1. **Cross-Tenant Data Access**: Users cannot query other tenants' data
2. **SQL Injection**: Even if injection occurs, RLS limits scope to user's tenant
3. **Application Bugs**: Forgotten WHERE clauses don't leak data
4. **API Misuse**: Direct database queries are still protected

### What RLS Does NOT Protect Against

1. **Service Role Access**: Admin client bypasses RLS
2. **Database Admin Access**: Superusers bypass RLS
3. **Application Logic Bugs**: Within-tenant authorization (e.g., role checks)
4. **Data Leaks via Application**: If app exposes data in responses

### Best Practices

1. **Always use Anon Key for user queries** - Never service role in client code
2. **Validate tenant context in middleware** - Defense in depth
3. **Audit service role usage** - Log all admin client operations
4. **Test RLS policies** - Include in E2E test suite
5. **Never hardcode tenant IDs** - Always derive from auth context

---

## Migration Files

| Migration | Purpose |
|-----------|---------|
| `DATABASE_SCHEMA_v2.sql` | Initial schema with RLS setup |
| `20251001_comprehensive_rls_policies.sql` | Fixed circular dependency, complete policy set |
| `20251119000200_admin_impersonation.sql` | Impersonation helper functions |

---

## Testing

### E2E Test Coverage

- **46/50 tests passing** after RLS implementation
- Tests verify cross-tenant isolation
- Tests verify user can access own tenant data

### Manual Testing

1. Create two test tenants
2. Add test user to each
3. Verify User A cannot see User B's data
4. Verify queries without tenant filters return correct data

---

## File References

### Database Schema
| File Path | Purpose |
|-----------|---------|
| `/Users/ccai/roofing saas/DATABASE_SCHEMA_v2.sql` | Main schema with RLS definitions |
| `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/archive/20251001_comprehensive_rls_policies.sql` | Complete RLS policy migration |
| `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251119000200_admin_impersonation.sql` | Impersonation functions |

### Server Implementation
| File Path | Purpose |
|-----------|---------|
| `/Users/ccai/roofing saas/roofing-saas/lib/supabase/server.ts` | Server-side Supabase client |
| `/Users/ccai/roofing saas/roofing-saas/lib/supabase/client.ts` | Client-side Supabase client |

### Documentation
| File Path | Purpose |
|-----------|---------|
| `/Users/ccai/roofing saas/docs/architecture/MULTI_TENANT_ARCHITECTURE_GUIDE.md` | Architecture overview |
| `/Users/ccai/roofing saas/roofing-saas/docs/RLS_SETUP_COMPLETE.md` | RLS implementation summary |
| `/Users/ccai/roofing saas/roofing-saas/docs/reference/RLS_FIX_SUMMARY.md` | Circular dependency fix |

---

## Validation Record

### Files Examined
- `DATABASE_SCHEMA_v2.sql` - Core schema and `get_user_tenant_id()` function
- `20251001_comprehensive_rls_policies.sql` - All 17 table policies
- `20251119000200_admin_impersonation.sql` - Impersonation helper functions
- `lib/supabase/server.ts` - Server client with impersonation support
- `MULTI_TENANT_ARCHITECTURE_GUIDE.md` - Architecture patterns
- `RLS_SETUP_COMPLETE.md` - Implementation status
- `RLS_FIX_SUMMARY.md` - Circular dependency fix documentation

### Grep Searches Performed
- `auth.tenant_id|ENABLE ROW LEVEL SECURITY|CREATE POLICY` - 51 files found
- `get_user_tenant_id|CREATE OR REPLACE FUNCTION` - Function definitions located

### Key Claims Validated
1. **RLS enabled on 17+ tables**: Confirmed in migration file
2. **`get_user_tenant_id()` pattern**: Confirmed in all policies
3. **Circular dependency fix**: Documented in RLS_FIX_SUMMARY.md
4. **Impersonation support**: Functions exist in admin_impersonation migration
5. **E2E test coverage**: 46/50 passing per RLS_SETUP_COMPLETE.md

### Validated By
Manual PRD Documentation (Claude) - Session 5
Date: 2025-12-10

---

*Generated for Roofing SAAS PRD*
*Archon Project ID: 15037fc7-6bb3-42ff-8ed9-dcf06e6c96b1*
