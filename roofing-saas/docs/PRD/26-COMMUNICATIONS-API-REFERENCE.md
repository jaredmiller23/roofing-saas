# Communications API Reference

## Overview

The Roofing SAAS Communications API provides unified access to SMS, email, and voice call functionality. This API enables sales teams to communicate with leads and customers through multiple channels while maintaining compliance with regulations (TCPA for SMS, CAN-SPAM for email) and tracking all interactions in the CRM.

**Key Capabilities:**
- SMS messaging via Twilio with TCPA compliance
- Email delivery via Resend with CAN-SPAM compliance
- Outbound voice calls via Twilio with recording
- Inbound webhook processing for all channels
- Template-based messaging support
- Activity logging and analytics

---

## User Stories

### Sales Representatives
- As a sales rep, I want to send an SMS to a lead so that I can follow up quickly
- As a sales rep, I want to call a prospect directly from the CRM so that I can track the conversation
- As a sales rep, I want to use templates for common messages so that I maintain consistent communication
- As a sales rep, I want to see if my emails were opened so that I can prioritize follow-ups

### Office Staff
- As an office manager, I want to send bulk emails to customers so that I can announce promotions
- As an office staff member, I want to receive inbound SMS and log them automatically so that no leads are missed
- As an office staff member, I want to review call recordings so that I can ensure quality service

### Business Owners
- As a business owner, I want compliance features enabled so that I avoid TCPA/CAN-SPAM violations
- As a business owner, I want email analytics so that I can measure campaign effectiveness
- As a business owner, I want call recordings stored securely so that I have documentation for disputes

---

## SMS API Endpoints

### POST /api/sms/send

Send an SMS message to a phone number.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "to": "+14235551234",
  "body": "Hello, this is a follow-up from Acme Roofing!",
  "contactId": "uuid-optional",
  "templateId": "uuid-optional",
  "templateVariables": {
    "first_name": "John",
    "company": "Acme Roofing"
  }
}
```

**Validation Rules:**
- `to` (required): Phone number, minimum 10 digits
- `body` (required): Message text, 1-1600 characters
- `contactId` (optional): UUID of associated contact
- `templateId` (optional): UUID of SMS template
- `templateVariables` (optional): Key-value pairs for template substitution

**Compliance Checks:**
1. Verifies contact has not opted out (sms_opt_out)
2. Enforces quiet hours (8am-9pm in contact's timezone)
3. Logs attempt for compliance audit

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "SMS sent successfully",
    "sms": {
      "sid": "SMxxxxxxxxxxxxxxxxxxxx",
      "to": "+14235551234",
      "status": "queued"
    }
  }
}
```

**Error Responses:**
| Code | Description |
|------|-------------|
| 401 | User not authenticated |
| 403 | User not associated with tenant |
| 422 | Validation error (invalid phone, too long, etc.) |
| 422 | Compliance violation (opted out, quiet hours) |
| 500 | Twilio API error |

---

### POST /api/sms/test

Development-only endpoint for testing SMS without authentication or compliance checks.

**Authentication:** None (dev only)
**Environment:** Disabled in production

**Request Body:**
```json
{
  "to": "+14235551234",
  "body": "Test message"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Test SMS sent successfully",
    "sms": {
      "sid": "SMxxxxxxxxxxxxxxxxxxxx",
      "to": "+14235551234",
      "from": "+18005551234",
      "status": "queued"
    }
  }
}
```

---

### POST /api/sms/webhook

Twilio webhook for receiving inbound SMS messages.

**Authentication:** Twilio signature verification
**Content-Type:** application/x-www-form-urlencoded

**Twilio Form Parameters:**
- `MessageSid`: Unique message identifier
- `From`: Sender's phone number
- `To`: Your Twilio number
- `Body`: Message content
- `NumMedia`: Number of attached media files

**Processing Logic:**
1. Verify Twilio signature using `x-twilio-signature` header
2. Parse form data from request
3. Look up contact by phone number (phone or mobile_phone)
4. Log activity with direction "inbound"
5. Handle opt-out keywords (STOP, UNSUBSCRIBE, etc.)
6. Handle opt-in keywords (START, YES, etc.)

**Opt-Out Keywords:** STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT
**Opt-In Keywords:** START, YES, UNSTOP, SUBSCRIBE

