# Per-User Phone Numbers - Twilio Research & Implementation Plan

**Date:** 2026-02-05
**Author:** Claude (Research Phase)
**Status:** Research Complete - Ready for Implementation Decision

---

## Executive Summary

This document analyzes the current Twilio SMS implementation and proposes a per-user phone number system allowing sales reps, project managers, and campaigns to send SMS from personalized phone numbers.

**Recommendation:** Option B (Phone Number Pool with Messaging Service) is the best balance of simplicity, cost, and functionality for ASR's needs.

---

## 1. Current State Analysis

### 1.1 Twilio Configuration

**File:** `/Users/ccai/roofing-saas/roofing-saas/lib/twilio/client.ts`

```typescript
// Current: Single phone number from environment variable
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER
```

The system uses:
- `TWILIO_ACCOUNT_SID` - Account identifier
- `TWILIO_AUTH_TOKEN` - Authentication token
- `TWILIO_PHONE_NUMBER` - Single company-wide phone number
- `TWILIO_MESSAGING_SERVICE_SID` - Optional (not currently utilized for sender selection)

### 1.2 SMS Sending Logic

**File:** `/Users/ccai/roofing-saas/roofing-saas/lib/twilio/sms.ts`

```typescript
export interface SendSMSParams {
  to: string
  body: string
  from?: string  // <-- Optional override exists but not used
}

export async function sendSMS(params: SendSMSParams): Promise<SMSResponse> {
  // Currently defaults to single company number
  const fromNumber = params.from || getTwilioPhoneNumber()
  // ...
}
```

**Key Finding:** The `from` parameter already exists in the interface but is never populated with user-specific numbers.

### 1.3 Campaign SMS Execution

**File:** `/Users/ccai/roofing-saas/roofing-saas/lib/campaigns/execution-engine.ts`

```typescript
async function executeSendSms(
  context: StepExecutionContext,
  config: SendSmsStepConfig
): Promise<ExecutionResult> {
  // No sender selection logic - always uses company default
  const result = await sendSMS({
    to: contact.phone,
    body: message,
    // `from` not specified - defaults to company number
  })
}
```

**Current `SendSmsStepConfig` Type:**
```typescript
export interface SendSmsStepConfig {
  template_id?: string | null
  message?: string
  personalization?: Record<string, string>
  track_replies?: boolean
  // No sender selection fields
}
```

### 1.4 Environment Variables

From `/Users/ccai/roofing-saas/roofing-saas/docs/ENVIRONMENT_VARIABLES.md`:

| Variable | Status | Purpose |
|----------|--------|---------|
| `TWILIO_ACCOUNT_SID` | Required | Account authentication |
| `TWILIO_AUTH_TOKEN` | Required | API authentication |
| `TWILIO_PHONE_NUMBER` | Required | Default sender number |
| `TWILIO_MESSAGING_SERVICE_SID` | Optional | Not currently used |

---

## 2. Option Comparison Matrix

### Option A: Twilio Subaccounts

Each user gets their own Twilio subaccount with dedicated phone number.

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Isolation** | Excellent | Complete separation per user |
| **Billing** | Excellent | Individual cost tracking |
| **Complexity** | High | Manage multiple account credentials |
| **Cost** | Higher | Subaccount overhead + numbers |
| **Compliance** | Excellent | Issues isolated to single user |
| **Implementation** | Complex | Requires credential management per user |
| **Scaling** | Moderate | 1000+ subaccounts can be unwieldy |

**Best For:** Multi-tenant SaaS platforms with reseller model, when billing isolation is critical.

### Option B: Phone Number Pool (Recommended)

Single Twilio account with multiple numbers assigned to users via database mapping.

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Isolation** | Good | Logical separation via database |
| **Billing** | Moderate | All on single account |
| **Complexity** | Low | Simple database mapping |
| **Cost** | Lowest | Just number costs (~$1.15/mo each) |
| **Compliance** | Good | Can revoke individual numbers |
| **Implementation** | Simple | Add table + modify SMS send |
| **Scaling** | Excellent | Up to 400 numbers per Messaging Service |

**Best For:** Single-organization deployments, teams under 100 users.

### Option C: Twilio Messaging Service with Sticky Sender

Use Messaging Service's built-in sender pool with sticky sender feature.

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Isolation** | Moderate | Twilio manages sender selection |
| **Billing** | Simple | Single account |
| **Complexity** | Moderate | Rely on Twilio's selection logic |
| **Cost** | Lowest | Same as Option B |
| **Control** | Limited | Can't specify exact sender |
| **Implementation** | Simple | Use messagingServiceSid |
| **Scaling** | Excellent | Native Twilio scaling |

