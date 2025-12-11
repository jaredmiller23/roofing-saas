# Integration APIs Reference

## Overview

This document provides comprehensive API reference for external service integrations in the Roofing SAAS application. The system integrates with multiple third-party services for communication (Twilio SMS/Voice, Resend Email), accounting (QuickBooks Online), and claims management (Claims Agent).

All integrations follow security best practices with webhook signature verification, OAuth 2.0 flows, and comprehensive audit logging.

## User Stories

### Sales Representatives
- As a sales rep, I want SMS messages I receive from contacts to be automatically logged, so I have a complete communication history
- As a sales rep, I want to sync contacts to QuickBooks when they become customers, so accounting has accurate customer data

### Office Managers
- As an office manager, I want email open/click events to trigger automations, so I can follow up with engaged prospects
- As an office manager, I want invoices synced to QuickBooks when projects are sold, so billing is automated

### Business Owners
- As a business owner, I want full audit logs of all integration activities, so I have compliance records
- As a business owner, I want secure OAuth connections to financial systems, so company data is protected

---

## Twilio Integration

### Overview

Twilio provides SMS and Voice capabilities with webhook-based event delivery for inbound messages and call status updates.

### Webhooks

#### POST /api/sms/webhook

Receives inbound SMS messages from Twilio when contacts send messages to the company phone number.

**File:** `app/api/sms/webhook/route.ts`

**Headers:**
| Header | Type | Required | Description |
|--------|------|----------|-------------|
| x-twilio-signature | string | Yes | HMAC signature for request verification |
| Content-Type | string | Yes | `application/x-www-form-urlencoded` |

**Form Data Parameters (from Twilio):**
| Parameter | Type | Description |
|-----------|------|-------------|
| MessageSid | string | Unique Twilio message identifier |
| From | string | Sender phone number (E.164 format) |
| To | string | Recipient phone number (your Twilio number) |
| Body | string | Message content |
| NumMedia | string | Number of media attachments |

**Processing Flow:**
1. Parse form data from Twilio request
2. Verify Twilio signature using `verifyTwilioSignature()`
3. Lookup contact by phone number (`phone` or `mobile_phone` fields)
4. Log activity record with type `sms`, direction `inbound`
5. Process opt-out keywords (STOP, CANCEL, END, QUIT, UNSUBSCRIBE)
6. Process opt-in keywords (START, YES, UNSTOP, SUBSCRIBE)
7. Return TwiML response with appropriate message

**Opt-Out Keywords (TCPA Compliance):**
- STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT

**Opt-In Keywords:**
- START, YES, UNSTOP, SUBSCRIBE

**Response:** TwiML XML with optional message response

**Error Handling:** Returns 200 even on errors to prevent Twilio retries

---

#### POST /api/voice/webhook

Receives call status updates from Twilio for outbound and inbound calls.

**File:** `app/api/voice/webhook/route.ts`

**Headers:**
| Header | Type | Required | Description |
|--------|------|----------|-------------|
| x-twilio-signature | string | Yes | HMAC signature for request verification |

**Form Data Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| CallSid | string | Unique Twilio call identifier |
| From | string | Caller phone number |
| To | string | Called phone number |
| CallStatus | string | Current call status |
| Direction | string | `inbound` or `outbound-api` |
| CallDuration | string | Call duration in seconds (when complete) |

**Call Status Values:**
- `initiated` - Call initiated
- `ringing` - Phone is ringing
- `answered` - Call answered
- `completed` - Call ended normally
- `busy` - Busy signal
- `no-answer` - No answer
- `canceled` - Call canceled
- `failed` - Call failed

**Processing Flow:**
1. Verify Twilio signature
2. For existing calls: Update activity metadata with new status/duration
3. For new inbound calls: Create activity record, lookup contact by phone
4. Log call status update

**Response:** `200 OK` text response

---

#### GET /api/sms/webhook, GET /api/voice/webhook

Health check endpoints for verifying webhook configuration.

