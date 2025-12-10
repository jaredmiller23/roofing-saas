# Supabase Patterns & Conventions

**Applies to**: `**/supabase/**`, `**/lib/supabase/**`, `**/api/**`
**Last Updated**: December 10, 2025

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

## Auth Helpers

### Server Components (Next.js App Router)
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  // ...
}
```

### API Routes
```typescript
import { createRouteHandlerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createRouteHandlerClient();
  // ...
}
```

### Client Components
```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
```

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