**Limitation:** Sticky Sender ensures consistency per recipient, but doesn't allow specifying "send from John's number for this campaign step."

### Option D: Alpha Sender IDs

Use alphanumeric sender IDs (e.g., "John at ASR").

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Isolation** | N/A | Branded text, not real numbers |
| **Cost** | Free | No additional numbers needed |
| **Replies** | None | Recipients cannot reply |
| **US Support** | No | Not available in US market |

**Verdict:** Not viable for ASR due to US carrier restrictions and no reply capability.

---

## 3. Recommended Approach: Option B Enhanced

Combine Option B (Phone Number Pool) with selective use of Messaging Services for campaigns.

### Why This Approach

1. **Simple Implementation:** Database mapping + minor code changes
2. **Full Control:** Explicitly specify sender for each use case
3. **Reply Handling:** Maintain conversational threading
4. **Cost Effective:** ~$1.15/month per user phone number
5. **Existing Infrastructure:** Uses single Twilio account already configured
6. **Gradual Migration:** Can start with key users, expand over time

---

## 4. Database Schema Design

### 4.1 New Table: `user_phone_numbers`

```sql
-- Per-user phone number assignments
CREATE TABLE IF NOT EXISTS user_phone_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Phone number details
  phone_number VARCHAR(20) NOT NULL,  -- E.164 format: +12345678900
  twilio_sid VARCHAR(50),             -- Twilio Phone Number SID (PN...)
  friendly_name VARCHAR(100),         -- Display name: "John's Line"

  -- Capabilities
  capabilities JSONB DEFAULT '{"sms": true, "mms": true, "voice": false}'::jsonb,

  -- Status
  is_primary BOOLEAN DEFAULT true,    -- Primary number for this user
  is_active BOOLEAN DEFAULT true,     -- Currently active/usable

  -- Metadata
  provisioned_at TIMESTAMPTZ,         -- When number was acquired
  provisioned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(tenant_id, phone_number),    -- Number unique within tenant
  UNIQUE(tenant_id, user_id, is_primary) WHERE is_primary = true  -- One primary per user
);

-- Indexes
CREATE INDEX idx_user_phone_numbers_tenant ON user_phone_numbers(tenant_id);
CREATE INDEX idx_user_phone_numbers_user ON user_phone_numbers(user_id);
CREATE INDEX idx_user_phone_numbers_number ON user_phone_numbers(phone_number);

-- RLS Policies
ALTER TABLE user_phone_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view phone numbers in their tenant"
  ON user_phone_numbers FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage phone numbers"
  ON user_phone_numbers FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );
```

### 4.2 Update: `campaign_steps.step_config` for SMS

Extend `SendSmsStepConfig` to include sender selection:

```typescript
export interface SendSmsStepConfig {
  template_id?: string | null
  message?: string
  personalization?: Record<string, string>
  track_replies?: boolean

  // NEW: Sender selection
  sender_type?: 'company' | 'assigned_rep' | 'specific_user' | 'project_manager'
  sender_user_id?: string  // When sender_type is 'specific_user'
}
```

### 4.3 Optional: `tenant_phone_numbers` for Company Numbers

```sql
-- Company-wide phone numbers (pools, department lines)
CREATE TABLE IF NOT EXISTS tenant_phone_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  phone_number VARCHAR(20) NOT NULL,
  twilio_sid VARCHAR(50),
  friendly_name VARCHAR(100),         -- "Main Office", "Support Line"

  purpose VARCHAR(50) DEFAULT 'general',  -- general, support, sales, marketing
  is_default BOOLEAN DEFAULT false,   -- Default company number
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, phone_number)
);
```

---

## 5. SMS Sender Resolution Logic

```typescript
/**
 * Resolve which phone number to send from
 * Priority: Explicit > User Primary > Company Default
 */
export async function resolveSenderNumber(
  tenantId: string,
  options: {
    senderType?: 'company' | 'assigned_rep' | 'specific_user' | 'project_manager'
    senderUserId?: string
    contactId?: string
    projectId?: string
  }
): Promise<string> {
  const supabase = await createClient()

  // 1. Company default - always available
  const companyDefault = getTwilioPhoneNumber()

  // 2. If sender_type is 'company', use default
  if (!options.senderType || options.senderType === 'company') {
    return companyDefault
  }

  // 3. If specific user, get their number
  if (options.senderType === 'specific_user' && options.senderUserId) {
    const userNumber = await getUserPrimaryNumber(options.senderUserId, tenantId)
    return userNumber || companyDefault
  }

  // 4. If assigned_rep, look up contact's assigned rep
  if (options.senderType === 'assigned_rep' && options.contactId) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('assigned_to')
      .eq('id', options.contactId)
      .single()

    if (contact?.assigned_to) {
      const repNumber = await getUserPrimaryNumber(contact.assigned_to, tenantId)
      return repNumber || companyDefault
    }
  }

  // 5. If project_manager, look up project's PM
  if (options.senderType === 'project_manager' && options.projectId) {
    const { data: project } = await supabase
      .from('projects')
      .select('project_manager_id')
      .eq('id', options.projectId)
      .single()

    if (project?.project_manager_id) {
      const pmNumber = await getUserPrimaryNumber(project.project_manager_id, tenantId)
      return pmNumber || companyDefault
    }
  }

  // Fallback to company default
  return companyDefault
}

async function getUserPrimaryNumber(
  userId: string,
  tenantId: string
): Promise<string | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('user_phone_numbers')
    .select('phone_number')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('is_primary', true)
    .eq('is_active', true)
    .single()

  return data?.phone_number || null
}
```

