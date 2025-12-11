# Digital Business Cards System

## Overview

The Digital Business Cards system provides sales representatives with shareable, mobile-optimized digital business cards that can be shared via URL or QR code. The system enables prospects to view contact information, download vCards, connect on social media, and submit contact forms - all while tracking comprehensive analytics for each interaction.

This feature replaces traditional paper business cards with a modern, trackable alternative that integrates directly with the CRM for automatic lead capture.

## User Stories

### Sales Representatives
- As a sales rep, I want to create a digital business card with my contact information so that I can share it with prospects
- As a sales rep, I want to customize my card's branding (colors, tagline, bio) so that it reflects my personal brand
- As a sales rep, I want to download a QR code for my card so that I can include it on print materials and vehicles
- As a sales rep, I want to see analytics for my card so that I can understand how prospects engage with it
- As a sales rep, I want prospects to be able to contact me directly from my card so that I can capture leads automatically

### Prospects (Public Users)
- As a prospect, I want to view a sales rep's contact information so that I can reach them easily
- As a prospect, I want to save a rep's contact to my phone with one click so that I don't have to manually enter details
- As a prospect, I want to submit a contact form so that the rep can follow up with me
- As a prospect, I want to connect with the rep on social media so that I can stay informed

### Business Owners/Admins
- As an admin, I want all team members to have digital business cards so that branding is consistent
- As an admin, I want to see analytics across all cards so that I can measure team engagement

## Features

### 1. Card Creation & Management

The system allows users to create and manage their digital business card through the `/settings/my-card` page.

**Implementation:**
- File: `/app/(dashboard)/settings/my-card/page.tsx` (767 lines)
- Card editor with tabs: Editor, Share, Analytics
- One card per user enforcement
- Auto-save functionality

**Card Information Fields:**
| Category | Fields |
|----------|--------|
| Personal | full_name*, job_title, phone, email |
| Company | company_name, company_address, company_phone, company_email, company_website |
| Social | linkedin_url, facebook_url, instagram_url, twitter_url |
| Content | tagline, bio, services (comma-separated) |
| Branding | brand_color (hex), logo_url, profile_photo_url, background_image_url |
| Settings | enable_contact_form, enable_appointment_booking, is_active |

*Required field

### 2. vCard Generation (RFC 6350 Compliant)

Generate downloadable vCard 4.0 files for one-click contact saving on mobile devices.

**Implementation:**
- File: `/lib/digital-cards/vcard.ts` (238 lines)
- Key Functions:
  - `generateVCard(data: VCardData)` - Generate vCard content string
  - `generateVCardFromBusinessCard(card)` - Generate from card object
  - `createVCardBlob(content)` - Create downloadable blob
  - `downloadVCard(card, filename?)` - Trigger browser download
  - `createVCardResponse(card)` - API response with attachment headers

**vCard Fields Mapped:**
- FN (Full Name) - Required
- N (Structured Name) - FirstName;LastName
- TITLE - Job title
- ORG - Organization/company
- EMAIL;TYPE=work
- TEL;TYPE=work,voice
- URL;TYPE=work
- ADR;TYPE=work - Address
- PHOTO - Profile photo URL
- NOTE - Bio
- X-SOCIALPROFILE - LinkedIn, Facebook, Instagram, Twitter

**Features:**
- RFC 6350 compliant format
- Proper character escaping for special characters
- Line folding for content > 75 characters
- REV timestamp for version tracking

### 3. QR Code Generation

Generate QR codes for card URLs using the `qrcode` npm package.

**Implementation:**
- File: `/lib/digital-cards/qrcode.ts` (274 lines)
- Dependency: `qrcode` v1.5.4

**Key Functions:**
| Function | Environment | Purpose |
|----------|-------------|---------|
| `generateQRCodeDataURL()` | Browser | Return base64 data URL |
| `renderQRCodeToCanvas()` | Browser | Render to canvas element |
| `generateQRCodeBuffer()` | Server | Return PNG buffer |
| `createQRCodeResponse()` | Server | Return PNG Response |
| `generateCardQRCode()` | Browser | Generate for card URL |
| `generateBrandedQRCode()` | Browser | Use card's brand color |
| `downloadQRCode()` | Browser | Trigger PNG download |
| `downloadCardQRCode()` | Browser | Download with card name |

