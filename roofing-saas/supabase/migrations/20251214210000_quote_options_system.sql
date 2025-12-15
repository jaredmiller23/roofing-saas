-- =====================================================
-- QUOTE OPTIONS SYSTEM
-- Date: 2025-12-14
-- Purpose: Multi-option quoting system for roofing estimates
-- Features: Good/Better/Best proposals, line items, professional PDFs
-- =====================================================

-- Quote Options Table
-- Stores different pricing options for projects (Good/Better/Best)
CREATE TABLE IF NOT EXISTS quote_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Option details
  name TEXT NOT NULL, -- 'Good', 'Better', 'Best' or custom
  description TEXT,
  is_recommended BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,

  -- Financial calculations
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5, 2) DEFAULT 0, -- Percentage (e.g., 8.25)
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  profit_margin DECIMAL(5, 4) DEFAULT NULL, -- Percentage as decimal (e.g., 0.25 for 25%)

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_display_order CHECK (display_order >= 0),
  CONSTRAINT valid_tax_rate CHECK (tax_rate >= 0 AND tax_rate <= 100),
  CONSTRAINT valid_amounts CHECK (
    subtotal >= 0 AND
    tax_amount >= 0 AND
    total_amount >= 0
  )
);

-- Quote Line Items Table
-- Individual items within each quote option
CREATE TABLE IF NOT EXISTS quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_option_id UUID NOT NULL REFERENCES quote_options(id) ON DELETE CASCADE,

  -- Item details
  description TEXT NOT NULL,
  quantity DECIMAL(10, 3) NOT NULL DEFAULT 1, -- Allow fractional quantities
  unit TEXT NOT NULL DEFAULT 'each', -- 'sq ft', 'linear ft', 'each', etc.
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'materials', -- 'materials', 'labor', 'equipment', 'permits', 'other'

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_quantity CHECK (quantity > 0),
  CONSTRAINT valid_prices CHECK (unit_price >= 0 AND total_price >= 0),
  CONSTRAINT valid_category CHECK (category IN ('materials', 'labor', 'equipment', 'permits', 'other'))
);

-- Quote Proposals Table
-- Groups quote options into a proposal for customers
CREATE TABLE IF NOT EXISTS quote_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Proposal details
  proposal_number TEXT NOT NULL, -- Auto-generated: PROP-YYMMDD-XXX
  title TEXT NOT NULL,
  description TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'viewed', 'accepted', 'rejected'
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  selected_option_id UUID REFERENCES quote_options(id),

  -- Validity
  valid_until TIMESTAMPTZ, -- Proposal expiration date

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected')),
  CONSTRAINT unique_proposal_number_per_tenant UNIQUE (tenant_id, proposal_number)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Quote Options indexes
CREATE INDEX idx_quote_options_tenant_id ON quote_options(tenant_id);
CREATE INDEX idx_quote_options_project_id ON quote_options(project_id);
CREATE INDEX idx_quote_options_display_order ON quote_options(project_id, display_order);
CREATE INDEX idx_quote_options_recommended ON quote_options(project_id, is_recommended) WHERE is_recommended = TRUE;

-- Quote Line Items indexes
CREATE INDEX idx_quote_line_items_option_id ON quote_line_items(quote_option_id);
CREATE INDEX idx_quote_line_items_category ON quote_line_items(category);

-- Quote Proposals indexes
CREATE INDEX idx_quote_proposals_tenant_id ON quote_proposals(tenant_id);
CREATE INDEX idx_quote_proposals_project_id ON quote_proposals(project_id);
CREATE INDEX idx_quote_proposals_status ON quote_proposals(status);
CREATE INDEX idx_quote_proposals_proposal_number ON quote_proposals(proposal_number);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE quote_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_proposals ENABLE ROW LEVEL SECURITY;

-- Quote Options policies
CREATE POLICY "Users can view quote options in their tenant"
  ON quote_options FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create quote options"
  ON quote_options FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update quote options"
  ON quote_options FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete quote options"
  ON quote_options FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Quote Line Items policies (inherit from parent quote option)
