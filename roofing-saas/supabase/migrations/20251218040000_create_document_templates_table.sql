-- Create document_templates table for signature templates
-- This table stores reusable document templates with signature field configurations

CREATE TABLE IF NOT EXISTS document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name varchar(200) NOT NULL,
  description text,
  category varchar(50) DEFAULT 'other' CHECK (category IN ('contract', 'estimate', 'change_order', 'waiver', 'other')),
  html_content text,
  pdf_template_url text,
  signature_fields jsonb DEFAULT '[]'::jsonb,
  requires_customer_signature boolean DEFAULT true,
  requires_company_signature boolean DEFAULT true,
  expiration_days integer DEFAULT 30 CHECK (expiration_days > 0 AND expiration_days <= 365),
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unique constraint for tenant-level template names (enables UPSERT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'document_templates_tenant_name_unique'
  ) THEN
    ALTER TABLE document_templates ADD CONSTRAINT document_templates_tenant_name_unique UNIQUE (tenant_id, name);
  END IF;
END $$;

-- Create indexes (IF NOT EXISTS for idempotency)
CREATE INDEX IF NOT EXISTS idx_document_templates_tenant_id ON document_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_category ON document_templates(category);
CREATE INDEX IF NOT EXISTS idx_document_templates_is_active ON document_templates(is_active);

-- Enable RLS
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies (DROP IF EXISTS for idempotency, then create)
DROP POLICY IF EXISTS "Users can view their tenant templates" ON document_templates;
CREATE POLICY "Users can view their tenant templates"
  ON document_templates FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can create templates for their tenant" ON document_templates;
CREATE POLICY "Users can create templates for their tenant"
  ON document_templates FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update their tenant templates" ON document_templates;
CREATE POLICY "Users can update their tenant templates"
  ON document_templates FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete their tenant templates" ON document_templates;
CREATE POLICY "Users can delete their tenant templates"
  ON document_templates FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

-- Trigger to update updated_at (DROP IF EXISTS for idempotency)
DROP TRIGGER IF EXISTS update_document_templates_updated_at ON document_templates;
CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE document_templates IS 'Reusable document templates with signature field configurations';
COMMENT ON COLUMN document_templates.signature_fields IS 'JSON array of signature field definitions with positions and types';
