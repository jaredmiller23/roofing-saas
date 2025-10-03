# Service Gap Analysis - Proline & Enzy Replacement
**Date**: October 3, 2025
**Status**: Critical Gaps Identified
**Priority**: Address before full production launch

---

## Executive Summary

Based on comprehensive exploration of Proline CRM and Enzy door-knocking platform, we have identified **19 critical service gaps** that must be addressed to fully replace both legacy systems. This document prioritizes gaps and provides implementation roadmap.

**Bottom Line**:
- ✅ **8 features implemented** (Core CRM, Auth, Gamification basics)
- ⚠️ **6 features partial** (Financial tracking, Activities, Custom fields)
- ❌ **19 features missing** (File management, Maps, Jobs, etc.)

---

## 🔴 CRITICAL GAPS (Must Fix Before Launch)

### 1. File Management System ❌
**Status**: NOT IMPLEMENTED
**Impact**: BLOCKER - Client explicitly needs mobile photo uploads

**Current State**:
- No file upload capability
- No document storage
- No photo gallery
- No file organization

**Required Features**:
- Mobile camera photo upload
- Document upload (PDFs, contracts)
- Photo gallery per project
- File categorization (before/after, damage, contracts)
- Supabase Storage integration

**Tables Needed**:
```sql
CREATE TABLE project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  file_name TEXT NOT NULL,
  file_type TEXT, -- 'photo', 'document', 'contract', 'estimate'
  file_url TEXT NOT NULL, -- Supabase Storage URL
  file_size INTEGER,
  thumbnail_url TEXT, -- For photos
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Implementation Priority**: Phase 3 (Mobile PWA)
**Estimated Time**: 1 week

---

### 2. Jobs/Production System ❌
**Status**: NOT IMPLEMENTED
**Impact**: CRITICAL - Cannot manage production workflow

**Current State**:
- Projects table handles both sales AND production
- No separation of concerns
- No crew management
- No job scheduling

**Required Features**:
- Separate Jobs entity from Projects
- Crew assignment (assign user to job)
- Job scheduling (start/end dates)
- Progress tracking (scheduled, in_progress, completed)
- Link jobs to projects (one project → one job)

**Tables Needed**:
```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  job_number TEXT UNIQUE,
  scheduled_date DATE,
  completion_date DATE,
  crew_lead UUID REFERENCES auth.users(id),
  crew_members UUID[], -- Array of user IDs
  status TEXT CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Implementation Priority**: Phase 3 (Mobile PWA)
**Estimated Time**: 1-2 weeks

---

### 3. Map-Based Canvassing ❌
**Status**: NOT IMPLEMENTED
**Impact**: BLOCKER for Enzy replacement

**Current State**:
- No map interface
- No territory management
- No GPS tracking
- No knock logging

**Required Features**:
- Interactive Google Maps/Mapbox integration
- Pin placement for door knocks
- Disposition tracking (not home, interested, set appointment)
- Territory drawing and assignment
- GPS location tracking of field reps
- Address search and geocoding

**Tables Needed**:
```sql
CREATE TABLE territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  boundary GEOMETRY(Polygon, 4326), -- PostGIS geospatial
  color TEXT, -- For map visualization
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE knocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID REFERENCES auth.users(id),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT,
  disposition TEXT, -- 'not_home', 'interested', 'not_interested', 'appointment'
  notes TEXT,
  photos TEXT[], -- Array of Supabase Storage URLs
  appointment_date TIMESTAMPTZ,
  contact_id UUID REFERENCES contacts(id), -- Link to created contact
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rep_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL
);
```

**Implementation Priority**: Phase 3 Extension (Week 10-13)
**Estimated Time**: 2-3 weeks

---

### 4. Organizations/Business Clients ❌
**Status**: NOT IMPLEMENTED
**Impact**: HIGH - Cannot track commercial clients or referral sources

**Current State**:
- Only individual contacts
- No business entity tracking
- No referral source management

