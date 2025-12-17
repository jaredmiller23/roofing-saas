# Automation Architecture

**Status**: DUAL IMPLEMENTATION (Consolidation Needed)
**Date**: December 17, 2025
**Author**: System Analysis (VEST-P4-001)

---

## Executive Summary

The Roofing SaaS automation system has **two independent workflow engines** operating in parallel:

1. **Server-Side Engine** (`lib/automation/engine.ts`) - Database-backed, production-ready
2. **Client-Side Engine** (`lib/automation/workflow-engine.ts`) - OOP-based, client-facing

**Critical Finding**: Both engines are in production use with different data models and architectures. This creates maintenance burden, potential data inconsistency, and confusion for developers.

**Recommendation**: Consolidate to a single unified architecture (details in Consolidation Strategy section).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     AUTOMATION SYSTEM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────┐   ┌──────────────────────────┐   │
│  │   SERVER-SIDE ENGINE     │   │   CLIENT-SIDE ENGINE     │   │
│  │  (lib/automation/...)    │   │  (lib/automation/...)    │   │
│  │                          │   │                          │   │
│  │  ├─ engine.ts           │   │  ├─ workflow-engine.ts   │   │
│  │  ├─ executors.ts        │   │  ├─ trigger-manager.ts   │   │
│  │  ├─ variables.ts        │   │  ├─ action-executor.ts   │   │
│  │  └─ types.ts            │   │  └─ workflow-types.ts    │   │
│  └──────────────────────────┘   └──────────────────────────┘   │
│           │                               │                     │
│           │                               │                     │
│  ┌────────▼──────────────┐       ┌───────▼─────────────────┐  │
│  │   DATABASE TABLES     │       │   IN-MEMORY STATE       │  │
│  │  - workflows          │       │  - Map&lt;id, Workflow&gt;  │  │
│  │  - workflow_steps     │       │  - Map&lt;id, Execution&gt; │  │
│  │  - executions         │       │  - EventListeners       │  │
│  │  - step_executions    │       │  - Scheduled Timers     │  │
│  └───────────────────────┘       └─────────────────────────┘  │
│           │                               │                     │
│  ┌────────▼──────────────────────────────▼─────────────────┐  │
│  │                  PRODUCTION APIs                         │  │
│  │  - /api/workflows/trigger         (Server Engine)       │  │
│  │  - /api/contacts (POST)           (Server Engine)       │  │
│  │  - /api/projects/[id] (PATCH)     (Server Engine)       │  │
│  │  - /api/jobs/[id] (PATCH)         (Server Engine)       │  │
│  │  - /api/automations/execute       (Client Engine)       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Engine 1: Server-Side Engine (Database-Backed)

### Overview
**File**: `lib/automation/engine.ts` (296 lines)
**Pattern**: Functional, database-driven
**Storage**: PostgreSQL via Supabase
**Runtime**: Server-side only (Next.js API routes)

### Data Model

