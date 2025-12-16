-- =====================================================
-- STORM ALERTS TABLE
-- =====================================================
-- Created: December 16, 2025
-- Purpose: Store storm alerts with acknowledgment/dismissal tracking
-- Links to: storm_events table from 202511030002 migration
-- =====================================================

CREATE TABLE storm_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Alert Info
  type TEXT NOT NULL, -- storm_approaching, storm_active, hail_detected, high_winds, tornado_warning
  priority TEXT NOT NULL, -- low, medium, high, critical
  message TEXT NOT NULL,
  action_items TEXT[], -- Array of action items

  -- Storm Association
  storm_event_id UUID REFERENCES storm_events(id) ON DELETE CASCADE,

  -- Affected Area
  affected_area JSONB NOT NULL, -- { center: {lat, lng}, radius, zipCodes }

  -- Status
  dismissed BOOLEAN DEFAULT FALSE,
  acknowledged_by TEXT[] DEFAULT '{}', -- Array of user IDs who acknowledged

  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_alert_type CHECK (type IN ('storm_approaching', 'storm_active', 'hail_detected', 'high_winds', 'tornado_warning')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'critical'))
);

-- Indexes for performance
CREATE INDEX idx_storm_alerts_tenant ON storm_alerts(tenant_id);
CREATE INDEX idx_storm_alerts_storm_event ON storm_alerts(storm_event_id);
CREATE INDEX idx_storm_alerts_priority ON storm_alerts(priority);
CREATE INDEX idx_storm_alerts_dismissed ON storm_alerts(dismissed);
CREATE INDEX idx_storm_alerts_created ON storm_alerts(created_at DESC);
CREATE INDEX idx_storm_alerts_expires ON storm_alerts(expires_at);

-- RLS Policies
ALTER TABLE storm_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view alerts for their tenant"
  ON storm_alerts FOR SELECT
  USING (tenant_id = auth.uid());

CREATE POLICY "Users can create alerts for their tenant"
  ON storm_alerts FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Users can update alerts for their tenant"
  ON storm_alerts FOR UPDATE
  USING (tenant_id = auth.uid());

CREATE POLICY "Users can delete alerts for their tenant"
  ON storm_alerts FOR DELETE
  USING (tenant_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_storm_alerts_updated_at
  BEFORE UPDATE ON storm_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STORM RESPONSE MODE TABLE
-- =====================================================
-- Stores the current storm response mode configuration per tenant
-- Only one active configuration per tenant

CREATE TABLE storm_response_mode (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Mode
  mode TEXT NOT NULL DEFAULT 'normal', -- normal, storm_watch, storm_response, emergency

  -- Activation Info
  activated_at TIMESTAMPTZ,
  activated_by UUID REFERENCES auth.users(id),
  storm_event_id UUID REFERENCES storm_events(id) ON DELETE SET NULL,

  -- Settings
  settings JSONB NOT NULL DEFAULT '{
    "autoNotifications": false,
    "autoLeadGeneration": false,
    "priorityRouting": false,
    "crewPrePositioning": false,
    "extendedHours": false
  }'::jsonb,

  -- Metrics
  metrics JSONB NOT NULL DEFAULT '{
    "leadsGenerated": 0,
    "customersNotified": 0,
    "appointmentsScheduled": 0,
    "estimatedRevenue": 0
  }'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_response_mode CHECK (mode IN ('normal', 'storm_watch', 'storm_response', 'emergency')),
  CONSTRAINT one_config_per_tenant UNIQUE (tenant_id)
);

-- Indexes
CREATE INDEX idx_response_mode_tenant ON storm_response_mode(tenant_id);
CREATE INDEX idx_response_mode_mode ON storm_response_mode(mode);
CREATE INDEX idx_response_mode_storm_event ON storm_response_mode(storm_event_id);

-- RLS Policies
ALTER TABLE storm_response_mode ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view response mode for their tenant"
  ON storm_response_mode FOR SELECT
  USING (tenant_id = auth.uid());

CREATE POLICY "Users can create response mode for their tenant"
  ON storm_response_mode FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Users can update response mode for their tenant"
  ON storm_response_mode FOR UPDATE
  USING (tenant_id = auth.uid());

CREATE POLICY "Users can delete response mode for their tenant"
  ON storm_response_mode FOR DELETE
  USING (tenant_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_response_mode_updated_at
  BEFORE UPDATE ON storm_response_mode
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE storm_alerts IS 'Stores storm alerts with acknowledgment/dismissal tracking';
COMMENT ON TABLE storm_response_mode IS 'Stores current storm response mode configuration per tenant';
