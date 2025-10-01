# Multi-Tenant SaaS Architecture Guide
## Next.js 14 + Supabase + Vercel

**Purpose**: Comprehensive guide for implementing production-ready multi-tenant architecture for the Roofing CRM SaaS.

**Last Updated**: October 1, 2025

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tenant Isolation Strategies](#tenant-isolation-strategies)
3. [Subdomain Routing Implementation](#subdomain-routing-implementation)
4. [Tenant Context Management](#tenant-context-management)
5. [Database Design](#database-design)
6. [Tenant Onboarding Flow](#tenant-onboarding-flow)
7. [Performance Optimization](#performance-optimization)
8. [Security Considerations](#security-considerations)
9. [Common Mistakes & Solutions](#common-mistakes--solutions)
10. [Production Checklist](#production-checklist)

---

## Architecture Overview

### Tech Stack Decision
```
Frontend:   Next.js 14 App Router + Tailwind CSS + shadcn/ui
Backend:    Supabase (PostgreSQL + Auth + Storage + Edge Functions)
Deployment: Vercel (Edge Functions + Wildcard Domains)
Auth:       Supabase Auth with JWT + app_metadata
Cache:      Vercel Edge Cache + Optional Redis
```

### Multi-Tenancy Pattern
**Chosen Approach**: **Subdomain-based routing with RLS isolation**

```
acme-roofing.yourdomain.com     → Tenant: acme-roofing
elite-construction.yourdomain.com → Tenant: elite-construction
app.yourdomain.com              → Main landing/marketing site
```

**Why this approach?**
- Clear tenant separation (better UX)
- SEO benefits per tenant
- Custom branding per subdomain
- Easier to scale with CDN
- Natural authentication boundaries

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                    User Request                              │
│              tenant1.yourdomain.com/dashboard                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Vercel Edge Network                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Next.js Middleware (middleware.ts)                  │   │
│  │  • Extract subdomain from hostname                   │   │
│  │  • Validate tenant existence (cache check)           │   │
│  │  • Set tenant context in headers                     │   │
│  │  • Rewrite to /[tenant]/dashboard                    │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js App Router                              │
│  app/[tenant]/                                               │
│    ├── layout.tsx      (Tenant Context Provider)            │
│    ├── dashboard/                                            │
│    ├── contacts/                                             │
│    └── projects/                                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                Supabase (PostgreSQL)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Row Level Security (RLS)                            │   │
│  │  • auth.tenant_id() = table.tenant_id                │   │
│  │  • JWT claims: app_metadata.tenant_id                │   │
│  │  • Automatic filtering on all queries                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Tenant Isolation Strategies

### 1. Database-Level Isolation: Row-Level Security (RLS)

**Approach**: Single database, shared tables, isolated by `tenant_id` column with PostgreSQL RLS.

#### Advantages
- ✅ Cost-effective (single database)
- ✅ Easy to manage and deploy
- ✅ Built-in PostgreSQL feature
- ✅ Automatic enforcement at database level
- ✅ Works with all Supabase features

#### Disadvantages
- ⚠️ All tenants share same database resources
- ⚠️ Performance degradation affects all tenants
- ⚠️ Requires careful index strategy
- ⚠️ Potential for "noisy neighbor" issues

#### Implementation

**Step 1: Create tenant_id helper function**
```sql
-- Extract tenant_id from JWT claims
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

**Step 2: Add tenant_id to all tables**
```sql
-- Example: contacts table
CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- CRITICAL: Create index with tenant_id FIRST
CREATE INDEX idx_contacts_tenant_id_created_at
ON contacts(tenant_id, created_at DESC);

CREATE INDEX idx_contacts_tenant_id_email
ON contacts(tenant_id, email) WHERE email IS NOT NULL;
```

**Step 3: Enable RLS and create policies**
```sql
-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their tenant's data
CREATE POLICY "Tenant isolation policy"
ON contacts
FOR ALL
TO authenticated
USING (tenant_id = auth.tenant_id());

-- Policy: Service role bypasses RLS
CREATE POLICY "Service role full access"
ON contacts
FOR ALL
TO service_role
USING (true);
```

**Step 4: Create RLS policy for all operations**
```sql
-- Comprehensive policy for SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "Tenant data access"
ON contacts
FOR ALL
TO authenticated
USING (tenant_id = auth.tenant_id())
WITH CHECK (tenant_id = auth.tenant_id());
```

### 2. Performance Implications of RLS

#### RLS Overhead
- RLS adds `WHERE tenant_id = '...'` to every query automatically
- Minimal overhead if indexes are properly configured
- Can cause performance issues with:
  - Complex join queries
  - Subqueries that check RLS on multiple tables
  - Missing indexes on tenant_id

#### Optimization Techniques

**A. Wrap functions in SELECT for caching**
```sql
-- ❌ BAD: Function called for every row
CREATE POLICY "Tenant isolation"
ON contacts
USING (tenant_id = auth.tenant_id());

-- ✅ GOOD: Function result cached
CREATE POLICY "Tenant isolation"
ON contacts
USING (tenant_id = (SELECT auth.tenant_id()));
```

**B. Add explicit WHERE clauses (duplicate filtering)**
```sql
-- Even though RLS adds tenant_id filter, add it explicitly
-- This helps PostgreSQL query planner create better execution plans
SELECT * FROM contacts
WHERE tenant_id = auth.tenant_id()  -- Explicit filter
  AND email = 'john@example.com';   -- Even though RLS already filters by tenant_id
```

**C. Use security definer functions for complex queries**
```sql
-- Move complex joins to security definer functions
CREATE OR REPLACE FUNCTION get_tenant_contacts()
RETURNS TABLE (
  id uuid,
  name text,
  project_count bigint
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    COUNT(p.id) as project_count
  FROM contacts c
  LEFT JOIN projects p ON p.contact_id = c.id
  WHERE c.tenant_id = auth.tenant_id()
    AND p.tenant_id = auth.tenant_id()  -- Explicit filter helps performance
  GROUP BY c.id, c.name;
END;
$$;
```

**D. Optimize join patterns**
```sql
-- ✅ GOOD: Use IN with subquery
SELECT * FROM contacts
WHERE team_id IN (
  SELECT team_id FROM team_users
  WHERE user_id = auth.uid() AND tenant_id = auth.tenant_id()
);

-- ❌ BAD: Correlated subquery (row-by-row check)
SELECT * FROM contacts c
WHERE auth.uid() IN (
  SELECT user_id FROM team_users
  WHERE team_id = c.team_id AND tenant_id = c.tenant_id
);
```

### 3. Alternative Isolation Strategies

#### Database-per-Tenant (Not Recommended for This Project)
- Separate Supabase project per tenant
- Maximum isolation but expensive and complex
- Only use for enterprise customers with specific compliance needs

#### Schema-per-Tenant (Not Recommended)
- Single database, separate schema per tenant
- Requires connection pooling per schema
- Adds complexity without significant benefits over RLS

---

## Subdomain Routing Implementation

### 1. DNS Configuration

#### Vercel Wildcard Domain Setup

**Requirements**:
- Custom domain (e.g., `yourcompany.com`)
- DNS provider (Cloudflare, Route53, etc.)
- Vercel Pro plan (for wildcard domains)

**Step 1: Add domain to Vercel**
```bash
# In Vercel Dashboard:
# Project Settings > Domains > Add Domain
# Add: yourcompany.com
# Add: *.yourcompany.com (wildcard)
```

**Step 2: Configure DNS**

**Option A: Vercel Nameservers (Recommended)**
```
# Change nameservers to Vercel's
ns1.vercel-dns.com
ns2.vercel-dns.com
```

**Option B: CNAME Records (If you can't change nameservers)**
```
# DNS Records:
@       A       76.76.21.21
*.yourcompany.com  CNAME  cname.vercel-dns.com.

# For SSL wildcard certificates, delegate ACME challenge:
_acme-challenge   NS   ns1.vercel-dns.com.
_acme-challenge   NS   ns2.vercel-dns.com.
```

**Step 3: Wait for propagation** (5-60 minutes)

**Step 4: Test subdomain routing**
```bash
# Test different subdomains
curl -I https://tenant1.yourcompany.com
curl -I https://tenant2.yourcompany.com
curl -I https://app.yourcompany.com
```

### 2. Next.js Middleware Implementation

**File**: `middleware.ts` (root directory)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Environment-specific domain configuration
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';
const APP_DOMAIN_BASE = APP_DOMAIN.split(':')[0]; // Remove port for local dev

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // Extract subdomain
  const subdomain = getSubdomain(hostname, APP_DOMAIN_BASE);

  console.log('[Middleware]', {
    hostname,
    subdomain,
    pathname: url.pathname,
  });

  // Handle root domain (landing page)
  if (!subdomain || subdomain === 'www') {
    // Serve marketing site
    if (url.pathname.startsWith('/_next') ||
        url.pathname.startsWith('/api') ||
        url.pathname.startsWith('/static')) {
      return NextResponse.next();
    }

    // Rewrite to marketing pages
    url.pathname = `/home${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // Handle reserved subdomains
  if (['app', 'admin', 'api', 'www', 'mail', 'ftp'].includes(subdomain)) {
    // Serve special pages
    url.pathname = `/_reserved/${subdomain}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // Handle tenant subdomains
  // Rewrite to tenant-specific routes
  url.pathname = `/${subdomain}${url.pathname}`;

  // Add tenant context to headers (accessible in app)
  const response = NextResponse.rewrite(url);
  response.headers.set('x-tenant-slug', subdomain);

  return response;
}

/**
 * Extract subdomain from hostname
 * Examples:
 *   tenant1.myapp.com → tenant1
 *   tenant1.localhost:3000 → tenant1
 *   myapp.com → null
 *   www.myapp.com → www
 */
function getSubdomain(hostname: string, baseDomain: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];

  // Handle localhost development
  if (host.includes('localhost')) {
    const parts = host.split('.');
    if (parts.length > 1) {
      return parts[0]; // tenant.localhost → tenant
    }
    return null;
  }

  // Production: extract subdomain
  const parts = host.split('.');
  const baseParts = baseDomain.split('.');

  // If hostname has more parts than base domain, first part is subdomain
  if (parts.length > baseParts.length) {
    return parts[0];
  }

  return null;
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### 3. Next.js Configuration

**File**: `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode
  reactStrictMode: true,

  // Image domains for multi-tenant
  images: {
    domains: [
      'wfifizczqvogbcqamnmw.supabase.co', // Supabase storage
      // Add tenant custom domains here
    ],
  },

  // Rewrites for multi-tenant (if needed)
  async rewrites() {
    return {
      beforeFiles: [
        // API routes should not be rewritten
        {
          source: '/api/:path*',
          destination: '/api/:path*',
        },
      ],
    };
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### 4. Local Development Setup

**File**: `/etc/hosts` (or `C:\Windows\System32\drivers\etc\hosts` on Windows)

```
# Add local tenant subdomains for testing
127.0.0.1 tenant1.localhost
127.0.0.1 tenant2.localhost
127.0.0.1 acme-roofing.localhost
127.0.0.1 app.localhost
```

**Test locally**:
```bash
npm run dev
# Visit: http://tenant1.localhost:3000
# Visit: http://acme-roofing.localhost:3000
```

### 5. Vercel Deployment Configuration

**File**: `vercel.json` (optional, for advanced configuration)

```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "app/**/*.ts": {
      "maxDuration": 10
    }
  }
}
```

---

## Tenant Context Management

### 1. Server Component Tenant Context

**Pattern**: Pass tenant data through props (no React Context needed)

**File**: `app/[tenant]/layout.tsx`

```typescript
import { notFound } from 'next/navigation';
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
  // Fetch tenant data server-side
  const tenant = await getTenant(params.tenant);

  if (!tenant) {
    notFound(); // 404 if tenant doesn't exist
  }

  // Verify user has access to this tenant
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Check user's tenant access
  const userTenantId = user.app_metadata?.tenant_id;
  if (userTenantId !== tenant.id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p>You don't have access to this tenant.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Tenant-specific styling */}
      <style jsx global>{`
        :root {
          --tenant-primary: ${tenant.primary_color || '#3b82f6'};
          --tenant-secondary: ${tenant.secondary_color || '#8b5cf6'};
        }
      `}</style>

      {/* Header with tenant branding */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {tenant.logo_url && (
              <img
                src={tenant.logo_url}
                alt={tenant.name}
                className="h-8"
              />
            )}
            <h1 className="text-xl font-bold">{tenant.name}</h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>
    </div>
  );
}

// Generate static params for known tenants (optional, for SSG)
export async function generateStaticParams() {
  // Fetch all tenant slugs
  const supabase = createServerClient();
  const { data: tenants } = await supabase
    .from('tenants')
    .select('slug')
    .eq('is_active', true);

  return tenants?.map(t => ({ tenant: t.slug })) || [];
}
```

**File**: `lib/tenants.ts`

```typescript
import { createServerClient } from '@/lib/supabase/server';
import { unstable_cache } from 'next/cache';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  is_active: boolean;
  created_at: string;
}

/**
 * Get tenant by slug (cached for 60 seconds)
 */
export const getTenant = unstable_cache(
  async (slug: string): Promise<Tenant | null> => {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  },
  ['tenant-by-slug'],
  {
    revalidate: 60, // Cache for 60 seconds
    tags: ['tenants'],
  }
);

/**
 * Validate tenant access for current user
 */
export async function validateTenantAccess(
  tenantId: string,
  userId: string
): Promise<boolean> {
  const supabase = createServerClient();

  // Check if user's tenant_id matches
  const { data: user } = await supabase.auth.getUser();

  if (!user?.user) return false;

  const userTenantId = user.user.app_metadata?.tenant_id;
  return userTenantId === tenantId;
}
```

### 2. Client Component Tenant Context

**Pattern**: Use React Context for client components

**File**: `components/providers/tenant-provider.tsx`

```typescript
'use client';

import { createContext, useContext, ReactNode } from 'react';

interface Tenant {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
}

interface TenantContextType {
  tenant: Tenant;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
  tenant: Tenant;
}

export function TenantProvider({ children, tenant }: TenantProviderProps) {
  return (
    <TenantContext.Provider value={{ tenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
```

**Usage in layout**:

```typescript
// app/[tenant]/layout.tsx
import { TenantProvider } from '@/components/providers/tenant-provider';

export default async function TenantLayout({ children, params }) {
  const tenant = await getTenant(params.tenant);

  return (
    <TenantProvider tenant={tenant}>
      {children}
    </TenantProvider>
  );
}
```

**Usage in client components**:

```typescript
'use client';

import { useTenant } from '@/components/providers/tenant-provider';

export function ContactForm() {
  const { tenant } = useTenant();

  return (
    <form>
      <h2>Add Contact to {tenant.name}</h2>
      {/* Form fields */}
    </form>
  );
}
```

### 3. API Route Tenant Context

**File**: `app/api/[tenant]/contacts/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { tenant: string } }
) {
  const supabase = createServerClient();

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Verify tenant access
  const userTenantSlug = user.app_metadata?.tenant_slug;
  if (userTenantSlug !== params.tenant) {
    return NextResponse.json(
      { error: 'Forbidden - Invalid tenant access' },
      { status: 403 }
    );
  }

  // Query contacts (RLS automatically filters by tenant_id)
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }

  return NextResponse.json({ contacts });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { tenant: string } }
) {
  const supabase = createServerClient();

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Get tenant_id from user's app_metadata
  const tenantId = user.app_metadata?.tenant_id;
  if (!tenantId) {
    return NextResponse.json(
      { error: 'No tenant associated with user' },
      { status: 400 }
    );
  }

  // Parse request body
  const body = await request.json();

  // Insert contact (tenant_id is automatically set by RLS)
  const { data: contact, error } = await supabase
    .from('contacts')
    .insert({
      ...body,
      tenant_id: tenantId, // Explicitly set tenant_id
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    );
  }

  return NextResponse.json({ contact }, { status: 201 });
}
```

### 4. Server Actions with Tenant Context

**File**: `app/[tenant]/actions/contacts.ts`

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';

export async function createContact(formData: FormData) {
  const supabase = createServerClient();

  // Verify authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Get tenant_id from user
  const tenantId = user.app_metadata?.tenant_id;
  if (!tenantId) {
    return { error: 'No tenant associated with user' };
  }

  // Extract form data
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;

  // Insert contact
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      tenant_id: tenantId,
      name,
      email,
      phone,
    })
    .select()
    .single();

  if (error) {
    return { error: 'Failed to create contact' };
  }

  // Revalidate the contacts page
  revalidatePath(`/${user.app_metadata?.tenant_slug}/contacts`);

  return { data };
}

export async function updateContact(
  contactId: string,
  formData: FormData
) {
  const supabase = createServerClient();

  // Verify authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Extract form data
  const updates = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    phone: formData.get('phone') as string,
    updated_at: new Date().toISOString(),
  };

  // Update contact (RLS ensures tenant isolation)
  const { data, error } = await supabase
    .from('contacts')
    .update(updates)
    .eq('id', contactId)
    .select()
    .single();

  if (error) {
    return { error: 'Failed to update contact' };
  }

  // Revalidate the contacts page
  revalidatePath(`/${user.app_metadata?.tenant_slug}/contacts`);

  return { data };
}

export async function deleteContact(contactId: string) {
  const supabase = createServerClient();

  // Verify authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Soft delete (RLS ensures tenant isolation)
  const { error } = await supabase
    .from('contacts')
    .update({ is_deleted: true })
    .eq('id', contactId);

  if (error) {
    return { error: 'Failed to delete contact' };
  }

  // Revalidate the contacts page
  revalidatePath(`/${user.app_metadata?.tenant_slug}/contacts`);

  return { success: true };
}
```

### 5. Middleware Tenant Resolution with Caching

**File**: `lib/cache/tenant-cache.ts`

```typescript
// Simple in-memory cache for tenant lookups
const tenantCache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 60 * 1000; // 60 seconds

export function getCachedTenant(slug: string) {
  const cached = tenantCache.get(slug);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  return null;
}

export function setCachedTenant(slug: string, data: any) {
  tenantCache.set(slug, {
    data,
    expires: Date.now() + CACHE_TTL,
  });
}

export function clearTenantCache(slug?: string) {
  if (slug) {
    tenantCache.delete(slug);
  } else {
    tenantCache.clear();
  }
}
```

**Enhanced middleware with caching**:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCachedTenant, setCachedTenant } from '@/lib/cache/tenant-cache';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  const subdomain = getSubdomain(hostname);

  if (!subdomain) {
    return NextResponse.next();
  }

  // Check cache first
  let tenant = getCachedTenant(subdomain);

  // If not cached, fetch from database
  if (!tenant) {
    tenant = await fetchTenant(subdomain);
    if (tenant) {
      setCachedTenant(subdomain, tenant);
    } else {
      // Tenant not found - redirect to 404
      return NextResponse.redirect(new URL('/404', request.url));
    }
  }

  // Rewrite to tenant route
  url.pathname = `/${subdomain}${url.pathname}`;
  const response = NextResponse.rewrite(url);

  // Add tenant context to headers
  response.headers.set('x-tenant-id', tenant.id);
  response.headers.set('x-tenant-slug', subdomain);

  return response;
}

async function fetchTenant(slug: string) {
  // Fetch from Supabase
  // Note: In middleware, use fetch API with service role key
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/tenants?slug=eq.${slug}&select=*`,
    {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );

  const data = await response.json();
  return data?.[0] || null;
}
```

---

## Database Design

### 1. Tenant Table Structure

**File**: `supabase/migrations/001_create_tenants.sql`

```sql
-- Tenants table (master table for all tenants)
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,

  -- Contact info
  email text,
  phone text,

  -- Branding
  logo_url text,
  primary_color text DEFAULT '#3b82f6',
  secondary_color text DEFAULT '#8b5cf6',

  -- Subscription
  plan text NOT NULL DEFAULT 'free', -- free, starter, professional, enterprise
  max_users int DEFAULT 5,
  max_storage_gb int DEFAULT 1,

  -- Status
  is_active boolean DEFAULT true,
  trial_ends_at timestamptz,
  subscription_ends_at timestamptz,

  -- Metadata
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Constraints
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{2,62}$'),
  CONSTRAINT valid_plan CHECK (plan IN ('free', 'starter', 'professional', 'enterprise'))
);

-- Indexes
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_is_active ON tenants(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Service role can access all tenants
CREATE POLICY "Service role full access"
ON tenants
FOR ALL
TO service_role
USING (true);

-- Authenticated users can read their own tenant
CREATE POLICY "Users can read own tenant"
ON tenants
FOR SELECT
TO authenticated
USING (
  id = (
    (current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'tenant_id')::uuid
  )
);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. tenant_id Foreign Key Pattern

**All multi-tenant tables must include tenant_id**:

```sql
-- Example: Contacts table
CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Contact fields
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip text,

  -- Metadata
  source text, -- door-knocking, referral, google, etc.
  tags text[],
  notes text,

  -- Audit
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,

  -- Constraints
  CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email)
);

-- CRITICAL: Composite indexes with tenant_id FIRST
CREATE INDEX idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX idx_contacts_tenant_id_created_at ON contacts(tenant_id, created_at DESC);
CREATE INDEX idx_contacts_tenant_id_email ON contacts(tenant_id, email) WHERE email IS NOT NULL;
CREATE INDEX idx_contacts_tenant_id_is_deleted ON contacts(tenant_id, is_deleted) WHERE is_deleted = false;

-- RLS Policies
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation"
ON contacts
FOR ALL
TO authenticated
USING (tenant_id = auth.tenant_id())
WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "Service role full access"
ON contacts
FOR ALL
TO service_role
USING (true);
```

### 3. Index Strategy for Multi-Tenant Queries

#### General Rule: **tenant_id FIRST**

```sql
-- ✅ GOOD: tenant_id first
CREATE INDEX idx_projects_tenant_status
ON projects(tenant_id, status, created_at DESC);

-- ✅ GOOD: tenant_id first, then frequently filtered columns
CREATE INDEX idx_contacts_tenant_email
ON contacts(tenant_id, email) WHERE email IS NOT NULL;

-- ✅ GOOD: Partial index for active records
CREATE INDEX idx_contacts_tenant_active
ON contacts(tenant_id, created_at DESC)
WHERE is_deleted = false;

-- ❌ BAD: Missing tenant_id
CREATE INDEX idx_projects_status ON projects(status);

-- ❌ BAD: tenant_id not first (less efficient)
CREATE INDEX idx_projects_status_tenant ON projects(status, tenant_id);
```

#### Performance Comparison

```sql
-- Query: Find active contacts for a tenant
EXPLAIN ANALYZE
SELECT * FROM contacts
WHERE tenant_id = '123e4567-e89b-12d3-a456-426614174000'
  AND is_deleted = false
ORDER BY created_at DESC
LIMIT 20;

-- With idx_contacts_tenant_active:
-- Index Scan using idx_contacts_tenant_active on contacts
-- Planning Time: 0.123 ms
-- Execution Time: 0.456 ms

-- Without proper index:
-- Seq Scan on contacts (filtering 10000 rows to 20)
-- Planning Time: 0.234 ms
-- Execution Time: 45.678 ms (100x slower!)
```

### 4. Composite Keys for Junction Tables

```sql
-- Example: User-Tenant membership (users can belong to multiple tenants)
CREATE TABLE tenant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role within tenant
  role text NOT NULL DEFAULT 'member',
  permissions text[] DEFAULT ARRAY[]::text[],

  -- Status
  is_active boolean DEFAULT true,
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_user_per_tenant UNIQUE (tenant_id, user_id),
  CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'member', 'viewer'))
);

-- Indexes
CREATE INDEX idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX idx_tenant_users_tenant_user ON tenant_users(tenant_id, user_id);

-- RLS Policies
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- Users can read their own memberships
CREATE POLICY "Users can read own memberships"
ON tenant_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR tenant_id = auth.tenant_id());

-- Tenant admins can manage users
CREATE POLICY "Admins can manage tenant users"
ON tenant_users
FOR ALL
TO authenticated
USING (
  tenant_id = auth.tenant_id()
  AND EXISTS (
    SELECT 1 FROM tenant_users tu
    WHERE tu.tenant_id = tenant_users.tenant_id
      AND tu.user_id = auth.uid()
      AND tu.role IN ('owner', 'admin')
  )
);
```

### 5. Migration Strategy

**File**: `supabase/migrations/002_add_tenant_id_to_existing_tables.sql`

```sql
-- Add tenant_id to existing tables (if migrating from non-multi-tenant)

-- Step 1: Add column (nullable first)
ALTER TABLE existing_table ADD COLUMN tenant_id uuid;

-- Step 2: Backfill with default tenant
UPDATE existing_table SET tenant_id = 'default-tenant-uuid-here';

-- Step 3: Make it NOT NULL
ALTER TABLE existing_table ALTER COLUMN tenant_id SET NOT NULL;

-- Step 4: Add foreign key
ALTER TABLE existing_table
ADD CONSTRAINT fk_existing_table_tenant
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Step 5: Create indexes
CREATE INDEX idx_existing_table_tenant_id ON existing_table(tenant_id);

-- Step 6: Enable RLS
ALTER TABLE existing_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation"
ON existing_table
FOR ALL
TO authenticated
USING (tenant_id = auth.tenant_id())
WITH CHECK (tenant_id = auth.tenant_id());
```

---

## Tenant Onboarding Flow

### 1. Registration Workflow

```
User Registration Flow:
1. User visits app.yourdomain.com/signup
2. User enters company info + account details
3. System checks subdomain availability
4. System creates tenant record
5. System creates user record with tenant_id in app_metadata
6. System sends verification email
7. User verifies email
8. Redirect to tenant.yourdomain.com/dashboard
```

### 2. Subdomain Availability Checking

**File**: `app/api/tenants/check-availability/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

const RESERVED_SUBDOMAINS = [
  'www', 'app', 'api', 'admin', 'mail', 'ftp', 'localhost',
  'staging', 'dev', 'test', 'demo', 'beta', 'alpha',
  'dashboard', 'portal', 'login', 'signup', 'auth',
  'help', 'support', 'docs', 'blog', 'status',
];

export async function POST(request: NextRequest) {
  const { slug } = await request.json();

  // Validate format
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json(
      { available: false, error: 'Invalid slug format' },
      { status: 400 }
    );
  }

  // Check format (lowercase alphanumeric and hyphens, 3-63 chars)
  const slugRegex = /^[a-z0-9][a-z0-9-]{2,62}$/;
  if (!slugRegex.test(slug)) {
    return NextResponse.json({
      available: false,
      error: 'Slug must be 3-63 characters, lowercase letters, numbers, and hyphens only',
    });
  }

  // Check reserved words
  if (RESERVED_SUBDOMAINS.includes(slug)) {
    return NextResponse.json({
      available: false,
      error: 'This subdomain is reserved',
    });
  }

  // Check database
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('Error checking slug:', error);
    return NextResponse.json(
      { available: false, error: 'Database error' },
      { status: 500 }
    );
  }

  const available = !data;

  return NextResponse.json({
    available,
    message: available
      ? 'This subdomain is available!'
      : 'This subdomain is already taken',
  });
}
```

### 3. Tenant Creation Flow

**File**: `app/api/tenants/create/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = createServerClient();

  // Parse request
  const {
    // Tenant info
    slug,
    name,
    email,
    phone,

    // Owner user info
    ownerEmail,
    ownerPassword,
    ownerFirstName,
    ownerLastName,
  } = await request.json();

  // Validate input
  if (!slug || !name || !ownerEmail || !ownerPassword) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  try {
    // Step 1: Create tenant record (using service role)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        slug,
        name,
        email,
        phone,
        plan: 'free',
        is_active: true,
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Tenant creation error:', tenantError);
      return NextResponse.json(
        { error: 'Failed to create tenant' },
        { status: 500 }
      );
    }

    // Step 2: Create owner user with tenant_id in app_metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: ownerEmail,
      password: ownerPassword,
      options: {
        data: {
          first_name: ownerFirstName,
          last_name: ownerLastName,
        },
        // CRITICAL: Set tenant_id in app_metadata (not user_metadata)
        app_metadata: {
          tenant_id: tenant.id,
          tenant_slug: tenant.slug,
          role: 'owner',
        },
        emailRedirectTo: `https://${slug}.yourdomain.com/auth/callback`,
      },
    });

    if (authError) {
      console.error('User creation error:', authError);

      // Rollback: Delete tenant
      await supabase.from('tenants').delete().eq('id', tenant.id);

      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    // Step 3: Create tenant_users relationship
    const { error: membershipError } = await supabase
      .from('tenant_users')
      .insert({
        tenant_id: tenant.id,
        user_id: authData.user!.id,
        role: 'owner',
        is_active: true,
        accepted_at: new Date().toISOString(),
      });

    if (membershipError) {
      console.error('Membership creation error:', membershipError);
      // Continue anyway - user can still access their tenant
    }

    // Step 4: Create default data for tenant
    await createDefaultTenantData(supabase, tenant.id);

    // Return success
    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
      },
      user: {
        id: authData.user!.id,
        email: authData.user!.email,
      },
      message: 'Tenant created successfully! Check your email to verify your account.',
    });

  } catch (error) {
    console.error('Tenant creation error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * Create default data for new tenant
 */
async function createDefaultTenantData(
  supabase: any,
  tenantId: string
) {
  // Create default pipeline stages
  await supabase.from('pipeline_stages').insert([
    { tenant_id: tenantId, name: 'Lead', order: 1, color: '#3b82f6' },
    { tenant_id: tenantId, name: 'Contacted', order: 2, color: '#8b5cf6' },
    { tenant_id: tenantId, name: 'Quoted', order: 3, color: '#f59e0b' },
    { tenant_id: tenantId, name: 'Won', order: 4, color: '#10b981' },
    { tenant_id: tenantId, name: 'Lost', order: 5, color: '#ef4444' },
  ]);

  // Create default email templates
  await supabase.from('email_templates').insert([
    {
      tenant_id: tenantId,
      name: 'Welcome Email',
      subject: 'Welcome to {{ company_name }}!',
      body: 'Hi {{ first_name }},\n\nThank you for your interest in our services...',
    },
    {
      tenant_id: tenantId,
      name: 'Quote Follow-up',
      subject: 'Following up on your quote',
      body: 'Hi {{ first_name }},\n\nI wanted to follow up on the quote we sent...',
    },
  ]);

  // Create default settings
  await supabase.from('tenant_settings').insert({
    tenant_id: tenantId,
    notifications_enabled: true,
    email_signature: '',
    business_hours: {
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '09:00', close: '17:00' },
      wednesday: { open: '09:00', close: '17:00' },
      thursday: { open: '09:00', close: '17:00' },
      friday: { open: '09:00', close: '17:00' },
      saturday: { open: '10:00', close: '14:00' },
      sunday: { closed: true },
    },
  });
}
```

### 4. Frontend Registration Form

**File**: `app/(marketing)/signup/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

  const [formData, setFormData] = useState({
    // Tenant
    slug: '',
    companyName: '',
    companyEmail: '',
    companyPhone: '',

    // Owner
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  // Check slug availability as user types
  const checkSlugAvailability = async (slug: string) => {
    if (slug.length < 3) {
      setSlugAvailable(null);
      return;
    }

    const response = await fetch('/api/tenants/check-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    });

    const data = await response.json();
    setSlugAvailable(data.available);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/tenants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: formData.slug,
          name: formData.companyName,
          email: formData.companyEmail,
          phone: formData.companyPhone,
          ownerEmail: formData.email,
          ownerPassword: formData.password,
          ownerFirstName: formData.firstName,
          ownerLastName: formData.lastName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create account');
        return;
      }

      // Redirect to tenant subdomain
      window.location.href = `https://${formData.slug}.yourdomain.com/dashboard`;

    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-center">
            Create Your Account
          </h2>
          <p className="mt-2 text-center text-gray-600">
            Start your 14-day free trial
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="font-semibold">Company Information</h3>

            <div>
              <Label htmlFor="slug">Company Subdomain *</Label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <Input
                  id="slug"
                  name="slug"
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => {
                    const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                    setFormData({ ...formData, slug });
                    checkSlugAvailability(slug);
                  }}
                  className="flex-1"
                  placeholder="acme-roofing"
                />
                <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  .yourdomain.com
                </span>
              </div>
              {slugAvailable === true && (
                <p className="mt-1 text-sm text-green-600">
                  ✓ Available!
                </p>
              )}
              {slugAvailable === false && (
                <p className="mt-1 text-sm text-red-600">
                  ✗ This subdomain is taken
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Acme Roofing Inc."
              />
            </div>

            <div>
              <Label htmlFor="companyEmail">Company Email</Label>
              <Input
                id="companyEmail"
                type="email"
                value={formData.companyEmail}
                onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                placeholder="info@acmeroofing.com"
              />
            </div>
          </div>

          {/* Owner Information */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Your Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@acmeroofing.com"
              />
            </div>

            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Min. 8 characters"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !slugAvailable}
            className="w-full"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>

          <p className="text-xs text-center text-gray-500">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </form>
      </div>
    </div>
  );
}
```

### 5. Post-Registration Email Verification

**Supabase Auth Hook**: Configure email templates in Supabase Dashboard

```html
<!-- Email Template: Confirm Signup -->
<h2>Welcome to {{ .SiteURL }}!</h2>
<p>Hi {{ .FirstName }},</p>
<p>Welcome to your new Roofing CRM account!</p>
<p>Click the link below to verify your email and access your dashboard:</p>
<p>
  <a href="{{ .ConfirmationURL }}">
    Verify Email Address
  </a>
</p>
<p>Your tenant URL: <a href="https://{{ .AppMetaData.tenant_slug }}.yourdomain.com">
  https://{{ .AppMetaData.tenant_slug }}.yourdomain.com
</a></p>
<p>If you didn't create this account, please ignore this email.</p>
```

---

## Performance Optimization

### 1. Query Performance with tenant_id

#### Best Practices

**A. Always include tenant_id in WHERE clauses**
```sql
-- ✅ GOOD: Explicit tenant_id filter
SELECT * FROM contacts
WHERE tenant_id = auth.tenant_id()
  AND email = 'john@example.com';

-- ❌ BAD: Relying only on RLS (slower query planning)
SELECT * FROM contacts
WHERE email = 'john@example.com';
```

**B. Use covering indexes**
```sql
-- Index includes all columns needed by query
CREATE INDEX idx_contacts_tenant_email_name
ON contacts(tenant_id, email)
INCLUDE (first_name, last_name, phone);

-- Query can use index-only scan (faster)
SELECT first_name, last_name, phone
FROM contacts
WHERE tenant_id = auth.tenant_id()
  AND email = 'john@example.com';
```

**C. Partial indexes for common filters**
```sql
-- Only index active contacts
CREATE INDEX idx_contacts_tenant_active
ON contacts(tenant_id, created_at DESC)
WHERE is_deleted = false;

-- Only index contacts with email
CREATE INDEX idx_contacts_tenant_with_email
ON contacts(tenant_id, email)
WHERE email IS NOT NULL;
```

### 2. Connection Pooling

**Supabase Configuration** (built-in pooling):

```typescript
// lib/supabase/server.ts
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
      },
      // Connection pooling handled by Supabase
      // Default: Supavisor (PgBouncer) with session mode
    }
  );
}
```

**Note**: Supabase uses Supavisor (PgBouncer) for connection pooling:
- Session mode: Best for compatibility
- Transaction mode: Best for performance (requires prepared statements disabled)

### 3. Caching Strategies Per Tenant

#### A. Next.js Route Cache (Default)

```typescript
// app/[tenant]/dashboard/page.tsx
export const revalidate = 60; // Revalidate every 60 seconds

export default async function DashboardPage({
  params
}: {
  params: { tenant: string }
}) {
  // This data is cached for 60 seconds per tenant
  const stats = await getTenantStats(params.tenant);

  return <Dashboard stats={stats} />;
}
```

#### B. Unstable Cache API (Fine-grained control)

```typescript
import { unstable_cache } from 'next/cache';

// Cache tenant data with custom key
export const getTenant = unstable_cache(
  async (slug: string) => {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', slug)
      .single();
    return data;
  },
  ['tenant'], // Cache key prefix
  {
    revalidate: 300, // 5 minutes
    tags: ['tenants'], // For revalidation
  }
);

// Revalidate cache when tenant updates
export async function updateTenant(tenantId: string, updates: any) {
  const supabase = createServerClient();
  await supabase.from('tenants').update(updates).eq('id', tenantId);

  // Invalidate cache
  revalidateTag('tenants');
}
```

#### C. Redis for Cross-Request Cache (Optional)

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Cache tenant data in Redis
export async function getTenantCached(slug: string) {
  const cacheKey = `tenant:${slug}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from database
  const supabase = createServerClient();
  const { data } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .single();

  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, data);

  return data;
}
```

### 4. Rate Limiting Per Tenant

**File**: `lib/rate-limit.ts`

```typescript
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Create rate limiter per tenant
export const tenantRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute per tenant
  prefix: 'ratelimit:tenant',
});

