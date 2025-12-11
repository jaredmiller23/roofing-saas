# Campaign Builder System

## Overview

The Campaign Builder is a **Proline-style marketing automation system** that enables roofing companies to create and manage multi-step drip campaigns, event-based triggers, and automated follow-up sequences. This feature replaces the need for external marketing automation tools by providing:

- **Multi-step drip campaigns** - Time-based email/SMS sequences
- **Event-based triggers** - Automatic enrollment based on stage changes or activities
- **Pre-built templates** - 6 roofing-specific campaign templates ready to use
- **Contact enrollment** - Manual or automatic enrollment with re-enrollment support
- **Analytics dashboard** - Track opens, clicks, replies, and revenue attribution
- **Execution engine** - Background processing of scheduled campaign steps

The system integrates with **Resend** for email delivery and **Twilio** for SMS, with graceful degradation when providers are not configured.

---

## User Stories

### Marketing Admin
- As a marketing admin, I want to create automated email sequences so that leads receive consistent follow-up
- As a marketing admin, I want to use pre-built templates so that I can quickly launch proven campaigns
- As a marketing admin, I want to track email open rates and click rates so that I can optimize my campaigns
- As a marketing admin, I want to set campaign goals so that I can measure success against targets

### Sales Manager
- As a sales manager, I want campaigns to automatically enroll leads when they reach certain stages so that no lead falls through the cracks
- As a sales manager, I want to see which campaigns drive the most revenue so that I can allocate marketing resources effectively
- As a sales manager, I want to pause campaigns quickly so that I can respond to changing business needs

### Office Staff
- As office staff, I want to manually enroll contacts into campaigns so that I can add specific leads to sequences
- As office staff, I want to view enrollment status so that I can see where contacts are in their journey
- As office staff, I want campaigns to respect business hours so that contacts aren't contacted at inappropriate times

---

## Features

### 1. Campaign Management

**Description:** Create, edit, activate, pause, and archive marketing campaigns with configurable settings.

**Campaign Types (5):**
| Type | Description |
|------|-------------|
| `drip` | Time-based email/SMS sequences |
| `event` | Triggered by specific events |
| `reengagement` | Re-engage inactive contacts |
| `retention` | Keep active customers engaged |
| `nurture` | Long-term relationship building |

**Campaign Statuses (4):**
| Status | Description |
|--------|-------------|
| `draft` | Being built, not active |
| `active` | Running and enrolling contacts |
| `paused` | Temporarily stopped |
| `archived` | Permanently disabled |

**Key Settings:**
- `allow_re_enrollment` - Allow contacts to re-enter after exiting
- `re_enrollment_delay_days` - Minimum days before re-enrollment
- `respect_business_hours` - Only execute during business hours
- `business_hours` - JSON config for start/end times and days
- `max_enrollments` - Optional enrollment cap

**Implementation:**
- File: `/app/api/campaigns/route.ts` (209 lines)
- File: `/app/api/campaigns/[id]/route.ts` (227 lines)
- Soft delete via `is_deleted` flag

### 2. Campaign Steps (Multi-Step Sequences)

**Description:** Build sequential workflows with 10 different action types.

**Step Types (10):**
| Type | Description |
|------|-------------|
| `send_email` | Send email with template or custom content |
| `send_sms` | Send SMS message via Twilio |
| `create_task` | Create a task for assigned user |
| `wait` | Delay before next step |
| `update_field` | Update contact or project field |
| `manage_tags` | Add or remove contact tags |
| `notify` | Send in-app notification to users |
| `webhook` | Call external HTTP endpoint |
| `conditional` | Branch based on conditions |
| `exit_campaign` | Exit enrollment with reason |

**Timing Configuration:**
- `delay_value` - Numeric delay amount (0+)
- `delay_unit` - `hours`, `days`, or `weeks`

**Conditional Branching:**
- `conditions` - JSON rules with operators (equals, greater_than, contains, etc.)
- `true_path_step_id` - Next step if condition matches
- `false_path_step_id` - Next step if condition fails

