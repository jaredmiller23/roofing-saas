-- Campaigns System (Proline-style Marketing Automation)
-- Multi-step drip campaigns, event-based triggers, automated follow-up sequences
-- Based on comprehensive research completed 2025-11-18

-- ============================================================================
-- 1. CAMPAIGNS TABLE (Campaign Definitions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Campaign info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  campaign_type VARCHAR(50) NOT NULL CHECK (campaign_type IN ('drip', 'event', 'reengagement', 'retention', 'nurture')),

  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),

  -- Goals
  goal_type VARCHAR(50), -- 'appointments', 'deals', 'reviews', 'engagement'
  goal_target INTEGER,

  -- Settings
  allow_re_enrollment BOOLEAN DEFAULT false,
  re_enrollment_delay_days INTEGER,
  respect_business_hours BOOLEAN DEFAULT true,
  business_hours JSONB, -- { start: 9, end: 17, days: ['Mon', 'Tue', ...] }

  -- Enrollment
  enrollment_type VARCHAR(20) DEFAULT 'automatic' CHECK (enrollment_type IN ('automatic', 'manual')),
  max_enrollments INTEGER, -- Optional cap

  -- Performance (cached for quick access)
  total_enrolled INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false,

  CONSTRAINT campaigns_positive_goal CHECK (goal_target IS NULL OR goal_target > 0)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON campaigns(tenant_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(tenant_id, status) WHERE status = 'active' AND NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(tenant_id, campaign_type) WHERE NOT is_deleted;

-- ============================================================================
-- 2. CAMPAIGN TRIGGERS TABLE (When to Start Campaign)
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Trigger definition
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('stage_change', 'time_based', 'event', 'manual')),
  trigger_config JSONB NOT NULL,
  -- Examples:
  -- stage_change: {"entity_type": "contact", "from_stage": "new", "to_stage": "qualified", "conditions": {...}}
  -- time_based: {"schedule_type": "relative", "relative_to": "contact_created_at", "delay_value": 30, "delay_unit": "days"}
  -- event: {"event_name": "activity_created", "event_filters": {"activity_type": "email", "activity_subtype": "estimate_sent"}}

  -- Conditions (must be met to enroll)
  enrollment_conditions JSONB,
  -- Example: {"lead_score": {"operator": ">=", "value": 50}, "email_bounced": {"operator": "=", "value": false}}

  -- Exclusion criteria (don't enroll if...)
  exclusion_conditions JSONB,
  -- Example: {"has_active_project": true, "unsubscribed": true}

  priority INTEGER DEFAULT 0, -- If multiple triggers match, use highest priority
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_triggers_campaign ON campaign_triggers(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_triggers_type ON campaign_triggers(trigger_type) WHERE is_active = true;

-- ============================================================================
-- 3. CAMPAIGN STEPS TABLE (Campaign Actions Sequence)
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  parent_step_id UUID REFERENCES campaign_steps(id), -- For branching

  -- Execution order
  step_order INTEGER NOT NULL,

  -- Step definition
  step_type VARCHAR(50) NOT NULL CHECK (step_type IN (
    'send_email', 'send_sms', 'create_task', 'wait', 'update_field',
    'manage_tags', 'notify', 'webhook', 'conditional', 'exit_campaign'
  )),
  step_config JSONB NOT NULL,
  -- Examples:
  -- send_email: {"template_id": "uuid", "subject": "...", "personalization": {...}, "track_opens": true}
  -- send_sms: {"template_id": "uuid", "message": "...", "track_replies": true}
  -- wait: {"delay_value": 2, "delay_unit": "days"}
  -- conditional: {"conditions": {...}, "true_path_step_id": "uuid", "false_path_step_id": "uuid"}

  -- Timing
  delay_value INTEGER DEFAULT 0,
  delay_unit VARCHAR(20) DEFAULT 'days' CHECK (delay_unit IN ('hours', 'days', 'weeks')),

  -- Conditional branching
  conditions JSONB, -- For 'conditional' step type
  true_path_step_id UUID REFERENCES campaign_steps(id),
  false_path_step_id UUID REFERENCES campaign_steps(id),

  -- Performance tracking (cached)
  total_executed INTEGER DEFAULT 0,
  total_succeeded INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT campaign_steps_positive_delay CHECK (delay_value >= 0)
);

CREATE INDEX IF NOT EXISTS idx_campaign_steps_campaign ON campaign_steps(campaign_id, step_order);
CREATE INDEX IF NOT EXISTS idx_campaign_steps_parent ON campaign_steps(parent_step_id);
CREATE INDEX IF NOT EXISTS idx_campaign_steps_type ON campaign_steps(step_type);

-- ============================================================================
-- 4. CAMPAIGN ENROLLMENTS TABLE (Who's in Which Campaign)
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Who's enrolled
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Enrollment details
  enrollment_source VARCHAR(50) CHECK (enrollment_source IN ('automatic_trigger', 'manual_admin', 'api', 'bulk_import')),
  enrolled_by UUID REFERENCES auth.users(id),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Current status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'exited', 'paused', 'failed')),
  current_step_id UUID REFERENCES campaign_steps(id),
  current_step_order INTEGER,

  -- Exit details
  exit_reason VARCHAR(50), -- 'completed', 'goal_achieved', 'unsubscribed', 'stage_changed', 'manual_remove', 'error'
  exited_at TIMESTAMPTZ,

  -- Performance metrics
  steps_completed INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  sms_sent INTEGER DEFAULT 0,
  sms_replied INTEGER DEFAULT 0,
  tasks_created INTEGER DEFAULT 0,

  -- Goal tracking
  goal_achieved BOOLEAN DEFAULT false,
  goal_achieved_at TIMESTAMPTZ,
  revenue_attributed DECIMAL(12,2),

  -- Timing
  last_step_executed_at TIMESTAMPTZ,
  next_step_scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  UNIQUE(campaign_id, contact_id), -- Can't be enrolled twice simultaneously

  CONSTRAINT enrollments_positive_metrics CHECK (
    steps_completed >= 0 AND emails_sent >= 0 AND sms_sent >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_campaign ON campaign_enrollments(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_contact ON campaign_enrollments(contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_scheduled ON campaign_enrollments(next_step_scheduled_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_tenant ON campaign_enrollments(tenant_id, status);

-- ============================================================================
-- 5. CAMPAIGN STEP EXECUTIONS TABLE (Execution History)
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_step_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID NOT NULL REFERENCES campaign_enrollments(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES campaign_steps(id) ON DELETE CASCADE,

  -- Execution details
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),

  -- Timing
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Result
  result_data JSONB, -- Result of execution (email ID, SMS SID, task ID, etc.)
  error_message TEXT,

  -- Tracking (for emails/SMS)
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_step_executions_enrollment ON campaign_step_executions(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_campaign_step_executions_step ON campaign_step_executions(step_id);
CREATE INDEX IF NOT EXISTS idx_campaign_step_executions_scheduled ON campaign_step_executions(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_campaign_step_executions_status ON campaign_step_executions(status, scheduled_at) WHERE status IN ('pending', 'running');

-- ============================================================================
-- 6. CAMPAIGN ANALYTICS TABLE (Performance Snapshots)
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Time period
  snapshot_date DATE NOT NULL,
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'all_time')),

  -- Enrollment metrics
  total_enrolled INTEGER DEFAULT 0,
  new_enrollments INTEGER DEFAULT 0, -- This period
  active_enrollments INTEGER DEFAULT 0,
  completed_enrollments INTEGER DEFAULT 0,

  -- Engagement metrics
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  email_open_rate DECIMAL(5,2),
  email_click_rate DECIMAL(5,2),

  sms_sent INTEGER DEFAULT 0,
  sms_replied INTEGER DEFAULT 0,
  sms_reply_rate DECIMAL(5,2),

  tasks_created INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,

  -- Goal metrics
  goals_achieved INTEGER DEFAULT 0,
  goal_achievement_rate DECIMAL(5,2),

  -- Revenue
  revenue_attributed DECIMAL(12,2) DEFAULT 0,
  average_deal_size DECIMAL(12,2),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(campaign_id, snapshot_date, period_type)
);

CREATE INDEX IF NOT EXISTS idx_campaign_analytics_campaign ON campaign_analytics(campaign_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_tenant ON campaign_analytics(tenant_id, snapshot_date DESC);

-- ============================================================================
-- 7. ROW LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_step_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_analytics ENABLE ROW LEVEL SECURITY;

-- Campaigns: All users can view, admins can manage
CREATE POLICY "Users can view campaigns in their tenant"
  ON campaigns FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage campaigns"
  ON campaigns FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Campaign Triggers: Inherit from campaigns
CREATE POLICY "Users can view campaign triggers"
  ON campaign_triggers FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage campaign triggers"
  ON campaign_triggers FOR ALL
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Campaign Steps: Inherit from campaigns
CREATE POLICY "Users can view campaign steps"
  ON campaign_steps FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage campaign steps"
  ON campaign_steps FOR ALL
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Campaign Enrollments: Users can view own tenant
CREATE POLICY "Users can view campaign enrollments in their tenant"
  ON campaign_enrollments FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage enrollments in their tenant"
  ON campaign_enrollments FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- Campaign Step Executions: Inherit from enrollments
CREATE POLICY "Users can view step executions"
  ON campaign_step_executions FOR SELECT
  USING (
    enrollment_id IN (
      SELECT id FROM campaign_enrollments WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can manage step executions"
  ON campaign_step_executions FOR ALL
  USING (
    enrollment_id IN (
      SELECT id FROM campaign_enrollments WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
      )
    )
  );

-- Campaign Analytics: Users can view own tenant
CREATE POLICY "Users can view campaign analytics in their tenant"
  ON campaign_analytics FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage analytics"
  ON campaign_analytics FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 8. TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();

CREATE TRIGGER trigger_update_campaign_steps_updated_at
  BEFORE UPDATE ON campaign_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();

-- Update campaign performance metrics when enrollment completes
CREATE OR REPLACE FUNCTION update_campaign_performance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE campaigns
    SET total_completed = total_completed + 1
    WHERE id = NEW.campaign_id;
  END IF;

  IF NEW.goal_achieved = true AND OLD.goal_achieved != true THEN
    UPDATE campaigns
    SET total_revenue = total_revenue + COALESCE(NEW.revenue_attributed, 0)
    WHERE id = NEW.campaign_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campaign_performance
  AFTER UPDATE ON campaign_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_performance();

-- Increment enrollment count when new enrollment created
CREATE OR REPLACE FUNCTION increment_campaign_enrollment()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE campaigns
  SET total_enrolled = total_enrolled + 1
  WHERE id = NEW.campaign_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_campaign_enrollment
  AFTER INSERT ON campaign_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION increment_campaign_enrollment();

-- ============================================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE campaigns IS 'Campaign definitions with settings and goals';
COMMENT ON TABLE campaign_triggers IS 'Define when campaigns should auto-enroll contacts';
COMMENT ON TABLE campaign_steps IS 'Sequential steps/actions in a campaign';
COMMENT ON TABLE campaign_enrollments IS 'Track which contacts are enrolled in which campaigns';
COMMENT ON TABLE campaign_step_executions IS 'Execution history for each step';
COMMENT ON TABLE campaign_analytics IS 'Performance snapshots for analytics dashboards';

COMMENT ON COLUMN campaigns.campaign_type IS 'drip, event, reengagement, retention, nurture';
COMMENT ON COLUMN campaigns.status IS 'draft, active, paused, archived';
COMMENT ON COLUMN campaigns.allow_re_enrollment IS 'Allow contact to re-enter campaign after exiting';
COMMENT ON COLUMN campaign_triggers.trigger_type IS 'stage_change, time_based, event, manual';
COMMENT ON COLUMN campaign_steps.step_type IS 'send_email, send_sms, create_task, wait, update_field, etc.';
COMMENT ON COLUMN campaign_enrollments.status IS 'active, completed, exited, paused, failed';

-- ============================================================================
-- 10. VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== Campaigns System Migration Complete ===';
  RAISE NOTICE 'Created 6 core tables: campaigns, campaign_triggers, campaign_steps, campaign_enrollments, campaign_step_executions, campaign_analytics';
  RAISE NOTICE 'Added RLS policies for multi-tenant isolation';
  RAISE NOTICE 'Created performance tracking triggers';
  RAISE NOTICE 'Campaign types: drip, event, reengagement, retention, nurture';
  RAISE NOTICE 'Step types: send_email, send_sms, create_task, wait, update_field, manage_tags, notify, webhook, conditional, exit_campaign';
  RAISE NOTICE 'Trigger types: stage_change, time_based, event, manual';
  RAISE NOTICE 'Ready for Phase 2: Campaign Builder UI';
END $$;
