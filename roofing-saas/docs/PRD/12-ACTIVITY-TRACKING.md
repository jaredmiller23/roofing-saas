# Activity Tracking System

## Overview

The Activity Tracking System is a centralized logging and analytics mechanism that captures all user interactions and communications within the Roofing SAAS platform. Activities provide a complete audit trail of customer interactions, support dashboard analytics, gamification scoring, and enable workflow automation triggers. The system logs calls, emails, SMS messages, door knocks, notes, meetings, and tasks across contacts and projects.

## User Stories

### Sales Representatives
- As a sales rep, I want all my customer interactions logged automatically so that I have a complete history when following up
- As a sales rep, I want to see my door knock count on the dashboard so I can track my daily activity
- As a sales rep, I want my calls and emails to be automatically logged so I don't have to manually enter data

### Office Staff
- As an office staff member, I want to see all activity history for a contact so I can quickly understand the relationship
- As an office staff member, I want to view activity trends on the dashboard so I can monitor team performance
- As an office staff member, I want activities linked to projects so I can track project-related communications

### Project Managers
- As a PM, I want to see all activities related to a project so I can understand the full context
- As a PM, I want to add notes that link to both contacts and projects for comprehensive record-keeping

### Business Owners
- As a business owner, I want to see activity metrics (calls, emails, knocks) over time to measure team productivity
- As a business owner, I want activity data to drive leaderboards and gamification for sales motivation

## Features

### 1. Activity Types

The system supports multiple activity types for comprehensive tracking:

**Implementation:**
- File: `/lib/types/api.ts` (lines 211-228)
- Activity interface with type enum

| Activity Type | Description | Auto-Logged | Source |
|--------------|-------------|-------------|--------|
| `call` | Phone calls (inbound/outbound) | Yes | Twilio integration |
| `email` | Email communications | Yes | Resend integration |
| `sms` | SMS messages | Yes | Twilio integration |
| `door_knock` | Door knock activities | Yes | Knock logger API |
| `note` | Manual notes | Manual | User input |
| `meeting` | Scheduled meetings | Manual | Calendar/User input |
| `task` | Tasks created by automation | Yes | Campaign execution |

### 2. Automatic Activity Logging

Activities are automatically logged when communication actions occur:

**Email Logging:**
- File: `/app/api/email/send/route.ts` (lines 155-176)
- Logs outbound emails with Resend email_id
- Links to contact if email matches

**SMS Logging:**
- File: `/app/api/sms/send/route.ts` (lines 92-105)
- Logs outbound SMS with Twilio SID
- File: `/app/api/sms/webhook/route.ts` (lines 58-70)
- Logs inbound SMS from Twilio webhook

**Call Logging:**
- File: `/app/api/voice/call/route.ts` (lines 77-91)
- Logs outbound calls with call_sid
- File: `/app/api/voice/webhook/route.ts` (lines 96-108)
- Logs inbound calls via Twilio webhook
- Updates call metadata (duration, status, recording)

**Door Knock Logging:**
- File: `/app/api/knocks/route.ts` (lines 87-102)
- Creates activity record alongside knock record
- Links to gamification system

### 3. Dashboard Activity Feed

Real-time activity feed on the dashboard showing recent team activities:

**Implementation:**
- Component: `/components/dashboard/ActivityFeed.tsx` (225 lines)
- API: `/app/api/dashboard/activity/route.ts` (169 lines)

**Features:**
- Shows last 7 days of activities
- Displays activity type with appropriate icon
- Color-coded by type (green for won, blue for new project, etc.)
- Links to related contact/project
- Relative timestamp formatting

**Activity Types Displayed:**
- `project_won` - Deal closed successfully
- `project_lost` - Deal lost
- `project_created` - New project added
- `contact_added` - New contact created
- `status_change` - Pipeline stage changes

### 4. Dashboard Metrics

Comprehensive activity metrics for business intelligence:

**Implementation:**
- API: `/app/api/dashboard/metrics/route.ts` (297 lines)
- Component: `/components/dashboard/DashboardMetrics.tsx` (256 lines)

