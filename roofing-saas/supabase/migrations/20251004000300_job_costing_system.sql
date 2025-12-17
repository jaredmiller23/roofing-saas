/**
 * Job Costing & P&L System Migration
 * Comprehensive cost tracking and profitability analysis
 */

-- ============================================================================
-- 1. ENHANCE PROJECTS TABLE WITH DETAILED COST TRACKING
-- ============================================================================

-- Add estimated vs actual cost columns
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS estimated_labor_cost DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS actual_labor_cost DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_material_cost DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS actual_material_cost DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_equipment_cost DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS actual_equipment_cost DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_other_cost DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS actual_other_cost DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_variance DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS profit_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS profit_margin_percent DECIMAL(5,2);

-- Add revenue tracking
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS payments_received DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due DECIMAL(10,2);

-- ============================================================================
-- 2. JOB EXPENSES TABLE - DETAILED EXPENSE TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Expense details
  expense_type TEXT NOT NULL CHECK (expense_type IN ('labor', 'material', 'equipment', 'subcontractor', 'permit', 'disposal', 'other')),
  category TEXT, -- subcategory (e.g., 'shingles', 'underlayment' for materials)
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  quantity DECIMAL(10,2),
  unit_price DECIMAL(10,2),

  -- Vendor/supplier info
  vendor_name TEXT,
  vendor_id UUID REFERENCES contacts(id),
  invoice_number TEXT,

  -- Documentation
  receipt_url TEXT,
  notes TEXT,

  -- Dates
  expense_date DATE NOT NULL,
  paid_date DATE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_expenses_project ON job_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_job_expenses_tenant ON job_expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_expenses_type ON job_expenses(expense_type);
CREATE INDEX IF NOT EXISTS idx_job_expenses_date ON job_expenses(expense_date);

-- ============================================================================
-- 3. CREW MEMBERS TABLE - LABOR RATE TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS crew_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),

  -- Member details
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  employee_number TEXT,
  email TEXT,
  phone TEXT,

  -- Role and rates
  role TEXT NOT NULL CHECK (role IN ('apprentice', 'journeyman', 'master', 'foreman', 'project_manager', 'subcontractor')),
  hourly_rate DECIMAL(10,2) NOT NULL,
  overtime_rate DECIMAL(10,2), -- Typically 1.5x base rate

  -- Status
  is_active BOOLEAN DEFAULT true,
  hire_date DATE,
  termination_date DATE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crew_members_tenant ON crew_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_user ON crew_members(user_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_active ON crew_members(is_active);

-- ============================================================================
-- 4. TIMESHEETS TABLE - LABOR HOUR TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  crew_member_id UUID NOT NULL REFERENCES crew_members(id) ON DELETE CASCADE,

  -- Time tracking
  work_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  regular_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  overtime_hours DECIMAL(5,2) DEFAULT 0,

  -- Cost calculation
  hourly_rate DECIMAL(10,2) NOT NULL, -- Rate at time of work
  overtime_rate DECIMAL(10,2),
  total_labor_cost DECIMAL(10,2) GENERATED ALWAYS AS (
    (regular_hours * hourly_rate) + (overtime_hours * COALESCE(overtime_rate, hourly_rate * 1.5))
  ) STORED,

  -- Work details
  work_description TEXT,
  task_completed TEXT,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'paid')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_timesheets_project ON timesheets(project_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_crew ON timesheets(crew_member_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_date ON timesheets(work_date);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status);

-- ============================================================================
-- 5. MATERIAL PURCHASES TABLE - MATERIAL COST TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS material_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Material details
  material_name TEXT NOT NULL,
  material_type TEXT, -- shingles, underlayment, flashing, etc.
  supplier TEXT NOT NULL,
  supplier_id UUID REFERENCES contacts(id),

  -- Quantity and cost
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT, -- sq ft, bundle, roll, etc.
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,

  -- Tracking
  purchase_order_number TEXT,
  invoice_number TEXT,
  delivery_date DATE,
  purchase_date DATE NOT NULL,

  -- Usage tracking
  quantity_used DECIMAL(10,2) DEFAULT 0,
  quantity_wasted DECIMAL(10,2) DEFAULT 0,
  quantity_returned DECIMAL(10,2) DEFAULT 0,
  waste_percent DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN quantity > 0 THEN (quantity_wasted / quantity * 100) ELSE 0 END
  ) STORED,

  -- Documentation
  receipt_url TEXT,
  notes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_material_purchases_project ON material_purchases(project_id);
CREATE INDEX IF NOT EXISTS idx_material_purchases_tenant ON material_purchases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_material_purchases_date ON material_purchases(purchase_date);

-- ============================================================================
-- 6. FUNCTIONS FOR COST CALCULATIONS
-- ============================================================================

