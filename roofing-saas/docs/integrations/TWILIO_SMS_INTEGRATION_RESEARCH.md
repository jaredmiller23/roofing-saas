# Twilio SMS Integration Research Report
**Comprehensive Best Practices for Roofing CRM Application**

**Date**: October 1, 2025
**Project**: Roofing SaaS - Phase 2 Communication Hub
**Current Status**: SMS Integration COMPLETE (Phase 2 Week 6)
**Purpose**: Reference documentation for SMS best practices and future enhancements

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Twilio Setup & Authentication](#twilio-setup--authentication)
3. [SMS Sending Implementation](#sms-sending-implementation)
4. [SMS Compliance (TCPA)](#sms-compliance-tcpa)
5. [Template System](#template-system)
6. [Webhook Integration](#webhook-integration)
7. [Code Examples](#code-examples)
8. [Testing Strategy](#testing-strategy)
9. [Cost Analysis](#cost-analysis)
10. [Current Implementation Review](#current-implementation-review)
11. [Recommendations](#recommendations)

---

## Executive Summary

This document provides comprehensive research on Twilio SMS integration best practices for a Next.js 14 + Supabase roofing CRM application. The current implementation (Phase 2 Week 6) already includes core SMS functionality with TCPA compliance, retry logic, and activity logging.

### Key Findings:
- **Current Implementation**: ✅ Production-ready with TCPA compliance
- **Cost**: $0.0075-$0.0079 per SMS in US (2024 pricing)
- **Compliance**: TCPA quiet hours (8am-9pm), opt-out/opt-in tracking implemented
- **Rate Limiting**: 30 messages per 30 seconds between two numbers (Twilio limit)
- **A2P 10DLC**: Required for business messaging via long codes in US

---

## 1. Twilio Setup & Authentication

### 1.1 Account Setup Requirements

**Steps to Get Started:**

1. **Create Twilio Account**
   - Sign up at https://www.twilio.com/try-twilio
   - Verify your email and phone number
   - Get $15 trial credit (for testing)

2. **Get API Credentials**
   - Account SID: Found in Twilio Console Dashboard
   - Auth Token: Found in Twilio Console Dashboard (keep secret!)
   - Store in `.env.local`:
     ```bash
     TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
     TWILIO_AUTH_TOKEN=your_auth_token
     ```

3. **Provision Phone Number**
   - Go to Phone Numbers > Buy a Number
   - Choose local or toll-free number
   - Store in `.env.local`:
     ```bash
     TWILIO_PHONE_NUMBER=+15551234567
     ```

### 1.2 A2P 10DLC Registration (CRITICAL for Business)

**What is A2P 10DLC?**
- A2P = Application-to-Person
- 10DLC = 10 Digit Long Code
- Required for all business SMS in the United States (2024)
- Improves deliverability and throughput

**Registration Process:**

1. **Create Customer Profile** (Trust Hub)
   - Business legal name
   - EIN (Employer Identification Number)
   - Business address
   - Business type

2. **Register Your Brand**
   - Business description
   - Website URL
   - Vertical/Industry (Construction/Roofing)
   - Choose Standard or Low-Volume (< 6,000 msgs/day)

3. **Register Campaign(s)**
   - Campaign use case (Customer Care, Mixed, Marketing, etc.)
   - Sample messages
   - Opt-in/opt-out workflow description
   - Help keyword response

**Cost:**
- Brand Registration: $4/month (Standard) or $2/month (Low-Volume)
- Campaign Registration: $10/month per campaign

**Trust Score Impact:**
- Higher trust score = better throughput
- Determines daily message limits from carriers
- Based on business verification and history

### 1.3 Credential Storage Best Practices

**Environment Variables:**
```bash
# Production credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_production_token
TWILIO_PHONE_NUMBER=+15551234567

# Test credentials (for development - no charges)
TWILIO_TEST_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_TEST_AUTH_TOKEN=your_test_token
```

**Security Best Practices:**
1. Never commit credentials to Git
2. Use different credentials for dev/staging/production
3. Rotate Auth Token regularly (every 90 days)
4. Use Twilio subaccounts for isolation
5. Enable two-factor authentication on Twilio account
6. Restrict API keys to specific IP addresses if possible

**Next.js 14 Configuration:**
```typescript
// lib/twilio/config.ts
export const getTwilioConfig = () => {
  const isTest = process.env.NODE_ENV === 'test'

  return {
    accountSid: isTest
      ? process.env.TWILIO_TEST_ACCOUNT_SID
      : process.env.TWILIO_ACCOUNT_SID,
    authToken: isTest
      ? process.env.TWILIO_TEST_AUTH_TOKEN
      : process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  }
}
```

---

## 2. SMS Sending Implementation

### 2.1 Next.js 14 App Router API Pattern

**File Structure:**
```
app/api/sms/
├── send/route.ts          # POST /api/sms/send
├── webhook/route.ts       # POST /api/sms/webhook
└── test/route.ts          # POST /api/sms/test (dev only)
```

**Basic Send Implementation:**
```typescript
// app/api/sms/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Twilio } from 'twilio'

export async function POST(request: NextRequest) {
  try {
    const { to, body } = await request.json()

    const client = new Twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    )

    const message = await client.messages.create({
      to,
      from: process.env.TWILIO_PHONE_NUMBER!,
      body
    })

    return NextResponse.json({
      success: true,
      sid: message.sid,
      status: message.status
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send SMS' },
      { status: 500 }
    )
  }
}
```

### 2.2 Rate Limiting Strategies

**Twilio's Built-in Limits:**
- 30 outbound messages per 30 seconds between two phone numbers
- Error code 14107 when exceeded
- Messages are queued, not rejected

**Implementation Strategies:**

**1. Client-Side Delay (Simple):**
```typescript
// For bulk sending
export async function sendBulkSMS(recipients: string[], body: string) {
  const results = []

  for (const to of recipients) {
    const result = await sendSMS({ to, body })
    results.push(result)

    // Wait 100ms between messages (10 msgs/second)
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return results
}
```

**2. Queue-Based Approach (Production):**
```typescript
// lib/sms/queue.ts
import { Queue } from 'bullmq'

const smsQueue = new Queue('sms', {
  connection: {
    host: process.env.REDIS_HOST,
    port: 6379
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  }
})

// Add rate limiter
smsQueue.add('send', { to, body }, {
  rateLimiter: {
    max: 10,    // 10 jobs
    duration: 1000  // per second
  }
})
```

**3. Supabase pg_cron Approach (Current Implementation):**
```sql
-- Schedule SMS queue processing
SELECT cron.schedule(
  'process-sms-queue',
  '* * * * *',  -- Every minute
  $$
  SELECT process_sms_queue();
  $$
);
```

### 2.3 Error Handling

**Common Twilio Error Codes:**

| Code | Description | Action |
|------|-------------|--------|
| 21211 | Invalid 'To' phone number | Validate before sending |
| 21408 | Permission to send denied | Check opt-out status |
| 21610 | Unsubscribed recipient | Update database |
| 14107 | Rate limit exceeded | Implement backoff |
| 30003 | Unreachable destination | Mark as failed, notify |
| 30005 | Unknown destination | Validate number |

**Error Handling Pattern:**
```typescript
export async function sendSMS(params: SendSMSParams) {
  try {
    const message = await twilioClient.messages.create({
      to: params.to,
      from: params.from,
      body: params.body
    })

    return { success: true, sid: message.sid }
  } catch (error: any) {
    // Twilio errors have a 'code' property
    switch (error.code) {
      case 21211:
        throw new ValidationError('Invalid phone number')
      case 21408:
      case 21610:
        // Update opt-out status
        await markContactOptedOut(params.to)
        throw new ComplianceError('Contact has opted out')
      case 14107:
        // Retry with exponential backoff
        return await retryWithBackoff(() => sendSMS(params))
      default:
        throw new TwilioError('SMS send failed', error)
    }
  }
}
```

### 2.4 Retry Logic with Exponential Backoff

**Implementation:**
```typescript
interface RetryOptions {
  maxAttempts: number
  baseDelay: number      // milliseconds
  maxDelay: number       // max delay cap
  backoffMultiplier?: number  // default: 2
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxAttempts, baseDelay, maxDelay, backoffMultiplier = 2 } = options

  let lastError: Error

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      // Don't retry on validation errors
      if (error.code === 21211 || error.code === 21408) {
        throw error
      }

      if (attempt < maxAttempts) {
        // Calculate delay with exponential backoff
        const delay = Math.min(
          baseDelay * Math.pow(backoffMultiplier, attempt - 1),
          maxDelay
        )

        // Add jitter (randomness) to prevent thundering herd
        const jitter = Math.random() * 0.3 * delay
        const finalDelay = delay + jitter

        logger.warn(`SMS retry attempt ${attempt}/${maxAttempts}`, {
          delay: finalDelay,
          error: error.message
        })

        await new Promise(resolve => setTimeout(resolve, finalDelay))
      }
    }
  }

  throw lastError!
}

// Usage
const retryOptions: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,    // 1 second
  maxDelay: 5000      // 5 seconds max
}

const message = await withRetry(
  () => twilioClient.messages.create({ to, from, body }),
  retryOptions
)
```

### 2.5 Cost Optimization Techniques

**1. Message Segmentation Awareness:**
- Standard SMS: 160 characters per segment
- Unicode (emojis): 70 characters per segment
- Each segment billed separately

```typescript
export function calculateSMSSegments(text: string): number {
  const isUnicode = /[^\x00-\x7F]/.test(text)
  const limit = isUnicode ? 70 : 160
  return Math.ceil(text.length / limit)
}

export function estimateSMSCost(text: string, recipients: number): number {
  const segments = calculateSMSSegments(text)
  const costPerSegment = 0.0079  // US pricing
  return segments * recipients * costPerSegment
}
```

**2. Batch Optimization:**
```typescript
// Group messages by content to reuse templates
export function optimizeBatch(messages: Array<{ to: string, body: string }>) {
  const grouped = new Map<string, string[]>()

  messages.forEach(msg => {
    const recipients = grouped.get(msg.body) || []
    recipients.push(msg.to)
    grouped.set(msg.body, recipients)
  })

  return Array.from(grouped.entries()).map(([body, recipients]) => ({
    body,
    recipients
  }))
}
```

**3. Messaging Service (for High Volume):**
- Pool multiple phone numbers
- Automatic load balancing
- Better deliverability
- Copilot feature for intelligent routing

```typescript
// Create via API
const service = await client.messaging.v1.services.create({
  friendlyName: 'Roofing CRM SMS'
})

// Send using service
const message = await client.messages.create({
  messagingServiceSid: service.sid,  // Instead of 'from'
  to: recipient,
  body: messageBody
})
```

---

## 3. SMS Compliance (TCPA)

### 3.1 TCPA Overview

**Telephone Consumer Protection Act (1991):**
- Federal law protecting consumer privacy
- Regulates telemarketing calls, SMS, and fax
- Violations: $500-$1,500 per message
- Class action lawsuits common

**Key Requirements:**
1. **Prior Express Written Consent** for marketing messages
2. **Clear Opt-Out Instructions** in every message
3. **Honor Opt-Outs Immediately** (within 24 hours)
4. **Quiet Hours Enforcement** (8am-9pm recipient's local time)
5. **Business Identification** in messages

### 3.2 Opt-In/Opt-Out Requirements

**Opt-In Standards:**

**Single Opt-In (Minimum):**
```typescript
// Web form opt-in
<form onSubmit={handleOptIn}>
  <input type="tel" name="phone" required />
  <label>
    <input type="checkbox" required />
    I agree to receive SMS messages from [Company].
    Message & data rates may apply.
    Reply STOP to unsubscribe.
  </label>
  <button type="submit">Sign Up</button>
</form>
```

**Double Opt-In (Recommended):**
```typescript
// Step 1: User provides phone number
async function requestOptIn(phoneNumber: string) {
  await sendSMS({
    to: phoneNumber,
    body: `Welcome to ${COMPANY_NAME}! Reply YES to confirm you want to receive updates. Msg & data rates may apply. Reply STOP to cancel.`
  })

  // Store pending confirmation
  await db.contacts.update({
    where: { phone: phoneNumber },
    data: { sms_consent_status: 'pending' }
  })
}

// Step 2: User confirms via SMS
async function confirmOptIn(phoneNumber: string) {
  await db.contacts.update({
    where: { phone: phoneNumber },
    data: {
      sms_opt_in: true,
      sms_opt_in_date: new Date(),
      sms_consent_status: 'confirmed'
    }
  })

  await sendSMS({
    to: phoneNumber,
    body: `Thank you! You're subscribed to ${COMPANY_NAME} updates. Reply HELP for help or STOP to unsubscribe.`
  })
}
```

**Opt-Out Keywords (Standard):**
- STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT

**Auto-Response Required:**
```typescript
const OPT_OUT_RESPONSE =
  `You have been unsubscribed from ${COMPANY_NAME} messages. ` +
  `You will not receive any more messages from this number. ` +
  `Reply START to resubscribe.`

const OPT_IN_RESPONSE =
  `You have been re-subscribed to ${COMPANY_NAME} messages. ` +
  `Reply HELP for help or STOP to unsubscribe.`

const HELP_RESPONSE =
  `${COMPANY_NAME} SMS Help: Reply STOP to unsubscribe. ` +
  `Msg & data rates may apply. Contact: support@${COMPANY_DOMAIN}`
```

### 3.3 Quiet Hours Enforcement

**TCPA Rules:**
- No messages before 8:00 AM or after 9:00 PM
- Based on RECIPIENT's local time zone
- Some states have stricter rules (Texas: no texts after 12pm Sunday)

**Implementation:**
```typescript
interface QuietHoursConfig {
  startHour: number    // 8 (8am)
  endHour: number      // 21 (9pm)
  timezone: string     // Recipient's timezone
  strictMode?: boolean // For states like Texas
}

export function isWithinQuietHours(config: QuietHoursConfig): boolean {
  const { startHour, endHour, timezone } = config

  const now = new Date()
  const recipientTime = new Date(
    now.toLocaleString('en-US', { timeZone: timezone })
  )
  const hour = recipientTime.getHours()
  const day = recipientTime.getDay() // 0 = Sunday

  // Check standard quiet hours
  if (hour < startHour || hour >= endHour) {
    return false
  }

  // Texas-specific: No promotional texts after 12pm on Sunday
  if (config.strictMode && day === 0 && hour >= 12) {
    return false
  }

  return true
}

// Check before sending
export async function canSendSMS(phoneNumber: string): Promise<{
  allowed: boolean
  reason?: string
  scheduleFor?: Date
}> {
  const contact = await getContactByPhone(phoneNumber)

  // Check opt-out status
  if (contact.sms_opt_out) {
    return { allowed: false, reason: 'Contact opted out' }
  }

  // Check quiet hours
  const timezone = contact.timezone || 'America/New_York'
  const withinHours = isWithinQuietHours({
    startHour: 8,
    endHour: 21,
    timezone,
    strictMode: contact.state === 'TX'
  })

  if (!withinHours) {
    // Calculate next available time
    const scheduleFor = calculateNextAvailableTime(timezone)
    return {
      allowed: false,
      reason: 'Outside quiet hours',
      scheduleFor
    }
  }

  return { allowed: true }
}

function calculateNextAvailableTime(timezone: string): Date {
  const now = new Date()
  const recipientTime = new Date(
    now.toLocaleString('en-US', { timeZone: timezone })
  )
  const hour = recipientTime.getHours()

  // If after 9pm, schedule for 8am next day
  if (hour >= 21) {
    recipientTime.setDate(recipientTime.getDate() + 1)
    recipientTime.setHours(8, 0, 0, 0)
  }
  // If before 8am, schedule for 8am today
  else if (hour < 8) {
    recipientTime.setHours(8, 0, 0, 0)
  }

  return recipientTime
}
```

### 3.4 Required Message Disclaimers

**Welcome Message (First Contact):**
```
Welcome to [Company Name]! You're now subscribed to updates about your roofing project. Msg & data rates may apply. Msg frequency varies. Reply HELP for help, STOP to cancel. Terms: [link] Privacy: [link]
```

**Marketing Message Template:**
```
[Company Name]: [Message content]. Reply STOP to opt out or HELP for info. Msg & data rates apply.
```

**Promotional Campaign:**
```
[Company Name]: Special offer! [Details]. Not interested? Reply STOP. Terms apply: [link]
```

**Transactional Messages (TCPA Exempt):**
- Appointment confirmations
- Project status updates
- Invoice notifications
- Emergency alerts

```typescript
export function formatComplianceMessage(
  body: string,
  type: 'marketing' | 'transactional'
): string {
  if (type === 'transactional') {
    // No disclaimer needed for transactional
    return body
  }

  // Add disclaimer for marketing
  const disclaimer = ' Reply STOP to opt out.'

  // Ensure total length doesn't exceed 160 chars (1 segment)
  const maxBodyLength = 160 - disclaimer.length
  const truncatedBody = body.length > maxBodyLength
    ? body.substring(0, maxBodyLength - 3) + '...'
    : body

  return truncatedBody + disclaimer
}
```

### 3.5 Database Schema for Compliance

```sql
-- Contacts table (SMS consent tracking)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sms_opt_in_date TIMESTAMP;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sms_opt_in_method VARCHAR(50); -- web, keyword, verbal
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sms_opt_out BOOLEAN DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sms_opt_out_date TIMESTAMP;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sms_opt_out_reason TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sms_consent_status VARCHAR(20); -- pending, confirmed, revoked
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/New_York';

-- Compliance audit log
CREATE TABLE sms_compliance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id),
  phone_number VARCHAR(20),
  action VARCHAR(20), -- opt_in, opt_out, message_sent, message_blocked
  reason TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Message templates with compliance flags
CREATE TABLE sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(100),
  body TEXT,
  type VARCHAR(20), -- marketing, transactional
  requires_consent BOOLEAN DEFAULT true,
  variables JSONB, -- {first_name: "sample", amount: "100"}
  created_at TIMESTAMP DEFAULT now()
);
```

---

## 4. Template System

### 4.1 Variable Substitution Patterns

**Twilio Content API (Recommended for Production):**
```typescript
// Create template in Twilio
const contentTemplate = await client.content.v1.contents.create({
  friendlyName: 'appointment_reminder',
  language: 'en',
  variables: {
    '1': 'first_name',
    '2': 'appointment_date',
    '3': 'appointment_time'
  },
  types: {
    'twilio/text': {
      body: 'Hi {{1}}, reminder: Your roofing inspection is scheduled for {{2}} at {{3}}. Reply STOP to opt out.'
    }
  }
})

// Send with variables
const message = await client.messages.create({
  contentSid: contentTemplate.sid,
  contentVariables: JSON.stringify({
    '1': 'John',
    '2': 'Oct 15',
    '3': '2:00 PM'
  }),
  to: '+15551234567',
  from: '+15559876543'
})
```

**Custom Template System (Current Implementation):**
```typescript
// Database schema
interface SMSTemplate {
  id: string
  tenant_id: string
  name: string
  body: string
  type: 'marketing' | 'transactional'
  variables: string[] // ['first_name', 'company', 'amount']
  sample_variables: Record<string, string>
}

// Template replacement function
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template

  // Support multiple formats: {{var}}, {var}, $var
  for (const [key, value] of Object.entries(variables)) {
    const patterns = [
      new RegExp(`{{\\s*${key}\\s*}}`, 'g'),  // {{first_name}}
      new RegExp(`{\\s*${key}\\s*}`, 'g'),     // {first_name}
      new RegExp(`\\$${key}\\b`, 'g')           // $first_name
    ]

    patterns.forEach(pattern => {
      result = result.replace(pattern, value || '')
    })
  }

  return result
}

// Example usage
const template = await getTemplate('appointment_reminder')
const message = replaceTemplateVariables(template.body, {
  first_name: contact.first_name,
  appointment_date: format(appointment.date, 'MMM dd'),
  appointment_time: format(appointment.time, 'h:mm a')
})
```

### 4.2 Template Storage in Database

**Supabase Schema:**
```sql
CREATE TABLE sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  body TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('marketing', 'transactional')),
  category VARCHAR(50), -- appointment, quote, follow_up, promotion
  variables TEXT[], -- Array of variable names
  sample_variables JSONB, -- Default/sample values
  requires_consent BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(tenant_id, name)
);

-- Row Level Security
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's templates"
  ON sms_templates FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Admins can manage templates"
  ON sms_templates FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND current_setting('app.user_role') = 'admin'
  );
```

### 4.3 Common Roofing Industry Templates

**1. Appointment Reminder:**
```
Hi {{first_name}}, this is {{company_name}}. Reminder: Your roofing inspection is scheduled for {{date}} at {{time}}. See you then! Reply STOP to opt out.
```

**2. Quote Follow-Up:**
```
{{first_name}}, your roof estimate of ${{amount}} is ready! Valid for 30 days. Questions? Call us at {{phone}}. Text STOP to unsubscribe.
```

**3. Project Status Update:**
```
{{company_name}} update: Your roofing project at {{address}} is {{status}}. Expected completion: {{date}}. Reply STOP to opt out.
```

**4. Payment Reminder:**
```
Hi {{first_name}}, your invoice #{{invoice_number}} for ${{amount}} is due {{due_date}}. Pay online: {{payment_link}}. Reply STOP to unsubscribe.
```

**5. Inspection Complete:**
```
{{first_name}}, your roof inspection is complete! We found {{issue_count}} items. Full report: {{report_link}}. Questions? Call {{phone}}. Text STOP to opt out.
```

**6. Weather Alert:**
```
{{company_name}} alert: Severe weather expected {{date}}. Your roof at {{address}} may need inspection after. We'll follow up. Reply STOP to opt out.
```

**7. Referral Request:**
```
{{first_name}}, we hope you're happy with your new roof! Know someone who needs roofing? Refer them and get ${{referral_bonus}}! Reply STOP to opt out.
```

**8. Seasonal Maintenance:**
```
{{company_name}}: Fall is here! Schedule your annual roof inspection for only ${{inspection_price}}. Book: {{booking_link}}. Reply STOP to unsubscribe.
```

### 4.4 Personalization Strategies

**Contact Data Mapping:**
```typescript
export function buildTemplateVariables(
  contact: Contact,
  additional?: Record<string, any>
): Record<string, string> {
  return {
    // Contact info
    first_name: contact.first_name || '',
    last_name: contact.last_name || '',
    full_name: `${contact.first_name} ${contact.last_name}`.trim(),
    email: contact.email || '',
    phone: formatPhoneNumber(contact.phone) || '',
    address: contact.address || '',
    city: contact.city || '',
    state: contact.state || '',

    // Company info
    company_name: getTenantName(contact.tenant_id),
    company_phone: getTenantPhone(contact.tenant_id),
    company_website: getTenantWebsite(contact.tenant_id),

    // Dynamic data
    ...additional,

    // Dates (formatted)
    today: format(new Date(), 'MMM dd, yyyy'),
    year: new Date().getFullYear().toString()
  }
}

// Usage
const variables = buildTemplateVariables(contact, {
  appointment_date: 'Oct 15',
  appointment_time: '2:00 PM',
  technician_name: 'Mike'
})

const message = replaceTemplateVariables(template.body, variables)
```

**Context-Aware Templates:**
```typescript
export async function getRecommendedTemplate(
  context: {
    contactId: string
    projectStage?: string
    lastInteraction?: Date
    messageType: 'reminder' | 'follow_up' | 'update' | 'marketing'
  }
): Promise<SMSTemplate> {
  const { contactId, projectStage, messageType } = context

  // Business logic for template selection
  if (messageType === 'reminder' && projectStage === 'inspection_scheduled') {
    return getTemplate('appointment_reminder')
  }

  if (messageType === 'follow_up' && projectStage === 'quote_sent') {
    return getTemplate('quote_follow_up')
  }

  // Default template
  return getTemplate(`${messageType}_default`)
}
```

---

## 5. Webhook Integration

### 5.1 Delivery Status Callbacks

**Webhook Configuration:**
```typescript
// Set webhook URL when sending SMS
const message = await twilioClient.messages.create({
  to: recipient,
  from: twilioNumber,
  body: messageBody,
  statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/webhook`
})
```

**Message Status Flow:**
```
queued → sending → sent → delivered
                       ↓
                    failed/undelivered
```

**Webhook Endpoint:**
```typescript
// app/api/sms/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateTwilioSignature } from '@/lib/twilio/security'

export async function POST(request: NextRequest) {
  try {
    // 1. Verify webhook authenticity
    const signature = request.headers.get('X-Twilio-Signature')
    const url = request.url
    const body = await request.text()
    const params = new URLSearchParams(body)

    if (!validateTwilioSignature(signature!, url, Object.fromEntries(params))) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    // 2. Parse webhook data
    const messageSid = params.get('MessageSid')
    const messageStatus = params.get('MessageStatus')
    const to = params.get('To')
    const from = params.get('From')
    const errorCode = params.get('ErrorCode')
    const errorMessage = params.get('ErrorMessage')

    // 3. Update database
    await updateMessageStatus({
      sid: messageSid!,
      status: messageStatus!,
      to: to!,
      from: from!,
      errorCode: errorCode || null,
      errorMessage: errorMessage || null
    })

    // 4. Handle specific statuses
    switch (messageStatus) {
      case 'delivered':
        await onMessageDelivered(messageSid!)
        break
      case 'failed':
      case 'undelivered':
        await onMessageFailed(messageSid!, errorCode, errorMessage)
        break
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('SMS webhook error', { error })
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
```

### 5.2 Inbound SMS Handling

**Configure Webhook in Twilio Console:**
1. Go to Phone Numbers → Active Numbers
2. Select your number
3. Messaging Configuration → Webhook URL
4. Set to: `https://yourdomain.com/api/sms/webhook`

**Inbound Handler:**
```typescript
export async function POST(request: NextRequest) {
  const params = await request.formData()

  const from = params.get('From') as string
  const to = params.get('To') as string
  const body = params.get('Body') as string
  const messageSid = params.get('MessageSid') as string

  // Check for opt-out keywords
  if (isOptOutMessage(body)) {
    await optOutContact(from)
    return twimlResponse(`You have been unsubscribed. Reply START to resubscribe.`)
  }

  // Check for opt-in keywords
  if (isOptInMessage(body)) {
    await optInContact(from)
    return twimlResponse(`You are now subscribed! Reply STOP to unsubscribe.`)
  }

  // Check for HELP
  if (body.trim().toUpperCase() === 'HELP') {
    return twimlResponse(HELP_RESPONSE)
  }

  // Store inbound message
  await storeInboundMessage({
    from,
    to,
    body,
    sid: messageSid
  })

  // Trigger automation (if configured)
  await triggerInboundAutomation(from, body)

  // Return empty TwiML (no auto-reply)
  return twimlResponse()
}

function twimlResponse(message?: string) {
  const twiml = message
    ? `<?xml version="1.0" encoding="UTF-8"?>
       <Response>
         <Message>${message}</Message>
       </Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`

  return new Response(twiml, {
    headers: { 'Content-Type': 'text/xml' }
  })
}
```

### 5.3 Message History Tracking

**Database Schema:**
```sql
CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  contact_id UUID REFERENCES contacts(id),
  twilio_sid VARCHAR(34) UNIQUE,
  direction VARCHAR(10) CHECK (direction IN ('inbound', 'outbound')),
  from_number VARCHAR(20),
  to_number VARCHAR(20),
  body TEXT,
  status VARCHAR(20), -- queued, sending, sent, delivered, failed, etc.
  error_code VARCHAR(10),
  error_message TEXT,
  segments INTEGER DEFAULT 1,
  price DECIMAL(10, 4),
  price_unit VARCHAR(3) DEFAULT 'USD',
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_sms_messages_contact_id ON sms_messages(contact_id);
CREATE INDEX idx_sms_messages_twilio_sid ON sms_messages(twilio_sid);
CREATE INDEX idx_sms_messages_status ON sms_messages(status);
CREATE INDEX idx_sms_messages_created_at ON sms_messages(created_at DESC);

-- Full-text search on message body
CREATE INDEX idx_sms_messages_body_search ON sms_messages USING gin(to_tsvector('english', body));
```

**Tracking Functions:**
```typescript
export async function updateMessageStatus(data: {
  sid: string
  status: string
  errorCode?: string | null
  errorMessage?: string | null
}) {
  const supabase = await createClient()

  const updateData: any = {
    status: data.status,
    updated_at: new Date().toISOString()
  }

  if (data.status === 'delivered') {
    updateData.delivered_at = new Date().toISOString()
  }

  if (data.errorCode) {
    updateData.error_code = data.errorCode
    updateData.error_message = data.errorMessage
  }

  const { error } = await supabase
    .from('sms_messages')
    .update(updateData)
    .eq('twilio_sid', data.sid)

  if (error) {
    logger.error('Failed to update message status', { error, sid: data.sid })
  }
}

export async function getMessageHistory(
  contactId: string,
  limit: number = 50
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sms_messages')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return data || []
}
```

### 5.4 Error Notification Patterns

**Real-time Alerts:**
```typescript
export async function onMessageFailed(
  messageSid: string,
  errorCode?: string | null,
  errorMessage?: string | null
) {
  const message = await getMessageBySid(messageSid)

  // Critical errors (notify immediately)
  const criticalErrors = ['30003', '30005', '21610'] // Unreachable, unknown, unsubscribed

  if (errorCode && criticalErrors.includes(errorCode)) {
    // Send alert to admin
    await sendAdminAlert({
      type: 'sms_critical_failure',
      messageSid,
      errorCode,
      errorMessage,
      contact: message.contact_id
    })

    // Update contact record
    if (errorCode === '21610') {
      // Carrier-level opt-out
      await optOutContact(message.to_number, 'Carrier opt-out')
    }
  }

  // Log for monitoring
  logger.error('SMS delivery failed', {
    sid: messageSid,
    errorCode,
    errorMessage,
    to: message.to_number
  })
}

// Batch error report (daily digest)
export async function generateErrorReport(tenantId: string) {
  const supabase = await createClient()

  const { data: failures } = await supabase
    .from('sms_messages')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('status', ['failed', 'undelivered'])
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  if (failures && failures.length > 0) {
    // Group by error code
    const grouped = failures.reduce((acc, msg) => {
      const code = msg.error_code || 'unknown'
      acc[code] = (acc[code] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Send email report to admin
    await sendEmailReport({
      subject: `SMS Delivery Report - ${failures.length} failures in last 24h`,
      failures: grouped,
      details: failures
    })
  }
}
```

---

## 6. Code Examples

### 6.1 Complete Next.js API Route

```typescript
// app/api/sms/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { sendSMS, replaceTemplateVariables } from '@/lib/twilio/sms'
import { canSendSMS } from '@/lib/twilio/compliance'
import { z } from 'zod'

const sendSMSSchema = z.object({
  to: z.string().regex(/^\+?1?\d{10,}$/, 'Invalid phone number'),
  body: z.string().min(1).max(1600),
  contactId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  templateVariables: z.record(z.string()).optional(),
  scheduleFor: z.string().datetime().optional()
})

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant' }, { status: 403 })
    }

    // 2. Validation
    const body = await request.json()
    const validatedData = sendSMSSchema.safeParse(body)

    if (!validatedData.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validatedData.error.errors
      }, { status: 400 })
    }

    const { to, body: messageBody, contactId, templateId, templateVariables, scheduleFor } = validatedData.data

    // 3. Compliance Check
    const permission = await canSendSMS(to)
    if (!permission.allowed) {
      return NextResponse.json({
        error: 'Cannot send SMS',
        reason: permission.reason,
        scheduleFor: permission.scheduleFor
      }, { status: 403 })
    }

    // 4. Template Processing
    const supabase = await createClient()
    let finalBody = messageBody

    if (templateId) {
      const { data: template } = await supabase
        .from('sms_templates')
        .select('body, variables')
        .eq('id', templateId)
        .eq('tenant_id', tenantId)
        .single()

      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }

      finalBody = replaceTemplateVariables(template.body, templateVariables || {})
    }

    // 5. Schedule or Send
    if (scheduleFor) {
      // Queue for later
      await supabase.from('sms_queue').insert({
        tenant_id: tenantId,
        contact_id: contactId,
        to,
        body: finalBody,
        scheduled_for: scheduleFor,
        created_by: user.id
      })

      return NextResponse.json({
        success: true,
        scheduled: true,
        scheduledFor: scheduleFor
      })
    }

    // 6. Send Immediately
    const smsResponse = await sendSMS({ to, body: finalBody })

    // 7. Log Activity
    await supabase.from('sms_messages').insert({
      tenant_id: tenantId,
      contact_id: contactId,
      twilio_sid: smsResponse.sid,
      direction: 'outbound',
      from_number: smsResponse.from,
      to_number: smsResponse.to,
      body: smsResponse.body,
      status: smsResponse.status,
      sent_at: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      sid: smsResponse.sid,
      status: smsResponse.status
    })

  } catch (error: any) {
    logger.error('SMS send failed', { error })
    return NextResponse.json({
      error: 'Failed to send SMS',
      message: error.message
    }, { status: 500 })
  }
}
```

### 6.2 Supabase Integration

```typescript
// lib/sms/database.ts
import { createClient } from '@/lib/supabase/server'

export async function logSMSMessage(data: {
  tenantId: string
  contactId?: string
  twilioSid: string
  direction: 'inbound' | 'outbound'
  from: string
  to: string
  body: string
  status: string
}) {
  const supabase = await createClient()

  const { data: message, error } = await supabase
    .from('sms_messages')
    .insert({
      tenant_id: data.tenantId,
      contact_id: data.contactId,
      twilio_sid: data.twilioSid,
      direction: data.direction,
      from_number: data.from,
      to_number: data.to,
      body: data.body,
      status: data.status,
      sent_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    logger.error('Failed to log SMS', { error })
    throw error
  }

  return message
}

export async function getContactConversation(contactId: string) {
  const supabase = await createClient()

  const { data: messages } = await supabase
    .from('sms_messages')
    .select(`
      id,
      direction,
      body,
      status,
      created_at,
      from_number,
      to_number
    `)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: true })

  return messages || []
}

export async function getSMSAnalytics(tenantId: string, dateRange: { start: Date, end: Date }) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('sms_messages')
    .select('status, direction, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', dateRange.start.toISOString())
    .lte('created_at', dateRange.end.toISOString())

  const stats = {
    total: data?.length || 0,
    sent: data?.filter(m => m.status === 'sent').length || 0,
    delivered: data?.filter(m => m.status === 'delivered').length || 0,
    failed: data?.filter(m => m.status === 'failed').length || 0,
    inbound: data?.filter(m => m.direction === 'inbound').length || 0,
    outbound: data?.filter(m => m.direction === 'outbound').length || 0,
    deliveryRate: 0
  }

  stats.deliveryRate = stats.sent > 0
    ? Math.round((stats.delivered / stats.sent) * 100)
    : 0

  return stats
}
```

### 6.3 Opt-In/Opt-Out Flow

```typescript
// lib/sms/consent.ts
import { createClient } from '@/lib/supabase/server'
import { sendSMS } from '@/lib/twilio/sms'

const OPT_OUT_KEYWORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']
const OPT_IN_KEYWORDS = ['START', 'YES', 'UNSTOP']

export function isOptOutMessage(message: string): boolean {
  const normalized = message.trim().toUpperCase()
  return OPT_OUT_KEYWORDS.some(keyword => normalized === keyword)
}

export function isOptInMessage(message: string): boolean {
  const normalized = message.trim().toUpperCase()
  return OPT_IN_KEYWORDS.some(keyword => normalized === keyword)
}

export async function processOptOut(phoneNumber: string, reason: string = 'User requested STOP') {
  const supabase = await createClient()

  // Update contact
  const { data: contact, error } = await supabase
    .from('contacts')
    .update({
      sms_opt_out: true,
      sms_opt_out_date: new Date().toISOString(),
      sms_opt_out_reason: reason,
      sms_opt_in: false
    })
    .or(`phone.eq.${phoneNumber},mobile_phone.eq.${phoneNumber}`)
    .select()
    .single()

  if (error) {
    logger.error('Failed to opt out contact', { error, phoneNumber })
    throw error
  }

  // Log compliance action
  await supabase.from('sms_compliance_log').insert({
    contact_id: contact.id,
    phone_number: phoneNumber,
    action: 'opt_out',
    reason
  })

  // Send confirmation
  await sendSMS({
    to: phoneNumber,
    body: `You have been unsubscribed. You will not receive any more messages from this number. Reply START to resubscribe.`
  })

  return contact
}

export async function processOptIn(phoneNumber: string) {
  const supabase = await createClient()

  // Update contact
  const { data: contact, error } = await supabase
    .from('contacts')
    .update({
      sms_opt_in: true,
      sms_opt_in_date: new Date().toISOString(),
      sms_opt_out: false,
      sms_opt_out_date: null,
      sms_opt_out_reason: null
    })
    .or(`phone.eq.${phoneNumber},mobile_phone.eq.${phoneNumber}`)
    .select()
    .single()

  if (error) {
    logger.error('Failed to opt in contact', { error, phoneNumber })
    throw error
  }

  // Log compliance action
  await supabase.from('sms_compliance_log').insert({
    contact_id: contact.id,
    phone_number: phoneNumber,
    action: 'opt_in'
  })

  // Send welcome message
  await sendSMS({
    to: phoneNumber,
    body: `Welcome back! You are subscribed to updates. Msg & data rates may apply. Reply HELP for help or STOP to unsubscribe.`
  })

  return contact
}

// Webhook handler for inbound messages
export async function handleInboundSMS(params: {
  From: string
  To: string
  Body: string
  MessageSid: string
}) {
  const { From, To, Body, MessageSid } = params

  // Check for opt-out
  if (isOptOutMessage(Body)) {
    await processOptOut(From)
    return { handled: true, action: 'opt_out' }
  }

  // Check for opt-in
  if (isOptInMessage(Body)) {
    await processOptIn(From)
    return { handled: true, action: 'opt_in' }
  }

  // Check for HELP
  if (Body.trim().toUpperCase() === 'HELP') {
    await sendSMS({
      to: From,
      body: 'Help: Reply STOP to unsubscribe or START to resubscribe. Msg & data rates may apply. Contact: support@yourcompany.com'
    })
    return { handled: true, action: 'help' }
  }

  // Log message for manual review
  await logInboundMessage({ From, To, Body, MessageSid })

  return { handled: false }
}
```

### 6.4 Template Rendering System

```typescript
// lib/sms/templates.ts
import { createClient } from '@/lib/supabase/server'

export interface TemplateVariable {
  key: string
  value: string
  fallback?: string
}

export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template

  // Replace {{variable}} syntax
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    result = result.replace(regex, value || '')
  }

  // Clean up any remaining unreplaced variables
  result = result.replace(/{{[^}]+}}/g, '')

  return result.trim()
}

export async function renderTemplate(
  templateId: string,
  variables: Record<string, string>,
  tenantId: string
): Promise<string> {
  const supabase = await createClient()

  const { data: template, error } = await supabase
    .from('sms_templates')
    .select('body, sample_variables')
    .eq('id', templateId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !template) {
    throw new Error('Template not found')
  }

  // Merge provided variables with sample defaults
  const mergedVariables = {
    ...template.sample_variables,
    ...variables
  }

  return replaceTemplateVariables(template.body, mergedVariables)
}

export async function createTemplate(data: {
  tenantId: string
  name: string
  body: string
  type: 'marketing' | 'transactional'
  category?: string
  variables?: string[]
  sampleVariables?: Record<string, string>
}) {
  const supabase = await createClient()

  // Extract variables from template body
  const bodyVariables = extractVariables(data.body)

  const { data: template, error } = await supabase
    .from('sms_templates')
    .insert({
      tenant_id: data.tenantId,
      name: data.name,
      body: data.body,
      type: data.type,
      category: data.category,
      variables: data.variables || bodyVariables,
      sample_variables: data.sampleVariables || {}
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return template
}

function extractVariables(template: string): string[] {
  const regex = /{{([^}]+)}}/g
  const matches = template.matchAll(regex)
  const variables = new Set<string>()

  for (const match of matches) {
    variables.add(match[1].trim())
  }

  return Array.from(variables)
}

// Roofing-specific template builder
export function buildRoofingVariables(data: {
  contact: any
  project?: any
  appointment?: any
  estimate?: any
  company: any
}): Record<string, string> {
  const { contact, project, appointment, estimate, company } = data

  return {
    // Contact
    first_name: contact.first_name || '',
    last_name: contact.last_name || '',
    full_name: `${contact.first_name} ${contact.last_name}`.trim(),
    address: contact.address || '',

    // Company
    company_name: company.name || '',
    company_phone: company.phone || '',
    company_website: company.website || '',

    // Project
    project_status: project?.status || '',
    project_type: project?.type || '',
    completion_date: project?.completion_date ? format(project.completion_date, 'MMM dd') : '',

    // Appointment
    appointment_date: appointment?.date ? format(appointment.date, 'MMM dd') : '',
    appointment_time: appointment?.time ? format(appointment.time, 'h:mm a') : '',
    technician_name: appointment?.technician_name || '',

    // Estimate
    estimate_amount: estimate?.total ? `$${estimate.total.toLocaleString()}` : '',
    estimate_valid_until: estimate?.valid_until ? format(estimate.valid_until, 'MMM dd') : '',

    // Dates
    today: format(new Date(), 'MMM dd, yyyy')
  }
}
```

---

## 7. Testing Strategy

### 7.1 Twilio Test Credentials

**Setup:**
```bash
# .env.test
TWILIO_TEST_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_TEST_AUTH_TOKEN=your_test_auth_token
TWILIO_PHONE_NUMBER=+15005550006  # Magic number
```

**Test Credentials Behavior:**
- ✅ Accept API requests normally
- ✅ Return success responses
- ❌ DO NOT send actual SMS
- ❌ DO NOT charge your account
- ❌ DO NOT trigger status callbacks

**Magic Phone Numbers:**
```typescript
export const TWILIO_TEST_NUMBERS = {
  SUCCESS: '+15005550006',           // Returns success
  INVALID: '+15005550001',           // Returns invalid number error
  CANNOT_ROUTE: '+15005550002',      // Returns cannot route error
  NOT_IN_SERVICE: '+15005550003',    // Returns not in service
  VALID_MOBILE_US: '+15005550004',   // Valid mobile (US)
  VALID_MOBILE_UK: '+15005550005',   // Valid mobile (UK)
  BLACKLISTED: '+15005550007',       // Returns blacklisted
  UNDELIVERABLE: '+15005550008',     // Returns undeliverable
  LANDLINE: '+15005550009'           // Returns landline (can't receive SMS)
}

// Test different scenarios
describe('SMS Error Handling', () => {
  it('should handle invalid phone number', async () => {
    await expect(sendSMS({
      to: TWILIO_TEST_NUMBERS.INVALID,
      body: 'Test'
    })).rejects.toThrow('Invalid phone number')
  })

  it('should handle undeliverable', async () => {
    await expect(sendSMS({
      to: TWILIO_TEST_NUMBERS.UNDELIVERABLE,
      body: 'Test'
    })).rejects.toThrow()
  })
})
```

### 7.2 Mock SMS for Development

**Vitest Mock:**
```typescript
// lib/twilio/__mocks__/sms.ts
export const sendSMS = vi.fn(async (params: SendSMSParams) => {
  console.log('[MOCK SMS]', params)

  return {
    sid: `SM${Math.random().toString(36).substring(7)}`,
    to: params.to,
    from: params.from || process.env.TWILIO_PHONE_NUMBER!,
    body: params.body,
    status: 'sent',
    dateCreated: new Date()
  }
})

export const sendBulkSMS = vi.fn(async (recipients: string[], body: string) => {
  console.log('[MOCK BULK SMS]', { recipients, body })

  return {
    successful: recipients.map(to => ({
      sid: `SM${Math.random().toString(36).substring(7)}`,
      to,
      from: process.env.TWILIO_PHONE_NUMBER!,
      body,
      status: 'sent',
      dateCreated: new Date()
    })),
    failed: []
  }
})
```

**Usage in Tests:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the entire module
vi.mock('@/lib/twilio/sms')

describe('SMS API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should send SMS successfully', async () => {
    const response = await fetch('/api/sms/send', {
      method: 'POST',
      body: JSON.stringify({
        to: '+15551234567',
        body: 'Test message'
      })
    })

    expect(response.status).toBe(200)
    expect(sendSMS).toHaveBeenCalledWith({
      to: '+15551234567',
      body: 'Test message'
    })
  })
})
```

### 7.3 Production Testing Best Practices

**1. Use Verified Numbers (Trial Accounts):**
```typescript
// Only send to verified numbers in trial mode
export async function canSendInTrial(phoneNumber: string): Promise<boolean> {
  const verifiedNumbers = process.env.TWILIO_VERIFIED_NUMBERS?.split(',') || []
  return verifiedNumbers.includes(phoneNumber)
}

if (isTrial && !await canSendInTrial(to)) {
  throw new Error('Phone number not verified for trial account')
}
```

**2. Staging Environment:**
```bash
# .env.staging
TWILIO_ACCOUNT_SID=AC_staging_account
TWILIO_AUTH_TOKEN=staging_token
TWILIO_PHONE_NUMBER=+15559999999  # Dedicated staging number
SMS_TESTING_MODE=true  # Flag for extra logging
```

**3. End-to-End Testing:**
```typescript
// e2e/sms.spec.ts
import { test, expect } from '@playwright/test'

test('complete SMS flow', async ({ page }) => {
  // 1. Login
  await page.goto('/login')
  await page.fill('[name=email]', 'test@example.com')
  await page.fill('[name=password]', 'password')
  await page.click('button[type=submit]')

  // 2. Navigate to messaging
  await page.goto('/contacts/123/messages')

  // 3. Send SMS
  await page.fill('[name=message]', 'Test message')
  await page.click('button:has-text("Send")')

  // 4. Verify success
  await expect(page.locator('.toast-success')).toBeVisible()
  await expect(page.locator('.message-sent')).toContainText('Test message')
})
```

**4. Webhook Testing (ngrok):**
```bash
# Expose local server for webhooks
ngrok http 3000

# Update Twilio webhook URL (temporarily)
# https://abc123.ngrok.io/api/sms/webhook

# Test inbound SMS
curl -X POST https://abc123.ngrok.io/api/sms/webhook \
  -d "From=+15551234567" \
  -d "To=+15559876543" \
  -d "Body=STOP" \
  -d "MessageSid=SM123"
```

**5. Load Testing:**
```typescript
// load-test/sms.ts
import { check } from 'k6'
import http from 'k6/http'

export const options = {
  vus: 10,  // 10 virtual users
  duration: '30s'
}

export default function() {
  const payload = JSON.stringify({
    to: '+15551234567',
    body: 'Load test message'
  })

  const response = http.post('http://localhost:3000/api/sms/send', payload, {
    headers: { 'Content-Type': 'application/json' }
  })

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500
  })
}