// Create rate limiter per user
export const userRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute per user
  prefix: 'ratelimit:user',
});

// Middleware or API route usage
export async function checkRateLimit(
  identifier: string,
  type: 'tenant' | 'user' = 'tenant'
) {
  const limiter = type === 'tenant' ? tenantRateLimiter : userRateLimiter;

  const { success, limit, reset, remaining } = await limiter.limit(identifier);

  return {
    success,
    limit,
    remaining,
    reset: new Date(reset),
  };
}
```

**Usage in API Route**:

```typescript
// app/api/[tenant]/contacts/route.ts
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: { tenant: string } }
) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check rate limit per tenant
  const tenantLimit = await checkRateLimit(params.tenant, 'tenant');
  if (!tenantLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', reset: tenantLimit.reset },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': tenantLimit.limit.toString(),
          'X-RateLimit-Remaining': tenantLimit.remaining.toString(),
          'X-RateLimit-Reset': tenantLimit.reset.toISOString(),
        },
      }
    );
  }

  // Check rate limit per user
  const userLimit = await checkRateLimit(user.id, 'user');
  if (!userLimit.success) {
    return NextResponse.json(
      { error: 'User rate limit exceeded', reset: userLimit.reset },
      { status: 429 }
    );
  }

  // Proceed with request
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false });

  return NextResponse.json({ contacts });
}
```

### 5. Database Query Optimization

**Analyze Query Performance**:

```sql
-- Check query execution plan
EXPLAIN ANALYZE
SELECT c.*, COUNT(p.id) as project_count
FROM contacts c
LEFT JOIN projects p ON p.contact_id = c.id AND p.tenant_id = c.tenant_id
WHERE c.tenant_id = '123e4567-e89b-12d3-a456-426614174000'
  AND c.is_deleted = false
