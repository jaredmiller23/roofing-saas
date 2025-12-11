# Authentication System

## Overview

The Roofing SAAS application implements a comprehensive authentication system powered by **Supabase Auth** with cookie-based session management for Server-Side Rendering (SSR) compatibility. The system supports multi-tenant architecture with role-based access control (RBAC) and includes an admin impersonation feature for customer support operations.

The authentication architecture follows Supabase's recommended SSR patterns using the `@supabase/ssr` package, storing sessions in HTTP-only cookies rather than localStorage for enhanced security and SSR compatibility.

## User Stories

- As a **new user**, I want to register an account with my email so that I can access the Roofing SAAS platform
- As a **registered user**, I want to sign in with my email and password so that I can access my dashboard
- As a **user who forgot their password**, I want to reset my password via email so that I can regain access to my account
- As a **logged-in user**, I want my session to persist across page refreshes so that I don't have to re-authenticate constantly
- As an **admin**, I want to impersonate other users in my tenant so that I can troubleshoot issues on their behalf
- As a **user**, I want to be automatically redirected to login if my session expires so that I understand why I can't access protected content

## Features

### 1. User Registration

Users can create new accounts with email and password authentication.

**Implementation:**
- File: `app/(auth)/register/page.tsx`
- Key function: `handleRegister()` using `supabase.auth.signUp()`

**Registration Flow:**
1. User enters full name, email, and password (minimum 8 characters)
2. Password confirmation validation
3. Supabase creates user account with user metadata (full_name)
4. Verification email sent with callback URL
5. User redirected to success message prompting email verification

**Fields Captured:**
| Field | Type | Validation |
|-------|------|------------|
| Full Name | string | Required |
| Email | email | Required, valid email format |
| Password | string | Required, minimum 8 characters |
| Confirm Password | string | Must match password |

### 2. User Login

Email/password authentication with session creation and cookie management.

**Implementation:**
- File: `app/(auth)/login/page.tsx`
- Key function: `handleLogin()` using `supabase.auth.signInWithPassword()`

**Login Flow:**
1. User enters email and password
2. Supabase validates credentials
3. Session created and stored in HTTP-only cookies
4. User redirected to `/dashboard`
5. `router.refresh()` called to update server-side state

### 3. Password Reset

Two-stage password reset flow with email verification.

**Stage 1 - Request Reset:**
- File: `app/(auth)/reset-password/page.tsx`
- Key function: `handleResetPassword()` using `supabase.auth.resetPasswordForEmail()`
- Sends email with 1-hour expiration link

**Stage 2 - Update Password:**
- File: `app/(auth)/auth/update-password/page.tsx`
- Key function: `handleUpdatePassword()` using `supabase.auth.updateUser()`
- Validates password length (minimum 8 characters) and confirmation match

### 4. Auth Callback Handler

Handles email verification, password reset, and OAuth callbacks.

**Implementation:**
- File: `app/(auth)/auth/callback/route.ts`
- Key function: `GET()` route handler

**Supported Callbacks:**
- Email verification confirmations
- Password reset confirmations
- OAuth provider callbacks (extensible)

**Flow:**
1. Receives `code` query parameter from Supabase email link
2. Exchanges code for session via `supabase.auth.exchangeCodeForSession()`
3. Redirects to dashboard on success, or login with error message on failure

### 5. Route Protection (Middleware/Proxy)

Authentication proxy that protects routes and manages sessions.

**Implementation:**
- File: `proxy.ts`
- Key function: `proxy()` middleware function

**Protected vs Public Routes:**

| Route Type | Routes |
|------------|--------|
| **Public** | `/login`, `/register`, `/reset-password`, `/auth/callback`, `/auth/update-password` |
| **Webhooks (Public)** | `/api/sms/webhook`, `/api/email/webhook`, `/api/voice/webhook`, `/api/voice/twiml`, `/api/voice/recording` |
| **Protected** | All other routes (require authentication) |

**Middleware Behavior:**
1. Creates server-side Supabase client with cookie handling
2. Calls `supabase.auth.getUser()` to validate session
3. Unauthenticated users → redirect to `/login`
4. Authenticated users on auth pages → redirect to `/dashboard`
5. Manages cookie synchronization between request/response

**Route Matcher:**
```typescript
matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
```

### 6. Session Management

Server-side session helpers for authenticated operations.

