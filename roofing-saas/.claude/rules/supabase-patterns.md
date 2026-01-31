# Supabase Patterns & Conventions

**Applies to**: `**/supabase/**`, `**/lib/supabase/**`, `**/api/**`
**Last Updated**: January 31, 2026

## Row Level Security (RLS)

### ALWAYS Use org_id for Multi-Tenant Isolation
```sql
-- Standard RLS policy pattern
CREATE POLICY "Users can only see their org's data" ON table_name
  FOR ALL USING (org_id = auth.jwt() ->> 'org_id');
```

### Never Trust Client-Side org_id
```typescript
// WRONG - trusting client input
const { data } = await supabase.from('contacts').insert({ ...input });

// RIGHT - extract org_id from auth context
const { data: { user } } = await supabase.auth.getUser();
const org_id = user?.user_metadata?.org_id;
const { data } = await supabase.from('contacts').insert({ ...input, org_id });
```

## Client Selection Guide

All Supabase clients use the `Database` generic type (from `lib/types/database.types.ts`)
for full type safety. Wrong column names are compile errors.

### When to use each client

| Context | Client | Import | RLS |
|---------|--------|--------|-----|
| Client component | `createClient()` | `@/lib/supabase/client` | Active (anon key) |
| Server component / API route | `createClient()` | `@/lib/supabase/server` | Active (user cookies) |
| System operation (no user) | `createAdminClient()` | `@/lib/supabase/server` | **Bypassed** |

### Client Components
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
```

### Server Components & API Routes
```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
```

### System Operations (Webhooks, Cron, Auth Admin API)
```typescript
import { createAdminClient } from '@/lib/supabase/server'

const supabase = await createAdminClient()
```

### When `createAdminClient` is legitimate
- Webhooks (Twilio, Stripe, Resend) — no user session
- Auth Admin API (`auth.admin.listUsers()`, `auth.admin.createUser()`)
- Billing/subscription operations triggered by system events
- ARIA streaming handlers (cannot reliably access user session cookies)
- Session management (creating/cleaning sessions during login flow)

### When `createAdminClient` is NOT legitimate
- API routes where the user is authenticated and has a tenantId
- Any query that already includes `.eq('tenant_id', tenantId)`
- Operations where RLS policies should handle access control

**Rule**: If the user is authenticated and you're adding `.eq('tenant_id', tenantId)`,
you should be using `createClient()`, not `createAdminClient()`. Fix the RLS policy
instead of bypassing it.

## Query Patterns

### Always Handle Errors
```typescript
const { data, error } = await supabase.from('contacts').select('*');
if (error) {
  console.error('Query failed:', error);
  throw new Error(error.message);
}
```

### Use `.single()` for Single Records
```typescript
const { data: contact, error } = await supabase
  .from('contacts')
  .select('*')
  .eq('id', id)
  .single();
```

### Relationship Queries
```typescript
// Join related tables
const { data } = await supabase
  .from('contacts')
  .select(`
    *,
    projects (id, name, status),
    activities (id, type, created_at)
  `)
  .eq('id', id)
  .single();
```

### FK Disambiguation (Multiple FKs to Same Table)
When a table has multiple foreign keys to the same target table, PostgREST cannot
resolve bare table names. Use `alias:fk_column(...)` syntax.

The `projects` table has two FKs to `contacts`: `contact_id` and `adjuster_contact_id`.
```typescript
// WRONG - PostgREST ambiguity error
.select('*, contacts(first_name, last_name)')

// CORRECT - disambiguate with FK column name
.select('*, contacts:contact_id(first_name, last_name)')

// CORRECT - both FKs with distinct aliases
.select(`
  *,
  contact:contact_id(first_name, last_name),
  adjuster:adjuster_contact_id(first_name, last_name)
`)
```

## Migrations

### Naming Convention
```
YYYYMMDDHHMMSS_descriptive_name.sql
Example: 20251210120000_add_substatus_system.sql
```

### Always Include Rollback Comments
```sql
-- Migration: Add substatus system
-- Rollback: DROP TABLE substatus; DROP TABLE contact_substatus;

CREATE TABLE substatus (...);
```

## Standard Table Fields

Every table should have:
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
org_id UUID NOT NULL REFERENCES organizations(id),
created_at TIMESTAMPTZ DEFAULT now(),
updated_at TIMESTAMPTZ DEFAULT now(),
created_by UUID REFERENCES auth.users(id),
is_deleted BOOLEAN DEFAULT false
```

## Soft Deletes

Always use `is_deleted` flag, never hard delete:
```typescript
// WRONG
await supabase.from('contacts').delete().eq('id', id);

// RIGHT
await supabase.from('contacts').update({ is_deleted: true }).eq('id', id);
```

Filter in queries:
```typescript
const { data } = await supabase
  .from('contacts')
  .select('*')
  .eq('is_deleted', false);
```
