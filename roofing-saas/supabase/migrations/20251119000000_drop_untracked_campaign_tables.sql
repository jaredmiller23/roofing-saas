-- Drop Untracked Campaign Tables
-- These tables were created manually (not through migrations) and need to be recreated properly
-- All tables confirmed empty (0 rows) as of 2025-11-19

-- Drop in reverse dependency order
DROP TABLE IF EXISTS campaign_analytics CASCADE;
DROP TABLE IF EXISTS campaign_step_executions CASCADE;
DROP TABLE IF EXISTS campaign_enrollments CASCADE;
DROP TABLE IF EXISTS campaign_steps CASCADE;
DROP TABLE IF EXISTS campaign_triggers CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;

-- Note: Tables will be recreated by subsequent properly-tracked migrations
