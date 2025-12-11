# QuickBooks Integration

## Overview

The QuickBooks Integration module enables bi-directional synchronization between the Roofing SAAS CRM and QuickBooks Online accounting software. This integration eliminates duplicate data entry by automatically syncing contacts as customers and projects as invoices, providing seamless financial workflow management for roofing businesses.

**Integration Type:** QuickBooks Online (QBO) via OAuth 2.0
**OAuth Library:** `intuit-oauth` v4.2.0
**Status:** Phase 1 Complete (OAuth), Phase 2 Sync Implemented

---

## User Stories

### Business Owner / Office Manager
- As an office manager, I want to connect my QuickBooks account so that contacts and invoices sync automatically
- As a business owner, I want to see which customers are synced to QuickBooks so I can ensure financial accuracy
- As an office manager, I want to disconnect QuickBooks if we change accounting software

### Sales Representative
- As a sales rep, I want won deals to automatically create invoices in QuickBooks so I don't have to enter them manually
- As a sales rep, I want to sync individual contacts to QuickBooks when needed

### Administrator
- As an admin, I want to view sync logs to troubleshoot any synchronization issues
- As an admin, I want to bulk sync all contacts to QuickBooks to ensure our data is complete

---

## Features

### 1. OAuth 2.0 Authentication

**Description:** Secure connection to QuickBooks Online using industry-standard OAuth 2.0 protocol with automatic token management.

**Implementation:**
- File: `lib/quickbooks/oauth-client.ts`
- Key function: `getOAuthClient()` - Creates configured OAuth client
- File: `lib/quickbooks/client.ts`
- Key functions: `getAuthorizationUrl()`, `exchangeAuthCode()`, `refreshAccessToken()`

**OAuth Flow:**
1. User clicks "Connect QuickBooks" → redirects to `/api/quickbooks/auth`
2. Server generates CSRF state token (base64 encoded with tenant_id, user_id, timestamp)
3. User authorizes on QuickBooks → redirected back to `/api/quickbooks/callback`
4. Server exchanges auth code for access + refresh tokens
5. Tokens stored in `quickbooks_tokens` table with tenant isolation

**Token Management:**
- Access tokens expire after 1 hour
- Refresh tokens valid for 100 days
- Auto-refresh when tokens expire within 5-minute buffer
- Refresh tokens rotate on each refresh (always store new value)

### 2. Connection Status Management

**Description:** Check, display, and manage QuickBooks connection status.

**Implementation:**
- File: `app/api/quickbooks/status/route.ts`
- Returns: `connected`, `realm_id`, `company_name`, `country`, `is_expired`, `connected_at`

**Status Response:**
```typescript
{
  connected: boolean
  realm_id?: string
  company_name?: string
  country?: string
  expires_at?: string
  is_expired?: boolean
  connected_at?: string
}
```

### 3. Contact-to-Customer Sync

**Description:** Synchronize CRM contacts to QuickBooks as customers.

**Implementation:**
- File: `lib/quickbooks/sync.ts`
- Key function: `syncContactToCustomer(contactId, tenantId, client)`
- API endpoint: `POST /api/quickbooks/sync/contact`

**Sync Logic:**
1. Check for existing mapping in `quickbooks_mappings` table
2. If mapped, update existing QuickBooks customer
3. If not mapped, check for duplicate by DisplayName in QuickBooks
4. If duplicate found, link to existing customer
5. If no duplicate, create new customer
6. Store mapping and log sync operation

**Field Mapping (Contact → Customer):**
| CRM Contact Field | QuickBooks Customer Field |
|-------------------|---------------------------|
| `first_name` + `last_name` | `DisplayName` |
| `first_name` | `GivenName` |
| `last_name` | `FamilyName` |
| `email` | `PrimaryEmailAddr.Address` |
| `phone` | `PrimaryPhone.FreeFormNumber` |
| `address` | `BillAddr.Line1` |
| `city` | `BillAddr.City` |
| `state` | `BillAddr.CountrySubDivisionCode` |
| `zip_code` | `BillAddr.PostalCode` |

### 4. Project-to-Invoice Sync

**Description:** Create QuickBooks invoices from CRM projects.

**Implementation:**
- File: `lib/quickbooks/sync.ts`
- Key function: `syncProjectToInvoice(projectId, tenantId, client)`
- API endpoint: `POST /api/quickbooks/sync/project`

