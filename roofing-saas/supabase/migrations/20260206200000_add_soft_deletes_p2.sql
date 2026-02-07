-- Soft Delete Migration (P2 - Configuration & Content Tables)
-- Adds is_deleted column to 14 tables for soft delete support.
-- Idempotent: safe to re-run (IF NOT EXISTS everywhere).

-- ============================================================================
-- 1. sms_templates
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'sms_templates'
    AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE public.sms_templates ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_sms_templates_not_deleted ON public.sms_templates (tenant_id) WHERE NOT is_deleted;
  END IF;
END $$;

-- ============================================================================
-- 2. email_templates
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'email_templates'
    AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE public.email_templates ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_email_templates_not_deleted ON public.email_templates (tenant_id) WHERE NOT is_deleted;
  END IF;
END $$;

-- ============================================================================
-- 3. user_roles
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_roles'
    AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE public.user_roles ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_user_roles_not_deleted ON public.user_roles (tenant_id) WHERE NOT is_deleted;
  END IF;
END $$;

-- ============================================================================
-- 4. status_substatus_configs
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'status_substatus_configs'
    AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE public.status_substatus_configs ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_status_substatus_configs_not_deleted ON public.status_substatus_configs (tenant_id) WHERE NOT is_deleted;
  END IF;
END $$;

-- ============================================================================
-- 5. filter_configs
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'filter_configs'
    AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE public.filter_configs ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_filter_configs_not_deleted ON public.filter_configs (tenant_id) WHERE NOT is_deleted;
  END IF;
END $$;

-- ============================================================================
-- 6. saved_filters
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'saved_filters'
    AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE public.saved_filters ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_saved_filters_not_deleted ON public.saved_filters (tenant_id) WHERE NOT is_deleted;
  END IF;
END $$;

-- ============================================================================
-- 7. reward_configs
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'reward_configs'
    AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE public.reward_configs ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_reward_configs_not_deleted ON public.reward_configs (tenant_id) WHERE NOT is_deleted;
  END IF;
END $$;

-- ============================================================================
-- 8. point_rules
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'point_rules'
    AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE public.point_rules ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_point_rules_not_deleted ON public.point_rules (tenant_id) WHERE NOT is_deleted;
  END IF;
END $$;

-- ============================================================================
-- 9. kpi_definitions
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'kpi_definitions'
    AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE public.kpi_definitions ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_kpi_definitions_not_deleted ON public.kpi_definitions (tenant_id) WHERE NOT is_deleted;
  END IF;
END $$;

-- ============================================================================
-- 10. challenge_configs
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'challenge_configs'
    AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE public.challenge_configs ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_challenge_configs_not_deleted ON public.challenge_configs (tenant_id) WHERE NOT is_deleted;
  END IF;
END $$;

-- ============================================================================
-- 11. digital_business_cards
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'digital_business_cards'
    AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE public.digital_business_cards ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_digital_business_cards_not_deleted ON public.digital_business_cards (tenant_id) WHERE NOT is_deleted;
  END IF;
END $$;

-- ============================================================================
-- 12. documents
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'documents'
    AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE public.documents ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_documents_not_deleted ON public.documents (tenant_id) WHERE NOT is_deleted;
  END IF;
END $$;

-- ============================================================================
-- 13. query_history
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'query_history'
    AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE public.query_history ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_query_history_not_deleted ON public.query_history (tenant_id) WHERE NOT is_deleted;
  END IF;
END $$;

-- ============================================================================
-- 14. campaign_steps
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'campaign_steps'
    AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE public.campaign_steps ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_campaign_steps_not_deleted ON public.campaign_steps (campaign_id) WHERE NOT is_deleted;
  END IF;
END $$;
