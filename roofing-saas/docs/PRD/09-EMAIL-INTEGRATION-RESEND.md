# Email Integration (Resend)

## Overview

The Roofing SAAS platform integrates with **Resend** for transactional email delivery. This module provides:
- Reliable email sending with automatic retry logic
- Template-based emails with variable substitution
- CAN-SPAM compliance (opt-out management, bounce tracking)
- Webhook-based event tracking (delivery, opens, clicks, bounces)
- Domain verification and DNS management
- Bulk email sending with rate limiting

Resend was chosen for its developer-friendly API, high deliverability, and excellent React/Next.js integration.

---

## User Stories

### Sales Representatives
- As a sales rep, I want to send professional emails to contacts so that I can maintain communication
- As a sales rep, I want to use email templates so that my messages are consistent and save time
- As a sales rep, I want to see email open/click tracking so that I know when to follow up

### Project Managers
- As a PM, I want to send automated emails when project status changes so that customers stay informed
- As a PM, I want emails logged to contact activity so that the full communication history is visible

### Office Staff
- As office staff, I want to create custom email templates so that the team has approved messaging
- As office staff, I want to see email analytics so that I can track campaign effectiveness

### System Administrators
- As an admin, I want the system to respect opt-out preferences so that we stay compliant
- As an admin, I want bounced emails automatically marked so that we don't waste resources

---

## Features

### 1. Core Email Sending

**Description:** Send transactional emails via Resend API with validation, retry logic, and activity logging.

**Implementation:**
- File: `/lib/resend/email.ts` (288 lines)
- Key function: `sendEmail(params: SendEmailParams): Promise<EmailResponse>`
- Features: Auto-retry (3 attempts), email validation, CC/BCC support, attachments, tagging

**Key Capabilities:**
```typescript
interface SendEmailParams {
  to: string | string[]      // Recipients
  subject: string            // Email subject
  html?: string              // HTML content
  text?: string              // Plain text fallback
  from?: string              // Custom sender (optional)
  replyTo?: string           // Reply-to address
  cc?: string | string[]     // CC recipients
  bcc?: string | string[]    // BCC recipients
  attachments?: Attachment[] // File attachments
  tags?: Tag[]               // Metadata tags
}
```

### 2. Resend Client Configuration

**Description:** Centralized Resend client initialization with environment-based configuration.

**Implementation:**
- File: `/lib/resend/client.ts` (53 lines)
- Exports: `resendClient`, `isResendConfigured()`, `getFromAddress()`

**Configuration:**
```typescript
const apiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@example.com'
const fromName = process.env.RESEND_FROM_NAME || 'Roofing SaaS'
```

### 3. Email Templates System

**Description:** Tenant-specific email templates with variable substitution and HTML wrapping.

**Implementation:**
- API: `/app/api/settings/email-templates/route.ts` (118 lines)
- API: `/app/api/settings/email-templates/[id]/route.ts` (104 lines)
- UI: `/components/settings/TemplateSettings.tsx` (485 lines)
- Database: `email_templates` table

**Template Variables:**
- `{{contact_name}}` - Full contact name
- `{{contact_first_name}}` - Contact's first name
- `{{company_name}}` - Your company name
- `{{user_name}}` - Logged-in user's name
- `{{project_name}}` - Project name
- `{{appointment_date}}` - Appointment date/time

**Variable Replacement:**
```typescript
// In /lib/resend/email.ts
export function replaceEmailVariables(
  content: string,
  variables: Record<string, string>
): string {
  // Matches {{variable_name}} with optional whitespace
  const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
  // ...
}
```

### 4. CAN-SPAM Compliance

**Description:** Automatic opt-out management, bounce tracking, and compliance analytics.

**Implementation:**
- File: `/lib/resend/compliance.ts` (240 lines)
- Key functions:
  - `canSendEmail(email)` - Check if email is allowed
  - `optOutEmail(email, reason)` - Mark as opted out
  - `markEmailInvalid(email, reason)` - Mark as bounced
  - `getEmailComplianceStats(tenantId)` - Get compliance metrics
  - `getEmailAnalytics(tenantId)` - Get open/click analytics

