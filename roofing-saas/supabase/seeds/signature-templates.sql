-- =====================================================
-- SIGNATURE TEMPLATES SEED DATA
-- Date: 2025-12-18
-- Purpose: Create 11 industry-standard signature templates for roofing contractors
-- Features: Insurance restoration focus for Appalachian Storm Restoration
-- =====================================================
--
-- TENANT CONFIGURATION:
-- ---------------------
-- Production: Appalachian Storm Restoration = 00000000-0000-0000-0000-000000000000
-- Development: Clarity AI Development       = 478d279b-5b8a-4040-a805-75d595d59702
--
-- This seed file creates templates for the PRODUCTION tenant (Appalachian Storm).
-- Jared Miller has admin access to both tenants for testing/debugging.
-- =====================================================

-- Insert signature document templates for Appalachian Storm Restoration
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
) VALUES

-- =====================================================
-- 1. INSURANCE RESTORATION TEMPLATES
-- =====================================================

-- 1. Authorization of Insured (AOB/Contingency Agreement)
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000', -- Appalachian Storm Restoration (PRODUCTION)
  'Authorization of Insured (AOB)',
  'Authorization allowing contractor to act on behalf of insured for insurance claims and settlement negotiations',
  'contract',
  '<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
    <h2 style="text-align: center; margin-bottom: 30px;">AUTHORIZATION OF INSURED</h2>

    <p><strong>Property Owner:</strong> ___________________________</p>
    <p><strong>Property Address:</strong> ___________________________</p>
    <p><strong>Insurance Company:</strong> ___________________________</p>
    <p><strong>Policy Number:</strong> ___________________________</p>
    <p><strong>Claim Number:</strong> ___________________________</p>

    <p>I/We, the undersigned property owner(s), hereby authorize <strong>[COMPANY_NAME]</strong> to act as my/our representative in all matters related to the insurance claim for damage to the above-referenced property.</p>

    <p>This authorization includes but is not limited to:</p>
    <ul>
      <li>Communicating with the insurance company regarding the claim</li>
      <li>Receiving and endorsing insurance claim payments</li>
      <li>Negotiating the scope and amount of the insurance settlement</li>
      <li>Signing necessary documents related to the claim settlement</li>
    </ul>

    <p>The contractor agrees to perform all necessary repairs to restore the property to its pre-loss condition using the insurance proceeds. Any additional costs beyond the insurance settlement will be discussed and approved in writing before proceeding.</p>

    <p>This authorization remains in effect until the claim is fully settled and all repairs are completed, or until revoked in writing by the property owner.</p>

    <div style="margin-top: 50px;">
      <p><strong>Property Owner Signature:</strong></p>
      <div style="border-bottom: 1px solid #000; width: 300px; margin: 20px 0;"></div>
      <p>Date: _______________</p>
    </div>

    <div style="margin-top: 30px;">
      <p><strong>Contractor Representative:</strong></p>
      <div style="border-bottom: 1px solid #000; width: 300px; margin: 20px 0;"></div>
      <p>Date: _______________</p>
    </div>
  </div>',
  '[
    {"id": "customer_sig", "type": "signature", "label": "Property Owner Signature", "page": 1, "x": 20, "y": 75, "width": 200, "height": 50, "required": true, "assignedTo": "customer", "tabOrder": 1},
    {"id": "customer_date", "type": "date", "label": "Date", "page": 1, "x": 250, "y": 75, "width": 120, "height": 30, "required": true, "assignedTo": "customer", "tabOrder": 2},
    {"id": "company_sig", "type": "signature", "label": "Contractor Representative", "page": 1, "x": 20, "y": 85, "width": 200, "height": 50, "required": true, "assignedTo": "company", "tabOrder": 3},
    {"id": "company_date", "type": "date", "label": "Date", "page": 1, "x": 250, "y": 85, "width": 120, "height": 30, "required": true, "assignedTo": "company", "tabOrder": 4}
  ]',
  true,
  true,
  30,
  true,
  true
),