```typescript
// Database tables (workflows, workflow_steps, workflow_executions, workflow_step_executions)
interface Workflow {
  id: string
  tenant_id: string
  name: string
  trigger_type: TriggerType  // Simple enum: 'contact_created', 'project_status_changed', etc.
  trigger_config: Record<string, unknown>
  is_active: boolean
}

interface WorkflowStep {
  id: string
  workflow_id: string
  step_order: number
  step_type: StepType  // 'send_sms', 'send_email', 'create_task', etc.
  step_config: Record<string, unknown>
  delay_minutes: number
}
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SERVER ENGINE DATA FLOW                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Event Occurs (contact created, project updated, job completed)  │
│                              │                                       │
│                              ▼                                       │
│  2. API Route calls triggerWorkflow(tenantId, triggerType, data)   │
│                              │                                       │
│                              ▼                                       │
│  3. Query Database: Find active workflows matching trigger_type     │
│     SELECT * FROM workflows                                          │
│     WHERE tenant_id = ? AND trigger_type = ? AND is_active = true   │
│                              │                                       │
│                              ▼                                       │
│  4. Check trigger_config matches trigger_data                       │
│     (e.g., stage === 'won' when trigger requires it)                │
│                              │                                       │
│                              ▼                                       │
│  5. Create workflow_executions record (status: 'pending')           │
│                              │                                       │
│                              ▼                                       │
│  6. Start async execution: executeWorkflow(executionId)             │
│                              │                                       │
│                              ▼                                       │
│  7. Update execution status → 'running'                             │
│                              │                                       │
│                              ▼                                       │
│  8. Query workflow_steps ordered by step_order                      │
│                              │                                       │
│                              ▼                                       │
│  9. FOR EACH step IN steps:                                         │
│     ├─ Create workflow_step_executions record                       │
│     ├─ Replace variables ({{trigger.contact_name}})                 │
│     ├─ Execute step via executeStep(type, config)                   │
│     │  └─ Calls executors.ts (sendSMS, sendEmail, createTask)       │
│     ├─ Save result to step_executions.result_data                   │
│     └─ Handle delay_minutes (setTimeout in production = BAD!)       │
│                              │                                       │
│                              ▼                                       │
│  10. Update execution status → 'completed' or 'failed'              │
│                              │                                       │
│                              ▼                                       │
│  11. Return execution_ids to API caller                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Production Usage

**Primary Engine in Production**. Used by:

1. **`/api/workflows/trigger` (POST)**
   - Manual workflow testing endpoint
   - Validates trigger_type and trigger_data
   - Calls `triggerWorkflow(tenantId, triggerType, triggerData)`

2. **`/api/contacts` (POST)**
   - When new contact is created
   - Triggers `contact_created` workflows
   - Non-blocking (`.catch()` logs errors)

3. **`/api/projects/[id]` (PATCH)**
   - When pipeline_stage changes
   - Triggers `pipeline_stage_changed` workflows
   - Triggers `project_won` when stage → 'won'
   - Non-blocking

4. **`/api/jobs/[id]` (PATCH)**
   - When job status → 'completed'
   - Triggers `job_completed` workflows
   - Updates project to 'complete' stage
   - Non-blocking

### Code Example

```typescript
// From app/api/contacts/route.ts (line 206)
triggerWorkflow(tenantId, 'contact_created', {
  contact_id: contact.id,
  contact: contact,
  user_id: user.id,
}).catch((error) => {
  logger.error('Failed to trigger contact_created workflows', { error })
})
```

### Strengths
- ✅ **Persistent**: All executions stored in database
- ✅ **Scalable**: Database-driven, can handle large volumes
- ✅ **Debuggable**: Full execution history in workflow_executions table
- ✅ **Multi-tenant safe**: RLS policies enforce tenant isolation
- ✅ **Production-ready**: Already handling real automation flows

### Weaknesses
- ⚠️ **Delay handling**: Uses `setTimeout()` for delays (bad in serverless!)
- ⚠️ **No job queue**: Should use Redis/Bull for delayed actions
- ⚠️ **Simple triggers**: No complex condition evaluation
- ⚠️ **No branching**: Linear step execution only

---

## Engine 2: Client-Side Engine (OOP-Based)

### Overview
**File**: `lib/automation/workflow-engine.ts` (387 lines)
**Pattern**: Object-oriented, event-driven
**Storage**: In-memory (Maps), API calls for persistence
**Runtime**: Client-side (browser) + API routes

### Components

1. **WorkflowEngine** (workflow-engine.ts)
   - Orchestrates trigger evaluation and action execution
   - Manages in-memory state: `activeExecutions`, workflow registry
   - Evaluates conditions (AND/OR logic, operators)

2. **TriggerManager** (trigger-manager.ts, 460 lines)
   - Event detection and workflow triggering
   - Client-side event listeners
   - Scheduled triggers (setInterval)
   - Time-elapsed checking

3. **ActionExecutor** (action-executor.ts, 592 lines)
   - Executes workflow actions
   - Template variable interpolation
   - Comprehensive action types (email, SMS, tasks, webhooks, etc.)

### Data Model

```typescript
// From workflow-types.ts (393 lines)
interface Workflow {
  id: string
  tenant_id: string
  name: string
  status: 'active' | 'draft' | 'paused' | 'archived'
  trigger: WorkflowTrigger  // Complex object with config
  actions: WorkflowAction[]  // Array of actions with order
  conditions?: WorkflowCondition[]  // Optional AND/OR logic
  execution_count: number
}

interface WorkflowTrigger {
  id: string
  type: TriggerType  // Extended: includes 'manual', 'scheduled', 'time_elapsed'
  config: TriggerConfig  // Union type of 10+ config types
  enabled: boolean
}

