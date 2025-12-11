# SMS Integration (Twilio)

## Overview

The Roofing SAAS application integrates with Twilio for SMS communications, providing a complete text messaging system for customer outreach. The integration includes sending and receiving SMS, TCPA compliance enforcement, template management, webhook handling for inbound messages, and analytics tracking. SMS is also integrated with the Campaign Builder for automated drip campaign execution.

## User Stories

### Sales Representatives
- As a sales rep, I want to send quick text messages to prospects so that I can follow up faster than email
- As a sales rep, I want to use pre-approved SMS templates so that I maintain consistent, compliant messaging
- As a sales rep, I want to see SMS history on contact records so that I know my communication history

### Office Staff
- As office staff, I want to manage SMS templates so that sales reps have compliant messages ready to use
- As office staff, I want to track SMS opt-outs so that we don't violate TCPA regulations
- As office staff, I want to see SMS analytics so that I can measure communication effectiveness

### Business Owners
- As a business owner, I want TCPA compliance built-in so that I avoid costly regulatory violations
- As a business owner, I want SMS integrated with campaigns so that I can automate outreach
- As a business owner, I want usage analytics so that I can understand SMS costs and ROI

### System Administrators
- As an admin, I want to configure Twilio credentials so that the SMS system works for my organization
- As an admin, I want to verify webhook signatures so that the system is secure from spoofing

## Features

### 1. Twilio Client Configuration

The Twilio client is initialized with environment variables and includes configuration validation.

**Implementation:**
- File: `lib/twilio/client.ts`
- Key functions: `twilioClient`, `isTwilioConfigured()`, `getTwilioPhoneNumber()`