**Implementation:**
- File: `/app/api/campaigns/[id]/steps/route.ts` (195 lines)
- File: `/app/api/campaigns/[id]/steps/[stepId]/route.ts` (192 lines)
- Steps ordered by `step_order` field

### 3. Campaign Triggers (Automatic Enrollment)

**Description:** Define conditions that automatically enroll contacts into campaigns.

**Trigger Types (4):**
| Type | Description | Config Example |
|------|-------------|----------------|
| `stage_change` | Contact/project stage changes | `{entity_type: "contact", to_stage: "new"}` |
| `time_based` | Scheduled relative to date field | `{relative_to: "created_at", delay_value: 30, delay_unit: "days"}` |
| `event` | Activity or custom event occurs | `{event_name: "activity_created", event_filters: {...}}` |
| `manual` | Manually enrolled | `{manual: true}` |

**Enrollment Conditions:**
- `enrollment_conditions` - Must be met to enroll
- `exclusion_conditions` - Don't enroll if these are true
- `priority` - Higher priority triggers take precedence

### 4. Campaign Templates

**Description:** 6 pre-built, roofing-specific campaign templates ready for immediate use.

**Available Templates:**

| ID | Name | Category | Steps | Duration |
|----|------|----------|-------|----------|
| `new-lead-welcome` | New Lead Welcome Series | lead_nurture | 6 | 7 days |
| `estimate-follow-up` | Estimate Follow-up Sequence | follow_up | 6 | 10 days |
| `post-inspection` | Post-Inspection Follow-up | follow_up | 3 | 2 days |
| `winback-inactive` | Win-back Inactive Leads | reengagement | 3 | 14 days |
| `review-request` | Customer Review Request | review | 5 | 10 days |
| `storm-damage` | Storm Damage Outreach | follow_up | 6 | 7 days |

**Template Variables:**
Templates support dynamic variable replacement using `{{variable}}` syntax:
- `{{first_name}}`, `{{last_name}}`, `{{contact_name}}`
- `{{company_name}}`, `{{user_name}}`, `{{user_phone}}`
- `{{estimate_amount}}`, `{{monthly_payment}}`
- `{{review_link}}`, `{{calendar_link}}`, `{{booking_link}}`

**Implementation:**
- File: `/lib/campaigns/templates.ts` (737 lines)
- Helper functions: `getAllTemplates()`, `getTemplateById()`, `getTemplatesByCategory()`, `replaceTemplateVariables()`

### 5. Contact Enrollment

**Description:** Manage which contacts are enrolled in which campaigns.

**Enrollment Sources (4):**
| Source | Description |
|--------|-------------|
| `automatic_trigger` | Auto-enrolled by trigger |
| `manual_admin` | Manually enrolled by user |
| `api` | Enrolled via API call |
| `bulk_import` | Bulk import operation |

**Enrollment Statuses (5):**
| Status | Description |
|--------|-------------|
| `active` | Currently in campaign |
| `completed` | Finished all steps |
| `exited` | Exited early |
| `paused` | Temporarily paused |
| `failed` | Error occurred |

**Exit Reasons:**
- `completed` - Finished all steps
- `goal_achieved` - Campaign goal was met
- `unsubscribed` - Contact unsubscribed
- `stage_changed` - Contact stage changed
- `manual_remove` - Manually removed
- `error` - Execution error

**Tracked Metrics per Enrollment:**
- `steps_completed`, `emails_sent`, `emails_opened`, `emails_clicked`
- `sms_sent`, `sms_replied`, `tasks_created`
- `goal_achieved`, `goal_achieved_at`, `revenue_attributed`

**Implementation:**
- File: `/app/api/campaigns/[id]/enrollments/route.ts` (267 lines)
- Unique constraint: One active enrollment per contact per campaign

### 6. Execution Engine

**Description:** Background processor that executes scheduled campaign steps.

**Execution Flow:**
1. `processPendingExecutions()` queries pending executions that are due
2. For each execution, calls `executeStep(executionId)`
3. Updates execution status: `pending` → `running` → `completed/failed`
4. Updates enrollment metrics
5. Schedules next step if campaign continues