// Run: k6 run load-test/sms.ts
```

---

## 8. Cost Analysis

### 8.1 Twilio SMS Pricing (2024)

**United States:**
- **Outbound SMS**: $0.0075 - $0.0079 per message segment
- **Inbound SMS**: $0.0075 per message
- **Toll-Free SMS**: $0.0125 per segment (higher deliverability)

**Message Segmentation:**
- **Standard (GSM-7)**: 160 characters per segment
- **Unicode (emojis, etc.)**: 70 characters per segment
- **Concatenated**: Overhead of 7 chars per segment

**Examples:**
```typescript
// 1 segment - $0.0079
"Your roofing appointment is confirmed for Oct 15 at 2pm."  // 59 chars

// 2 segments - $0.0158
"Hi John! Your roofing inspection is scheduled for October 15 at 2:00 PM. Our technician Mike will arrive at your home. Please ensure someone is available. Reply STOP to opt out."  // 180 chars

// Unicode (2 segments) - $0.0158
"👋 Hi John! Your roof is fixed 🏠✅ Total: $5,000"  // 48 chars (unicode)
```

### 8.2 A2P 10DLC Fees

**Registration Costs:**
- **Standard Brand**: $4/month
- **Low-Volume Brand**: $2/month (< 6,000 msgs/day)
- **Campaign Registration**: $10/month per campaign
- **One-time Brand Vetting** (optional): $40 (higher trust score)

**Total Monthly Base:**
- Standard: $14/month ($4 brand + $10 campaign)
- Low-Volume: $12/month ($2 brand + $10 campaign)

### 8.3 Phone Number Costs

**US Phone Numbers:**
- **Local Number**: $1.15/month
- **Toll-Free Number**: $2.00/month
- **Short Code**: $1,000+/month (not recommended for small businesses)

**Messaging Service:**
- Free to create
- Allows pooling multiple numbers
- Better for high-volume senders

### 8.4 Expected Monthly Costs

**Scenario 1: Small Roofing Company (100 contacts)**
```
Assumptions:
- 100 active contacts
- 4 messages/contact/month (avg)
- 80% delivery rate
- 1.2 segments/message (avg)

