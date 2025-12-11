# Technical Architecture

## Document Information
| Field | Value |
|-------|-------|
| Document Type | PRD Section |
| Section | 01 - Technical Architecture |
| Version | 1.0 |
| Last Updated | 2025-12-10 |
| Status | Complete |

---

## Overview

This document provides a comprehensive technical overview of the Roofing SAAS platform architecture, covering the tech stack, application structure, multi-tenant design, and key infrastructure decisions.

---

## Technology Stack

### Frontend Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.0.7 | Full-stack React framework with App Router |
| React | 19.2.1 | UI component library |
| TypeScript | 5.x | Type-safe JavaScript |
| Tailwind CSS | 4.x | Utility-first CSS framework |

**Key Frontend Features:**
- **App Router**: Uses Next.js App Router (not Pages Router)
- **Server Components**: Default server-side rendering with selective client hydration
- **Turbopack**: Enabled for development (`next dev --turbopack`)
- **React 19**: Latest React with concurrent features

### UI Components

| Technology | Version | Purpose |
|------------|---------|---------|
| shadcn/ui | Latest | Radix-based component primitives |
| Radix UI | Various | Accessible component primitives |
| Lucide React | 0.544.0 | Icon library |
| Recharts | 3.2.1 | Dashboard charts and analytics |
| react-big-calendar | 1.19.4 | Calendar/scheduling component |
| @dnd-kit/core | 6.3.1 | Drag-and-drop core |
| @dnd-kit/sortable | 10.0.0 | Sortable functionality |
| @dnd-kit/utilities | 3.2.2 | Drag-and-drop utilities |

**Component Ecosystem:**
- `@radix-ui/react-dialog` - Modal dialogs
- `@radix-ui/react-dropdown-menu` - Dropdown menus
- `@radix-ui/react-select` - Select dropdowns
- `@radix-ui/react-tabs` - Tab navigation
- `@radix-ui/react-switch` - Toggle switches
- `class-variance-authority` - Component variants
- `tailwind-merge` - Class merging utilities

### Backend & Database

| Technology | Version | Purpose |
|------------|---------|---------|
| Supabase | Latest | Backend-as-a-Service |
| PostgreSQL | 15+ | Primary database (via Supabase) |
| @supabase/ssr | 0.7.0 | Server-side Supabase client |
| @supabase/supabase-js | 2.58.0 | Supabase JavaScript client |

**Supabase Project:**
- **Project ID**: `wfifizczqvogbcqamnmw`
- **Features Used**: Auth, Database, Storage, Realtime, Edge Functions
- **RLS**: Row-Level Security enabled for multi-tenancy

### PWA & Offline Support

| Technology | Version | Purpose |
|------------|---------|---------|
| next-pwa | 5.6.0 | PWA service worker generation |
| Dexie.js | 4.2.0 | IndexedDB wrapper for offline data |
| dexie-react-hooks | 4.2.0 | React hooks for Dexie |
| idb | 8.0.3 | Promise-based IndexedDB |

### Communication & Integrations

| Technology | Version | Purpose |
|------------|---------|---------|
| Twilio | 5.10.2 | SMS/Voice communications |
| Resend | 6.1.2 | Transactional email |
| @elevenlabs/client | 0.7.1 | Voice AI (text-to-speech) |
| @elevenlabs/elevenlabs-js | 2.17.0 | ElevenLabs SDK |
| OpenAI | 6.0.1 | AI/LLM capabilities |
| intuit-oauth | 4.2.0 | QuickBooks integration |

### Document & Media

| Technology | Version | Purpose |
|------------|---------|---------|
| pdf-lib | 1.17.1 | PDF generation and manipulation |
| qrcode | 1.5.4 | QR code generation |
| browser-image-compression | 2.0.2 | Client-side image optimization |
| sharp | 0.34.4 | Server-side image processing |

### Maps & Location

| Technology | Version | Purpose |
|------------|---------|---------|
| @react-google-maps/api | 2.20.7 | Google Maps integration |
| Leaflet | (via components) | Territory visualization |

### Form & Data Handling