-- 2. Insurance Work Completion Certificate
(
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'Insurance Work Completion Certificate',
  'Certificate confirming completion of insurance restoration work and customer satisfaction',
  'contract',
  '<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
    <h2 style="text-align: center; margin-bottom: 30px;">WORK COMPLETION CERTIFICATE</h2>

    <p><strong>Project:</strong> ___________________________</p>
    <p><strong>Property Address:</strong> ___________________________</p>
    <p><strong>Completion Date:</strong> ___________________________</p>
    <p><strong>Insurance Claim #:</strong> ___________________________</p>

    <h3>Certification of Completion</h3>
    <p>I/We, <strong>[COMPANY_NAME]</strong>, certify that all work specified in the attached scope has been completed in accordance with:</p>
    <ul>
      <li>Industry standards and best practices</li>
      <li>Local building codes and permit requirements</li>
      <li>Insurance adjustor approved scope of work</li>
      <li>Manufacturer specifications for all materials used</li>
    </ul>

    <h3>Customer Acceptance</h3>
    <p>I/We, the property owner(s), acknowledge that:</p>
    <ul>
      <li>All work has been completed to my/our satisfaction</li>
      <li>The property has been restored to its pre-loss condition</li>
      <li>A final walk-through inspection has been conducted</li>
      <li>All debris has been removed from the property</li>
      <li>I/We have received all applicable warranties</li>
    </ul>

    <h3>Warranty Information</h3>
    <p>This work is covered by:</p>
    <ul>
      <li>Workmanship warranty: 2 years from completion date</li>
      <li>Material warranties: As provided by manufacturers</li>
    </ul>

    <div style="margin-top: 50px;">
      <table style="width: 100%;">
        <tr>
          <td style="width: 50%; vertical-align: top;">
            <p><strong>Customer Signature:</strong></p>
            <div style="border-bottom: 1px solid #000; width: 250px; margin: 20px 0;"></div>
            <p>Print Name: _______________</p>
            <p>Date: _______________</p>
          </td>
          <td style="width: 50%; vertical-align: top;">
            <p><strong>Contractor Representative:</strong></p>
            <div style="border-bottom: 1px solid #000; width: 250px; margin: 20px 0;"></div>
            <p>Print Name: _______________</p>
            <p>Date: _______________</p>
          </td>
        </tr>
      </table>
    </div>
  </div>',
  '[
    {"id": "customer_sig", "type": "signature", "label": "Customer Signature", "page": 1, "x": 10, "y": 80, "width": 200, "height": 50, "required": true, "assignedTo": "customer", "tabOrder": 1},
    {"id": "customer_name", "type": "name", "label": "Customer Name", "page": 1, "x": 10, "y": 88, "width": 180, "height": 30, "required": true, "assignedTo": "customer", "tabOrder": 2},
    {"id": "customer_date", "type": "date", "label": "Date", "page": 1, "x": 10, "y": 92, "width": 120, "height": 30, "required": true, "assignedTo": "customer", "tabOrder": 3},
    {"id": "company_sig", "type": "signature", "label": "Contractor Signature", "page": 1, "x": 55, "y": 80, "width": 200, "height": 50, "required": true, "assignedTo": "company", "tabOrder": 4},
    {"id": "company_name", "type": "name", "label": "Contractor Name", "page": 1, "x": 55, "y": 88, "width": 180, "height": 30, "required": true, "assignedTo": "company", "tabOrder": 5},
    {"id": "company_date", "type": "date", "label": "Date", "page": 1, "x": 55, "y": 92, "width": 120, "height": 30, "required": true, "assignedTo": "company", "tabOrder": 6}
  ]',
  true,
  true,
  30,
  true,
  false
);

-- 3. Authorization to Release Insurance Information
INSERT INTO document_templates (
  id, tenant_id, name, description, category, html_content, signature_fields,
  requires_customer_signature, requires_company_signature, expiration_days, is_active, is_default
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'Authorization to Release Insurance Information',
  'Authorization for contractor to obtain insurance information and communicate with insurance company',
  'contract',
  '<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
    <h2 style="text-align: center; margin-bottom: 30px;">AUTHORIZATION TO RELEASE INSURANCE INFORMATION</h2>

    <p><strong>To:</strong> ___________________________</p>
    <p><strong>Insurance Company</strong></p>

    <p><strong>From:</strong></p>
    <p>Name: ___________________________</p>
    <p>Address: ___________________________</p>
    <p>City, State, ZIP: ___________________________</p>
    <p>Policy Number: ___________________________</p>
    <p>Claim Number: ___________________________</p>

    <p>I/We hereby authorize <strong>[COMPANY_NAME]</strong> located at <strong>[COMPANY_ADDRESS]</strong> to:</p>

    <ol>
      <li>Obtain and review my/our insurance policy terms and coverage details</li>
      <li>Communicate directly with adjustors and claims representatives</li>
      <li>Receive copies of all claim documentation and correspondence</li>
      <li>Discuss the scope of damage and necessary repairs</li>
      <li>Provide estimates and repair specifications</li>
      <li>Attend claim inspections and meetings on my/our behalf</li>
      <li>Negotiate fair and reasonable settlement terms</li>
    </ol>

    <p>This authorization is given to facilitate the processing of my/our claim and to ensure proper restoration of my/our property. The contractor is authorized to act in my/our best interests regarding this claim.</p>

    <p>This authorization shall remain in effect until the claim is fully resolved or until I/we provide written notice of revocation to both the insurance company and the contractor.</p>

    <p>A photocopy of this authorization shall be considered as valid as the original.</p>

    <div style="margin-top: 50px;">
      <p><strong>Insured Signature:</strong></p>
      <div style="border-bottom: 1px solid #000; width: 300px; margin: 20px 0;"></div>
      <p>Print Name: _______________</p>
      <p>Date: _______________</p>
    </div>
  </div>',
  '[
    {"id": "customer_sig", "type": "signature", "label": "Insured Signature", "page": 1, "x": 20, "y": 85, "width": 200, "height": 50, "required": true, "assignedTo": "customer", "tabOrder": 1},
    {"id": "customer_name", "type": "name", "label": "Print Name", "page": 1, "x": 20, "y": 91, "width": 180, "height": 30, "required": true, "assignedTo": "customer", "tabOrder": 2},
    {"id": "customer_date", "type": "date", "label": "Date", "page": 1, "x": 20, "y": 95, "width": 120, "height": 30, "required": true, "assignedTo": "customer", "tabOrder": 3}
  ]',
  true, false, 30, true, false
);