---

## 6. Implementation Phases

### Phase 1: Database & Core Infrastructure (1-2 days)

**Tasks:**
1. Create `user_phone_numbers` migration
2. Add TypeScript types to `database.types.ts`
3. Create `lib/twilio/phone-numbers.ts` with:
   - `resolveSenderNumber()` function
   - `getUserPrimaryNumber()` function
   - `getTenantPhoneNumbers()` function

**Files to Create/Modify:**
- `supabase/migrations/XXXXXXXX_user_phone_numbers.sql`
- `lib/twilio/phone-numbers.ts` (new)
- `lib/types/database.types.ts` (regenerate)

### Phase 2: SMS Sending Integration (1 day)

**Tasks:**
1. Update `sendSMS()` to accept explicit `from` parameter
2. Update campaign `executeSendSms()` to use sender resolution
3. Update `SendSmsStepConfig` type with sender options
4. Add sender selection to manual SMS sending

**Files to Modify:**
- `lib/twilio/sms.ts`
- `lib/campaigns/execution-engine.ts`
- `lib/campaigns/types.ts`

### Phase 3: Admin UI - Number Management (2-3 days)

**Tasks:**
1. Create phone numbers admin page
2. List assigned numbers per user
3. Assign/unassign numbers to users
4. Show number status and capabilities

**Files to Create:**
- `app/[locale]/(dashboard)/admin/phone-numbers/page.tsx`
- `components/admin/phone-numbers/PhoneNumberList.tsx`
- `components/admin/phone-numbers/AssignNumberDialog.tsx`
- `app/api/admin/phone-numbers/route.ts`

### Phase 4: Campaign Step UI Enhancement (1-2 days)

**Tasks:**
1. Add sender selection to SMS step configuration
2. Dropdown: Company | Assigned Rep | Specific User | Project Manager
3. User picker when "Specific User" is selected
4. Preview which number will send

**Files to Modify:**
- `components/campaigns/steps/SmsStepConfig.tsx`
- Campaign step edit API

### Phase 5: Number Provisioning Automation (Optional, 2-3 days)

**Tasks:**
1. Search available numbers by area code
2. Purchase number via Twilio API
3. Auto-assign to user
4. Release number when user deactivated

**Files to Create:**
- `lib/twilio/provisioning.ts`
- `app/api/admin/phone-numbers/provision/route.ts`

---

## 7. Cost Analysis

### Per-Number Costs (Twilio)

| Item | Cost | Notes |
|------|------|-------|
| Local number (US) | ~$1.15/month | Recurring monthly |
| Toll-free number | ~$2.15/month | If needed |
| SMS outbound | $0.0079/segment | Per message |
| SMS inbound | $0.0079/segment | Per message |

### Example: 10-User Deployment

| Users | Numbers | Monthly Cost | Annual Cost |
|-------|---------|--------------|-------------|
| 10 | 10 | $11.50 | $138 |
| 25 | 25 | $28.75 | $345 |
| 50 | 50 | $57.50 | $690 |

**Verdict:** Cost is negligible (~$1/user/month) and well worth the personalization benefit for sales effectiveness.

---

## 8. Reply Handling Considerations

### Current State
Incoming SMS to the company number is handled via Twilio webhook. All replies go to the same inbox.

### With Per-User Numbers
1. **Webhook routing:** Twilio sends webhook for each number
2. **Lookup:** On incoming SMS, look up `to` number in `user_phone_numbers`
3. **Route:** Associate incoming message with the owning user
4. **Notification:** Notify user of new reply

**Implementation Note:** The existing webhook can be extended to route based on the `To` number in the request.

---

## 9. Compliance & Best Practices

