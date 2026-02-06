-- Soft Delete Migration (P1 - High-Risk Tables)
-- Adds is_deleted column to 5 tables and updates DB functions to exclude soft-deleted records.
-- Idempotent: safe to re-run.

-- ============================================================================
-- 1. Add is_deleted columns
-- ============================================================================

ALTER TABLE quote_options ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE quote_line_items ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE job_expenses ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE material_purchases ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- 2. Add indexes for efficient filtering on is_deleted
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_quote_options_not_deleted ON quote_options (tenant_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_quote_line_items_not_deleted ON quote_line_items (quote_option_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_timesheets_not_deleted ON timesheets (tenant_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_job_expenses_not_deleted ON job_expenses (tenant_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_material_purchases_not_deleted ON material_purchases (tenant_id) WHERE is_deleted = false;

-- ============================================================================
-- 3. Update cost calculation functions to exclude soft-deleted records
-- ============================================================================

-- calculate_project_costs: used for ad-hoc cost breakdowns
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
  WHERE project_id = p_project_id
    AND is_deleted = false;
END;
$$ LANGUAGE plpgsql;

-- update_project_actual_costs: trigger function that syncs projects.actual_*_cost
CREATE OR REPLACE FUNCTION update_project_actual_costs()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects p
  SET
    actual_labor_cost = (
      SELECT COALESCE(SUM(amount), 0)
      FROM job_expenses
      WHERE project_id = p.id AND expense_type = 'labor' AND is_deleted = false
    ),
    actual_material_cost = (
      SELECT COALESCE(SUM(amount), 0)
      FROM job_expenses
      WHERE project_id = p.id AND expense_type = 'material' AND is_deleted = false
    ),
    actual_equipment_cost = (
      SELECT COALESCE(SUM(amount), 0)
      FROM job_expenses
      WHERE project_id = p.id AND expense_type = 'equipment' AND is_deleted = false
    ),
    actual_other_cost = (
      SELECT COALESCE(SUM(amount), 0)
      FROM job_expenses
      WHERE project_id = p.id AND expense_type IN ('subcontractor', 'permit', 'disposal', 'other') AND is_deleted = false
    ),
    updated_at = NOW()
  WHERE p.id = COALESCE(NEW.project_id, OLD.project_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