-- 4. Residential Roofing Contract
INSERT INTO document_templates (
  id, tenant_id, name, description, category, html_content, signature_fields,
  requires_customer_signature, requires_company_signature, expiration_days, is_active, is_default
) VALUES (
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000000',
  'Residential Roofing Contract',
  'Comprehensive residential roofing contract including scope, terms, and warranty provisions',
  'contract',
  '<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
    <h2 style="text-align: center; margin-bottom: 30px;">RESIDENTIAL ROOFING CONTRACT</h2>

    <p><strong>Contractor:</strong> [COMPANY_NAME]</p>
    <p><strong>License #:</strong> [LICENSE_NUMBER]</p>
    <p><strong>Address:</strong> [COMPANY_ADDRESS]</p>
    <p><strong>Phone:</strong> [COMPANY_PHONE]</p>

    <p><strong>Customer:</strong> ___________________________</p>
    <p><strong>Address:</strong> ___________________________</p>
    <p><strong>Phone:</strong> ___________________________</p>

    <h3>Scope of Work</h3>
    <p>Contractor agrees to furnish all labor, materials, equipment, and services necessary for:</p>
    <div style="border: 1px solid #ccc; padding: 10px; margin: 10px 0; min-height: 100px;">
      [DETAILED SCOPE TO BE INSERTED]
    </div>

    <h3>Contract Terms</h3>
    <p><strong>Total Contract Price:</strong> $_______________</p>
    <p><strong>Payment Schedule:</strong></p>
    <ul>
      <li>Down Payment: $_______ upon signing</li>
      <li>Progress Payment: $_______ when materials arrive</li>
      <li>Final Payment: $_______ upon completion</li>
    </ul>

    <h3>Warranties</h3>
    <ul>
      <li>Workmanship: 2 years from completion</li>
      <li>Materials: As provided by manufacturer</li>
      <li>Roofing System: As specified in attached warranty documentation</li>
    </ul>

    <h3>Terms and Conditions</h3>
    <p>1. Work will commence on _____________ and be completed by _____________.</p>
    <p>2. Customer is responsible for obtaining necessary permits unless otherwise specified.</p>
    <p>3. Contractor will clean up daily and remove all debris upon completion.</p>
    <p>4. This contract constitutes the entire agreement between parties.</p>

    <div style="margin-top: 50px;">
      <table style="width: 100%;">
        <tr>
          <td style="width: 50%; vertical-align: top;">
            <p><strong>Customer Signature:</strong></p>
            <div style="border-bottom: 1px solid #000; width: 250px; margin: 20px 0;"></div>
            <p>Date: _______________</p>
          </td>
          <td style="width: 50%; vertical-align: top;">
            <p><strong>Contractor Signature:</strong></p>
            <div style="border-bottom: 1px solid #000; width: 250px; margin: 20px 0;"></div>
            <p>Date: _______________</p>
          </td>
        </tr>
      </table>
    </div>
  </div>',
  '[
    {"id": "customer_sig", "type": "signature", "label": "Customer Signature", "page": 1, "x": 10, "y": 85, "width": 200, "height": 50, "required": true, "assignedTo": "customer", "tabOrder": 1},
    {"id": "customer_date", "type": "date", "label": "Customer Date", "page": 1, "x": 10, "y": 91, "width": 120, "height": 30, "required": true, "assignedTo": "customer", "tabOrder": 2},
    {"id": "company_sig", "type": "signature", "label": "Contractor Signature", "page": 1, "x": 55, "y": 85, "width": 200, "height": 50, "required": true, "assignedTo": "company", "tabOrder": 3},
    {"id": "company_date", "type": "date", "label": "Contractor Date", "page": 1, "x": 55, "y": 91, "width": 120, "height": 30, "required": true, "assignedTo": "company", "tabOrder": 4}
  ]',
  true, true, 45, true, true
);

-- 5. Change Order
INSERT INTO document_templates (
  id, tenant_id, name, description, category, html_content, signature_fields,
  requires_customer_signature, requires_company_signature, expiration_days, is_active, is_default
) VALUES (
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000000',
  'Change Order',
  'Authorization for changes to original contract scope or pricing',
  'change_order',
  '<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
    <h2 style="text-align: center; margin-bottom: 30px;">CHANGE ORDER</h2>

    <p><strong>Original Contract Date:</strong> _______________</p>
    <p><strong>Project:</strong> ___________________________</p>
    <p><strong>Customer:</strong> ___________________________</p>
    <p><strong>Address:</strong> ___________________________</p>

    <h3>Description of Change</h3>
    <div style="border: 1px solid #ccc; padding: 15px; margin: 15px 0; min-height: 100px;">
      [DETAILED DESCRIPTION OF CHANGES]
    </div>

    <h3>Reason for Change</h3>
    <div style="border: 1px solid #ccc; padding: 15px; margin: 15px 0; min-height: 50px;">
      □ Customer Request  □ Site Conditions  □ Code Requirements  □ Material Availability  □ Other: ____________
    </div>

    <h3>Cost Impact</h3>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr>
        <td style="border: 1px solid #000; padding: 8px; background-color: #f5f5f5;"><strong>Original Contract Amount:</strong></td>
        <td style="border: 1px solid #000; padding: 8px;">$_______________</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 8px; background-color: #f5f5f5;"><strong>Previous Change Orders:</strong></td>
        <td style="border: 1px solid #000; padding: 8px;">$_______________</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 8px; background-color: #f5f5f5;"><strong>This Change Order:</strong></td>
        <td style="border: 1px solid #000; padding: 8px;">$_______________</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 8px; background-color: #f5f5f5;"><strong>New Contract Total:</strong></td>
        <td style="border: 1px solid #000; padding: 8px;">$_______________</td>
      </tr>
    </table>

    <h3>Schedule Impact</h3>
    <p>Original Completion Date: _______________</p>
    <p>New Completion Date: _______________</p>
    <p>Additional Days: _______________</p>

    <p><strong>Authorization:</strong> Both parties agree to the above changes to the original contract.</p>

    <div style="margin-top: 40px;">
      <table style="width: 100%;">
        <tr>
          <td style="width: 50%; vertical-align: top;">
            <p><strong>Customer Approval:</strong></p>
            <div style="border-bottom: 1px solid #000; width: 250px; margin: 20px 0;"></div>
            <p>Date: _______________</p>
          </td>
          <td style="width: 50%; vertical-align: top;">
            <p><strong>Contractor Approval:</strong></p>
            <div style="border-bottom: 1px solid #000; width: 250px; margin: 20px 0;"></div>
            <p>Date: _______________</p>
          </td>
        </tr>
      </table>
    </div>
  </div>',
  '[
    {"id": "customer_sig", "type": "signature", "label": "Customer Approval", "page": 1, "x": 10, "y": 85, "width": 200, "height": 50, "required": true, "assignedTo": "customer", "tabOrder": 1},
    {"id": "customer_date", "type": "date", "label": "Customer Date", "page": 1, "x": 10, "y": 91, "width": 120, "height": 30, "required": true, "assignedTo": "customer", "tabOrder": 2},
    {"id": "company_sig", "type": "signature", "label": "Contractor Approval", "page": 1, "x": 55, "y": 85, "width": 200, "height": 50, "required": true, "assignedTo": "company", "tabOrder": 3},
    {"id": "company_date", "type": "date", "label": "Contractor Date", "page": 1, "x": 55, "y": 91, "width": 120, "height": 30, "required": true, "assignedTo": "company", "tabOrder": 4}
  ]',
  true, true, 30, true, true
);