| Technology | Version | Purpose |
|------------|---------|---------|
| react-hook-form | 7.68.0 | Form state management |
| @hookform/resolvers | 5.2.2 | Validation resolvers |
| Zod | 4.1.13 | Schema validation |
| @tanstack/react-table | 8.21.3 | Data table components |
| csv-parse | 6.1.0 | CSV import/export |

### Utilities

| Technology | Version | Purpose |
|------------|---------|---------|
| date-fns | 4.1.0 | Date manipulation |
| clsx | 2.1.1 | Conditional classnames |
| sonner | 2.0.7 | Toast notifications |

### Monitoring & Error Tracking

| Technology | Version | Purpose |
|------------|---------|---------|
| @sentry/nextjs | 10.25.0 | Error tracking and performance monitoring |

### Development & Build Tools

| Technology | Version | Purpose |
|------------|---------|---------|
| ESLint | 9.x | Code linting |
| Husky | 9.1.7 | Git hooks |
| lint-staged | 16.2.3 | Staged file linting |
| Playwright | 1.55.1 | E2E testing |
| tsx | 4.20.6 | TypeScript execution |
| Vercel CLI | 48.2.0 | Deployment |

---

## Application Structure

### Directory Layout

```
roofing-saas/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group (login, register)
│   │   └── layout.tsx     # Minimal auth layout
│   ├── (dashboard)/       # Protected dashboard routes
│   │   ├── layout.tsx     # Dashboard layout with sidebar
│   │   ├── dashboard/     # Main dashboard
│   │   ├── contacts/      # Contact management
│   │   ├── projects/      # Project/deal management
│   │   ├── pipeline/      # Pipeline Kanban view
│   │   ├── call-logs/     # Call logging
│   │   ├── campaigns/     # Campaign builder
│   │   ├── territories/   # Territory management
│   │   ├── storm-targeting/ # Storm lead generation
│   │   ├── settings/      # App settings
│   │   └── ...            # Other dashboard routes
│   ├── api/               # API routes (42 directories)
│   │   ├── admin/         # Admin operations
│   │   ├── ai/            # AI endpoints
│   │   ├── contacts/      # Contact CRUD
│   │   ├── projects/      # Project CRUD
│   │   ├── sms/           # SMS/Twilio
│   │   ├── email/         # Email/Resend
│   │   ├── voice/         # Voice AI
│   │   ├── quickbooks/    # QuickBooks integration
│   │   ├── gamification/  # Points/leaderboards
│   │   └── ...            # Other API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page (redirects)
├── components/            # React components (30 directories)
│   ├── ui/               # shadcn/ui components
│   ├── layout/           # Layout components (Sidebar)
│   ├── pwa/              # PWA components
│   ├── contacts/         # Contact-related
│   ├── projects/         # Project-related
│   ├── pipeline/         # Pipeline components
│   ├── gamification/     # Gamification UI
│   ├── impersonation/    # Admin impersonation
│   ├── ai-assistant/     # Voice assistant UI
│   └── ...               # Other component groups
├── lib/                   # Utilities and services (37 directories)
│   ├── supabase/         # Supabase clients
│   ├── auth/             # Authentication helpers
│   ├── db/               # IndexedDB utilities
│   ├── twilio/           # Twilio integration
│   ├── resend/           # Email integration
│   ├── quickbooks/       # QuickBooks integration
│   ├── impersonation/    # Admin impersonation
│   └── ...               # Other utilities
├── public/               # Static assets
│   ├── manifest.json     # PWA manifest
│   ├── icons/            # PWA icons
│   └── ...
├── e2e/                  # Playwright E2E tests
├── docs/                 # Project documentation
└── scripts/              # Utility scripts
```

### Route Groups

The application uses Next.js route groups for logical organization:

1. **`(auth)`** - Authentication routes (login, register, reset password)
   - Minimal layout without dashboard navigation
   - Public access

2. **`(dashboard)`** - Protected application routes
   - Full layout with sidebar navigation
   - Requires authentication
   - Contains 23 route directories

### API Routes (42 Endpoints)