**Step Executors:**
| Step Type | Handler | Integration |
|-----------|---------|-------------|
| `send_email` | `executeSendEmail()` | Resend API |
| `send_sms` | `executeSendSms()` | Twilio API |
| `create_task` | `executeCreateTask()` | Activities table |
| `wait` | `executeWait()` | Scheduling logic |
| `update_field` | `executeUpdateField()` | Contacts/Projects |
| `manage_tags` | `executeManageTags()` | Contact tags array |
| `notify` | `executeNotify()` | Notification system (TODO) |
| `webhook` | `executeWebhook()` | External HTTP calls |
| `conditional` | `executeConditional()` | Condition evaluation |
| `exit_campaign` | `executeExitCampaign()` | Enrollment update |

**Graceful Degradation:**
- If Resend not configured: Logs warning, returns skipped result
- If Twilio not configured: Logs warning, returns skipped result

**Implementation:**
- File: `/lib/campaigns/execution-engine.ts` (699 lines)
- Integrations: `@/lib/resend/client`, `@/lib/twilio/sms`

### 7. Analytics Dashboard

**Description:** Real-time campaign performance metrics and enrollment tracking.

**Overview Metrics:**
- Total Enrolled
- Completion Rate
- Goal Achievement Rate
- Revenue Attributed

**Email Performance:**
- Emails Sent
- Emails Opened
- Open Rate (calculated)
- Clicked Links

**SMS Performance:**
- SMS Sent
- Replies
- Reply Rate (calculated)

**Enrollment Breakdown:**
- By status: active, completed, exited, paused, failed
- Recent enrollments list with step progress

**Implementation:**
- File: `/app/(dashboard)/campaigns/[id]/analytics/page.tsx` (301 lines)

---

## Technical Implementation

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Campaign Builder UI                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Campaigns│ │  New     │ │ Builder  │ │Analytics │           │
│  │   List   │ │ Campaign │ │  Page    │ │Dashboard │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
└───────┼────────────┼────────────┼────────────┼──────────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer (/api/campaigns/)                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │GET/POST     │  │GET/PATCH/   │  │/steps, /enrollments     │ │
│  │/campaigns   │  │DELETE /:id  │  │/analytics               │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└───────────────────────────────────────────────────────────────┬─┘
                                                                │
                               ▼                                │
┌───────────────────────────────────────────────────────────────┘
│                   Execution Engine
│  ┌────────────────────────────────────────────────────────┐
│  │ processPendingExecutions() → executeStep() → handlers │
│  └────────────────────────────────────────────────────────┘
│         │                    │                    │
│         ▼                    ▼                    ▼
│    ┌─────────┐         ┌─────────┐         ┌──────────┐
│    │ Resend  │         │ Twilio  │         │ Database │
│    │ (Email) │         │  (SMS)  │         │ (Tasks)  │
│    └─────────┘         └─────────┘         └──────────┘
└─────────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `/lib/campaigns/types.ts` | TypeScript types for entire campaign system | 767 |
| `/lib/campaigns/templates.ts` | Pre-built campaign templates | 737 |
| `/lib/campaigns/execution-engine.ts` | Step execution processor | 699 |
| `/app/api/campaigns/route.ts` | GET/POST campaigns | 209 |
| `/app/api/campaigns/[id]/route.ts` | GET/PATCH/DELETE campaign | 227 |
| `/app/api/campaigns/[id]/steps/route.ts` | GET/POST steps | 195 |
| `/app/api/campaigns/[id]/steps/[stepId]/route.ts` | PATCH/DELETE step | 192 |
| `/app/api/campaigns/[id]/enrollments/route.ts` | GET/POST enrollments | 267 |
| `/app/(dashboard)/campaigns/page.tsx` | Campaign list page | 346 |
| `/app/(dashboard)/campaigns/new/page.tsx` | Create campaign page | 231 |
| `/app/(dashboard)/campaigns/[id]/builder/page.tsx` | Campaign builder | 437 |
| `/app/(dashboard)/campaigns/[id]/analytics/page.tsx` | Analytics dashboard | 301 |
| `/app/(dashboard)/campaigns/templates/page.tsx` | Template gallery | 388 |
| `/supabase/migrations/20251119000100_campaigns_system.sql` | Database schema | 495 |