GROUP BY c.id
ORDER BY c.created_at DESC
LIMIT 20;

-- Look for:
-- ✅ Index Scan (good)
-- ❌ Seq Scan (bad - missing index)
-- ✅ Nested Loop (good for small joins)
-- ⚠️ Hash Join (okay, but consider indexes)
```

**Create optimized indexes**:

```sql
-- Add indexes based on EXPLAIN output
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_deleted_created
ON contacts(tenant_id, created_at DESC)
WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_projects_tenant_contact
ON projects(tenant_id, contact_id);
```

---

## Security Considerations

### 1. Tenant Data Isolation Verification

**Test Script**: `scripts/test-tenant-isolation.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role for testing
);

/**
 * Test: Verify RLS prevents cross-tenant access
 */
async function testTenantIsolation() {
  console.log('🧪 Testing tenant isolation...\n');

  // Create two test tenants
  const { data: tenant1 } = await supabase
    .from('tenants')
    .insert({ slug: 'test-tenant-1', name: 'Test Tenant 1' })
    .select()
    .single();

  const { data: tenant2 } = await supabase
    .from('tenants')
    .insert({ slug: 'test-tenant-2', name: 'Test Tenant 2' })
    .select()
    .single();

  // Create test users
  const { data: user1 } = await supabase.auth.admin.createUser({
    email: 'user1@test.com',
    password: 'test123456',
    email_confirm: true,
    app_metadata: { tenant_id: tenant1.id },
  });

  const { data: user2 } = await supabase.auth.admin.createUser({
    email: 'user2@test.com',
    password: 'test123456',
    email_confirm: true,
    app_metadata: { tenant_id: tenant2.id },
  });

  // Create test contacts
  await supabase.from('contacts').insert({
    tenant_id: tenant1.id,
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@tenant1.com',
  });

  await supabase.from('contacts').insert({
    tenant_id: tenant2.id,
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane@tenant2.com',
  });

  // Test 1: User 1 should only see Tenant 1 contacts
  const client1 = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  await client1.auth.signInWithPassword({
    email: 'user1@test.com',
    password: 'test123456',
  });

  const { data: user1Contacts } = await client1
    .from('contacts')
    .select('*');

  console.log('✅ Test 1: User 1 contacts:', user1Contacts?.length);
  console.assert(
    user1Contacts?.length === 1 && user1Contacts[0].email === 'john@tenant1.com',
    '❌ FAILED: User 1 should only see Tenant 1 contacts'
  );

  // Test 2: User 2 should only see Tenant 2 contacts
  const client2 = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  await client2.auth.signInWithPassword({
    email: 'user2@test.com',
    password: 'test123456',
  });

  const { data: user2Contacts } = await client2
    .from('contacts')
    .select('*');

  console.log('✅ Test 2: User 2 contacts:', user2Contacts?.length);
  console.assert(
    user2Contacts?.length === 1 && user2Contacts[0].email === 'jane@tenant2.com',
    '❌ FAILED: User 2 should only see Tenant 2 contacts'
  );

  // Test 3: User 1 cannot update Tenant 2 contacts
  const tenant2ContactId = user2Contacts![0].id;

  const { error: updateError } = await client1
    .from('contacts')
    .update({ first_name: 'Hacked' })
    .eq('id', tenant2ContactId);

  console.log('✅ Test 3: Cross-tenant update blocked:', updateError !== null);
  console.assert(
    updateError !== null,
    '❌ FAILED: User 1 should not be able to update Tenant 2 contacts'
  );

  // Cleanup
  await supabase.auth.admin.deleteUser(user1.user.id);
  await supabase.auth.admin.deleteUser(user2.user.id);
  await supabase.from('tenants').delete().eq('id', tenant1.id);
  await supabase.from('tenants').delete().eq('id', tenant2.id);

  console.log('\n✅ All tenant isolation tests passed!');
}