| Category | Routes | Purpose |
|----------|--------|---------|
| CRM | `/api/contacts`, `/api/projects` | Core CRUD operations |
| Communication | `/api/sms`, `/api/email`, `/api/call-logs` | Messaging |
| Voice | `/api/voice`, `/api/ai` | AI voice assistant |
| Integrations | `/api/quickbooks`, `/api/signature-documents` | Third-party |
| Location | `/api/territories`, `/api/maps`, `/api/storm-targeting` | Geospatial |
| Gamification | `/api/gamification` | Points/leaderboards |
| Admin | `/api/admin`, `/api/settings` | Administration |
| Utility | `/api/search`, `/api/filters`, `/api/workflows` | Support |

---

## Multi-Tenant Architecture

### Database Schema

The application uses a **single-database multi-tenant architecture** with Row-Level Security (RLS) for data isolation.

**Core Tenant Tables:**

```sql
-- Master tenant table
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  custom_domain VARCHAR(255),
  settings JSONB DEFAULT '{}',
  features JSONB DEFAULT '{"max_users": 10, "max_contacts": 10000}',
  subscription_status VARCHAR(50) DEFAULT 'trial',
  is_active BOOLEAN DEFAULT true
);

-- User-tenant association
CREATE TABLE tenant_users (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES auth.users(id),
  role VARCHAR(50) DEFAULT 'member', -- admin, manager, member, viewer
  joined_at TIMESTAMP WITH TIME ZONE
);
```

### Row-Level Security (RLS)

Every tenant-scoped table includes:
- `tenant_id UUID NOT NULL REFERENCES tenants(id)` column
- RLS policies that filter by the current user's tenant

**Authentication Flow:**
1. User authenticates via Supabase Auth
2. `tenant_users` table lookup determines tenant membership
3. RLS policies automatically filter all queries to user's tenant

### User Roles

| Role | Description | Capabilities |
|------|-------------|--------------|
| `admin` | Tenant administrator | Full access, impersonation, settings |
| `manager` | Team manager | Most access, team management |
| `member` | Regular user | Standard CRM access |
| `viewer` | Read-only user | View-only access |

### Admin Impersonation

Administrators can impersonate other users for support purposes:

```typescript
// lib/impersonation/types.ts
interface ImpersonationSession {
  admin_user_id: string
  admin_email: string
  impersonated_user_id: string
  impersonated_email: string
  impersonated_role: string
  started_at: string
  expires_at: string
  reason?: string
  log_id: string
}
```

**Features:**
- 4-hour session limit
- Full audit logging
- Cookie-based session tracking
- RLS integration via `set_impersonation_session` RPC

---

## Supabase Client Architecture

### Server-Side Client

```typescript
// lib/supabase/server.ts
export async function createClient() {
  const cookieStore = await cookies()

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { ... }
      }
    }
  )

  // Handle admin impersonation
  // Sets Postgres session variables for RLS
  return client
}
```

### Client-Side Client

```typescript
// lib/supabase/client.ts
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Admin Client (Bypasses RLS)

```typescript
// lib/supabase/server.ts
export async function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { ... } }
  )
}
```

---

## PWA Architecture

### Service Worker Configuration

```typescript
// next.config.ts
const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  clientsClaim: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // Google Fonts - CacheFirst (365 days)
    // Static assets - StaleWhileRevalidate (24 hours)
    // Next.js data - StaleWhileRevalidate (24 hours)
    // API routes - NetworkFirst (24 hours, 10s timeout)
    // Other routes - NetworkFirst (24 hours)
  ]
})
```

### PWA Manifest

```json
{
  "name": "Roofing SaaS - CRM & Field Management",
  "short_name": "Roofing SaaS",
  "display": "standalone",
  "orientation": "portrait-primary",
  "categories": ["business", "productivity"],
  "shortcuts": [
    { "name": "New Contact", "url": "/contacts/new" },
    { "name": "Take Photo", "url": "/photos/capture" }
  ],
  "share_target": {
    "action": "/share",
    "params": { "files": [{ "accept": ["image/*"] }] }
  }
}
```

### PWA Provider

```typescript
// components/pwa/PWAProvider.tsx
export function PWAProvider({ children, tenantId }) {
  useEffect(() => {
    // Initialize IndexedDB for contacts/projects cache
    initDB()

    // Initialize Dexie database for offline photo queue
    initializeOfflineQueue()

    // Setup network listeners for photo queue auto-sync
    setupNetworkListeners()

    // Setup sync listeners if tenantId is provided
    if (tenantId) setupSyncListeners(tenantId)

    // Register service worker
    navigator.serviceWorker.ready.then(...)
  }, [tenantId])

  return (
    <>
      {children}
      <InstallPrompt />
      <OfflineIndicator />
      {tenantId && <SyncStatus tenantId={tenantId} />}
    </>
  )
}
```

### Offline Data Storage

**IndexedDB Schema (idb library):**

```typescript
// lib/db/indexeddb.ts
interface RoofingSaaSDB extends DBSchema {
  contacts: { key: string; value: Contact; indexes: {...} }
  projects: { key: string; value: Project; indexes: {...} }
  pending_uploads: { key: string; value: Upload; indexes: {...} }
  pending_actions: { key: string; value: Action; indexes: {...} }
}
```

**Dexie Schema (Photo Queue):**

```typescript
// lib/db/offline-queue.ts
class OfflineQueueDB extends Dexie {
  queuedPhotos!: Table<QueuedPhoto, number>