**Required Features**:
- Organizations CRUD (create, list, edit)
- Organization types (real estate, developer, property manager, local business)
- Link projects to organizations
- Default contact population for recurring clients
- Organization stage tracking (new, active, inactive)

**Tables Needed**:
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  org_type TEXT CHECK (org_type IN ('real_estate', 'developer', 'property_manager', 'local_business')),
  stage TEXT CHECK (stage IN ('new', 'active', 'inactive')),
  primary_contact_id UUID REFERENCES contacts(id),
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add to projects table
ALTER TABLE projects ADD COLUMN organization_id UUID REFERENCES organizations(id);
```

**Implementation Priority**: Phase 1 Extension (Week 5)
**Estimated Time**: 3-5 days

---

## 🟡 HIGH PRIORITY GAPS (Should Fix Soon)

### 5. Call Logging & Recording ❌
**Status**: NOT IMPLEMENTED
**Impact**: HIGH - Client uses phone heavily

**Current State**:
- No call tracking
- No call recording
- No duration/outcome tracking

**Required Features**:
- Call logging with Twilio integration
- Call recording storage
- Duration tracking
- Outcome tracking (answered, voicemail, busy)
- Link calls to contacts/projects

**Tables Needed**:
```sql
CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  contact_id UUID REFERENCES contacts(id),
  project_id UUID REFERENCES projects(id),
  user_id UUID REFERENCES auth.users(id),
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  phone_number TEXT,
  duration INTEGER, -- seconds
  recording_url TEXT, -- Twilio recording URL or Supabase Storage
  transcription TEXT, -- Optional AI transcription
  notes TEXT,
  outcome TEXT, -- 'answered', 'voicemail', 'busy', 'no_answer'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Implementation Priority**: Phase 2 (Communication Hub)
**Estimated Time**: 1 week

---

### 6. Weather Maps (Storm Tracking) ❌
**Status**: NOT IMPLEMENTED
**Impact**: HIGH - Roofing-specific value for targeting damaged areas

**Current State**:
- No weather data
- No storm tracking

