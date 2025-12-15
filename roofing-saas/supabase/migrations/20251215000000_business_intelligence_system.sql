-- Business Intelligence System
-- Creates tables and functions needed for the BI query system

-- Create query_history table to store BI query results
CREATE TABLE IF NOT EXISTS query_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    query TEXT NOT NULL,
    interpretation JSONB NOT NULL,
    result JSONB NOT NULL,
    execution_time INTEGER NOT NULL DEFAULT 0,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for query_history
ALTER TABLE query_history ENABLE ROW LEVEL SECURITY;

-- Users can only access their own tenant's query history
CREATE POLICY "Users can view their tenant query history"
    ON query_history FOR SELECT
    USING (
        tenant_id = (
            SELECT tenant_id
            FROM tenant_users
            WHERE user_id = auth.uid()
        )
    );

-- Users can insert their own query history
CREATE POLICY "Users can insert their own query history"
    ON query_history FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND tenant_id = (
            SELECT tenant_id
            FROM tenant_users
            WHERE user_id = auth.uid()
        )
    );

-- Users can update their own query history (for favorites)
CREATE POLICY "Users can update their own query history"
    ON query_history FOR UPDATE
    USING (
        user_id = auth.uid()
        AND tenant_id = (
            SELECT tenant_id
            FROM tenant_users
            WHERE user_id = auth.uid()
        )
    );

-- Users can delete their own query history
CREATE POLICY "Users can delete their own query history"
    ON query_history FOR DELETE
    USING (
        user_id = auth.uid()
        AND tenant_id = (
            SELECT tenant_id
            FROM tenant_users
            WHERE user_id = auth.uid()
        )
    );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_query_history_user_tenant ON query_history(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_query_history_tenant_created ON query_history(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_history_favorites ON query_history(tenant_id, is_favorite) WHERE is_favorite = TRUE;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_query_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_query_history_updated_at ON query_history;
CREATE TRIGGER trigger_query_history_updated_at
    BEFORE UPDATE ON query_history
    FOR EACH ROW
    EXECUTE FUNCTION update_query_history_updated_at();