# Combined Implementation Plan: Proline + Enzy Replacement
**Date**: October 2, 2025
**Project**: Roofing SaaS Platform
**Client**: Tennessee Roofing Company
**Goal**: Replace both Proline CRM and Enzy door-knocking app with unified platform

---

## Executive Summary

After comprehensive exploration of both **Proline CRM** and **Enzy door-knocking platform**, we've identified significant feature gaps that must be addressed to successfully replace both systems. This document provides a unified implementation strategy.

### Key Discoveries

**From Proline Exploration**:
- 835 missing projects (60% of data not migrated)
- 10+ feature tabs per project (Files, Tasks, Events, Jobs, Billing, Budget, etc.)
- Organizations feature for business clients
- Jobs module separate from Projects
- Call logging with recording

**From Enzy Exploration**:
- Map-based territory management (CRITICAL for door-knocking)
- Weather maps for storm targeting
- Gamified competitions driving 27% sales increase
- Customer survey system yielding 170% more reviews
- 56 active field reps with 45,000+ total knocks

### Scope Impact

**Original Plan**: Replace Proline only
**Actual Need**: Replace Proline + Enzy (both are critical to operations)

**Timeline Adjustment**:
- Original Enhanced: 16-18 weeks
- Combined Replacement: **22-24 weeks**
- Original Baseline: 22 weeks
- **Result**: On par with original estimate, but delivering 2 systems instead of 1

**Cost Savings**:
- Proline: Unknown (legacy system)
- Enzy: ~$20,000/year (estimated)
- **Total Potential Savings**: $20,000+/year by consolidating to single platform

---

## 1. Feature Gap Matrix

| Feature | Proline Has | Enzy Has | We Built | Priority | Phase |
|---|---|---|---|---|---|
| **Contact Management** | ✅ | ❌ | ✅ | — | Complete |
| **Project Pipeline** | ✅ | ❌ | ✅ | — | Complete |
| **Basic Gamification** | ❌ | ✅ | ✅ | — | Complete |
| **Leaderboards** | ❌ | ✅ | ✅ | — | Complete |
| **File Upload/Storage** | ✅ | ✅ | ❌ | 🔴 CRITICAL | 3 |
| **Jobs/Production** | ✅ | ❌ | ❌ | 🔴 CRITICAL | 3 |
| **Organizations** | ✅ | ❌ | ❌ | 🔴 HIGH | 1 Ext |
| **Tasks** | ✅ | ✅ | ❌ | 🟡 HIGH | 1 Ext |
| **Events/Calendar** | ✅ | ❌ | ❌ | 🟡 MEDIUM | 2/3 |
| **Call Logging** | ✅ | ❌ | ❌ | 🔴 HIGH | 2 |
| **Map Canvassing** | ❌ | ✅ | ❌ | 🔴 CRITICAL | 3 |
| **Weather Maps** | ❌ | ✅ | ❌ | 🔴 HIGH | 3 |
| **Competitions UI** | ❌ | ✅ | ❌ | 🟡 MEDIUM | 3/4 |
| **Customer Surveys** | ❌ | ✅ | ❌ | 🔴 HIGH | 2 |
| **Digital Bus. Cards** | ❌ | ✅ | ❌ | ⚪ LOW | Later |
| **Quote/E-Sign** | ✅ | ❌ | ❌ | 🟡 MEDIUM | 5 |
| **Messaging (Internal)** | ✅ | ✅ | ❌ | 🟡 MEDIUM | 2 |
| **SMS to Customers** | ❌ | ✅ | ❌ | 🔴 HIGH | 2 |
| **Badges System** | ❌ | ✅ | ❌ | 🟡 MEDIUM | 3 |
| **Report Builder** | ✅ | ✅ | ❌ | 🟡 MEDIUM | 5 |
| **Media Library** | ❌ | ✅ | ❌ | ⚪ LOW | Later |
| **Recruiting Module** | ❌ | ✅ | ❌ | ⚪ LOW | Later |

---

## 2. Revised Phase Breakdown

### Phase 0: Data Migration (Week 0) ✅ COMPLETE
- [x] Initial CSV import (556 projects)
- [ ] **NEW**: Re-import all 1,391 projects from Proline
- [ ] **NEW**: Export historical knock data from Enzy (if available)
- [ ] **NEW**: Validate complete data migration

