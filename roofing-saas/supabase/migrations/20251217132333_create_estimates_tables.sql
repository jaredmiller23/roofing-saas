-- Estimates/Quoting Tables
-- For creating multi-option quotes for customers

CREATE TABLE quote_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  description TEXT,
  is_selected BOOLEAN DEFAULT false,
  subtotal DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_option_id UUID REFERENCES quote_options(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL DEFAULT 1,
  unit TEXT DEFAULT 'each',
  unit_price DECIMAL NOT NULL,
  total DECIMAL GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE quote_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage org quotes" ON quote_options
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Users can manage quote line items" ON quote_line_items
  FOR ALL USING (
    quote_option_id IN (
      SELECT id FROM quote_options WHERE tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

-- Indexes
CREATE INDEX idx_quote_options_tenant ON quote_options(tenant_id);
CREATE INDEX idx_quote_options_project ON quote_options(project_id);
CREATE INDEX idx_quote_line_items_option ON quote_line_items(quote_option_id);
