-- Migration to populate html_content column with signature templates
-- This migration adds HTML content for document templates

-- First, let's add some sample templates for each category
-- These correspond to the HTML files in /docs/signature-templates/

-- Insert residential contract template
INSERT INTO document_templates (
  id,
  tenant_id,
  name,
  description,
  category,
  html_content,
  signature_fields,
  requires_customer_signature,
  requires_company_signature,
  expiration_days,
  is_active,
  is_default
) VALUES (
  'residential-contract-template',
  '00000000-0000-0000-0000-000000000000', -- This will need to be updated per tenant
  'Residential Roofing Contract',
  'Standard residential roofing contract with terms and conditions',
  'contract',
  '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Residential Roofing Contract</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .form-section {
            margin-bottom: 25px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .form-section h3 {
            margin-top: 0;
            color: #2c5aa0;
        }
        .signature-box {
            border: 1px solid #333;
            height: 60px;
            margin: 10px 0;
            display: inline-block;
            width: 300px;
        }
        .cost-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .cost-table th, .cost-table td {
            border: 1px solid #333;
            padding: 10px;
            text-align: left;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>RESIDENTIAL ROOFING CONTRACT</h1>
        <div class="company-info">
            <strong>{{company_name}}</strong><br>
            {{company_address}}<br>
            Phone: {{company_phone}}<br>
            Website: {{company_website}}<br>
            License #: {{license_number}}
        </div>
    </div>

    <div class="form-section">
        <h3>Contract Information</h3>
        <p><strong>Project Name:</strong> {{project_name}}</p>
        <p><strong>Contract Date:</strong> {{current_date}}</p>
    </div>

    <div class="form-section">
        <h3>Customer Information</h3>
        <p><strong>Customer Name:</strong> {{customer_name}}</p>
        <p><strong>Email:</strong> {{customer_email}}</p>
        <p><strong>Phone:</strong> {{customer_phone}}</p>
        <p><strong>Property Address:</strong> {{property_address}}, {{property_city}}, {{property_state}} {{property_zip}}</p>
    </div>

    <div class="form-section">
        <h3>Scope of Work</h3>
        <p><strong>Project Description:</strong> {{project_description}}</p>
        <ul>
            <li>Complete tear-off of existing roofing materials (if applicable)</li>
            <li>Inspection of roof decking and replacement of damaged areas</li>
            <li>Installation of ice and water shield in valleys and eaves</li>
            <li>Installation of underlayment as per manufacturer specifications</li>
            <li>Installation of new roofing materials as specified</li>
            <li>Installation of ridge vents, pipe boots, and other penetration flashings</li>
            <li>Cleanup and disposal of all debris</li>
        </ul>
    </div>

    <div class="form-section">
        <h3>Contract Amount and Payment Terms</h3>
        <table class="cost-table">
            <tr>
                <th>Description</th>
                <th>Amount</th>
            </tr>
            <tr>
                <td>Total Contract Amount</td>
                <td>{{contract_amount}}</td>
            </tr>
        </table>
    </div>

    <div class="form-section">
        <h3>Signatures</h3>
        <p>By signing below, both parties agree to the terms and conditions outlined in this contract.</p>
        <p><strong>Customer Signature:</strong></p>
        <div class="signature-box"></div>
        <br>
        <p><strong>{{company_name}} Representative:</strong></p>
        <div class="signature-box"></div>
    </div>
</body>
</html>',
  '[
    {
      "id": "customer-signature",
      "type": "signature",
      "label": "Customer Signature",
      "page": 1,
      "x": 10,
      "y": 75,
      "width": 35,
      "height": 8,
      "required": true,
      "assignedTo": "customer"
    },
    {
      "id": "customer-date",
      "type": "date",
      "label": "Date",
      "page": 1,
      "x": 50,
      "y": 75,
      "width": 15,
      "height": 5,
      "required": true,
      "assignedTo": "customer"
    },
    {
      "id": "company-signature",
      "type": "signature",
      "label": "Company Signature",
      "page": 1,
      "x": 10,
      "y": 85,
      "width": 35,
      "height": 8,
      "required": true,
      "assignedTo": "company"
    },
    {
      "id": "company-date",
      "type": "date",
      "label": "Date",
      "page": 1,
      "x": 50,
      "y": 85,
      "width": 15,
      "height": 5,
      "required": true,
      "assignedTo": "company"
    }
  ]'::jsonb,
  true,
  true,
  30,
  true,
  true
) ON CONFLICT (id) DO UPDATE SET
  html_content = EXCLUDED.html_content,
  signature_fields = EXCLUDED.signature_fields,
  updated_at = now();

