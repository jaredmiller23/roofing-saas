# E-Signature System

## Overview

The Roofing SAAS platform implements a complete, built-in e-signature system for managing contracts, estimates, change orders, and other documents requiring customer or company signatures. Rather than relying on external services like DocuSign, the application provides native signature capture, document management, and PDF generation capabilities.

This system enables the complete document signing workflow: creating signature documents, sending them to recipients via email, capturing signatures through multiple methods (draw, type, or upload), and generating signed PDFs for download and archival.

**Key Design Decision:** The application opted for a built-in solution using `pdf-lib` rather than external e-signature providers like DocuSign or SignWell, providing lower cost, full control over the signing experience, and no per-document fees.

## User Stories

### Office Staff
- As an office administrator, I want to create signature documents for roofing contracts so that customers can review and sign them digitally
- As an office staff member, I want to track which documents are pending, sent, viewed, or signed so that I can follow up appropriately
- As an office staff member, I want to download signed PDFs so that I can store them in project records

### Sales Representatives
- As a sales rep, I want to send contracts to customers for e-signature so that I can close deals faster without paper shuffling
- As a sales rep, I want to know when a customer has viewed or signed a document so that I can follow up at the right time

### Customers (External)
- As a customer, I want to sign documents from my phone or computer without needing to print, scan, or mail anything
- As a customer, I want multiple ways to sign (draw, type, or upload) so that I can use whichever is most convenient
- As a customer, I want to receive clear email notifications with links to documents requiring my signature

### Project Managers
- As a project manager, I want to associate signature documents with specific projects and contacts so that all paperwork is organized in one place
- As a project manager, I want to require both customer and company signatures on contracts so that all parties are bound to the agreement

## Features

### 1. Document Creation

Create signature documents with comprehensive metadata and configuration options.

**Document Types:**
- Contract
- Estimate
- Change Order
- Waiver
- Other

**Configuration Options:**
- Title and description
- Associated project (optional)
- Associated contact (optional)
- Template selection (optional)
- Source PDF file (optional)
- Signature requirements (customer/company)
- Expiration period (configurable days)

**Implementation:**
- File: `/app/api/signature-documents/route.ts` (POST handler)
- UI: `/app/(dashboard)/signatures/new/page.tsx`
- Key function: Creates `signature_documents` record with status `draft`

### 2. Document Status Workflow

Documents progress through a defined status workflow:

```
draft → sent → viewed → signed
                  ↓
              expired / declined
```

**Status Definitions:**
| Status | Description | Visual Indicator |
|--------|-------------|------------------|
| `draft` | Created but not yet sent | Gray - FileText icon |
| `sent` | Sent to recipient | Blue - Send icon |
| `viewed` | Recipient has opened document | Purple - Eye icon |
| `signed` | All required signatures collected | Green - CheckCircle icon |
| `expired` | Past expiration date | Yellow - Clock icon |
| `declined` | Recipient declined to sign | Red - XCircle icon |

**Implementation:**
- File: `/app/(dashboard)/signatures/page.tsx` (lines 70-104)
- Functions: `getStatusIcon()`, `getStatusBadge()`

### 3. Document Sending

Send documents to recipients via email with customizable message and expiration.

**Features:**
- Recipient email and name specification
- Custom message support
- Configurable expiration (default 30 days)
- Automatic signing URL generation
- Email notification via Resend integration

**Email Contains:**
- Document title and details
- Project name (if associated)
- Expiration date
- "Review & Sign Document" button
- Direct signing URL link

**Implementation:**
- File: `/app/api/signature-documents/[id]/send/route.ts`
- Email generation: Lines 135-165 (HTML template)
- Uses: `sendEmail()` from `/lib/resend/email.ts`

### 4. Signature Capture Component

Multi-method signature capture supporting three input methods:

**Draw Method:**
- HTML5 Canvas-based drawing
- Supports mouse and touch input
- Clear button to reset
- 600x200 pixel canvas
- Black ink, 2px stroke width

**Type Method:**
- Text input for full name
- Renders in cursive "Dancing Script" font
- Real-time preview on canvas
- Centered signature positioning

**Upload Method:**
- Image file upload (PNG, JPG, GIF)
- Preview display before confirmation
- Base64 encoding for storage

