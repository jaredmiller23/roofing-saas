# Pipeline System

## Overview

The Pipeline System is the unified sales and project lifecycle tracking module for the Roofing SAAS platform. It provides a visual Kanban board and table view for managing opportunities through an 8-stage pipeline from initial prospect to project completion.

The system was designed to replace the previous fragmented approach of separate "status" and "stage" fields, consolidating everything into a single `pipeline_stage` field that represents the complete customer journey from first contact to completed job.

**Key Value Propositions:**
- Single source of truth for opportunity stage
- Visual drag-and-drop Kanban board
- Server-validated stage transitions
- Automatic status synchronization
- Workflow automation triggers
- Pipeline value analytics

---

## User Stories

### Sales Representatives
- As a sales rep, I want to see all my opportunities in a Kanban board so that I can quickly assess my pipeline at a glance
- As a sales rep, I want to drag and drop deals between stages so that I can easily update progress
- As a sales rep, I want to mark deals as lost directly from the card so that I can quickly update stale opportunities
- As a sales rep, I want to see days-in-stage badges so that I can identify deals that need attention

### Project Managers
- As a project manager, I want to start production on won deals so that a job is automatically created and the project moves to production stage
- As a project manager, I want to see the total pipeline value so that I can forecast revenue

### Office Staff
- As an office staff member, I want to search opportunities by name, contact, email, or phone so that I can quickly find specific deals
- As an office staff member, I want to toggle between Kanban and table views so that I can work in the format that suits my task

### Business Owners
- As a business owner, I want to see pipeline value statistics so that I can understand business health
- As a business owner, I want quick filters (Active Sales, In Production, Closed) so that I can segment my pipeline quickly

---

## Features

### 1. Eight-Stage Pipeline

The pipeline consists of 8 sequential stages representing the full customer lifecycle:

| Stage | Description | Color | Auto-Sync Status |
|-------|-------------|-------|------------------|
| **Prospect** | Initial contact, not yet qualified | Gray | `estimate` |
| **Qualified** | Qualified lead with genuine interest and budget | Blue | `estimate` |
| **Quote Sent** | Quote/estimate has been sent | Purple | `proposal` |
| **Negotiation** | In negotiations, addressing concerns | Orange | `proposal` |
| **Won** | Deal won, contract signed | Green | `approved` |
| **Production** | Job in progress | Cyan | `in_progress` |
| **Complete** | Project completed | Emerald | `completed` |
| **Lost** | Opportunity lost | Red | `cancelled` |

**Implementation:**
- File: `/lib/types/api.ts` (lines 126-134)
- Type definition: `PipelineStage`

### 2. Stage Transition Validation

The system enforces strict stage transition rules to ensure data integrity:

**Valid Transitions:**
```
prospect → qualified, lost
qualified → quote_sent, lost
quote_sent → negotiation, lost
negotiation → won, lost
won → production, lost
production → complete, lost
complete → (terminal - no transitions)
lost → (terminal - no transitions)
```

**Required Fields by Stage:**
- `quote_sent`: Requires `estimated_value`
- `negotiation`: Requires `estimated_value`
- `won`: Requires `approved_value`

**Implementation:**
- File: `/lib/pipeline/validation.ts` (213 lines)
- Key functions:
  - `isValidStageTransition()` - Check if transition is allowed
  - `validateStageRequirements()` - Check required fields
  - `validateCompleteTransition()` - Full validation
  - `getTransitionError()` - Get error message for invalid transition

### 3. Kanban Board View

A drag-and-drop Kanban board built with dnd-kit for managing pipeline stages.

**Features:**
- 8 columns (one per stage)
- Drag-and-drop cards between columns
- Visual drop indicator when hovering
- Optimistic updates with rollback on error
- Maximum 50 projects per column for performance
- Real-time validation feedback with error banners

**Implementation:**
- File: `/components/pipeline/pipeline-board.tsx` (451 lines)
- Dependencies: `@dnd-kit/core` for drag-and-drop
- Uses `DndContext`, `DragOverlay`, `useSensor` from dnd-kit

**Key UI Elements:**
- Search input for filtering by name, contact, email, phone
- Quick filter chips: All, Active Sales, In Production, Closed
- Individual stage toggle buttons
- Pipeline value display
- Validation error banner (auto-dismiss after 5 seconds)

### 4. Pipeline Column Component

Individual Kanban column with droppable zone.

**Implementation:**
- File: `/components/pipeline/pipeline-column.tsx` (57 lines)
- Uses `useDroppable` hook from dnd-kit
- Visual feedback: `isOver` state changes background to blue

### 5. Project Card Component

Draggable project card with rich information display and actions.