-- Insert Change Order template
INSERT INTO document_templates (
  id,
  tenant_id,
  name,
  description,
  category,
  html_content,
  signature_fields,
  requires_customer_signature,
  requires_company_signature,
  expiration_days,
  is_active
) VALUES (
  'change-order-template',
  '00000000-0000-0000-0000-000000000000',
  'Change Order',
  'Project change order for scope modifications',
  'change_order',
  '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Change Order</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .form-section { margin-bottom: 25px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .signature-box { border: 1px solid #333; height: 60px; margin: 10px 0; display: inline-block; width: 300px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>CHANGE ORDER</h1>
        <div><strong>{{company_name}}</strong></div>
    </div>

    <div class="form-section">
        <h3>Project Information</h3>
        <p><strong>Project:</strong> {{project_name}}</p>
        <p><strong>Customer:</strong> {{customer_name}}</p>
        <p><strong>Date:</strong> {{current_date}}</p>
    </div>

    <div class="form-section">
        <h3>Change Details</h3>
        <p><strong>Description of Changes:</strong></p>
        <p>{{project_description}}</p>
        <p><strong>Cost Impact:</strong> {{contract_amount}}</p>
    </div>

    <div class="form-section">
        <h3>Signatures</h3>
        <p>Customer Signature:</p>
        <div class="signature-box"></div>
        <p>Company Representative:</p>
        <div class="signature-box"></div>
    </div>
</body>
</html>',
  '[
    {
      "id": "customer-signature-co",
      "type": "signature",
      "label": "Customer Signature",
      "page": 1,
      "x": 10,
      "y": 70,
      "width": 35,
      "height": 8,
      "required": true,
      "assignedTo": "customer"
    },
    {
      "id": "company-signature-co",
      "type": "signature",
      "label": "Company Signature",
      "page": 1,
      "x": 10,
      "y": 80,
      "width": 35,
      "height": 8,
      "required": true,
      "assignedTo": "company"
    }
  ]'::jsonb,
  true,
  true,
  30,
  true
) ON CONFLICT (id) DO UPDATE SET
  html_content = EXCLUDED.html_content,
  signature_fields = EXCLUDED.signature_fields,
  updated_at = now();

-- Insert Warranty template
INSERT INTO document_templates (
  id,
  tenant_id,
  name,
  description,
  category,
  html_content,
  signature_fields,
  requires_customer_signature,
  requires_company_signature,
  expiration_days,
  is_active
) VALUES (
  'warranty-template',
  '00000000-0000-0000-0000-000000000000',
  'Roofing Warranty',
  'Warranty document for roofing work',
  'other',
  '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Roofing Warranty</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .form-section { margin-bottom: 25px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .signature-box { border: 1px solid #333; height: 60px; margin: 10px 0; display: inline-block; width: 300px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>ROOFING WARRANTY</h1>
        <div><strong>{{company_name}}</strong></div>
    </div>

    <div class="form-section">
        <h3>Warranty Information</h3>
        <p><strong>Project:</strong> {{project_name}}</p>
        <p><strong>Customer:</strong> {{customer_name}}</p>
        <p><strong>Property Address:</strong> {{property_address}}</p>
        <p><strong>Date of Completion:</strong> {{current_date}}</p>
    </div>

    <div class="form-section">
        <h3>Warranty Terms</h3>
        <p>{{company_name}} warrants all workmanship for a period of 5 years from completion date.</p>
        <p>Material warranties are provided by manufacturers and are transferred to the customer.</p>
    </div>

    <div class="form-section">
        <h3>Customer Acknowledgment</h3>
        <div class="signature-box"></div>
        <p>Customer Signature</p>
    </div>
</body>
</html>',
  '[
    {
      "id": "warranty-customer-signature",
      "type": "signature",
      "label": "Customer Signature",
      "page": 1,
      "x": 10,
      "y": 75,
      "width": 35,
      "height": 8,
      "required": true,
      "assignedTo": "customer"
    }
  ]'::jsonb,
  true,
  false,
  365,
  true
) ON CONFLICT (id) DO UPDATE SET
  html_content = EXCLUDED.html_content,
  signature_fields = EXCLUDED.signature_fields,
  updated_at = now();

-- Update function to set tenant_id for existing tenants
-- This would need to be run for each tenant
CREATE OR REPLACE FUNCTION assign_templates_to_tenants()
RETURNS void AS $$
DECLARE
    tenant_record RECORD;
BEGIN
    -- Loop through all tenants and assign templates
    FOR tenant_record IN SELECT id FROM tenants LOOP
        -- Update templates with actual tenant_id
        UPDATE document_templates
        SET tenant_id = tenant_record.id
        WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
          AND id IN ('residential-contract-template', 'change-order-template', 'warranty-template');
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Call the function to assign templates to all existing tenants
SELECT assign_templates_to_tenants();

-- Drop the function as it's no longer needed
DROP FUNCTION assign_templates_to_tenants();

COMMENT ON COLUMN document_templates.html_content IS 'HTML template content with {{placeholder}} syntax for dynamic data injection';