# Projects API Reference

## Overview

The Projects API provides RESTful endpoints for managing sales opportunities/deals through the pipeline lifecycle. Projects represent roofing jobs from initial prospect through production and completion. The API supports full CRUD operations, pipeline stage transitions with validation, filtering, pagination, and workflow automation triggers.

**Base URL:** `/api/projects`

## User Stories

### Sales Representatives
- As a sales rep, I want to create new projects for qualified leads so that I can track the deal through the pipeline
- As a sales rep, I want to move projects through pipeline stages so that I can progress deals toward closing
- As a sales rep, I want to filter projects by stage so that I can focus on deals needing attention

### Office Staff
- As an office admin, I want to list all projects with pagination so that I can manage the sales pipeline efficiently
- As an office admin, I want to start production on won projects so that I can transition deals to the production team

### Managers
- As a manager, I want to get filter options dynamically so that I can see available pipelines, stages, and assignees
- As a manager, I want project updates to trigger workflows so that team members are notified of stage changes

## API Endpoints

### GET /api/projects

**Purpose:** List all projects with filtering, search, and pagination.

**Authentication:** Required (session cookie)

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number for pagination |
| `limit` | integer | 50 | Items per page (max 100) |
| `search` | string | - | Search by project name or project number |
| `status` | string | - | Filter by project status |
| `pipeline` | string | - | Filter by proline_pipeline (from custom_fields) |
| `stage` | string | - | Filter by proline_stage (from custom_fields) |
| `assigned_to` | string | - | Filter by assigned_to (from custom_fields) |

**Response:**

