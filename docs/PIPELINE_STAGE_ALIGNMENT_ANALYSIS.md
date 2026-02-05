# Pipeline Stage Alignment Analysis: 8 to 18 Stages

**Analysis Date:** 2026-02-05
**Codebase:** `/Users/ccai/roofing-saas/roofing-saas/`
**Client:** Appalachian Storm Restoration (ASR)

---

## Executive Summary

This document analyzes the gap between the current 8-stage pipeline system and ASR's 18-stage workflow, evaluates three architectural approaches, and provides a recommendation with implementation guidance.

**Recommendation:** **Option B (Substatus System)** - Map ASR's 18 stages to substatuses within the current 8-stage structure. This approach requires zero schema changes, minimal migration risk, and leverages an existing system that was designed for exactly this purpose.

---

## 1. Current State Assessment

### 1.1 Current Pipeline Stages (8 stages)

Defined in `/lib/pipeline/constants.ts` and enforced via PostgreSQL enum `pipeline_stage`:

| Order | Stage Key    | Name        | Type   | Win Prob | Description                          |
|-------|-------------|-------------|--------|----------|--------------------------------------|
| 0     | prospect    | Prospect    | active | 10%      | Initial contact, not yet qualified   |
| 1     | qualified   | Qualified   | active | 25%      | Qualified lead with genuine interest |
| 2     | quote_sent  | Quote Sent  | active | 40%      | Quote/estimate has been sent         |
| 3     | negotiation | Negotiation | active | 60%      | In negotiations, addressing concerns |
| 4     | won         | Won         | won    | 100%     | Deal won, contract signed            |
| 5     | production  | Production  | active | 100%     | Job in progress                      |
| 6     | complete    | Complete    | won    | 100%     | Project completed                    |
| 7     | lost        | Lost        | lost   | 0%       | Opportunity lost                     |

### 1.2 Pipeline Stages Table Structure

From `/supabase/migrations/20251004000100_tenant_customization_system.sql`:

```sql
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  icon VARCHAR(50),
  stage_order INTEGER NOT NULL,
  stage_type VARCHAR(50) DEFAULT 'active',  -- 'active', 'won', 'lost'
  win_probability INTEGER DEFAULT 50,
  auto_actions JSONB DEFAULT '{
    "send_email": false,
    "send_sms": false,
    "create_task": false,
    "notify_manager": false
  }',
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  stage_key VARCHAR(50),  -- Links to pipeline_stage enum
  CONSTRAINT unique_stage_order UNIQUE (tenant_id, stage_order),
  CONSTRAINT unique_stage_key_per_tenant UNIQUE (tenant_id, stage_key)
);
```

**Key Observations:**
- `stage_key` links to the PostgreSQL enum (hard constraint)
- Per-tenant customization of name, color, description, auto_actions
- Cannot add new stage_key values without altering the PostgreSQL enum
- `auto_actions` field can trigger automations on stage entry

### 1.3 Substatus System (Existing)

From `/supabase/migrations/20251119000500_substatus_system.sql`:

```sql
CREATE TABLE IF NOT EXISTS status_substatus_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contacts', 'projects', 'activities')),
  status_field_name TEXT NOT NULL,  -- 'stage' for contacts, 'status' for projects
  status_value TEXT NOT NULL,        -- The parent status value
  substatus_value TEXT NOT NULL,     -- The substatus code
  substatus_label TEXT NOT NULL,     -- Display label
  substatus_description TEXT,
  display_order INT DEFAULT 0,
  color TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  is_terminal BOOLEAN DEFAULT false,
  auto_transition_to TEXT,           -- Auto-transition capability
  auto_transition_delay_hours INT,
  UNIQUE(tenant_id, entity_type, status_field_name, status_value, substatus_value)
);
```

**Substatus System Capabilities:**
- Per-tenant configuration
- Multiple substatuses per parent status
- Auto-default substatus when parent status changes
- Auto-transition between substatuses with delay
- Terminal substatus support (locks further changes)
- Color and icon customization
- Already triggers on projects table changes