interface WorkflowAction {
  id: string
  type: ActionType
  config: ActionConfig  // Union type of 11 action types
  delay?: number  // Delay in hours
  enabled: boolean
  order: number
}
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CLIENT ENGINE DATA FLOW                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Engine initializes on module load (client-side only)            │
│     workflowEngine.initialize()                                      │
│                              │                                       │
│                              ▼                                       │
│  2. TriggerManager.initialize()                                     │
│     ├─ Load active workflows via fetch('/api/automations')          │
│     ├─ Register triggers in eventListeners Map                      │
│     └─ Set up scheduled/time_elapsed timers (setInterval)           │
│                              │                                       │
│                              ▼                                       │
│  3. Event Occurs (e.g., contact created)                            │
│     ├─ App calls triggerManager.handleContactCreated(data)          │
│     └─ Or manual: workflowEngine.triggerManual(workflowId)          │
│                              │                                       │
│                              ▼                                       │
│  4. TriggerManager finds matching workflows                         │
│     ├─ Filter by trigger type                                       │
│     ├─ Match trigger config (contact_type, stage, etc.)             │
│     └─ For each match: engine.executeWorkflow(workflow, data)       │
│                              │                                       │
│                              ▼                                       │
│  5. WorkflowEngine.executeWorkflow()                                │
│     ├─ Create WorkflowExecution object (in-memory)                  │
│     ├─ Evaluate conditions (AND/OR logic, operators)                │
│     └─ If conditions pass, execute actions                          │
│                              │                                       │
│                              ▼                                       │
│  6. FOR EACH action IN workflow.actions (sorted by order):          │
│     ├─ If delay &gt; 0: scheduleDelayedAction() (setTimeout)          │
│     └─ Else: actionExecutor.executeAction(action, context, data)    │
│                              │                                       │
│                              ▼                                       │
│  7. ActionExecutor executes action                                  │
│     ├─ Interpolate template variables {{contact.name}}              │
│     ├─ Switch on action.type:                                       │
│     │  ├─ send_email → fetch('/api/notifications/email')            │
│     │  ├─ send_sms → fetch('/api/notifications/sms')                │
│     │  ├─ create_task → fetch('/api/tasks')                         │
│     │  ├─ update_field → fetch('/api/contacts/:id')                 │
│     │  ├─ webhook → fetch(config.url)                               │
│     │  └─ wait → setTimeout(config.duration)                        │
│     └─ Return ActionExecution result                                │
│                              │                                       │
│                              ▼                                       │
│  8. Update execution status (completed/failed)                      │
│                              │                                       │
│                              ▼                                       │
│  9. Save execution via fetch('/api/automations/executions')         │
│                              │                                       │
│                              ▼                                       │
│  10. Update stats via fetch('/api/automations/:id/stats')           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Production Usage

**Secondary Engine in Production**. Used by:

1. **`/api/automations/execute` (POST)**
   - Manual workflow execution from UI
   - Fetches workflow definition
   - Calls `workflowEngine.executeWorkflow(workflow, triggerData, context)`
   - Returns execution summary

2. **`/api/automations/execute` (PUT)**
   - Manual trigger endpoint
   - Calls `workflowEngine.triggerManual(workflowId, manualData)`

### Code Example

```typescript
// From app/api/automations/execute/route.ts (line 42)
const execution = await workflowEngine.executeWorkflow(
  workflow,
  trigger_data,
  executionContext
)
```

### Strengths
- ✅ **Rich features**: Conditions, branching, complex triggers
- ✅ **Type-safe**: Comprehensive TypeScript definitions (393 lines)
- ✅ **Flexible**: 10+ trigger types, 11+ action types
- ✅ **Testable**: `testWorkflow()` method for dry runs
- ✅ **Event-driven**: TriggerManager handles complex event scenarios

### Weaknesses
- ⚠️ **Client-side bias**: Designed for browser, uses `window`, `fetch('/api/...')`
- ⚠️ **Memory leaks**: `setInterval` for scheduled triggers never cleared
- ⚠️ **No persistence**: In-memory state lost on server restart
- ⚠️ **Separate data model**: Incompatible with server engine's database schema
- ⚠️ **API dependency**: Every action calls an API endpoint (latency)

---

## Key Differences