Calculation:
Messages: 100 × 4 × 0.8 = 320 delivered
Segments: 320 × 1.2 = 384 segments
SMS Cost: 384 × $0.0079 = $3.03

Base Costs:
- Phone Number: $1.15
- Brand Registration: $4
- Campaign: $10

Total Monthly: $18.18
Cost per message: $0.057
```

**Scenario 2: Medium Company (500 contacts)**
```
Assumptions:
- 500 active contacts
- 6 messages/contact/month
- 85% delivery rate
- 1.3 segments/message

Calculation:
Messages: 500 × 6 × 0.85 = 2,550 delivered
Segments: 2,550 × 1.3 = 3,315 segments
SMS Cost: 3,315 × $0.0079 = $26.19

Base Costs:
- Phone Number: $1.15
- Brand Registration: $4
- Campaign: $10

Total Monthly: $41.34
Cost per message: $0.016
```

**Scenario 3: Large Company (2,000 contacts)**
```
Assumptions:
- 2,000 active contacts
- 8 messages/contact/month
- 90% delivery rate
- 1.4 segments/message

Calculation:
Messages: 2,000 × 8 × 0.9 = 14,400 delivered
Segments: 14,400 × 1.4 = 20,160 segments
SMS Cost: 20,160 × $0.0079 = $159.26