**Configuration (Environment Variables):**
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15551234567
```

**Features:**
- Lazy initialization - client only created when credentials are present
- Configuration validation before operations
- Warning logging when credentials are missing

### 2. SMS Sending

Core SMS sending functionality with retry logic and rate limiting.

**Implementation:**
- File: `lib/twilio/sms.ts`
- Key functions: `sendSMS()`, `sendBulkSMS()`, `replaceTemplateVariables()`

**SendSMS Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| to | string | Yes | Recipient phone number |
| body | string | Yes | Message content (max 1600 chars) |
| from | string | No | Sender number (defaults to TWILIO_PHONE_NUMBER) |

**Features:**
- Retry logic with exponential backoff (3 attempts, 1-5 second delays)
- Template variable replacement (e.g., `{{first_name}}`)
- Activity logging integration
- Error handling with custom TwilioError classes

### 3. TCPA Compliance

Comprehensive TCPA compliance including opt-out management and quiet hours enforcement.

**Implementation:**
- File: `lib/twilio/compliance.ts`
- Key functions: `canSendSMS()`, `isOptOutMessage()`, `isOptInMessage()`, `optOutContact()`, `optInContact()`, `getComplianceStats()`

**Opt-Out Keywords (TCPA Required):**
- STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT, STOP ALL

**Opt-In Keywords:**
- START, YES, UNSTOP, SUBSCRIBE

**Quiet Hours:**
- Enforced: 8am - 9pm local time
- Uses contact's timezone (defaults to America/New_York)

**Contact Fields for Compliance:**
| Field | Type | Description |
|-------|------|-------------|
| sms_opt_in | boolean | Contact has opted in |
| sms_opt_in_date | timestamp | When they opted in |
| sms_opt_out | boolean | Contact has opted out |
| sms_opt_out_date | timestamp | When they opted out |
| sms_opt_out_reason | text | Reason/keyword used |
| timezone | text | Contact's timezone |

### 4. SMS Templates

Template system for pre-approved, consistent messaging.

**Implementation:**
- Database table: `sms_templates`
- API routes: `/api/settings/sms-templates/`, `/api/settings/sms-templates/[id]/`
- UI component: `components/settings/TemplateSettings.tsx`

**Template Structure:**
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Multi-tenant isolation |
| name | varchar(255) | Template name |
| description | text | Template description |
| message | text | SMS content (max 1600 chars) |
| category | varchar(100) | Template category |
| available_variables | JSONB | Supported template variables |
| is_active | boolean | Template enabled |
| is_default | boolean | Default for category |

**Default Variables:**
- `{{contact_name}}` - Contact full name
- `{{contact_first_name}}` - Contact first name
- `{{company_name}}` - Your company name
- `{{user_name}}` - Logged in user name
- `{{appointment_date}}` - Appointment date/time

### 5. Webhook Handler

Handles incoming SMS and processes opt-out/opt-in requests.

**Implementation:**
- File: `app/api/sms/webhook/route.ts`
- Method: POST
- Content-Type: multipart/form-data (Twilio format)

**Webhook Processing:**
1. Parse Twilio form data
2. Verify Twilio signature (security)
3. Find contact by phone number
4. Log inbound SMS as activity
5. Process opt-out/opt-in keywords
6. Return TwiML response

**Twilio Webhook Fields:**
- `MessageSid` - Unique message ID
- `From` - Sender phone number
- `To` - Your Twilio number
- `Body` - Message content
- `NumMedia` - Number of media attachments

### 6. Webhook Security

Cryptographic verification of incoming Twilio webhooks.

**Implementation:**
- File: `lib/webhooks/security.ts`
- Key functions: `verifyTwilioSignature()`, `parseTwilioFormData()`

**Verification Process:**
1. Extract `x-twilio-signature` header
2. Reconstruct request URL
3. Use Twilio's `validateRequest()` with auth token
4. Reject requests with invalid signatures (403 Forbidden)

### 7. SMS Composer UI

React component for sending SMS with template support.

**Implementation:**
- File: `components/sms/SMSComposer.tsx`
- Props: `contactId`, `contactPhone`, `contactName`, `onSuccess`, `onError`

**Features:**
- Template dropdown selection
- Variable input fields for templates
- Character count display
- SMS segment calculator (160 chars/segment)
- Live preview with variable replacement
- TCPA compliance check before sending
- Success/error feedback
- Disabled state when contact can't receive SMS

### 8. Analytics & Reporting

SMS usage analytics and activity tracking.

**Implementation:**
- File: `lib/twilio/analytics.ts`
- Key functions: `getSMSAnalytics()`, `getActivitySummary()`

**SMS Analytics:**
| Metric | Description |
|--------|-------------|
| totalSMS | Total messages sent/received |
| inboundSMS | Messages received |
| outboundSMS | Messages sent |
| averageMessageLength | Average character count |

**Period Options:**
- day, week, month, year, all

### 9. Campaign Integration

SMS steps in automated campaign workflows.

**Implementation:**
- File: `lib/campaigns/execution-engine.ts`
- Step type: `send_sms`

**Campaign SMS Features:**
- Template variable replacement
- Twilio configuration check (skips if not configured)
- Activity logging
- Success/failure tracking
- Automatic enrollment updates

## Technical Implementation

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SMS INTEGRATION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌──────────────┐     ┌──────────────────┐ │
│  │ SMSComposer │ ──▶ │ /api/sms/    │ ──▶ │ lib/twilio/sms   │ │
│  │ (UI)        │     │ send         │     │                  │ │
│  └─────────────┘     └──────────────┘     │  - sendSMS()     │ │
│                                           │  - sendBulkSMS() │ │
│  ┌─────────────┐     ┌──────────────┐     └────────┬─────────┘ │
│  │ Campaign    │ ──▶ │ Execution    │              │           │
│  │ Builder     │     │ Engine       │              ▼           │
│  └─────────────┘     └──────────────┘     ┌──────────────────┐ │
│                                           │ Twilio API       │ │
│  ┌─────────────┐     ┌──────────────┐     │ messages.create()│ │
│  │ Twilio      │ ──▶ │ /api/sms/    │     └──────────────────┘ │
│  │ (Inbound)   │     │ webhook      │              │           │
│  └─────────────┘     └──────┬───────┘              ▼           │
│                             │              ┌──────────────────┐ │
│                             ▼              │ Activities Table │ │
│                      ┌──────────────┐      │ (SMS logging)    │ │
│                      │ Compliance   │      └──────────────────┘ │
│                      │ - Opt-out    │                           │
│                      │ - Quiet hours│                           │
│                      └──────────────┘                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `lib/twilio/client.ts` | Twilio client initialization | 37 |
| `lib/twilio/sms.ts` | SMS sending with retry logic | 139 |
| `lib/twilio/compliance.ts` | TCPA compliance helpers | 200 |
| `lib/twilio/errors.ts` | Custom error classes | 41 |
| `lib/twilio/voice.ts` | Voice call utilities | 227 |
| `lib/twilio/analytics.ts` | SMS/call analytics | 345 |
| `app/api/sms/send/route.ts` | Send SMS API endpoint | 128 |
| `app/api/sms/webhook/route.ts` | Inbound SMS webhook | 132 |
| `app/api/sms/test/route.ts` | Development test endpoint | 75 |
| `app/api/settings/sms-templates/route.ts` | Template CRUD (list/create) | 123 |
| `app/api/settings/sms-templates/[id]/route.ts` | Template CRUD (update/delete) | 111 |
| `components/sms/SMSComposer.tsx` | SMS sending UI component | 322 |
| `components/settings/TemplateSettings.tsx` | Template management UI | 300+ |
| `lib/webhooks/security.ts` | Webhook signature verification | 308 |
| `lib/campaigns/execution-engine.ts` | Campaign SMS execution | 699+ |

### Data Flow

**Outbound SMS:**
```
User Action → SMSComposer → /api/sms/send → Compliance Check → sendSMS() → Twilio API → Log Activity
```

**Inbound SMS:**
```
Twilio → /api/sms/webhook → Verify Signature → Find Contact → Process Keywords → Log Activity → TwiML Response
```

**Campaign SMS:**
```
Campaign Trigger → Execution Engine → executeSendSms() → sendSMS() → Twilio API → Update Enrollment
```

## API Endpoints

### POST /api/sms/send

Send an SMS message.

**Request:**
```json
{
  "to": "+15551234567",
  "body": "Hi {{first_name}}, this is your roofing company.",
  "contactId": "uuid",
  "templateId": "uuid",
  "templateVariables": {
    "first_name": "John"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "SMS sent successfully",
  "sms": {
    "sid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "to": "+15551234567",
    "status": "queued"
  }
}
```

**Validation:**
- `to`: Min 10 digits
- `body`: 1-1600 characters
- `contactId`: Optional UUID
- `templateId`: Optional UUID

### POST /api/sms/webhook

Twilio webhook for receiving SMS.

**Request (Twilio Form Data):**
- `MessageSid`: Message identifier
- `From`: Sender number
- `To`: Your Twilio number
- `Body`: Message content
- `NumMedia`: Media attachment count

**Response (TwiML):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>You have been unsubscribed from SMS messages.</Message>
</Response>
```

### GET /api/settings/sms-templates

List SMS templates for tenant.

**Query Parameters:**
- `category`: Filter by category (optional)

**Response:**
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "Initial Contact",
      "description": "First contact message",
      "message": "Hi {{contact_first_name}}, this is {{company_name}}...",
      "category": "outreach",
      "available_variables": ["contact_first_name", "company_name"],
      "is_active": true,
      "is_default": false
    }
  ]
}
```

### POST /api/settings/sms-templates

Create new SMS template.

**Request:**
```json
{
  "name": "Follow Up",
  "description": "Follow up message",
  "message": "Hi {{contact_first_name}}, just following up on...",
  "category": "follow_up",
  "available_variables": [
    {"name": "contact_first_name", "description": "Contact first name"}
  ],
  "is_active": true,
  "is_default": false
}
```

### PATCH /api/settings/sms-templates/[id]

Update existing SMS template.

### DELETE /api/settings/sms-templates/[id]

Delete SMS template.

## Data Models

### SMS Templates Table

```sql
CREATE TABLE sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  message TEXT NOT NULL CHECK (LENGTH(message) <= 1600),
  category VARCHAR(100),
  available_variables JSONB DEFAULT '[
    {"name": "contact_name", "description": "Contact full name"},
    {"name": "contact_first_name", "description": "Contact first name"},
    {"name": "company_name", "description": "Your company name"},
    {"name": "user_name", "description": "Logged in user name"},
    {"name": "appointment_date", "description": "Appointment date/time"}
  ]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