-- 6. Conditional Lien Release (Progress Payment)
INSERT INTO document_templates (
  id, tenant_id, name, description, category, html_content, signature_fields,
  requires_customer_signature, requires_company_signature, expiration_days, is_active, is_default
) VALUES (
  '00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000000',
  'Conditional Lien Release (Progress Payment)',
  'Conditional waiver and release of lien rights for progress payment',
  'waiver',
  '<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
    <h2 style="text-align: center; margin-bottom: 30px;">CONDITIONAL WAIVER AND RELEASE UPON PROGRESS PAYMENT</h2>

    <p><strong>Property:</strong> ___________________________</p>
    <p><strong>Property Address:</strong> ___________________________</p>
    <p><strong>Owner:</strong> ___________________________</p>

    <p>The undersigned lien claimant, in consideration of the sum of <strong>$_______________</strong> hereby waives and releases its lien and right to claim a lien for labor and/or materials furnished to the above-described property to the extent of the payment received.</p>

    <p><strong>This release is conditioned upon receipt of payment in the above amount.</strong></p>

    <h3>Payment Details</h3>
    <p><strong>Check Number:</strong> _______________</p>
    <p><strong>Payment Date:</strong> _______________</p>
    <p><strong>Payment Period Through:</strong> _______________</p>

    <h3>Important Notice</h3>
    <p>This document waives rights unconditionally and states that you have been paid for giving up those rights. This document is enforceable against you if you sign it, even if you have not been paid. If you have not been paid, use a conditional release form.</p>

    <h3>Scope of Release</h3>
    <p>This release covers only the work performed and materials furnished through the payment period specified above. All rights are reserved for:</p>
    <ul>
      <li>Work performed after the specified payment period</li>
      <li>Materials delivered after the specified payment period</li>
      <li>Extra work not included in the original contract</li>
      <li>Any unpaid retention amounts</li>
    </ul>

    <div style="margin-top: 50px;">
      <p><strong>Contractor:</strong> [COMPANY_NAME]</p>
      <p><strong>License #:</strong> [LICENSE_NUMBER]</p>

      <p><strong>By:</strong></p>
      <div style="border-bottom: 1px solid #000; width: 300px; margin: 20px 0;"></div>
      <p>Signature</p>

      <p>Print Name: _______________</p>
      <p>Title: _______________</p>
      <p>Date: _______________</p>
    </div>
  </div>',
  '[
    {"id": "company_sig", "type": "signature", "label": "Contractor Signature", "page": 1, "x": 20, "y": 85, "width": 200, "height": 50, "required": true, "assignedTo": "company", "tabOrder": 1},
    {"id": "company_name", "type": "name", "label": "Print Name", "page": 1, "x": 20, "y": 91, "width": 180, "height": 30, "required": true, "assignedTo": "company", "tabOrder": 2},
    {"id": "company_title", "type": "text", "label": "Title", "page": 1, "x": 20, "y": 94, "width": 150, "height": 30, "required": true, "assignedTo": "company", "tabOrder": 3},
    {"id": "company_date", "type": "date", "label": "Date", "page": 1, "x": 20, "y": 97, "width": 120, "height": 30, "required": true, "assignedTo": "company", "tabOrder": 4}
  ]',
  false, true, 15, true, false
);