**Sync Logic:**
1. Get project with associated contact
2. Ensure contact is synced to QuickBooks (auto-sync if not)
3. Create invoice with project value as line item amount
4. Store mapping and log sync operation

**Invoice Structure:**
```typescript
{
  CustomerRef: { value: qbCustomerId },
  Line: [{
    Amount: project.value,
    DetailType: 'SalesItemLineDetail',
    Description: project.name,
    SalesItemLineDetail: {
      ItemRef: { value: '1', name: 'Services' },
      Qty: 1,
      UnitPrice: project.value
    }
  }],
  TxnDate: currentDate
}
```

### 5. Bulk Sync Operations

**Description:** Synchronize all contacts for a tenant in a single operation.

**Implementation:**
- File: `lib/quickbooks/sync.ts`
- Key function: `bulkSyncContacts(tenantId, client)`
- Triggered via: `POST /api/quickbooks/sync/contact` with `{ bulkSync: true }`

**Returns:**
```typescript
{
  total: number
  synced: number
  failed: number
}
```

### 6. Retry Logic & Rate Limiting

**Description:** Robust error handling with exponential backoff and rate limiting.

**Implementation:**
- File: `lib/quickbooks/retry.ts`
- Key function: `withRetry(fn, options)`
- Rate limiter: `quickbooksRateLimiter` (Token bucket algorithm)

**Retry Configuration:**
- Max retries: 3
- Initial delay: 1000ms
- Max delay: 30000ms
- Backoff multiplier: 2
- Retryable status codes: 429, 500, 502, 503, 504

**Rate Limits:**
- QuickBooks API: 500 requests/minute per realm
- Token bucket: 500 max tokens, 8.33 tokens/second refill

### 7. Disconnect Integration

**Description:** Securely disconnect QuickBooks and remove stored tokens.

**Implementation:**
- File: `app/api/quickbooks/disconnect/route.ts`
- Method: `POST /api/quickbooks/disconnect`
- Action: Hard deletes tokens from `quickbooks_tokens` table

---

## Technical Implementation

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Settings UI (React)                       │
│                                                             │
│   [Connect QB] → /api/quickbooks/auth → Intuit OAuth        │
│                                                             │
│   [Sync Contact] → /api/quickbooks/sync/contact             │
│   [Sync Project] → /api/quickbooks/sync/project             │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   API Routes (Next.js)                       │
│                                                             │
│   /api/quickbooks/                                          │
│     ├── auth/          (GET - initiate OAuth)               │
│     ├── callback/      (GET - handle OAuth callback)        │
│     ├── status/        (GET - check connection)             │
│     ├── disconnect/    (POST - remove connection)           │
│     ├── refresh/       (POST - refresh tokens)              │
│     └── sync/                                               │
│         ├── contact/   (POST - sync contacts)               │
│         └── project/   (POST - sync projects)               │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│               Library Layer (/lib/quickbooks/)               │
│                                                             │
│   oauth-client.ts    - OAuth client configuration           │
│   client.ts          - QB API client & token management     │
│   api.ts             - High-level API helpers w/ retry      │
│   sync.ts            - Entity sync engine                   │
│   retry.ts           - Retry logic & rate limiting          │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   QuickBooks Online API                      │
│                                                             │
│   Base URL: https://quickbooks.api.intuit.com/v3/company    │
│   OAuth URL: https://appcenter.intuit.com/connect/oauth2    │
│                                                             │
│   Entities: Customer, Invoice, Payment, CompanyInfo         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `lib/quickbooks/client.ts` | Main QB API client with token management | 423 |
| `lib/quickbooks/oauth-client.ts` | OAuth client configuration | 44 |
| `lib/quickbooks/api.ts` | API wrapper with retry & rate limiting | 275 |
| `lib/quickbooks/sync.ts` | Contact/Project sync engine | 384 |
| `lib/quickbooks/retry.ts` | Retry logic & rate limiter | 164 |
| `app/api/quickbooks/auth/route.ts` | OAuth initiation endpoint | 61 |
| `app/api/quickbooks/callback/route.ts` | OAuth callback handler | 118 |
| `app/api/quickbooks/status/route.ts` | Connection status endpoint | 67 |
| `app/api/quickbooks/disconnect/route.ts` | Disconnect endpoint | 60 |
| `app/api/quickbooks/refresh/route.ts` | Token refresh endpoint | 125 |
| `app/api/quickbooks/sync/contact/route.ts` | Contact sync endpoint | 93 |
| `app/api/quickbooks/sync/project/route.ts` | Project sync endpoint | 80 |
| `types/intuit-oauth.d.ts` | TypeScript definitions for OAuth client | 75 |
| `lib/api/errors.ts` | Error handling including QuickBooksError | 145 |