**Implementation:**
- File: `lib/auth/session.ts`

**Available Functions:**

| Function | Purpose | Return Type |
|----------|---------|-------------|
| `getCurrentUser()` | Get authenticated user | `Promise<User \| null>` |
| `getSession()` | Get active session | `Promise<Session \| null>` |
| `requireAuth()` | Require auth, throws if none | `Promise<User>` |
| `getUserTenantId(userId)` | Get user's tenant ID | `Promise<string \| null>` |
| `hasRole(userId, role)` | Check specific role | `Promise<boolean>` |
| `isAdmin(userId)` | Check admin role | `Promise<boolean>` |
| `getUserRole(userId)` | Get user's role | `Promise<string \| null>` |

### 7. Admin Impersonation System

Allows admin users to impersonate non-admin users within their tenant for support purposes.

**Implementation:**
- Type definitions: `lib/impersonation/types.ts`
- API routes: `app/api/admin/impersonate/route.ts`, `app/api/admin/impersonate/status/route.ts`
- Server client integration: `lib/supabase/server.ts`

**Impersonation Features:**
- 4-hour session duration (configurable)
- Audit logging of all impersonation sessions
- Cookie-based session with HTTP-only, Secure, SameSite=Strict
- Cannot impersonate self or other admins
- Full audit trail with IP address and user agent

**Security Controls:**
| Control | Implementation |
|---------|----------------|
| Admin-only access | `isAdmin()` check required |
| Same-tenant restriction | Target user must be in admin's tenant |
| Admin protection | Cannot impersonate another admin |
| Session limits | Only one active session at a time |
| Audit logging | All sessions logged with metadata |

## Technical Implementation

### Architecture

The authentication system follows a layered architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Components                        │
│            (Login, Register, Reset Password Pages)          │
│                    Uses: createBrowserClient                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Middleware/Proxy                        │
│           (Route Protection, Session Refresh)               │
│                Uses: createServerClient                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Server Components                         │
│           (Dashboard Layout, Protected Pages)               │
│                Uses: createClient (server)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Supabase Auth                            │
│       (JWT tokens, Password hashing, Session mgmt)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL + RLS                           │
│            (tenant_users, Row-Level Security)               │
└─────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `lib/supabase/client.ts` | Browser client for Client Components |
| `lib/supabase/server.ts` | Server client for Server Components/Actions |
| `lib/auth/session.ts` | Session helpers and role checking |
| `lib/impersonation/types.ts` | Admin impersonation type definitions |
| `proxy.ts` | Authentication middleware/proxy |
| `app/(auth)/layout.tsx` | Auth pages layout (minimal, no sidebar) |
| `app/(auth)/login/page.tsx` | Login page component |
| `app/(auth)/register/page.tsx` | Registration page component |
| `app/(auth)/reset-password/page.tsx` | Password reset request page |
| `app/(auth)/auth/update-password/page.tsx` | New password entry page |
| `app/(auth)/auth/callback/route.ts` | OAuth/email verification callback |
| `app/(dashboard)/layout.tsx` | Protected dashboard layout with auth check |
| `app/api/admin/impersonate/route.ts` | Start/stop impersonation API |
| `app/api/admin/impersonate/status/route.ts` | Check impersonation status API |

### Supabase Client Types

**Browser Client (`lib/supabase/client.ts`):**
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Server Client (`lib/supabase/server.ts`):**
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { /* ... */ }
      }
    }
  )
}
```

**Admin Client (Service Role):**
```typescript
export async function createAdminClient() {
  // Uses SUPABASE_SERVICE_ROLE_KEY
  // Bypasses RLS - use with caution
}
```

### Data Flow

**Login Flow:**
```
User → Login Page → supabase.auth.signInWithPassword()
                           │
                           ▼
                    Supabase Auth
                           │
                           ▼
              JWT Token + Refresh Token
                           │
                           ▼
              Stored in HTTP-only Cookies
                           │
                           ▼
              Redirect to /dashboard
                           │
                           ▼
              Proxy validates via getUser()
                           │
                           ▼
              Dashboard Layout checks getCurrentUser()
                           │
                           ▼
              RLS policies filter data by tenant_id