Base Costs:
- 2 Phone Numbers (rotation): $2.30
- Brand Registration: $4
- Campaign: $10

Total Monthly: $175.56
Cost per message: $0.012
```

### 8.5 Volume Discounts

**Twilio Discounts (Contact Sales):**
- 100K+ messages/month: ~15% discount
- 500K+ messages/month: ~25% discount
- 1M+ messages/month: ~30-40% discount

**Example with Discount:**
```
Base rate: $0.0079/segment
Volume: 100,000 segments/month
Discount: 15%

Cost: 100,000 × $0.0079 × 0.85 = $671.50/month
vs. No discount: 100,000 × $0.0079 = $790/month
Savings: $118.50/month
```

### 8.6 Cost Optimization Strategies

**1. Reduce Segment Count:**
```typescript
// ❌ Bad (2 segments, unicode)
"🏠 Hey John! Your roof inspection is done ✅"

// ✅ Good (1 segment)
"John, your roof inspection is complete."

// Savings per 1000 messages: ~$8
```

**2. Use Transactional vs Marketing:**
```typescript
// Marketing (requires opt-in, costs more compliance effort)
"New roofing special! 20% off this month. Call now!"

// Transactional (TCPA exempt, better deliverability)
"Your roof repair is complete. Invoice: $5,000."
```

**3. Batch Similar Messages:**
```typescript
// Send to 100 people with same message
// Use template with personalization
// Only 1 template vs 100 unique messages
```

**4. Timing Optimization:**
```typescript
// Queue messages for business hours
// Better response rate = higher ROI
// Avoid after-hours "wasted" sends
```

**5. Messaging Service vs Individual Numbers:**
```
Individual Numbers:
- 5 numbers × $1.15 = $5.75/month
- Manual load balancing