testTenantIsolation();
```

### 2. Cross-Tenant Data Access Prevention

**Security Checklist**:

- ✅ All tables have `tenant_id` column
- ✅ All tables have RLS enabled
- ✅ RLS policies use `auth.tenant_id()` function
- ✅ Foreign keys include `ON DELETE CASCADE`
- ✅ API routes verify tenant access before queries
- ✅ Middleware validates tenant existence
- ✅ JWT contains `tenant_id` in `app_metadata` (not `user_metadata`)

**Common Vulnerabilities**:

```typescript
// ❌ VULNERABLE: Direct database access without tenant check
export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const contactId = request.nextUrl.searchParams.get('id');

  // No tenant verification!
  const { data } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  return NextResponse.json({ contact: data });
}

// ✅ SECURE: Verify tenant access
export async function GET(
  request: NextRequest,
  { params }: { params: { tenant: string } }
) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Verify user's tenant matches requested tenant
  if (user?.app_metadata?.tenant_slug !== params.tenant) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const contactId = request.nextUrl.searchParams.get('id');

  // RLS automatically filters by tenant_id
  const { data } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  return NextResponse.json({ contact: data });
}
```

### 3. RLS Policy Testing

**Test RLS Policies**:

```sql
-- Test as specific user
SET LOCAL request.jwt.claims = '{
  "sub": "user-uuid-here",
  "app_metadata": {
    "tenant_id": "tenant-uuid-here"
  }
}';