**Response (TwiML):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>You have been unsubscribed from SMS messages.</Message>
</Response>
```

---

### GET /api/sms/webhook

Health check endpoint for SMS webhook.

**Response (200):**
```json
{
  "status": "ok",
  "message": "SMS webhook endpoint is active"
}
```

---

## Email API Endpoints

### POST /api/email/send

Send an email to one or more recipients.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "to": "customer@example.com",
  "subject": "Your Roofing Estimate",
  "html": "<p>Hello, please find your estimate attached.</p>",
  "text": "Hello, please find your estimate attached.",
  "contactId": "uuid-optional",
  "templateId": "uuid-optional",
  "templateVariables": {
    "customer_name": "John Smith",
    "estimate_amount": "$5,000"
  },
  "replyTo": "sales@acmeroofing.com",
  "cc": "manager@acmeroofing.com",
  "bcc": "records@acmeroofing.com"
}
```

**Validation Rules:**
- `to` (required): Email address or array of addresses
- `subject` (required): Subject line, 1-200 characters
- `html` / `text` / `templateId`: At least one required
- `replyTo` (optional): Valid email address
- `cc` / `bcc` (optional): Email address(es)

**Compliance Checks:**
1. Verifies contact has not opted out (email_opt_out)
2. Verifies email is not marked invalid (bounced)
3. Logs activity for CAN-SPAM compliance

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Email sent successfully",
    "email": {
      "id": "e_xxxxxxxxxxxx",
      "to": "customer@example.com",
      "subject": "Your Roofing Estimate"
    }
  }
}
```

**Error Responses:**
| Code | Description |
|------|-------------|
| 401 | User not authenticated |
| 403 | User not associated with tenant |
| 422 | Validation error (invalid email, missing content) |
| 422 | Compliance violation (opted out, invalid email) |
| 500 | Resend API error |

---

### POST /api/email/webhook

Resend webhook for email event notifications.

**Authentication:** Resend signature verification (svix)
**Content-Type:** application/json

**Webhook Events:**
- `email.sent`: Email was sent
- `email.delivered`: Email was delivered
- `email.opened`: Email was opened (tracked)
- `email.clicked`: Link in email was clicked
- `email.bounced`: Email bounced (hard or soft)
- `email.complained`: Spam complaint received

**Request Body (example):**
```json
{
  "type": "email.opened",
  "data": {
    "email_id": "e_xxxxxxxxxxxx",
    "to": "customer@example.com",
    "created_at": "2025-12-10T14:30:00Z",
    "user_agent": "Mozilla/5.0...",
    "ip_address": "192.168.1.1"
  }
}
```

**Processing Logic by Event Type:**

| Event | Action |
|-------|--------|
| email.sent | Update activity metadata with sent timestamp |
| email.delivered | Mark status as "delivered" |
| email.opened | Increment open_count, trigger workflows |
| email.clicked | Increment click_count, store clicked link |
| email.bounced | Mark contact email_invalid (if hard bounce) |
| email.complained | Mark contact email_opt_out, store complaint |

**Response (200):** `OK`

---

### GET /api/email/webhook

Health check endpoint for email webhook.

**Response (200):**
```json
{
  "status": "ok",
  "message": "Email webhook endpoint is active"
}
```

---

## Call Logs API Endpoints

### GET /api/call-logs

List call logs with filtering and pagination.

**Authentication:** Required (Bearer token)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | integer | Page number (default: 1) |
| limit | integer | Items per page (default: 10) |
| direction | string | Filter by "inbound" or "outbound" |
| outcome | string | Filter by outcome |
| disposition | string | Filter by disposition |
| contact_id | uuid | Filter by contact |
| project_id | uuid | Filter by project |
| user_id | uuid | Filter by user |
| search | string | Search phone number or notes |

**Response (200):**
```json
{
  "calls": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "contact_id": "uuid",
      "project_id": "uuid",
      "user_id": "uuid",
      "direction": "outbound",
      "phone_number": "+14235551234",
      "from_number": "+18005551234",
      "to_number": "+14235551234",
      "twilio_call_sid": "CAxxxxxxxxxxxx",
      "twilio_status": "completed",
      "duration": 120,
      "started_at": "2025-12-10T14:00:00Z",
      "ended_at": "2025-12-10T14:02:00Z",
      "recording_url": "https://api.twilio.com/...",
      "recording_duration": 115,
      "outcome": "answered",
      "disposition": "appointment_set",
      "notes": "Scheduled inspection for Friday",
      "follow_up_required": true,
      "follow_up_date": "2025-12-15",
      "created_at": "2025-12-10T14:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 10
}
```

---

### POST /api/call-logs

Create a new call log entry.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "contact_id": "uuid",
  "project_id": "uuid",
  "direction": "outbound",
  "phone_number": "+14235551234",
  "from_number": "+18005551234",
  "to_number": "+14235551234",
  "outcome": "answered",
  "disposition": "qualified",
  "notes": "Interested in roof replacement",
  "duration": 300,
  "follow_up_required": true,
  "follow_up_date": "2025-12-15"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "direction": "outbound",
  "phone_number": "+14235551234",
  "created_at": "2025-12-10T14:30:00Z"
}
```