### Data Flow

**Campaign Creation:**
```
User → /campaigns/new → POST /api/campaigns → campaigns table → Redirect to builder
```

**Template Usage:**
```
Templates Page → Select Template → Customize → POST /api/campaigns
                                             → POST /api/campaigns/:id/steps (for each step)
                                             → Redirect to builder
```

**Contact Enrollment:**
```
POST /api/campaigns/:id/enrollments → Validate campaign active
                                    → Check enrollment limits
                                    → Check existing enrollment
                                    → Get first step
                                    → Create campaign_enrollments record
```

**Step Execution (Background):**
```
Cron Job → processPendingExecutions()
         → Query campaign_step_executions WHERE status='pending' AND scheduled_at <= NOW()
         → For each: executeStep(id)
         → Execute handler (email/sms/task/etc.)
         → Update execution status
         → Update enrollment metrics
         → Schedule next step
```

---

## API Endpoints

### GET /api/campaigns
**Purpose:** List all campaigns for current tenant

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by status (draft, active, paused, archived) |
| `campaign_type` | string | Filter by type (drip, event, reengagement, retention, nurture) |
| `include_deleted` | boolean | Include soft-deleted campaigns (default: false) |

**Response:**
```json
{
  "campaigns": [Campaign],
  "total": number
}
```

### POST /api/campaigns
**Purpose:** Create new campaign (admin only)

**Request Body:**
```json
{
  "name": "string (required)",
  "description": "string",
  "campaign_type": "drip|event|reengagement|retention|nurture (required)",
  "goal_type": "appointments|deals|reviews|engagement",
  "goal_target": number,
  "allow_re_enrollment": boolean,
  "re_enrollment_delay_days": number,
  "respect_business_hours": boolean,
  "business_hours": { "start": number, "end": number, "days": string[] },
  "enrollment_type": "automatic|manual",
  "max_enrollments": number
}
```

**Response:** `201 Created`
```json
{
  "campaign": Campaign
}
```

### GET /api/campaigns/:id
**Purpose:** Get single campaign details

**Response:**
```json
{
  "campaign": Campaign
}
```

### PATCH /api/campaigns/:id
**Purpose:** Update campaign (admin only)

### DELETE /api/campaigns/:id
**Purpose:** Soft delete campaign (admin only)

### GET /api/campaigns/:id/steps
**Purpose:** Get all steps for campaign (ordered by step_order)

### POST /api/campaigns/:id/steps
**Purpose:** Create new step (admin only)

### PATCH /api/campaigns/:id/steps/:stepId
**Purpose:** Update step (admin only)

### DELETE /api/campaigns/:id/steps/:stepId
**Purpose:** Delete step (admin only)

### GET /api/campaigns/:id/enrollments
**Purpose:** List enrollments with pagination

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by enrollment status |
| `contact_id` | UUID | Filter by specific contact |
| `limit` | number | Page size (default: 50) |
| `offset` | number | Pagination offset (default: 0) |

### POST /api/campaigns/:id/enrollments
**Purpose:** Enroll contact into campaign

**Validation:**
- Campaign must be active
- Max enrollments not reached
- Contact not already active in campaign
- Re-enrollment rules respected

---

## Data Models