**Activity Metrics:**
- Doors knocked per day (30-day average)
- Doors knocked last 7 days
- Activity trend chart (7 days)
  - Door knocks by day
  - Calls by day
  - Emails by day

**Scope Options:**
- `company` - All tenant activities (default)
- `user` - Current user's activities only

### 5. Activity Analytics

Deep analytics for communication patterns:

**Implementation:**
- File: `/lib/twilio/analytics.ts`

**Functions:**
- `getCallAnalytics()` - Call volume, answer rates, duration metrics
- `getSmsAnalytics()` - SMS sent/received, response rates
- `getEmailAnalytics()` - Email delivery, open rates
- `getCallVolumeByDay()` - Daily call volume trends

### 6. Gamification Integration

Activities drive the gamification/leaderboard system:

**Implementation:**
- File: `/app/api/gamification/leaderboard/route.ts` (lines 48-53)
- Counts door_knock activities by user for leaderboards

**Points System:**
- Door knocks award gamification points
- Activity counts feed into weekly/monthly rankings

### 7. Campaign Task Creation

Campaigns can automatically create activity records:

**Implementation:**
- File: `/lib/campaigns/execution-engine.ts` (lines 406-443)
- `executeCreateTask()` function

**Task Activity Fields:**
- `activity_type`: 'task'
- `activity_subtype`: Configured task type
- `subject`: Task title
- `description`: Task description
- `priority`: Task priority
- `assigned_to`: Assignee
- `due_date`: Calculated due date

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Activity Sources                              │
├─────────────┬─────────────┬─────────────┬─────────────┬────────────┤
│   Twilio    │   Resend    │    Knock    │  Campaign   │   Manual   │
│   (Voice)   │   (Email)   │   Logger    │   Engine    │   Input    │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴──────┬─────┘
       │             │             │             │             │
       ▼             ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    API Route Handlers                                │
│  /api/voice/call   /api/email/send   /api/knocks   /api/campaigns   │
│  /api/voice/webhook /api/sms/send    /api/pins                      │
│  /api/sms/webhook                                                    │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Activities Table                                 │
│  - Multi-tenant isolation (tenant_id)                               │
│  - Soft delete support (is_deleted)                                 │
│  - Contact/Project linking                                          │
│  - Metadata JSONB for flexible data                                 │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
       ┌──────────────────────┼──────────────────────┐
       ▼                      ▼                      ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Dashboard     │  │  Gamification   │  │    Analytics    │
│   Activity      │  │   Leaderboard   │  │    Reports      │
│   Feed          │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| `/lib/types/api.ts` | Activity TypeScript interface |
| `/app/api/dashboard/activity/route.ts` | Activity feed API endpoint |
| `/app/api/dashboard/metrics/route.ts` | Activity metrics aggregation |
| `/components/dashboard/ActivityFeed.tsx` | Activity feed UI component |
| `/components/dashboard/DashboardMetrics.tsx` | Metrics display component |
| `/app/api/email/send/route.ts` | Email activity logging |
| `/app/api/sms/send/route.ts` | SMS activity logging (outbound) |
| `/app/api/sms/webhook/route.ts` | SMS activity logging (inbound) |
| `/app/api/voice/call/route.ts` | Call activity logging (outbound) |
| `/app/api/voice/webhook/route.ts` | Call activity updates (status, duration) |
| `/app/api/voice/recording/route.ts` | Recording metadata updates |
| `/app/api/knocks/route.ts` | Door knock activity logging |
| `/app/api/pins/route.ts` | Pin/knock activity logging |
| `/lib/twilio/analytics.ts` | Activity analytics functions |
| `/lib/campaigns/execution-engine.ts` | Campaign task creation |
| `/lib/migrations/proline-field-mappings.ts` | Activity type mapping for imports |
| `/scripts/archive/seed-demo-activities.ts` | Demo activity seeding script |

## Data Model

### Activity Interface

```typescript
interface Activity {
  id: string
  tenant_id: string
  contact_id?: string
  project_id?: string
  user_id: string
  created_at: string
  type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'sms' | 'door_knock'
  subject: string
  description?: string
  duration_minutes?: number
  completed: boolean
  due_date?: string
  metadata?: Record<string, unknown>
}
```