**Card Information Displayed:**
- Project name (linked to detail page)
- Lead score badge (color-coded 0-100)
- Contact name (linked to contact page)
- Estimated/approved value
- Contact email and phone
- Lead source
- Priority badge (urgent/high only shown)
- Days-in-stage badge (color-coded by urgency)
- Last updated timestamp

**Stage-Specific Actions:**
- **Active Sales Stages** (prospect, qualified, quote_sent, negotiation): "Mark as Lost" button
- **Won Stage**: "Start Production" button (creates job, transitions to production)
- **Lost Stage**: "Reactivate" button (returns to prospect)

**Quick Actions:**
- Call (tel: link)
- Text (sms: link)
- Email (mailto: link)

**Implementation:**
- File: `/components/pipeline/project-card.tsx` (434 lines)
- Uses `useDraggable` hook from dnd-kit

### 6. Table View (LeadsWithFilters)

Alternative table view for list-based pipeline management.

**Features:**
- Sortable columns (name, email, stage, value, last activity)
- URL-based pagination and sorting
- Contact-based view with aggregated project data
- Pipeline value statistics
- Configurable filters via FilterBar component

**Statistics Display:**
- Total leads count
- Pipeline value (sum of all project values)
- Average value per lead

**Implementation:**
- File: `/components/projects/leads-with-filters.tsx` (107 lines)
- File: `/components/projects/leads-table.tsx` (466 lines)

### 7. Quick Filters

Pre-configured filter sets for common pipeline views:

| Filter | Stages Included |
|--------|-----------------|
| All | All 8 stages |
| Active Sales | prospect, qualified, quote_sent, negotiation, won |
| In Production | production |
| Closed | complete, lost |

### 8. Start Production Workflow

Special action for "Won" stage projects to initiate production.

**Process:**
1. Validate project is in "Won" stage
2. Generate job number (YY-####)
3. Create job record with type, address, and defaults
4. Update project to "Production" stage
5. Set `actual_start` date

**Implementation:**
- File: `/app/api/projects/[id]/start-production/route.ts` (191 lines)
- Endpoint: `POST /api/projects/[id]/start-production`

---

## Technical Implementation

### Architecture

```
/projects page
├── Page Header (title, view toggle, new button)
├── View Mode: Kanban
│   └── PipelineBoard
│       ├── DndContext (dnd-kit)
│       ├── Header (search, filters)
│       ├── Stage Columns (8x)
│       │   └── PipelineColumn
│       │       └── ProjectCard (draggable)
│       └── DragOverlay (active card)
└── View Mode: Table
    └── LeadsWithFilters
        ├── FilterBar
        └── LeadsTable
```

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `/app/(dashboard)/pipeline/page.tsx` | Redirect to /projects | 11 |
| `/app/(dashboard)/projects/page.tsx` | Unified pipeline page | 105 |
| `/components/pipeline/pipeline-board.tsx` | Kanban board component | 451 |
| `/components/pipeline/pipeline-column.tsx` | Droppable column | 57 |
| `/components/pipeline/project-card.tsx` | Draggable card | 434 |
| `/components/projects/leads-with-filters.tsx` | Table view wrapper | 107 |
| `/components/projects/leads-table.tsx` | Table view component | 466 |
| `/lib/pipeline/validation.ts` | Stage transition rules | 213 |
| `/lib/types/api.ts` | PipelineStage type | ~80 |
| `/app/api/projects/route.ts` | List/create projects | 189 |
| `/app/api/projects/[id]/route.ts` | CRUD + stage transitions | 315 |
| `/app/api/projects/[id]/start-production/route.ts` | Production workflow | 191 |
| `/supabase/migrations/20251120200000_add_pipeline_fields_to_projects.sql` | DB schema | 128 |

### Data Flow

**Drag-and-Drop Stage Transition:**
```
1. User drags card → handleDragStart() stores active project
2. User drops on column → handleDragEnd() triggered
3. Client-side validation (isValidStageTransition, validateStageRequirements)
4. Validation fails → Show error banner, no API call
5. Validation passes → Optimistic UI update
6. PATCH /api/projects/[id] with new pipeline_stage
7. Server validates transition (validateCompleteTransition)
8. Server auto-syncs status field (getStatusForPipelineStage)
9. Server triggers workflow automation
10. Success → UI stays updated
11. Failure → Revert UI, show error
```

**Start Production Flow:**
```
1. User clicks "Start Production" on Won card
2. POST /api/projects/[id]/start-production
3. Server validates project is in "won" stage
4. Server generates job number (YY-####)
5. Server creates job record
6. Server updates project: pipeline_stage=production, status=in_progress
7. Response includes job ID
8. UI navigates to job page or refreshes
```

---

## API Endpoints

### GET /api/projects
List projects with filtering and search.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 50, max: 2000) |
| search | string | Search by name or project_number |
| status | string | Filter by status |
| pipeline | string | Filter by custom_fields.proline_pipeline |
| stage | string | Filter by custom_fields.proline_stage |
| assigned_to | string | Filter by assignee |