CREATE POLICY "Users can view line items"
  ON quote_line_items FOR SELECT
  USING (
    quote_option_id IN (
      SELECT id FROM quote_options
      WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_users
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create line items"
  ON quote_line_items FOR INSERT
  WITH CHECK (
    quote_option_id IN (
      SELECT id FROM quote_options
      WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_users
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update line items"
  ON quote_line_items FOR UPDATE
  USING (
    quote_option_id IN (
      SELECT id FROM quote_options
      WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_users
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete line items"
  ON quote_line_items FOR DELETE
  USING (
    quote_option_id IN (
      SELECT id FROM quote_options
      WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- Quote Proposals policies
CREATE POLICY "Users can view proposals in their tenant"
  ON quote_proposals FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create proposals"
  ON quote_proposals FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update proposals"
  ON quote_proposals FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete proposals"
  ON quote_proposals FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_quote_options_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quote_options_updated_at
  BEFORE UPDATE ON quote_options
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_options_updated_at();

CREATE OR REPLACE FUNCTION update_quote_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quote_proposals_updated_at
  BEFORE UPDATE ON quote_proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_proposals_updated_at();

-- Auto-calculate line item totals
CREATE OR REPLACE FUNCTION calculate_line_item_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_price = NEW.quantity * NEW.unit_price;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_line_item_total
  BEFORE INSERT OR UPDATE ON quote_line_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_line_item_total();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Generate unique proposal number
CREATE OR REPLACE FUNCTION generate_proposal_number(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
  today_str TEXT;
  random_num INTEGER;
  proposal_num TEXT;
  exists_check INTEGER;
BEGIN
  -- Format: PROP-YYMMDD-XXX
  today_str := TO_CHAR(NOW(), 'YYMMDD');

  LOOP
    random_num := FLOOR(RANDOM() * 999) + 1;
    proposal_num := 'PROP-' || today_str || '-' || LPAD(random_num::TEXT, 3, '0');

    -- Check if this number already exists for this tenant today
    SELECT COUNT(*) INTO exists_check
    FROM quote_proposals
    WHERE tenant_id = p_tenant_id
    AND proposal_number = proposal_num;

    EXIT WHEN exists_check = 0;
  END LOOP;

  RETURN proposal_num;
END;
$$ LANGUAGE plpgsql;

-- Get quote option totals
CREATE OR REPLACE FUNCTION get_quote_option_totals(p_option_id UUID)
RETURNS TABLE(
  subtotal DECIMAL(10,2),
  line_item_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(qli.total_price), 0) as subtotal,
    COUNT(qli.id)::INTEGER as line_item_count
  FROM quote_line_items qli
  WHERE qli.quote_option_id = p_option_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS
-- =====================================================

-- Quote Options with aggregated data
CREATE OR REPLACE VIEW quote_options_with_details AS
SELECT
  qo.*,
  COUNT(qli.id) as line_item_count,
  COALESCE(SUM(qli.total_price), 0) as calculated_subtotal,
  p.name as project_name,
  c.first_name || ' ' || c.last_name as customer_name
FROM quote_options qo
LEFT JOIN quote_line_items qli ON qo.id = qli.quote_option_id
LEFT JOIN projects p ON qo.project_id = p.id
LEFT JOIN contacts c ON p.contact_id = c.id
GROUP BY qo.id, p.name, c.first_name, c.last_name
ORDER BY qo.display_order;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE quote_options IS 'Multiple pricing options for projects (Good/Better/Best proposals)';
COMMENT ON COLUMN quote_options.name IS 'Option name like Good, Better, Best or custom';
COMMENT ON COLUMN quote_options.is_recommended IS 'Whether this option is recommended to the customer';
COMMENT ON COLUMN quote_options.display_order IS 'Order to display options (0 = first)';
COMMENT ON COLUMN quote_options.tax_rate IS 'Tax percentage (e.g., 8.25 for 8.25%)';
COMMENT ON COLUMN quote_options.profit_margin IS 'Profit margin as decimal (0.25 = 25%)';

COMMENT ON TABLE quote_line_items IS 'Individual items within each quote option';
COMMENT ON COLUMN quote_line_items.quantity IS 'Quantity with decimal support for fractional units';
COMMENT ON COLUMN quote_line_items.unit IS 'Unit of measurement: sq ft, linear ft, each, etc.';
COMMENT ON COLUMN quote_line_items.category IS 'Item category: materials, labor, equipment, permits, other';

COMMENT ON TABLE quote_proposals IS 'Customer-facing proposals grouping multiple quote options';
COMMENT ON COLUMN quote_proposals.proposal_number IS 'Auto-generated unique proposal number';
COMMENT ON COLUMN quote_proposals.status IS 'Proposal status: draft, sent, viewed, accepted, rejected';
COMMENT ON COLUMN quote_proposals.selected_option_id IS 'Which option the customer selected (if any)';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== Quote Options System Created ===';
  RAISE NOTICE 'Created quote_options table with RLS policies';
  RAISE NOTICE 'Created quote_line_items table with auto-calculated totals';
  RAISE NOTICE 'Created quote_proposals table with unique proposal numbers';
  RAISE NOTICE 'Created indexes for performance';
  RAISE NOTICE 'Created helper functions and views';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test quote option creation via API';
  RAISE NOTICE '2. Implement PDF generation for proposals';
  RAISE NOTICE '3. Add email templates for proposal sending';
  RAISE NOTICE '4. Build customer proposal acceptance flow';
  RAISE NOTICE '5. Add analytics for quote acceptance rates';
END $$;