**Current Default Substatuses for Projects:**
- estimate: site_visit_pending, measurements_taken, quote_prepared
- approved: contract_signed, deposit_received, materials_ordered
- scheduled: crew_assigned, permits_obtained
- in_progress: tear_off, installation, final_inspection
- completed: final_payment_received, warranty_issued

---

## 2. ASR's 18-Stage Workflow Analysis

### 2.1 ASR Stages with Categorization

| # | ASR Stage | Category | Insurance-Specific |
|---|-----------|----------|-------------------|
| 1 | Lead Creation | Sales | No |
| 2 | IRA Signed | Sales | Yes (Insurance Rep Agreement) |
| 3 | Waiting for Adjuster Meeting | Sales | Yes |
| 4 | Adjuster Meeting Scheduled | Sales | Yes |
| 5 | Waiting on Scope of Loss (SOL) | Sales | Yes |
| 6 | Scope Review | Sales | Yes |
| 7 | Not Fully Approved | Sales | Yes |
| 8 | Ready to Sign | Sales | No |
| 9 | Contract Signed / Perfect Packet | Won | No |
| 10 | Job Scheduled | Production | No |
| 11 | Material Ordering | Production | No |
| 12 | Install Week | Production | No |
| 13 | Additional Fixes | Production | No |
| 14 | All Trades Finished | Production | No |
| 15 | Invoice Carrier | Closing | Yes |
| 16 | Waiting on Money Release | Closing | Yes |
| 17 | Money Release | Closing | Yes |
| 18 | Ready to Close / Fully Funded | Complete | No |

### 2.2 Key Observations

1. **Insurance-Heavy Sales Process:** 7 of 18 stages are insurance-specific
2. **Detailed Production Tracking:** 5 distinct production phases
3. **Payment/Closing Process:** 4 stages for collecting insurance money
4. **Not Universal:** Most roofing companies don't have this granularity

---

## 3. Three Options Evaluated

### 3.1 Option A: Expand PostgreSQL Enum to ~18 Stages

**What This Means:**
- Alter the `pipeline_stage` enum to add ~10 new values
- Update all code that references the enum
- Migrate existing data

**Migration:**
```sql
ALTER TYPE pipeline_stage ADD VALUE 'ira_signed' AFTER 'prospect';
ALTER TYPE pipeline_stage ADD VALUE 'waiting_adjuster' AFTER 'ira_signed';
-- ... repeat for each new stage
```

**Pros:**
- Direct mapping to ASR's workflow
- Native PostgreSQL type safety
- Clear stage progression in code

**Cons:**
- **Breaking change for all tenants:** Non-insurance roofing companies would see irrelevant stages
- **Enum modification is irreversible:** Once added, enum values cannot be removed in PostgreSQL
- **Code changes throughout:** Every file using `PipelineStage` type needs updating
- **Multi-tenant complexity:** Different tenants need different stage sets
- **Future flexibility zero:** Any client with a different workflow requires more enum changes

**Affected Files:**
- `/lib/types/api.ts` - PipelineStage type
- `/lib/pipeline/constants.ts` - DEFAULT_PIPELINE_STAGES
- `/lib/pipeline/validation.ts` - VALID_STAGE_TRANSITIONS, STAGE_REQUIRED_FIELDS
- `/components/pipeline/pipeline-board.tsx` - DEFAULT_STAGES, VALID_STAGE_IDS
- All API routes using pipeline_stage

**Risk Level:** HIGH
**Effort:** HIGH
**Reversibility:** LOW (PostgreSQL enums cannot drop values)

---

### 3.2 Option B: Use Substatus System (RECOMMENDED)

**What This Means:**
- Keep current 8 stages as-is
- Map ASR's 18 stages as substatuses within parent stages
- Configure via `status_substatus_configs` table for ASR tenant only

**Proposed Mapping:**