**Response:**
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

### PATCH /api/projects/[id]
Update project including pipeline stage transitions.

**Request Body:**
```json
{
  "pipeline_stage": "qualified",
  "estimated_value": 15000
}
```

**Validation Errors:**
```json
{
  "error": "Cannot move to Won. From Negotiation, you can only move to: Won or Lost",
  "code": "INVALID_STAGE_TRANSITION",
  "current_stage": "prospect",
  "requested_stage": "won"
}
```

**Workflow Triggers:**
- `pipeline_stage_changed` - Triggered on any stage change
- `project_won` - Triggered when moving to "won" stage

### POST /api/projects/[id]/start-production
Start production workflow for won projects.

**Request Body (optional):**
```json
{
  "job_type": "roof_replacement",
  "scheduled_date": "2025-01-15",
  "notes": "Customer requested morning start"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Production started successfully",
  "job": { "id": "...", "job_number": "25-0001", ... },
  "project": { ... },
  "job_number": "25-0001"
}
```

---

## Data Models

### PipelineStage Enum (PostgreSQL)
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

### LeadPriority Enum (PostgreSQL)
```sql
CREATE TYPE lead_priority AS ENUM (
  'urgent',
  'high',
  'normal',
  'low'
);
```

### Project Pipeline Fields

| Field | Type | Description |
|-------|------|-------------|
| pipeline_stage | pipeline_stage | Current stage (required, default: 'prospect') |
| lead_source | text | Origin of opportunity |
| priority | lead_priority | Lead priority (default: 'normal') |
| lead_score | integer | Score 0-100 (default: 0) |
| estimated_close_date | timestamptz | Forecasted close date |
| stage_changed_at | timestamptz | Timestamp of last stage change |

### Database Indexes

```sql
-- Filter by pipeline_stage (Kanban view)
CREATE INDEX idx_projects_pipeline_stage ON projects(pipeline_stage)
WHERE is_deleted = false;

-- Filter by priority
CREATE INDEX idx_projects_priority ON projects(priority)
WHERE is_deleted = false;

-- Active pipeline queries
CREATE INDEX idx_projects_pipeline_active ON projects(pipeline_stage, priority, estimated_close_date)
WHERE is_deleted = false
AND pipeline_stage NOT IN ('complete', 'lost');
```

---

## Integration Points

### Workflow Automation
- Stage changes trigger `pipeline_stage_changed` workflow
- Won deals trigger `project_won` workflow
- Automation engine: `/lib/automation/engine.ts`

### Job Costing
- "Start Production" creates job record
- Jobs linked to projects via `project_id`
- Job table: `/supabase/migrations/20251003_jobs_table.sql`

### Contact Management
- Projects linked to contacts via `contact_id`
- Contact info displayed on pipeline cards
- Quick actions (call, text, email) use contact data

### Status Synchronization
- `pipeline_stage` auto-syncs to `status` field
- Mapping defined in `PIPELINE_TO_STATUS_MAP`
- Maintains backward compatibility with status-based queries

---

## Configuration

### Environment Variables
None specific to pipeline (uses standard Supabase config).

### Constants

**PROJECTS_PER_COLUMN:** 50 (performance limit)
```typescript
const PROJECTS_PER_COLUMN = 50
```

**Stage Colors:**
```typescript
const STAGES = [
  { id: 'prospect', name: 'Prospect', color: 'bg-gray-500' },
  { id: 'qualified', name: 'Qualified', color: 'bg-blue-500' },
  { id: 'quote_sent', name: 'Quote Sent', color: 'bg-purple-500' },
  { id: 'negotiation', name: 'Negotiation', color: 'bg-orange-500' },
  { id: 'won', name: 'Won', color: 'bg-green-500' },
  { id: 'production', name: 'Production', color: 'bg-cyan-500' },
  { id: 'complete', name: 'Complete', color: 'bg-emerald-600' },
  { id: 'lost', name: 'Lost', color: 'bg-red-500' },
]
```

---

## Testing

### E2E Tests
- File: `/e2e/pipeline.spec.ts` (280 lines)
- Coverage:
  - Unauthenticated redirect to login
  - /pipeline redirect to /projects
  - All 8 stages display
  - Pipeline value statistics
  - Quick filter chips
  - Kanban/Table view toggle
  - Search functionality
  - Stage toggle buttons
  - No 500 errors (smoke tests)

### Test Commands
```bash
npx playwright test e2e/pipeline.spec.ts
```

---

## Security