**Response:**
```json
{
  "status": "ok",
  "message": "SMS webhook endpoint is active"
}
```

---

### SMS Sending Library

**File:** `lib/twilio/sms.ts`

#### sendSMS(params: SendSMSParams)

Send a single SMS message with automatic retry logic.

**Parameters:**
```typescript
interface SendSMSParams {
  to: string       // E.164 format phone number
  body: string     // Message content (max 1600 chars)
  from?: string    // Optional sender number (defaults to TWILIO_PHONE_NUMBER)
}
```

**Response:**
```typescript
interface SMSResponse {
  sid: string        // Twilio message SID
  to: string         // Recipient number
  from: string       // Sender number
  body: string       // Message content
  status: string     // Delivery status
  dateCreated: Date  // Timestamp
}
```

**Retry Configuration:**
- Max attempts: 3
- Initial delay: 1000ms
- Max delay: 5000ms

---

#### sendBulkSMS(recipients: string[], body: string)

Send SMS to multiple recipients with rate limiting.

**Rate Limiting:** 100ms delay between messages

**Response:**
```typescript
{
  successful: SMSResponse[]
  failed: Array<{ to: string; error: string }>
}
```

---

### SMS Compliance Library

**File:** `lib/twilio/compliance.ts`

#### canSendSMS(phoneNumber: string)

Check if SMS can be sent to a contact (TCPA compliance).