-- Test query (should only return tenant's data)
SELECT * FROM contacts;

-- Reset
RESET request.jwt.claims;
```

**Automated RLS Testing**:

```typescript
// lib/test-utils/rls-test.ts
import { createClient } from '@supabase/supabase-js';

export async function testRLSPolicy(
  table: string,
  tenantId: string,
  userId: string
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Set JWT claims for testing
  // Note: This requires a test user with proper JWT

  // Test SELECT
  const { data, error } = await supabase
    .from(table)
    .select('*');

  console.log(`RLS Test [${table}]:`, {
    rowsReturned: data?.length,
    error: error?.message,
  });

  // Verify all rows belong to correct tenant
  const invalidRows = data?.filter(row => row.tenant_id !== tenantId);
  if (invalidRows && invalidRows.length > 0) {
    console.error(`❌ RLS BREACH: Found ${invalidRows.length} rows from other tenants!`);
    return false;
  }

  return true;
}
```

### 4. Audit Logging

**File**: `supabase/migrations/010_create_audit_log.sql`

```sql
-- Audit log table
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- User info
  user_id uuid REFERENCES auth.users(id),
  user_email text,

  -- Action details
  action text NOT NULL, -- 'create', 'update', 'delete', 'login', 'export'
  resource_type text NOT NULL, -- 'contact', 'project', 'user'
  resource_id uuid,

  -- Change details
  old_values jsonb,
  new_values jsonb,

  -- Request context
  ip_address inet,
  user_agent text,

  -- Metadata
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(tenant_id, resource_type, resource_id);

-- RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation"
ON audit_logs
FOR SELECT
TO authenticated
USING (tenant_id = auth.tenant_id());

CREATE POLICY "Service role full access"
ON audit_logs
FOR ALL
TO service_role
USING (true);

-- Function to log audit event
CREATE OR REPLACE FUNCTION log_audit_event(
  p_tenant_id uuid,
  p_user_id uuid,
  p_action text,
  p_resource_type text,
  p_resource_id uuid DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_logs (
    tenant_id,
    user_id,
    user_email,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values
  )
  SELECT
    p_tenant_id,
    p_user_id,
    u.email,
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values
  FROM auth.users u
  WHERE u.id = p_user_id;
END;
$$;
```

**Usage in API Route**:

```typescript
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const tenantId = user?.app_metadata?.tenant_id;
  const body = await request.json();

  // Create contact
  const { data: contact } = await supabase
    .from('contacts')
    .insert({ ...body, tenant_id: tenantId })
    .select()
    .single();

  // Log audit event
  await supabase.rpc('log_audit_event', {
    p_tenant_id: tenantId,
    p_user_id: user!.id,
    p_action: 'create',
    p_resource_type: 'contact',
    p_resource_id: contact.id,
    p_new_values: contact,
  });

  return NextResponse.json({ contact });
}
```

---

## Common Mistakes & Solutions

### 1. Mistake: Using user_metadata for tenant_id

**Problem**:
```typescript
// ❌ WRONG: user_metadata can be modified by user
const { data } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
  options: {
    data: {
      tenant_id: tenantId, // User can modify this!
    },
  },
});
```

**Solution**:
```typescript
// ✅ CORRECT: Use app_metadata (server-only, secure)
const { data } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
  options: {
    app_metadata: {
      tenant_id: tenantId, // Secure, cannot be modified by user
      tenant_slug: tenantSlug,
    },
  },
});
```

### 2. Mistake: Missing tenant_id in indexes

**Problem**:
```sql
-- ❌ WRONG: Index without tenant_id
CREATE INDEX idx_contacts_email ON contacts(email);