**QR Code Options:**
```typescript
interface QRCodeOptions {
  size?: number              // 100-1000px (default: 300)
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'  // (default: 'M')
  margin?: number            // 0-10 (default: 4)
  color?: {
    dark?: string           // Hex (default: #000000)
    light?: string          // Hex (default: #FFFFFF)
  }
}
```

**Preset Options:**
- `DEFAULT_QR_OPTIONS` - 300px, M error correction
- `HIGH_QUALITY_QR_OPTIONS` - 512px, H error correction
- `PRINT_QR_OPTIONS` - 1000px, H error correction, larger margin

### 4. Public Card Display Page

Mobile-optimized public page for viewing digital business cards.

**Implementation:**
- File: `/app/card/[slug]/page.tsx` (518 lines)
- Route: `/card/[slug]` (public, no auth required)
- Client-side rendering with React state

**Features:**
- Responsive design with gradient background using brand_color
- Profile photo with fallback to initials avatar
- Contact action buttons (Call, Email, Website, Save Contact)
- Social media links with icons
- Services displayed as colored tags
- Optional contact form
- Automatic view tracking on page load
- Click tracking for all interactions

**UI Components:**
- Header card with profile photo, name, title, company, tagline, bio, services
- Contact actions card with buttons
- Contact form card (if enabled)
- Footer with branding

### 5. Interaction Tracking

Track all user interactions with digital business cards for analytics.

**Implementation:**
- File: `/app/api/digital-cards/[id]/interactions/route.ts` (185 lines)
- Public endpoint (no authentication required)
- Automatic device/browser detection

**Interaction Types (11 total):**
| Type | Description | Auto-tracked |
|------|-------------|--------------|
| `view` | Page view | Yes |
| `vcard_download` | vCard downloaded | Yes |
| `phone_click` | Phone link clicked | Yes |
| `email_click` | Email link clicked | Yes |
| `website_click` | Website link clicked | Yes |
| `linkedin_click` | LinkedIn clicked | Yes |
| `facebook_click` | Facebook clicked | Yes |
| `instagram_click` | Instagram clicked | Yes |
| `twitter_click` | Twitter clicked | Yes |
| `contact_form_submit` | Form submitted | Yes |
| `appointment_booked` | Appointment made | Yes |

**Tracking Data Captured:**
- IP address (via x-forwarded-for, x-real-ip, cf-connecting-ip headers)
- User agent
- Referrer
- Device type (mobile/tablet/desktop)
- Browser detection (Chrome, Safari, Firefox, Edge, Opera, etc.)
- OS detection (Windows, macOS, Linux, Android, iOS)
- Timestamp

**Device Detection Logic:**
```typescript
// Tablet detection
/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i

// Mobile detection
/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|...
```

### 6. Contact Form Submission

Public contact form that creates leads directly in the CRM.

**Implementation:**
- File: `/app/api/digital-cards/[id]/contact/route.ts` (215 lines)
- Public endpoint (no authentication required)
- Creates contact and activity in one transaction

**Form Fields:**
| Field | Required | Validation |
|-------|----------|------------|
| name | Yes | Non-empty |
| email | Yes | Email regex |
| phone | No | - |
| company | No | - |
| message | Yes | Non-empty |

**Workflow:**
1. Validate required fields and email format
2. Verify card exists and is active
3. Check `enable_contact_form` is true
4. Create interaction record (type: `contact_form_submit`)
5. Find or create contact in CRM:
   - If email exists: Update contact with new info
   - If new email: Create contact as lead with source "Digital Business Card"
6. Create activity record (type: note, subtype: inbound_message)
7. Return success message

**Contact Creation:**
- contact_type: 'lead'
- stage: 'new'
- source: 'Digital Business Card'
- assigned_to: Card owner's user_id

### 7. Analytics Dashboard

Comprehensive analytics for card performance.

**Implementation:**
- File: `/app/api/digital-cards/[id]/analytics/route.ts` (280 lines)
- Authenticated endpoint (card owner or admin)
- Configurable date range (default: 30 days)

**Analytics Summary:**
```typescript
interface CardAnalyticsSummary {
  total_views: number
  total_vcard_downloads: number
  total_phone_clicks: number
  total_email_clicks: number
  total_contact_form_submissions: number
  total_interactions: number
  unique_visitors: number
  last_viewed_at?: string
}
```

**Performance Metrics:**
```typescript
interface PerformanceMetrics {
  total_views: number
  unique_visitors: number
  conversion_rate: number      // % (forms + appointments / views)
  avg_daily_views: number
  top_referrer?: string
  top_country?: string
  top_device?: string
}
```