### campaigns
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Tenant reference |
| `name` | VARCHAR(255) | Campaign name |
| `description` | TEXT | Campaign description |
| `campaign_type` | VARCHAR(50) | Type enum |
| `status` | VARCHAR(20) | Status enum (default: draft) |
| `goal_type` | VARCHAR(50) | Goal metric type |
| `goal_target` | INTEGER | Numeric goal target |
| `allow_re_enrollment` | BOOLEAN | Re-enrollment flag (default: false) |
| `re_enrollment_delay_days` | INTEGER | Delay for re-enrollment |
| `respect_business_hours` | BOOLEAN | Business hours flag (default: true) |
| `business_hours` | JSONB | Business hours config |
| `enrollment_type` | VARCHAR(20) | automatic or manual |
| `max_enrollments` | INTEGER | Optional cap |
| `total_enrolled` | INTEGER | Cached count (default: 0) |
| `total_completed` | INTEGER | Cached count (default: 0) |
| `total_revenue` | DECIMAL(12,2) | Cached revenue (default: 0) |
| `created_by` | UUID | Creator reference |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update |
| `is_deleted` | BOOLEAN | Soft delete flag |

### campaign_steps
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `campaign_id` | UUID | Campaign reference |
| `parent_step_id` | UUID | For branching (nullable) |
| `step_order` | INTEGER | Execution sequence |
| `step_type` | VARCHAR(50) | Step type enum |
| `step_config` | JSONB | Type-specific configuration |
| `delay_value` | INTEGER | Delay amount (default: 0) |
| `delay_unit` | VARCHAR(20) | hours, days, weeks |
| `conditions` | JSONB | For conditional steps |
| `true_path_step_id` | UUID | Branch if true |
| `false_path_step_id` | UUID | Branch if false |
| `total_executed` | INTEGER | Cached count |
| `total_succeeded` | INTEGER | Cached count |
| `total_failed` | INTEGER | Cached count |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update |

### campaign_enrollments
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `campaign_id` | UUID | Campaign reference |
| `tenant_id` | UUID | Tenant reference |
| `contact_id` | UUID | Contact reference |
| `enrollment_source` | VARCHAR(50) | Source enum |
| `enrolled_by` | UUID | User who enrolled |
| `enrolled_at` | TIMESTAMPTZ | Enrollment time |
| `status` | VARCHAR(20) | Status enum |
| `current_step_id` | UUID | Current step |
| `current_step_order` | INTEGER | Current position |
| `exit_reason` | VARCHAR(50) | Why exited |
| `exited_at` | TIMESTAMPTZ | Exit timestamp |
| `steps_completed` | INTEGER | Progress count |
| `emails_sent` | INTEGER | Email count |
| `emails_opened` | INTEGER | Open count |
| `emails_clicked` | INTEGER | Click count |
| `sms_sent` | INTEGER | SMS count |
| `sms_replied` | INTEGER | Reply count |
| `tasks_created` | INTEGER | Task count |
| `goal_achieved` | BOOLEAN | Goal flag |
| `goal_achieved_at` | TIMESTAMPTZ | Goal timestamp |
| `revenue_attributed` | DECIMAL(12,2) | Revenue |
| `last_step_executed_at` | TIMESTAMPTZ | Last execution |
| `next_step_scheduled_at` | TIMESTAMPTZ | Next scheduled |
| `completed_at` | TIMESTAMPTZ | Completion time |

### campaign_step_executions
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `enrollment_id` | UUID | Enrollment reference |
| `step_id` | UUID | Step reference |
| `status` | VARCHAR(20) | pending, running, completed, failed, skipped |
| `scheduled_at` | TIMESTAMPTZ | When to execute |
| `started_at` | TIMESTAMPTZ | Start time |
| `completed_at` | TIMESTAMPTZ | End time |
| `result_data` | JSONB | Execution result |
| `error_message` | TEXT | Error details |
| `opened_at` | TIMESTAMPTZ | Email opened |
| `clicked_at` | TIMESTAMPTZ | Link clicked |
| `replied_at` | TIMESTAMPTZ | SMS replied |
| `created_at` | TIMESTAMPTZ | Record creation |