-- Query is slow because it scans all tenants
SELECT * FROM contacts WHERE email = 'john@example.com';
```

**Solution**:
```sql
-- ✅ CORRECT: tenant_id first in index
CREATE INDEX idx_contacts_tenant_email ON contacts(tenant_id, email);

-- Query is fast with explicit tenant_id
SELECT * FROM contacts
WHERE tenant_id = auth.tenant_id()
  AND email = 'john@example.com';
```

### 3. Mistake: Not caching tenant lookups in middleware

**Problem**:
```typescript
// ❌ WRONG: Database query on every request
export async function middleware(request: NextRequest) {
  const subdomain = getSubdomain(request);

  // Database query for every single request!
  const tenant = await fetchTenant(subdomain);
  // ...
}
```

**Solution**:
```typescript
// ✅ CORRECT: Cache tenant lookups
const tenantCache = new Map();

export async function middleware(request: NextRequest) {
  const subdomain = getSubdomain(request);

  // Check cache first
  let tenant = tenantCache.get(subdomain);
  if (!tenant) {
    tenant = await fetchTenant(subdomain);
    tenantCache.set(subdomain, tenant);
  }
  // ...
}
```

### 4. Mistake: Exposing tenant_id in URLs

**Problem**:
```
❌ WRONG: /api/contacts?tenant_id=123-456-789
          (User can change tenant_id in URL!)