| Aspect | Server Engine | Client Engine |
|--------|---------------|---------------|
| **Architecture** | Functional, database-driven | OOP, event-driven |
| **Storage** | PostgreSQL (persistent) | In-memory Maps (volatile) |
| **Triggers** | Simple enum, config matching | Complex objects, typed configs |
| **Actions** | 7 types (via executors.ts) | 11 types (via action-executor.ts) |
| **Conditions** | None | AND/OR logic, 12 operators |
| **Variable Syntax** | `{{trigger.field}}` | `{{contact.field}}`, `{{project.field}}` |
| **Execution** | Sequential, database-tracked | Sequential, in-memory |
| **Delays** | `setTimeout()` (bad!) | `setTimeout()` (also bad!) |
| **Error Handling** | Try/catch, DB updates | Try/catch, API calls |
| **Testing** | Manual trigger endpoint | `testWorkflow()` method |
| **Production Use** | Primary (4 API routes) | Secondary (1 API route) |

---

## Dead Code Analysis

### Likely Dead Code

1. **`lib/automation/workflow-engine.ts`** - Partially dead
   - ✅ **Used**: `executeWorkflow()`, `triggerManual()` (via `/api/automations/execute`)
   - ⚠️ **Unused**: `loadActiveWorkflows()`, `initialize()` (client-side only)
   - ⚠️ **Unused**: `getExecutionHistory()`, `cancelExecution()` (no callers found)

2. **`lib/automation/trigger-manager.ts`** - Mostly dead
   - ⚠️ **Unused**: All event handlers (`handleContactCreated`, `handleContactUpdated`, etc.)
   - ⚠️ **Unused**: Scheduled trigger setup (`setupScheduledTriggers`, `setupTimeElapsedTrigger`)
   - 💡 **Why?**: Server engine bypasses TriggerManager entirely

3. **`lib/automation/action-executor.ts`** - Mostly dead
   - ✅ **Used**: Called by workflow-engine when manual execution triggered
   - ⚠️ **Problem**: Duplicates functionality in `executors.ts`
   - 💡 **11 action types vs 7** - client engine more comprehensive but unused

### Code Duplication

**Variable Replacement**: Two implementations
- `lib/automation/variables.ts` (87 lines) - Used by server engine
- `ActionExecutor.interpolateTemplate()` - Used by client engine

**SMS/Email Actions**: Two implementations
- `executors.ts:executeSendSMS()` - Server engine (calls Twilio directly)
- `action-executor.ts:executeSendSMS()` - Client engine (calls `/api/notifications/sms`)

---

## Production Workflow Examples

### Example 1: Contact Created (Server Engine)

```typescript
// Workflow in database:
{
  trigger_type: 'contact_created',
  trigger_config: { type: 'lead' },
  steps: [
    {
      step_order: 1,
      step_type: 'send_sms',
      step_config: {
        to: '{{trigger.contact.phone}}',
        body: 'Thanks for your interest, {{trigger.contact.first_name}}!'
      }
    },
    {
      step_order: 2,
      step_type: 'create_task',
      step_config: {
        title: 'Follow up with {{trigger.contact.first_name}}',
        due_date_days: 1
      },
      delay_minutes: 1440  // 24 hours
    }
  ]
}

// Triggered by:
// POST /api/contacts → triggerWorkflow('contact_created', {...})
```

### Example 2: Project Won (Server Engine)

```typescript
// Workflow in database:
{
  trigger_type: 'project_won',
  trigger_config: {},
  steps: [
    {
      step_order: 1,
      step_type: 'send_email',
      step_config: {
        to: '{{trigger.contact.email}}',
        subject: 'Congratulations! Your project is approved',
        html: '&lt;p&gt;We\'re excited to work with you...&lt;/p&gt;'
      }
    }
  ]
}

// Triggered by:
// PATCH /api/projects/:id { pipeline_stage: 'won' }
```

### Example 3: Manual Workflow (Client Engine)

```typescript
// Workflow fetched from /api/automations/:id
{
  trigger: { type: 'manual' },
  actions: [
    {
      type: 'send_sms',
      config: { to: '{{contact.phone}}', message: 'Test message' }
    }
  ],
  conditions: [
    { field: 'contact.stage', operator: 'equals', value: 'lead' }
  ]
}

// Triggered by:
// POST /api/automations/execute { workflow_id, trigger_data }
```

---

## Consolidation Strategy

### Recommended Approach: Hybrid Unified Engine

**Goal**: Single engine that combines the best of both architectures.

### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    UNIFIED ENGINE                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Core: Server-side, database-backed (keep engine.ts foundation)  │
│  Extensions: Rich features from workflow-engine.ts               │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  TRIGGER SYSTEM (Enhanced)                                 │ │
│  │  ├─ Keep: Simple trigger_type enum + trigger_config        │ │
│  │  ├─ Add: Condition evaluation (from workflow-engine)       │ │
│  │  └─ Add: Scheduled/time-based triggers (via job queue)     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  ACTION SYSTEM (Merged)                                    │ │
│  │  ├─ Keep: Direct execution (executors.ts)                  │ │
│  │  ├─ Add: 11 action types from action-executor.ts           │ │
│  │  └─ Add: Action ordering + enabled flags                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  EXECUTION ENGINE (Hybrid)                                 │ │
│  │  ├─ Keep: Database-backed execution tracking               │ │
│  │  ├─ Add: Condition evaluation before execution             │ │
│  │  ├─ Replace: setTimeout → Job queue (BullMQ/Redis)         │ │
│  │  └─ Add: Manual execution API endpoint                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  VARIABLE SYSTEM (Unified)                                 │ │
│  │  ├─ Merge: variables.ts + ActionExecutor interpolation     │ │
│  │  ├─ Support: {{trigger.*}}, {{contact.*}}, {{project.*}}   │ │
│  │  └─ Add: Helper functions (formatDate, formatCurrency)     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Migration Steps

#### Phase 1: Database Schema Updates (Week 1)
```sql
-- Add new columns to workflows table
ALTER TABLE workflows ADD COLUMN conditions JSONB DEFAULT '[]';
ALTER TABLE workflows ADD COLUMN metadata JSONB DEFAULT '{}';

-- Add new columns to workflow_steps table
ALTER TABLE workflow_steps ADD COLUMN enabled BOOLEAN DEFAULT true;
ALTER TABLE workflow_steps ADD COLUMN conditions JSONB DEFAULT '[]';

-- Add workflow_actions table (normalized version of steps)
CREATE TABLE workflow_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,  -- 'send_email', 'send_sms', etc.
  action_config JSONB NOT NULL,
  order_index INTEGER NOT NULL,
  delay_hours INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Phase 2: Merge Variable Systems (Week 1)
```typescript
// lib/automation/variables-unified.ts
export function replaceVariables(
  input: unknown,
  context: {
    trigger?: Record<string, unknown>
    contact?: Record<string, unknown>
    project?: Record<string, unknown>
    user?: Record<string, unknown>
    custom?: Record<string, unknown>
  }
): unknown {
  // Merge logic from variables.ts + action-executor interpolation
  // Support both {{trigger.field}} and {{contact.field}}
}
```

#### Phase 3: Merge Action Executors (Week 2)
```typescript
// lib/automation/actions-unified.ts
import { sendSMS } from '@/lib/twilio/sms'
import { sendEmail } from '@/lib/resend/email'

// Keep direct execution from executors.ts
// Add 11 action types from action-executor.ts
// Unified interface:
export async function executeAction(
  actionType: ActionType,
  config: Record<string, unknown>,
  context: VariableContext
): Promise<ActionResult> {
  switch (actionType) {
    case 'send_sms': return executeSendSMS(config, context)
    case 'send_email': return executeSendEmail(config, context)
    case 'create_task': return executeCreateTask(config, context)
    case 'update_field': return executeUpdateField(config, context)
    case 'webhook': return executeWebhook(config, context)
    // ... 6 more action types
  }
}
```

#### Phase 4: Add Condition Evaluation (Week 2)
```typescript
// lib/automation/conditions.ts
import { WorkflowCondition } from './types'

export function evaluateConditions(
  conditions: WorkflowCondition[],
  context: Record<string, unknown>
): boolean {
  // Port logic from workflow-engine.ts:evaluateConditions()
  // Support AND/OR, 12 operators
}

// Integrate into engine.ts:executeWorkflow()
if (workflow.conditions && !evaluateConditions(workflow.conditions, context)) {
  // Skip execution
  return []
}
```

#### Phase 5: Replace setTimeout with Job Queue (Week 3)
```typescript
// lib/automation/queue.ts
import Queue from 'bull'

const workflowQueue = new Queue('workflows', process.env.REDIS_URL)

// Process jobs
workflowQueue.process(async (job) => {
  const { executionId, stepId } = job.data
  await executeWorkflowStep(executionId, stepId)
})