### Database Columns (inferred from usage)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Tenant reference (RLS) |
| `contact_id` | UUID | Optional contact reference |
| `project_id` | UUID | Optional project reference |
| `user_id` / `created_by` | UUID | User who created activity |
| `type` | TEXT | Activity type enum |
| `activity_type` | TEXT | Alternative type column |
| `activity_subtype` | TEXT | Sub-classification |
| `direction` | TEXT | 'inbound' or 'outbound' |
| `subject` | TEXT | Activity subject/title |
| `content` | TEXT | Activity body content |
| `description` | TEXT | Detailed description |
| `notes` | TEXT | Additional notes |
| `metadata` | JSONB | Flexible metadata |
| `outcome_details` | JSONB | Outcome information |
| `priority` | TEXT | Activity priority |
| `assigned_to` | UUID | Assignee reference |
| `due_date` | TIMESTAMPTZ | Due date for tasks |
| `is_deleted` | BOOLEAN | Soft delete flag |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `performed_by` | UUID | Actual performer (impersonation) |
| `on_behalf_of` | UUID | On behalf of user |
| `is_impersonated_action` | BOOLEAN | Impersonation flag |

### Dashboard Activity Item

```typescript
interface ActivityItem {
  id: string
  type: 'project_won' | 'project_lost' | 'project_created' | 'contact_added' | 'status_change'
  title: string
  description: string
  timestamp: string
  metadata?: {
    user?: string
    value?: number
    project_name?: string
    contact_name?: string
    old_status?: string
    new_status?: string
    project_id?: string
    contact_id?: string
  }
}
```

## Database Indexes

From `/supabase/migrations/20251004_performance_indexes.sql`:

| Index | Columns | Purpose |
|-------|---------|---------|
| `idx_activities_tenant_created` | `tenant_id, created_at DESC` | Dashboard queries |
| `idx_activities_contact_id` | `contact_id, created_at DESC` | Contact history |
| `idx_activities_project_id` | `project_id, created_at DESC` | Project activities |
| `idx_activities_type` | `activity_type, created_at DESC` | Type filtering |
| `idx_activities_recent` | `tenant_id, activity_type, created_at DESC` | Recent activities |

## RLS Policies

From `/supabase/migrations/archive/20251001_comprehensive_rls_policies.sql`:

| Policy | Operation | Rule |
|--------|-----------|------|
| "Users can view activities in their tenant" | SELECT | `tenant_id = get_user_tenant_id()` |
| "Users can insert activities in their tenant" | INSERT | `tenant_id = get_user_tenant_id()` |
| "Users can update activities in their tenant" | UPDATE | `tenant_id = get_user_tenant_id()` |
| "Users can delete activities in their tenant" | DELETE | `tenant_id = get_user_tenant_id()` |

## Integration Points

### Communication Integrations
- **Twilio**: Calls and SMS logged automatically with SID, status, duration, recordings
- **Resend**: Emails logged with email_id, delivery status via webhooks

### CRM Entities
- **Contacts**: Activities link to contacts for history tracking
- **Projects**: Activities link to projects for context

### Dashboard
- **Activity Feed**: Recent activities displayed on main dashboard
- **Metrics**: Activity counts aggregated for KPIs

### Gamification
- **Points**: Door knocks and other activities award gamification points
- **Leaderboards**: Activity counts drive competitive rankings

### Campaigns
- **Triggers**: Activities can trigger campaign enrollments
- **Actions**: Campaigns create task activities

### Analytics
- **Call Volume**: Daily/weekly call trends
- **Response Rates**: SMS and email engagement
- **Activity Trends**: 7-day activity charts

## Configuration

### Environment Variables

No specific environment variables for activity tracking. Relies on:
- Supabase connection (for database)
- Twilio credentials (for call/SMS logging)
- Resend credentials (for email logging)

### Filter Configuration

From `/supabase/migrations/20251119000400_configurable_filters.sql`:

Activities support configurable filtering system with entity_type `'activities'`.

## Security

### Row-Level Security
- All activities isolated by `tenant_id`
- Users can only access their tenant's activities

