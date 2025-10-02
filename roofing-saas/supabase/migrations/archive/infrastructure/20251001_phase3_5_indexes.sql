-- =====================================================
-- PHASE 3-5 PERFORMANCE INDEXES
-- Date: 2025-10-01
-- Indexes for future phase tables (voice, gamification, commissions, KPI)
-- =====================================================

-- Voice AI indexes (Phase 4)
CREATE INDEX IF NOT EXISTS idx_voice_sessions_tenant_id ON voice_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_user_id ON voice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_created_at ON voice_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_conversations_session_id ON voice_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_conversations_created_at ON voice_conversations(created_at DESC);

-- Gamification indexes (Phase 3)
CREATE INDEX IF NOT EXISTS idx_gamification_scores_tenant_id ON gamification_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gamification_scores_user_id ON gamification_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_gamification_scores_weekly_rank ON gamification_scores(tenant_id, weekly_rank) WHERE weekly_rank IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gamification_scores_monthly_rank ON gamification_scores(tenant_id, monthly_rank) WHERE monthly_rank IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gamification_scores_total_points ON gamification_scores(tenant_id, total_points DESC);
CREATE INDEX IF NOT EXISTS idx_gamification_activities_tenant_id ON gamification_activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gamification_activities_user_id ON gamification_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_gamification_activities_created_at ON gamification_activities(created_at DESC);

-- KPI Reporting indexes (Phase 5)
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_tenant_id ON kpi_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_metric_date ON kpi_snapshots(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_tenant_metric ON kpi_snapshots(tenant_id, metric_name, metric_date DESC);

-- Commission indexes (Phase 5)
CREATE INDEX IF NOT EXISTS idx_commissions_tenant_id ON commissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commissions_user_id ON commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_project_id ON commissions(project_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_created_at ON commissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commission_rules_tenant_id ON commission_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commission_rules_active ON commission_rules(tenant_id, is_active) WHERE is_active = true;

-- Knowledge Base indexes (Phase 4)
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tenant_id ON knowledge_base(tenant_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_source ON knowledge_base(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_usage ON knowledge_base(usage_count DESC);
-- Note: Vector similarity search will use the embedding column with pgvector extension

-- Verification
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%';

  RAISE NOTICE '=== Phase 3-5 Index Creation Complete ===';
  RAISE NOTICE 'Total custom indexes: %', index_count;
  RAISE NOTICE 'Performance optimization applied to all phase tables';
END $$;
