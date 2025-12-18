-- Migration to add html_content for remaining document templates
-- These templates exist but have no HTML content

-- Update Pre-Roofing Inspection Form template
UPDATE document_templates
SET html_content = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Pre-Roofing Inspection Form</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 25px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .section h3 { margin-top: 0; color: #2c5aa0; }
        .checkbox-item { margin: 8px 0; }
        .checkbox-box { display: inline-block; width: 18px; height: 18px; border: 1px solid #333; margin-right: 8px; vertical-align: middle; }
        .notes-area { border: 1px solid #ddd; min-height: 60px; padding: 10px; margin-top: 10px; }
        .signature-box { border: 1px solid #333; height: 60px; margin: 10px 0; display: inline-block; width: 300px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PRE-ROOFING INSPECTION FORM</h1>
        <p><strong>{{company_name}}</strong><br>{{company_address}}<br>Phone: {{company_phone}}</p>
    </div>

    <div class="section">
        <h3>Property Information</h3>
        <p><strong>Property Owner:</strong> {{customer_name}}</p>
        <p><strong>Property Address:</strong> {{property_address}}, {{property_city}}, {{property_state}} {{property_zip}}</p>
        <p><strong>Inspection Date:</strong> {{current_date}}</p>
        <p><strong>Inspector:</strong> {{inspector_name}}</p>
    </div>

    <div class="section">
        <h3>Existing Roof Condition</h3>
        <div class="checkbox-item"><span class="checkbox-box"></span> Shingles - Missing</div>
        <div class="checkbox-item"><span class="checkbox-box"></span> Shingles - Curling/Buckling</div>
        <div class="checkbox-item"><span class="checkbox-box"></span> Shingles - Cracked/Broken</div>
        <div class="checkbox-item"><span class="checkbox-box"></span> Granule Loss</div>
        <div class="checkbox-item"><span class="checkbox-box"></span> Flashing Damage</div>
        <div class="checkbox-item"><span class="checkbox-box"></span> Ridge Cap Issues</div>
        <div class="checkbox-item"><span class="checkbox-box"></span> Vent Damage</div>
        <div class="checkbox-item"><span class="checkbox-box"></span> Gutter Issues</div>
        <div class="checkbox-item"><span class="checkbox-box"></span> Soffit/Fascia Damage</div>
        <p><strong>Notes:</strong></p>
        <div class="notes-area">{{inspection_notes}}</div>
    </div>

    <div class="section">
        <h3>Decking Assessment</h3>
        <div class="checkbox-item"><span class="checkbox-box"></span> Decking appears solid</div>
        <div class="checkbox-item"><span class="checkbox-box"></span> Soft spots detected</div>
        <div class="checkbox-item"><span class="checkbox-box"></span> Visible rot/damage</div>
        <div class="checkbox-item"><span class="checkbox-box"></span> Further inspection needed after tear-off</div>
    </div>

    <div class="section">
        <h3>Attic/Interior Check</h3>
        <div class="checkbox-item"><span class="checkbox-box"></span> Water stains present</div>
        <div class="checkbox-item"><span class="checkbox-box"></span> Active leaks observed</div>
        <div class="checkbox-item"><span class="checkbox-box"></span> Adequate ventilation</div>
        <div class="checkbox-item"><span class="checkbox-box"></span> Insulation in good condition</div>
    </div>

    <div class="section">
        <h3>Measurements</h3>
        <p><strong>Roof Squares:</strong> {{roof_squares}}</p>
        <p><strong>Pitch:</strong> {{roof_pitch}}</p>
        <p><strong>Stories:</strong> {{building_stories}}</p>
    </div>

    <div class="section">
        <h3>Signatures</h3>
        <p><strong>Inspector Signature:</strong></p>
        <div class="signature-box"></div>
        <p><strong>Property Owner Acknowledgment:</strong></p>
        <div class="signature-box"></div>
        <p>Date: {{current_date}}</p>
    </div>
</body>
</html>',
    updated_at = NOW()
WHERE name = 'Pre-Roofing Inspection Form';

-- Update Project Completion Certificate template
UPDATE document_templates
SET html_content = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Project Completion Certificate</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 25px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .section h3 { margin-top: 0; color: #2c5aa0; }
        .signature-box { border: 1px solid #333; height: 60px; margin: 10px 0; display: inline-block; width: 300px; }
        .completion-badge { text-align: center; padding: 20px; background: #f0f9f0; border: 2px solid #2e7d32; border-radius: 10px; margin: 20px 0; }
        .completion-badge h2 { color: #2e7d32; margin: 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PROJECT COMPLETION CERTIFICATE</h1>
        <p><strong>{{company_name}}</strong><br>{{company_address}}<br>Phone: {{company_phone}}</p>
    </div>

    <div class="completion-badge">
        <h2>WORK COMPLETED</h2>
        <p>This certifies that all contracted work has been completed</p>
    </div>

    <div class="section">
        <h3>Project Information</h3>
        <p><strong>Project Name:</strong> {{project_name}}</p>
        <p><strong>Property Owner:</strong> {{customer_name}}</p>
        <p><strong>Property Address:</strong> {{property_address}}, {{property_city}}, {{property_state}} {{property_zip}}</p>
        <p><strong>Completion Date:</strong> {{current_date}}</p>
    </div>

    <div class="section">
        <h3>Work Performed</h3>
        <p>{{project_description}}</p>
    </div>

    <div class="section">
        <h3>Final Walkthrough</h3>
        <p>The undersigned property owner confirms that:</p>
        <ul>
            <li>A final walkthrough of the completed work has been performed</li>
            <li>All contracted work has been completed to satisfaction</li>
            <li>The work area has been cleaned and debris removed</li>
            <li>All questions regarding the work have been addressed</li>
        </ul>
    </div>

    <div class="section">
        <h3>Warranty Information</h3>
        <p>This project is covered by our workmanship warranty. Please refer to your warranty documentation for specific terms and coverage details.</p>
    </div>

    <div class="section">
        <h3>Customer Acknowledgment</h3>
        <p>By signing below, I acknowledge that the work has been completed to my satisfaction and I have received all relevant documentation including warranty information.</p>
        <p><strong>Customer Signature:</strong></p>
        <div class="signature-box"></div>
        <p><strong>Printed Name:</strong> {{customer_name}}</p>
        <p><strong>Date:</strong> {{current_date}}</p>
    </div>

    <div class="section">
        <h3>Contractor Verification</h3>
        <p><strong>Contractor Representative:</strong></p>
        <div class="signature-box"></div>
        <p><strong>Date:</strong> {{current_date}}</p>
    </div>
</body>
</html>',
    updated_at = NOW()
WHERE name = 'Project Completion Certificate';

-- Update Roof Inspection Report template
UPDATE document_templates
SET html_content = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Roof Inspection Report</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 25px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .section h3 { margin-top: 0; color: #2c5aa0; }
        .rating-scale { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; }
        .rating-item { text-align: center; padding: 5px 15px; }
        .grade-box { width: 40px; height: 40px; border: 2px solid #333; display: inline-block; text-align: center; line-height: 40px; font-weight: bold; font-size: 18px; }
        .condition-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .notes-area { border: 1px solid #ddd; min-height: 80px; padding: 10px; margin-top: 10px; }
        .signature-box { border: 1px solid #333; height: 60px; margin: 10px 0; display: inline-block; width: 300px; }
        .photo-placeholder { border: 2px dashed #ccc; height: 150px; margin: 10px 0; display: flex; align-items: center; justify-content: center; color: #999; }
    </style>
</head>
<body>
    <div class="header">
        <h1>ROOF INSPECTION REPORT</h1>
        <p><strong>{{company_name}}</strong><br>{{company_address}}<br>Phone: {{company_phone}}</p>
    </div>

    <div class="section">
        <h3>Property Information</h3>
        <p><strong>Property Owner:</strong> {{customer_name}}</p>
        <p><strong>Property Address:</strong> {{property_address}}, {{property_city}}, {{property_state}} {{property_zip}}</p>
        <p><strong>Inspection Date:</strong> {{current_date}}</p>
        <p><strong>Inspector:</strong> {{inspector_name}}</p>
        <p><strong>Weather Conditions:</strong> {{weather_conditions}}</p>
    </div>

    <div class="section">
        <h3>Roof Details</h3>
        <p><strong>Roof Type:</strong> {{roof_type}}</p>
        <p><strong>Approximate Age:</strong> {{roof_age}} years</p>
        <p><strong>Total Squares:</strong> {{roof_squares}}</p>
        <p><strong>Pitch:</strong> {{roof_pitch}}</p>
        <p><strong>Number of Layers:</strong> {{roof_layers}}</p>
    </div>

    <div class="section">
        <h3>Overall Condition Rating</h3>
        <div class="rating-scale">
            <div class="rating-item"><div class="grade-box">A</div><br>Excellent</div>
            <div class="rating-item"><div class="grade-box">B</div><br>Good</div>
            <div class="rating-item"><div class="grade-box">C</div><br>Fair</div>
            <div class="rating-item"><div class="grade-box">D</div><br>Poor</div>
            <div class="rating-item"><div class="grade-box">F</div><br>Failed</div>
        </div>
        <p><strong>Overall Grade:</strong> <span class="grade-box">{{overall_grade}}</span></p>
    </div>

    <div class="section">
        <h3>Component Assessment</h3>
        <div class="condition-row"><span>Shingles/Covering</span><span>{{shingles_condition}}</span></div>
        <div class="condition-row"><span>Flashing</span><span>{{flashing_condition}}</span></div>
        <div class="condition-row"><span>Ridge Cap</span><span>{{ridge_condition}}</span></div>
        <div class="condition-row"><span>Valleys</span><span>{{valleys_condition}}</span></div>
        <div class="condition-row"><span>Vents/Penetrations</span><span>{{vents_condition}}</span></div>
        <div class="condition-row"><span>Gutters</span><span>{{gutters_condition}}</span></div>
        <div class="condition-row"><span>Soffit/Fascia</span><span>{{soffit_condition}}</span></div>
        <div class="condition-row"><span>Decking (visible)</span><span>{{decking_condition}}</span></div>
    </div>

    <div class="section">
        <h3>Damage Observations</h3>
        <p><strong>Storm Damage:</strong> {{storm_damage}}</p>
        <p><strong>Wear/Age Related:</strong> {{wear_damage}}</p>
        <p><strong>Installation Issues:</strong> {{installation_issues}}</p>
    </div>

    <div class="section">
        <h3>Photo Documentation</h3>
        <div class="photo-placeholder">[Photos attached separately]</div>
    </div>

    <div class="section">
        <h3>Recommendations</h3>
        <p>{{recommendations}}</p>
    </div>

    <div class="section">
        <h3>Estimated Remaining Life</h3>
        <p>Based on current conditions, the estimated remaining useful life of this roof is approximately <strong>{{remaining_life}}</strong> years.</p>
    </div>

    <div class="section">
        <h3>Inspector Certification</h3>
        <p>I certify that this inspection was performed in accordance with industry standards and the findings accurately represent the condition of the roof at the time of inspection.</p>
        <p><strong>Inspector Signature:</strong></p>
        <div class="signature-box"></div>
        <p><strong>Date:</strong> {{current_date}}</p>
        <p><strong>License #:</strong> {{license_number}}</p>
    </div>
</body>
</html>',
    updated_at = NOW()
WHERE name = 'Roof Inspection Report';

-- Verify updates
-- SELECT name, length(html_content) as html_length FROM document_templates WHERE name IN ('Pre-Roofing Inspection Form', 'Project Completion Certificate', 'Roof Inspection Report');