### Contact SMS Fields

```sql
ALTER TABLE contacts
ADD COLUMN sms_opt_in BOOLEAN DEFAULT false,
ADD COLUMN sms_opt_in_date TIMESTAMPTZ,
ADD COLUMN sms_opt_out BOOLEAN DEFAULT false,
ADD COLUMN sms_opt_out_date TIMESTAMPTZ,
ADD COLUMN sms_opt_out_reason TEXT,
ADD COLUMN timezone TEXT DEFAULT 'America/New_York';
```

### Activity Metadata (SMS)

```json
{
  "twilio_sid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "to": "+15551234567",
  "from": "+15559876543",
  "status": "queued",
  "num_media": 0
}
```

### Database Indexes

```sql
CREATE INDEX idx_contacts_sms_opt_out ON contacts(sms_opt_out) WHERE sms_opt_out = true;
CREATE INDEX idx_contacts_sms_opt_in ON contacts(sms_opt_in) WHERE sms_opt_in = true;
CREATE INDEX idx_sms_templates_tenant ON sms_templates(tenant_id);
CREATE INDEX idx_sms_templates_category ON sms_templates(tenant_id, category);
```

## Integration Points

### 1. Activity Tracking
- All SMS (inbound/outbound) logged to activities table
- Type: `sms`
- Direction: `inbound` | `outbound`
- Metadata includes Twilio SID, status