Messaging Service:
- $0 (free)
- Automatic load balancing
- Add numbers to pool as needed

Savings: $5.75/month
```

---

## 9. Current Implementation Review

### 9.1 What's Already Built (Phase 2 Week 6)

**✅ Implemented Features:**

1. **SMS Sending (`lib/twilio/sms.ts`)**
   - Basic send function with Twilio client
   - Retry logic (3 attempts, exponential backoff)
   - Bulk sending with rate limiting (100ms delay)
   - Template variable replacement
   - Error handling with custom TwilioError

2. **Compliance System (`lib/twilio/compliance.ts`)**
   - Opt-out keyword detection (STOP, CANCEL, etc.)
   - Opt-in keyword detection (START, YES, etc.)
   - Database integration for consent tracking
   - Quiet hours enforcement (8am-9pm)
   - Timezone-aware checking
   - Compliance statistics API

3. **API Routes**
   - `POST /api/sms/send` - Send SMS with compliance checks
   - `POST /api/sms/webhook` - Handle Twilio webhooks
   - `POST /api/sms/test` - Testing endpoint

4. **Database Schema**
   - Contacts table with SMS consent fields
   - Activities table for message logging
   - Templates table for reusable messages

**Current Configuration:**
```typescript
// Existing environment variables
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=[configured]
```

### 9.2 Strengths of Current Implementation

**1. Solid Foundation:**
- ✅ Retry logic with exponential backoff
- ✅ TCPA compliance (opt-out, quiet hours)
- ✅ Template system with variable replacement
- ✅ Activity logging to Supabase
- ✅ Error handling

**2. Good Architecture:**
- ✅ Separation of concerns (sms.ts, compliance.ts)
- ✅ Reusable functions
- ✅ Type safety with TypeScript
- ✅ Integration with existing auth/tenant system

**3. Production Ready:**
- ✅ Authentication checks
- ✅ Tenant isolation
- ✅ Proper error responses
- ✅ Logging for debugging

### 9.3 Potential Enhancements

**1. A2P 10DLC Registration (HIGH PRIORITY)**
```typescript
// TODO: Complete A2P 10DLC registration
// Current: Using basic long code
// Enhancement: Register brand + campaign for better deliverability