### Data Flow

**OAuth Authorization Flow:**
```
User clicks "Connect"
        │
        ▼
GET /api/quickbooks/auth
        │
        ├─► Generate CSRF state (base64: tenant_id, user_id, timestamp)
        │
        ▼
Redirect to Intuit OAuth Page
        │
        ├─► User authorizes app
        │
        ▼
GET /api/quickbooks/callback?code=xxx&realmId=xxx&state=xxx
        │
        ├─► Verify CSRF state (< 5 minutes old)
        ├─► Exchange code for tokens
        ├─► Fetch company info
        ├─► Store tokens in quickbooks_tokens
        │
        ▼
Redirect to /settings?qb_connected=true
```

**Contact Sync Flow:**
```
POST /api/quickbooks/sync/contact
        │
        ├─► Authenticate user, get tenant
        ├─► Get QuickBooks client (auto-refresh tokens)
        │
        ▼
syncContactToCustomer(contactId, tenantId, client)
        │
        ├─► Check quickbooks_mappings for existing link
        │
        ├─► If mapped: Update existing QB customer
        │
        ├─► If not mapped:
        │       ├─► Search QB for duplicate by name
        │       ├─► If found: Link to existing
        │       └─► If not: Create new customer
        │
        ├─► Store/update mapping in quickbooks_mappings
        ├─► Log sync in quickbooks_sync_logs
        │
        ▼
Return { success: true, qbCustomerId: xxx }
```

---

## API Endpoints

### GET /api/quickbooks/auth

**Purpose:** Initiate OAuth 2.0 authorization flow

**Authentication:** Required (user must be logged in)

**Response:** HTTP 302 redirect to QuickBooks authorization page

**State Parameter:** Base64 encoded JSON containing:
- `tenant_id`: User's tenant UUID
- `user_id`: Current user UUID
- `timestamp`: Unix timestamp for CSRF validation

### GET /api/quickbooks/callback

**Purpose:** Handle OAuth callback from QuickBooks

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | Authorization code from QuickBooks |
| `state` | string | CSRF state parameter |
| `realmId` | string | QuickBooks company ID |
| `error` | string | Error message if authorization failed |

**Success Response:** HTTP 302 redirect to `/settings?qb_connected=true`

**Error Response:** HTTP 302 redirect to `/settings?qb_error=xxx`

### GET /api/quickbooks/status

**Purpose:** Check QuickBooks connection status for current tenant

**Authentication:** Required

**Response:**
```typescript
// Connected
{
  connected: true,
  realm_id: "123456789",
  company_name: "ABC Roofing LLC",
  country: "US",
  expires_at: "2025-12-11T01:30:00Z",
  is_expired: false,
  connected_at: "2025-10-04T10:00:00Z"
}

// Not connected
{
  connected: false,
  message: "QuickBooks not connected"
}
```

### POST /api/quickbooks/disconnect

**Purpose:** Disconnect QuickBooks integration

**Authentication:** Required

**Response:**
```typescript
{ success: true }
```

### POST /api/quickbooks/refresh

**Purpose:** Manually refresh OAuth tokens

**Authentication:** Required

**Response:**
```typescript
{
  success: true,
  expiresAt: "2025-12-11T02:30:00Z"
}
```

**Error (reauth required):**
```typescript
{
  error: "REAUTH_REQUIRED",
  message: "Please reconnect your QuickBooks account"
}
```

### POST /api/quickbooks/sync/contact

**Purpose:** Sync contact(s) to QuickBooks as customer(s)

**Authentication:** Required

**Request Body:**
```typescript
// Single contact
{ contactId: "uuid" }

// Bulk sync all contacts
{ bulkSync: true }
```

**Response (single):**
```typescript
{
  success: true,
  qbCustomerId: "123"
}
```

**Response (bulk):**
```typescript
{
  success: true,
  message: "Synced 45 of 50 contacts",
  total: 50,
  synced: 45,
  failed: 5
}
```

### POST /api/quickbooks/sync/project

**Purpose:** Sync project to QuickBooks as invoice

**Authentication:** Required