-- 7. Unconditional Lien Release (Final Payment)
INSERT INTO document_templates (
  id, tenant_id, name, description, category, html_content, signature_fields,
  requires_customer_signature, requires_company_signature, expiration_days, is_active, is_default
) VALUES (
  '00000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000000',
  'Unconditional Lien Release (Final Payment)',
  'Unconditional waiver and release of all lien rights upon final payment',
  'waiver',
  '<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
    <h2 style="text-align: center; margin-bottom: 30px;">UNCONDITIONAL WAIVER AND RELEASE UPON FINAL PAYMENT</h2>

    <p><strong>Property:</strong> ___________________________</p>
    <p><strong>Property Address:</strong> ___________________________</p>
    <p><strong>Owner:</strong> ___________________________</p>

    <p>The undersigned lien claimant, in consideration of final payment in the sum of <strong>$_______________</strong> hereby waives and releases its lien and right to claim a lien for all labor and/or materials furnished to the above-described property.</p>

    <h3>Payment Details</h3>
    <p><strong>Final Payment Amount:</strong> $_______________</p>
    <p><strong>Check Number:</strong> _______________</p>
    <p><strong>Payment Date:</strong> _______________</p>
    <p><strong>Total Contract Amount:</strong> $_______________</p>

    <h3>Warranty Reservation</h3>
    <p>This release does not affect the contractor''s warranty obligations or rights to collect for warranty work performed after this date.</p>

    <h3>Full and Final Release</h3>
    <p>This constitutes a full and final release of all lien rights, claims, and demands against the above-described property for all work performed and materials furnished from project commencement through project completion.</p>

    <div style="margin-top: 50px;">
      <p><strong>Contractor:</strong> [COMPANY_NAME]</p>
      <p><strong>License #:</strong> [LICENSE_NUMBER]</p>
      <p><strong>Address:</strong> [COMPANY_ADDRESS]</p>

      <p><strong>By:</strong></p>
      <div style="border-bottom: 1px solid #000; width: 300px; margin: 20px 0;"></div>
      <p>Authorized Representative Signature</p>

      <p>Print Name: _______________</p>
      <p>Title: _______________</p>
      <p>Date: _______________</p>
    </div>

    <div style="margin-top: 30px;">
      <p><strong>Acknowledgment by Property Owner:</strong></p>
      <div style="border-bottom: 1px solid #000; width: 300px; margin: 20px 0;"></div>
      <p>Property Owner Signature</p>
      <p>Date: _______________</p>
    </div>
  </div>',
  '[
    {"id": "company_sig", "type": "signature", "label": "Contractor Signature", "page": 1, "x": 20, "y": 78, "width": 200, "height": 50, "required": true, "assignedTo": "company", "tabOrder": 1},
    {"id": "company_name", "type": "name", "label": "Print Name", "page": 1, "x": 20, "y": 84, "width": 180, "height": 30, "required": true, "assignedTo": "company", "tabOrder": 2},
    {"id": "company_title", "type": "text", "label": "Title", "page": 1, "x": 20, "y": 87, "width": 150, "height": 30, "required": true, "assignedTo": "company", "tabOrder": 3},
    {"id": "company_date", "type": "date", "label": "Date", "page": 1, "x": 20, "y": 90, "width": 120, "height": 30, "required": true, "assignedTo": "company", "tabOrder": 4},
    {"id": "customer_sig", "type": "signature", "label": "Property Owner Signature", "page": 1, "x": 20, "y": 95, "width": 200, "height": 50, "required": true, "assignedTo": "customer", "tabOrder": 5},
    {"id": "customer_date", "type": "date", "label": "Owner Date", "page": 1, "x": 250, "y": 95, "width": 120, "height": 30, "required": true, "assignedTo": "customer", "tabOrder": 6}
  ]',
  true, true, 15, true, false
);

-- 8. Limited Workmanship Warranty
INSERT INTO document_templates (
  id, tenant_id, name, description, category, html_content, signature_fields,
  requires_customer_signature, requires_company_signature, expiration_days, is_active, is_default
) VALUES (
  '00000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000000',
  'Limited Workmanship Warranty',
  'Limited warranty document for roofing workmanship and installation',
  'contract',
  '<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
    <h2 style="text-align: center; margin-bottom: 30px;">LIMITED WORKMANSHIP WARRANTY</h2>

    <p><strong>Contractor:</strong> [COMPANY_NAME]</p>
    <p><strong>License #:</strong> [LICENSE_NUMBER]</p>
    <p><strong>Address:</strong> [COMPANY_ADDRESS]</p>
    <p><strong>Phone:</strong> [COMPANY_PHONE]</p>

    <p><strong>Customer:</strong> ___________________________</p>
    <p><strong>Property Address:</strong> ___________________________</p>
    <p><strong>Project Completion Date:</strong> _______________</p>
    <p><strong>Contract Date:</strong> _______________</p>

    <h3>Warranty Coverage</h3>
    <p>Contractor warrants to the original property owner that all roofing work performed will be free from defects in workmanship for a period of <strong>TWO (2) YEARS</strong> from the completion date listed above.</p>

    <h3>What Is Covered</h3>
    <ul>
      <li>Installation defects that cause leaks</li>
      <li>Improper flashing installation</li>
      <li>Inadequate fastening of roofing materials</li>
      <li>Poor installation of roof penetrations</li>
      <li>Workmanship that does not meet industry standards</li>
    </ul>

    <h3>What Is Not Covered</h3>
    <ul>
      <li>Normal weathering and aging</li>
      <li>Damage from severe weather events (hail, wind, etc.)</li>
      <li>Damage caused by other contractors or homeowner modifications</li>
      <li>Damage from lack of maintenance</li>
      <li>Material defects (covered separately by manufacturer warranties)</li>
      <li>Damage from structural movement or settling</li>
    </ul>

    <h3>Warranty Terms</h3>
    <p>1. This warranty is non-transferable and applies only to the original property owner.</p>
    <p>2. Customer must provide written notice of any defects within 30 days of discovery.</p>
    <p>3. Contractor will repair or replace defective work at no charge to customer.</p>
    <p>4. Customer is responsible for providing safe access to the roof area.</p>
    <p>5. This warranty is voided if repairs are made by others without written consent.</p>

    <div style="margin-top: 50px;">
      <table style="width: 100%;">
        <tr>
          <td style="width: 50%; vertical-align: top;">
            <p><strong>Customer Acknowledgment:</strong></p>
            <div style="border-bottom: 1px solid #000; width: 250px; margin: 20px 0;"></div>
            <p>Date: _______________</p>
          </td>
          <td style="width: 50%; vertical-align: top;">
            <p><strong>Contractor:</strong></p>
            <div style="border-bottom: 1px solid #000; width: 250px; margin: 20px 0;"></div>
            <p>Date: _______________</p>
          </td>
        </tr>
      </table>
    </div>
  </div>',
  '[
    {"id": "customer_sig", "type": "signature", "label": "Customer Acknowledgment", "page": 1, "x": 10, "y": 85, "width": 200, "height": 50, "required": true, "assignedTo": "customer", "tabOrder": 1},
    {"id": "customer_date", "type": "date", "label": "Customer Date", "page": 1, "x": 10, "y": 91, "width": 120, "height": 30, "required": true, "assignedTo": "customer", "tabOrder": 2},
    {"id": "company_sig", "type": "signature", "label": "Contractor Signature", "page": 1, "x": 55, "y": 85, "width": 200, "height": 50, "required": true, "assignedTo": "company", "tabOrder": 3},
    {"id": "company_date", "type": "date", "label": "Contractor Date", "page": 1, "x": 55, "y": 91, "width": 120, "height": 30, "required": true, "assignedTo": "company", "tabOrder": 4}
  ]',
  true, true, 30, true, false
);

