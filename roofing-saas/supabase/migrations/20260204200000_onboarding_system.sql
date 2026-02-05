-- Migration: Add onboarding system columns to tenants
-- Supports the post-signup onboarding wizard and company phone capture
-- Rollback: ALTER TABLE tenants DROP COLUMN onboarding_completed; ALTER TABLE tenants DROP COLUMN phone;

-- Add onboarding gate flag
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Add company phone
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Backfill: all existing tenants have already been "onboarded" (they predate the wizard)
UPDATE tenants SET onboarding_completed = true WHERE onboarding_completed = false OR onboarding_completed IS NULL;

-- New tenants created after this migration default to not completed
ALTER TABLE tenants ALTER COLUMN onboarding_completed SET DEFAULT false;