**Request Body:**
```typescript
{ projectId: "uuid" }
```

**Response:**
```typescript
{
  success: true,
  qbInvoiceId: "456"
}
```

---

## Data Models

### QuickBooks Tokens Table

**Table:** `quickbooks_tokens`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Foreign key to tenants (unique) |
| `access_token` | TEXT | OAuth access token |
| `refresh_token` | TEXT | OAuth refresh token |
| `realm_id` | TEXT | QuickBooks company ID |
| `expires_at` | TIMESTAMPTZ | Token expiration time |
| `token_type` | TEXT | Token type (default: 'Bearer') |
| `company_name` | TEXT | QuickBooks company name |
| `country` | TEXT | Company country |
| `created_at` | TIMESTAMPTZ | Connection created timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Constraints:** One connection per tenant (`UNIQUE(tenant_id)`)

### QuickBooks Mappings Table

**Table:** `quickbooks_mappings`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Foreign key to tenants |
| `crm_entity_type` | TEXT | 'contact', 'project', etc. |
| `crm_entity_id` | UUID | CRM entity UUID |
| `qb_entity_type` | TEXT | 'Customer', 'Invoice', 'Payment' |
| `qb_entity_id` | TEXT | QuickBooks entity ID |
| `last_synced_at` | TIMESTAMPTZ | Last successful sync |
| `sync_status` | TEXT | 'synced', 'needs_sync', 'conflict' |
| `created_at` | TIMESTAMPTZ | Mapping created timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Constraints:** `UNIQUE(tenant_id, crm_entity_type, crm_entity_id)`

### QuickBooks Sync Logs Table

**Table:** `quickbooks_sync_logs`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Foreign key to tenants |
| `entity_type` | TEXT | 'contact', 'project', 'invoice', 'payment' |
| `entity_id` | UUID | CRM entity ID |
| `qb_id` | TEXT | QuickBooks entity ID |
| `action` | TEXT | 'create', 'update', 'delete', 'fetch', 'link' |
| `direction` | TEXT | 'to_qb', 'from_qb', 'bidirectional' |
| `status` | TEXT | 'success', 'error', 'partial' |
| `error_message` | TEXT | Error description if failed |
| `error_code` | TEXT | Error code for categorization |
| `request_payload` | JSONB | Request data sent to QB |
| `response_payload` | JSONB | Response data from QB |
| `synced_at` | TIMESTAMPTZ | Sync operation timestamp |
| `created_at` | TIMESTAMPTZ | Log created timestamp |

### TypeScript Interfaces

**File:** `lib/quickbooks/client.ts`

```typescript
interface QBCustomer {
  Id?: string
  SyncToken?: string
  DisplayName: string
  PrimaryEmailAddr?: { Address: string }
  PrimaryPhone?: { FreeFormNumber: string }
  BillAddr?: {
    Line1?: string
    City?: string
    CountrySubDivisionCode?: string
    PostalCode?: string
  }
  GivenName?: string
  FamilyName?: string
}

interface QBInvoice {
  Id?: string
  CustomerRef: { value: string; name?: string }
  Line: Array<{
    Amount: number
    DetailType: 'SalesItemLineDetail' | 'SubTotalLineDetail'
    SalesItemLineDetail?: {
      ItemRef: { value: string; name?: string }
      Qty?: number
      UnitPrice?: number
    }
    Description?: string
  }>
  TxnDate?: string
  DueDate?: string
  DocNumber?: string
}

interface QBPayment {
  Id?: string
  CustomerRef: { value: string }
  TotalAmt: number
  TxnDate?: string
  PaymentRefNum?: string
  Line?: Array<{
    Amount: number
    LinkedTxn: Array<{ TxnId: string; TxnType: string }>
  }>
}

interface QBCompanyInfo {
  CompanyName?: string
  LegalName?: string
  CompanyAddr?: {...}
  PrimaryPhone?: { FreeFormNumber?: string }
  Country?: string
  Email?: { Address?: string }
}
```

---

## Database Indexes