---

### GET /api/call-logs/[id]

Get a single call log by ID.

**Authentication:** Required (Bearer token)

**Response (200):**
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "contact_id": "uuid",
  "direction": "outbound",
  "phone_number": "+14235551234",
  "twilio_call_sid": "CAxxxxxxxxxxxx",
  "twilio_status": "completed",
  "duration": 120,
  "recording_url": "https://api.twilio.com/...",
  "transcription": "Hello, this is John from Acme Roofing...",
  "summary": "Customer requested quote for roof replacement",
  "sentiment": "positive",
  "key_points": ["interested in replacement", "budget $8-10k", "insurance claim"],
  "outcome": "answered",
  "disposition": "appointment_set",
  "notes": "Scheduled inspection",
  "created_at": "2025-12-10T14:00:00Z"
}
```

**Error Responses:**
| Code | Description |
|------|-------------|
| 401 | Unauthorized |
| 403 | No tenant found |
| 404 | Call log not found |
| 500 | Internal server error |

---

### PATCH /api/call-logs/[id]

Update a call log entry.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "disposition": "appointment_set",
  "notes": "Inspection scheduled for Friday 2pm",
  "follow_up_required": false
}
```

**Response (200):** Updated call log object

---

### DELETE /api/call-logs/[id]

Soft delete a call log.

**Authentication:** Required (Bearer token)

**Response (200):**
```json
{
  "success": true
}
```

---

## Voice API Endpoints

### POST /api/voice/call

Initiate an outbound phone call via Twilio.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "to": "+14235551234",
  "contactId": "uuid-optional",
  "record": true,
  "message": "Hello, this is a call from Acme Roofing."
}
```

**Validation Rules:**
- `to` (required): Phone number, minimum 10 digits
- `contactId` (optional): UUID of associated contact
- `record` (optional): Enable call recording (default: true)
- `message` (optional): Custom TwiML message

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Call initiated successfully",
    "call": {
      "sid": "CAxxxxxxxxxxxxxxxxxxxx",
      "to": "+14235551234",
      "status": "queued"
    }
  }
}
```

---

### POST /api/voice/webhook

Twilio webhook for call status updates.

**Authentication:** Twilio signature verification

**Call Status Events:**
- initiated
- ringing
- answered
- completed
- busy
- no-answer
- canceled
- failed

**Form Parameters:**
- `CallSid`: Twilio call identifier
- `From`: Caller's number
- `To`: Called number
- `CallStatus`: Current status
- `Direction`: inbound or outbound
- `CallDuration`: Duration in seconds (on completion)

**Processing Logic:**
1. Verify Twilio signature
2. Find existing activity by call_sid
3. Update activity metadata with status/duration
4. For inbound calls, create new activity if none exists
5. Look up contact by phone number

**Response (200):** `OK`

---

### POST /api/voice/recording

Twilio webhook for recording status callbacks.

**Authentication:** Twilio signature verification

**Form Parameters:**
- `RecordingSid`: Recording identifier
- `CallSid`: Associated call identifier
- `RecordingUrl`: URL to recording file
- `RecordingStatus`: Recording status
- `RecordingDuration`: Recording duration in seconds