### 2. Contact Management
- SMS compliance fields on contact records
- Automatic opt-out processing from webhook
- Phone lookup for inbound messages

### 3. Campaign Builder
- `send_sms` step type in campaigns
- Template variable replacement
- Automatic activity logging
- Enrollment tracking

### 4. Workflow Automation
- Campaign enrollment triggers
- Scheduled SMS steps with delays
- Event-driven messaging

### 5. Analytics Dashboard
- SMS sent/received counts
- Message length averages
- Period-based reporting

## Security

### Webhook Signature Verification
- Uses Twilio's `validateRequest()` method
- Requires `x-twilio-signature` header
- Validates full request URL and parameters
- Rejects invalid signatures with 403

### Authentication
- All send endpoints require user authentication
- Tenant isolation via RLS policies
- Template access restricted to tenant members

### RLS Policies
```sql
CREATE POLICY "Users can view their tenant sms templates"
  ON sms_templates FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their tenant sms templates"
  ON sms_templates FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()));
```

### Test Endpoint Protection
- `/api/sms/test` only available in development
- Returns error in production environment

## Configuration

### Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| TWILIO_ACCOUNT_SID | Twilio account SID | Yes |
| TWILIO_AUTH_TOKEN | Twilio auth token | Yes |
| TWILIO_PHONE_NUMBER | Your Twilio phone number | Yes |
| NEXT_PUBLIC_APP_URL | App URL for webhook URLs | Yes |

### A2P 10DLC Registration

For production US SMS, A2P 10DLC registration is required:
- Brand Registration: $4/month (Standard) or $2/month (Low-Volume)
- Campaign Registration: $10/month per campaign
- Higher trust score = better throughput

### Twilio Webhook Configuration

In Twilio Console, configure:
1. Go to Phone Numbers → Manage → Your Number
2. Messaging → Webhook URL: `https://yourdomain.com/api/sms/webhook`
3. HTTP Method: POST

## Testing

### Development Testing
- Use `/api/sms/test` endpoint (no compliance checks)
- Disabled in production
- Requires Twilio credentials

### E2E Test Coverage
No dedicated SMS E2E tests found - recommend adding:
- Send SMS flow
- Template selection and variable replacement
- Opt-out keyword processing
- Webhook signature verification

### Manual Testing
1. Send SMS via SMSComposer
2. Reply STOP to test opt-out
3. Verify activity logging
4. Check compliance stats

## Performance Notes

### Rate Limiting
- Twilio limit: 30 messages/30 seconds between two numbers
- Bulk SMS: 100ms delay between messages (carrier compliance)
- Retry: 3 attempts with exponential backoff (1-5 seconds)