| Parent Stage | Substatuses (for ASR) |
|-------------|----------------------|
| **prospect** | lead_created (default) |
| **qualified** | ira_signed, waiting_adjuster, adjuster_scheduled, waiting_sol, scope_review, not_fully_approved, ready_to_sign |
| **won** | contract_signed_perfect_packet (default) |
| **production** | job_scheduled, material_ordering, install_week, additional_fixes, all_trades_finished |
| **complete** | invoice_carrier, waiting_money_release, money_release, ready_to_close_fully_funded (default) |

**Implementation (ASR tenant only):**
```sql
INSERT INTO status_substatus_configs (tenant_id, entity_type, status_field_name, status_value, substatus_value, substatus_label, display_order, is_default)
SELECT
  t.id,
  'projects',
  'pipeline_stage',  -- Note: We need to add support for pipeline_stage field
  'qualified',
  'ira_signed',
  'IRA Signed',
  1,
  true
FROM tenants t WHERE t.subdomain = 'asr';
-- ... repeat for each substatus
```

**Pros:**
- **Zero schema changes:** No enum modifications
- **Per-tenant flexibility:** ASR gets 18 stages, others keep 8
- **System already exists:** Substatus infrastructure is production-ready
- **Reversible:** Can modify/remove substatuses anytime
- **Auto-transitions:** Can configure automatic substatus progression
- **Future-proof:** Any tenant can have custom workflows

**Cons:**
- Substatuses currently tied to `status` field, not `pipeline_stage`
- UI needs enhancement to show substatus prominently in pipeline view
- Reporting needs to handle substatus grouping

**Required Changes:**
1. Update substatus system to support `pipeline_stage` field name
2. Seed ASR-specific substatus configs
3. Update PipelineCard to display substatus
4. (Optional) Update pipeline column to show substatus breakdown

**Risk Level:** LOW
**Effort:** LOW-MEDIUM
**Reversibility:** HIGH

---

### 3.3 Option C: Hybrid (Expand to ~12 Stages + Substatuses)

**What This Means:**
- Expand enum to ~12 key stages that are industry-universal
- Use substatuses for insurance-specific variations

**Proposed Stages (12):**
```typescript
type PipelineStage =
  | 'prospect'           // Lead Creation
  | 'qualified'          // Interest confirmed
  | 'inspection'         // NEW: Site inspection / adjuster meeting
  | 'scope_review'       // NEW: Reviewing scope/estimate
  | 'quote_sent'         // Quote delivered
  | 'negotiation'        // Discussing terms
  | 'won'                // Contract signed
  | 'scheduled'          // NEW: Job on calendar
  | 'production'         // Work in progress
  | 'punch_out'          // NEW: Final fixes
  | 'complete'           // Work done
  | 'lost'               // Deal lost
```

**ASR Mapping with Substatuses:**

| Stage (12) | ASR Substatuses |
|-----------|-----------------|
| prospect | lead_created |
| qualified | ira_signed |
| inspection | waiting_adjuster, adjuster_scheduled |
| scope_review | waiting_sol, reviewing, not_fully_approved |
| quote_sent | ready_to_sign |
| won | contract_signed, perfect_packet |
| scheduled | material_ordering |
| production | install_week |
| punch_out | additional_fixes, all_trades_finished |
| complete | invoice_carrier, waiting_money, money_received, fully_funded |

**Pros:**
- More granular stages for all tenants
- Reduces substatus depth
- Stages like "inspection" and "scheduled" are universally useful

**Cons:**
- Still requires enum modification (irreversible)
- All existing tenants need data migration
- More complexity than Option B
- Code changes throughout codebase
- May not fit non-ASR workflows perfectly

**Risk Level:** MEDIUM-HIGH
**Effort:** HIGH
**Reversibility:** LOW

---

## 4. Detailed Stage-by-Stage Mapping

### Option B Mapping (Recommended)

