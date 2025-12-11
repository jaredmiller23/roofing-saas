# Project/Deal Management

## Overview

The Project Management module serves as the central hub for tracking roofing opportunities from initial contact through project completion. Each project represents a potential or active deal linked to a contact, with comprehensive tracking of financial data, pipeline stages, and production status. The system implements an 8-stage pipeline that progresses from prospect through completion, with validation rules ensuring data integrity at each transition.

## User Stories

### Sales Representatives
- As a sales rep, I want to view all my opportunities in a Kanban board so that I can quickly see deal status and prioritize follow-ups
- As a sales rep, I want to drag and drop projects between pipeline stages so that I can efficiently update deal progress
- As a sales rep, I want to see pipeline value totals so that I can track my revenue potential

### Project Managers
- As a project manager, I want to start production from a won project so that jobs are automatically created with project context
- As a project manager, I want to track project costs against estimates so that I can monitor profitability
- As a project manager, I want to link adjusters to insurance projects so that I can manage claims efficiently

### Office Staff
- As an office staff member, I want to search and filter projects so that I can quickly find specific deals
- As an office staff member, I want to see contact details linked to each project so that I can manage customer communications

### Business Owners
- As a business owner, I want automated workflow triggers when stages change so that the team stays coordinated
- As a business owner, I want to see profit margins on completed projects so that I can assess business performance

## Features

### 1. Unified Pipeline System

The pipeline system provides a visual representation of the sales-to-production lifecycle with 8 distinct stages:

| Stage | Display Name | Description | Status Sync |
|-------|--------------|-------------|-------------|
| `prospect` | Prospect | Initial contact, not yet qualified | estimate |
| `qualified` | Qualified | Has genuine interest and budget | estimate |
| `quote_sent` | Quote Sent | Estimate has been sent | proposal |
| `negotiation` | Negotiation | In negotiations, addressing concerns | proposal |
| `won` | Won | Deal won, contract signed | approved |
| `production` | Production | Job in progress | in_progress |
| `complete` | Complete | Project completed | completed |
| `lost` | Lost | Opportunity lost | cancelled |

**Implementation:**
- File: `/lib/pipeline/validation.ts`
- Key exports: `PIPELINE_STAGE_ORDER`, `VALID_STAGE_TRANSITIONS`, `STAGE_DISPLAY_NAMES`

### 2. Stage Transition Validation

The system enforces strict transition rules to maintain data integrity:

**Valid Transitions:**
- `prospect` → `qualified`, `lost`
- `qualified` → `quote_sent`, `lost`
- `quote_sent` → `negotiation`, `lost`
- `negotiation` → `won`, `lost`
- `won` → `production`, `lost`
- `production` → `complete`, `lost`
- `complete` → (terminal - no transitions)
- `lost` → (terminal - no transitions)

**Required Fields by Stage:**
- `quote_sent`: Requires `estimated_value`
- `won`: Requires `approved_value`

**Implementation:**
- File: `/lib/pipeline/validation.ts`
- Key functions: `isValidStageTransition()`, `validateStageRequirements()`, `validateCompleteTransition()`

### 3. Kanban Board View

The primary view for managing opportunities, featuring drag-and-drop functionality:

**Features:**
- 8-column layout corresponding to pipeline stages
- Real-time drag-and-drop with optimistic updates
- Client-side validation before server updates
- Quick filter chips: All, Active Sales, In Production, Closed
- Stage toggle buttons for customizing visible columns
- Search across project name, contact name, email, phone
- Per-column value totals and project counts
- Performance optimization: 50 projects max per column

**Implementation:**
- File: `/components/pipeline/pipeline-board.tsx`
- Uses `@dnd-kit/core` for drag-and-drop
- Renders `PipelineColumn` and `ProjectCard` components

### 4. Table View with Filters

Alternative list view with advanced filtering:

**Features:**
- Sortable columns for all project fields
- Configurable filter bar via `FilterBar` component
- URL-based filter state for shareability
- Pagination support

**Implementation:**
- File: `/components/projects/leads-with-filters.tsx`
- Uses `LeadsTable` component for rendering
- Integrates `FilterBar` for dynamic filtering

### 5. Project Detail View

Comprehensive project information organized in tabs:

**Tabs:**
- **Overview**: Project details, description, scope, financials
- **Jobs**: Associated production jobs with progress tracking
- **Files**: Document and photo management (placeholder)
- **Contact**: Linked contact information with quick actions

