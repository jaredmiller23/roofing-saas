-- Enhance existing tasks table with additional task management features

-- Add missing columns to tasks table
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS labels JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Add full text search column
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS search_vector tsvector 
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED;

-- Task comments for discussions
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  comment TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task attachments
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size BIGINT,
  
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task activity log
CREATE TABLE IF NOT EXISTS task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  action VARCHAR(100) NOT NULL,
  changes JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_search ON tasks USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_task ON task_activity(task_id);

-- Update timestamp trigger for comments
CREATE OR REPLACE FUNCTION update_task_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_comments_updated_at ON task_comments;
CREATE TRIGGER task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_task_comments_updated_at();

-- Enable RLS on new tables
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_comments
DROP POLICY IF EXISTS "Users can view comments in their tenant tasks" ON task_comments;
CREATE POLICY "Users can view comments in their tenant tasks"
  ON task_comments FOR SELECT
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can create comments in their tenant tasks" ON task_comments;
CREATE POLICY "Users can create comments in their tenant tasks"
  ON task_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    task_id IN (
      SELECT id FROM tasks WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update their own comments" ON task_comments;
CREATE POLICY "Users can update their own comments"
  ON task_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own comments" ON task_comments;
CREATE POLICY "Users can delete their own comments"
  ON task_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for task_attachments
DROP POLICY IF EXISTS "Users can view attachments in their tenant tasks" ON task_attachments;
CREATE POLICY "Users can view attachments in their tenant tasks"
  ON task_attachments FOR SELECT
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can create attachments in their tenant tasks" ON task_attachments;
CREATE POLICY "Users can create attachments in their tenant tasks"
  ON task_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    task_id IN (
      SELECT id FROM tasks WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete their own attachments" ON task_attachments;
CREATE POLICY "Users can delete their own attachments"
  ON task_attachments FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- RLS Policies for task_activity
DROP POLICY IF EXISTS "Users can view activity in their tenant tasks" ON task_activity;
CREATE POLICY "Users can view activity in their tenant tasks"
  ON task_activity FOR SELECT
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "System can create activity logs" ON task_activity;
CREATE POLICY "System can create activity logs"
  ON task_activity FOR INSERT
  TO authenticated
  WITH CHECK (true);