-- 9. Project Completion Certificate
INSERT INTO document_templates (
  id, tenant_id, name, description, category, html_content, signature_fields,
  requires_customer_signature, requires_company_signature, expiration_days, is_active, is_default
) VALUES (
  '00000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000000',
  'Project Completion Certificate',
  'Certificate documenting project completion and customer approval',
  'contract',
  '<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
    <h2 style="text-align: center; margin-bottom: 30px;">PROJECT COMPLETION CERTIFICATE</h2>

    <p><strong>Project:</strong> ___________________________</p>
    <p><strong>Customer:</strong> ___________________________</p>
    <p><strong>Property Address:</strong> ___________________________</p>
    <p><strong>Start Date:</strong> _______________</p>
    <p><strong>Completion Date:</strong> _______________</p>

    <h3>Work Completed</h3>
    <div style="border: 1px solid #ccc; padding: 15px; margin: 15px 0; min-height: 100px;">
      [SUMMARY OF COMPLETED WORK]
    </div>

    <h3>Customer Inspection Checklist</h3>
    <p>I/We have inspected the completed work and verify the following:</p>

    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr>
        <td style="padding: 8px;">□ All work has been completed according to contract specifications</td>
      </tr>
      <tr>
        <td style="padding: 8px;">□ All debris has been removed from the property</td>
      </tr>
      <tr>
        <td style="padding: 8px;">□ Work area has been cleaned to my satisfaction</td>
      </tr>
      <tr>
        <td style="padding: 8px;">□ All materials used appear to be of specified quality</td>
      </tr>
      <tr>
        <td style="padding: 8px;">□ I have received all applicable warranty documentation</td>
      </tr>
      <tr>
        <td style="padding: 8px;">□ All permits have been finalized (if applicable)</td>
      </tr>
      <tr>
        <td style="padding: 8px;">□ I am satisfied with the completed project</td>
      </tr>
    </table>

    <h3>Final Payment Authorization</h3>
    <p>By signing below, I authorize final payment and acknowledge that all work has been completed to my satisfaction.</p>

    <p><strong>Final Payment Amount:</strong> $_______________</p>

    <h3>Customer Comments</h3>
    <div style="border: 1px solid #ccc; padding: 15px; margin: 15px 0; min-height: 60px;">
      [OPTIONAL CUSTOMER COMMENTS]
    </div>

    <div style="margin-top: 50px;">
      <table style="width: 100%;">
        <tr>
          <td style="width: 50%; vertical-align: top;">
            <p><strong>Customer Signature:</strong></p>
            <div style="border-bottom: 1px solid #000; width: 250px; margin: 20px 0;"></div>
            <p>Print Name: _______________</p>
            <p>Date: _______________</p>
          </td>
          <td style="width: 50%; vertical-align: top;">
            <p><strong>Project Manager:</strong></p>
            <div style="border-bottom: 1px solid #000; width: 250px; margin: 20px 0;"></div>
            <p>Print Name: _______________</p>
            <p>Date: _______________</p>
          </td>
        </tr>
      </table>
    </div>
  </div>',
  '[
    {"id": "customer_sig", "type": "signature", "label": "Customer Signature", "page": 1, "x": 10, "y": 85, "width": 200, "height": 50, "required": true, "assignedTo": "customer", "tabOrder": 1},
    {"id": "customer_name", "type": "name", "label": "Customer Name", "page": 1, "x": 10, "y": 91, "width": 180, "height": 30, "required": true, "assignedTo": "customer", "tabOrder": 2},
    {"id": "customer_date", "type": "date", "label": "Customer Date", "page": 1, "x": 10, "y": 94, "width": 120, "height": 30, "required": true, "assignedTo": "customer", "tabOrder": 3},
    {"id": "company_sig", "type": "signature", "label": "Project Manager Signature", "page": 1, "x": 55, "y": 85, "width": 200, "height": 50, "required": true, "assignedTo": "company", "tabOrder": 4},
    {"id": "company_name", "type": "name", "label": "Manager Name", "page": 1, "x": 55, "y": 91, "width": 180, "height": 30, "required": true, "assignedTo": "company", "tabOrder": 5},
    {"id": "company_date", "type": "date", "label": "Manager Date", "page": 1, "x": 55, "y": 94, "width": 120, "height": 30, "required": true, "assignedTo": "company", "tabOrder": 6}
  ]',
  true, true, 30, true, false
);