**Checks:**
1. Contact opt-out status (`sms_opt_out` field)
2. Quiet hours (8am-9pm in contact's timezone)

**Response:**
```typescript
{
  allowed: boolean
  reason?: string  // If not allowed
}
```

#### optOutContact(phoneNumber: string, reason?: string)

Mark contact as opted out of SMS communications.

**Updates:**
- `sms_opt_out: true`
- `sms_opt_out_date: timestamp`
- `sms_opt_out_reason: string`

#### optInContact(phoneNumber: string)

Mark contact as opted in to SMS communications.

**Updates:**
- `sms_opt_in: true`
- `sms_opt_in_date: timestamp`
- `sms_opt_out: false` (clears previous opt-out)

---

## Resend Email Integration

### Overview

Resend provides transactional email delivery with webhook-based event tracking for opens, clicks, bounces, and complaints.

### Webhooks

#### POST /api/email/webhook

Receives email event notifications from Resend.

**File:** `app/api/email/webhook/route.ts`

**Headers:**
| Header | Type | Required | Description |
|--------|------|----------|-------------|
| svix-signature | string | Yes | HMAC-SHA256 signature |
| svix-timestamp | string | Yes | Unix timestamp for replay protection |

**Event Types:**
| Event | Description | Action |
|-------|-------------|--------|
| email.sent | Email sent to provider | Record sent timestamp |
| email.delivered | Email delivered to inbox | Update status to `delivered` |
| email.opened | Email opened by recipient | Increment open count, trigger `email_opened` workflow |
| email.clicked | Link clicked in email | Record link, trigger `email_clicked` workflow |
| email.bounced | Email bounced | Mark contact email as invalid (hard bounce) |
| email.complained | Spam complaint received | Mark contact as email opt-out |

**Webhook Payload:**
```json
{
  "type": "email.opened",
  "data": {
    "email_id": "string",
    "to": "string",
    "created_at": "ISO timestamp",
    "user_agent": "string (for opens)",
    "ip_address": "string (for opens)",
    "link": "string (for clicks)",
    "bounce_type": "hard|soft (for bounces)",
    "bounce_reason": "string (for bounces)"
  }
}
```

**Processing Flow:**
1. Get raw request body for signature verification
2. Verify Resend signature using `verifyResendSignature()`
3. Find activity by email_id in metadata
4. Update activity metadata based on event type
5. For bounces: Mark contact email as invalid
6. For complaints: Mark contact as email opt-out
7. For opens/clicks: Trigger automation workflows

**Signature Verification:**
- Uses HMAC-SHA256 with `RESEND_WEBHOOK_SECRET`
- Validates timestamp within 5 minutes (replay protection)
- Timing-safe comparison to prevent timing attacks

---

### Email Sending Library

**File:** `lib/resend/email.ts`

#### sendEmail(params: SendEmailParams)

Send a single email with automatic retry logic.

**Parameters:**
```typescript
interface SendEmailParams {
  to: string | string[]      // Recipient(s)
  subject: string            // Email subject
  html?: string              // HTML content
  text?: string              // Plain text content
  from?: string              // Sender (defaults to RESEND_FROM_EMAIL)
  replyTo?: string           // Reply-to address
  cc?: string | string[]     // CC recipients
  bcc?: string | string[]    // BCC recipients
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
  tags?: Array<{ name: string; value: string }>
}
```

**Validation:**
- Email address format validation
- Subject required
- Either HTML or text content required
- CC/BCC address validation

**Retry Configuration:**
- Max attempts: 3
- Initial delay: 1000ms
- Max delay: 5000ms

---

#### sendBulkEmails(recipients, delayMs)

Send emails to multiple recipients with rate limiting.

**Default delay:** 100ms between emails

---

## Webhook Security

**File:** `lib/webhooks/security.ts`

### Twilio Signature Verification

```typescript
async function verifyTwilioSignature(
  request: NextRequest,
  params: Record<string, string | string[]>
): Promise<TwilioSignatureVerificationResult>
```

**Process:**
1. Get `TWILIO_AUTH_TOKEN` from environment
2. Extract `x-twilio-signature` header
3. Call `twilio.validateRequest()` with full URL and params
4. Return validation result

### Resend Signature Verification

```typescript
async function verifyResendSignature(
  request: NextRequest,
  payload: string
): Promise<ResendSignatureVerificationResult>
```

**Process:**
1. Get `RESEND_WEBHOOK_SECRET` from environment
2. Extract `svix-signature` and `svix-timestamp` headers
3. Compute HMAC-SHA256 of `timestamp.payload`
4. Timing-safe comparison with received signature
5. Validate timestamp within 5 minutes

---

## QuickBooks Online Integration

### Overview

QuickBooks Online integration uses OAuth 2.0 for authorization and provides bidirectional sync of contacts (as Customers) and projects (as Invoices).

### OAuth Flow

#### GET /api/quickbooks/auth

Initiates OAuth 2.0 authorization flow by redirecting to QuickBooks.

**File:** `app/api/quickbooks/auth/route.ts`

**Flow:**
1. Verify user authentication
2. Get user's tenant ID
3. Generate CSRF state token (base64 encoded JSON with tenant_id, user_id, timestamp)
4. Generate authorization URL with:
   - `client_id`
   - `redirect_uri`
   - `response_type: code`
   - `scope: com.intuit.quickbooks.accounting`
   - `state`
5. Redirect user to QuickBooks authorization page

**State Token Structure:**
```json
{
  "tenant_id": "uuid",
  "user_id": "uuid",
  "timestamp": 1234567890
}
```

---

#### GET /api/quickbooks/callback

Handles OAuth callback from QuickBooks after user authorization.

**File:** `app/api/quickbooks/callback/route.ts`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| code | string | Authorization code |
| state | string | CSRF state token |
| realmId | string | QuickBooks company ID |
| error | string | Error code (if authorization failed) |

**Flow:**
1. Handle OAuth errors (redirect to settings with error)
2. Validate required parameters
3. Decode and validate state token (5-minute expiration)
4. Verify current user matches state user_id
5. Exchange authorization code for tokens
6. Fetch company info from QuickBooks API
7. Store tokens in `quickbooks_tokens` table (upsert)
8. Redirect to settings with success message

**Token Storage:**
```typescript
{
  tenant_id: string
  access_token: string
  refresh_token: string
  realm_id: string
  expires_at: timestamp
  token_type: string
  company_name: string
  country: string
}
```

---

#### POST /api/quickbooks/refresh

Refreshes expired OAuth tokens.

**File:** `app/api/quickbooks/refresh/route.ts`

**Authentication:** Required (via session)

**Flow:**
1. Get current connection from database
2. Initialize OAuth client with current tokens
3. Call `oauthClient.refresh()`
4. Update tokens in database (both access and refresh tokens rotate)

**Response:**
```json
{
  "success": true,
  "expiresAt": "ISO timestamp"
}
```

**Error Handling:**
- If refresh fails with 401, delete tokens and return `REAUTH_REQUIRED`

---

#### GET /api/quickbooks/status

Check QuickBooks connection status for current tenant.

**File:** `app/api/quickbooks/status/route.ts`

**Response (Connected):**
```json
{
  "connected": true,
  "realm_id": "string",
  "company_name": "string",
  "country": "US",
  "expires_at": "ISO timestamp",
  "is_expired": false,
  "connected_at": "ISO timestamp"
}
```

**Response (Not Connected):**
```json
{
  "connected": false,
  "message": "QuickBooks not connected"
}
```

---

#### POST /api/quickbooks/disconnect

Disconnects QuickBooks integration by deleting stored tokens.

**File:** `app/api/quickbooks/disconnect/route.ts`

**Flow:**
1. Verify user authentication
2. Get user's tenant
3. Delete tokens from `quickbooks_tokens` table

**Response:**
```json
{
  "success": true
}
```

---

### Sync Endpoints

#### POST /api/quickbooks/sync/contact

Sync a contact to QuickBooks as a Customer.

**File:** `app/api/quickbooks/sync/contact/route.ts`

**Request Body:**
```json
{
  "contactId": "uuid",      // Sync single contact
  "bulkSync": true          // Or sync all contacts
}
```

**Single Contact Response:**
```json
{
  "success": true,
  "qbCustomerId": "string"
}
```

**Bulk Sync Response:**
```json
{
  "success": true,
  "message": "Synced 45 of 50 contacts",
  "total": 50,
  "synced": 45,
  "failed": 5
}
```

**Sync Logic (lib/quickbooks/sync.ts):**
1. Fetch contact from database
2. Check for existing mapping in `quickbooks_mappings`
3. If mapped: Update existing QuickBooks Customer
4. If not mapped: Check for duplicate by name in QuickBooks
5. If duplicate found: Link to existing Customer
6. Otherwise: Create new Customer in QuickBooks
7. Create/update mapping record
8. Log sync operation

---

#### POST /api/quickbooks/sync/project

Sync a project to QuickBooks as an Invoice.

**File:** `app/api/quickbooks/sync/project/route.ts`

**Request Body:**
```json
{
  "projectId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "qbInvoiceId": "string"
}
```

**Sync Logic:**
1. Fetch project with contact
2. Ensure contact is synced to QuickBooks first
3. Create Invoice with project value and description
4. Create mapping record
5. Log sync operation

---

### QuickBooks Client Library

**File:** `lib/quickbooks/client.ts`

#### QuickBooksClient Class

```typescript
class QuickBooksClient {
  constructor(realmId: string, accessToken: string)

  // Company Info
  async getCompanyInfo(): Promise<QBCompanyInfo>

  // Customers
  async getCustomers(query?: string): Promise<QBCustomer[]>
  async getCustomer(customerId: string): Promise<QBCustomer>
  async createCustomer(customer: QBCustomer): Promise<QBCustomer>
  async updateCustomer(customer: QBCustomer): Promise<QBCustomer>

  // Invoices
  async getInvoices(customerId?: string): Promise<QBInvoice[]>
  async createInvoice(invoice: QBInvoice): Promise<QBInvoice>

  // Payments
  async getPayments(customerId?: string): Promise<QBPayment[]>
  async createPayment(payment: QBPayment): Promise<QBPayment>
}
```

#### getQuickBooksClient(tenantId: string)

Factory function to get authenticated QuickBooks client.

**Flow:**
1. Fetch tokens from database
2. Check token expiration
3. If expired: Refresh token and update database
4. Return configured QuickBooksClient instance

---

### Data Models

#### QBCustomer
```typescript
interface QBCustomer {
  Id?: string
  SyncToken?: string
  DisplayName: string
  GivenName?: string
  FamilyName?: string
  PrimaryEmailAddr?: { Address: string }
  PrimaryPhone?: { FreeFormNumber: string }
  BillAddr?: {
    Line1?: string
    City?: string
    CountrySubDivisionCode?: string
    PostalCode?: string
  }
}
```

#### QBInvoice
```typescript
interface QBInvoice {
  Id?: string
  CustomerRef: { value: string; name?: string }
  Line: Array<{
    Amount: number
    DetailType: 'SalesItemLineDetail' | 'SubTotalLineDetail'
    Description?: string
    SalesItemLineDetail?: {
      ItemRef: { value: string; name?: string }
      Qty?: number
      UnitPrice?: number
    }
  }>
  TxnDate?: string
  DueDate?: string
  DocNumber?: string
}
```

---

## Claims Agent Integration

### Overview

Claims Agent is an external module for insurance claim processing. Integration is webhook-based for receiving claim status updates.

### Webhooks

#### POST /api/claims/webhook

Receives webhook events from Claims Agent module.

**File:** `app/api/claims/webhook/route.ts`

**Headers:**
| Header | Type | Required | Description |
|--------|------|----------|-------------|
| x-webhook-signature | string | Conditional | HMAC-SHA256 signature (required if `CLAIMS_WEBHOOK_SECRET` is set) |

**Request Body:**
```json
{
  "claim_id": "string",
  "event": "status_changed|amount_updated|inspection_scheduled",
  "data": {
    "new_status": "approved|paid|denied",
    "amount": 15000,
    "inspection_date": "2025-01-15"
  }
}
```

**Event Types:**

| Event | Description | Action |
|-------|-------------|--------|
| status_changed | Claim status updated | Update project approved_value/final_value |
| amount_updated | Claim amount changed | Update project approved_value |
| inspection_scheduled | Inspection date set | Log for notification |

**Signature Verification:**
- HMAC-SHA256 using `CLAIMS_WEBHOOK_SECRET`
- Skipped in development if secret not configured

---

### Claims Sync Service

**File:** `lib/claims/sync-service.ts`

#### syncProjectToClaims(supabase, projectId)

Push project data to Claims Agent for claim creation.

**Data Gathered:**
- Project info (id, name, estimated_value, start_date)
- Contact info (name, address, phone, email)
- Insurance info (from contact custom_fields)

**Flow:**
1. Gather project sync data
2. If Claims Agent API configured: POST to `/api/claims/sync`
3. Update project with returned claim_id

---

#### handleClaimWebhook(supabase, claimId, event, data)

Process incoming claim webhook events.

**Event Handling:**
- `status_changed`:
  - If `approved`: Set `approved_value`, add approval note
  - If `paid`: Set `final_value`
- `amount_updated`: Update `approved_value`
- `inspection_scheduled`: Log for tracking

---

#### generateClaimExportPackage(supabase, projectId)

Generate comprehensive export package for claim submission.

**Package Contents:**
- Project details
- Contact info (with insurance carrier/policy from custom_fields)
- Storm causation data (if linked to storm event)
- Photos with signed URLs
- Documents with signed URLs

---

## Database Schema

### quickbooks_tokens

Stores OAuth tokens for QuickBooks connections.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants |
| access_token | TEXT | OAuth access token |
| refresh_token | TEXT | OAuth refresh token |
| realm_id | TEXT | QuickBooks company ID |
| expires_at | TIMESTAMP | Token expiration time |
| token_type | TEXT | Token type (Bearer) |
| company_name | TEXT | QuickBooks company name |
| country | TEXT | Company country |
| created_at | TIMESTAMP | Connection created |
| updated_at | TIMESTAMP | Last updated |

**Constraints:** One connection per tenant (UNIQUE tenant_id)

---

### quickbooks_sync_logs

Audit trail for all QuickBooks sync operations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants |
| entity_type | TEXT | contact, project, invoice, payment |
| entity_id | UUID | CRM entity ID |
| qb_id | TEXT | QuickBooks entity ID |
| action | TEXT | create, update, delete, fetch, link |
| direction | TEXT | to_qb, from_qb, bidirectional |
| status | TEXT | success, failed, partial, error |
| error_message | TEXT | Error description |
| error_code | TEXT | Error code |
| request_payload | JSONB | Request data |
| response_payload | JSONB | Response data |
| synced_at | TIMESTAMP | Sync timestamp |

---

### quickbooks_mappings

Links CRM entities to QuickBooks entities.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants |
| crm_entity_type | TEXT | contact, project |
| crm_entity_id | UUID | CRM record ID |
| qb_entity_type | TEXT | Customer, Invoice, Payment |
| qb_entity_id | TEXT | QuickBooks record ID |
| last_synced_at | TIMESTAMP | Last sync time |
| sync_status | TEXT | synced, needs_sync, conflict |

**Constraints:** UNIQUE(tenant_id, crm_entity_type, crm_entity_id)

---

## Configuration

### Environment Variables

```bash
# Twilio (SMS & Voice)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_MESSAGING_SERVICE_SID=optional-messaging-service

# Resend Email
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=Your Company Name
RESEND_WEBHOOK_SECRET=whsec_your_secret

# QuickBooks
QUICKBOOKS_CLIENT_ID=your-client-id
QUICKBOOKS_CLIENT_SECRET=your-client-secret
QUICKBOOKS_REDIRECT_URI=http://localhost:3000/api/quickbooks/callback
QUICKBOOKS_ENVIRONMENT=sandbox  # or production

# Claims Agent (optional)
CLAIMS_AGENT_API_URL=https://claims.example.com
CLAIMS_AGENT_API_KEY=your-api-key
CLAIMS_WEBHOOK_SECRET=your-webhook-secret
```

---

## Security

### Webhook Verification

All webhooks implement signature verification:

| Provider | Algorithm | Header | Secret |
|----------|-----------|--------|--------|
| Twilio | HMAC-SHA1 | x-twilio-signature | TWILIO_AUTH_TOKEN |
| Resend | HMAC-SHA256 | svix-signature | RESEND_WEBHOOK_SECRET |
| Claims | HMAC-SHA256 | x-webhook-signature | CLAIMS_WEBHOOK_SECRET |

### OAuth Security

- CSRF protection via state tokens
- State token expiration (5 minutes)
- User verification on callback
- Token rotation on refresh

### RLS Policies

All QuickBooks tables have RLS enabled:
- Tokens: Tenant members can view/manage
- Sync logs: Tenant members can view, insert only
- Mappings: Tenant members can manage

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | Success | Successful operations, webhook acknowledgment |
| 400 | Bad Request | Missing/invalid parameters |
| 401 | Unauthorized | Invalid signature, authentication required |
| 403 | Forbidden | Invalid webhook signature |
| 404 | Not Found | Resource not found |
| 500 | Server Error | Internal processing error |

### Error Response Format

```json
{
  "error": "Error code or message",
  "message": "Human-readable description"
}
```

---

## Testing

### Webhook Testing

**Twilio:**
- Use ngrok or similar for local development
- Configure webhook URL in Twilio Console
- Test inbound SMS with Twilio Messaging Copilot

**Resend:**
- Configure webhook URL in Resend Dashboard
- Send test emails and verify event delivery

**QuickBooks:**
- Use sandbox environment for development
- Test with test companies in QuickBooks Developer Portal

---

## Key Files Reference

### Webhook Handlers
| File | Purpose |
|------|---------|
| `app/api/sms/webhook/route.ts` | Twilio SMS webhook |
| `app/api/voice/webhook/route.ts` | Twilio voice webhook |
| `app/api/email/webhook/route.ts` | Resend email webhook |
| `app/api/claims/webhook/route.ts` | Claims Agent webhook |

### QuickBooks Routes
| File | Purpose |
|------|---------|
| `app/api/quickbooks/auth/route.ts` | OAuth authorization initiation |
| `app/api/quickbooks/callback/route.ts` | OAuth callback handler |
| `app/api/quickbooks/refresh/route.ts` | Token refresh |
| `app/api/quickbooks/status/route.ts` | Connection status |
| `app/api/quickbooks/disconnect/route.ts` | Disconnect integration |
| `app/api/quickbooks/sync/contact/route.ts` | Contact sync |
| `app/api/quickbooks/sync/project/route.ts` | Project/invoice sync |

### Client Libraries
| File | Purpose |
|------|---------|
| `lib/webhooks/security.ts` | Webhook signature verification |
| `lib/quickbooks/client.ts` | QuickBooks API client |
| `lib/quickbooks/oauth-client.ts` | OAuth client configuration |
| `lib/quickbooks/sync.ts` | Sync engine |
| `lib/twilio/sms.ts` | SMS sending |
| `lib/twilio/compliance.ts` | TCPA compliance |
| `lib/resend/email.ts` | Email sending |
| `lib/claims/sync-service.ts` | Claims sync service |

### Database
| File | Purpose |
|------|---------|
| `supabase/migrations/20251004_quickbooks_integration.sql` | QuickBooks tables |

---

## Validation Record

### Files Examined
- `/Users/ccai/roofing saas/roofing-saas/app/api/sms/webhook/route.ts` - SMS webhook handler (132 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/api/email/webhook/route.ts` - Email webhook handler (206 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/api/voice/webhook/route.ts` - Voice webhook handler (149 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/api/claims/webhook/route.ts` - Claims webhook handler (127 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/api/quickbooks/auth/route.ts` - OAuth auth (61 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/api/quickbooks/callback/route.ts` - OAuth callback (118 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/api/quickbooks/refresh/route.ts` - Token refresh (125 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/api/quickbooks/disconnect/route.ts` - Disconnect (60 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/api/quickbooks/status/route.ts` - Status check (67 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/api/quickbooks/sync/contact/route.ts` - Contact sync (93 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/api/quickbooks/sync/project/route.ts` - Project sync (80 lines)
- `/Users/ccai/roofing saas/roofing-saas/lib/webhooks/security.ts` - Webhook security (308 lines)
- `/Users/ccai/roofing saas/roofing-saas/lib/quickbooks/client.ts` - QB client (423 lines)
- `/Users/ccai/roofing saas/roofing-saas/lib/quickbooks/oauth-client.ts` - OAuth client (44 lines)
- `/Users/ccai/roofing saas/roofing-saas/lib/quickbooks/sync.ts` - Sync engine (384 lines)
- `/Users/ccai/roofing saas/roofing-saas/lib/twilio/sms.ts` - SMS sending (139 lines)
- `/Users/ccai/roofing saas/roofing-saas/lib/twilio/compliance.ts` - TCPA compliance (200 lines)
- `/Users/ccai/roofing saas/roofing-saas/lib/resend/email.ts` - Email sending (288 lines)
- `/Users/ccai/roofing saas/roofing-saas/lib/claims/sync-service.ts` - Claims sync (409 lines)
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251004_quickbooks_integration.sql` - DB schema (173 lines)
- `/Users/ccai/roofing saas/roofing-saas/.env.example` - Environment variables

### Verification Steps
1. Verified all webhook endpoint files exist and contain documented functionality
2. Verified signature verification functions in `lib/webhooks/security.ts`
3. Verified QuickBooks OAuth flow across auth, callback, refresh, disconnect routes
4. Verified QuickBooks sync functions in `lib/quickbooks/sync.ts`
5. Verified TCPA compliance keywords and opt-out handling in `lib/twilio/compliance.ts`
6. Verified Resend email event types in webhook handler
7. Verified database schema in migration file
8. Verified environment variables in `.env.example`

### Validated By
PRD Documentation Agent - Session 29
Date: 2025-12-11T16:30:00Z