// Add to documentation:
// 1. Register in Twilio Console > Regulatory Compliance
// 2. Complete Brand profile
// 3. Create Campaign (use case: "Mixed" for roofing CRM)
// 4. Associate phone number with campaign
```

**2. Webhook Signature Validation (SECURITY)**
```typescript
// lib/twilio/security.ts
import { validateRequest } from 'twilio'

export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, any>
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN!
  return validateRequest(authToken, signature, url, params)
}

// Add to webhook route:
const signature = request.headers.get('X-Twilio-Signature')
if (!validateTwilioSignature(signature!, url, params)) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
}
```

**3. Message Status Tracking (ENHANCEMENT)**
```typescript
// Enhanced status callback handling
export async function POST(request: NextRequest) {
  const params = await request.formData()

  const messageSid = params.get('MessageSid')
  const messageStatus = params.get('MessageStatus')
  const errorCode = params.get('ErrorCode')

  // Update message status in database
  await supabase
    .from('sms_messages')
    .update({
      status: messageStatus,
      error_code: errorCode,
      delivered_at: messageStatus === 'delivered' ? new Date() : null
    })
    .eq('twilio_sid', messageSid)

  // Handle carrier-level opt-outs
  if (errorCode === '21610') {
    const to = params.get('To')
    await optOutContact(to, 'Carrier opt-out')
  }
}
```

**4. Analytics Dashboard (FEATURE)**
```typescript
// app/api/analytics/sms/route.ts
export async function GET(request: NextRequest) {
  const tenantId = await getUserTenantId()
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30')

  const analytics = await getSMSAnalytics(tenantId, {
    start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
    end: new Date()
  })

  return NextResponse.json({
    total: analytics.total,
    delivered: analytics.delivered,
    failed: analytics.failed,
    deliveryRate: analytics.deliveryRate,
    optOutRate: await getOptOutRate(tenantId),
    averageSegments: await getAverageSegments(tenantId)
  })
}
```

**5. Scheduled Messages (FEATURE)**
```sql
-- Add to existing schema
CREATE TABLE sms_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  contact_id UUID REFERENCES contacts(id),
  to_number VARCHAR(20),
  body TEXT,
  scheduled_for TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP,
  error TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Process queue with pg_cron