### 10DLC Registration
- If using A2P (Application-to-Person) messaging, register campaign use case
- Numbers in the pool should be registered under same brand
- See: [Twilio 10DLC Registration](https://www.twilio.com/docs/messaging/compliance/10dlc)

### Opt-Out Handling
- Standard STOP/HELP keywords handled by Twilio
- Opt-outs should apply regardless of which number sent the message
- Maintain single opt-out list per contact, not per number

### Number Lifecycle
- When user is deactivated, their number should be unassigned (not released immediately)
- Consider 30-day hold before releasing to allow reply handling

---

## 10. Alternative: Twilio Conversations API

For more sophisticated use cases, consider [Twilio Conversations](https://www.twilio.com/docs/conversations):

**Benefits:**
- Built-in participant management
- Conversation threading
- Multi-channel (SMS + Chat + WhatsApp)
- Automatic sender consistency

**Drawbacks:**
- Higher complexity
- Different pricing model
- May be overkill for basic per-user SMS

**Recommendation:** Start with phone number pool approach. Migrate to Conversations if multi-channel or advanced threading is needed later.

---

## 11. Decision Checklist

Before implementation, confirm:

- [ ] Estimated user count needing dedicated numbers (start with?)
- [ ] Budget approval for additional number costs
- [ ] Area code preference for numbers (local to Tennessee?)
- [ ] Reply handling requirements (real-time notification?)
- [ ] Integration with existing conversation view
- [ ] Admin workflow for number assignment

---

## 12. Sources

- [Twilio Messaging Services](https://www.twilio.com/docs/messaging/services)
- [Managing a Messaging Service Sender Pool](https://help.twilio.com/articles/4402705042075-Managing-a-Messaging-Service-Sender-Pool)
- [Twilio Subaccounts Guide](https://www.twilio.com/en-us/blog/guide-twilio-subaccounts)
- [Twilio Subaccounts API](https://www.twilio.com/docs/iam/api/subaccounts)
- [Twilio Phone Number Pricing](https://help.twilio.com/articles/223182908-How-much-does-a-phone-number-cost-)
- [Twilio Best Practices for Phone Numbers](https://www.twilio.com/docs/phone-numbers/best-practices)
- [How Many Numbers in a Messaging Service](https://support.twilio.com/hc/en-us/articles/4402434663195-How-many-Twilio-numbers-or-senders-can-I-have-in-a-Messaging-Service)

---

## Appendix A: Sample Migration

```sql
-- Migration: YYYYMMDDHHMMSS_user_phone_numbers.sql

-- ============================================================================
-- Per-User Phone Numbers for Personalized SMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_phone_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  phone_number VARCHAR(20) NOT NULL,
  twilio_sid VARCHAR(50),
  friendly_name VARCHAR(100),

  capabilities JSONB DEFAULT '{"sms": true, "mms": true, "voice": false}'::jsonb,

  is_primary BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,

  provisioned_at TIMESTAMPTZ,
  provisioned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_phone_per_tenant UNIQUE(tenant_id, phone_number)
);

-- Indexes
CREATE INDEX idx_user_phone_numbers_tenant ON user_phone_numbers(tenant_id);
CREATE INDEX idx_user_phone_numbers_user ON user_phone_numbers(user_id);
CREATE INDEX idx_user_phone_numbers_active ON user_phone_numbers(tenant_id, is_active)
  WHERE is_active = true;

-- RLS
ALTER TABLE user_phone_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_users_can_view_phone_numbers"
  ON user_phone_numbers FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admins_can_manage_phone_numbers"
  ON user_phone_numbers FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Updated at trigger
CREATE TRIGGER trigger_update_user_phone_numbers_updated_at
  BEFORE UPDATE ON user_phone_numbers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Created user_phone_numbers table for per-user SMS sender support';
END $$;
```

---

## Appendix B: TypeScript Types

```typescript
// lib/types/phone-numbers.ts

export interface UserPhoneNumber {
  id: string
  tenant_id: string
  user_id: string
  phone_number: string
  twilio_sid: string | null
  friendly_name: string | null
  capabilities: {
    sms: boolean
    mms: boolean
    voice: boolean
  }
  is_primary: boolean
  is_active: boolean
  provisioned_at: string | null
  provisioned_by: string | null
  created_at: string
  updated_at: string
}

export type SenderType = 'company' | 'assigned_rep' | 'specific_user' | 'project_manager'

export interface SmsSenderConfig {
  sender_type: SenderType
  sender_user_id?: string  // Required when sender_type is 'specific_user'
}

// Extended SendSmsStepConfig
export interface SendSmsStepConfigWithSender extends SendSmsStepConfig {
  sender_type?: SenderType
  sender_user_id?: string
}
```