**Compliance Checks:**
- `email_opt_out` - Contact explicitly opted out
- `email_invalid` - Email bounced (hard bounce marks invalid)
- `email_invalid_reason` - Reason for invalidity

### 5. Webhook Event Processing

**Description:** Handle Resend webhooks for delivery tracking, opens, clicks, bounces, and complaints.

**Implementation:**
- File: `/app/api/email/webhook/route.ts` (206 lines)
- Events handled: `email.sent`, `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`

**Event Handling:**
| Event | Action |
|-------|--------|
| `email.sent` | Record sent timestamp |
| `email.delivered` | Update status to 'delivered' |
| `email.opened` | Track open count, user agent, trigger workflows |
| `email.clicked` | Track click count, link URL, trigger workflows |
| `email.bounced` | Mark email invalid (hard bounce only) |
| `email.complained` | Auto opt-out contact (spam complaint) |

**Webhook Security:**
- File: `/lib/webhooks/security.ts` (308 lines)
- HMAC-SHA256 signature verification (Svix)
- Replay attack prevention (5-minute timestamp tolerance)

### 6. Domain Management

**Description:** Programmatic domain verification and DNS record management for Resend.

**Implementation:**
- File: `/lib/resend/domain-manager.ts` (220 lines)
- Key functions:
  - `checkDomain(domainName)` - Get verification status
  - `addDomain(domainName, region)` - Add domain to Resend
  - `getRequiredDnsRecords(domainName)` - Get DNS records needed
  - `verifyDomain(domainId)` - Trigger verification
  - `getDomainStatusSummary(domainName)` - Full status report

**DNS Records Required:**
- MX record for mail routing
- SPF record for sender authentication
- DKIM record for cryptographic signing

### 7. Error Handling

**Description:** Custom error classes for email-specific failures.

**Implementation:**
- File: `/lib/resend/errors.ts` (44 lines)
- Error classes:
  - `EmailError` - Base error class
  - `EmailConfigurationError` - Missing API key/config
  - `EmailValidationError` - Invalid email/params (400)
  - `EmailRateLimitError` - Rate limit exceeded (429)
  - `EmailBounceError` - Email bounced (422)

### 8. Bulk Email Sending

**Description:** Send emails to multiple recipients with rate limiting.

**Implementation:**
- File: `/lib/resend/email.ts`
- Function: `sendBulkEmails(recipients, delayMs)`
- Features: Configurable delay (default 100ms), error collection

```typescript
export async function sendBulkEmails(
  recipients: Array<{ to: string; subject: string; html?: string; text?: string }>,
  delayMs: number = 100
): Promise<EmailResponse[]>
```

---