```

**Impersonation Flow:**
```
Admin → POST /api/admin/impersonate
                    │
                    ▼
         Verify admin role + same tenant
                    │
                    ▼
         Create impersonation_logs entry
                    │
                    ▼
         Set impersonation_session cookie
                    │
                    ▼
         Server client calls set_impersonation_session RPC
                    │
                    ▼
         get_effective_user_id() returns impersonated_user_id
                    │
                    ▼
         RLS policies use effective user for queries
```

## API Endpoints

### GET /api/admin/impersonate/status
- **Purpose:** Check current impersonation status
- **Auth Required:** Yes
- **Response:**
```json
{
  "is_impersonating": true,
  "admin_user": { "id": "...", "email": "admin@example.com" },
  "impersonated_user": { "id": "...", "email": "user@example.com", "role": "user" },
  "started_at": "2025-12-10T12:00:00Z",
  "expires_at": "2025-12-10T16:00:00Z",
  "time_remaining_seconds": 14400,
  "reason": "Troubleshooting pipeline issue"
}
```

### POST /api/admin/impersonate
- **Purpose:** Start impersonating a user
- **Auth Required:** Yes (Admin only)
- **Request Body:**
```json
{
  "user_id": "target-user-uuid",
  "reason": "Troubleshooting pipeline issue"
}
```
- **Response:** `StartImpersonationResponse`

### DELETE /api/admin/impersonate
- **Purpose:** Stop impersonation session
- **Auth Required:** Yes (Admin who started session)
- **Response:**
```json
{
  "success": true,
  "duration_seconds": 1234
}
```

## Data Models

### ImpersonationCookie
| Field | Type | Description |
|-------|------|-------------|
| admin_user_id | string | UUID of admin user |
| impersonated_user_id | string | UUID of impersonated user |
| started_at | string | ISO timestamp of session start |
| expires_at | string | ISO timestamp of session expiration |
| reason | string? | Optional reason for impersonation |
| log_id | string | UUID of audit log entry |

### ImpersonationLog (Database)
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | Tenant context |
| admin_user_id | uuid | Admin who initiated |
| impersonated_user_id | uuid | Target user |
| started_at | timestamp | Session start |
| ended_at | timestamp? | Session end |
| duration_seconds | integer? | Calculated duration |
| reason | text? | Support reason |
| ip_address | text? | Admin's IP |
| user_agent | text? | Admin's browser |
| status | enum | 'active', 'ended', 'expired', 'terminated' |

### tenant_users (Multi-Tenant Mapping)
| Field | Type | Description |
|-------|------|-------------|
| tenant_id | uuid | Foreign key to tenants |
| user_id | uuid | Foreign key to auth.users |
| role | string | 'admin', 'user', etc. |

## Integration Points

### Dashboard Layout Integration
The dashboard layout (`app/(dashboard)/layout.tsx`) integrates with authentication:
```typescript
const user = await getCurrentUser()
if (!user) {
  redirect('/login')
}
const userRole = await getUserRole(user.id)
```

### RLS Policy Integration
All database queries are filtered by tenant via RLS policies that use:
```sql
tenant_id IN (
  SELECT tenant_id FROM tenant_users
  WHERE user_id = auth.uid()
)
```

### Impersonation + RLS Integration
When impersonating, the server client sets Postgres session variables:
```typescript
await client.rpc('set_impersonation_session', {
  p_admin_user_id: sessionData.admin_user_id,
  p_impersonated_user_id: sessionData.impersonated_user_id,
})
```
RLS policies can then use `get_effective_user_id()` to respect impersonation context.

## Configuration

### Environment Variables
| Variable | Purpose | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (admin operations) | Yes |

### Constants
| Constant | Value | File |
|----------|-------|------|
| `IMPERSONATION_COOKIE_NAME` | `'impersonation_session'` | `lib/impersonation/types.ts` |
| `IMPERSONATION_DURATION_HOURS` | `4` | `lib/impersonation/types.ts` |
| `IMPERSONATION_WARNING_MINUTES` | `5` | `lib/impersonation/types.ts` |

## Testing

### E2E Authentication Test
- File: `e2e/auth.setup.ts`
- Purpose: Authenticate test user before E2E test runs
- Test User: `test@roofingsaas.com` (configurable via `TEST_USER_EMAIL`)
- Auth State: Saved to `playwright/.auth/user.json` for reuse

### Test Flow:
1. Navigate to `/login`
2. Fill email and password inputs
3. Click submit button
4. Wait for redirect to `/dashboard`
5. Save storage state for subsequent tests

### Security Audit Status
Per the Security Audit Report (`docs/security/SECURITY_AUDIT_REPORT.md`):
- **Rating:** A- (Excellent)
- **Authentication Status:** PASSED - Industry-Standard Authentication
- **Session Management:** HTTP-only cookies (prevents XSS)
- **Route Protection:** Proper middleware implementation

## File References

All files referenced in this document with full paths:

**Core Authentication:**
- `/Users/ccai/roofing saas/roofing-saas/lib/supabase/client.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/supabase/server.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/auth/session.ts`
- `/Users/ccai/roofing saas/roofing-saas/proxy.ts`

**Auth Pages:**
- `/Users/ccai/roofing saas/roofing-saas/app/(auth)/layout.tsx`
- `/Users/ccai/roofing saas/roofing-saas/app/(auth)/login/page.tsx`
- `/Users/ccai/roofing saas/roofing-saas/app/(auth)/register/page.tsx`
- `/Users/ccai/roofing saas/roofing-saas/app/(auth)/reset-password/page.tsx`
- `/Users/ccai/roofing saas/roofing-saas/app/(auth)/auth/update-password/page.tsx`
- `/Users/ccai/roofing saas/roofing-saas/app/(auth)/auth/callback/route.ts`

**Impersonation:**
- `/Users/ccai/roofing saas/roofing-saas/lib/impersonation/types.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/admin/impersonate/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/admin/impersonate/status/route.ts`

**Protected Layout:**
- `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/layout.tsx`

**Testing:**
- `/Users/ccai/roofing saas/roofing-saas/e2e/auth.setup.ts`

**Documentation:**
- `/Users/ccai/roofing saas/roofing-saas/docs/security/SECURITY_AUDIT_REPORT.md`
- `/Users/ccai/roofing saas/roofing-saas/docs/RLS_SETUP_COMPLETE.md`

---

## Validation Record

### Files Examined
| File | What Was Verified |
|------|-------------------|
| `lib/supabase/client.ts` | Browser client creation using `createBrowserClient` |
| `lib/supabase/server.ts` | Server client with cookie management, admin client, impersonation support |
| `lib/auth/session.ts` | All 7 session helper functions verified |
| `lib/impersonation/types.ts` | Type definitions and constants (cookie name, duration) |
| `proxy.ts` | Route protection logic, public routes list, cookie handling |
| `app/(auth)/login/page.tsx` | Login form, `signInWithPassword()` call, redirect logic |
| `app/(auth)/register/page.tsx` | Registration form, validation, `signUp()` call |
| `app/(auth)/reset-password/page.tsx` | Password reset request flow |
| `app/(auth)/auth/update-password/page.tsx` | New password entry and validation |
| `app/(auth)/auth/callback/route.ts` | Code exchange for session |
| `app/(auth)/layout.tsx` | Minimal auth layout structure |
| `app/(dashboard)/layout.tsx` | Auth check with `getCurrentUser()` and role fetching |
| `app/api/admin/impersonate/route.ts` | POST/DELETE handlers with full audit logging |
| `app/api/admin/impersonate/status/route.ts` | GET handler for impersonation status |
| `e2e/auth.setup.ts` | E2E authentication setup for Playwright |
| `docs/security/SECURITY_AUDIT_REPORT.md` | Security audit findings |
| `docs/RLS_SETUP_COMPLETE.md` | RLS configuration details |

### Archon RAG Queries
- Query: "Supabase Auth Next.js SSR authentication cookies session management" - Found: Supabase SSR documentation, server-side auth patterns
- Query: "Supabase Auth createServerClient createBrowserClient SSR" - Found: Code examples for client creation patterns

### Verification Steps
1. **File existence verified** - All 17 files listed exist in the codebase
2. **Function signatures confirmed** - All documented functions match actual implementations
3. **API endpoints validated** - Route handlers exist at documented paths
4. **Constants verified** - `IMPERSONATION_DURATION_HOURS = 4`, `IMPERSONATION_COOKIE_NAME = 'impersonation_session'`
5. **Security audit cross-referenced** - Authentication section confirms HTTP-only cookies, proper middleware
6. **E2E test reviewed** - Confirms login flow matches documentation

### Validated By
PRD Documentation Agent - Session 4
Date: 2025-12-10T00:08:00Z