**Chart Data:**
- Views over time (daily buckets)
- Interactions by type (pie chart)
- Devices breakdown (pie chart)
- Top 10 countries (bar chart)

**UI Display:**
- Summary stats cards (views, downloads, clicks, forms)
- Interactions breakdown with unique visitor counts
- Last 30 days data by default

## Technical Implementation

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Digital Business Cards                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌────────────────────┐    ┌────────────────────────────────┐   │
│   │  Card Management   │    │      Public Card Page          │   │
│   │  /settings/my-card │    │       /card/[slug]             │   │
│   └─────────┬──────────┘    └──────────────┬─────────────────┘   │
│             │                              │                      │
│             ▼                              ▼                      │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │                      API Routes                             │ │
│   │  GET/POST /api/digital-cards                               │ │
│   │  GET/PATCH/DELETE /api/digital-cards/:id                   │ │
│   │  GET /api/digital-cards/:id/analytics                      │ │
│   │  POST /api/digital-cards/:id/interactions (public)         │ │
│   │  POST /api/digital-cards/:id/contact (public)              │ │
│   │  GET /api/digital-cards/slug/:slug (public)                │ │
│   └────────────────────────────────────────────────────────────┘ │
│             │                                                     │
│             ▼                                                     │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │                     Library Layer                           │ │
│   │  lib/digital-cards/types.ts   - Type definitions           │ │
│   │  lib/digital-cards/vcard.ts   - vCard generation           │ │
│   │  lib/digital-cards/qrcode.ts  - QR code generation         │ │
│   └────────────────────────────────────────────────────────────┘ │
│             │                                                     │
│             ▼                                                     │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │                    Supabase Database                        │ │
│   │  digital_business_cards (card data + analytics summary)    │ │
│   │  business_card_interactions (interaction tracking)         │ │
│   │  contacts (auto-created from form submissions)             │ │
│   │  activities (contact form notes)                           │ │
│   └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `lib/digital-cards/types.ts` | Type definitions, constants, helpers | 533 |
| `lib/digital-cards/vcard.ts` | vCard 4.0 generation (RFC 6350) | 238 |
| `lib/digital-cards/qrcode.ts` | QR code generation utilities | 274 |
| `app/api/digital-cards/route.ts` | List/create cards | 224 |
| `app/api/digital-cards/[id]/route.ts` | CRUD operations | 287 |
| `app/api/digital-cards/[id]/analytics/route.ts` | Analytics API | 280 |
| `app/api/digital-cards/[id]/interactions/route.ts` | Track interactions | 185 |
| `app/api/digital-cards/[id]/contact/route.ts` | Contact form | 215 |
| `app/api/digital-cards/slug/[slug]/route.ts` | Public card lookup | 95 |
| `app/card/[slug]/page.tsx` | Public card display | 518 |
| `app/(dashboard)/settings/my-card/page.tsx` | Card management UI | 767 |

### Data Flow

**Card Creation:**
```
User fills form → POST /api/digital-cards → Check one-card-per-user
→ Insert digital_business_cards → Return card with auto-generated slug
```

**Public Card View:**
```
Prospect visits /card/[slug] → GET /api/digital-cards/slug/:slug
→ Return public card data → Render page → POST interaction (view)
```

**Contact Form Submission:**
```
Prospect submits form → POST /api/digital-cards/:id/contact
→ Create interaction → Find/create contact → Create activity → Return success
```

## API Endpoints

### GET /api/digital-cards
- **Purpose:** List all cards for user's tenant
- **Auth:** Required
- **Query Params:**
  - `user_id` - Filter by user (use "current" for authenticated user)
  - `is_active` - Filter by active status ("true"/"false")
- **Response:** `{ cards: DigitalBusinessCard[], total: number }`

### POST /api/digital-cards
- **Purpose:** Create new digital business card
- **Auth:** Required
- **Body:** CreateDigitalCardRequest (full_name required)
- **Response:** `{ card: DigitalBusinessCard }` (201)
- **Errors:** 409 if user already has a card

### GET /api/digital-cards/:id
- **Purpose:** Get specific card by ID
- **Auth:** Required (must be same tenant)
- **Response:** `{ card: DigitalBusinessCard }`

### PATCH /api/digital-cards/:id
- **Purpose:** Update card
- **Auth:** Required (own card or admin)
- **Body:** UpdateDigitalCardRequest (partial)
- **Response:** `{ card: DigitalBusinessCard }`