**Features:**
- Pipeline status badge with stage-specific styling
- "Start Production" button when project is in `won` stage
- Job costing link for financial tracking
- Timeline showing created/updated/start/completion dates
- Contact quick actions (call, email, view profile)

**Implementation:**
- File: `/app/(dashboard)/projects/[id]/page.tsx`
- 700+ lines with comprehensive UI

### 6. Project CRUD Operations

Complete create, read, update, delete functionality:

**GET /api/projects** - List projects with filtering:
- Query params: `page`, `limit`, `search`, `status`, `pipeline`, `stage`, `assigned_to`
- Joins contact and adjuster data
- Excludes "OLD RECRUITING" pipeline (HR data)
- Returns paginated results with total count

**POST /api/projects** - Create new project:
- Auto-sets `tenant_id` and `created_by`
- Returns created project

**GET /api/projects/[id]** - Get single project:
- Full project data with contact and adjuster joins
- Includes scope_of_work, profit_margin, timeline fields

**PATCH /api/projects/[id]** - Update project:
- Validates pipeline stage transitions
- Auto-syncs status based on pipeline stage
- Triggers workflow automation on stage changes

**Implementation:**
- Files: `/app/api/projects/route.ts`, `/app/api/projects/[id]/route.ts`

### 7. Start Production Workflow

Automated transition from sales to production:

**Endpoint:** `POST /api/projects/[id]/start-production`