**Implementation:**
- File: `/components/signature/SignatureCapture.tsx`
- Component: `<SignatureCapture>` (276 lines)
- Props: `onSignatureCapture(signatureData, method)`, `onCancel`
- UI: shadcn/ui Tabs, Button, Input components

### 5. Document Signing (Public Endpoint)

Allows external recipients to sign documents without authentication.

**Signing Process:**
1. Recipient receives email with unique document URL
2. Opens `/sign/[document_id]` page
3. Reviews document details
4. Captures signature using SignatureCapture component
5. Submits signature with metadata

**Signature Data Captured:**
- Signer name and email
- Signer type: `customer`, `company`, or `witness`
- Signature image (base64)
- Signature method (draw/type/upload)
- IP address (audit trail)
- User agent (audit trail)
- Optional verification code

**Signature Completion Logic:**
- Checks if all required signatures are present
- Updates document status to `signed` when complete
- Sets `signed_at` timestamp

**Implementation:**
- File: `/app/api/signature-documents/[id]/sign/route.ts`
- POST: Submit signature (lines 26-201)
- GET: Retrieve document for signing page (lines 207-261)
- **Note:** This endpoint does NOT require authentication for customer access

### 6. PDF Generation and Download

Generates professional PDFs with embedded signatures using `pdf-lib`.

**PDF Features:**
- Loads existing PDFs or creates from scratch
- Letter size format (8.5" x 11" / 612x792 points)
- Document metadata header (title, project, contact, type)
- Description with automatic text wrapping
- Signature grid layout (2 signatures per row)
- Signature boxes with embedded images
- Signer metadata (name, type, date)
- Generation timestamp footer

**PDF Generation Process:**
1. Verify document is in `signed` status
2. Load existing PDF or create new
3. Embed signature images (PNG or JPG)
4. Add signer information below each signature
5. Generate timestamp footer
6. Upload to Supabase Storage (if not already stored)
7. Return PDF as downloadable file

**Storage Path:** `signed-documents/{tenant_id}/{document_id}_signed_{timestamp}.pdf`

**Implementation:**
- API Route: `/app/api/signature-documents/[id]/download/route.ts`
- PDF Generator: `/lib/pdf/signature-pdf-generator.ts`
- Functions: `generateSignedPDF()`, `uploadPDFToStorage()`
- Package: `pdf-lib` (lightweight, serverless-compatible)

### 7. Document Management Dashboard

List, search, and filter signature documents.

**Features:**
- Search by title, description, document type
- Filter by status (all, draft, sent, viewed, signed, expired, declined)
- Document cards with status icons and badges
- Quick actions (Send, Download, View)
- Pagination support

**Implementation:**
- File: `/app/(dashboard)/signatures/page.tsx`
- State: `documents`, `statusFilter`, `searchQuery`
- API: `GET /api/signature-documents` with query params

## Technical Implementation

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    E-Signature System                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   Dashboard  │     │  Signing UI  │     │   PDF Gen    │    │
│  │ /signatures  │     │  /sign/[id]  │     │  (Server)    │    │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘    │
│         │                    │                    │             │
│         ▼                    ▼                    ▼             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              API Routes (/api/signature-documents)       │   │
│  │  • GET /           - List documents                      │   │
│  │  • POST /          - Create document                     │   │
│  │  • GET /[id]       - Get single document                 │   │
│  │  • PATCH /[id]     - Update document                     │   │
│  │  • DELETE /[id]    - Delete document                     │   │
│  │  • POST /[id]/send - Send for signing                    │   │
│  │  • GET /[id]/sign  - Get doc for signing (public)        │   │
│  │  • POST /[id]/sign - Submit signature (public)           │   │
│  │  • GET /[id]/download - Download signed PDF              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│         ┌────────────────────┼────────────────────┐             │
│         ▼                    ▼                    ▼             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   Supabase   │     │    Resend    │     │   Supabase   │    │
│  │  PostgreSQL  │     │    Email     │     │   Storage    │    │
│  │   (Data)     │     │  (Delivery)  │     │   (PDFs)     │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `/app/api/signature-documents/route.ts` | List & create documents |
| `/app/api/signature-documents/[id]/route.ts` | Get, update, delete single document |
| `/app/api/signature-documents/[id]/sign/route.ts` | Public signing endpoint |
| `/app/api/signature-documents/[id]/send/route.ts` | Send document for signing |
| `/app/api/signature-documents/[id]/download/route.ts` | Generate and download signed PDF |
| `/app/(dashboard)/signatures/page.tsx` | Document list/dashboard |
| `/app/(dashboard)/signatures/new/page.tsx` | Create new document form |
| `/components/signature/SignatureCapture.tsx` | Multi-method signature capture |
| `/lib/pdf/signature-pdf-generator.ts` | PDF generation utilities |
| `/lib/resend/email.ts` | Email sending utilities |
| `/lib/resend/client.ts` | Resend client configuration |