| # | ASR Stage | Parent Pipeline Stage | Substatus Value | Notes |
|---|-----------|----------------------|-----------------|-------|
| 1 | Lead Creation | prospect | lead_created | Default substatus |
| 2 | IRA Signed | qualified | ira_signed | Insurance Rep Agreement |
| 3 | Waiting for Adjuster Meeting | qualified | waiting_adjuster | Adjuster coordination |
| 4 | Adjuster Meeting Scheduled | qualified | adjuster_scheduled | Date confirmed |
| 5 | Waiting on Scope of Loss | qualified | waiting_sol | Insurance documentation |
| 6 | Scope Review | qualified | scope_review | Internal review |
| 7 | Not Fully Approved | qualified | not_fully_approved | Supplemental needed |
| 8 | Ready to Sign | qualified | ready_to_sign | Customer ready |
| 9 | Contract Signed / Perfect Packet | won | contract_signed | Default on entry to Won |
| 10 | Job Scheduled | production | job_scheduled | On calendar |
| 11 | Material Ordering | production | material_ordering | Supplies ordered |
| 12 | Install Week | production | install_week | Active work |
| 13 | Additional Fixes | production | additional_fixes | Punch list |
| 14 | All Trades Finished | production | all_trades_finished | Work done |
| 15 | Invoice Carrier | complete | invoice_carrier | Bill sent to insurance |
| 16 | Waiting on Money Release | complete | waiting_money_release | Check processing |
| 17 | Money Release | complete | money_release | Payment received |
| 18 | Ready to Close / Fully Funded | complete | fully_funded | Terminal substatus |

---

## 5. Recommendation: Option B

### 5.1 Why Option B

1. **Lowest Risk:** No PostgreSQL enum changes, no data migration for existing tenants
2. **Highest Flexibility:** ASR gets their workflow, other tenants unaffected
3. **System Exists:** Substatus infrastructure is already built and tested
4. **Future-Proof:** Any new client can have custom stage granularity
5. **Reversible:** Can adjust substatus configs without code deploys

### 5.2 Implementation Plan

#### Phase 1: Extend Substatus System (1-2 days)

1. Update `set_default_substatus()` trigger to support `pipeline_stage` field:
   ```sql
   -- Add support for pipeline_stage field
   ELSIF TG_TABLE_NAME = 'projects' THEN
     entity_type_name := 'projects';
     status_field := 'pipeline_stage';  -- Changed from 'status'
     current_status_value := NEW.pipeline_stage::text;
   ```

2. Create migration to seed ASR substatus configs

#### Phase 2: UI Enhancement (2-3 days)

1. Update `PipelineCard` to show substatus badge/label
2. Add substatus dropdown/selector on card hover or click
3. Update column headers to optionally show substatus breakdown

#### Phase 3: ASR Data Seeding (1 day)

1. Seed all 18 substatuses for ASR tenant
2. Configure auto-defaults for each parent stage
3. Configure display order and colors

#### Phase 4: Optional Enhancements

1. Substatus filtering in pipeline view
2. Substatus-based automation triggers
3. Reporting by substatus

### 5.3 Migration Script (ASR Tenant)