Defined in `supabase/migrations/20251004_quickbooks_integration.sql`:

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_qb_tokens_tenant` | quickbooks_tokens | tenant_id | Fast tenant lookup |
| `idx_qb_sync_logs_tenant` | quickbooks_sync_logs | tenant_id | Filter logs by tenant |
| `idx_qb_sync_logs_entity` | quickbooks_sync_logs | entity_type, entity_id | Find logs for entity |
| `idx_qb_sync_logs_status` | quickbooks_sync_logs | status | Filter by sync status |
| `idx_qb_sync_logs_created` | quickbooks_sync_logs | created_at DESC | Recent logs first |
| `idx_qb_mappings_tenant` | quickbooks_mappings | tenant_id | Filter mappings by tenant |
| `idx_qb_mappings_crm` | quickbooks_mappings | crm_entity_type, crm_entity_id | Find mapping by CRM entity |
| `idx_qb_mappings_qb` | quickbooks_mappings | qb_entity_type, qb_entity_id | Find mapping by QB entity |

---

## Row-Level Security (RLS)

All QuickBooks tables have RLS enabled with tenant-scoped policies:

**quickbooks_tokens:**
- SELECT/ALL: Users can only access their tenant's tokens

**quickbooks_sync_logs:**
- SELECT: Users can view their tenant's logs
- INSERT: Users can insert logs for their tenant

**quickbooks_mappings:**
- ALL: Users can manage their tenant's mappings

---

## Integration Points

### Contact Management
- Contacts can be synced to QuickBooks as customers
- Sync triggered manually via API or automatically on status change (future)
- Mapping stored in `quickbooks_mappings` for bidirectional reference

### Projects
- Projects can be synced to QuickBooks as invoices
- Project value becomes invoice amount
- Contact auto-synced if not already linked to QB customer

### Error Handling
- Custom `QuickBooksError` type in `lib/api/errors.ts`
- Error codes: `QUICKBOOKS_ERROR`, `QUICKBOOKS_AUTH_REQUIRED`
- `RetryableError` for transient failures (rate limits, server errors)

---

## Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `QUICKBOOKS_CLIENT_ID` | OAuth app client ID | `ABxxxxxx...` |
| `QUICKBOOKS_CLIENT_SECRET` | OAuth app client secret | `xxxx...` |
| `QUICKBOOKS_ENVIRONMENT` | API environment | `sandbox` or `production` |
| `QUICKBOOKS_REDIRECT_URI` | OAuth callback URL | `https://app.example.com/api/quickbooks/callback` |

### Getting QuickBooks Credentials