-- 10. Pre-Roofing Inspection Form
INSERT INTO document_templates (
  id, tenant_id, name, description, category, html_content, signature_fields,
  requires_customer_signature, requires_company_signature, expiration_days, is_active, is_default
) VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000000',
  'Pre-Roofing Inspection Form',
  'Comprehensive pre-installation inspection documenting existing conditions',
  'other',
  '<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
    <h2 style="text-align: center; margin-bottom: 30px;">PRE-ROOFING INSPECTION FORM</h2>

    <p><strong>Inspection Date:</strong> _______________</p>
    <p><strong>Property Address:</strong> ___________________________</p>
    <p><strong>Customer:</strong> ___________________________</p>
    <p><strong>Inspector:</strong> ___________________________</p>

    <h3>Existing Roof Conditions</h3>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr>
        <td style="border: 1px solid #000; padding: 8px; width: 50%;"><strong>Current Roofing Material:</strong></td>
        <td style="border: 1px solid #000; padding: 8px;">□ Asphalt □ Metal □ Tile □ Slate □ Other: ______</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 8px;"><strong>Estimated Age:</strong></td>
        <td style="border: 1px solid #000; padding: 8px;">_______ years</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 8px;"><strong>Number of Layers:</strong></td>
        <td style="border: 1px solid #000; padding: 8px;">□ 1 □ 2 □ 3 □ More than 3</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 8px;"><strong>Overall Condition:</strong></td>
        <td style="border: 1px solid #000; padding: 8px;">□ Good □ Fair □ Poor □ Failed</td>
      </tr>
    </table>

    <h3>Structural Assessment</h3>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr>
        <td style="border: 1px solid #000; padding: 8px; width: 60%;">Roof deck condition</td>
        <td style="border: 1px solid #000; padding: 8px;">□ Good □ Needs repair □ Replacement required</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 8px;">Fascia and soffit condition</td>
        <td style="border: 1px solid #000; padding: 8px;">□ Good □ Needs repair □ Replacement required</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 8px;">Gutters and downspouts</td>
        <td style="border: 1px solid #000; padding: 8px;">□ Good □ Needs repair □ Replacement required</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 8px;">Flashing condition</td>
        <td style="border: 1px solid #000; padding: 8px;">□ Good □ Needs repair □ Replacement required</td>
      </tr>
    </table>

    <h3>Special Conditions Noted</h3>
    <div style="border: 1px solid #ccc; padding: 15px; margin: 15px 0; min-height: 80px;">
      [DOCUMENT ANY SPECIAL CONDITIONS, DAMAGE, OR CONCERNS]
    </div>

    <h3>Photos Taken</h3>
    <p>□ Overall roof condition  □ Problem areas  □ Interior inspection  □ Attic/ventilation</p>

    <h3>Recommendations</h3>
    <div style="border: 1px solid #ccc; padding: 15px; margin: 15px 0; min-height: 60px;">
      [INSPECTOR RECOMMENDATIONS]
    </div>

    <div style="margin-top: 50px;">
      <table style="width: 100%;">
        <tr>
          <td style="width: 50%; vertical-align: top;">
            <p><strong>Customer Acknowledgment:</strong></p>
            <p>I acknowledge that this inspection was performed and the conditions noted are accurate.</p>
            <div style="border-bottom: 1px solid #000; width: 250px; margin: 20px 0;"></div>
            <p>Date: _______________</p>
          </td>
          <td style="width: 50%; vertical-align: top;">
            <p><strong>Inspector Signature:</strong></p>
            <div style="border-bottom: 1px solid #000; width: 250px; margin: 20px 0;"></div>
            <p>Print Name: _______________</p>
            <p>Date: _______________</p>
          </td>
        </tr>
      </table>
    </div>
  </div>',
  '[
    {"id": "customer_sig", "type": "signature", "label": "Customer Acknowledgment", "page": 1, "x": 10, "y": 88, "width": 200, "height": 50, "required": true, "assignedTo": "customer", "tabOrder": 1},
    {"id": "customer_date", "type": "date", "label": "Customer Date", "page": 1, "x": 10, "y": 94, "width": 120, "height": 30, "required": true, "assignedTo": "customer", "tabOrder": 2},
    {"id": "company_sig", "type": "signature", "label": "Inspector Signature", "page": 1, "x": 55, "y": 88, "width": 200, "height": 50, "required": true, "assignedTo": "company", "tabOrder": 3},
    {"id": "company_name", "type": "name", "label": "Inspector Name", "page": 1, "x": 55, "y": 92, "width": 180, "height": 30, "required": true, "assignedTo": "company", "tabOrder": 4},
    {"id": "company_date", "type": "date", "label": "Inspector Date", "page": 1, "x": 55, "y": 96, "width": 120, "height": 30, "required": true, "assignedTo": "company", "tabOrder": 5}
  ]',
  true, true, 30, true, false
);