**Processing Logic:**
1. Verify Twilio signature
2. Find activity by call_sid
3. Update activity metadata with recording info
4. Store recording URL (with .mp3 extension)

**Response (200):** `OK`

---

### GET/POST /api/voice/twiml

Return TwiML instructions for Twilio voice calls.

**Authentication:** Twilio signature verification

**Query Parameters:**
- `message` (optional): Custom message to speak

**Response (TwiML):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Hello, this is a call from your roofing company.</Say>
  <Pause length="1"/>
</Response>
```

---

## Templates API

### GET /api/templates

List SMS and email templates.

**Authentication:** Required (Bearer token)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter by "sms" or "email" |
| category | string | Filter by category |
| page | integer | Page number (default: 1) |
| limit | integer | Items per page (default: 20) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "uuid",
        "tenant_id": "uuid",
        "name": "Follow-up SMS",
        "type": "sms",
        "content": "Hi {{first_name}}, thanks for your interest in our roofing services!",
        "variables": ["first_name"],
        "category": "follow-up",
        "created_at": "2025-12-01T10:00:00Z"
      }
    ],
    "total": 15,
    "page": 1,
    "limit": 20
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1
  }
}
```

---

### POST /api/templates

Create a new template.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "name": "Appointment Reminder",
  "type": "sms",
  "content": "Hi {{first_name}}, reminder: your roof inspection is scheduled for {{date}} at {{time}}.",
  "variables": ["first_name", "date", "time"],
  "category": "reminders"
}
```

**Validation Rules:**
- `name` (required): 1-100 characters
- `type` (required): "sms" or "email"
- `content` (required): Template content with {{variables}}
- `variables` (optional): Array of variable names
- `category` (optional): Category for organization

**Response (201):**
```json
{
  "success": true,
  "data": {
    "template": {
      "id": "uuid",
      "tenant_id": "uuid",
      "name": "Appointment Reminder",
      "type": "sms",
      "content": "Hi {{first_name}}...",
      "variables": ["first_name", "date", "time"],
      "category": "reminders",
      "created_by": "uuid",
      "created_at": "2025-12-10T15:00:00Z"
    }
  }
}
```

---

## Data Models

### Call Log Schema

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant reference (required) |
| contact_id | UUID | Contact reference (optional) |
| project_id | UUID | Project reference (optional) |
| user_id | UUID | User who made/received call |
| direction | TEXT | "inbound" or "outbound" |
| phone_number | TEXT | Phone number (E.164 format) |
| from_number | TEXT | Calling number |
| to_number | TEXT | Receiving number |
| twilio_call_sid | TEXT | Twilio Call SID (unique) |
| twilio_status | TEXT | Call status from Twilio |
| duration | INTEGER | Call duration in seconds |
| started_at | TIMESTAMPTZ | Call start time |
| ended_at | TIMESTAMPTZ | Call end time |
| recording_url | TEXT | URL to call recording |
| recording_duration | INTEGER | Recording duration in seconds |
| recording_sid | TEXT | Twilio Recording SID |
| transcription | TEXT | Full call transcription |
| transcription_confidence | DECIMAL | 0.00 to 1.00 |
| transcription_provider | TEXT | "twilio", "whisper", "deepgram" |
| summary | TEXT | AI-generated call summary |
| sentiment | TEXT | "positive", "neutral", "negative" |
| key_points | TEXT[] | Array of key discussion points |
| outcome | TEXT | "answered", "voicemail", "busy", "no_answer", "failed" |
| disposition | TEXT | "qualified", "not_interested", "callback", etc. |
| notes | TEXT | Manual notes |
| follow_up_required | BOOLEAN | Follow-up flag |
| follow_up_date | DATE | Scheduled follow-up date |
| follow_up_notes | TEXT | Follow-up notes |
| created_at | TIMESTAMPTZ | Record creation time |
| is_deleted | BOOLEAN | Soft delete flag |

### SMS Response Schema

| Field | Type | Description |
|-------|------|-------------|
| sid | string | Twilio message SID |
| to | string | Recipient phone number |
| from | string | Sender phone number |
| body | string | Message content |
| status | string | Message status |
| dateCreated | Date | Creation timestamp |

### Email Response Schema

| Field | Type | Description |
|-------|------|-------------|
| id | string | Resend email ID |
| to | string/array | Recipient(s) |
| subject | string | Email subject |
| from | string | Sender address |

### Template Schema

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant reference |
| name | TEXT | Template name (1-100 chars) |
| type | TEXT | "sms" or "email" |
| content | TEXT | Template content |
| variables | TEXT[] | Variable names array |
| category | TEXT | Category for organization |
| created_by | UUID | Creator user ID |
| created_at | TIMESTAMPTZ | Creation timestamp |
| is_deleted | BOOLEAN | Soft delete flag |

---

## Enums and Constants

### Call Direction
- `inbound`: Received call
- `outbound`: Initiated call

### Call Outcome
- `answered`: Call was answered
- `voicemail`: Went to voicemail
- `busy`: Line was busy
- `no_answer`: No answer
- `failed`: Call failed

### Call Disposition
- `qualified`: Qualified lead
- `not_interested`: Not interested
- `callback`: Requested callback
- `appointment_set`: Appointment scheduled
- `wrong_number`: Wrong number
- `do_not_call`: Do not call

### Twilio Call Status
- `queued`: Call is queued
- `ringing`: Phone is ringing
- `in-progress`: Call is active
- `completed`: Call completed
- `busy`: Busy signal
- `failed`: Call failed
- `no-answer`: No answer
- `canceled`: Call canceled

### Email Event Types
- `email.sent`: Email dispatched
- `email.delivered`: Email delivered
- `email.opened`: Email opened
- `email.clicked`: Link clicked
- `email.bounced`: Email bounced
- `email.complained`: Spam complaint

### SMS Opt-Out Keywords
- STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT

### SMS Opt-In Keywords
- START, YES, UNSTOP, SUBSCRIBE

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| AUTHENTICATION_ERROR | 401 | User not authenticated |
| AUTHORIZATION_ERROR | 403 | User not associated with tenant |
| VALIDATION_ERROR | 422 | Input validation failed |
| COMPLIANCE_ERROR | 422 | Compliance check failed |
| NOT_FOUND | 404 | Resource not found |
| TWILIO_ERROR | 500 | Twilio API error |
| RESEND_ERROR | 500 | Resend API error |
| INTERNAL_ERROR | 500 | Internal server error |

---

## Webhook Security

### Twilio Signature Verification

All Twilio webhooks verify the `x-twilio-signature` header using:
1. TWILIO_AUTH_TOKEN from environment
2. Full request URL
3. Request body/form data
4. `twilio.validateRequest()` function

### Resend Signature Verification

All Resend webhooks verify using Svix signatures:
1. RESEND_WEBHOOK_SECRET from environment
2. `svix-signature` header
3. `svix-timestamp` header
4. HMAC-SHA256 with timing-safe comparison
5. Timestamp validation (5-minute window for replay protection)

---

## Integration Points

### Activity Tracking
All communications are logged to the `activities` table:
- SMS sends/receives create activity records
- Email sends create activity records with metadata
- Call initiations create activity records
- Webhook updates add to activity metadata

### Workflow Automation
Email events trigger workflows:
- `email_opened` event triggers configured workflows
- `email_clicked` event triggers configured workflows
- Uses `triggerWorkflow()` from automation engine

### Contact Management
- Phone number lookup connects SMS/calls to contacts
- Email lookup connects emails to contacts
- Opt-out updates modify contact records
- Bounce tracking marks emails invalid

### Template System
- Templates are tenant-scoped
- Variable substitution uses `{{variable_name}}` format
- Templates support both SMS and email types

---

## Configuration

### Environment Variables

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+18005551234

# Resend Configuration
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_ADDRESS=noreply@yourdomain.com
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# Application
NEXT_PUBLIC_APP_URL=https://yourapp.com
```