## Technical Implementation

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Email System Architecture                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   API Routes    │    │   Automation    │                │
│  │  /api/email/*   │    │    Engine       │                │
│  └────────┬────────┘    └────────┬────────┘                │
│           │                      │                          │
│           ▼                      ▼                          │
│  ┌──────────────────────────────────────────┐              │
│  │           lib/resend/email.ts            │              │
│  │  • sendEmail()                           │              │
│  │  • sendBulkEmails()                      │              │
│  │  • replaceEmailVariables()               │              │
│  └────────────────────┬─────────────────────┘              │
│                       │                                     │
│           ┌───────────┼───────────┐                        │
│           │           │           │                        │
│           ▼           ▼           ▼                        │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐                │
│  │  client   │ │compliance │ │  errors   │                │
│  │   .ts     │ │   .ts     │ │   .ts     │                │
│  └───────────┘ └───────────┘ └───────────┘                │
│                       │                                     │
│                       ▼                                     │
│           ┌───────────────────────┐                        │
│           │    Resend API         │                        │
│           │    (External)         │                        │
│           └───────────────────────┘                        │
│                       │                                     │
│                       ▼                                     │
│           ┌───────────────────────┐                        │
│           │    Resend Webhooks    │─────────────────┐      │
│           │  /api/email/webhook   │                 │      │
│           └───────────────────────┘                 │      │
│                                                     ▼      │
│                                          ┌───────────────┐ │
│                                          │  Activities   │ │
│                                          │    Table      │ │
│                                          └───────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `/lib/resend/client.ts` | Resend client initialization | 53 |
| `/lib/resend/email.ts` | Core email sending functions | 288 |
| `/lib/resend/compliance.ts` | CAN-SPAM compliance utilities | 240 |
| `/lib/resend/errors.ts` | Custom error classes | 44 |
| `/lib/resend/domain-manager.ts` | Domain verification management | 220 |
| `/app/api/email/send/route.ts` | Send email API endpoint | 196 |
| `/app/api/email/webhook/route.ts` | Resend webhook handler | 206 |
| `/app/api/settings/email-templates/route.ts` | Template CRUD (list/create) | 118 |
| `/app/api/settings/email-templates/[id]/route.ts` | Template CRUD (update/delete) | 104 |
| `/components/settings/TemplateSettings.tsx` | Template management UI | 485 |
| `/lib/webhooks/security.ts` | Webhook signature verification | 308 |
| `/lib/automation/executors.ts` | Workflow email executor | 270 |

### Data Flow

**Send Email Flow:**
```
1. API Request → POST /api/email/send
2. Authentication → getCurrentUser()
3. Input Validation → Zod schema
4. Template Processing → Fetch template, replace variables
5. Compliance Check → canSendEmail() for each recipient
6. Send via Resend → sendEmail() with retry logic
7. Activity Logging → Insert into activities table
8. Return Response → Email ID and status
```

**Webhook Processing Flow:**
```
1. Webhook Request → POST /api/email/webhook
2. Signature Verification → verifyResendSignature()
3. Parse Event → Extract type and data
4. Find Activity → Query by email_id in metadata
5. Update Activity → Add event data to metadata
6. Handle Side Effects:
   - email.bounced (hard) → markEmailInvalid()
   - email.complained → optOutEmail()
   - email.opened → triggerWorkflow('email_opened')
   - email.clicked → triggerWorkflow('email_clicked')
7. Return 200 OK
```

---

## API Endpoints

### POST /api/email/send

**Purpose:** Send an email to one or more recipients

**Authentication:** Required (session cookie)

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Your Roofing Estimate",
  "html": "<p>Hello!</p>",
  "text": "Hello!",
  "contactId": "uuid (optional)",
  "templateId": "uuid (optional)",
  "templateVariables": {"name": "John"},
  "replyTo": "reply@example.com",
  "cc": ["cc@example.com"],
  "bcc": ["bcc@example.com"]
}
```

**Validation Schema:**
- `to`: Email string or array of emails (required)
- `subject`: 1-200 characters (required)
- `html` OR `text` OR `templateId`: At least one required
- `contactId`: Valid UUID (optional)
- `templateId`: Valid UUID (optional)
- `templateVariables`: Key-value string pairs (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Email sent successfully",
    "email": {
      "id": "resend-email-id",
      "to": "recipient@example.com",
      "subject": "Your Roofing Estimate"
    }
  }
}
```

### POST /api/email/webhook

**Purpose:** Handle Resend webhook events

**Authentication:** Signature verification (Svix)

**Headers:**
- `svix-signature`: Webhook signature
- `svix-timestamp`: Event timestamp

**Event Types:**
- `email.sent`
- `email.delivered`
- `email.opened`
- `email.clicked`
- `email.bounced`
- `email.complained`

**Response:** Always `200 OK` (to prevent Resend retries)

### GET /api/settings/email-templates

**Purpose:** List email templates for tenant

**Query Parameters:**
- `category`: Filter by template category (optional)

**Response:**
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "Welcome Email",
      "description": "Sent to new contacts",
      "subject": "Welcome to {{company_name}}",
      "body": "<p>Hello {{contact_name}}!</p>",
      "category": "onboarding",
      "available_variables": ["contact_name", "company_name"],
      "is_active": true,
      "is_default": false
    }
  ]
}
```

### POST /api/settings/email-templates

**Purpose:** Create new email template

**Request Body:**
```json
{
  "name": "Template Name",
  "description": "Description",
  "subject": "Email Subject",
  "body": "HTML body with {{variables}}",
  "category": "category",
  "available_variables": ["var1", "var2"],
  "is_active": true,
  "is_default": false
}
```

### PATCH /api/settings/email-templates/[id]

**Purpose:** Update existing email template

### DELETE /api/settings/email-templates/[id]

**Purpose:** Delete email template

---

## Data Models

### Email Templates Table

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants (RLS enforced) |
| name | VARCHAR(255) | Template name |
| description | TEXT | Template description |
| subject | VARCHAR(500) | Email subject line |
| body | TEXT | HTML email body |
| category | VARCHAR(100) | Template category |
| available_variables | JSONB | List of supported variables |
| is_active | BOOLEAN | Whether template is active |
| is_default | BOOLEAN | Is the default for category |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |
| created_by | UUID | FK to auth.users |

### Contact Email Fields

| Field | Type | Description |
|-------|------|-------------|
| email_opt_out | BOOLEAN | Contact opted out of emails |
| email_opt_out_date | TIMESTAMPTZ | When they opted out |
| email_opt_out_reason | TEXT | Reason for opt-out |
| email_invalid | BOOLEAN | Email is invalid (bounced) |
| email_invalid_date | TIMESTAMPTZ | When marked invalid |
| email_invalid_reason | TEXT | Reason (bounce type) |

### Activity Metadata (Email Type)

```json
{
  "email_id": "resend-email-id",
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "has_html": true,
  "has_text": false,
  "sent_at": "2025-01-01T00:00:00Z",
  "delivered_at": "2025-01-01T00:00:05Z",
  "status": "delivered",
  "opened": true,
  "opened_at": "2025-01-01T00:05:00Z",
  "open_count": 3,
  "clicked": true,
  "clicked_at": "2025-01-01T00:06:00Z",
  "click_count": 1,
  "last_clicked_link": "https://example.com",
  "bounced": false,
  "complained": false
}
```

### Database Indexes

```sql
-- Email opt-out lookup
CREATE INDEX idx_contacts_email_opt_out
ON contacts(email_opt_out) WHERE email_opt_out = true;

-- Bounced email lookup
CREATE INDEX idx_contacts_email_invalid
ON contacts(email_invalid) WHERE email_invalid = true;
```

---

## Integration Points

### Workflow Automation

**Email executor:** `/lib/automation/executors.ts`
```typescript
case 'send_email':
  return executeSendEmail(config)
// Uses lib/resend/email.ts sendEmail()
```

**Webhook triggers workflows:**
- `email_opened` event → `triggerWorkflow(tenantId, 'email_opened', {...})`
- `email_clicked` event → `triggerWorkflow(tenantId, 'email_clicked', {...})`

### Campaign Builder

**Integration:** `/lib/campaigns/execution-engine.ts` uses Resend for campaign emails

### E-Signature System

**Integration:** `/app/api/signature-documents/[id]/send/route.ts` sends signature request emails via Resend

### Activity Tracking

**All emails logged:** Every outbound email creates an activity record with full metadata

---

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `RESEND_API_KEY` | Resend API key | Yes |
| `RESEND_FROM_EMAIL` | Default sender email | Yes |
| `RESEND_FROM_NAME` | Default sender name | Yes |
| `RESEND_WEBHOOK_SECRET` | Webhook signature secret | Production |

### Package Dependency

```json
{
  "dependencies": {
    "resend": "^6.1.2"
  }
}
```

### npm Scripts

```json
{
  "scripts": {
    "setup-email-domain": "tsx scripts/setup-email-domain.ts",
    "trigger-email-verification": "tsx scripts/trigger-resend-verification.ts"
  }
}
```

---

## Security

### Webhook Verification

```typescript
// /lib/webhooks/security.ts
export async function verifyResendSignature(
  request: NextRequest,
  payload: string
): Promise<ResendSignatureVerificationResult>
```

- Verifies Svix HMAC-SHA256 signature
- Validates timestamp (5-minute tolerance)
- Blocks replay attacks
- Development mode allows unverified (with warning)

### API Security

- All endpoints require authentication
- Tenant isolation via RLS
- Input validation via Zod schemas

### Email Compliance

- CAN-SPAM opt-out tracking
- Automatic bounce handling
- Spam complaint auto-opt-out

---

## Testing

### Manual Testing

```bash
# Send test email via API
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -H "Cookie: [auth-cookie]" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "text": "Hello from Roofing SaaS!"
  }'
```

### Email Domain Setup

```bash
npm run setup-email-domain
```

### Webhook Testing

Use Resend dashboard or ngrok for local webhook testing.

---

## Performance Notes

- **Retry Logic:** 3 attempts with exponential backoff (1s → 5s max)
- **Bulk Sending:** 100ms delay between emails (rate limiting)
- **Webhook Processing:** Async workflow triggers (non-blocking)

---

## Future Enhancements

1. **Email Preview:** Live preview in template editor
2. **Rich Template Editor:** WYSIWYG HTML editor
3. **Email Analytics Dashboard:** Open/click rates visualization
4. **A/B Testing:** Template variant testing
5. **Scheduled Sending:** Queue emails for future delivery
6. **Email Threads:** Group related emails into threads

---

## File References

All files verified to exist at the following paths:

**Library Files:**
- `/Users/ccai/roofing saas/roofing-saas/lib/resend/client.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/resend/email.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/resend/compliance.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/resend/errors.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/resend/domain-manager.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/webhooks/security.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/automation/executors.ts`

**API Routes:**
- `/Users/ccai/roofing saas/roofing-saas/app/api/email/send/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/email/webhook/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/settings/email-templates/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/settings/email-templates/[id]/route.ts`

**Components:**
- `/Users/ccai/roofing saas/roofing-saas/components/settings/TemplateSettings.tsx`

**Database Migrations:**
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251004_tenant_customization_system.sql`
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/archive/phase2/20251001_email_tracking.sql`

**Documentation:**
- `/Users/ccai/roofing saas/roofing-saas/docs/archive/EMAIL_DOMAIN_SETUP_COMPLETE.md`
- `/Users/ccai/roofing saas/roofing-saas/docs/verification/EMAIL_AUTOMATION_WORKFLOWS_VERIFICATION.md`

---

## Validation Record

### Files Examined
1. `/lib/resend/client.ts` - Verified Resend client initialization (53 lines)
2. `/lib/resend/email.ts` - Verified sendEmail, sendBulkEmails, replaceEmailVariables (288 lines)
3. `/lib/resend/compliance.ts` - Verified canSendEmail, optOutEmail, getEmailAnalytics (240 lines)
4. `/lib/resend/errors.ts` - Verified 5 error classes (44 lines)
5. `/lib/resend/domain-manager.ts` - Verified checkDomain, addDomain, verifyDomain (220 lines)
6. `/app/api/email/send/route.ts` - Verified POST handler with validation (196 lines)
7. `/app/api/email/webhook/route.ts` - Verified webhook processing for 6 event types (206 lines)
8. `/app/api/settings/email-templates/route.ts` - Verified GET/POST handlers (118 lines)
9. `/app/api/settings/email-templates/[id]/route.ts` - Verified PATCH/DELETE handlers (104 lines)
10. `/components/settings/TemplateSettings.tsx` - Verified template UI component (485 lines)
11. `/lib/webhooks/security.ts` - Verified Resend signature verification (308 lines)
12. `/lib/automation/executors.ts` - Verified send_email executor integration (270 lines)
13. `package.json` - Verified resend@^6.1.2 dependency

### Database Migrations Verified
- `20251004_tenant_customization_system.sql` - email_templates table schema
- `20251001_email_tracking.sql` - email_opt_out, email_invalid fields on contacts

### Archon RAG Queries
- Query: "Resend email integration API sending" - Found SendGrid docs (Resend similar patterns)

### Verification Steps
1. Read all 5 lib/resend/ files - confirmed complete implementation
2. Read both API email routes - confirmed send and webhook handling
3. Read email template API routes - confirmed CRUD operations
4. Verified package.json for resend dependency version
5. Checked database migrations for email_templates schema
6. Verified workflow integration in lib/automation/executors.ts
7. Confirmed webhook security implementation in lib/webhooks/security.ts
8. Cross-referenced with EMAIL_DOMAIN_SETUP_COMPLETE.md documentation

### Validated By
PRD Documentation Agent - Session 11
Date: 2025-12-11T09:30:00Z
