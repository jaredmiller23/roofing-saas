/**
 * Commission System Migration
 * Track sales rep and canvasser commissions with flexible calculation rules
 */

-- ============================================================================
-- 1. COMMISSION PLANS TABLE - FLEXIBLE COMMISSION STRUCTURES
-- ============================================================================

CREATE TABLE IF NOT EXISTS commission_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Plan details
  name TEXT NOT NULL,
  description TEXT,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('sales_rep', 'canvasser', 'installer', 'project_manager', 'custom')),

  -- Calculation method
  calculation_method TEXT NOT NULL CHECK (calculation_method IN ('percentage', 'fixed_amount', 'tiered', 'custom')),

  -- Simple percentage or fixed amount (for non-tiered plans)
  base_rate DECIMAL(5,2), -- For percentage (e.g., 5.00 = 5%)
  fixed_amount DECIMAL(10,2), -- For fixed amount per transaction

  -- Tiered structure (stored as JSON for flexibility)
  tiers JSONB, -- Array of {min_amount, max_amount, rate, fixed_amount}

  -- Calculation base
  calculation_base TEXT DEFAULT 'contract_value' CHECK (
    calculation_base IN ('contract_value', 'gross_profit', 'net_profit', 'appointment', 'per_job', 'per_hour')
  ),

  -- Additional rules
  min_commission DECIMAL(10,2), -- Minimum commission payout
  max_commission DECIMAL(10,2), -- Maximum commission cap
  requires_payment BOOLEAN DEFAULT false, -- Only pay commission after customer pays

  -- Status
  is_active BOOLEAN DEFAULT true,
  effective_date DATE,
  end_date DATE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  UNIQUE(tenant_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_commission_plans_tenant ON commission_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commission_plans_type ON commission_plans(plan_type);
CREATE INDEX IF NOT EXISTS idx_commission_plans_active ON commission_plans(is_active);

-- ============================================================================
-- 2. COMMISSION RECORDS TABLE - TRACK EARNED COMMISSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS commission_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Who earned it
  user_id UUID NOT NULL REFERENCES auth.users(id),
  commission_plan_id UUID NOT NULL REFERENCES commission_plans(id),

  -- What it's for
  project_id UUID REFERENCES projects(id),
  contact_id UUID REFERENCES contacts(id),

  -- Commission details
  commission_type TEXT NOT NULL CHECK (
    commission_type IN ('sale', 'appointment', 'installation', 'milestone', 'bonus', 'override')
  ),

  -- Calculation
  base_amount DECIMAL(10,2) NOT NULL, -- Contract value, profit, or fixed basis
  commission_rate DECIMAL(5,2), -- Rate applied (for reference)
  commission_amount DECIMAL(10,2) NOT NULL, -- Calculated commission

  -- Adjustments
  adjustment_amount DECIMAL(10,2) DEFAULT 0,
  adjustment_reason TEXT,
  final_amount DECIMAL(10,2) GENERATED ALWAYS AS (commission_amount + COALESCE(adjustment_amount, 0)) STORED,

  -- Status and payment
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  payment_date DATE,
  payment_method TEXT, -- Check, direct deposit, etc.

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_commission_records_tenant ON commission_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commission_records_user ON commission_records(user_id);
CREATE INDEX IF NOT EXISTS idx_commission_records_project ON commission_records(project_id);
CREATE INDEX IF NOT EXISTS idx_commission_records_status ON commission_records(status);
CREATE INDEX IF NOT EXISTS idx_commission_records_payment_date ON commission_records(payment_date);

-- ============================================================================
-- 3. USER COMMISSION ASSIGNMENTS - WHO GETS WHAT PLAN
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_commission_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  commission_plan_id UUID NOT NULL REFERENCES commission_plans(id),

  -- Assignment details
  role TEXT, -- sales_rep, canvasser, etc.
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,

  -- Override settings (optional)
  override_rate DECIMAL(5,2), -- Custom rate for this user
  override_fixed_amount DECIMAL(10,2),

  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,

  UNIQUE(tenant_id, user_id, commission_plan_id, effective_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_commission_assignments_tenant ON user_commission_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_commission_assignments_user ON user_commission_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_commission_assignments_plan ON user_commission_assignments(commission_plan_id);

-- ============================================================================
-- 4. COMMISSION CALCULATION FUNCTIONS
-- ============================================================================

-- Function to calculate commission based on plan
CREATE OR REPLACE FUNCTION calculate_commission(
  p_plan_id UUID,
  p_base_amount DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  v_plan commission_plans%ROWTYPE;
  v_commission DECIMAL := 0;
  v_tier RECORD;
BEGIN
  -- Get plan details
  SELECT * INTO v_plan FROM commission_plans WHERE id = p_plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commission plan not found: %', p_plan_id;
  END IF;

  -- Calculate based on method
  CASE v_plan.calculation_method
    WHEN 'percentage' THEN
      v_commission := p_base_amount * (v_plan.base_rate / 100);

    WHEN 'fixed_amount' THEN
      v_commission := v_plan.fixed_amount;

    WHEN 'tiered' THEN
      -- Find applicable tier
      FOR v_tier IN
        SELECT * FROM jsonb_to_recordset(v_plan.tiers) AS x(
          min_amount DECIMAL,
          max_amount DECIMAL,
          rate DECIMAL,
          fixed_amount DECIMAL
        )
        WHERE p_base_amount >= min_amount
          AND (max_amount IS NULL OR p_base_amount <= max_amount)
        ORDER BY min_amount DESC
        LIMIT 1
      LOOP
        IF v_tier.rate IS NOT NULL THEN
          v_commission := p_base_amount * (v_tier.rate / 100);
        ELSIF v_tier.fixed_amount IS NOT NULL THEN
          v_commission := v_tier.fixed_amount;
        END IF;
      END LOOP;
  END CASE;

  -- Apply min/max limits
  IF v_plan.min_commission IS NOT NULL AND v_commission < v_plan.min_commission THEN
    v_commission := v_plan.min_commission;
  END IF;

  IF v_plan.max_commission IS NOT NULL AND v_commission > v_plan.max_commission THEN
    v_commission := v_plan.max_commission;
  END IF;

  RETURN v_commission;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. AUTO-UPDATE TRIGGERS
-- ============================================================================

-- Trigger to update timestamps
DROP TRIGGER IF EXISTS update_commission_plans_updated_at ON commission_plans;
CREATE TRIGGER update_commission_plans_updated_at
BEFORE UPDATE ON commission_plans
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_commission_records_updated_at ON commission_records;
CREATE TRIGGER update_commission_records_updated_at
BEFORE UPDATE ON commission_records
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_user_commission_assignments_updated_at ON user_commission_assignments;
CREATE TRIGGER update_user_commission_assignments_updated_at
BEFORE UPDATE ON user_commission_assignments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE commission_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_commission_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for commission_plans
DROP POLICY IF EXISTS "Users can view commission_plans for their tenant" ON commission_plans;
CREATE POLICY "Users can view commission_plans for their tenant"
  ON commission_plans FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert commission_plans for their tenant" ON commission_plans;
CREATE POLICY "Users can insert commission_plans for their tenant"
  ON commission_plans FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update commission_plans for their tenant" ON commission_plans;
CREATE POLICY "Users can update commission_plans for their tenant"
  ON commission_plans FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for commission_records
DROP POLICY IF EXISTS "Users can view commission_records for their tenant" ON commission_records;
CREATE POLICY "Users can view commission_records for their tenant"
  ON commission_records FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert commission_records for their tenant" ON commission_records;
CREATE POLICY "Users can insert commission_records for their tenant"
  ON commission_records FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update commission_records for their tenant" ON commission_records;
CREATE POLICY "Users can update commission_records for their tenant"
  ON commission_records FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for user_commission_assignments
DROP POLICY IF EXISTS "Users can view user_commission_assignments for their tenant" ON user_commission_assignments;
CREATE POLICY "Users can view user_commission_assignments for their tenant"
  ON user_commission_assignments FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert user_commission_assignments for their tenant" ON user_commission_assignments;
CREATE POLICY "Users can insert user_commission_assignments for their tenant"
  ON user_commission_assignments FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update user_commission_assignments for their tenant" ON user_commission_assignments;
CREATE POLICY "Users can update user_commission_assignments for their tenant"
  ON user_commission_assignments FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 7. VIEWS FOR REPORTING
-- ============================================================================

-- View for commission summary by user
CREATE OR REPLACE VIEW commission_summary_by_user AS
SELECT
  cr.tenant_id,
  cr.user_id,
  u.email as user_email,
  u.raw_user_meta_data->>'full_name' as user_name,

  -- Commission totals
  COUNT(*) as total_commissions,
  SUM(CASE WHEN cr.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
  SUM(CASE WHEN cr.status = 'approved' THEN 1 ELSE 0 END) as approved_count,
  SUM(CASE WHEN cr.status = 'paid' THEN 1 ELSE 0 END) as paid_count,

  -- Amounts
  SUM(cr.final_amount) as total_earned,
  SUM(CASE WHEN cr.status = 'pending' THEN cr.final_amount ELSE 0 END) as pending_amount,
  SUM(CASE WHEN cr.status = 'approved' THEN cr.final_amount ELSE 0 END) as approved_amount,
  SUM(CASE WHEN cr.status = 'paid' THEN cr.final_amount ELSE 0 END) as paid_amount,

  -- Date ranges
  MIN(cr.created_at) as first_commission_date,
  MAX(cr.payment_date) as last_payment_date

FROM commission_records cr
LEFT JOIN auth.users u ON cr.user_id = u.id
GROUP BY cr.tenant_id, cr.user_id, u.email, u.raw_user_meta_data->>'full_name';

-- Grant access to views
GRANT SELECT ON commission_summary_by_user TO authenticated;

-- ============================================================================
-- 8. SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Example: Create a standard sales rep commission plan (5% of contract value)
-- INSERT INTO commission_plans (tenant_id, name, plan_type, calculation_method, base_rate, calculation_base)
-- VALUES ('your-tenant-id', 'Standard Sales Rep Plan', 'sales_rep', 'percentage', 5.00, 'contract_value');

-- Example: Create a tiered canvasser plan
-- INSERT INTO commission_plans (tenant_id, name, plan_type, calculation_method, calculation_base, tiers)
-- VALUES (
--   'your-tenant-id',
--   'Tiered Canvasser Plan',
--   'canvasser',
--   'tiered',
--   'appointment',
--   '[
--     {"min_amount": 0, "max_amount": 10, "fixed_amount": 25},
--     {"min_amount": 11, "max_amount": 20, "fixed_amount": 30},
--     {"min_amount": 21, "max_amount": null, "fixed_amount": 35}
--   ]'::jsonb
-- );
