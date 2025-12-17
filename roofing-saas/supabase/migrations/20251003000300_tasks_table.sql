-- =====================================================
-- TASKS TABLE
-- Date: 2025-10-03
-- Purpose: Project and contact task management
-- Critical for: Team productivity, checklist tracking, follow-ups
-- =====================================================

-- Tasks Table
-- Manages tasks/to-dos for projects, contacts, and general work
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Task details
  title TEXT NOT NULL,
  description TEXT,

  -- Relationships (optional - can be general task or linked to project/contact)
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Scheduling
  due_date DATE,
  completed_at TIMESTAMPTZ,

  -- Priority and status
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('todo', 'in_progress', 'completed', 'cancelled')) DEFAULT 'todo',

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_contact_id ON tasks(contact_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);

-- Composite index for common queries
CREATE INDEX idx_tasks_assigned_status ON tasks(assigned_to, status) WHERE status != 'completed' AND status != 'cancelled';

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Users can view tasks in their tenant
CREATE POLICY "Users can view tasks in their tenant"
  ON tasks FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can create tasks in their tenant
CREATE POLICY "Users can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can update tasks in their tenant
CREATE POLICY "Users can update tasks"
  ON tasks FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can delete tasks in their tenant
CREATE POLICY "Users can delete tasks"
  ON tasks FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_task_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on tasks
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_updated_at();

-- Function to automatically set completed_at when status changes to completed
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set completed_at automatically
CREATE TRIGGER tasks_set_completed_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_task_completed_at();

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for active tasks (not completed or cancelled)
CREATE OR REPLACE VIEW active_tasks AS
SELECT
  t.*,
  p.name as project_name,
  c.first_name || ' ' || c.last_name as contact_name,
  u.full_name as assigned_to_name
FROM tasks t
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN contacts c ON t.contact_id = c.id
LEFT JOIN profiles u ON t.assigned_to = u.id
WHERE t.status NOT IN ('completed', 'cancelled')
  AND t.is_deleted = FALSE;

-- View for overdue tasks
CREATE OR REPLACE VIEW overdue_tasks AS
SELECT
  t.*,
  p.name as project_name,
  c.first_name || ' ' || c.last_name as contact_name,
  u.full_name as assigned_to_name
FROM tasks t
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN contacts c ON t.contact_id = c.id
LEFT JOIN profiles u ON t.assigned_to = u.id
WHERE t.status NOT IN ('completed', 'cancelled')
  AND t.is_deleted = FALSE
  AND t.due_date < CURRENT_DATE;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE tasks IS 'Task management for projects, contacts, and general work items';
COMMENT ON COLUMN tasks.project_id IS 'Optional link to project (can be NULL for general tasks)';
COMMENT ON COLUMN tasks.contact_id IS 'Optional link to contact (can be NULL for general tasks)';
COMMENT ON COLUMN tasks.priority IS 'Task priority: low, medium, high';
COMMENT ON COLUMN tasks.status IS 'Task status: todo, in_progress, completed, cancelled';
COMMENT ON COLUMN tasks.due_date IS 'Target completion date';
COMMENT ON COLUMN tasks.completed_at IS 'Automatically set when status changes to completed';

COMMENT ON VIEW active_tasks IS 'All active tasks (not completed or cancelled) with related entity names';
COMMENT ON VIEW overdue_tasks IS 'Tasks past due date that are not yet completed';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== Tasks Table Created ===';
  RAISE NOTICE 'Created tasks table with RLS policies';
  RAISE NOTICE 'Created indexes for performance';
  RAISE NOTICE 'Created helper functions and triggers';
  RAISE NOTICE 'Created views for active and overdue tasks';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Build Tasks CRUD UI';
  RAISE NOTICE '2. Add task list to project detail page';
  RAISE NOTICE '3. Build "My Tasks" dashboard view';
  RAISE NOTICE '4. Add task notifications for due dates';
END $$;