### Data Flow

**Document Creation Flow:**
```
User fills form → POST /api/signature-documents → Insert to signature_documents → Return document
```

**Document Sending Flow:**
```
User clicks Send → POST /api/signature-documents/[id]/send
    → Update status to 'sent'
    → Calculate expiration date
    → Generate signing URL
    → Send email via Resend
    → Return success
```

**Signing Flow:**
```
Recipient opens URL → GET /api/signature-documents/[id]/sign
    → Return document details (public access)

Recipient submits signature → POST /api/signature-documents/[id]/sign
    → Create signatures record
    → Check if all required signatures complete
    → Update document status (viewed/signed)
    → Return result
```

**PDF Download Flow:**
```
User clicks Download → GET /api/signature-documents/[id]/download
    → Verify status = 'signed'
    → Load document and signatures
    → Generate PDF with pdf-lib
    → Embed signature images
    → Upload to Supabase Storage
    → Return PDF file
```

## API Endpoints

### GET /api/signature-documents
List signature documents with filtering.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `project_id` | UUID | Filter by project |
| `contact_id` | UUID | Filter by contact |
| `limit` | number | Max results (default: 50) |
| `offset` | number | Pagination offset |

**Response:**
```json
{
  "documents": [...],
  "total": 25,
  "limit": 50,
  "offset": 0
}
```

### POST /api/signature-documents
Create a new signature document.

**Request Body:**
```json
{
  "title": "Roofing Contract - Smith Residence",
  "description": "Full roof replacement contract",
  "document_type": "contract",
  "project_id": "uuid",
  "contact_id": "uuid",
  "template_id": "uuid",
  "file_url": "https://...",
  "requires_customer_signature": true,
  "requires_company_signature": true,
  "expires_at": "2025-02-10T00:00:00Z"
}
```

**Required Fields:** `title`, `document_type`

**Document Types:** `contract`, `estimate`, `change_order`, `waiver`, `other`

### GET /api/signature-documents/[id]
Get a single document with related data.

**Response includes:**
- Document fields
- Nested project data (id, name, address)
- Nested contact data (id, first_name, last_name, email, phone)
- Array of signatures

### PATCH /api/signature-documents/[id]
Update document fields.

**Protected Fields (cannot update):** `id`, `tenant_id`, `created_by`, `created_at`

### DELETE /api/signature-documents/[id]
Delete a signature document.

### POST /api/signature-documents/[id]/send
Send document for signing via email.

**Request Body:**
```json
{
  "recipient_email": "customer@example.com",
  "recipient_name": "John Smith",
  "message": "Please review and sign this contract.",
  "expiration_days": 30
}
```

**Response:**
```json
{
  "document": {...},
  "message": "Document sent successfully and email notification delivered",
  "recipient": {
    "email": "customer@example.com",
    "name": "John Smith"
  },
  "expires_at": "2025-02-10T00:00:00Z",
  "email_sent": true,
  "email_error": null
}
```

### GET /api/signature-documents/[id]/sign
Get document details for signing page (PUBLIC - no auth required).

**Returns limited fields:**
- id, title, description, document_type, file_url, status
- expires_at, requires_customer_signature, requires_company_signature
- Project name
- Array of existing signatures (signer_type only)

### POST /api/signature-documents/[id]/sign
Submit a signature (PUBLIC - no auth required).

**Request Body:**
```json
{
  "signer_name": "John Smith",
  "signer_email": "john@example.com",
  "signer_type": "customer",
  "signature_data": "data:image/png;base64,...",
  "signature_method": "draw",
  "verification_code": "ABC123"
}
```

**Response:**
```json
{
  "signature": {...},
  "document": {...},
  "all_signatures_complete": true,
  "message": "Document signed successfully!"
}
```