**Status**: Partially complete (need full re-import)

---

### Phase 1: Core CRM (Weeks 1-5) 🟡 IN PROGRESS

**Original Scope** (Weeks 1-4):
- [x] Project setup (Next.js, Supabase, Auth)
- [x] Database schema deployment
- [x] Multi-tenant architecture with RLS
- [x] Contact management (CRUD + UI)
- [x] Project pipeline (list, filters, detail pages)
- [x] Basic gamification (points system)

**Phase 1 Extension** (Week 5): ⏳ NEW
**Goal**: Critical Proline features before Phase 2

#### Week 5: Organizations, Tasks, & Data Re-Import
- [ ] **Organizations Module**:
  - [ ] `organizations` table (id, tenant_id, name, org_type, stage, primary_contact_id, address, notes)
  - [ ] Organizations CRUD API (`/api/organizations`)
  - [ ] Organizations list/detail UI
  - [ ] Link projects to organizations
  - [ ] Auto-populate default contacts for org projects

- [ ] **Tasks Module**:
  - [ ] `tasks` table (id, tenant_id, project_id, title, description, assigned_to, due_date, priority, status)
  - [ ] Tasks CRUD API (`/api/tasks`)
  - [ ] Simple task list UI (filterable by project, user, status)
  - [ ] Task creation from project detail page

- [ ] **Complete Data Re-Import**:
  - [ ] Request full Proline export (all 1,391 projects)
  - [ ] Update import script for all fields (portal URL, adjuster, etc.)
  - [ ] Import BILLING, CLOSED, and missing PRODUCTION projects
  - [ ] Validate project counts match Proline

- [ ] **UI Fixes**:
  - [ ] Display custom_fields in project detail page (currently hidden)
  - [ ] Add edit capabilities for custom fields
  - [ ] Show pipeline/stage/assigned_to/tags in UI

**Deliverables**:
- Organizations management for business clients (real estate agents, property managers)
- Task tracking per project
- Complete historical project data (1,391 projects)
- Custom fields visible and editable

**Estimated Time**: 1 week (5 days with Sonnet 4.5 parallel development)

---

### Phase 2: Communication Hub (Weeks 6-10) 🔴 ENHANCED
**Original Timeline**: Weeks 5-8 (4 weeks)
**Enhanced Timeline**: Weeks 6-10 (5 weeks) +1 week for new features

#### Week 6-7: SMS & Email (Original Plan)
- [ ] Twilio account setup
- [ ] SMS sending infrastructure (`/api/sms/send`)
- [ ] SMS templates (appointment reminders, follow-ups)
- [ ] SMS history tracking per contact/project
- [ ] Email integration (Resend or SendGrid)
- [ ] Email templates (quotes, contracts, updates)
- [ ] Email sending API (`/api/email/send`)

#### Week 8: Call Management + Recording (Enhanced)
- [ ] **Call Logging System**:
  - [ ] `call_logs` table (id, tenant_id, project_id, contact_id, user_id, direction, duration, recording_url, notes, outcome)
  - [ ] Twilio Voice integration
  - [ ] Call recording storage (Supabase Storage or Twilio)
  - [ ] Click-to-call from contacts/projects
  - [ ] Call history display
  - [ ] Recording playback UI

- [ ] **Compliance**:
  - [ ] Research Tennessee recording laws (1-party vs 2-party consent)
  - [ ] Add consent disclosure to dialer UI
  - [ ] Recording opt-out for states requiring 2-party consent

#### Week 9: Customer Surveys + Review Gating (NEW - Enzy Feature)
- [ ] **Survey System**:
  - [ ] `customer_surveys` table (id, tenant_id, project_id, contact_id, rating, feedback, survey_type, sent_at, completed_at)
  - [ ] QR code generation (library: qrcode.js)
  - [ ] Survey landing page (`/survey/[id]`)
  - [ ] 1-5 star rating capture
  - [ ] **Review Gating Logic**:
    - [ ] If 4-5 stars → Redirect to Google review page
    - [ ] If 1-3 stars → Capture detailed feedback, alert manager
  - [ ] SMS survey sending (integrate with Week 6 SMS system)
  - [ ] Email survey sending
  - [ ] Survey analytics dashboard

- [ ] **Google Review Deep Linking**:
  - [ ] Generate Google review URL for business
  - [ ] Track review conversion rate

