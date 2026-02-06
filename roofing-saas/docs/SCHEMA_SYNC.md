# Schema Sync Guide

How database columns, Zod validation schemas, and form components relate to each other — and how to keep them in sync.

## Why This Matters

Each entity has three sources of truth that must agree:

1. **DB Migration** — what columns exist in Postgres
2. **Zod Schema** — what the API validates and accepts
3. **Form Component** — what the UI exposes to users

When these drift apart, you get:
- Silent data loss (form sends a field, Zod strips it)
- Runtime errors (Zod accepts a field that doesn't exist in the DB)
- Invisible fields (DB column exists but no UI to populate it)

## Entity Map

### Contact

| Layer | File |
|-------|------|
| DB Migration | `supabase/migrations/20251119000600_merge_organizations_into_contacts.sql` |
| Zod Schema | `lib/validations/contact.ts` |
| Form Component | `components/contacts/contact-form.tsx` |

**Status**: In sync. All three layers cover the same field set.

**Key fields**: `first_name`*, `last_name`*, `email`, `phone`, `mobile_phone`, `company`, `contact_category`, `type`, `stage`, `priority`, `assigned_to`, `source`, address fields, property fields (`property_type`, `roof_type`, `roof_age`, `square_footage`, `stories`), insurance fields (`insurance_carrier`, `policy_number`, `claim_number`, `deductible`), TCPA consent fields (`text_consent`, `auto_text_consent`, `auto_call_consent`, `recording_consent`), `tags`, `custom_fields`.

**Notes**:
- `contact_category` is `NOT NULL` in DB but optional in Zod — relies on DB default
- Form has duplicate detection on email/phone blur
- `is_organization` toggle controls company/website field visibility

---

### Task

| Layer | File |
|-------|------|
| DB Migration | `supabase/migrations/20251003000300_tasks_table.sql` |
| Zod Schema | `lib/validations/task.ts` |
| Form Component | `components/tasks/TaskFormEnhanced.tsx` |

**Status**: DRIFTED. Zod schema defines fields not present in the DB migration.

**Fields in Zod but NOT in migration**:

| Field | In Zod | In DB | Risk |
|-------|--------|-------|------|
| `start_date` | `z.string().optional()` | Missing | Silently dropped on insert |
| `parent_task_id` | `z.string().uuid().optional()` | Missing | Silently dropped on insert |
| `progress` | `z.number().min(0).max(100)` | Missing | Silently dropped on insert |
| `estimated_hours` | `z.number().min(0)` | Missing | Silently dropped on insert |
| `actual_hours` | `z.number().min(0)` | Missing | Silently dropped on insert |
| `reminder_enabled` | `z.boolean()` | Missing | Silently dropped on insert |
| `reminder_date` | `z.string().optional()` | Missing | Silently dropped on insert |
| `tags` | `z.array(z.string())` | Missing | Silently dropped on insert |

**Action needed**: Either add these columns via migration, or remove them from the Zod schema and form to stop exposing non-functional UI.

**Core fields (aligned across all 3 layers)**: `title`*, `description`, `project_id`, `contact_id`, `assigned_to`, `due_date`, `priority` (low/medium/high), `status` (todo/in_progress/completed/cancelled).

**DB extras**: `completed_at` (auto-set by trigger when status → completed), views `active_tasks` and `overdue_tasks`.

---

### Project

| Layer | File |
|-------|------|
| DB Migration | `supabase/migrations/20260201000000_baseline_schema_reconciliation.sql` (lines 1005-1071) |
| Pipeline fields | `supabase/migrations/20251120200000_add_pipeline_fields_to_projects.sql` |
| Zod Schema | `lib/validations/project.ts` |
| Form Component | No dedicated form — created via contact workflow |

**Status**: Partially aligned. No dedicated form means some DB/Zod fields have no UI entry point.

**Zod exports three schemas**:
- `createProjectSchema` — full creation validation
- `projectEditSchema` — subset for inline editing (`name`, `description`, `scope_of_work`, `type`, values, dates, `pipeline_stage`, `lead_source`)
- `projectFiltersSchema` — list page filtering

**Fields in DB but not in edit form**: `lead_score`, `quality_score`, `weather_delays`, most costing detail fields (`estimated_labor_cost`, `actual_labor_cost`, etc.), `substatus`, `materials_list`, `supplements`, `crew_assigned`

**Notes**:
- Projects are created from contacts: `app/[locale]/(dashboard)/projects/new/page.tsx` redirects to contact workflow
- `pipeline_stage` is the primary lifecycle field, enforced by `lib/pipeline/validation.ts`
- Financial fields (`estimated_value`, `approved_value`, `final_value`) are required at specific pipeline stages

---

## Sync Protocol

When changing an entity's schema, update all three layers in this order:

### 1. Database First
```bash
# Create migration
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_add_field_to_entity.sql
```

```sql
-- Always idempotent
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE;
```

### 2. Regenerate Types
```bash
# After migration is applied to the database
npx supabase gen types typescript --project-id <project-id> > lib/types/database.types.ts
```

If you can't regenerate types immediately, cast the result:
```typescript
const { data } = await supabase.from('tasks').select('*')
const tasks = data as unknown as TaskRow[]
```

### 3. Update Zod Schema
Add the field to the appropriate schema in `lib/validations/<entity>.ts`:
```typescript
start_date: z.string().datetime().optional().nullable(),
```

### 4. Update Form Component
Add the field to the form UI with proper validation binding.

### 5. Verify
```bash
npm run typecheck   # Types align
npm run lint        # No unused imports
npm run build       # Production build passes
```

## Common Pitfalls

### nullable vs optional
- **DB**: `NULL` means the column accepts null values
- **Zod**: `.optional()` means the field can be `undefined` (omitted)
- **Zod**: `.nullable()` means the field can be `null`
- **To match a nullable DB column**: use `.optional().nullable()`

### Enum Mismatches
DB enums and Zod enums must match exactly:
```typescript
// DB: CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high')
// Zod must match:
priority: z.enum(['low', 'medium', 'high'])
// NOT: z.enum(['low', 'normal', 'high'])  ← 'normal' doesn't exist in DB
```

### Default Values
- If the DB has a default, the Zod field should be `.optional()` so the default applies
- If the form pre-fills a value, ensure it matches the DB default
- Don't set a Zod `.default()` AND a DB `DEFAULT` — pick one source of truth

### JSONB Fields
- DB stores as `JSONB` — any valid JSON
- Zod should validate the expected structure: `z.record(z.unknown()).optional()`
- Form should handle gracefully if the stored shape doesn't match (migration-era data)

## See Also

- `docs/SCHEMA_MANAGEMENT.md` — migration workflow and golden rules
- `lib/pipeline/validation.ts` — pipeline stage transition rules and required fields
- `lib/types/database.types.ts` — auto-generated Supabase types
