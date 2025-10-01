# Multi-Tenant Architecture Quick Reference
## Copy-Paste Code Snippets for Roofing CRM

**Last Updated**: October 1, 2025

This is your quick reference guide with ready-to-use code snippets for implementing multi-tenancy.

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Database Setup](#database-setup)
3. [Middleware](#middleware)
4. [Supabase Clients](#supabase-clients)
5. [Tenant Context](#tenant-context)
6. [API Routes](#api-routes)
7. [Server Actions](#server-actions)
8. [Common Patterns](#common-patterns)

---

## Environment Variables

**File**: `.env.local`

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App Domain
NEXT_PUBLIC_APP_DOMAIN=yourdomain.com

# Optional: Redis for caching
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## Database Setup

### 1. Create Tenants Table

```sql
-- tenants table
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  logo_url text,
  primary_color text DEFAULT '#3b82f6',
  secondary_color text DEFAULT '#8b5cf6',
  plan text DEFAULT 'free',
  is_active boolean DEFAULT true,
  trial_ends_at timestamptz,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{2,62}$')
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_active ON tenants(is_active) WHERE is_active = true;

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role access" ON tenants FOR ALL TO service_role USING (true);
CREATE POLICY "Users read own tenant" ON tenants FOR SELECT TO authenticated
USING (id = (current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'tenant_id')::uuid);
```

### 2. Create auth.tenant_id() Helper Function

```sql
CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(
      current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'tenant_id',
      ''
    ),
    NULL
  )::uuid;
$$;
```

### 3. Multi-Tenant Table Template

```sql
-- Replace 'example_table' with your table name
CREATE TABLE example_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Your columns here
  name text NOT NULL,

  -- Standard columns
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false
);

-- Indexes (CRITICAL: tenant_id FIRST)
CREATE INDEX idx_example_table_tenant_id ON example_table(tenant_id);
CREATE INDEX idx_example_table_tenant_created ON example_table(tenant_id, created_at DESC);
CREATE INDEX idx_example_table_tenant_active ON example_table(tenant_id, is_deleted) WHERE is_deleted = false;

-- RLS
ALTER TABLE example_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON example_table
FOR ALL TO authenticated
USING (tenant_id = auth.tenant_id())
WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "Service role access" ON example_table
FOR ALL TO service_role USING (true);

-- Updated_at trigger
CREATE TRIGGER update_example_table_updated_at
BEFORE UPDATE ON example_table
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Middleware

**File**: `middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';
const RESERVED = ['www', 'app', 'api', 'admin', 'mail', 'ftp', 'localhost'];

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  const subdomain = getSubdomain(hostname);

  // Root domain → serve marketing site
  if (!subdomain || subdomain === 'www') {
    if (url.pathname.startsWith('/_next') || url.pathname.startsWith('/api')) {
      return NextResponse.next();
    }
    url.pathname = `/home${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // Reserved subdomains
  if (RESERVED.includes(subdomain)) {
    url.pathname = `/_reserved/${subdomain}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // Tenant subdomain → rewrite to [tenant] route
  url.pathname = `/${subdomain}${url.pathname}`;
  const response = NextResponse.rewrite(url);
  response.headers.set('x-tenant-slug', subdomain);
  return response;
}

function getSubdomain(hostname: string): string | null {
  const host = hostname.split(':')[0];

  if (host.includes('localhost')) {
    const parts = host.split('.');
    return parts.length > 1 ? parts[0] : null;
  }

  const baseDomain = APP_DOMAIN.split(':')[0];
  const parts = host.split('.');
  const baseParts = baseDomain.split('.');

  if (parts.length > baseParts.length) {
    return parts[0];
  }

  return null;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

## Supabase Clients

### Server Client (Server Components, API Routes, Server Actions)

**File**: `lib/supabase/server.ts`

```typescript
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createServerClient() {
  const cookieStore = cookies();

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Handle cookie error (in middleware)
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Handle cookie error (in middleware)
          }
        },
      },
    }
  );
}
```

### Client Component Client

**File**: `lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

---

## Tenant Context

### Server Component (Recommended)

**File**: `app/[tenant]/layout.tsx`

```typescript
import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { getTenant } from '@/lib/tenants';

interface TenantLayoutProps {
  children: React.ReactNode;
  params: { tenant: string };
}

export default async function TenantLayout({
  children,
  params
}: TenantLayoutProps) {
  const tenant = await getTenant(params.tenant);
  if (!tenant) notFound();

  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  // Verify tenant access
  if (user.app_metadata?.tenant_id !== tenant.id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-2xl">Access Denied</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b p-4">
        <h1>{tenant.name}</h1>
      </header>
      <main>{children}</main>
    </div>
  );
}
```

### Client Context (When Needed)

**File**: `components/providers/tenant-provider.tsx`

```typescript
'use client';

import { createContext, useContext, ReactNode } from 'react';

interface Tenant {
  id: string;
  slug: string;
  name: string;
}

const TenantContext = createContext<{ tenant: Tenant } | undefined>(undefined);

export function TenantProvider({
  children,
  tenant
}: {
  children: ReactNode;
  tenant: Tenant;
}) {
  return (
    <TenantContext.Provider value={{ tenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) throw new Error('useTenant must be used within TenantProvider');
  return context;
}
```

### Tenant Helper

**File**: `lib/tenants.ts`

```typescript
import { createServerClient } from '@/lib/supabase/server';
import { unstable_cache } from 'next/cache';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  is_active: boolean;
}

export const getTenant = unstable_cache(
  async (slug: string): Promise<Tenant | null> => {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();
    return data;
  },
  ['tenant-by-slug'],
  { revalidate: 60, tags: ['tenants'] }
);
```

---

## API Routes

### GET Request

**File**: `app/api/[tenant]/contacts/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { tenant: string } }
) {
  const supabase = createServerClient();

  // Authenticate
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify tenant access
  if (user.app_metadata?.tenant_slug !== params.tenant) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Query (RLS automatically filters by tenant_id)
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }

  return NextResponse.json({ contacts });
}
```

### POST Request

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { tenant: string } }
) {
  const supabase = createServerClient();

  // Authenticate
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify tenant
  const tenantId = user.app_metadata?.tenant_id;
  if (!tenantId) {
    return NextResponse.json({ error: 'No tenant' }, { status: 400 });
  }

  // Parse body
  const body = await request.json();

  // Insert
  const { data: contact, error } = await supabase
    .from('contacts')
    .insert({
      ...body,
      tenant_id: tenantId,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }

  return NextResponse.json({ contact }, { status: 201 });
}
```

---

## Server Actions

**File**: `app/[tenant]/actions/contacts.ts`

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';

export async function createContact(formData: FormData) {
  const supabase = createServerClient();

  // Authenticate
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const tenantId = user.app_metadata?.tenant_id;
  if (!tenantId) return { error: 'No tenant' };

  // Extract data
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  // Insert
  const { data, error } = await supabase
    .from('contacts')
    .insert({ tenant_id: tenantId, name, email, created_by: user.id })
    .select()
    .single();

  if (error) return { error: 'Failed to create' };

  // Revalidate
  revalidatePath(`/${user.app_metadata?.tenant_slug}/contacts`);

  return { data };
}

export async function updateContact(id: string, updates: any) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data, error } = await supabase
    .from('contacts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return { error: 'Failed to update' };

  revalidatePath(`/${user.app_metadata?.tenant_slug}/contacts`);
  return { data };
}

export async function deleteContact(id: string) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Soft delete
  const { error } = await supabase
    .from('contacts')
    .update({ is_deleted: true })
    .eq('id', id);

  if (error) return { error: 'Failed to delete' };

  revalidatePath(`/${user.app_metadata?.tenant_slug}/contacts`);
  return { success: true };
}
```

**Usage in Form**:

```typescript
'use client';

import { createContact } from './actions/contacts';

export function ContactForm() {
  return (
    <form action={createContact}>
      <input name="name" required />
      <input name="email" type="email" />
      <button type="submit">Create Contact</button>
    </form>
  );
}
```

---

## Common Patterns

### 1. Tenant Registration

**File**: `app/api/tenants/create/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const { slug, name, ownerEmail, ownerPassword } = await request.json();

  try {
    // 1. Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({ slug, name, plan: 'free', is_active: true })
      .select()
      .single();

    if (tenantError) {
      return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
    }

    // 2. Create user with tenant_id in app_metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: ownerEmail,
      password: ownerPassword,
      options: {
        app_metadata: {
          tenant_id: tenant.id,
          tenant_slug: tenant.slug,
          role: 'owner',
        },
      },
    });

    if (authError) {
      // Rollback
      await supabase.from('tenants').delete().eq('id', tenant.id);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tenant: { id: tenant.id, slug: tenant.slug },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
```

### 2. Check Subdomain Availability

**File**: `app/api/tenants/check-availability/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

const RESERVED = ['www', 'app', 'api', 'admin', 'mail', 'ftp', 'localhost'];

export async function POST(request: NextRequest) {
  const { slug } = await request.json();

  if (!slug || !/^[a-z0-9][a-z0-9-]{2,62}$/.test(slug)) {
    return NextResponse.json({
      available: false,
      error: 'Invalid format (3-63 chars, lowercase, alphanumeric, hyphens)',
    });
  }

  if (RESERVED.includes(slug)) {
    return NextResponse.json({
      available: false,
      error: 'This subdomain is reserved',
    });
  }

  const supabase = createServerClient();
  const { data } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  return NextResponse.json({
    available: !data,
    message: data ? 'Subdomain taken' : 'Subdomain available',
  });
}
```

### 3. RLS Query Optimization

```sql
-- BAD: Function called for every row
CREATE POLICY "Tenant isolation" ON contacts
USING (tenant_id = auth.tenant_id());

-- GOOD: Function result cached
CREATE POLICY "Tenant isolation" ON contacts
USING (tenant_id = (SELECT auth.tenant_id()));
```

```sql
-- BAD: Relying only on RLS
SELECT * FROM contacts WHERE email = 'john@example.com';

-- GOOD: Explicit tenant_id filter
SELECT * FROM contacts
WHERE tenant_id = auth.tenant_id()
  AND email = 'john@example.com';
```

### 4. Rate Limiting

**File**: `lib/rate-limit.ts`

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const tenantLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  prefix: 'ratelimit:tenant',
});

export async function checkTenantRateLimit(tenantId: string) {
  const { success, limit, remaining, reset } = await tenantLimiter.limit(tenantId);
  return { success, limit, remaining, reset: new Date(reset) };
}
```

**Usage in API Route**:

```typescript
const rateLimit = await checkTenantRateLimit(tenantId);
if (!rateLimit.success) {
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    { status: 429 }
  );
}
```

### 5. Audit Logging

```typescript
// Log audit event
export async function logAudit(
  tenantId: string,
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  changes?: any
) {
  const supabase = createServerClient();
  await supabase.rpc('log_audit_event', {
    p_tenant_id: tenantId,
    p_user_id: userId,
    p_action: action,
    p_resource_type: resourceType,
    p_resource_id: resourceId,
    p_new_values: changes,
  });
}

// Usage
await logAudit(tenantId, user.id, 'create', 'contact', contact.id, contact);
```

---

## Testing

### Test Tenant Isolation

```typescript
// scripts/test-tenant-isolation.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testIsolation() {
  // Create two tenants
  const { data: tenant1 } = await supabase
    .from('tenants')
    .insert({ slug: 'test1', name: 'Test 1' })
    .select()
    .single();

  const { data: tenant2 } = await supabase
    .from('tenants')
    .insert({ slug: 'test2', name: 'Test 2' })
    .select()
    .single();

  // Create users
  const { data: user1 } = await supabase.auth.admin.createUser({
    email: 'user1@test.com',
    password: 'test123456',
    app_metadata: { tenant_id: tenant1.id },
  });

  const { data: user2 } = await supabase.auth.admin.createUser({
    email: 'user2@test.com',
    password: 'test123456',
    app_metadata: { tenant_id: tenant2.id },
  });

  // Create test data
  await supabase.from('contacts').insert({
    tenant_id: tenant1.id,
    name: 'Contact 1',
  });

  // Test: User 1 should only see Tenant 1 data
  const client1 = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  await client1.auth.signInWithPassword({
    email: 'user1@test.com',
    password: 'test123456',
  });

  const { data: contacts } = await client1.from('contacts').select('*');
  console.assert(contacts?.length === 1, 'Tenant isolation works!');

  // Cleanup
  await supabase.auth.admin.deleteUser(user1.user.id);
  await supabase.auth.admin.deleteUser(user2.user.id);
  await supabase.from('tenants').delete().eq('id', tenant1.id);
  await supabase.from('tenants').delete().eq('id', tenant2.id);
}

testIsolation();
```

---

## Deployment

### 1. Vercel Configuration

**File**: `vercel.json`

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "regions": ["iad1"]
}
```

### 2. DNS Setup (Cloudflare)

```
Type: CNAME
Name: *
Content: cname.vercel-dns.com
Proxy: DNS only (gray cloud)

Type: NS
Name: _acme-challenge
Content: ns1.vercel-dns.com
```

### 3. Environment Variables (Vercel Dashboard)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_DOMAIN
UPSTASH_REDIS_REST_URL (optional)
UPSTASH_REDIS_REST_TOKEN (optional)
```

---

## Troubleshooting

### Issue: RLS not working

**Check**:
```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Should show rowsecurity = true
```

**Fix**:
```sql
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
```

### Issue: Slow queries

**Check**:
```sql
EXPLAIN ANALYZE
SELECT * FROM contacts WHERE tenant_id = 'xxx' AND email = 'yyy';

-- Look for "Seq Scan" (bad) vs "Index Scan" (good)
```

**Fix**:
```sql
CREATE INDEX idx_contacts_tenant_email ON contacts(tenant_id, email);
```

### Issue: Cross-tenant data leak

**Test**:
```typescript
// Try to access another tenant's data
const { data } = await supabase
  .from('contacts')
  .select('*')
  .eq('id', 'contact-from-other-tenant-id');

// Should return empty (RLS blocks it)
console.assert(data === null || data.length === 0);
```

---

## Checklist

### Pre-Launch
- [ ] RLS enabled on all tables
- [ ] Indexes have tenant_id first
- [ ] API routes verify tenant access
- [ ] Tenant isolation tests pass
- [ ] Wildcard DNS configured
- [ ] SSL certificates issued
- [ ] Rate limiting configured
- [ ] Audit logging enabled

### Post-Launch
- [ ] Monitor query performance
- [ ] Track cross-tenant access attempts (should be 0)
- [ ] Monitor rate limit violations
- [ ] Review audit logs weekly
- [ ] Test subdomain provisioning
- [ ] Check tenant suspension workflow

---

**Need Help?** Refer to the full guide: `MULTI_TENANT_ARCHITECTURE_GUIDE.md`