### Database Indexes
```sql
-- campaigns
idx_campaigns_tenant ON campaigns(tenant_id) WHERE NOT is_deleted
idx_campaigns_status ON campaigns(tenant_id, status) WHERE status = 'active' AND NOT is_deleted
idx_campaigns_type ON campaigns(tenant_id, campaign_type) WHERE NOT is_deleted

-- campaign_steps
idx_campaign_steps_campaign ON campaign_steps(campaign_id, step_order)
idx_campaign_steps_parent ON campaign_steps(parent_step_id)
idx_campaign_steps_type ON campaign_steps(step_type)

-- campaign_enrollments
idx_campaign_enrollments_campaign ON campaign_enrollments(campaign_id, status)
idx_campaign_enrollments_contact ON campaign_enrollments(contact_id)
idx_campaign_enrollments_scheduled ON campaign_enrollments(next_step_scheduled_at) WHERE status = 'active'
idx_campaign_enrollments_tenant ON campaign_enrollments(tenant_id, status)

-- campaign_step_executions
idx_campaign_step_executions_enrollment ON campaign_step_executions(enrollment_id)
idx_campaign_step_executions_step ON campaign_step_executions(step_id)
idx_campaign_step_executions_scheduled ON campaign_step_executions(scheduled_at) WHERE status = 'pending'
idx_campaign_step_executions_status ON campaign_step_executions(status, scheduled_at) WHERE status IN ('pending', 'running')
```

---

## Integration Points

### Resend (Email)
- File: `/lib/resend/client.ts`
- Check: `isResendConfigured()` before sending
- Function: `resendClient.emails.send()`
- Returns: `{ email_id, sent_at, provider: 'resend' }`

### Twilio (SMS)
- File: `/lib/twilio/sms.ts`
- Check: `isTwilioConfigured()` before sending
- Function: `sendSMS({ to, body })`
- Returns: `{ sms_id: result.sid, sent_at, provider: 'twilio' }`

### Activities (Tasks)
- Campaigns create tasks in the `activities` table
- `activity_type: 'task'`
- `activity_subtype`: from step config

### Contacts
- Enrollments reference `contacts` table
- Tags managed via contact's `tags` array field
- Field updates via direct database updates

### Projects
- Stage change triggers can reference projects
- Field updates can target project records

---

## Configuration

### Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | For email | Resend API key |
| `RESEND_FROM_EMAIL` | For email | Default sender address |
| `TWILIO_ACCOUNT_SID` | For SMS | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | For SMS | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | For SMS | Twilio phone number |

### Business Hours Config
```json
{
  "start": 9,
  "end": 17,
  "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
  "timezone": "America/New_York"
}
```

---

## Security

### Row-Level Security (RLS)
All campaign tables have RLS enabled:

**Campaigns:** Users view own tenant; admins manage
**Triggers/Steps:** Inherit from campaign
**Enrollments:** Users view/manage own tenant
**Executions:** Inherit from enrollment
**Analytics:** Users view own tenant

### Admin-Only Operations
- Campaign create/update/delete
- Step create/update/delete
- Trigger create/update/delete

### Contact Enrollment Rules
- Campaign must be active
- Contact must exist in tenant
- Max enrollments respected
- Re-enrollment rules enforced
- Unique constraint prevents duplicate active enrollments

---

## Testing

### E2E Tests
No dedicated campaign E2E tests found in `/e2e/` directory. Recommended test scenarios:

1. **Campaign CRUD**
   - Create campaign with all fields
   - Update campaign settings
   - Soft delete campaign
   - Filter by status/type

2. **Step Builder**
   - Add steps of each type
   - Reorder steps
   - Delete steps
   - Configure step delays

3. **Template Usage**
   - Select template
   - Customize before create
   - Verify steps created

4. **Enrollment**
   - Manual enrollment
   - Duplicate enrollment prevention
   - Max enrollment enforcement

---

## Performance Notes

### Cached Metrics
Campaign performance counters are cached on the `campaigns` table:
- `total_enrolled`, `total_completed`, `total_revenue`
- Updated via database triggers when enrollments change

### Execution Scheduling
- Step executions use `scheduled_at` timestamp
- Index on `(scheduled_at) WHERE status = 'pending'` for efficient polling
- Background job queries pending executions periodically