```

**Solution**:
```
✅ CORRECT: /api/[tenant]/contacts
            (Tenant from subdomain, verified in middleware)
```

### 5. Mistake: Forgetting to enable RLS

**Problem**:
```sql
-- ❌ WRONG: Table created without RLS
CREATE TABLE contacts (...);
-- RLS not enabled = ALL DATA ACCESSIBLE!
```

**Solution**:
```sql
-- ✅ CORRECT: Always enable RLS
CREATE TABLE contacts (...);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON contacts
FOR ALL TO authenticated
USING (tenant_id = auth.tenant_id());
```

### 6. Mistake: Hardcoding tenant data in cache keys

**Problem**:
```typescript
// ❌ WRONG: Cache key without tenant_id
const cacheKey = `contacts:${userId}`;
// User from different tenant might get cached data!
```

**Solution**:
```typescript
// ✅ CORRECT: Include tenant_id in cache key
const cacheKey = `contacts:${tenantId}:${userId}`;
```

### 7. Mistake: Not handling tenant suspension

**Problem**:
```typescript
// ❌ WRONG: No check for suspended tenants
export async function middleware(request: NextRequest) {
  const tenant = await getTenant(subdomain);
  // Proceed even if tenant is suspended!
}
```

**Solution**:
```typescript
// ✅ CORRECT: Check tenant status
export async function middleware(request: NextRequest) {
  const tenant = await getTenant(subdomain);

  if (!tenant || !tenant.is_active) {
    return NextResponse.redirect(new URL('/suspended', request.url));
  }

  // Check subscription status
  if (tenant.subscription_ends_at &&
      new Date(tenant.subscription_ends_at) < new Date()) {
    return NextResponse.redirect(new URL('/subscription-expired', request.url));
  }
}
```

### 8. Mistake: Cross-tenant joins without explicit filtering

**Problem**:
```sql
-- ❌ WRONG: Join without tenant_id check
SELECT c.*, p.*
FROM contacts c
JOIN projects p ON p.contact_id = c.id
WHERE c.tenant_id = auth.tenant_id();
-- Projects from other tenants might leak!
```

**Solution**:
```sql
-- ✅ CORRECT: Filter both sides of join
SELECT c.*, p.*
FROM contacts c
JOIN projects p ON p.contact_id = c.id
  AND p.tenant_id = c.tenant_id  -- Explicit tenant check