### DELETE /api/digital-cards/:id
- **Purpose:** Delete card
- **Auth:** Required (admin only)
- **Response:** `{ success: true }`

### GET /api/digital-cards/:id/analytics
- **Purpose:** Get card analytics
- **Auth:** Required (same tenant)
- **Query Params:** `days` (default: 30)
- **Response:** `GetCardAnalyticsResponse`

### POST /api/digital-cards/:id/interactions (PUBLIC)
- **Purpose:** Track interaction
- **Auth:** Not required
- **Body:** `{ interaction_type: InteractionType, ...prospect_info }`
- **Response:** `{ interaction: BusinessCardInteraction }` (201)

### POST /api/digital-cards/:id/contact (PUBLIC)
- **Purpose:** Submit contact form
- **Auth:** Not required
- **Body:** `{ name, email, phone?, company?, message }`
- **Response:** `{ success: true, message: string }` (201)

### GET /api/digital-cards/slug/:slug (PUBLIC)
- **Purpose:** Get card by public slug
- **Auth:** Not required
- **Response:** `{ card: PublicCardData }` (excludes analytics)

## Data Models

### digital_business_cards Table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | FK to tenants |
| user_id | uuid | FK to auth.users |
| full_name | text | Card holder name (required) |
| job_title | text | Job title |
| phone | text | Personal phone |
| email | text | Personal email |
| company_name | text | Company name |
| company_address | text | Company address |
| company_phone | text | Company phone |
| company_email | text | Company email |
| company_website | text | Company website URL |
| linkedin_url | text | LinkedIn profile URL |
| facebook_url | text | Facebook profile URL |
| instagram_url | text | Instagram profile URL |
| twitter_url | text | Twitter profile URL |
| tagline | text | Short tagline |
| bio | text | Bio/description |
| services | text | Comma-separated services |
| brand_color | text | Hex color (default: #3b82f6) |
| logo_url | text | Logo image URL |
| profile_photo_url | text | Profile photo URL |
| background_image_url | text | Background image URL |
| slug | text | Unique URL slug |
| qr_code_url | text | QR code image URL |
| card_url | text | Full card URL |
| is_active | boolean | Card active status |
| enable_contact_form | boolean | Contact form enabled |
| enable_appointment_booking | boolean | Booking enabled |
| total_views | integer | View count |
| total_vcard_downloads | integer | Download count |
| total_phone_clicks | integer | Phone click count |
| total_email_clicks | integer | Email click count |
| total_contact_form_submissions | integer | Form submission count |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Update timestamp |
| last_viewed_at | timestamptz | Last view timestamp |

### business_card_interactions Table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| card_id | uuid | FK to digital_business_cards |
| interaction_type | text | Type of interaction |
| prospect_name | text | Contact form name |
| prospect_email | text | Contact form email |
| prospect_phone | text | Contact form phone |
| prospect_company | text | Contact form company |
| prospect_message | text | Contact form message |
| ip_address | text | Visitor IP |
| user_agent | text | Browser user agent |
| referrer | text | Referrer URL |
| device_type | text | mobile/tablet/desktop |
| browser | text | Detected browser |
| os | text | Detected OS |
| country | text | Geolocation country |
| city | text | Geolocation city |
| interaction_metadata | jsonb | Additional metadata |
| created_at | timestamptz | Interaction timestamp |

## Integration Points

### Contact Management
- Contact form submissions auto-create contacts
- Contacts linked to card owner via `assigned_to`
- Source tracked as "Digital Business Card"

### Activity Tracking
- Contact form submissions create activity records
- Activity type: note, subtype: inbound_message
- Metadata includes card_id and prospect info

### Supabase Storage
- Profile photos stored in Supabase Storage
- Logo and background images supported
- URLs stored in card record

### Authentication
- Card management requires authentication
- Public endpoints (card view, interactions, contact form) do not require auth
- Tenant isolation enforced via RLS

## Configuration

### Environment Variables
No additional environment variables required - uses existing Supabase configuration.

### Constants
```typescript
// Default brand colors available in picker
const DEFAULT_BRAND_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
]

// QR Code defaults
const DEFAULT_QR_CODE_SIZE = 300
const DEFAULT_QR_CODE_ERROR_CORRECTION = 'M'
```

### Dependencies
```json
{
  "qrcode": "^1.5.4",
  "@types/qrcode": "^1.5.6"
}
```

## Security

### Row-Level Security (RLS)
- 8 RLS policies on `digital_business_cards` table
- Tenant isolation enforced
- Users can only update their own cards (or admin)
- Delete restricted to admin role

### Public Endpoint Security
- Rate limiting recommended for interactions endpoint
- Email validation on contact form
- Card must be active for public access
- Contact form check (`enable_contact_form` must be true)

### Data Privacy
- IP addresses stored for analytics
- User agents captured for device detection
- No PII exposed in public card data
- Analytics only visible to card owner and tenant admins

## Testing

### E2E Test Coverage
- File: `/e2e/error-states.spec.ts`
- Tests API error handling for digital cards endpoints

### Manual Test Scenarios
1. Create new digital business card
2. Update card information
3. Preview card in public view
4. Download QR code
5. Copy share URL
6. Submit contact form as prospect
7. Verify contact created in CRM
8. Check analytics dashboard

## Performance Considerations

### Caching
- QR code responses cached with 1-year max-age
- Public card data can be cached (static content)

### Analytics Aggregation
- Summary stats stored on card record (denormalized)
- Reduces query complexity for dashboard
- Triggered by database updates

### Image Optimization
- Profile photos via Next.js Image component
- Responsive sizing supported
- Lazy loading for background images

## Future Enhancements

### Planned Features
- Email notifications when contact form submitted (TODO in code)
- Appointment booking integration
- Custom card templates/themes
- NFC card integration
- Card analytics export
- Team card management dashboard
- A/B testing for card variations

### Potential Improvements
- Geolocation API for country/city detection
- Real-time analytics with WebSocket
- Card version history
- Custom domains for card URLs
- PDF export of analytics reports

---

## Validation Record

### Files Examined (11 total)
1. `/Users/ccai/roofing saas/roofing-saas/lib/digital-cards/types.ts` - Type definitions (533 lines) - 30+ types, 11 interaction types, constants, helpers
2. `/Users/ccai/roofing saas/roofing-saas/lib/digital-cards/vcard.ts` - vCard generation (238 lines) - RFC 6350 compliant
3. `/Users/ccai/roofing saas/roofing-saas/lib/digital-cards/qrcode.ts` - QR code generation (274 lines) - Uses qrcode npm package
4. `/Users/ccai/roofing saas/roofing-saas/app/api/digital-cards/route.ts` - GET/POST endpoints (224 lines)
5. `/Users/ccai/roofing saas/roofing-saas/app/api/digital-cards/[id]/route.ts` - GET/PATCH/DELETE (287 lines)
6. `/Users/ccai/roofing saas/roofing-saas/app/api/digital-cards/[id]/analytics/route.ts` - Analytics API (280 lines)
7. `/Users/ccai/roofing saas/roofing-saas/app/api/digital-cards/[id]/interactions/route.ts` - Interaction tracking (185 lines)
8. `/Users/ccai/roofing saas/roofing-saas/app/api/digital-cards/[id]/contact/route.ts` - Contact form (215 lines)
9. `/Users/ccai/roofing saas/roofing-saas/app/api/digital-cards/slug/[slug]/route.ts` - Public slug lookup (95 lines)
10. `/Users/ccai/roofing saas/roofing-saas/app/card/[slug]/page.tsx` - Public card page (518 lines)
11. `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/settings/my-card/page.tsx` - Card management UI (767 lines)

### Additional Files Verified
- `/Users/ccai/roofing saas/roofing-saas/package.json` - Confirmed qrcode v1.5.4 and @types/qrcode v1.5.6 dependencies
- `/Users/ccai/roofing saas/roofing-saas/docs/security/SECURITY_AUDIT_REPORT.md` - Confirmed 8 RLS policies on digital_business_cards
- `/Users/ccai/roofing saas/roofing-saas/e2e/error-states.spec.ts` - E2E test coverage exists

### Archon RAG Queries
- Query: "vCard generation digital business card QR code" - No relevant results (feature-specific implementation)

### Verification Steps
1. Confirmed all API routes exist via directory listing (`ls -la`)
2. Verified type definitions match API implementations
3. Confirmed vCard follows RFC 6350 format with proper escaping
4. Verified QR code options and presets in qrcode.ts
5. Confirmed public endpoints have no auth checks
6. Verified contact form creates contacts and activities
7. Confirmed analytics calculation logic in analytics route
8. Verified package.json dependencies

### Validated By
PRD Documentation Agent - Session 25
Date: 2025-12-11