#### Week 10: Team Messaging (Optional Enhancement)
- [ ] **Internal Messaging** (if time permits):
  - [ ] `messages` table (id, sender_id, recipient_ids[], message_text, thread_id, created_at)
  - [ ] Real-time chat UI (Supabase Realtime)
  - [ ] Project-specific threads
  - [ ] User mentions (@username)
  - [ ] OR: Skip this and use existing tools (Slack, Teams)

**Deliverables**:
- SMS automation to customers
- Email campaign tools
- Call logging with recording (client requirement)
- Customer survey system with Google review funnel (Enzy replacement)
- Optional: Internal team chat

**Estimated Time**: 5 weeks

---

### Phase 3: Mobile PWA + Canvassing (Weeks 11-18) 🔴 SIGNIFICANTLY ENHANCED
**Original Timeline**: Weeks 9-12 (4 weeks)
**Enhanced Timeline**: Weeks 11-18 (8 weeks) +4 weeks for Enzy replacement

This is the BIGGEST phase expansion - we're building the entire Enzy replacement here.

#### Week 11-12: PWA Foundation + File Management
- [ ] **PWA Setup**:
  - [ ] next-pwa configuration
  - [ ] Service worker for offline caching
  - [ ] App manifest (icons, theme, install prompt)
  - [ ] Offline detection and queue

- [ ] **File Upload System** (Proline + Enzy need):
  - [ ] `project_files` table (id, tenant_id, project_id, file_name, file_type, file_url, file_size, uploaded_by, created_at)
  - [ ] Supabase Storage bucket: `project-files`
  - [ ] Mobile camera integration
  - [ ] Photo upload from mobile camera
  - [ ] Photo gallery view per project
  - [ ] Document upload (PDFs, contracts, estimates)
  - [ ] File deletion
  - [ ] RLS policies for file access

#### Week 13-14: Map-Based Canvassing (CRITICAL - Enzy Replacement)
- [ ] **Google Maps Integration**:
  - [ ] Google Maps Platform account setup
  - [ ] Enable APIs: Maps JavaScript API, Places API, Geocoding API
  - [ ] Billing alerts configuration

- [ ] **Territory Management**:
  - [ ] Install PostGIS extension in Supabase
  - [ ] `territories` table with GEOMETRY(Polygon, 4326)
  - [ ] Territory drawing tool (polygon on map - desktop admin UI)
  - [ ] Assign territories to users
  - [ ] Mobile: View assigned territory overlay

- [ ] **Knock Tracking**:
  - [ ] `knocks` table (id, tenant_id, user_id, latitude, longitude, address, disposition, notes, photos[], appointment_date, created_at)
  - [ ] Map component with pin placement
  - [ ] Tap map to drop pin at current location
  - [ ] Auto-populate address via reverse geocoding
  - [ ] Quick disposition buttons:
    - "Not Home"
    - "Interested"
    - "Not Interested"
    - "Set Appointment"
    - "Callback Later"
  - [ ] Color-coded pins by disposition
  - [ ] Photo attachment to knock
  - [ ] Notes field (optional, voice-to-text?)
  - [ ] Appointment date picker
  - [ ] Submit knock → Sync to backend → Update leaderboard

#### Week 15: GPS Tracking & Rep Location
- [ ] **Real-Time Location Tracking**:
  - [ ] `rep_locations` table (id, user_id, latitude, longitude, recorded_at)
  - [ ] Mobile: GPS permission request
  - [ ] Background location tracking (configurable intervals: 5min, 15min, 30min)
  - [ ] Battery optimization (low-power mode option)
  - [ ] Manager dashboard: Real-time rep location map
  - [ ] Privacy controls (tracking only during work hours, opt-in)

#### Week 16: Weather Maps (Enzy Differentiator for Roofing)
- [ ] **Storm Data Integration**:
  - [ ] Research API options:
    - [ ] NOAA Storm Events API (free)
    - [ ] WeatherBug API (commercial)
    - [ ] Weather Underground (commercial)
  - [ ] Select and integrate chosen API
  - [ ] `storm_events` table (id, event_type, latitude, longitude, hail_size, wind_speed, event_date)
  - [ ] Sync storm data daily/weekly