**Functionality:**
1. Validates project is in `won` stage
2. Generates sequential job number (YY-####)
3. Creates job record with project context
4. Transitions project to `production` stage
5. Sets `actual_start` date
6. Returns job details for navigation

**Implementation:**
- File: `/app/api/projects/[id]/start-production/route.ts`
- Key functions: `canStartProduction()`, `getStatusForPipelineStage()`

### 8. Job Costing

Financial tracking for project profitability:

**Features:**
- Revenue tracking (from project value fields)
- Cost categories: Labor, Materials, Equipment, Other
- Estimated vs Actual comparison
- Variance calculations with color-coded indicators
- Profit margin calculation
- Expense list from `job_expenses` table

**Implementation:**
- File: `/app/(dashboard)/projects/[id]/costing/page.tsx`
- Server component with direct Supabase queries
- Integrates `AddExpenseButton` and `ExpensesList` components

## Technical Implementation

### Architecture

The project management system follows a client-server architecture:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Client        │────▶│   API Routes     │────▶│   Supabase      │
│   (React/Next)  │◀────│   (Next.js)      │◀────│   (PostgreSQL)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
       │                         │
       ▼                         ▼
┌─────────────────┐     ┌──────────────────┐
│   dnd-kit       │     │   Automation     │
│   (Drag/Drop)   │     │   Engine         │
└─────────────────┘     └──────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `/lib/types/api.ts` | Project type definitions (lines 126-208) |
| `/lib/pipeline/validation.ts` | Stage transition rules and validation |
| `/app/api/projects/route.ts` | List/create API endpoints |
| `/app/api/projects/[id]/route.ts` | Get/update single project |
| `/app/api/projects/[id]/start-production/route.ts` | Production start workflow |
| `/app/api/projects/filters/route.ts` | Dynamic filter options |
| `/app/(dashboard)/projects/page.tsx` | Main projects page |
| `/app/(dashboard)/projects/[id]/page.tsx` | Project detail view |
| `/app/(dashboard)/projects/[id]/costing/page.tsx` | Job costing view |
| `/components/pipeline/pipeline-board.tsx` | Kanban board component |
| `/components/pipeline/pipeline-column.tsx` | Individual column component |
| `/components/pipeline/project-card.tsx` | Project card component |
| `/components/projects/leads-with-filters.tsx` | Table view with filters |
| `/components/projects/leads-table.tsx` | Data table component |
| `/lib/automation/engine.ts` | Workflow trigger engine |

### Data Flow

**Pipeline Stage Change:**
```
1. User drags card to new column (PipelineBoard)
2. Client-side validation (isValidStageTransition)
3. Optimistic UI update
4. PATCH /api/projects/[id]
5. Server validates transition + required fields
6. Database update with status auto-sync
7. Trigger workflow automation (triggerWorkflow)
8. Return updated project
9. On error: revert optimistic update
```

**Start Production:**
```
1. User clicks "Start Production" button
2. POST /api/projects/[id]/start-production
3. Validate project is in 'won' stage
4. Generate job number (YY-####)
5. Insert job record
6. Update project to 'production' stage
7. Return job data
8. Navigate to job detail page
```

## API Endpoints

### GET /api/projects
- **Purpose:** List projects with filtering and pagination
- **Authentication:** Required (session-based)
- **Parameters:**
  - `page` (number, default: 1)
  - `limit` (number, default: 50)
  - `search` (string, optional)
  - `status` (string, optional)
  - `pipeline` (string, optional)
  - `stage` (string, optional)
  - `assigned_to` (string, optional)
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "projects": [...],
      "total": 150,
      "page": 1,
      "limit": 50,
      "totalPages": 3
    }
  }
  ```

### POST /api/projects
- **Purpose:** Create new project
- **Authentication:** Required
- **Body:** Project fields
- **Response:** Created project object

### GET /api/projects/[id]
- **Purpose:** Get single project with full details
- **Authentication:** Required
- **Response:**
  ```json
  {
    "project": {
      "id": "...",
      "name": "...",
      "pipeline_stage": "qualified",
      "contact": {...},
      "adjuster": {...}
    }
  }
  ```

### PATCH /api/projects/[id]
- **Purpose:** Update project fields, including stage transitions
- **Authentication:** Required
- **Body:** Fields to update
- **Validation:** Stage transition rules enforced
- **Response:** Updated project object

### POST /api/projects/[id]/start-production
- **Purpose:** Transition won project to production
- **Authentication:** Required
- **Body:** Optional job details
- **Response:**
  ```json
  {
    "success": true,
    "message": "Production started successfully",
    "job": {...},
    "job_number": "25-0001"
  }
  ```

### GET /api/projects/filters
- **Purpose:** Get available filter options
- **Authentication:** Required
- **Response:** Arrays of pipelines, stages, assignees

## Data Models

### Project

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Multi-tenant isolation |
| contact_id | UUID | Linked contact (required) |
| adjuster_contact_id | UUID | Insurance adjuster (optional) |
| created_by | UUID | Creating user |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |
| name | string | Project name |
| project_number | string | Unique identifier |
| description | text | Project description |
| scope_of_work | text | Detailed scope |
| status | string | Legacy status field |
| pipeline_stage | enum | Current pipeline position |
| stage_changed_at | timestamp | Last stage change |
| type | string | Project type (repair, replacement, etc.) |
| estimated_value | decimal | Initial estimate |
| approved_value | decimal | Approved contract value |
| final_value | decimal | Actual final value |
| profit_margin | decimal | Calculated margin |
| lead_source | string | Origin of opportunity |
| priority | enum | urgent/high/normal/low |
| lead_score | integer | 0-100 scoring |
| estimated_close_date | timestamp | Forecasted close |
| estimated_start | date | Planned start |
| actual_start | date | Actual start |
| actual_completion | date | Completion date |
| custom_fields | jsonb | Flexible metadata |
| is_deleted | boolean | Soft delete flag |

### Pipeline Stage Enum

```sql
CREATE TYPE pipeline_stage AS ENUM (
  'prospect',
  'qualified',
  'quote_sent',
  'negotiation',
  'won',
  'production',
  'complete',
  'lost'
);
```

### Lead Priority Enum

```sql
CREATE TYPE lead_priority AS ENUM (
  'urgent',
  'high',
  'normal',
  'low'
);
```

## Database Indexes

Created for pipeline query performance:

```sql
-- Pipeline stage filtering (Kanban view)
CREATE INDEX idx_projects_pipeline_stage ON projects(pipeline_stage)
WHERE is_deleted = false;

-- Priority filtering
CREATE INDEX idx_projects_priority ON projects(priority)
WHERE is_deleted = false;

-- Active opportunities composite
CREATE INDEX idx_projects_pipeline_active ON projects(pipeline_stage, priority, estimated_close_date)
WHERE is_deleted = false
AND pipeline_stage NOT IN ('complete', 'lost');
```

## Integration Points

### Workflow Automation

Stage changes trigger automated workflows:

```typescript
// On pipeline_stage change
triggerWorkflow(tenantId, 'pipeline_stage_changed', {
  project_id,
  project_name,
  previous_stage,
  new_stage,
  contact_id,
  estimated_value,
  approved_value,
  changed_by,
  changed_at
});