### Message Segments
- Standard SMS: 160 characters/segment
- Unicode SMS: 70 characters/segment
- Character count displayed in SMSComposer UI

### Cost Optimization
- Use templates for consistent messaging
- Check compliance before send (avoid rejected messages)
- Monitor analytics for usage patterns

## Future Enhancements

1. **MMS Support** - Image/media attachments
2. **Two-Way Conversations** - Thread view for SMS history
3. **Scheduled SMS** - Time-delayed individual messages
4. **A/B Testing** - Template performance comparison
5. **Link Tracking** - Short URL click tracking
6. **Advanced Analytics** - Delivery rates, response times
7. **WhatsApp Integration** - Via Twilio Messaging API
8. **Toll-Free Verification** - For higher volume messaging

---

## Validation Record

### Files Examined

1. `/Users/ccai/roofing saas/roofing-saas/lib/twilio/client.ts` - Client initialization (37 lines)
2. `/Users/ccai/roofing saas/roofing-saas/lib/twilio/sms.ts` - SMS sending functions (139 lines)
3. `/Users/ccai/roofing saas/roofing-saas/lib/twilio/compliance.ts` - TCPA compliance (200 lines)
4. `/Users/ccai/roofing saas/roofing-saas/lib/twilio/errors.ts` - Error classes (41 lines)
5. `/Users/ccai/roofing saas/roofing-saas/lib/twilio/voice.ts` - Voice utilities (227 lines)
6. `/Users/ccai/roofing saas/roofing-saas/lib/twilio/analytics.ts` - Analytics functions (345 lines)
7. `/Users/ccai/roofing saas/roofing-saas/app/api/sms/send/route.ts` - Send endpoint (128 lines)
8. `/Users/ccai/roofing saas/roofing-saas/app/api/sms/webhook/route.ts` - Webhook handler (132 lines)
9. `/Users/ccai/roofing saas/roofing-saas/app/api/sms/test/route.ts` - Test endpoint (75 lines)
10. `/Users/ccai/roofing saas/roofing-saas/app/api/settings/sms-templates/route.ts` - Template list/create (123 lines)
11. `/Users/ccai/roofing saas/roofing-saas/app/api/settings/sms-templates/[id]/route.ts` - Template update/delete (111 lines)
12. `/Users/ccai/roofing saas/roofing-saas/components/sms/SMSComposer.tsx` - SMS UI component (322 lines)
13. `/Users/ccai/roofing saas/roofing-saas/components/settings/TemplateSettings.tsx` - Template management UI (300+ lines)
14. `/Users/ccai/roofing saas/roofing-saas/lib/webhooks/security.ts` - Webhook signature verification (308 lines)
15. `/Users/ccai/roofing saas/roofing-saas/lib/campaigns/execution-engine.ts` - Campaign SMS execution (699+ lines)
16. `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/archive/phase2/20251001_sms_compliance.sql` - SMS compliance migration (75 lines)
17. `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251004_tenant_customization_system.sql` - SMS templates table
18. `/Users/ccai/roofing saas/roofing-saas/docs/integrations/TWILIO_SMS_INTEGRATION_RESEARCH.md` - Integration docs (65KB)
19. `/Users/ccai/roofing saas/roofing-saas/package.json` - Twilio dependency v5.10.2

### Archon RAG Queries
- Query: "Twilio SMS webhooks TCPA compliance implementation" - Found Twilio docs on A2P 10DLC, compliance toolkit

### Verification Steps
1. Verified all lib/twilio/ files exist via `ls -la`
2. Confirmed API routes structure via `ls -la /app/api/sms/`
3. Verified Twilio package version in package.json (v5.10.2)
4. Confirmed database migration files for sms_templates and compliance fields
5. Verified SMSComposer component functionality
6. Confirmed webhook security implementation
7. Verified campaign execution engine SMS integration
8. Confirmed RLS policies for sms_templates table

### Validated By
PRD Documentation Agent - Session 14
Date: 2025-12-11T14:50:00Z