```sql
-- Get ASR tenant ID (run this to find it first)
-- SELECT id FROM tenants WHERE subdomain = 'asr' OR name ILIKE '%appalachian%';

-- Assuming ASR tenant_id is stored, create all substatuses
WITH asr AS (SELECT id FROM tenants WHERE subdomain = 'asr')
INSERT INTO status_substatus_configs
  (tenant_id, entity_type, status_field_name, status_value, substatus_value, substatus_label, display_order, is_default, color)
SELECT
  asr.id,
  'projects',
  'pipeline_stage',
  v.status_value,
  v.substatus_value,
  v.substatus_label,
  v.display_order,
  v.is_default,
  v.color
FROM asr, (VALUES
  -- prospect substatuses
  ('prospect', 'lead_created', 'Lead Created', 1, true, 'gray'),

  -- qualified substatuses (insurance process)
  ('qualified', 'ira_signed', 'IRA Signed', 1, true, 'blue'),
  ('qualified', 'waiting_adjuster', 'Waiting for Adjuster', 2, false, 'yellow'),
  ('qualified', 'adjuster_scheduled', 'Adjuster Scheduled', 3, false, 'cyan'),
  ('qualified', 'waiting_sol', 'Waiting on SOL', 4, false, 'orange'),
  ('qualified', 'scope_review', 'Scope Review', 5, false, 'purple'),
  ('qualified', 'not_fully_approved', 'Not Fully Approved', 6, false, 'red'),
  ('qualified', 'ready_to_sign', 'Ready to Sign', 7, false, 'green'),

  -- won substatuses
  ('won', 'contract_signed', 'Contract Signed / Perfect Packet', 1, true, 'green'),

  -- production substatuses
  ('production', 'job_scheduled', 'Job Scheduled', 1, true, 'blue'),
  ('production', 'material_ordering', 'Material Ordering', 2, false, 'yellow'),
  ('production', 'install_week', 'Install Week', 3, false, 'orange'),
  ('production', 'additional_fixes', 'Additional Fixes', 4, false, 'purple'),
  ('production', 'all_trades_finished', 'All Trades Finished', 5, false, 'cyan'),

  -- complete substatuses (payment process)
  ('complete', 'invoice_carrier', 'Invoice Carrier', 1, true, 'blue'),
  ('complete', 'waiting_money_release', 'Waiting on Money Release', 2, false, 'yellow'),
  ('complete', 'money_release', 'Money Release', 3, false, 'green'),
  ('complete', 'fully_funded', 'Ready to Close / Fully Funded', 4, false, 'emerald')
) AS v(status_value, substatus_value, substatus_label, display_order, is_default, color)
ON CONFLICT (tenant_id, entity_type, status_field_name, status_value, substatus_value) DO UPDATE
SET substatus_label = EXCLUDED.substatus_label,
    display_order = EXCLUDED.display_order,
    is_default = EXCLUDED.is_default,
    color = EXCLUDED.color;
```

---

## 6. Appendix: File References

### Key Files Analyzed

| File | Purpose |
|------|---------|
| `/lib/pipeline/constants.ts` | Default pipeline stage definitions |
| `/lib/pipeline/validation.ts` | Stage transition rules |
| `/lib/types/api.ts` | PipelineStage TypeScript type |
| `/components/pipeline/pipeline-board.tsx` | Pipeline UI component |
| `/supabase/migrations/20251120200000_add_pipeline_fields_to_projects.sql` | Pipeline stage enum creation |
| `/supabase/migrations/20251119000500_substatus_system.sql` | Substatus system implementation |
| `/supabase/migrations/20251004000100_tenant_customization_system.sql` | Pipeline stages table |
| `/app/api/settings/pipeline-stages/route.ts` | Pipeline stages API |

### Database Tables Involved

| Table | Role |
|-------|------|
| `projects` | Has `pipeline_stage` and `substatus` columns |
| `pipeline_stages` | Per-tenant stage customization |
| `status_substatus_configs` | Substatus definitions |

---

## 7. Decision Matrix

| Criteria | Option A (18 Stages) | Option B (Substatus) | Option C (Hybrid 12) |
|----------|---------------------|---------------------|---------------------|
| Risk Level | HIGH | LOW | MEDIUM-HIGH |
| Development Effort | 3-5 days | 2-4 days | 4-6 days |
| Schema Changes | Enum alteration | None | Enum alteration |
| Multi-tenant Impact | All tenants affected | ASR only | All tenants affected |
| Reversibility | Cannot remove enum values | Full reversibility | Cannot remove enum values |
| Future Flexibility | New clients need code changes | Per-tenant config | Moderate flexibility |
| UI Complexity | New columns for each stage | Substatus display | New columns + substatuses |
| **Recommendation** | NO | YES | NO |

---

**Document Prepared For:** Clarity AI Engineering
**Prepared By:** Claude (Pipeline Analysis Agent)
**Status:** Ready for Review
