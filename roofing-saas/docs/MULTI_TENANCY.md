# Multi-Tenancy Architecture - Complete Reference

**Last Updated**: 2025-12-18
**Status**: AUTHORITATIVE - This document is the source of truth for multi-tenancy

---

## Overview

This application is a **multi-tenant SaaS**. Each tenant (company) has completely isolated data. Users can belong to multiple tenants but see only one tenant's data at a time.

---

## Tenants

### Current Tenants

| Tenant ID | Name | Purpose | Status |
|-----------|------|---------|--------|
| `00000000-0000-0000-0000-000000000000` | **Appalachian Storm Restoration** | PRODUCTION - Real customer data | Active |
| `478d279b-5b8a-4040-a805-75d595d59702` | **Clarity AI Development** | SANDBOX - Testing & development | Active |

### Tenant Isolation Rules

1. **Every data table has `tenant_id`** - No exceptions
2. **RLS policies enforce isolation** - Database-level, cannot be bypassed
3. **API routes filter by tenant** - Application-level verification
4. **Users cannot see other tenants' data** - By design

---

## Users

### User-Tenant Relationship

Users are linked to tenants via the `tenant_users` table:

```sql
tenant_users (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT,           -- 'owner', 'admin', 'manager', 'user'
  status TEXT,         -- 'active', 'pending', 'deactivated', 'suspended'
  joined_at TIMESTAMP,
  UNIQUE(tenant_id, user_id)
)
```

### Current Users by Tenant

#### Appalachian Storm Restoration (Production)

| Email | Role | User ID | Notes |
|-------|------|---------|-------|
| fahredin@goappsr.com | owner | - | Business owner (Fahredin Nushi) |
| ted@goappsr.com | manager | - | Operations manager |
| austin@goappsr.com | admin | - | Admin staff |
| jaredmiller23@yahoo.com | admin | `29e3230c-02d2-4de9-8934-f61db9e9629f` | Developer (IN BOTH TENANTS) |

#### Clarity AI Development (Sandbox)

| Email | Role | User ID | Notes |
|-------|------|---------|-------|
| jaredmiller23@yahoo.com | owner | `29e3230c-02d2-4de9-8934-f61db9e9629f` | Developer (IN BOTH TENANTS) |
| claude-test@roofingsaas.com | admin | `5dc43384-1509-4da8-a795-71060988140a` | Automated testing |

### Multi-Tenant User Handling

**CRITICAL**: When a user belongs to multiple tenants, the system must determine which tenant to show.

**Current Logic** (in `lib/auth/session.ts`):
```typescript
// Returns the MOST RECENTLY JOINED tenant
.order('joined_at', { ascending: false })
.limit(1)
```

**Join Dates for Jared**:
- Clarity AI Development: `2025-10-01` (joined first)
- Appalachian Storm Restoration: `2025-12-18` (joined later)

**Result**: Jared sees Appalachian Storm Restoration data (most recent).

---

## Data Flow: End-to-End

### 1. Authentication Flow

```
User logs in
    ↓
Supabase Auth validates credentials
    ↓
Session created with user.id
    ↓
App calls getCurrentUser() → returns User object
    ↓
App calls getUserTenantId(user.id) → returns tenant_id
    ↓
All subsequent queries filter by tenant_id
```

### 2. getUserTenantId() - THE KEY FUNCTION

**Location**: `lib/auth/session.ts:57-73`

```typescript
export async function getUserTenantId(userId: string): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: false })  // MOST RECENT
    .limit(1)

  if (error || !data || data.length === 0) {
    return null
  }

  return data[0].tenant_id
}
```

**This function is called by EVERY API route** that needs to filter data by tenant.

### 3. API Route Pattern

Every protected API route follows this pattern:

```typescript
export async function GET(request: NextRequest) {
  // 1. Authenticate
  const user = await getCurrentUser()
  if (!user) {
    return errorResponse(new Error('Not authenticated'), 401)
  }

  // 2. Get tenant
  const tenantId = await getUserTenantId(user.id)
  if (!tenantId) {
    return errorResponse(new Error('No tenant found'), 403)
  }

  // 3. Query with tenant filter
  const { data } = await supabase
    .from('some_table')
    .select('*')
    .eq('tenant_id', tenantId)  // ALWAYS FILTER BY TENANT

  return successResponse({ data })
}
```