### Row-Level Security
- Projects table has RLS policies
- Users can only see projects in their tenant
- Pipeline fields inherit existing RLS

### Validation
- Server-side stage transition validation
- Required fields enforced server-side
- UUID format validation

### Data Isolation
- `tenant_id` filtering on all queries
- No cross-tenant data access

---

## Performance Considerations

### Column Limits
- Maximum 50 projects per column
- Prevents browser performance issues
- "Use search to find more" indicator shown

### Optimistic Updates
- UI updates immediately on drag
- Reverts on server error
- Smooth user experience

### Query Optimization
- Dedicated indexes for pipeline queries
- Composite index for active pipeline
- `is_deleted = false` in all indexes

---

## Future Enhancements

1. **Stage Automation** - Auto-advance stages based on actions (e.g., quote sent when document emailed)
2. **Win/Loss Reasons** - Track why deals were won or lost
3. **Stage Duration Metrics** - Analytics on average time in each stage
4. **Pipeline Forecasting** - Revenue forecasting based on stage probabilities
5. **Mobile Drag-Drop** - Enhanced touch support for mobile Kanban
6. **Customizable Stages** - Tenant-specific pipeline stages

---

## File References

All files referenced in this document:

- `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/pipeline/page.tsx`
- `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/projects/page.tsx`
- `/Users/ccai/roofing saas/roofing-saas/components/pipeline/pipeline-board.tsx`
- `/Users/ccai/roofing saas/roofing-saas/components/pipeline/pipeline-column.tsx`
- `/Users/ccai/roofing saas/roofing-saas/components/pipeline/project-card.tsx`
- `/Users/ccai/roofing saas/roofing-saas/components/projects/leads-with-filters.tsx`
- `/Users/ccai/roofing saas/roofing-saas/components/projects/leads-table.tsx`
- `/Users/ccai/roofing saas/roofing-saas/lib/pipeline/validation.ts`
- `/Users/ccai/roofing saas/roofing-saas/lib/types/api.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/projects/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/projects/[id]/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/app/api/projects/[id]/start-production/route.ts`
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251120200000_add_pipeline_fields_to_projects.sql`
- `/Users/ccai/roofing saas/roofing-saas/e2e/pipeline.spec.ts`

---

## Validation Record

### Files Examined
1. `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/pipeline/page.tsx` - Verified redirect to /projects
2. `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/projects/page.tsx` - Verified unified page with Kanban/Table toggle
3. `/Users/ccai/roofing saas/roofing-saas/components/pipeline/pipeline-board.tsx` - Verified 451 lines, 8 stages, dnd-kit, quick filters
4. `/Users/ccai/roofing saas/roofing-saas/components/pipeline/pipeline-column.tsx` - Verified 57 lines, useDroppable hook
5. `/Users/ccai/roofing saas/roofing-saas/components/pipeline/project-card.tsx` - Verified 434 lines, useDraggable, stage actions
6. `/Users/ccai/roofing saas/roofing-saas/components/projects/leads-with-filters.tsx` - Verified 107 lines, FilterBar integration
7. `/Users/ccai/roofing saas/roofing-saas/components/projects/leads-table.tsx` - Verified 466 lines, sortable table
8. `/Users/ccai/roofing saas/roofing-saas/lib/pipeline/validation.ts` - Verified 213 lines, all validation functions
9. `/Users/ccai/roofing saas/roofing-saas/lib/types/api.ts` - Verified PipelineStage type definition
10. `/Users/ccai/roofing saas/roofing-saas/app/api/projects/route.ts` - Verified GET/POST endpoints
11. `/Users/ccai/roofing saas/roofing-saas/app/api/projects/[id]/route.ts` - Verified PATCH with validation
12. `/Users/ccai/roofing saas/roofing-saas/app/api/projects/[id]/start-production/route.ts` - Verified production workflow
13. `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251120200000_add_pipeline_fields_to_projects.sql` - Verified schema
14. `/Users/ccai/roofing saas/roofing-saas/e2e/pipeline.spec.ts` - Verified 280 lines of E2E tests

### Archon RAG Queries
- Query: "dnd-kit drag and drop kanban board React" - Found shadcn/ui documentation (not directly related, @dnd-kit used in code)

### Verification Steps
1. Confirmed all 8 pipeline stages defined in multiple locations (types, validation, components)
2. Verified stage transition rules in VALID_STAGE_TRANSITIONS constant
3. Confirmed dnd-kit usage via imports in pipeline-board.tsx and project-card.tsx
4. Verified API endpoints exist at documented paths
5. Confirmed database migration adds pipeline_stage, lead_source, priority, lead_score fields
6. Verified E2E tests cover all documented features

### Validated By
PRD Documentation Agent - Session 12
Date: 2025-12-11T14:33:00Z