### GET /api/signature-documents/[id]/download
Download signed document as PDF.

**Requirements:** Document status must be `signed`

**Response:** PDF file download with `Content-Disposition: attachment`

## Data Models

### signature_documents (Table)

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Organization ID (RLS) |
| title | string | Document title |
| description | text | Document description |
| document_type | string | Type (contract/estimate/etc) |
| status | string | Current status |
| project_id | UUID | FK to projects |
| contact_id | UUID | FK to contacts |
| template_id | UUID | FK to templates |
| file_url | string | URL to PDF file |
| requires_customer_signature | boolean | Default: true |
| requires_company_signature | boolean | Default: true |
| expires_at | timestamp | Expiration date |
| sent_at | timestamp | When sent |
| viewed_at | timestamp | When first viewed |
| signed_at | timestamp | When fully signed |
| created_by | UUID | FK to users |
| created_at | timestamp | Creation time |
| is_deleted | boolean | Soft delete flag |

### signatures (Table)

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| document_id | UUID | FK to signature_documents |
| signer_type | string | customer/company/witness |
| signer_name | string | Full name of signer |
| signer_email | string | Email of signer |
| signer_ip_address | string | IP for audit trail |
| signature_data | text | Base64 signature image |
| signature_method | string | draw/type/upload |
| user_agent | string | Browser info |
| verification_code | string | Optional verification |
| signed_at | timestamp | When signed (auto) |

## Integration Points

### Email Integration (Resend)
- Signature request emails sent via Resend
- Configurable from address and name
- Email templates with document details and signing links
- Retry logic (3 attempts) for transient failures
- Tags for tracking: `type: signature-request`, `document_id`

**Environment Variables:**
```
RESEND_API_KEY=re_xxxx
RESEND_FROM_EMAIL=noreply@domain.com
RESEND_FROM_NAME=Roofing SaaS
```

### Supabase Storage
- Signed PDFs stored in `documents` bucket
- Path pattern: `signed-documents/{tenant_id}/{document_id}_signed_{timestamp}.pdf`
- Public URLs generated for download

### Project Integration
- Documents can be linked to projects via `project_id`
- Project name displayed in document cards and emails

### Contact Integration
- Documents can be linked to contacts via `contact_id`
- Contact name and email displayed in document management

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | Yes* | Resend API key for email |
| `RESEND_FROM_EMAIL` | No | From email (default: noreply@example.com) |
| `RESEND_FROM_NAME` | No | From name (default: Roofing SaaS) |
| `NEXT_PUBLIC_APP_URL` | Yes | Base URL for signing links |

*Email features disabled if not configured

### Database Indexes

Performance indexes defined in migration `20251004_performance_indexes.sql`:
```sql
CREATE INDEX IF NOT EXISTS idx_signature_docs_tenant_status
  ON signature_documents(tenant_id, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_signature_docs_created
  ON signature_documents(created_at DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_signature_docs_project
  ON signature_documents(project_id) WHERE is_deleted = false;
```

## Testing

### E2E Tests
File: `/e2e/e-signature.spec.ts`

**Test Coverage:**
- Create new signature document
- Display document in pending status
- Send document for signature
- Sign a document (canvas signature simulation)
- Download completed document
- Validate signature before submission
- Track signature completion status
- Handle expired signing links
- Support multiple signers

### Manual Testing Checklist
From `/docs/E_SIGNATURE_PDF_IMPLEMENTATION.md`:

1. Create test document with all fields
2. Sign using Draw method (mouse)
3. Sign using Type method (cursive text)
4. Sign using Upload method (image file)
5. Add 2+ signers (customer + company)
6. Download PDF and verify:
   - Opens correctly
   - Metadata visible
   - Signatures embedded
   - Signer info present
   - Timestamp footer
7. Verify Supabase Storage upload

## Security Considerations

### Authentication
- Dashboard routes require authentication via `getCurrentUser()`
- Signing endpoints (`/sign`) are PUBLIC for customer access
- Document ownership verified via tenant_id

### Audit Trail
- IP address captured on signature (`x-forwarded-for` or `x-real-ip`)
- User agent captured for browser identification
- Timestamps recorded for all status changes
- All data stored in signatures table