-- Function to calculate total project costs
CREATE OR REPLACE FUNCTION calculate_project_costs(p_project_id UUID)
RETURNS TABLE(
  total_labor DECIMAL,
  total_materials DECIMAL,
  total_equipment DECIMAL,
  total_other DECIMAL,
  total_costs DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN expense_type = 'labor' THEN amount ELSE 0 END), 0) as total_labor,
    COALESCE(SUM(CASE WHEN expense_type = 'material' THEN amount ELSE 0 END), 0) as total_materials,
    COALESCE(SUM(CASE WHEN expense_type = 'equipment' THEN amount ELSE 0 END), 0) as total_equipment,
    COALESCE(SUM(CASE WHEN expense_type IN ('subcontractor', 'permit', 'disposal', 'other') THEN amount ELSE 0 END), 0) as total_other,
    COALESCE(SUM(amount), 0) as total_costs
  FROM job_expenses
  WHERE project_id = p_project_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update project actual costs
CREATE OR REPLACE FUNCTION update_project_actual_costs()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects p
  SET
    actual_labor_cost = (
      SELECT COALESCE(SUM(amount), 0)
      FROM job_expenses
      WHERE project_id = p.id AND expense_type = 'labor'
    ),
    actual_material_cost = (
      SELECT COALESCE(SUM(amount), 0)
      FROM job_expenses
      WHERE project_id = p.id AND expense_type = 'material'
    ),
    actual_equipment_cost = (
      SELECT COALESCE(SUM(amount), 0)
      FROM job_expenses
      WHERE project_id = p.id AND expense_type = 'equipment'
    ),
    actual_other_cost = (
      SELECT COALESCE(SUM(amount), 0)
      FROM job_expenses
      WHERE project_id = p.id AND expense_type IN ('subcontractor', 'permit', 'disposal', 'other')
    ),
    updated_at = NOW()
  WHERE p.id = COALESCE(NEW.project_id, OLD.project_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update project costs when expenses change
DROP TRIGGER IF EXISTS trigger_update_project_costs ON job_expenses;
CREATE TRIGGER trigger_update_project_costs
AFTER INSERT OR UPDATE OR DELETE ON job_expenses
FOR EACH ROW
EXECUTE FUNCTION update_project_actual_costs();

-- Function to calculate profit metrics
CREATE OR REPLACE FUNCTION calculate_project_profit(p_project_id UUID)
RETURNS TABLE(
  revenue DECIMAL,
  total_cost DECIMAL,
  profit DECIMAL,
  margin_percent DECIMAL,
  cost_variance DECIMAL
) AS $$
DECLARE
  v_revenue DECIMAL;
  v_estimated_cost DECIMAL;
  v_actual_cost DECIMAL;
BEGIN
  SELECT
    COALESCE(p.total_revenue, p.final_value, p.approved_value, p.estimated_value, 0),
    COALESCE(p.estimated_labor_cost, 0) + COALESCE(p.estimated_material_cost, 0) +
      COALESCE(p.estimated_equipment_cost, 0) + COALESCE(p.estimated_other_cost, 0),
    COALESCE(p.actual_labor_cost, 0) + COALESCE(p.actual_material_cost, 0) +
      COALESCE(p.actual_equipment_cost, 0) + COALESCE(p.actual_other_cost, 0)
  INTO v_revenue, v_estimated_cost, v_actual_cost
  FROM projects p
  WHERE p.id = p_project_id;

  RETURN QUERY
  SELECT
    v_revenue,
    v_actual_cost,
    v_revenue - v_actual_cost as profit,
    CASE WHEN v_revenue > 0 THEN ((v_revenue - v_actual_cost) / v_revenue * 100) ELSE 0 END as margin_percent,
    v_actual_cost - v_estimated_cost as cost_variance;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. AUTO-UPDATE TRIGGERS
-- ============================================================================

-- Trigger to auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_job_expenses_updated_at ON job_expenses;
CREATE TRIGGER update_job_expenses_updated_at
BEFORE UPDATE ON job_expenses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_crew_members_updated_at ON crew_members;
CREATE TRIGGER update_crew_members_updated_at
BEFORE UPDATE ON crew_members
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_timesheets_updated_at ON timesheets;
CREATE TRIGGER update_timesheets_updated_at
BEFORE UPDATE ON timesheets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_material_purchases_updated_at ON material_purchases;
CREATE TRIGGER update_material_purchases_updated_at
BEFORE UPDATE ON material_purchases
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE job_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_expenses
DROP POLICY IF EXISTS "Users can view job_expenses for their tenant" ON job_expenses;
CREATE POLICY "Users can view job_expenses for their tenant"
  ON job_expenses FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert job_expenses for their tenant" ON job_expenses;
CREATE POLICY "Users can insert job_expenses for their tenant"
  ON job_expenses FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update job_expenses for their tenant" ON job_expenses;
CREATE POLICY "Users can update job_expenses for their tenant"
  ON job_expenses FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for crew_members
DROP POLICY IF EXISTS "Users can view crew_members for their tenant" ON crew_members;
CREATE POLICY "Users can view crew_members for their tenant"
  ON crew_members FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert crew_members for their tenant" ON crew_members;
CREATE POLICY "Users can insert crew_members for their tenant"
  ON crew_members FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update crew_members for their tenant" ON crew_members;
CREATE POLICY "Users can update crew_members for their tenant"
  ON crew_members FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for timesheets
DROP POLICY IF EXISTS "Users can view timesheets for their tenant" ON timesheets;
CREATE POLICY "Users can view timesheets for their tenant"
  ON timesheets FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert timesheets for their tenant" ON timesheets;
CREATE POLICY "Users can insert timesheets for their tenant"
  ON timesheets FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update timesheets for their tenant" ON timesheets;
CREATE POLICY "Users can update timesheets for their tenant"
  ON timesheets FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for material_purchases
DROP POLICY IF EXISTS "Users can view material_purchases for their tenant" ON material_purchases;
CREATE POLICY "Users can view material_purchases for their tenant"
  ON material_purchases FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert material_purchases for their tenant" ON material_purchases;
CREATE POLICY "Users can insert material_purchases for their tenant"
  ON material_purchases FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update material_purchases for their tenant" ON material_purchases;
CREATE POLICY "Users can update material_purchases for their tenant"
  ON material_purchases FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 9. VIEWS FOR REPORTING
-- ============================================================================

-- View for project P&L summary
CREATE OR REPLACE VIEW project_profit_loss AS
SELECT
  p.id as project_id,
  p.tenant_id,
  p.name as project_name,
  p.project_number,
  p.status,

  -- Revenue
  COALESCE(p.total_revenue, p.final_value, p.approved_value, p.estimated_value, 0) as revenue,

  -- Estimated Costs
  COALESCE(p.estimated_labor_cost, 0) as estimated_labor,
  COALESCE(p.estimated_material_cost, 0) as estimated_materials,
  COALESCE(p.estimated_equipment_cost, 0) as estimated_equipment,
  COALESCE(p.estimated_other_cost, 0) as estimated_other,
  (COALESCE(p.estimated_labor_cost, 0) + COALESCE(p.estimated_material_cost, 0) +
   COALESCE(p.estimated_equipment_cost, 0) + COALESCE(p.estimated_other_cost, 0)) as total_estimated_cost,

  -- Actual Costs
  COALESCE(p.actual_labor_cost, 0) as actual_labor,
  COALESCE(p.actual_material_cost, 0) as actual_materials,
  COALESCE(p.actual_equipment_cost, 0) as actual_equipment,
  COALESCE(p.actual_other_cost, 0) as actual_other,
  (COALESCE(p.actual_labor_cost, 0) + COALESCE(p.actual_material_cost, 0) +
   COALESCE(p.actual_equipment_cost, 0) + COALESCE(p.actual_other_cost, 0)) as total_actual_cost,

  -- Profit Metrics
  COALESCE(p.total_revenue, p.final_value, p.approved_value, p.estimated_value, 0) -
    (COALESCE(p.actual_labor_cost, 0) + COALESCE(p.actual_material_cost, 0) +
     COALESCE(p.actual_equipment_cost, 0) + COALESCE(p.actual_other_cost, 0)) as gross_profit,

  CASE
    WHEN COALESCE(p.total_revenue, p.final_value, p.approved_value, p.estimated_value, 0) > 0
    THEN ((COALESCE(p.total_revenue, p.final_value, p.approved_value, p.estimated_value, 0) -
           (COALESCE(p.actual_labor_cost, 0) + COALESCE(p.actual_material_cost, 0) +
            COALESCE(p.actual_equipment_cost, 0) + COALESCE(p.actual_other_cost, 0))) /
          COALESCE(p.total_revenue, p.final_value, p.approved_value, p.estimated_value, 1) * 100)
    ELSE 0
  END as profit_margin_percent,

  -- Variance
  (COALESCE(p.actual_labor_cost, 0) + COALESCE(p.actual_material_cost, 0) +
   COALESCE(p.actual_equipment_cost, 0) + COALESCE(p.actual_other_cost, 0)) -
  (COALESCE(p.estimated_labor_cost, 0) + COALESCE(p.estimated_material_cost, 0) +
   COALESCE(p.estimated_equipment_cost, 0) + COALESCE(p.estimated_other_cost, 0)) as cost_variance,

  -- Dates
  p.actual_start,
  p.actual_completion
FROM projects p;

-- Grant access to views
GRANT SELECT ON project_profit_loss TO authenticated;
