# Schema Management

**Last Updated**: 2026-02-01
**Status**: Migrations are the source of truth

---

## Golden Rule

> **All schema changes MUST go through migration files.**
> Never use `exec_sql` or direct SQL for CREATE TABLE, ALTER TABLE, DROP, etc.

---

## Why This Matters

On January 11, 2026, the database was migrated from Supabase Cloud to self-hosted NAS. The migration tracking got out of sync, and a workaround (`exec_sql`) was used for schema changes. This created a dual-source-of-truth problem where:

- Migration files said one thing
- Production database had different schema
- Local development diverged from production

On February 1, 2026, this was fixed with a baseline reconciliation migration that captured all 62 tables that existed in production but not in migrations.

---

## Correct Workflow for Schema Changes

### 1. Create Migration File

```bash
# Create a new migration file
# Format: YYYYMMDDHHMMSS_descriptive_name.sql
touch supabase/migrations/20260201120000_add_new_feature.sql
```

### 2. Write SQL

```sql
-- supabase/migrations/20260201120000_add_new_feature.sql

-- Always use IF NOT EXISTS / IF EXISTS for idempotency
CREATE TABLE IF NOT EXISTS new_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add RLS policy
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON new_table
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

### 3. Test Locally

```bash
# Start local Supabase
supabase start

# Apply migration
supabase migration up

# Verify
supabase db reset  # Fresh reset to test from scratch
```

### 4. Commit and Push

```bash
git add supabase/migrations/20260201120000_add_new_feature.sql
git commit -m "feat(db): Add new_table for feature X"
git push origin main
```

### 5. Apply to Production

After Vercel deploys, sync the migration to NAS:

```bash
# Option A: Use Supabase CLI (if properly configured)
supabase db push --db-url postgresql://...

# Option B: Manual application via NAS
# Copy the SQL and run via query_sql (for SELECT-like operations only!)
# For DDL, use the Supabase Studio SQL editor
```

### 6. Verify Tracking

```sql
-- Check that migration is tracked
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version = '20260201120000';
```

---

## What NOT to Do

### ❌ Never do this:

```bash
# DO NOT use exec_sql for schema changes
curl -X POST ".../rpc/exec_sql" \
  -d '{"sql": "CREATE TABLE foo (...)"}'  # WRONG!
```

### ❌ Never do this:

```bash
# DO NOT apply schema changes directly in Supabase Studio
# without a corresponding migration file
```

### ❌ Never do this:

```sql
-- DO NOT have schema in production that isn't in migrations
-- If you find drift, create a migration to capture it
```

---

## Allowed Uses of exec_sql / query_sql

| Use Case | Allowed? |
|----------|----------|
| SELECT queries | ✅ Yes |
| INSERT/UPDATE/DELETE data | ✅ Yes (with caution) |
| CREATE TABLE | ❌ No - use migrations |
| ALTER TABLE | ❌ No - use migrations |
| DROP anything | ❌ No - use migrations |
| CREATE INDEX | ❌ No - use migrations |
| CREATE POLICY | ❌ No - use migrations |

---

## Migration Tracking

Migrations are tracked in `supabase_migrations.schema_migrations`:

```sql
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
```

If a migration is in git but not tracked:
1. Apply the SQL to production
2. Insert tracking record:

```sql
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('20260201120000', 'add_new_feature', ARRAY['-- applied manually']);
```

---

## Recovery Procedures

### Migration and production are out of sync

1. Export current production schema
2. Compare with migration-derived schema
3. Create reconciliation migration to capture drift
4. Apply and verify

### Local doesn't match production

1. `supabase db reset` to start fresh
2. All migrations apply
3. If still different, production has untracked changes
4. Follow "out of sync" procedure above

---

## Key Files

| File | Purpose |
|------|---------|
| `supabase/migrations/` | All migration files |
| `supabase/config.toml` | Local Supabase config |
| `docs/SCHEMA_MANAGEMENT.md` | This document |
| `CLAUDE.md` | AI assistant instructions |

---

## History

- **2024-12**: Migrations system adopted
- **2026-01-11**: NAS migration, tracking broke, exec_sql workaround started
- **2026-02-01**: Baseline reconciliation, tracking repaired, discipline established