### Data Protection
- Documents isolated by tenant (RLS policies)
- Signature data stored as base64 (not plain text)
- Expiration dates enforced server-side
- Status transitions validated (can't sign expired docs)

### Legal Compliance
- ESIGN Act compliant (federal law)
- UETA compliant (Tennessee adoption)
- 7 years recommended retention
- PDFs backed up to Supabase Storage

## Performance Notes

From implementation documentation:
- PDF Generation: ~200-500ms (simple documents)
- With Existing PDF: ~500-1000ms (depends on source PDF size)
- Storage Upload: ~100-300ms
- Total: < 2 seconds for most documents

## Future Enhancements

Documented in `E_SIGNATURE_PDF_IMPLEMENTATION.md`:
1. Email with PDF attachment on completion
2. Reusable document templates
3. HTML to PDF conversion for complex layouts
4. Positioned signature fields (specific coordinates)
5. Initials, dates, checkbox fields
6. External DocuSign integration (optional)
7. PDF preview before signing (PDF.js)

## Alternative Solutions Evaluated

From `/docs/integrations/ESIGNING_OPTIONS_GUIDE.md`:

| Service | Monthly Cost | API Quality | Decision |
|---------|-------------|-------------|----------|
| SignWell | $12/mo | Excellent | Alternative option |
| Dropbox Sign | $15/mo | Very Good | Alternative option |
| DocuSign | $10+/mo | Best | Enterprise only |
| **Built-in** | $0/mo | Custom | **Selected** |

**Rationale:** Built-in solution provides:
- No per-document or monthly fees
- Full control over signing experience
- Custom branding
- Integration with existing auth/storage
- Offline-capable with PWA

---

## Validation Record

### Files Examined
- `/Users/ccai/roofing saas/roofing-saas/app/api/signature-documents/route.ts` - Verified GET/POST handlers for document listing and creation
- `/Users/ccai/roofing saas/roofing-saas/app/api/signature-documents/[id]/route.ts` - Verified GET/PATCH/DELETE handlers
- `/Users/ccai/roofing saas/roofing-saas/app/api/signature-documents/[id]/sign/route.ts` - Verified public signing endpoints
- `/Users/ccai/roofing saas/roofing-saas/app/api/signature-documents/[id]/send/route.ts` - Verified email sending workflow
- `/Users/ccai/roofing saas/roofing-saas/app/api/signature-documents/[id]/download/route.ts` - Verified PDF download handler
- `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/signatures/page.tsx` - Verified dashboard UI
- `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/signatures/new/page.tsx` - Verified creation form
- `/Users/ccai/roofing saas/roofing-saas/components/signature/SignatureCapture.tsx` - Verified 3 signature methods
- `/Users/ccai/roofing saas/roofing-saas/lib/pdf/signature-pdf-generator.ts` - Verified PDF generation functions
- `/Users/ccai/roofing saas/roofing-saas/lib/resend/email.ts` - Verified email sending utilities
- `/Users/ccai/roofing saas/roofing-saas/lib/resend/client.ts` - Verified Resend client setup
- `/Users/ccai/roofing saas/roofing-saas/e2e/e-signature.spec.ts` - Verified E2E test coverage
- `/Users/ccai/roofing saas/docs/integrations/ESIGNING_OPTIONS_GUIDE.md` - Verified alternative analysis
- `/Users/ccai/roofing saas/roofing-saas/docs/E_SIGNATURE_PDF_IMPLEMENTATION.md` - Verified implementation docs
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251004_performance_indexes.sql` - Verified database indexes

### Archon RAG Queries
- Query: "e-signature digital signature PDF document signing workflow" - No relevant matches (system uses built-in solution, not documented providers)

### Verification Steps
1. Confirmed all API routes exist at documented paths
2. Verified document types array: `['contract', 'estimate', 'change_order', 'waiver', 'other']` in route.ts line 158
3. Verified signer types array: `['customer', 'company', 'witness']` in sign/route.ts line 57
4. Confirmed SignatureCapture component supports draw/type/upload (lines 17-145)
5. Verified pdf-lib usage in signature-pdf-generator.ts
6. Confirmed Resend integration in send/route.ts lines 13-14
7. Verified database indexes in migration file
8. Confirmed E2E tests cover core workflows

### Validated By
PRD Documentation Agent - Session 6
Date: 2025-12-11T00:30:00Z
