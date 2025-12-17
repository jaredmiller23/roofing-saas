-- =====================================================
-- ADD PARTICIPANTS COLUMN TO CHALLENGE CONFIGS
-- Date: 2025-12-17
-- Feature: Team member selection for incentive challenges
-- Task: ROOFING-FEAT-001
-- =====================================================

-- Rollback:
-- DROP INDEX IF EXISTS idx_challenge_configs_participants;
-- ALTER TABLE challenge_configs DROP COLUMN IF EXISTS participants;

-- Add participants column for selecting specific team members
-- NULL = all org members participate (default behavior)
-- Empty array = no one (edge case, treat as all)
-- Array of UUIDs = only those users participate
ALTER TABLE challenge_configs
ADD COLUMN IF NOT EXISTS participants UUID[] DEFAULT NULL;

COMMENT ON COLUMN challenge_configs.participants IS
  'Array of user IDs who participate in this challenge. NULL means all org members.';

-- GIN index for efficient array containment queries
-- Enables queries like: WHERE participants @> ARRAY[user_id]::uuid[]
CREATE INDEX IF NOT EXISTS idx_challenge_configs_participants
ON challenge_configs USING GIN (participants);