// Schedule delayed action
export async function scheduleDelayedAction(
  executionId: string,
  stepId: string,
  delayHours: number
) {
  await workflowQueue.add(
    { executionId, stepId },
    { delay: delayHours * 60 * 60 * 1000 }
  )
}
```

#### Phase 6: Unified API Layer (Week 3)
```typescript
// app/api/workflows/execute/route.ts (NEW)
export async function POST(request: NextRequest) {
  // Replaces both:
  // - /api/workflows/trigger
  // - /api/automations/execute

  const { workflow_id, trigger_type, trigger_data } = await request.json()

  if (workflow_id) {
    // Manual execution (from UI)
    return executeWorkflowById(workflow_id, trigger_data)
  } else {
    // Automatic trigger (from events)
    return triggerWorkflows(trigger_type, trigger_data)
  }
}
```

#### Phase 7: Deprecate Old Code (Week 4)
```typescript
// Mark as deprecated
/** @deprecated Use lib/automation/engine-unified.ts instead */
export { workflowEngine } from './workflow-engine'

// Add console warnings
if (process.env.NODE_ENV === 'development') {
  console.warn('workflow-engine.ts is deprecated, use engine-unified.ts')
}

// Update imports across codebase
// Remove after 1 sprint of testing
```

### Testing Strategy

1. **Unit Tests**: Test each merged component individually
   - `variables-unified.test.ts`
   - `actions-unified.test.ts`
   - `conditions.test.ts`

2. **Integration Tests**: Test complete workflow execution
   - Server engine scenarios (contact_created, project_won)
   - Client engine scenarios (manual execution, conditions)

3. **Migration Tests**: Verify data compatibility
   - Old workflow definitions work with new engine
   - Execution history preserved

4. **Performance Tests**: Ensure no regression
   - Benchmark: 100 workflows triggered simultaneously
   - Benchmark: 1000 delayed actions scheduled

---

## Risk Assessment

### High Risk
- ⚠️ **Data Loss**: Migrating workflow definitions from old to new schema
- ⚠️ **Broken Automations**: Existing workflows stop working during migration
- ⚠️ **Performance Regression**: Unified engine slower than specialized engines

### Medium Risk
- ⚠️ **API Breaking Changes**: Client code depends on `/api/automations/execute`
- ⚠️ **Variable Syntax Changes**: `{{trigger.*}}` vs `{{contact.*}}`
- ⚠️ **Condition Evaluation Bugs**: Complex AND/OR logic edge cases

### Low Risk
- ⚠️ **Job Queue Complexity**: Redis/BullMQ infrastructure setup
- ⚠️ **Type Safety**: Merging two type systems (types.ts + workflow-types.ts)

### Mitigation Strategies

1. **Feature Flags**: Enable unified engine gradually
   ```typescript
   const USE_UNIFIED_ENGINE = process.env.UNIFIED_ENGINE === 'true'
   ```

2. **Parallel Running**: Run both engines side-by-side for 1 sprint
   - Log discrepancies
   - Verify identical behavior

3. **Database Backups**: Snapshot workflows table before migration

4. **Rollback Plan**: Keep old code for 2 sprints, can revert quickly

---

## Alternative Approaches

### Option A: Keep Both Engines (NOT RECOMMENDED)
**Pros**:
- No migration risk
- Each engine optimized for its use case

**Cons**:
- ❌ Maintenance burden (2x code, 2x bugs)
- ❌ Developer confusion (which engine for what?)
- ❌ Feature drift (updates to one but not the other)
- ❌ Data inconsistency (two execution models)

### Option B: Client Engine Only (NOT RECOMMENDED)
**Pros**:
- Richer feature set
- Better types

**Cons**:
- ❌ Client-side bias (needs refactoring for server)
- ❌ No persistent execution tracking
- ❌ Memory leaks (setInterval)
- ❌ API latency (every action = API call)

### Option C: Server Engine Only (VIABLE)
**Pros**:
- Already in production
- Database-backed
- Simple, proven

**Cons**:
- ⚠️ Missing features (conditions, branching)
- ⚠️ No job queue (setTimeout is bad)
- ⚠️ Limited action types (7 vs 11)

**Verdict**: Better than status quo, but Hybrid approach is superior.

---

## Immediate Action Items

### Critical (Do First)
1. **Fix setTimeout() issue** (both engines)
   - Replace with job queue (BullMQ/Redis)
   - Prevents delayed actions from being lost on server restart

2. **Add execution monitoring**
   - Dashboard: View running workflows
   - Alerts: Notify on failed executions

3. **Document current usage**
   - Which API routes use which engine?
   - Which workflows are in production?

### Short-term (This Sprint)
4. **Feature flag unified engine**
   - Environment variable: `UNIFIED_ENGINE=true`
   - Test in staging

5. **Create migration script**
   - Convert existing workflows to unified schema
   - Dry-run validation

### Long-term (Next Quarter)
6. **Complete consolidation**
   - Deprecate old engines
   - Remove dead code
   - Single source of truth

7. **Advanced features**
   - Workflow versioning
   - A/B testing workflows
   - Visual workflow builder

---

## References

### Files Analyzed
- `lib/automation/engine.ts` (296 lines) - Server engine
- `lib/automation/workflow-engine.ts` (387 lines) - Client engine
- `lib/automation/trigger-manager.ts` (460 lines) - Event manager
- `lib/automation/action-executor.ts` (592 lines) - Action executor
- `lib/automation/executors.ts` (270 lines) - Server executors
- `lib/automation/types.ts` (143 lines) - Server types
- `lib/automation/variables.ts` (87 lines) - Variable replacement
- `lib/automation/workflow-types.ts` (393 lines) - Client types

### API Routes Analyzed
- `app/api/workflows/trigger/route.ts` - Server engine trigger
- `app/api/automations/execute/route.ts` - Client engine execution
- `app/api/contacts/route.ts` - contact_created trigger
- `app/api/projects/[id]/route.ts` - pipeline_stage_changed, project_won
- `app/api/jobs/[id]/route.ts` - job_completed trigger

### Database Schema
- `supabase/migrations/archive/infrastructure/20251001_automation_workflows.sql`
  - Tables: workflows, workflow_steps, workflow_executions, workflow_step_executions
  - RLS policies for multi-tenant isolation
  - Indexes for performance

---

## Appendix: Type Definitions Comparison

### Server Engine Types (types.ts)
```typescript
type TriggerType =
  | 'contact_created'
  | 'contact_updated'
  | 'project_created'
  | 'project_status_changed'
  | 'pipeline_stage_changed'
  | 'project_won'
  | 'job_completed'
  | 'call_missed'
  | 'call_completed'
  | 'email_opened'
  | 'email_clicked'
  | 'sms_received'
  | 'form_submitted'