WHERE c.tenant_id = auth.tenant_id();
```

---

## Production Checklist

### Pre-Launch Security Audit

- [ ] **RLS Enabled**: All tenant tables have RLS enabled
- [ ] **RLS Policies**: Policies use `auth.tenant_id()` from `app_metadata`
- [ ] **Test Isolation**: Run tenant isolation tests
- [ ] **Index Strategy**: All queries have proper tenant_id indexes
- [ ] **API Authorization**: All API routes verify tenant access
- [ ] **JWT Security**: tenant_id in app_metadata (not user_metadata)
- [ ] **Audit Logging**: Critical actions are logged
- [ ] **Rate Limiting**: Per-tenant rate limits configured

### Performance Optimization

- [ ] **Query Performance**: Run EXPLAIN ANALYZE on critical queries
- [ ] **Composite Indexes**: tenant_id is first column in all indexes
- [ ] **Cache Strategy**: Tenant lookups are cached
- [ ] **Connection Pooling**: Supabase pooling configured
- [ ] **CDN Configuration**: Static assets cached by CDN
- [ ] **Database Monitoring**: Query performance alerts set up

### Subdomain Configuration

- [ ] **DNS Records**: Wildcard domain configured
- [ ] **SSL Certificates**: Wildcard SSL issued
- [ ] **Middleware**: Tenant routing tested in all environments
- [ ] **Local Development**: /etc/hosts configured for testing
- [ ] **Reserved Subdomains**: List of reserved subdomains implemented

### Tenant Management

- [ ] **Onboarding Flow**: Registration tested end-to-end
- [ ] **Subdomain Validation**: Format and availability checks working
- [ ] **Email Verification**: Confirmation emails sending correctly
- [ ] **Default Data**: New tenants get default pipeline stages, templates
- [ ] **Tenant Suspension**: Suspension/reactivation workflow tested

### Monitoring & Observability

- [ ] **Error Tracking**: Sentry or similar configured
- [ ] **Performance Monitoring**: Vercel Analytics or similar
- [ ] **Audit Logs**: Retention policy configured
- [ ] **Database Alerts**: CPU, memory, connection alerts
- [ ] **Rate Limit Alerts**: Notify when tenants hit limits

### Documentation

- [ ] **API Documentation**: Tenant context documented
- [ ] **Onboarding Guide**: Help docs for new tenants
- [ ] **Admin Tools**: Tenant management dashboard
- [ ] **Runbook**: Incident response procedures
- [ ] **Architecture Diagram**: Current state documented

---

## Conclusion

This guide provides a comprehensive, production-ready multi-tenant architecture for the Roofing CRM SaaS using Next.js 14, Supabase, and Vercel.

**Key Takeaways**:

1. **Subdomain-based routing** with Next.js middleware provides clear tenant separation
2. **Row-Level Security (RLS)** with `tenant_id` in `app_metadata` ensures data isolation
3. **Proper indexing strategy** (tenant_id first) is critical for performance
4. **Caching** tenant lookups and query results improves scalability
5. **Security testing** and audit logging are non-negotiable for production

**Next Steps**:

1. Implement tenant table and RLS policies
2. Set up middleware for subdomain routing
3. Create tenant registration flow
4. Test tenant isolation thoroughly
5. Deploy to staging and run security audit
6. Launch! 🚀

---

**Reference Implementation**: See Vercel Platforms Starter Kit at https://github.com/vercel/platforms

**Questions?** Review specific sections or consult Supabase docs for RLS best practices.