### Pagination
- Enrollment list supports `limit`/`offset` pagination
- Default page size: 50 enrollments

---

## Future Enhancements

Based on code TODOs and system design:

1. **Condition Evaluation** - Full implementation of conditional branching logic
2. **Notification System** - In-app notifications for `notify` step type
3. **Campaign Triggers API** - Full CRUD for automatic enrollment triggers
4. **A/B Testing** - Split testing for email/SMS content
5. **Advanced Analytics** - Time-series charts, funnel visualization
6. **Template Versioning** - Save custom templates for reuse
7. **Webhook Retry Logic** - Automatic retry for failed webhooks
8. **Enrollment Bulk Actions** - Bulk pause/resume/exit enrollments

---

## File References

### API Routes
- `/Users/ccai/roofing saas/roofing-saas/app/api/campaigns/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/campaigns/[id]/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/campaigns/[id]/steps/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/campaigns/[id]/steps/[stepId]/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/campaigns/[id]/enrollments/route.ts`

### Library Files
- `/Users/ccai/roofing saas/roofing-saas/lib/campaigns/types.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/campaigns/templates.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/campaigns/execution-engine.ts`

### UI Pages
- `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/campaigns/page.tsx`
- `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/campaigns/new/page.tsx`
- `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/campaigns/[id]/builder/page.tsx`
- `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/campaigns/[id]/analytics/page.tsx`
- `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/campaigns/templates/page.tsx`

### Database
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251119000100_campaigns_system.sql`

---

## Validation Record

### Files Examined (18 total)
1. `/Users/ccai/roofing saas/roofing-saas/app/api/campaigns/route.ts` - GET/POST handlers verified (209 lines)
2. `/Users/ccai/roofing saas/roofing-saas/app/api/campaigns/[id]/route.ts` - GET/PATCH/DELETE verified (227 lines)
3. `/Users/ccai/roofing saas/roofing-saas/app/api/campaigns/[id]/steps/route.ts` - Step CRUD verified (195 lines)
4. `/Users/ccai/roofing saas/roofing-saas/app/api/campaigns/[id]/steps/[stepId]/route.ts` - Step update/delete verified (192 lines)
5. `/Users/ccai/roofing saas/roofing-saas/app/api/campaigns/[id]/enrollments/route.ts` - Enrollment management verified (267 lines)
6. `/Users/ccai/roofing saas/roofing-saas/lib/campaigns/types.ts` - Complete type system verified (767 lines)
7. `/Users/ccai/roofing saas/roofing-saas/lib/campaigns/templates.ts` - 6 templates verified (737 lines)
8. `/Users/ccai/roofing saas/roofing-saas/lib/campaigns/execution-engine.ts` - Execution handlers verified (699 lines)
9. `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/campaigns/page.tsx` - Campaign list UI verified (346 lines)
10. `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/campaigns/new/page.tsx` - Create form verified (231 lines)
11. `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/campaigns/[id]/builder/page.tsx` - Builder UI verified (437 lines)
12. `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/campaigns/[id]/analytics/page.tsx` - Analytics UI verified (301 lines)
13. `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/campaigns/templates/page.tsx` - Template gallery verified (388 lines)
14. `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251119000100_campaigns_system.sql` - Database schema verified (495 lines)

### Archon RAG Queries
- Query: "email marketing campaigns automation drip sequences" - Found SendGrid/Resend email documentation

### Verification Steps
1. Verified all 5 campaign types exist in types.ts and database CHECK constraint
2. Verified all 10 step types exist in types.ts, API validation, and database CHECK constraint
3. Verified all 6 campaign templates with step configurations in templates.ts
4. Verified execution engine handlers for each step type
5. Verified RLS policies for multi-tenant isolation in SQL migration
6. Verified database triggers for performance metric updates
7. Verified unique constraint on campaign_enrollments(campaign_id, contact_id)
8. Verified Resend and Twilio integration in execution-engine.ts

### Validated By
PRD Documentation Agent - Session 10
Date: 2025-12-11T00:46:00Z