### Impersonation Support
From `/supabase/migrations/20251119000200_admin_impersonation.sql`:
- `performed_by` tracks actual user who performed action
- `on_behalf_of` tracks user being impersonated
- `is_impersonated_action` flag for audit

### Data Validation
- Tenant ID required for all activity inserts
- Contact/project relationships validated

## Testing

### Demo Data Seeding

From `/scripts/archive/seed-demo-activities.ts`:
- Seeds ~1,400 activities over 30 days
- Door knocks: ~600 (20/day)
- Calls: ~360 (12/day)
- Emails: ~300 (10/day)
- Notes: ~180 (6/day)

## Performance Considerations

### Query Optimization
- Partial indexes exclude soft-deleted records
- Composite indexes for common query patterns
- Tenant-first index ordering for RLS efficiency

### Dashboard Queries
- Activity feed limited to 3 most recent
- Metrics queries use date-range filtering (7/30 days)
- Aggregations computed server-side

### Data Volume
- Activities can grow quickly (20+ door knocks/day)
- Indexes critical for list/history views
- Consider archival strategy for old activities

## Future Enhancements

1. **Dedicated Activities API**
   - No dedicated `/api/activities` endpoint currently
   - Would enable direct activity CRUD operations

2. **Activity Timeline View**
   - Enhanced timeline visualization for contacts/projects
   - Filtering by activity type

3. **Activity Search**
   - Full-text search across activity content
   - Advanced filtering options

4. **Activity Notifications**
   - Real-time notifications for important activities
   - Configurable notification preferences

5. **Activity Export**
   - Export activity history to CSV/PDF
   - Compliance reporting

---

## Validation Record

### Files Examined

1. `/lib/types/api.ts` - Activity interface definition (lines 211-228) - Verified type union
2. `/app/api/dashboard/activity/route.ts` - Activity feed endpoint (169 lines) - Verified query logic
3. `/components/dashboard/ActivityFeed.tsx` - Feed component (225 lines) - Verified rendering
4. `/app/api/dashboard/metrics/route.ts` - Metrics endpoint (297 lines) - Verified activity aggregation
5. `/components/dashboard/DashboardMetrics.tsx` - Metrics component (256 lines) - Verified charts
6. `/app/api/email/send/route.ts` - Email activity logging (lines 155-176) - Verified insert
7. `/app/api/sms/send/route.ts` - SMS activity logging (lines 92-105) - Verified insert
8. `/app/api/sms/webhook/route.ts` - Inbound SMS logging (lines 58-70) - Verified insert
9. `/app/api/voice/call/route.ts` - Call activity logging (lines 77-91) - Verified insert
10. `/app/api/voice/webhook/route.ts` - Call status updates (149 lines) - Verified update/insert
11. `/app/api/knocks/route.ts` - Knock activity logging (175 lines) - Verified insert
12. `/app/api/pins/route.ts` - Pin activity logging (lines 239-245) - Verified insert
13. `/lib/twilio/analytics.ts` - Analytics functions - Verified activity queries
14. `/lib/campaigns/execution-engine.ts` - Task creation (lines 406-443) - Verified activity insert
15. `/lib/migrations/proline-field-mappings.ts` - Activity type mapping (lines 188-204)
16. `/scripts/archive/seed-demo-activities.ts` - Demo seeding script (268 lines)
17. `/supabase/migrations/20251004_performance_indexes.sql` - Activity indexes
18. `/supabase/migrations/20251119000200_admin_impersonation.sql` - Impersonation columns
19. `/supabase/migrations/archive/20251001_comprehensive_rls_policies.sql` - RLS policies

### Archon RAG Queries
- Query: "activity tracking CRM" - General CRM patterns reference

### Verification Steps
1. Confirmed Activity type definition in `/lib/types/api.ts` with 5 activity types
2. Verified automatic logging in email, SMS, voice, and knock API routes
3. Confirmed dashboard activity feed implementation with 5 activity item types
4. Verified metrics endpoint aggregates door_knock, call, and email activities
5. Confirmed RLS policies exist for activities table
6. Verified database indexes for performance optimization
7. Confirmed impersonation support columns added to activities table

### Validated By
PRD Documentation Agent - Session 14
Date: 2025-12-11T14:45:00Z