```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "uuid",
        "name": "Smith Roof Replacement",
        "project_number": "PRJ-001",
        "contact_id": "uuid",
        "status": "approved",
        "type": "residential",
        "estimated_value": 15000,
        "approved_value": 14500,
        "final_value": null,
        "created_at": "2025-01-15T10:00:00Z",
        "updated_at": "2025-01-16T14:30:00Z",
        "created_by": "uuid",
        "description": "Full roof replacement after hail damage",
        "custom_fields": {
          "proline_pipeline": "Sales",
          "proline_stage": "Won",
          "assigned_to": "John Smith"
        },
        "pipeline_stage": "won",
        "stage_changed_at": "2025-01-16T14:30:00Z",
        "lead_source": "storm_targeting",
        "priority": "high",
        "lead_score": 85,
        "estimated_close_date": "2025-01-20T00:00:00Z",
        "adjuster_contact_id": "uuid",
        "contact": {
          "id": "uuid",
          "first_name": "John",
          "last_name": "Smith",
          "email": "john.smith@email.com",
          "phone": "555-0101"
        },
        "adjuster": {
          "id": "uuid",
          "first_name": "Jane",
          "last_name": "Doe",
          "company": "ABC Insurance",
          "phone": "555-0102",
          "email": "jane.doe@abcinsurance.com"
        },
        "pipeline": "Sales",
        "stage": "Won",
        "assigned_to_name": "John Smith",
        "tags": ["hail-damage", "insurance"]
      }
    ],
    "total": 150,
    "page": 1,
    "limit": 50,
    "totalPages": 3
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | User not authenticated |
| 403 | FORBIDDEN | No tenant found for user |
| 500 | INTERNAL_ERROR | Database or server error |

**Notes:**
- Automatically excludes projects with `proline_pipeline = 'OLD RECRUITING'` (HR data)
- Automatically excludes soft-deleted projects (`is_deleted = true`)
- Results ordered by `created_at DESC`

---

### POST /api/projects

**Purpose:** Create a new project/deal.

**Authentication:** Required (session cookie)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Project name |
| `contact_id` | uuid | No | Associated contact ID |
| `status` | string | No | Project status |
| `type` | string | No | Project type (residential, commercial) |
| `estimated_value` | number | No | Estimated deal value |
| `description` | string | No | Project description |
| `pipeline_stage` | string | No | Pipeline stage (defaults to 'prospect') |
| `lead_source` | string | No | Where the lead came from |
| `priority` | string | No | Lead priority (urgent, high, normal, low) |
| `lead_score` | integer | No | Lead score 0-100 |
| `estimated_close_date` | timestamp | No | Expected close date |
| `custom_fields` | object | No | Additional custom fields |

**Example Request:**

```json
{
  "name": "Johnson Roof Repair",
  "contact_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "estimate",
  "type": "residential",
  "estimated_value": 8500,
  "description": "Minor shingle repair",
  "pipeline_stage": "prospect",
  "lead_source": "door_knock",
  "priority": "normal"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Johnson Roof Repair",
    "tenant_id": "uuid",
    "created_by": "uuid",
    "created_at": "2025-01-17T10:00:00Z",
    "...": "..."
  }
}
```

**Notes:**
- `tenant_id` is automatically set from authenticated user
- `created_by` is automatically set to current user ID

---

### GET /api/projects/[id]

**Purpose:** Fetch a single project by ID with full details.

**Authentication:** Required (session cookie)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Project ID |

**Response:**

```json
{
  "project": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Smith Roof Replacement",
    "project_number": "PRJ-001",
    "contact_id": "uuid",
    "status": "in_progress",
    "type": "residential",
    "estimated_value": 15000,
    "approved_value": 14500,
    "final_value": null,
    "profit_margin": null,
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-18T09:00:00Z",
    "created_by": "uuid",
    "description": "Full roof replacement",
    "scope_of_work": "Remove existing shingles, install new architectural shingles...",
    "custom_fields": {},
    "pipeline_stage": "production",
    "stage_changed_at": "2025-01-18T09:00:00Z",
    "lead_source": "referral",
    "priority": "high",
    "lead_score": 90,
    "estimated_start": "2025-01-20",
    "actual_start": "2025-01-18",
    "actual_completion": null,
    "estimated_close_date": "2025-01-25T00:00:00Z",
    "adjuster_contact_id": "uuid",
    "contact": {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Smith",
      "email": "john.smith@email.com",
      "phone": "555-0101",
      "address_street": "123 Main St",
      "address_city": "Anytown",
      "address_state": "TX",
      "address_zip": "75001"
    },
    "adjuster": {
      "id": "uuid",
      "first_name": "Jane",
      "last_name": "Doe",
      "company": "ABC Insurance",
      "phone": "555-0102",
      "email": "jane.doe@abcinsurance.com"
    }
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | BAD_REQUEST | Invalid project ID format |
| 401 | UNAUTHORIZED | User not authenticated |
| 403 | FORBIDDEN | No tenant found |
| 404 | NOT_FOUND | Project not found |
| 500 | INTERNAL_ERROR | Server error |

**Notes:**
- Validates UUID format before querying
- Only returns projects belonging to user's tenant
- Excludes soft-deleted projects

---

### PATCH /api/projects/[id]

**Purpose:** Update a project's details, including pipeline stage transitions with validation.

**Authentication:** Required (session cookie)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Project ID |

**Request Body:** (all fields optional)

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Project name |
| `status` | string | Project status |
| `estimated_value` | number | Estimated value |
| `approved_value` | number | Approved value |
| `final_value` | number | Final value |
| `description` | string | Description |
| `pipeline_stage` | string | New pipeline stage (validated) |
| `priority` | string | Lead priority |
| `lead_score` | integer | Lead score |
| `estimated_close_date` | timestamp | Expected close |
| `custom_fields` | object | Custom fields |

**Pipeline Stage Transition Validation:**

The API validates stage transitions according to the pipeline rules:

```
prospect → qualified → quote_sent → negotiation → won → production → complete
    ↓          ↓           ↓            ↓         ↓         ↓
   lost       lost        lost         lost      lost      lost
```

**Valid Transitions:**

| From Stage | Valid Next Stages |
|------------|-------------------|
| prospect | qualified, lost |
| qualified | quote_sent, lost |
| quote_sent | negotiation, lost |
| negotiation | won, lost |
| won | production, lost |
| production | complete, lost |
| complete | (terminal) |
| lost | (terminal) |

**Stage Requirements:**

| Stage | Required Fields |
|-------|----------------|
| quote_sent | `estimated_value` must be set |
| negotiation | `estimated_value` must be set |
| won | `approved_value` must be set |

**Example Request (Stage Transition):**

```json
{
  "pipeline_stage": "won",
  "approved_value": 14500
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Smith Roof Replacement",
    "pipeline_stage": "won",
    "status": "approved",
    "...": "..."
  }
}
```

**Invalid Transition Error Response:**

```json
{
  "error": "Cannot move to Production. From Won, you can only move to: Production or Lost",
  "code": "INVALID_STAGE_TRANSITION",
  "current_stage": "won",
  "requested_stage": "complete"
}
```

**Missing Requirements Error Response:**

```json
{
  "error": "Missing required fields: Approved Value",
  "code": "INVALID_STAGE_TRANSITION",
  "current_stage": "negotiation",
  "requested_stage": "won"
}
```

**Workflow Triggers:**

When `pipeline_stage` changes, the following workflows are triggered:

1. **`pipeline_stage_changed`** - Triggered for any stage change
   - Trigger data: project_id, project_name, previous_stage, new_stage, contact_id, estimated_value, approved_value, changed_by, changed_at

2. **`project_won`** - Triggered when moving to 'won' stage
   - Same trigger data as above

**Auto-Sync Status:**

Pipeline stage changes automatically update the project `status`:

| Pipeline Stage | Auto Status |
|---------------|-------------|
| prospect | estimate |
| qualified | estimate |
| quote_sent | proposal |
| negotiation | proposal |
| won | approved |
| production | in_progress |
| complete | completed |
| lost | cancelled |

---

### POST /api/projects/[id]/start-production

**Purpose:** Start production for a won project. Creates a production job and transitions project to 'production' stage.

**Authentication:** Required (session cookie)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Project ID |

**Request Body:** (optional)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `job_type` | string | "roof_replacement" | Type of job |
| `scheduled_date` | date | null | Scheduled start date |
| `notes` | string | null | Job notes |

**Valid Job Types:**
- `roof_replacement`
- `roof_repair`
- `inspection`
- `maintenance`
- `emergency`
- `other`

**Example Request:**

```json
{
  "job_type": "roof_replacement",
  "scheduled_date": "2025-01-25",
  "notes": "Customer requested morning start"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Production started successfully",
  "job": {
    "id": "uuid",
    "tenant_id": "uuid",
    "project_id": "uuid",
    "job_number": "25-0001",
    "job_type": "roof_replacement",
    "status": "scheduled",
    "scheduled_date": "2025-01-25",
    "work_address": "123 Main St, Anytown TX 75001",
    "material_cost": 0,
    "labor_cost": 0,
    "equipment_cost": 0,
    "other_costs": 0,
    "completion_percentage": 0,
    "notes": "Customer requested morning start",
    "created_by": "uuid",
    "created_at": "2025-01-20T10:00:00Z"
  },
  "project": {
    "id": "uuid",
    "pipeline_stage": "production",
    "status": "in_progress",
    "actual_start": "2025-01-20",
    "...": "..."
  },
  "job_number": "25-0001"
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_STATE | Project not in 'won' stage |
| 400 | BAD_REQUEST | Invalid project ID format |
| 401 | UNAUTHORIZED | Not authenticated |
| 403 | FORBIDDEN | No tenant found |
| 404 | NOT_FOUND | Project not found |
| 500 | INTERNAL_ERROR | Failed to create job |

**Example Error (Wrong Stage):**

```json
{
  "error": "Cannot start production. Project must be in 'Won' stage. Current stage: negotiation",
  "code": "INVALID_STATE",
  "current_stage": "negotiation"
}
```

**What This Endpoint Does:**

1. Validates project is in 'won' stage
2. Generates job number (format: YY-####, e.g., "25-0001")
3. Creates production job record in `jobs` table
4. Updates project to 'production' stage
5. Sets `actual_start` date on project
6. Auto-syncs project status to 'in_progress'

---

### GET /api/projects/filters

**Purpose:** Get available filter options for the projects list (dynamically extracted from existing data).

**Authentication:** Required (session cookie)

**Response:**

```json
{
  "success": true,
  "pipelines": ["Sales", "Insurance", "Commercial"],
  "stages": ["Prospect", "Qualified", "Quote Sent", "Won", "Lost"],
  "assignees": ["John Smith", "Jane Doe", "Bob Johnson"]
}
```

**Notes:**
- Values are extracted from `custom_fields` of all tenant projects
- Excludes 'OLD RECRUITING' pipeline
- Excludes soft-deleted projects
- Arrays are sorted alphabetically

## Related API Endpoints

### Jobs API

The Jobs API works alongside Projects for production management:

#### GET /api/jobs

List production jobs with filtering.

**Query Parameters:**
- `page`, `limit` - Pagination
- `job_type` - Filter by type
- `status` - Filter by status (scheduled, in_progress, on_hold, completed, cancelled)
- `project_id` - Filter by associated project
- `crew_lead` - Filter by crew lead
- `search` - Search job number or scope of work

#### POST /api/jobs

Create a new production job.

#### GET /api/jobs/[id]

Get single job details.

#### PATCH /api/jobs/[id]

Update job. **Special behavior:** When job status is set to 'completed':
1. Sets `completion_date` and `completion_percentage = 100`
2. Updates associated project to 'complete' stage
3. Triggers `job_completed` workflow

#### DELETE /api/jobs/[id]

Soft delete a job.

## Data Models

### Project Schema

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | No | Primary key |
| tenant_id | uuid | No | Tenant reference |
| contact_id | uuid | Yes | Associated contact |
| created_by | uuid | Yes | Creator user ID |
| created_at | timestamp | No | Creation timestamp |
| updated_at | timestamp | No | Last update timestamp |
| name | string | No | Project name |
| project_number | string | Yes | Auto-generated project number |
| description | text | Yes | Project description |
| scope_of_work | text | Yes | Detailed scope |
| status | string | Yes | Legacy status field |
| type | string | Yes | Project type |
| estimated_value | decimal | Yes | Estimated deal value |
| approved_value | decimal | Yes | Approved/contract value |
| final_value | decimal | Yes | Final invoiced value |
| profit_margin | decimal | Yes | Profit margin percentage |
| pipeline_stage | enum | No | Pipeline stage (see enum) |
| stage_changed_at | timestamp | Yes | When stage last changed |
| lead_source | string | Yes | Lead origin |
| priority | enum | Yes | Lead priority |
| lead_score | integer | Yes | Score 0-100 |
| estimated_close_date | timestamp | Yes | Expected close date |
| estimated_start | date | Yes | Planned start date |
| actual_start | date | Yes | Actual start date |
| actual_completion | date | Yes | Actual completion date |
| adjuster_contact_id | uuid | Yes | Insurance adjuster contact |
| claim_id | string | Yes | External claims reference |
| storm_event_id | uuid | Yes | Related storm event |
| custom_fields | jsonb | Yes | Additional custom data |
| is_deleted | boolean | No | Soft delete flag |

### PipelineStage Enum

```typescript
type PipelineStage =
  | 'prospect'      // Initial contact
  | 'qualified'     // Qualified lead
  | 'quote_sent'    // Quote/estimate sent
  | 'negotiation'   // In negotiations
  | 'won'           // Deal won
  | 'production'    // Job in progress
  | 'complete'      // Project completed
  | 'lost'          // Opportunity lost
```

### LeadPriority Enum

```typescript
type LeadPriority = 'urgent' | 'high' | 'normal' | 'low'
```

### Job Schema (Related)

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | Tenant reference |
| project_id | uuid | Associated project |
| job_number | string | Auto-generated (YY-####) |
| job_type | enum | Type of work |
| status | enum | Job status |
| scheduled_date | date | Scheduled date |
| completion_date | date | Completion date |
| completion_percentage | integer | Progress 0-100 |
| crew_lead | uuid | Assigned crew lead |
| crew_members | uuid[] | Crew member IDs |
| material_cost | decimal | Material costs |
| labor_cost | decimal | Labor costs |
| equipment_cost | decimal | Equipment costs |
| other_costs | decimal | Other costs |
| total_cost | decimal | Auto-calculated total |
| notes | text | Job notes |

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | No tenant access |
| NOT_FOUND | 404 | Project not found |
| BAD_REQUEST | 400 | Invalid input |
| INVALID_STAGE_TRANSITION | 400 | Invalid pipeline stage change |
| INVALID_STATE | 400 | Operation not allowed in current state |
| INTERNAL_ERROR | 500 | Server error |

## Integration Points

### Workflow Automation

Projects API triggers workflows via the automation engine:

1. **pipeline_stage_changed** - Any stage transition
2. **project_won** - Project moves to 'won' stage
3. **job_completed** - Associated job marked complete

### Contact Integration

- Projects are linked to contacts via `contact_id`
- Contact details are included in project responses
- Insurance adjusters linked via `adjuster_contact_id`

### Storm Targeting Integration

- Projects can be linked to storm events via `storm_event_id`
- Used for insurance claim causation documentation

### QuickBooks Integration

- Won projects can be synced to QuickBooks as invoices
- Contact syncs to QuickBooks customers

## Security

### Row-Level Security (RLS)

All project queries are filtered by `tenant_id`:
- Users can only access projects within their tenant
- Tenant ID is derived from authenticated user

### Authentication

- All endpoints require session authentication
- User context retrieved via `getCurrentUser()`
- Tenant context retrieved via `getUserTenantId()`

## Testing

### E2E Test Coverage

Tests located at:
- `e2e/pipeline.spec.ts` - Pipeline UI and stage tests
- `e2e/projects.comprehensive.spec.ts` - View modes, filtering, sorting

### Test Scenarios

1. **Authentication Tests**
   - Redirect to login when unauthenticated
   - Stay on page when authenticated

2. **Pipeline Stage Tests**
   - Display all 8 pipeline stages
   - Show pipeline value statistics
   - Quick filter chips functionality
   - Stage toggle filtering

3. **View Mode Tests**
   - Kanban view (default)
   - Table view toggle
   - Sort by columns without errors

## Performance Considerations

### Database Indexes

```sql
-- Pipeline stage filtering
CREATE INDEX idx_projects_pipeline_stage ON projects(pipeline_stage)
WHERE is_deleted = false;

-- Priority filtering
CREATE INDEX idx_projects_priority ON projects(priority)
WHERE is_deleted = false;

-- Active pipeline (stage + priority + close date)
CREATE INDEX idx_projects_pipeline_active ON projects(pipeline_stage, priority, estimated_close_date)
WHERE is_deleted = false
AND pipeline_stage NOT IN ('complete', 'lost');
```

### Pagination

- Default limit: 50 items per page
- Maximum limit: 100 items
- Uses cursor-based range queries

---

## Validation Record

### Files Examined
- `/Users/ccai/roofing saas/roofing-saas/app/api/projects/route.ts` - GET/POST endpoints (189 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/api/projects/[id]/route.ts` - GET/PATCH endpoints (316 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/api/projects/[id]/start-production/route.ts` - Start production endpoint (191 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/api/projects/filters/route.ts` - Filters endpoint (75 lines)
- `/Users/ccai/roofing saas/roofing-saas/lib/pipeline/validation.ts` - Stage transition logic (213 lines)
- `/Users/ccai/roofing saas/roofing-saas/lib/types/api.ts` - Type definitions (260 lines)
- `/Users/ccai/roofing saas/roofing-saas/lib/automation/engine.ts` - Workflow triggers (297 lines)
- `/Users/ccai/roofing saas/roofing-saas/lib/api/errors.ts` - Error handling (145 lines)
- `/Users/ccai/roofing saas/roofing-saas/lib/api/response.ts` - Response helpers (133 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/api/jobs/route.ts` - Jobs CRUD (115 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/api/jobs/[id]/route.ts` - Jobs single/update (224 lines)
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251120200000_add_pipeline_fields_to_projects.sql` - Pipeline migration (129 lines)
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251003_jobs_table.sql` - Jobs table (374 lines)
- `/Users/ccai/roofing saas/roofing-saas/e2e/pipeline.spec.ts` - Pipeline E2E tests (281 lines)
- `/Users/ccai/roofing saas/roofing-saas/e2e/projects.comprehensive.spec.ts` - Projects E2E tests (402 lines)

### Archon RAG Queries
- Query: "Next.js API routes REST API design patterns" - Found Vercel routing middleware docs

### Verification Steps
1. Verified all 5 API endpoint files exist and read their implementations
2. Confirmed pipeline stage transition rules in validation.ts (8 stages, valid transitions map)
3. Verified stage requirements (estimated_value for quote_sent, approved_value for won)
4. Confirmed workflow triggers: pipeline_stage_changed, project_won, job_completed
5. Verified auto-sync status mapping (PIPELINE_TO_STATUS_MAP)
6. Confirmed jobs table schema and auto-generated job numbers (YY-####)
7. Verified E2E test coverage exists for pipeline and projects
8. Confirmed database indexes in migration files

### Validated By
PRD Documentation Agent - Session 27
Date: 2025-12-11T16:00:00Z