-- 11. Roof Inspection Report
INSERT INTO document_templates (
  id, tenant_id, name, description, category, html_content, signature_fields,
  requires_customer_signature, requires_company_signature, expiration_days, is_active, is_default
) VALUES (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000000',
  'Roof Inspection Report',
  'Post-installation or maintenance inspection report with findings and recommendations',
  'other',
  '<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
    <h2 style="text-align: center; margin-bottom: 30px;">ROOF INSPECTION REPORT</h2>

    <p><strong>Inspection Date:</strong> _______________</p>
    <p><strong>Property Address:</strong> ___________________________</p>
    <p><strong>Customer:</strong> ___________________________</p>
    <p><strong>Inspector:</strong> ___________________________</p>
    <p><strong>Weather Conditions:</strong> _______________</p>
    <p><strong>Inspection Type:</strong> □ Routine □ Insurance □ Warranty □ Storm Damage</p>

    <h3>Roof System Components</h3>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr style="background-color: #f5f5f5;">
        <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">Component</td>
        <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">Condition</td>
        <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">Comments</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 8px;">Shingles/Covering</td>
        <td style="border: 1px solid #000; padding: 8px;">□ Good □ Fair □ Poor</td>
        <td style="border: 1px solid #000; padding: 8px;">________________</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 8px;">Flashing</td>
        <td style="border: 1px solid #000; padding: 8px;">□ Good □ Fair □ Poor</td>
        <td style="border: 1px solid #000; padding: 8px;">________________</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 8px;">Gutters</td>
        <td style="border: 1px solid #000; padding: 8px;">□ Good □ Fair □ Poor</td>
        <td style="border: 1px solid #000; padding: 8px;">________________</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 8px;">Ventilation</td>
        <td style="border: 1px solid #000; padding: 8px;">□ Good □ Fair □ Poor</td>
        <td style="border: 1px solid #000; padding: 8px;">________________</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 8px;">Penetrations</td>
        <td style="border: 1px solid #000; padding: 8px;">□ Good □ Fair □ Poor</td>
        <td style="border: 1px solid #000; padding: 8px;">________________</td>
      </tr>
    </table>

    <h3>Issues Identified</h3>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr>
        <td style="border: 1px solid #000; padding: 8px;">□ Missing or damaged shingles</td>
        <td style="border: 1px solid #000; padding: 8px;">□ Exposed nails or fasteners</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 8px;">□ Damaged or missing flashing</td>
        <td style="border: 1px solid #000; padding: 8px;">□ Clogged or damaged gutters</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 8px;">□ Signs of water damage or leaks</td>
        <td style="border: 1px solid #000; padding: 8px;">□ Inadequate ventilation</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 8px;">□ Granule loss</td>
        <td style="border: 1px solid #000; padding: 8px;">□ Structural concerns</td>
      </tr>
    </table>

    <h3>Detailed Findings</h3>
    <div style="border: 1px solid #ccc; padding: 15px; margin: 15px 0; min-height: 100px;">
      [DETAILED DESCRIPTION OF FINDINGS AND OBSERVATIONS]
    </div>

    <h3>Recommendations</h3>
    <div style="border: 1px solid #ccc; padding: 15px; margin: 15px 0; min-height: 80px;">
      □ Immediate repairs required
      □ Routine maintenance recommended
      □ Monitor condition - re-inspect in _____ months
      □ No action required at this time

      [SPECIFIC RECOMMENDATIONS]
    </div>

    <h3>Estimated Repair Costs</h3>
    <p><strong>Priority 1 (Immediate):</strong> $_______________</p>
    <p><strong>Priority 2 (Within 6 months):</strong> $_______________</p>
    <p><strong>Priority 3 (Routine maintenance):</strong> $_______________</p>

    <div style="margin-top: 40px;">
      <table style="width: 100%;">
        <tr>
          <td style="width: 50%; vertical-align: top;">
            <p><strong>Customer Acknowledgment:</strong></p>
            <p>I have received and reviewed this inspection report.</p>
            <div style="border-bottom: 1px solid #000; width: 250px; margin: 20px 0;"></div>
            <p>Date: _______________</p>
          </td>
          <td style="width: 50%; vertical-align: top;">
            <p><strong>Inspector:</strong></p>
            <div style="border-bottom: 1px solid #000; width: 250px; margin: 20px 0;"></div>
            <p>Print Name: _______________</p>
            <p>License #: _______________</p>
            <p>Date: _______________</p>
          </td>
        </tr>
      </table>
    </div>
  </div>',
  '[
    {"id": "customer_sig", "type": "signature", "label": "Customer Acknowledgment", "page": 1, "x": 10, "y": 88, "width": 200, "height": 50, "required": true, "assignedTo": "customer", "tabOrder": 1},
    {"id": "customer_date", "type": "date", "label": "Customer Date", "page": 1, "x": 10, "y": 94, "width": 120, "height": 30, "required": true, "assignedTo": "customer", "tabOrder": 2},
    {"id": "company_sig", "type": "signature", "label": "Inspector Signature", "page": 1, "x": 55, "y": 88, "width": 200, "height": 50, "required": true, "assignedTo": "company", "tabOrder": 3},
    {"id": "company_name", "type": "name", "label": "Inspector Name", "page": 1, "x": 55, "y": 92, "width": 180, "height": 30, "required": true, "assignedTo": "company", "tabOrder": 4},
    {"id": "company_date", "type": "date", "label": "Inspector Date", "page": 1, "x": 55, "y": 97, "width": 120, "height": 30, "required": true, "assignedTo": "company", "tabOrder": 5}
  ]',
  true, true, 30, true, false
);

-- =====================================================
-- TENANT-SPECIFIC COPIES
-- Note: These templates will be copied to each tenant when they are created
-- The above templates serve as the master templates with tenant_id as placeholder
-- =====================================================

-- Add a comment explaining how to use these templates
-- When a new tenant is created, these templates should be copied with the proper tenant_id
-- The placeholder tenant_id (00000000-0000-0000-0000-000000000000) should be replaced
-- with the actual tenant_id for each tenant