---

## Security

### Multi-Tenant Isolation
- All API endpoints verify tenant_id ownership
- RLS policies enforce tenant isolation at database level
- Call logs, templates, and activities are tenant-scoped

### Webhook Security
- All webhooks verify provider signatures
- Failed verification returns 403 Forbidden
- Security violations are logged

### Data Protection
- Phone numbers stored in E.164 format
- Recording URLs are Twilio-authenticated
- Transcriptions and summaries are tenant-private

---

## Testing

### E2E Test Coverage
Referenced in test files:
- `e2e/workflows.spec.ts` - Campaign automation with SMS/email
- `e2e/voice-assistant.spec.ts` - Voice call integration
- `e2e/error-states.spec.ts` - Error handling scenarios

### Webhook Testing
- Development endpoints available for testing
- `/api/sms/test` for SMS testing (dev only)
- GET endpoints provide health checks

---

## Performance

### Retry Logic
- SMS: 3 attempts, 1-5 second delays
- Email: 3 attempts, 1-5 second delays
- Voice: 3 attempts, 1-5 second delays

### Rate Limiting
- Bulk SMS: 100ms delay between messages
- Bulk Email: Configurable delay (default 100ms)
- Prevents carrier/provider rate limit issues

### Database Indexes
Call logs table indexes:
- tenant_id, contact_id, project_id, user_id
- direction, twilio_call_sid
- created_at DESC, started_at DESC
- Composite: user_id + created_at DESC
- follow_up_required + follow_up_date (partial)