  constructor() {
    super('RoofingSaaSOfflineQueue')
    this.version(1).stores({
      queuedPhotos: '++id, localId, status, contactId, tenantId, createdAt'
    })
  }
}
```

---

## Build & Deployment

### Next.js Configuration

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  reactStrictMode: false, // Disabled for Leaflet compatibility
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [{
      protocol: 'https',
      hostname: 'wfifizczqvogbcqamnmw.supabase.co',
      pathname: '/storage/v1/object/public/**',
    }],
  },
  async headers() {
    return [
      // Static assets: public, max-age=31536000, immutable
      // API routes: no-store, must-revalidate
    ]
  },
}

// Wrapped with Sentry for error tracking
export default withSentryConfig(withPWA(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  widenClientFileUpload: true,
  reactComponentAnnotation: { enabled: true },
  tunnelRoute: "/monitoring",
  disableLogger: true,
  automaticVercelMonitors: true,
})
```

### Deployment Platform

**Vercel** with:
- Edge-optimized hosting
- Automatic preview deployments
- Environment variable management
- Vercel Cron integration for Sentry monitors

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "strict": true,
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "paths": { "@/*": ["./*"] }
  }
}
```

---

## Security Architecture

### Authentication

- **Provider**: Supabase Auth
- **Session Management**: Cookie-based with automatic refresh
- **Protected Routes**: Server-side auth checks in layouts

### Data Security

- **RLS**: All tenant data protected by Row-Level Security
- **Service Role**: Admin operations use separate service role key
- **API Routes**: All API routes verify authentication

### Communication Security

- **HTTPS**: Enforced on all endpoints
- **Twilio**: Verified caller IDs and webhook signatures
- **Email**: Domain verification via Resend

---

## Key Design Decisions

### 1. App Router over Pages Router
- **Rationale**: Server Components, streaming, improved performance
- **Trade-off**: Learning curve, some ecosystem incompatibilities

### 2. Single-Database Multi-Tenancy
- **Rationale**: Simpler ops, easier queries, cost-effective
- **Trade-off**: RLS complexity, scaling considerations

### 3. Supabase over Custom Backend
- **Rationale**: Auth, storage, realtime out-of-box
- **Trade-off**: Vendor lock-in, PostgreSQL-specific

### 4. PWA over Native Apps
- **Rationale**: Single codebase, instant updates, no app store
- **Trade-off**: Limited device APIs, iOS PWA limitations

### 5. Dexie + idb for Offline
- **Rationale**: Type-safe IndexedDB, photo queue needs
- **Trade-off**: Two libraries, complexity

---

## File References

| File Path | Purpose |
|-----------|---------|
| `/Users/ccai/roofing saas/roofing-saas/package.json` | Dependencies and versions |
| `/Users/ccai/roofing saas/roofing-saas/next.config.ts` | Next.js and PWA configuration |
| `/Users/ccai/roofing saas/roofing-saas/tsconfig.json` | TypeScript configuration |
| `/Users/ccai/roofing saas/roofing-saas/app/layout.tsx` | Root layout with PWA provider |
| `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/layout.tsx` | Dashboard layout with auth |
| `/Users/ccai/roofing saas/roofing-saas/lib/supabase/client.ts` | Client-side Supabase |
| `/Users/ccai/roofing saas/roofing-saas/lib/supabase/server.ts` | Server-side Supabase |
| `/Users/ccai/roofing saas/roofing-saas/lib/auth/session.ts` | Auth utilities |
| `/Users/ccai/roofing saas/roofing-saas/lib/db/indexeddb.ts` | Offline storage |
| `/Users/ccai/roofing saas/roofing-saas/lib/db/offline-queue.ts` | Photo queue |
| `/Users/ccai/roofing saas/roofing-saas/public/manifest.json` | PWA manifest |
| `/Users/ccai/roofing saas/roofing-saas/components/pwa/PWAProvider.tsx` | PWA initialization |
| `/Users/ccai/roofing saas/DATABASE_SCHEMA_v2.sql` | Database schema |

---

## Validation Record

### Files Examined

1. `/Users/ccai/roofing saas/roofing-saas/package.json`
   - Verified all dependency versions
   - Confirmed Next.js 16.0.7, React 19.2.1, TypeScript 5.x

2. `/Users/ccai/roofing saas/roofing-saas/next.config.ts`
   - Verified PWA configuration with next-pwa
   - Confirmed Sentry integration
   - Verified image remotePatterns for Supabase storage

3. `/Users/ccai/roofing saas/roofing-saas/app/layout.tsx`
   - Verified PWAProvider wrapping
   - Confirmed metadata with manifest.json reference

4. `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/layout.tsx`
   - Verified auth check with `getCurrentUser()`
   - Confirmed role-based sidebar rendering

5. `/Users/ccai/roofing saas/roofing-saas/lib/supabase/server.ts`
   - Verified createClient and createAdminClient implementations
   - Confirmed impersonation session handling

6. `/Users/ccai/roofing saas/roofing-saas/lib/auth/session.ts`
   - Verified `getCurrentUser()`, `getUserTenantId()`, `getUserRole()`

7. `/Users/ccai/roofing saas/roofing-saas/lib/db/indexeddb.ts`
   - Verified RoofingSaaSDB schema with contacts, projects, pending stores

8. `/Users/ccai/roofing saas/roofing-saas/lib/db/offline-queue.ts`
   - Verified Dexie-based OfflineQueueDB for photos

9. `/Users/ccai/roofing saas/roofing-saas/public/manifest.json`
   - Verified PWA manifest with shortcuts and share_target

10. `/Users/ccai/roofing saas/DATABASE_SCHEMA_v2.sql`
    - Verified tenants and tenant_users tables
    - Confirmed RLS architecture

### Directory Structure Verified

```bash
# App directory routes
ls "/Users/ccai/roofing saas/roofing-saas/app/" → 7 items
ls "/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/" → 25 items
ls "/Users/ccai/roofing saas/roofing-saas/app/api/" → 44 items

# Components
ls "/Users/ccai/roofing saas/roofing-saas/components/" → 32 items

# Library utilities
ls "/Users/ccai/roofing saas/roofing-saas/lib/" → 37 items
```

### Verification Steps

1. Read package.json and verified all claimed technology versions
2. Examined next.config.ts for PWA, Sentry, and build configuration
3. Traced authentication flow through layouts and session utilities
4. Verified Supabase client implementations (browser + server)
5. Confirmed offline storage implementations (idb + Dexie)
6. Validated multi-tenant schema in DATABASE_SCHEMA_v2.sql
7. Checked PWA manifest and service worker configuration
8. Verified directory counts for app/, components/, lib/, api/

### Validated By
PRD Documentation Agent - Session 3
Date: 2025-12-11T00:15:00Z

---

*Generated by autonomous PRD harness using Archon + Claude Agent SDK*
*Archon Project ID: 15037fc7-6bb3-42ff-8ed9-dcf06e6c96b1*