### 4. Row Level Security (RLS)

All tables have RLS policies that enforce tenant isolation at the database level:

```sql
-- Example policy for contacts table
CREATE POLICY "Users can only see contacts in their tenant"
ON contacts
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users
    WHERE user_id = auth.uid()
    AND status = 'active'
  )
);
```

**Double protection**: Even if API code has a bug, RLS prevents cross-tenant data access.

---

## Key Tables and Their tenant_id

| Table | Has tenant_id | Notes |
|-------|---------------|-------|
| `tenants` | N/A | This IS the tenants table |
| `tenant_users` | ✅ | Links users to tenants |
| `contacts` | ✅ | Customer/lead records |
| `projects` | ✅ | Jobs/opportunities |
| `territories` | ✅ | Sales territories |
| `pins` (knocks) | ✅ | Door knock records |
| `signature_templates` | ✅ | Document templates |
| `signature_documents` | ✅ | Signed documents |
| `workflows` | ✅ | Automation rules |
| `gamification_*` | ✅ | Points, achievements |

---

## Common Errors and Their Causes

### Error: "User not associated with tenant"

**Cause**: `getUserTenantId()` returned `null`

**Possible reasons**:
1. User has no entry in `tenant_users`
2. User's entry has `status != 'active'`
3. User was deleted from tenant

**Fix**: Check `tenant_users` table for the user's records.

### Error: Empty data when user knows they created records

**Cause**: Data is in a different tenant than the one being queried

**Example**: Jared created territories in Clarity AI Dev, but is now routed to Appalachian Storm.

**Fix**: Either:
1. Move data to correct tenant
2. Change tenant routing logic
3. Add tenant switcher UI

### Error: Data visible to wrong users

**Cause**: Missing or incorrect `tenant_id` on records

**Prevention**: ALWAYS include `tenant_id` when inserting data:
```typescript
const { data } = await supabase
  .from('contacts')
  .insert({
    ...contactData,
    tenant_id: tenantId  // NEVER FORGET THIS
  })
```

---

## Testing Strategy

### Test Account

For automated testing, use the dedicated test account:

| Field | Value |
|-------|-------|
| Email | `claude-test@roofingsaas.com` |
| Password | In `.env.test` (`TEST_USER_PASSWORD`) |
| User ID | `5dc43384-1509-4da8-a795-71060988140a` |
| Tenant | Clarity AI Development (sandbox) |

### Testing Rules

1. **NEVER test destructive operations in Appalachian Storm** - That's production data
2. **Use Clarity AI Development for all testing** - It's the sandbox
3. **Test account is isolated** - Can't accidentally affect production
4. **Verify tenant_id on all created data** - Ensure it goes to the right tenant

### Verification Commands

```bash
# Verify deployment works
npm run ops:verify

# Get auth token for API testing
npm run ops:auth

# Check user tenant memberships
npx tsx scripts/debug-tenant.ts
```

---

## Adding New Tables

When creating a new table that holds tenant data:

1. **Add tenant_id column**:
```sql
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  -- other columns
);
```

2. **Add RLS policies**:
```sql
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON new_table
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users
    WHERE user_id = auth.uid() AND status = 'active'
  )
);
```

3. **Update API routes** to filter by tenant_id

4. **Add to this documentation**

---

## Debugging Checklist

When tenant issues occur:

- [ ] Check which tenant the user is being routed to (logs or debug script)
- [ ] Verify the data exists in that tenant (query database)
- [ ] Check `tenant_users` for correct status and join dates
- [ ] Verify RLS policies are correct
- [ ] Check API route includes tenant filter
- [ ] Look for hardcoded tenant IDs in code

---

## Future Improvements

1. **Tenant Switcher UI** - Allow users in multiple tenants to switch between them
2. **Tenant Context Provider** - React context for current tenant
3. **Audit Logging** - Track which tenant data was accessed
4. **Tenant-specific Settings** - Different configurations per tenant

---

*This document should be updated whenever tenant-related changes are made.*
