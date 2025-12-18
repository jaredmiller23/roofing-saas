-- Migration to update html_content for existing templates
-- UPDATE approach since templates already exist

-- Update Authorization of Insured (AOB) template
UPDATE document_templates
SET html_content = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Authorization of Insured (AOB)</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 25px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .signature-box { border: 1px solid #333; height: 60px; margin: 10px 0; display: inline-block; width: 300px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>AUTHORIZATION OF INSURED</h1>
        <h2>Assignment of Benefits</h2>
        <p><strong>{{company_name}}</strong><br>{{company_address}}<br>Phone: {{company_phone}}</p>
    </div>

    <div class="section">
        <h3>Property Information</h3>
        <p><strong>Property Owner:</strong> {{customer_name}}</p>
        <p><strong>Property Address:</strong> {{property_address}}, {{property_city}}, {{property_state}} {{property_zip}}</p>
        <p><strong>Insurance Carrier:</strong> {{insurance_carrier}}</p>
        <p><strong>Claim Number:</strong> {{claim_number}}</p>
        <p><strong>Policy Number:</strong> {{policy_number}}</p>
    </div>

    <div class="section">
        <h3>Authorization</h3>
        <p>I/We, the undersigned, being the owner(s) of the above-described property, hereby authorize and direct {{company_name}} to:</p>
        <ol>
            <li>Act as our representative in matters related to this insurance claim</li>
            <li>Receive payment from the insurance company on our behalf</li>
            <li>Communicate directly with the insurance company regarding the claim</li>
        </ol>
    </div>

    <div class="section">
        <h3>Signatures</h3>
        <p><strong>Property Owner Signature:</strong></p>
        <div class="signature-box"></div>
        <p>Date: {{current_date}}</p>
    </div>
</body>
</html>',
    updated_at = NOW()
WHERE name = 'Authorization of Insured (AOB)';

-- Update Insurance Work Completion Certificate template
UPDATE document_templates
SET html_content = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Insurance Work Completion Certificate</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 25px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .signature-box { border: 1px solid #333; height: 60px; margin: 10px 0; display: inline-block; width: 300px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>CERTIFICATE OF COMPLETION</h1>
        <p><strong>{{company_name}}</strong><br>{{company_address}}<br>Phone: {{company_phone}}</p>
    </div>

    <div class="section">
        <h3>Project Information</h3>
        <p><strong>Property Owner:</strong> {{customer_name}}</p>
        <p><strong>Property Address:</strong> {{property_address}}, {{property_city}}, {{property_state}} {{property_zip}}</p>
        <p><strong>Completion Date:</strong> {{current_date}}</p>
    </div>

    <div class="section">
        <h3>Work Completed</h3>
        <p>{{project_description}}</p>
    </div>

    <div class="section">
        <h3>Certification</h3>
        <p>I certify that all work has been completed in accordance with the contract and to my satisfaction.</p>
        <p><strong>Customer Signature:</strong></p>
        <div class="signature-box"></div>
        <p><strong>Contractor Signature:</strong></p>
        <div class="signature-box"></div>
    </div>
</body>
</html>',
    updated_at = NOW()
WHERE name = 'Insurance Work Completion Certificate';

-- Update Limited Workmanship Warranty template
UPDATE document_templates
SET html_content = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Limited Workmanship Warranty</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 25px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>LIMITED WORKMANSHIP WARRANTY</h1>
        <p><strong>{{company_name}}</strong><br>{{company_address}}<br>Phone: {{company_phone}}</p>
    </div>

    <div class="section">
        <h3>Property Information</h3>
        <p><strong>Property Owner:</strong> {{customer_name}}</p>
        <p><strong>Property Address:</strong> {{property_address}}, {{property_city}}, {{property_state}} {{property_zip}}</p>
        <p><strong>Installation Date:</strong> {{current_date}}</p>
    </div>

    <div class="section">
        <h3>Warranty Coverage</h3>
        <p>{{company_name}} warrants all workmanship for a period of <strong>5 years</strong> from the installation date.</p>
        <p>This warranty covers defects in installation and workmanship only. Material warranties are provided separately by manufacturers.</p>
    </div>

    <div class="section">
        <h3>Warranty Limitations</h3>
        <ul>
            <li>Normal wear and tear</li>
            <li>Acts of nature (storms, hail, wind)</li>
            <li>Damage caused by others</li>
            <li>Failure to maintain the roof properly</li>
        </ul>
    </div>
</body>
</html>',
    updated_at = NOW()
WHERE name = 'Limited Workmanship Warranty';

-- Update Conditional Lien Release template
UPDATE document_templates
SET html_content = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Conditional Lien Release</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 25px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .signature-box { border: 1px solid #333; height: 60px; margin: 10px 0; display: inline-block; width: 300px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>CONDITIONAL LIEN RELEASE</h1>
        <h2>Progress Payment</h2>
        <p><strong>{{company_name}}</strong></p>
    </div>

    <div class="section">
        <h3>Project Information</h3>
        <p><strong>Property Owner:</strong> {{customer_name}}</p>
        <p><strong>Property Address:</strong> {{property_address}}</p>
        <p><strong>Date:</strong> {{current_date}}</p>
    </div>

    <div class="section">
        <h3>Release Statement</h3>
        <p>Upon receipt of payment in the amount of {{contract_amount}}, the undersigned releases any and all lien rights against the above property for work performed through this date.</p>
        <p>This release is conditioned upon actual receipt of the funds.</p>
    </div>

    <div class="section">
        <h3>Contractor Signature</h3>
        <div class="signature-box"></div>
    </div>
</body>
</html>',
    updated_at = NOW()
WHERE name = 'Conditional Lien Release (Progress Payment)';

-- Update Unconditional Lien Release template
UPDATE document_templates
SET html_content = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Unconditional Lien Release</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 25px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .signature-box { border: 1px solid #333; height: 60px; margin: 10px 0; display: inline-block; width: 300px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>UNCONDITIONAL LIEN RELEASE</h1>
        <h2>Final Payment</h2>
        <p><strong>{{company_name}}</strong></p>
    </div>

    <div class="section">
        <h3>Project Information</h3>
        <p><strong>Property Owner:</strong> {{customer_name}}</p>
        <p><strong>Property Address:</strong> {{property_address}}</p>
        <p><strong>Date:</strong> {{current_date}}</p>
    </div>

    <div class="section">
        <h3>Release Statement</h3>
        <p>The undersigned has received final payment in full for all labor, services, equipment, and materials furnished to the above property.</p>
        <p>The undersigned hereby unconditionally waives and releases any and all lien rights.</p>
    </div>

    <div class="section">
        <h3>Contractor Signature</h3>
        <div class="signature-box"></div>
    </div>
</body>
</html>',
    updated_at = NOW()
WHERE name = 'Unconditional Lien Release (Final Payment)';

-- Update Authorization to Release Insurance Information template
UPDATE document_templates
SET html_content = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Authorization to Release Insurance Information</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 25px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .signature-box { border: 1px solid #333; height: 60px; margin: 10px 0; display: inline-block; width: 300px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>AUTHORIZATION TO RELEASE INSURANCE INFORMATION</h1>
        <p><strong>{{company_name}}</strong></p>
    </div>

    <div class="section">
        <h3>Property Information</h3>
        <p><strong>Property Owner:</strong> {{customer_name}}</p>
        <p><strong>Property Address:</strong> {{property_address}}</p>
        <p><strong>Insurance Carrier:</strong> {{insurance_carrier}}</p>
        <p><strong>Policy Number:</strong> {{policy_number}}</p>
        <p><strong>Claim Number:</strong> {{claim_number}}</p>
    </div>

    <div class="section">
        <h3>Authorization</h3>
        <p>I hereby authorize {{company_name}} to obtain any and all information from my insurance company regarding my claim.</p>
    </div>

    <div class="section">
        <h3>Property Owner Signature</h3>
        <div class="signature-box"></div>
        <p>Date: {{current_date}}</p>
    </div>
</body>
</html>',
    updated_at = NOW()
WHERE name = 'Authorization to Release Insurance Information';

-- Verify updates
-- SELECT name, length(html_content) as html_length FROM document_templates WHERE html_content IS NOT NULL;