type StepType =
  | 'send_sms'
  | 'send_email'
  | 'create_task'
  | 'update_contact'
  | 'update_project'
  | 'wait'
  | 'conditional'
  | 'webhook'
```

### Client Engine Types (workflow-types.ts)
```typescript
type TriggerType =
  | 'contact_created'
  | 'contact_updated'
  | 'stage_changed'
  | 'field_changed'
  | 'time_elapsed'
  | 'scheduled'
  | 'form_submitted'
  | 'project_created'
  | 'project_status_changed'
  | 'manual'

type ActionType =
  | 'send_email'
  | 'send_sms'
  | 'create_task'
  | 'update_field'
  | 'change_stage'
  | 'assign_user'
  | 'add_tag'
  | 'remove_tag'
  | 'webhook'
  | 'wait'
  | 'create_project'
```

### Merged Types (Proposed)
```typescript
type TriggerType =
  // Contact events
  | 'contact_created'
  | 'contact_updated'
  | 'stage_changed'      // From client
  | 'field_changed'      // From client

  // Project events
  | 'project_created'
  | 'project_status_changed'
  | 'pipeline_stage_changed'
  | 'project_won'

  // Job events
  | 'job_completed'

  // Communication events
  | 'call_missed'
  | 'call_completed'
  | 'email_opened'
  | 'email_clicked'
  | 'sms_received'

  // Form events
  | 'form_submitted'

  // Time-based (from client)
  | 'time_elapsed'
  | 'scheduled'

  // Manual (from client)
  | 'manual'

type ActionType =
  // Communication
  | 'send_email'
  | 'send_sms'

  // Tasks
  | 'create_task'

  // Contact updates
  | 'update_contact'     // Merge with update_field
  | 'update_field'
  | 'change_stage'
  | 'assign_user'
  | 'add_tag'
  | 'remove_tag'

  // Project updates
  | 'update_project'
  | 'create_project'

  // Integrations
  | 'webhook'

  // Flow control
  | 'wait'
  | 'conditional'
```

---

**End of Document**