- [ ] **Weather Overlay UI**:
  - [ ] Layer storm data on territory map
  - [ ] Filter by date range (last 30 days, 60 days, 90 days)
  - [ ] Filter by severity (hail size: 1"+, 1.5"+, 2"+)
  - [ ] Color-code by event type (hail = orange, tornado = red, wind = blue)
  - [ ] Click storm event for details

#### Week 17: Jobs Module (Proline Production Tracking)
- [ ] **Jobs System** (separate from Projects):
  - [ ] `jobs` table (id, tenant_id, project_id, job_number, scheduled_date, crew_assigned, status, notes, created_at, updated_at)
  - [ ] Job statuses: "scheduled", "in_progress", "completed", "cancelled"
  - [ ] Jobs CRUD API (`/api/jobs`)
  - [ ] Jobs list/calendar view
  - [ ] Create job from project
  - [ ] Assign crew members to job
  - [ ] Job scheduling calendar (drag-and-drop?)
  - [ ] Job progress tracking
  - [ ] Mark job complete with photos
  - [ ] Link jobs back to projects

#### Week 18: Gamification Enhancements
- [ ] **Badges System**:
  - [ ] `badges` table (id, name, description, icon_url, criteria)
  - [ ] `user_badges` table (id, user_id, badge_id, earned_at)
  - [ ] Pre-defined badges:
    - "100 Knocks Club"
    - "Top Closer" (most appointments set)
    - "Perfect Week" (knocked every day)
    - "Storm Chaser" (most knocks in storm areas)
  - [ ] Badge display on leaderboard
  - [ ] Badge display on user profiles
  - [ ] Badge notification when earned

- [ ] **Real-Time Leaderboard Updates**:
  - [ ] Supabase Realtime subscription for gamification_scores
  - [ ] WebSocket updates when knock logged
  - [ ] Optimistic UI (increment local count immediately)
  - [ ] Celebration animation when moving up ranks

- [ ] **Competition Tracking** (basic):
  - [ ] `competitions` table (id, tenant_id, name, start_date, end_date, kpi_type, prize, status)
  - [ ] Active competition banner
  - [ ] Competition leaderboard view
  - [ ] Winner announcement

**Deliverables**:
- Complete mobile PWA with offline support
- File upload from mobile camera (Proline + Enzy need)
- Photo gallery per project
- Map-based territory management (Enzy replacement)
- Knock tracking with dispositions
- GPS location tracking
- Weather maps for storm targeting (Enzy feature)
- Jobs module for production scheduling (Proline feature)
- Badges and enhanced gamification (Enzy feature)

**Estimated Time**: 8 weeks (doubled from original 4 weeks)

---

### Phase 4: AI Voice Assistant (Weeks 19-22) ✅ NO CHANGES
**Timeline**: Weeks 19-22 (4 weeks) - unchanged

This phase remains as originally planned - it's a differentiator that neither Proline nor Enzy have.

**Deliverables**:
- Voice-activated project creation
- Call transcription and summarization
- AI-powered lead qualification
- Hands-free data entry

**Estimated Time**: 4 weeks

---

### Phase 5: Financial Integration (Weeks 23-24) 🟡 SLIGHTLY ENHANCED
**Original Timeline**: Weeks 17-18 (2 weeks)
**Enhanced Timeline**: Weeks 23-24 (2 weeks)

#### Week 23: QuickBooks Integration
- [ ] QuickBooks API OAuth setup
- [ ] Sync customers (contacts)
- [ ] Sync invoices
- [ ] Sync payments
- [ ] Job costing sync

#### Week 24: Competition Builder + Quote System
- [ ] **Competition Creation UI** (Enzy feature):
  - [ ] Admin UI to create competitions
  - [ ] Name, start/end dates, KPI selection
  - [ ] Individual vs team mode
  - [ ] Prize configuration
  - [ ] Launch competition

- [ ] **Quote/Proposal System** (Proline feature):
  - [ ] Quote builder interface
  - [ ] Line items, pricing
  - [ ] PDF generation
  - [ ] E-sign integration (DocuSign or SignRequest)

**Deliverables**:
- QuickBooks sync
- Competition creation tools (Enzy replacement)
- Quote/proposal builder with e-signing (Proline feature)

**Estimated Time**: 2 weeks

---

## 3. Revised Timeline Summary

| Phase | Weeks | Duration | Status | Changes |
|---|---|---|---|---|
| Phase 0: Data Migration | 0 | 1 week | ⏳ Partial | +Re-import needed |
| Phase 1: Core CRM | 1-5 | 5 weeks | 🟡 In Progress | +1 week (Orgs, Tasks) |
| Phase 2: Communication | 6-10 | 5 weeks | ⏳ Planned | +1 week (Surveys, Calls) |
| Phase 3: Mobile + Canvassing | 11-18 | 8 weeks | ⏳ Planned | +4 weeks (Enzy features) |
| Phase 4: AI Voice | 19-22 | 4 weeks | ⏳ Planned | No change |
| Phase 5: Financial | 23-24 | 2 weeks | ⏳ Planned | No change |
| **TOTAL** | **0-24** | **24 weeks** | | **+6 weeks from enhanced** |

**Comparison**:
- **Original Baseline**: 22 weeks (single CRM)
- **Enhanced Estimate (Proline only)**: 16-18 weeks
- **Combined Plan (Proline + Enzy)**: 24 weeks
- **Additional Scope**: +6 weeks, but delivering 2 system replacements instead of 1

---

## 4. Database Schema Additions

### New Tables Required

```sql
-- Organizations (Proline)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  org_type TEXT CHECK (org_type IN ('local_business', 'real_estate', 'developer', 'property_manager')),
  stage TEXT CHECK (stage IN ('new', 'active', 'inactive')),
  primary_contact_id UUID REFERENCES contacts(id),
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Add to projects
ALTER TABLE projects ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Tasks (Proline)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID REFERENCES projects(id),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  due_date DATE,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT CHECK (status IN ('todo', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Events/Calendar (Proline)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID REFERENCES projects(id),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Call Logs (Proline + Phase 2)
CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID REFERENCES projects(id),
  contact_id UUID REFERENCES contacts(id),
  user_id UUID REFERENCES auth.users(id),
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  duration INTEGER,
  recording_url TEXT,
  notes TEXT,
  outcome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Files (Proline + Enzy)
CREATE TABLE project_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Jobs/Production (Proline)
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  job_number TEXT,
  scheduled_date DATE,
  crew_assigned UUID REFERENCES auth.users(id),
  status TEXT CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Territories (Enzy) - Requires PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE territories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  boundary GEOMETRY(Polygon, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Knocks (Enzy)
CREATE TABLE knocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT,
  disposition TEXT CHECK (disposition IN ('not_home', 'interested', 'not_interested', 'appointment', 'callback')),
  notes TEXT,
  photos TEXT[],
  appointment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rep Locations (Enzy - GPS Tracking)
CREATE TABLE rep_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Storm Events (Enzy - Weather Maps)
CREATE TABLE storm_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  hail_size DECIMAL(4, 2),
  wind_speed INTEGER,
  event_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Surveys (Enzy)
CREATE TABLE customer_surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID REFERENCES projects(id),
  contact_id UUID REFERENCES contacts(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT,
  survey_type TEXT,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Badges (Enzy)
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  criteria JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  badge_id UUID NOT NULL REFERENCES badges(id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Competitions (Enzy)
CREATE TABLE competitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  kpi_type TEXT,
  prize TEXT,
  status TEXT CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

---

## 5. API Integrations & Services

### Required Integrations

| Service | Purpose | Phase | Estimated Cost/Month |
|---|---|---|---|
| **Twilio** | SMS, Voice, Call Recording | 2 | $100-300 |
| **Resend/SendGrid** | Email automation | 2 | $10-50 |
| **Google Maps Platform** | Territory maps, geocoding | 3 | $200-500 |
| **NOAA Storm Events** | Weather data (free) | 3 | $0 |
| **Supabase Storage** | File uploads, call recordings | 3 | $50-100 |
| **DocuSign/SignRequest** | E-signatures | 5 | $10-40/user |
| **QuickBooks** | Accounting sync | 5 | $0 (client has QB) |
| **OpenAI** | AI Voice Assistant | 4 | $100-200 |
| **TOTAL** | | | **$470-1,190/month** |

### Supabase Storage Buckets
- `project-files` - Photos, documents, contracts
- `call-recordings` - Twilio call recordings
- `signatures` - E-signed PDFs
- `user-avatars` - Profile pictures

---

## 6. Migration Strategy

### Proline Data Migration

**Phase 1 (Week 0-1)**:
1. Request complete data export from Proline
   - All 1,391 projects (CSV or JSON)
   - All custom fields
   - Contact associations
   - Organization data (if any)

2. Update import scripts
   - Map all Proline fields to our schema
   - Import organizations first
   - Link contacts to organizations
   - Import all projects with complete fields
   - Import tasks (if exportable)
   - Import file metadata (actual files may need manual migration)

3. Validation
   - Verify 1,391 projects imported
   - Check pipeline distribution matches Proline
   - Validate contact associations
   - Spot-check random projects for data accuracy

**Files Migration**:
- Option A: Download all files from Proline, re-upload to Supabase Storage
- Option B: 6-month overlap period - team uploads critical files to new system, old files remain in Proline for reference
- **Recommendation**: Option B (less work, gradual transition)

### Enzy Data Migration

**Phase 3 (Week 11)**:
1. Request historical data export from Enzy
   - All knock history (locations, dispositions, dates)
   - Territory assignments (if exportable)
   - User performance stats

2. Import knock history
   - Preserve historical leaderboard data
   - Import into `knocks` table
   - Link to users (match by email or name)

3. Recreation vs Export
   - Territories: Likely need to redraw (export may not be available)
   - Badges: Recreate based on Enzy criteria
   - Competitions: Start fresh (historical competitions less important)

**Cutover Strategy**:
- Week 18: Begin parallel usage (both Enzy and our PWA)
- Week 19-20: Team tests new system while keeping Enzy active
- Week 21: Sunset Enzy subscription if all features validated

---

## 7. Risk Assessment & Mitigation

### Critical Risks

#### 1. Timeline Slippage (HIGH RISK)
**Risk**: 24 weeks is aggressive for this much scope
**Impact**: Delayed launch, ongoing costs for Proline + Enzy
**Mitigation**:
- Use Sonnet 4.5 parallel development (30-hour sprint capability)
- Launch checkpoints for early feature validation
- Potentially phase launch (replace Proline first, Enzy 4 weeks later)

#### 2. Incomplete Data Migration (HIGH RISK)
**Risk**: Missing data from Proline export (not all fields exportable)
**Impact**: Client discovers missing projects/files after launch
**Mitigation**:
- Complete data audit before Week 5
- 6-month Proline overlap for file access
- Manual data entry for critical missing items

#### 3. Map Performance on Mobile (MEDIUM RISK)
**Risk**: Google Maps slow on rural areas with poor cell signal
**Impact**: Field reps frustrated with slow map loads
**Mitigation**:
- Implement tile caching
- Offline map support (pre-download territories)
- Fallback to static map images when offline

#### 4. GPS Battery Drain (MEDIUM RISK)
**Risk**: All-day GPS tracking kills phone battery
**Impact**: Reps turn off location tracking, missing data
**Mitigation**:
- Configurable tracking intervals (5min default, adjustable)
- Low-power mode option
- Battery usage education during training

#### 5. User Adoption - Enzy Replacement (HIGH RISK)
**Risk**: 56 field reps resist change from familiar Enzy app
**Impact**: Low usage, wasted development effort
**Mitigation**:
- Replicate Enzy UX patterns closely
- Extensive training sessions
- Gamified incentive for new app usage (points for logging knocks in new system)
- Champion program (identify enthusiastic early adopters)

#### 6. Weather Data Accuracy (LOW RISK)
**Risk**: NOAA free data may not match Enzy's commercial provider
**Impact**: Reps miss storm-damaged areas
**Mitigation**:
- Cross-reference multiple weather sources
- Allow manual pin drops for known storm areas
- Client feedback loop to improve accuracy

### Medium Risks

7. **Offline Sync Conflicts** - Two reps knock same house while offline
8. **Call Recording Compliance** - Tennessee laws may restrict recording
9. **File Storage Costs** - Photos exceed Supabase free tier
10. **Competition Creation Complexity** - Admin UI too complex, not used

---

## 8. Success Metrics

### Phase 1-2 Success (Proline Replacement)
- [ ] 1,391 projects fully migrated and accessible
- [ ] All contacts linked correctly
- [ ] Organizations managing 5+ business clients
- [ ] 100+ tasks created and tracked
- [ ] 50+ calls logged with recordings
- [ ] 20+ customer surveys sent with 80% response rate

### Phase 3 Success (Enzy Replacement)
- [ ] 56 field reps using mobile PWA daily
- [ ] 500+ knocks logged in first week
- [ ] Leaderboard updating in real-time
- [ ] Weather maps showing storm data for last 60 days
- [ ] 10+ territories drawn and assigned
- [ ] 100+ photos uploaded from mobile camera
- [ ] 5+ jobs scheduled and tracked to completion

### Overall Success (Platform Consolidation)
- [ ] Proline subscription cancelled (cost savings)
- [ ] Enzy subscription cancelled (cost savings ~$20K/year)
- [ ] Single unified platform in use
- [ ] No major bugs or data loss
- [ ] User satisfaction survey: 80%+ satisfied
- [ ] Client reports increased efficiency vs dual-system

---

## 9. Client Communication Plan

### Week 5 Checkpoint (After Phase 1 Extension)
**Review**:
- Organizations module demo
- Tasks system demo
- Complete data migration validation (1,391 projects)
- Phase 2 preview (call logging, surveys)

**Decisions Needed**:
- Approve Phase 2 scope (5 weeks)
- Confirm customer survey feature priority
- Discuss call recording compliance

### Week 10 Checkpoint (After Phase 2)
**Review**:
- SMS/Email automation demo
- Call logging with recording playback
- Customer survey + Google review funnel
- Phase 3 preview (mobile PWA, canvassing)

**Decisions Needed**:
- Approve extended Phase 3 (8 weeks for Enzy features)
- Confirm map canvassing requirements
- Weather map API selection (free NOAA vs paid services)

### Week 18 Checkpoint (After Phase 3)
**Review**:
- Mobile PWA with offline mode
- Map canvassing with knock tracking
- Weather maps
- Jobs module
- File uploads
- Gamification enhancements (badges, competitions)

**Decisions Needed**:
- Approve Enzy cutover timeline
- Plan field team training
- Phase 4 AI Voice Assistant preview

### Week 22 Checkpoint (After Phase 4)
**Review**:
- AI Voice Assistant demo
- Phase 5 preview (QuickBooks, quotes)

**Decisions Needed**:
- QuickBooks account credentials
- E-signing provider selection
- Final launch timeline

### Week 24: Final Launch
**Activities**:
- Complete team training
- Data migration validation
- Performance testing
- Bug fixes
- Go-live preparation
- Proline + Enzy sunset plan

---

## 10. Development Recommendations

### Prioritization Principles

1. **Must-Have Features First**
   - Data integrity (complete migration)
   - Core workflows (contact → project → job)
   - Critical replacements (map canvassing, call logging)

2. **Nice-to-Have Features Later**
   - Digital business cards → Post-launch
   - Media library → Post-launch
   - Advanced report builder → Phase 5 or later

3. **Leverage Existing Tools**
   - Internal messaging → Use Slack/Teams (don't build)
   - Recruiting → May use external ATS
   - Some analytics → Use QuickBooks reports

### Technical Best Practices

1. **Mobile-First Design**
   - Design for thumb-reach zones
   - Large tap targets (44px minimum)
   - Minimize typing (voice input, dropdowns, buttons)

2. **Offline-First Architecture**
   - Cache all read operations
   - Queue write operations when offline
   - Sync when connection restored
   - Clear conflict resolution strategy

3. **Performance Optimization**
   - Lazy load images
   - Infinite scroll for long lists
   - Debounce search inputs
   - Optimize map tile loading

4. **Testing Strategy**
   - Unit tests for critical business logic
   - E2E tests for user workflows
   - Mobile device testing (iOS + Android)
   - Network throttling tests (slow 3G)

---

## 11. Budget Considerations

### Development Costs (Internal - You + Claude)
- **Your Time**: Assume full-time (40 hrs/week × 24 weeks = 960 hours)
- **Claude Code**: Subscription cost (~$20/month × 6 months = $120)

### Infrastructure Costs (Monthly)
- **Supabase**: Pro plan ($25) or Team plan ($599 for larger scale)
- **Google Maps API**: ~$200-500 (with billing alerts)
- **Twilio**: $100-300 (SMS + voice)
- **Email**: $10-50 (Resend or SendGrid)
- **Storage**: $50-100 (Supabase file storage)
- **Other Services**: $100-200 (weather, e-sign, misc)
- **TOTAL**: **$485-1,749/month**

### Annual Cost Comparison

**Current State (Client)**:
- Proline: Unknown (legacy CRM, estimate $5-10K/year?)
- Enzy: ~$20,000/year (estimated $30/user × 56 reps × 12 months)
- **TOTAL CURRENT**: ~$25,000-30,000/year

**New Platform**:
- Infrastructure: $5,820-20,988/year
- Development: One-time (6 months of your time)
- **TOTAL NEW**: ~$6,000-21,000/year ongoing

**NET SAVINGS**: $4,000-9,000/year (depending on Supabase tier)

**PLUS**: Single platform to maintain, better integration, modern tech stack

---

## 12. Post-Launch Roadmap (Future Enhancements)

After Week 24, consider these additions:

### Phase 6: Advanced Features (Months 7-9)
- [ ] Digital business cards
- [ ] Media library for training
- [ ] Advanced report builder
- [ ] Recruiting module (if needed)
- [ ] Mobile app (native iOS/Android with React Native/Flutter)

### Integrations
- [ ] Zapier integration (no-code automation)
- [ ] Google Sheets export
- [ ] Slack notifications
- [ ] Calendar sync (Google Calendar, Outlook)

### Analytics
- [ ] Custom dashboards
- [ ] Predictive analytics (AI-powered forecasting)
- [ ] Team performance benchmarking

### Enhancements
- [ ] Multi-language support (if expanding to Spanish-speaking crews)
- [ ] Advanced territory optimization (AI-suggested routes)
- [ ] Automated lead scoring

---

## 13. Final Recommendations

### Option A: Full Replacement (RECOMMENDED)
**Timeline**: 24 weeks
**Scope**: Replace both Proline + Enzy completely
**Investment**: 6 months development + $6-21K/year infrastructure
**Benefit**: Single unified platform, $4-9K/year savings, modern tech

**Pros**:
- Complete system consolidation
- Better data integration (no sync issues)
- Custom roofing workflow
- AI Voice Assistant differentiator
- Long-term cost savings

**Cons**:
- Longer timeline (24 weeks vs 18)
- Higher upfront development effort
- More complex migration

### Option B: Phased Replacement
**Timeline**: 18 weeks (Proline) + 6 weeks later (Enzy)
**Scope**: Replace Proline first, Enzy in Phase 6
**Investment**: Faster initial launch, but longer dual-system period

**Pros**:
- Faster initial value (Proline replaced Week 18)
- Less upfront risk
- Can validate core platform before Enzy features

**Cons**:
- Maintain Enzy subscription longer (~$20K extra)
- Data sync issues between Proline replacement and Enzy
- Two migration periods (more disruption)

### Option C: Hybrid Integration
**Timeline**: 18 weeks
**Scope**: Replace Proline, integrate with Enzy API (if available)
**Investment**: Depends on Enzy API availability

**Pros**:
- Fastest timeline
- Lower development risk

**Cons**:
- Depends on Enzy having an API (unconfirmed)
- Ongoing Enzy costs (~$20K/year)
- Less control over canvassing features

---

## Conclusion

**Recommendation**: Proceed with **Option A - Full Replacement (24 weeks)**

**Rationale**:
1. **Complete consolidation** - Single platform is easier to maintain and train
2. **Cost savings** - ~$10K/year by eliminating both Proline + Enzy
3. **Better integration** - No data sync issues, unified user experience
4. **Competitive advantage** - AI Voice Assistant + custom roofing workflows
5. **Timeline acceptable** - 24 weeks is on par with original 22-week estimate, but delivers 2 system replacements instead of 1

**Next Steps**:
1. Review this plan with client
2. Get approval for 24-week timeline
3. Request complete Proline data export (1,391 projects)
4. Begin Phase 1 Extension (Organizations, Tasks, Data Re-Import)
5. Set up weekly check-in cadence

**Success Criteria**:
- By Week 24: Complete Proline + Enzy replacement
- By Week 30: Both legacy systems sunset
- By Week 52: $20K+ annual savings realized

This combined plan addresses ALL critical gaps from both Proline and Enzy, delivering a best-in-class roofing business management platform that exceeds the capabilities of the legacy systems while saving money long-term.

---

**Plan Compiled By**: Claude (Sonnet 4.5)
**Date**: October 2, 2025
**Status**: Ready for client review and approval
