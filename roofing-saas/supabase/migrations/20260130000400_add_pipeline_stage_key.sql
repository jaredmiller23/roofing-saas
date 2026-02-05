-- Migration: Add stage_key column to pipeline_stages
-- Links each row to the PostgreSQL pipeline_stage enum value
-- Rollback: ALTER TABLE pipeline_stages DROP COLUMN stage_key;

ALTER TABLE pipeline_stages
ADD COLUMN IF NOT EXISTS stage_key VARCHAR(50);

-- Unique constraint: one row per stage_key per tenant
ALTER TABLE pipeline_stages
ADD CONSTRAINT unique_stage_key_per_tenant UNIQUE (tenant_id, stage_key);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