1. Sign in to [Intuit Developer Portal](https://developer.intuit.com/dashboard)
2. Create or select an app
3. Navigate to Keys & OAuth section
4. Copy Client ID and Client Secret
5. Add redirect URI matching your environment

### OAuth Scopes

Configured in `lib/quickbooks/oauth-client.ts`:
- `com.intuit.quickbooks.accounting` - Full accounting access
- `openid` - OpenID authentication
- `profile` - User profile information
- `email` - User email address

---

## Security

### Token Storage
- Tokens stored server-side only (never client-side)
- RLS policies enforce tenant isolation
- HTTP-only cookies for CSRF state protection
- State tokens expire after 5 minutes

### API Security
- All endpoints require authentication
- Tenant ID validated before operations
- Automatic token refresh prevents token exposure
- Failed auth marks connection inactive and deletes tokens

### Error Handling
- Tokens never exposed in error messages
- Server-side logging only
- User-friendly error messages returned to client
- Sync errors tracked in database for audit

### Rate Limiting
- Token bucket algorithm prevents API abuse
- Respects QuickBooks rate limits (500/minute)
- Exponential backoff on rate limit errors

---

## Testing

### Sandbox Testing

1. Use sandbox credentials from Intuit Developer Portal
2. Create test company in QuickBooks Sandbox
3. Test OAuth flow end-to-end
4. Verify token refresh works
5. Test contact and project sync
6. Test bulk sync operations

### Production Deployment Checklist

- [ ] Complete Intuit App Assessment
- [ ] Get production credentials
- [ ] Update environment variables
- [ ] Change `QUICKBOOKS_ENVIRONMENT=production`
- [ ] Test with real QuickBooks company
- [ ] Verify SSL/HTTPS enabled
- [ ] Redirect URIs match production

---

## Performance Notes

### Rate Limiting
- QuickBooks API: 500 requests/minute per realm
- Built-in rate limiter prevents exceeding limits
- Bulk sync operations respect rate limits

### Best Practices
- Cache frequently accessed data
- Use bulk operations when possible
- Log all sync operations for debugging
- Monitor sync logs for failures

---

## Future Enhancements (Planned)

### Phase 3 Features
- [ ] Webhook integration for real-time updates
- [ ] Bidirectional sync (QB → CRM)
- [ ] Conflict resolution UI
- [ ] Automatic sync on contact/project updates
- [ ] Payment tracking integration
- [ ] Estimate creation from proposals

---

## File References

All files referenced in this document with full paths:

**Library Files:**
- `/Users/ccai/roofing saas/roofing-saas/lib/quickbooks/client.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/quickbooks/oauth-client.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/quickbooks/api.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/quickbooks/sync.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/quickbooks/retry.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/api/errors.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/types/api.ts`

**API Routes:**
- `/Users/ccai/roofing saas/roofing-saas/app/api/quickbooks/auth/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/quickbooks/callback/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/quickbooks/status/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/quickbooks/disconnect/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/quickbooks/refresh/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/quickbooks/sync/contact/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/quickbooks/sync/project/route.ts`

**Type Definitions:**
- `/Users/ccai/roofing saas/roofing-saas/types/intuit-oauth.d.ts`

**Database Migrations:**
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251004_quickbooks_integration.sql`

**Documentation:**
- `/Users/ccai/roofing saas/roofing-saas/docs/integrations/QUICKBOOKS_INTEGRATION.md`

---

## Validation Record

### Files Examined
1. `/Users/ccai/roofing saas/roofing-saas/lib/quickbooks/client.ts` - QuickBooks API client, 423 lines, verified OAuth functions
2. `/Users/ccai/roofing saas/roofing-saas/lib/quickbooks/oauth-client.ts` - OAuth configuration, 44 lines, verified intuit-oauth usage
3. `/Users/ccai/roofing saas/roofing-saas/lib/quickbooks/api.ts` - API wrapper, 275 lines, verified retry logic
4. `/Users/ccai/roofing saas/roofing-saas/lib/quickbooks/sync.ts` - Sync engine, 384 lines, verified contact/project sync
5. `/Users/ccai/roofing saas/roofing-saas/lib/quickbooks/retry.ts` - Retry logic, 164 lines, verified rate limiter
6. `/Users/ccai/roofing saas/roofing-saas/app/api/quickbooks/auth/route.ts` - Auth endpoint, 61 lines
7. `/Users/ccai/roofing saas/roofing-saas/app/api/quickbooks/callback/route.ts` - Callback handler, 118 lines
8. `/Users/ccai/roofing saas/roofing-saas/app/api/quickbooks/status/route.ts` - Status endpoint, 67 lines
9. `/Users/ccai/roofing saas/roofing-saas/app/api/quickbooks/disconnect/route.ts` - Disconnect endpoint, 60 lines
10. `/Users/ccai/roofing saas/roofing-saas/app/api/quickbooks/refresh/route.ts` - Refresh endpoint, 125 lines
11. `/Users/ccai/roofing saas/roofing-saas/app/api/quickbooks/sync/contact/route.ts` - Contact sync, 93 lines
12. `/Users/ccai/roofing saas/roofing-saas/app/api/quickbooks/sync/project/route.ts` - Project sync, 80 lines
13. `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251004_quickbooks_integration.sql` - DB schema, 173 lines
14. `/Users/ccai/roofing saas/roofing-saas/types/intuit-oauth.d.ts` - TypeScript defs, 75 lines
15. `/Users/ccai/roofing saas/roofing-saas/lib/api/errors.ts` - Error handling, 145 lines
16. `/Users/ccai/roofing saas/roofing-saas/lib/types/api.ts` - API types, verified QuickBooks types
17. `/Users/ccai/roofing saas/roofing-saas/docs/integrations/QUICKBOOKS_INTEGRATION.md` - Original docs
18. `/Users/ccai/roofing saas/roofing-saas/package.json` - Verified `intuit-oauth: ^4.2.0`

### Archon RAG Queries
- Query: "QuickBooks OAuth integration API accounting" - Found QuickBooks OAuth 2.0 documentation from developer.intuit.com

### Verification Steps
1. Confirmed all 7 API routes exist in `/app/api/quickbooks/`
2. Verified OAuth flow through auth/callback route examination
3. Confirmed sync engine functions in `sync.ts`
4. Verified database schema in migration file
5. Confirmed `intuit-oauth` v4.2.0 in package.json
6. Verified retry logic and rate limiter implementation
7. Confirmed RLS policies in migration file
8. Verified TypeScript definitions for OAuth client

### Validated By
PRD Documentation Agent - Session 8
Date: 2025-12-10T00:40:00Z
