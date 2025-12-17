-- Query History for Business Intelligence
-- Migration: Create query_history table for tracking natural language and saved queries
-- Rollback: DROP TABLE query_history;

CREATE TABLE query_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  query_text TEXT NOT NULL,
  query_type TEXT, -- 'natural_language', 'sql', 'saved_report'
  is_favorite BOOLEAN DEFAULT false,
  result_count INTEGER,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE query_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see and manage their own query history
-- Must check BOTH tenant_id AND user_id for proper isolation
CREATE POLICY "Users can manage own query history" ON query_history
  FOR ALL USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND user_id = auth.uid()
  );

-- Indexes for performance
CREATE INDEX idx_query_history_user ON query_history(user_id);
CREATE INDEX idx_query_history_tenant ON query_history(tenant_id);
CREATE INDEX idx_query_history_created ON query_history(created_at DESC);