---

## Future Enhancements

1. **Call Transcription Integration** - Whisper/Deepgram integration
2. **AI Call Summaries** - Automatic call summary generation
3. **Inbound SMS Routing** - Keyword-based routing to users
4. **Email Sequence Builder** - Multi-email drip sequences
5. **Call Analytics Dashboard** - Call metrics visualization
6. **MMS Support** - Media message handling
7. **Two-Way SMS Conversations** - Threaded conversation view

---

## File References

### API Routes
- `/Users/ccai/roofing saas/roofing-saas/app/api/sms/send/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/sms/test/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/sms/webhook/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/email/send/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/email/webhook/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/call-logs/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/call-logs/[id]/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/voice/call/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/voice/webhook/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/voice/recording/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/voice/twiml/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/templates/route.ts`

### Library Files
- `/Users/ccai/roofing saas/roofing-saas/lib/twilio/sms.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/twilio/compliance.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/twilio/voice.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/resend/email.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/resend/compliance.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/webhooks/security.ts`

### Database Migrations
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251003_call_logs_table.sql`

---

## Validation Record

### Files Examined (18 total)
1. `app/api/sms/send/route.ts` (128 lines) - SMS send endpoint with compliance
2. `app/api/sms/test/route.ts` (75 lines) - Development test endpoint
3. `app/api/sms/webhook/route.ts` (132 lines) - Inbound SMS webhook
4. `app/api/email/send/route.ts` (196 lines) - Email send endpoint
5. `app/api/email/webhook/route.ts` (206 lines) - Email event webhook
6. `app/api/call-logs/route.ts` (119 lines) - Call logs CRUD
7. `app/api/call-logs/[id]/route.ts` (160 lines) - Single call log operations
8. `app/api/voice/call/route.ts` (114 lines) - Outbound call initiation
9. `app/api/voice/webhook/route.ts` (149 lines) - Call status webhook
10. `app/api/voice/recording/route.ts` (115 lines) - Recording webhook
11. `app/api/voice/twiml/route.ts` (67 lines) - TwiML generation
12. `app/api/templates/route.ts` (145 lines) - Templates API
13. `lib/twilio/sms.ts` (139 lines) - SMS utilities
14. `lib/twilio/compliance.ts` (200 lines) - TCPA compliance
15. `lib/twilio/voice.ts` (227 lines) - Voice utilities
16. `lib/resend/email.ts` (288 lines) - Email utilities
17. `lib/resend/compliance.ts` (240 lines) - CAN-SPAM compliance
18. `lib/webhooks/security.ts` (308 lines) - Webhook security

### Archon RAG Queries
- Query: "Twilio SMS webhook API integration" - Found Twilio documentation references

### Verification Steps
1. Read all SMS API route files and verified endpoint implementations
2. Read all email API route files and verified Resend integration
3. Read call-logs API routes and verified CRUD operations
4. Read voice API routes and verified Twilio voice integration
5. Read templates API and verified template system
6. Read library files and verified compliance implementations
7. Read webhook security file and verified signature verification
8. Read database migration and verified call_logs schema
9. Verified all file paths exist in codebase

### Validated By
PRD Documentation Agent - Session 28
Date: 2025-12-11T16:05:00Z