SELECT cron.schedule(
  'process-sms-queue',
  '* * * * *',  -- Every minute
  $$
  SELECT process_sms_queue();
  $$
);
```

**6. Two-Way Conversations (FEATURE)**
```typescript
// app/(dashboard)/contacts/[id]/messages/page.tsx
export default function MessagesPage({ params }: { params: { id: string } }) {
  const [messages, setMessages] = useState([])

  // Real-time updates via Supabase
  useEffect(() => {
    const subscription = supabase
      .channel('sms_messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'sms_messages',
        filter: `contact_id=eq.${params.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()

    return () => subscription.unsubscribe()
  }, [params.id])

  return <ConversationView messages={messages} contactId={params.id} />
}
```

---

## 10. Recommendations

### 10.1 Immediate Actions (Week 10)

**1. Complete A2P 10DLC Registration (HIGH PRIORITY)**
- [ ] Register Brand in Twilio Console
- [ ] Create Campaign (use case: "Mixed" for transactional + marketing)
- [ ] Associate phone number with campaign
- [ ] Document registration details in .env.example
- **Timeline**: 1-2 days
- **Impact**: Better deliverability, higher daily limits, compliance

**2. Add Webhook Signature Validation (SECURITY)**
- [ ] Implement validateTwilioSignature function
- [ ] Add to all webhook endpoints
- [ ] Test with real Twilio webhooks
- **Timeline**: 1 hour
- **Impact**: Prevent spoofed webhooks, security hardening

**3. Set Up Status Callbacks (ENHANCEMENT)**
- [ ] Configure status callback URL in message sending
- [ ] Handle all message statuses (queued, sent, delivered, failed)
- [ ] Update database with delivery status
- **Timeline**: 2-3 hours
- **Impact**: Better tracking, error handling, analytics

### 10.2 Phase 3 Enhancements (Weeks 11-12)

**1. SMS Analytics Dashboard**
- Delivery rate tracking
- Opt-out rate monitoring
- Cost analysis per campaign
- Best time to send analysis
- **Timeline**: 1 week
- **Impact**: Data-driven decision making

**2. Scheduled Messages**
- Queue system with pg_cron
- Timezone-aware scheduling
- Automatic quiet hours enforcement
- Retry failed sends
- **Timeline**: 3-4 days
- **Impact**: Better user experience, automation

**3. Two-Way Conversations UI**
- Chat-style message view
- Real-time updates with Supabase subscriptions
- Quick replies and templates
- Conversation history
- **Timeline**: 1 week
- **Impact**: Better customer engagement

### 10.3 Future Enhancements (Phase 4+)

**1. AI-Powered Features**
- Auto-reply using GPT-4
- Sentiment analysis on inbound messages
- Smart template suggestions
- Conversation summarization

**2. Advanced Compliance**
- DNC (Do Not Call) list integration
- State-specific quiet hours
- Compliance reports for audits
- TCPA consent forms

**3. Multi-Channel**
- WhatsApp integration (via Twilio)
- RCS (Rich Communication Services)
- Facebook Messenger
- Unified inbox

### 10.4 Testing & Monitoring

**Recommended Tools:**
- **Sentry**: Error tracking and monitoring
- **LogRocket**: Session replay for debugging
- **Twilio Console**: Built-in analytics and logs
- **Supabase Logs**: Database query monitoring

**Monitoring Checklist:**
- [ ] Set up error alerts for SMS failures
- [ ] Track delivery rate (goal: >95%)
- [ ] Monitor opt-out rate (flag if >2%)
- [ ] Weekly compliance audit
- [ ] Monthly cost review

---

## Conclusion

The current SMS implementation (Phase 2 Week 6) provides a solid foundation with TCPA compliance, retry logic, and basic template support. The system is production-ready for basic SMS operations.

**Key Strengths:**
- ✅ TCPA compliant (opt-out, quiet hours)
- ✅ Robust error handling and retry logic
- ✅ Integration with Supabase for logging
- ✅ Template system with variable replacement

**Priority Enhancements:**
1. **A2P 10DLC Registration** (required for business messaging)
2. **Webhook Signature Validation** (security)
3. **Status Callback Handling** (delivery tracking)
4. **Analytics Dashboard** (insights)
5. **Scheduled Messages** (automation)

**Cost Expectations:**
- Small (100 contacts): ~$18/month
- Medium (500 contacts): ~$41/month
- Large (2000 contacts): ~$176/month

The research conducted provides comprehensive best practices that align with industry standards and Twilio recommendations. The current implementation can be enhanced incrementally while maintaining production stability.

---

## References

- [Twilio SMS Documentation](https://www.twilio.com/docs/messaging)
- [Twilio A2P 10DLC Guide](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc)
- [TCPA Compliance Guide](https://www.twilio.com/docs/glossary/what-is-telephone-consumer-protection-act-tcpa)
- [Next.js 14 App Router](https://nextjs.org/docs/app)
- [Supabase Documentation](https://supabase.com/docs)

---

**Report Compiled**: October 1, 2025
**Author**: Claude Code Research
**Project**: Roofing SaaS - Communication Hub
**Version**: 1.0