// Specific trigger when won
if (newStage === 'won') {
  triggerWorkflow(tenantId, 'project_won', triggerData);
}
```

### Jobs System

Projects link to production jobs:
- Jobs reference `project_id`
- Start production creates initial job
- Job costing aggregates from `job_expenses`

### Contacts

Projects require contact association:
- `contact_id` is required field
- Contact data joined in queries
- Adjuster contact optional for insurance

### QuickBooks

Projects sync to QuickBooks invoices:
- `quickbooks_id` stores QB reference
- `quickbooks_sync_status` tracks sync state

## Configuration

### Environment Variables

```bash
# Supabase connection (inherited)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

### Pipeline Configuration

Stage transitions and requirements are defined in `/lib/pipeline/validation.ts` and can be modified to match business processes.

## Testing

### E2E Tests

**File:** `/e2e/projects.comprehensive.spec.ts`

**Test Coverage:**
- Kanban view loads by default
- Stage columns display correctly
- View toggle (Kanban/Table) works
- Table view loads without errors
- Sorting functions correctly
- Regression test for Bug #2 (column name fix)

### Running Tests

```bash
npx playwright test e2e/projects.comprehensive.spec.ts
```

## Security

### Row-Level Security

Projects are protected by RLS policies ensuring:
- Users can only see projects in their organization
- Tenant isolation via `tenant_id` filtering
- Soft-delete protection (`is_deleted = false`)

### Authentication

All API routes verify:
1. Valid user session (`getCurrentUser`)
2. User belongs to tenant (`getUserTenantId`)
3. UUID format validation for project IDs

## Performance Notes

### Kanban Board Optimization

- Maximum 50 projects per column to prevent DOM bloat
- Optimistic updates for responsive feel
- Client-side validation before server calls
- Search across indexed fields only

### API Pagination

- Default limit of 50 items
- Server-side filtering and sorting
- Count queries use `{ count: 'exact' }`

## Future Enhancements

Based on codebase analysis:

1. **Files Tab Integration**: Currently placeholder, needs photo/document management
2. **Project Edit Page**: Route exists but implementation TBD
3. **Batch Stage Updates**: Move multiple projects at once
4. **Custom Pipeline Configuration**: Admin UI for stage customization
5. **Advanced Reporting**: Pipeline velocity metrics, conversion rates

---

## Validation Record

### Files Examined
- `/Users/ccai/roofing saas/roofing-saas/app/api/projects/route.ts` - GET/POST handlers verified (189 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/api/projects/[id]/route.ts` - GET/PATCH handlers verified (315 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/api/projects/[id]/start-production/route.ts` - Start production workflow verified (191 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/api/projects/filters/route.ts` - Filter options API verified (74 lines)
- `/Users/ccai/roofing saas/roofing-saas/lib/types/api.ts` - Project type definition verified (lines 126-208)
- `/Users/ccai/roofing saas/roofing-saas/lib/pipeline/validation.ts` - Pipeline rules verified (213 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/projects/page.tsx` - Main page verified (105 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/projects/[id]/page.tsx` - Detail page verified (703 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/projects/[id]/costing/page.tsx` - Costing page verified (297 lines)
- `/Users/ccai/roofing saas/roofing-saas/components/pipeline/pipeline-board.tsx` - Kanban component verified (451 lines)
- `/Users/ccai/roofing saas/roofing-saas/components/projects/leads-with-filters.tsx` - Table view verified (107 lines)
- `/Users/ccai/roofing saas/roofing-saas/lib/automation/engine.ts` - Workflow engine verified (296 lines)
- `/Users/ccai/roofing saas/roofing-saas/e2e/projects.comprehensive.spec.ts` - E2E tests verified (401 lines)
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251120200000_add_pipeline_fields_to_projects.sql` - Migration verified (128 lines)
- `/Users/ccai/roofing saas/DATABASE_SCHEMA_v2.sql` - Schema verified (projects table lines 124-186)

### Archon RAG Queries
- Query: "Next.js project management CRM sales pipeline drag drop" - General reference (not directly applicable)

### Verification Steps
1. Confirmed all 8 pipeline stages exist in `PIPELINE_STAGE_ORDER` array
2. Verified `VALID_STAGE_TRANSITIONS` matches documented transitions
3. Confirmed `validateCompleteTransition()` checks both transition validity and required fields
4. Verified API routes implement tenant isolation via `getUserTenantId`
5. Confirmed `@dnd-kit/core` used for drag-and-drop in pipeline board
6. Verified start-production workflow creates jobs and updates project stage
7. Confirmed E2E tests cover view modes and regression scenarios
8. Verified database indexes exist for pipeline queries

### Validated By
PRD Documentation Agent - Session 9
Date: 2025-12-11T00:41:00Z