**Required Features**:
- NOAA Storm Events API integration
- Hail size filtering (1.5"+)
- Storm date range filtering
- Overlay on territory map
- Historical storm data

**Implementation Priority**: Phase 3 Extension (Week 15)
**Estimated Time**: 3-5 days

---

### 7. Customer Survey & Review System ❌
**Status**: NOT IMPLEMENTED
**Impact**: HIGH - 170% more reviews (Enzy stat)

**Current State**:
- No survey capability
- No review capture

**Required Features**:
- QR code generation per rep/job
- SMS survey sending (Twilio)
- Review gating (4-5 stars → Google, 1-3 → internal)
- Google review deep linking
- Manager alerts for negative feedback

**Tables Needed**:
```sql
CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID REFERENCES projects(id),
  contact_id UUID REFERENCES contacts(id),
  qr_code_url TEXT,
  survey_link TEXT,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT,
  review_posted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Implementation Priority**: Phase 2 Extension (Week 9)
**Estimated Time**: 1 week

---

### 8. Tasks Management ❌
**Status**: NOT IMPLEMENTED
**Impact**: MEDIUM-HIGH - Team productivity

**Current State**:
- No task creation
- No assignments
- No due dates

**Required Features**:
- Task CRUD
- Assignee selection
- Due dates
- Priority levels
- Project/contact linking
- Status tracking (todo, in_progress, completed)

**Tables Needed**:
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID REFERENCES projects(id),
  contact_id UUID REFERENCES contacts(id),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  due_date DATE,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT CHECK (status IN ('todo', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

**Implementation Priority**: Phase 1 Extension (Week 5)
**Estimated Time**: 3-5 days

---

## 🟢 MEDIUM PRIORITY GAPS (Nice to Have)

### 9. Events/Calendar ❌
**Status**: NOT IMPLEMENTED
**Impact**: MEDIUM - Adjuster meeting coordination

**Required Features**:
- Appointment scheduling
- Calendar view
- Reminders/notifications
- Event types (appointment, inspection, meeting)
- Link to projects/contacts

**Implementation Priority**: Phase 2-3
**Estimated Time**: 1 week

---

### 10. Competition Creation UI ❌
**Status**: NOT IMPLEMENTED (but have gamification data)
**Impact**: MEDIUM - 27% sales increase (Enzy stat)

**Current State**:
- ✅ Have gamification_scores table
- ✅ Have leaderboard API
- ❌ No competition UI
- ❌ No start/end dates
- ❌ No prize tracking

**Required Features**:
- Competition CRUD interface
- Start/end dates
- KPI selection (knocks, sales, revenue)
- Individual vs team mode
- Prize specification
- Live leaderboard for competition

**Implementation Priority**: Phase 4 (after AI Voice)
**Estimated Time**: 1 week

---

### 11. Quote/Proposal System ❌
**Status**: NOT IMPLEMENTED
**Impact**: MEDIUM - E-signing explicitly requested

**Required Features**:
- Quote builder
- Line items
- Pricing calculations
- PDF generation
- E-signing integration (DocuSign/SignRequest)

**Implementation Priority**: Phase 5 (Financial)
**Estimated Time**: 2 weeks

---

### 12. Badges/Achievements ❌
**Status**: NOT IMPLEMENTED (partial gamification)
**Impact**: MEDIUM - Gamification enhancement

**Required Features**:
- Badge definitions
- Achievement unlocking
- Display on profiles
- Display on leaderboards

**Implementation Priority**: Phase 3
**Estimated Time**: 3-5 days

---

### 13. Internal Team Messaging ❌
**Status**: NOT IMPLEMENTED
**Impact**: MEDIUM - Team collaboration

**Required Features**:
- Direct messaging
- Group chats
- Project threads
- Announcement channels

**Implementation Priority**: Phase 2-3
**Estimated Time**: 1-2 weeks

---

## ⚪ LOW PRIORITY GAPS (Future Enhancements)

### 14. Digital Business Cards ❌
**Implementation Priority**: Phase 6+
**Estimated Time**: 3-5 days

### 15. Media Library (Training) ❌
**Implementation Priority**: Phase 6+
**Estimated Time**: 1 week

### 16. Custom Report Builder ❌
**Implementation Priority**: Phase 6+
**Estimated Time**: 2 weeks

### 17. Recruiting Module ❌
**Implementation Priority**: Phase 6+
**Estimated Time**: 2 weeks

### 18. Monitoring Bots (Enzy Assistant style) ❌
**Implementation Priority**: Phase 6+
**Estimated Time**: 1-2 weeks

### 19. Measurement Integration ❌
**Implementation Priority**: Phase 6+
**Estimated Time**: 1 week

---

## ⚠️ PARTIAL IMPLEMENTATIONS (Need Enhancement)

### Activities Table ⚠️
**Status**: Table exists but auto-tracking missing
**What's Missing**:
- Automatic change tracking
- Field-level change history
- Activity feed UI

### Custom Fields ⚠️
**Status**: JSONB column exists, no UI
**What's Missing**:
- Edit custom fields in UI
- Display custom fields properly
- Validation

### Financial Tracking ⚠️
**Status**: Basic fields exist
**What's Missing**:
- Detailed cost breakdown
- Budget vs actual
- Material costs tracking

---

## 📊 Implementation Roadmap

### Phase 1 Extension (Week 5) - ADD 1 WEEK
**Before Phase 2, implement**:
- ✅ Organizations table + CRUD UI (3-5 days)
- ✅ Tasks table + simple UI (3-5 days)
- ✅ Fix custom_fields display (1-2 days)

### Phase 2 Enhancement (Weeks 6-9) - ADD 1 WEEK
**Communication + Surveys**:
- ✅ Call logging with Twilio (3 days)
- ✅ Call recording storage (2 days)
- ✅ Customer survey system (5 days)
- ✅ SMS/Email (already planned)

### Phase 3 Major Enhancement (Weeks 10-15) - ADD 2 WEEKS
**Mobile PWA + Canvassing**:
- ✅ File upload system (5 days)
- ✅ Map-based canvassing (10 days)
- ✅ Territory management (3 days)
- ✅ Weather maps (3 days)
- ✅ Jobs/Production module (7 days)
- ✅ Offline photo queue (already planned)

### Phase 4 (Weeks 16-19) - NO CHANGE
**AI Voice Assistant** (already planned)

### Phase 5 Enhancement (Weeks 20-22) - ADD 1 WEEK
**Financial + Advanced**:
- ✅ Quote/Proposal builder (7 days)
- ✅ E-signing integration (3 days)
- ✅ QuickBooks API (already planned)
- ✅ Competition UI (5 days)

---

## 📈 Revised Timeline

**Original Estimate**: 16-18 weeks
**With Critical Gaps**: 22-24 weeks
**Original Baseline**: 22 weeks

**Breakdown**:
- Phase 0: Data Migration (1 week)
- Phase 1: Core CRM + Extensions (5 weeks) ← +1 week
- Phase 2: Communication + Surveys (5 weeks) ← +1 week
- Phase 3: Mobile PWA + Canvassing (6 weeks) ← +2 weeks
- Phase 4: AI Voice Assistant (4 weeks) ← no change
- Phase 5: Financial + Advanced (3 weeks) ← +1 week

**Total**: 24 weeks (vs 22 week baseline)

**With Claude Code v2 + Sonnet 4.5 Optimizations**: 20-22 weeks

---

## 💰 Value Justification

### Cost Savings (Annual):
- **Proline**: ~$100/month × 12 = $1,200/year
- **Enzy**: ~$30/user × 56 users × 12 = $20,160/year
- **Total Savings**: ~$21,360/year

### Additional Costs (Annual):
- **Google Maps API**: ~$3,000-6,000/year
- **Supabase Storage**: ~$600-1,200/year
- **Weather API**: Free (NOAA) or ~$1,200/year
- **Total New Costs**: ~$4,800-8,400/year

### Net Savings: ~$13,000-16,000/year

---

## 🎯 Critical Decision Points

### Decision 1: Full Enzy Replacement?
**Option A**: Build all canvassing features (recommended)
- Timeline: 22 weeks
- Result: Replace both systems
- Savings: $21K/year

**Option B**: Skip canvassing, keep using Enzy
- Timeline: 18 weeks (faster)
- Result: Replace Proline only
- Savings: $1.2K/year
- Risk: Ongoing Enzy costs, data sync issues

### Decision 2: File Migration Strategy?
**Option A**: Manual re-upload critical files
**Option B**: Proline API export (if available)
**Option C**: 6-month overlap period

### Decision 3: Jobs Module Approach?
**Option A**: Separate Jobs entity (recommended)
**Option B**: Enhanced Projects table
**Option C**: External job scheduling tool integration

---

## 📋 Next Steps

### Immediate (Tonight):
1. ✅ Create comprehensive gap analysis (this document)
2. ✅ Update Archon with findings
3. ✅ Start implementing most critical gaps

### This Week:
1. Implement Organizations table + CRUD
2. Implement Tasks table + simple UI
3. Design file upload system architecture
4. Design map canvassing UX

### Next Week:
1. Schedule client meeting to review gaps
2. Get approval for extended timeline
3. Prioritize features with client input
4. Begin Phase 1 extensions

---

**Status**: Ready for client discussion and implementation
**Compiled By**: Claude Code (Sonnet 4.5)
**Total Gaps Identified**: 19
**Critical Blockers**: 4
**High Priority**: 4
**Medium Priority**: 5
**Low Priority**: 6
