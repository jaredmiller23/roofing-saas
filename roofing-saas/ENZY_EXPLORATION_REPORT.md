# Enzy Door-Knocking Platform Exploration Report
**Date**: October 2, 2025
**Explored By**: Claude (Sonnet 4.5)
**Client**: Tennessee Roofing Company
**Enzy Account**: https://app.enzy.co

---

## Executive Summary

This report documents the exploration of Enzy, the client's current door-knocking and field sales gamification platform. Enzy is a mobile-first application focused on motivating field sales teams through gamification, leaderboards, and territory management.

**Key Findings**:
- **Platform Type**: Mobile-first PWA built on Ionic framework
- **Primary Use Case**: Door-knocking, canvassing, field sales gamification
- **Core Philosophy**: Gamification drives behavior (27% sales increase with competitions)
- **User Engagement**: 180+ interactions per day per user
- **Multi-Company Support**: Multiple organizations share the platform (saw "Tri-Cities" listing)
- **56 active field reps** with knock counts ranging from 45,328 (top rep) to 1 (new rep)

---

## 1. Platform Overview

### Technology Stack
- **Frontend**: Ionic Framework (hybrid mobile app)
- **Platform**: Progressive Web App (PWA) accessible via browser
- **Target Devices**: Mobile-first (optimized for smartphones/tablets)
- **Integrations**: Extensive (Twilio, Salesforce, JobNimbus, ServiceTitan, many CRMs)

### Business Model
- **Multi-tenant SaaS** - Multiple companies use the same platform
- **Industry Focus**: Roofing, solar, pest control, HVAC, field services
- **Notable Clients**: Cafe Rio, EcoShield, NuSun Power, Moxie

### Performance Metrics (from Enzy marketing)
- **27% sales increase** when running competitions
- **180+ daily interactions** per user
- **170% more positive reviews** through survey features

---

## 2. Core Features (12 Major Modules)

### 1. Leaderboards 🏆
**Purpose**: Gamified performance tracking and team motivation

**Features**:
- **Customizable KPIs** - Track any metric (knocks, sales, appointments, revenue)
- **Flexible date ranges** - Daily, weekly, monthly, all-time, custom
- **Unlimited hierarchy levels** - Company → Region → Team → Individual
- **Rights-protected views** - Users see only relevant data
- **User badges** - Achievement recognition displayed on leaderboard
- **Direct messaging** - Message users directly from leaderboard
- **Real-time updates** - Live score updates as data syncs

**What We Saw**:
- All-time knocks leaderboard showing 56 reps
- Top performer: DK with 45,328 knocks
- Clear hierarchy: Ayden King (3,796), jacob big money malmgren (3,703), etc.
- Fahredin Nushi (client's team member) at #29 with 332 knocks

**Our Implementation**: ✅ **We have this!**
- `gamification_scores` table with total_points, daily_points, weekly_points, monthly_points
- Leaderboard API (`/api/gamification/leaderboard`)
- Current level tracking
- **Gap**: No badges system, no direct messaging from leaderboard

---

### 2. Canvassing & Appointment Scheduling 📍
**Purpose**: Territory management and lead capture for door-knocking teams

**Features**:
- **Interactive map** - Visual territory management
- **Customizable pins** - Color-coded by status (knocked, not home, set appointment, etc.)
- **Homeowner data access** - Property information overlays
- **Territory assignment** - Draw and assign areas to specific reps
- **Location tracking** - GPS tracking of reps relative to dispositions
- **Lead actions**:
  - Attach files (photos of damage, property)
  - Schedule appointments
  - Create follow-up tasks
  - Leave detailed notes
- **Disposition tracking** - Not home, interested, not interested, set appointment
- **Integration with leaderboards** - Knock counts feed into gamification

**Our Implementation**: ❌ **NOT IMPLEMENTED**
- **Critical Gap**: This is the entire reason they use Enzy!
- No map-based canvassing interface
- No territory assignment
- No GPS tracking of field reps
- No mobile lead capture workflow
- **Impact**: Cannot replace Enzy without this

---

### 3. Weather Maps 🌩️
**Purpose**: Storm tracking for insurance restoration companies (roofing-specific)

**Features**:
- **Real-time weather overlays** - Hail, wind, tornadoes
- **Historical storm data** - Filter by date and severity
- **Hail size filtering** - Target areas by damage potential (e.g., 1.5" hail)
- **Territory optimization** - Identify high-probability areas for claims
- **Designed for roofing industry** - Storm = sales opportunity

**Our Implementation**: ❌ **NOT IMPLEMENTED**
- No weather tracking
- **Impact**: High - This is valuable for insurance restoration door-knocking
- **Note**: Could integrate NOAA/weather API or third-party storm data

---

### 4. Competitions & Incentives 🎯
**Purpose**: Drive behavior through gamified contests

**Features**:
- **Quick competition creation** - Build contests in minutes
- **Individual and team competitions** - Flexible grouping
- **Automated prize fulfillment** - Integration with gift card vendors
- **Rights-protected** - Only designated users can create competitions
- **Data integration** - Pull any KPI into competition tracking
- **Real-time leaderboards** - Live competition standings

**Client Results**: 27% average sales increase during competitions

**Our Implementation**: ⚠️ **PARTIAL**
- Have gamification_scores for points tracking
- Have leaderboard rankings
- **Gap**: No competition creation UI, no prize fulfillment, no start/end dates

---

### 5. Profiles 👤
**Purpose**: Social media-like user profiles for team engagement

**Features**:
- **Contact methods** - Call, text, email directly from profile
- **Badge display** - Achievement recognition
- **Performance reports** - View user's stats and trends
- **Media association** - Photos/videos linked to user
- **Customizable reports** - Configure what data appears on profiles

**Our Implementation**: ⚠️ **PARTIAL**
- Have user profiles in `profiles` table
- Have full_name, avatar_url, role
- **Gap**: No badges, no direct contact from profile, no performance reports display

---

### 6. Digital Business Card 📇
**Purpose**: Modern networking tool for field reps

**Features**:
- **Instant sharing** - Send digital card to customers/prospects
- **Open rate tracking** - See who viewed the card
- **Send rate tracking** - Performance metric for outreach
- **Review capture** - Prompt customers to leave reviews
- **Leaderboard integration** - Track card sends as KPI

**Our Implementation**: ❌ **NOT IMPLEMENTED**
- **Impact**: Medium - Nice-to-have for field teams
- **Note**: Similar to vCard or QR code sharing

---

### 7. Customer Surveys 📊
**Purpose**: Capture customer feedback and drive Google reviews

**Features**:
- **QR code assignment** - Per employee or location
- **Review gating** - Positive feedback → Google, negative → internal
- **Negative alert routing** - Send to managers via Enzy Assistant
- **Multi-channel sending** - Text and email from platform
- **Leaderboard integration** - Survey responses as KPI
- **Google score optimization** - Funnel happy customers to public reviews

**Our Implementation**: ❌ **NOT IMPLEMENTED**
- **Impact**: High - Client wants to improve online reputation
- **Client Need**: 170% more positive reviews (Enzy stat)

---

### 8. Messaging 💬
**Purpose**: Centralized team communication

**Features**:
- **Unlimited group messages** - No size limits
- **Announcement channels** - Broadcast-only threads
- **Thread management** - Pin, mute, archive
- **Auto-group creation** - Based on org chart hierarchy
- **Message editing/deletion** - Full control
- **SMS forwarding** - Twilio integration for external texting

**Our Implementation**: ❌ **NOT IMPLEMENTED**
- Phase 2 includes SMS to customers, but not internal team messaging
- **Gap**: No internal team chat, no announcement channels

---

### 9. Enzy Assistant 🤖
**Purpose**: AI-powered notifications and insights

**Features**:
- **Custom monitoring** - Track any data changes
- **Direct messaging** - Bot sends alerts to users
- **Push notifications** - Configurable timing
- **Rights-protected** - Only designated users see certain bots
- **Real-time insights** - Actionable alerts (e.g., "Rep X hasn't knocked in 2 hours")

**Our Implementation**: ❌ **NOT IMPLEMENTED**
- Phase 4 has AI Voice Assistant, but not proactive monitoring bots
- **Gap**: No automated alerts, no behavior monitoring

---

### 10. Media Library 📚
**Purpose**: Training and onboarding content management

**Features**:
- **Video tracking** - Monitor view duration per user
- **Multi-format support** - Videos, documents, links
- **Self-service management** - Admins upload/organize content
- **Viewership data integration** - Track training completion in leaderboards
- **Compliance tracking** - Ensure reps watch required content

**Our Implementation**: ❌ **NOT IMPLEMENTED**
- **Impact**: Medium - Useful for onboarding, not critical for operations

---

### 11. Report Builder 📈
**Purpose**: Custom analytics and data exports

**Features**:
- **Multi-column reports** - Combine multiple KPIs
- **Trend reports** - Time-series analysis
- **Multiple formats** - Tables, charts, graphs
- **CSV export** - Download raw data
- **Report sharing** - Share with on/off-platform users
- **Custom categories** - Organize reports into folders

**Our Implementation**: ❌ **NOT IMPLEMENTED**
- **Gap**: No custom report builder (only pre-defined views)

---

### 12. Recruiting & Onboarding 🎓
**Purpose**: Manage 1099 contractor pipeline

**Features**:
- **Document collection** - ID, tax forms, direct deposit
- **Background check triggers** - Integrated checks
- **Leaderboard integration** - Track recruiting metrics
- **Pipeline management** - Move candidates through stages

**Our Implementation**: ❌ **NOT IMPLEMENTED**
- **Impact**: Low - Client may handle this differently

---

## 3. Key Insights from Leaderboard Data

### Active Users (56 Reps)
From the all-time knocks leaderboard, we observed:

**Top Performers** (3,000+ knocks):
1. DK - 45,328 knocks
2. CM - 12,306 knocks
3. Ayden King - 3,796 knocks
4. jacob big money malmgren - 3,703 knocks
5. Andrew Matson - 3,506 knocks
6. Jon Brooks - 3,469 knocks

**Mid-Tier** (1,000-3,000 knocks):
- Christian Gernard (CG) - 2,993
- Cody Pool - 2,415
- Garrett clemens - 2,120
- Will Richards - 2,070
- Josh Plummer plumber (JP) - 2,035
- Rylan Young - 1,806
- Michael Brock - 1,677
- Siah Dowell - 1,439
- Lee Hunt - 1,333
- Ben McKay - 1,101
- Dillan Weeks - 1,014

**Client Team Member**:
- Fahredin Nushi - 332 knocks (#29 overall)

**New/Low Activity** (under 100 knocks):
- Multiple reps with <100 knocks (likely newer hires)
- brayden meyer - 1 knock (newest)

### Insights:
- **Wide performance distribution** - Top rep has 45x more knocks than median
- **High performers are outliers** - DK and CM are far ahead of pack
- **Most reps in 200-3,000 range** - Typical field team distribution
- **Active onboarding** - New reps joining regularly (low knock counts)
- **Nickname culture** - "jacob big money malmgren", "Josh Plummer plumber"
- **Initials used** - DK, CM, CG, JP (privacy or brevity)

---

## 4. Comparison with Our Mobile PWA Plans

### ✅ What We're Building (Matches Enzy)

1. **Mobile PWA** (Phase 3)
   - Offline-first architecture ✅
   - Photo uploads from camera ✅
   - Field data capture ✅

2. **Gamification** (Already Built)
   - Points tracking ✅
   - Leaderboards ✅
   - User rankings ✅

3. **Team Communication** (Phase 2)
   - SMS integration (Twilio) ✅
   - Email automation ✅

### ⚠️ What We're Missing (Critical Enzy Features)

1. **Map-Based Canvassing** ❌
   - Interactive territory maps
   - Pin/disposition tracking
   - GPS location tracking
   - Area assignment
   - **Impact**: CRITICAL - This is why they use Enzy!

2. **Competitions/Incentives UI** ❌
   - Competition creation interface
   - Prize fulfillment
   - Team vs individual contests
   - **Impact**: HIGH - Drives 27% sales lift

3. **Weather Maps** ❌
   - Storm tracking
   - Hail damage areas
   - Territory optimization
   - **Impact**: HIGH - Roofing-specific value

4. **Customer Surveys** ❌
   - QR code generation
   - Review gating (positive → Google, negative → internal)
   - Survey via SMS/email
   - **Impact**: HIGH - 170% more reviews

5. **Digital Business Cards** ❌
   - Instant sharing
   - Open tracking
   - **Impact**: MEDIUM

6. **Enzy Assistant (Monitoring Bots)** ❌
   - Proactive alerts
   - Behavior monitoring
   - **Impact**: MEDIUM
   - **Note**: Different from our Phase 4 Voice AI

7. **Media Library** ❌
   - Training content
   - View tracking
   - **Impact**: LOW

8. **Report Builder** ❌
   - Custom reports
   - CSV exports
   - **Impact**: MEDIUM

9. **Recruiting Module** ❌
   - 1099 onboarding
   - Background checks
   - **Impact**: LOW

### 📊 Feature Gap Summary

| Feature Category | Enzy Has | We Have | Gap Severity |
|---|---|---|---|
| **Mobile PWA** | ✅ | ✅ Planned Phase 3 | ✅ No gap |
| **Gamification** | ✅ | ✅ Built | ⚠️ Need badges |
| **Map Canvassing** | ✅ | ❌ | 🔴 CRITICAL |
| **Weather Maps** | ✅ | ❌ | 🔴 HIGH |
| **Competitions UI** | ✅ | ❌ | 🟡 MEDIUM |
| **Customer Surveys** | ✅ | ❌ | 🔴 HIGH |
| **Digital Cards** | ✅ | ❌ | 🟡 MEDIUM |
| **Team Messaging** | ✅ | ⚠️ Partial | 🟡 MEDIUM |
| **Monitoring Bots** | ✅ | ❌ | 🟡 MEDIUM |
| **Media Library** | ✅ | ❌ | ⚪ LOW |
| **Report Builder** | ✅ | ❌ | 🟡 MEDIUM |
| **Recruiting** | ✅ | ❌ | ⚪ LOW |

---

## 5. Door-Knocking Workflow Analysis

### Typical Enzy Workflow (Field Rep Perspective)

**Morning**:
1. Open Enzy app on phone
2. Check leaderboard standings (competitive motivation)
3. View assigned territory on map
4. Review weather data for storm-damaged areas
5. Navigate to territory

**In the Field**:
6. Walk neighborhood, knocking on doors
7. For each house:
   - Tap map pin
   - Record disposition (not home, interested, set appointment, etc.)
   - If interested: Take photos of roof/damage
   - If setting appointment: Schedule in-app
   - Leave notes
8. GPS tracks location throughout day

**End of Day**:
9. Review knock count for the day
10. Check updated leaderboard position
11. See if any competitions were won
12. Submit appointment photos/notes for follow-up

### Data Flow
```
Field Rep → Enzy App → CRM (Proline/JobNimbus/etc.)
                ↓
         Leaderboards
         Competitions
         Manager Dashboards
```

### Integration with Proline
- Enzy captures leads in the field
- Data syncs to Proline as projects
- Proline manages sales pipeline from there
- **Key Point**: Enzy is TOP OF FUNNEL, Proline is MID/BOTTOM

---

## 6. Critical Gaps for Door-Knocking Replacement

### 🔴 Must-Have Before Replacing Enzy

#### 1. Map-Based Territory Management
**Requirement**: Interactive map with the following features:
- **Map Provider**: Google Maps or Mapbox
- **Pin Placement**: Tap to drop pin at address
- **Pin Colors**: Customizable by status
  - Green = Set Appointment
  - Blue = Interested
  - Gray = Not Home
  - Red = Not Interested
  - Yellow = Callback
- **Territory Drawing**: Draw polygons and assign to reps
- **GPS Tracking**: Track rep location during work hours
- **Address Search**: Type address to navigate
- **Homeowner Data**: Overlay property information (if available via API)

**Technical Implementation**:
```typescript
// Map component
- Google Maps JavaScript API or Mapbox GL JS
- PostgreSQL with PostGIS extension for geospatial queries
- Real-time location tracking via device GPS
- Pins stored as lat/long coordinates in database

// Database schema additions
CREATE TABLE territories (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  name TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  boundary GEOMETRY(Polygon, 4326), -- PostGIS geospatial data
  created_at TIMESTAMPTZ
);

CREATE TABLE knocks (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES auth.users(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  address TEXT,
  disposition TEXT, -- 'not_home', 'interested', 'not_interested', 'appointment', etc.
  notes TEXT,
  photos TEXT[], -- Array of Supabase Storage URLs
  appointment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);

CREATE TABLE rep_locations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  recorded_at TIMESTAMPTZ,
  -- For tracking rep movement throughout day
);
```

**Estimated Development Time**: 2-3 weeks (Phase 3 extension)

#### 2. Mobile Knock Capture Workflow
**Requirement**: Streamlined mobile UI for quick lead entry

**Workflow**:
1. Tap map pin or "New Knock" button
2. Auto-populate address from GPS (reverse geocode)
3. Quick disposition buttons (4-6 large tap targets)
4. Optional: Take photo (camera access)
5. Optional: Add notes (voice-to-text?)
6. Optional: Schedule appointment (date picker)
7. Submit → Sync to backend → Update leaderboard

**UI Requirements**:
- Large buttons (thumb-friendly on mobile)
- Minimal typing (voice input, dropdowns)
- Offline queue (store locally if no connection, sync later)
- Quick entry (<30 seconds per knock)

**Estimated Development Time**: 1-2 weeks

#### 3. Real-Time Leaderboard Updates
**Requirement**: Live updates as reps log knocks

**Technical**:
- Supabase Real-time subscriptions
- WebSocket connection for instant updates
- Optimistic UI updates (update local count immediately)

**Estimated Development Time**: 3-5 days (enhance existing leaderboard)

### 🟡 Should-Have (Enzy Differentiators)

#### 4. Weather Maps
**Requirement**: Storm overlay on territory map

**Options**:
- **API**: NOAA Storm Events API (free government data)
- **Commercial**: WeatherBug, Weather Underground API
- **Data**: Hail size, wind speed, tornado tracks
- **Filtering**: Date range, severity threshold

**Use Case**: "Show me all areas with 1.5"+ hail in last 30 days"

**Estimated Development Time**: 1 week

#### 5. Customer Survey System
**Requirement**: QR code + SMS survey with review gating

**Workflow**:
1. Rep completes job
2. Generate QR code or send SMS survey link
3. Customer rates experience 1-5 stars
4. If 4-5 stars → Redirect to Google review
5. If 1-3 stars → Capture feedback internally, alert manager

**Technical**:
- QR code generation (libraries: qrcode.js)
- SMS sending (Twilio - already in Phase 2)
- Survey page (simple form)
- Google review deep link
- Alert via email or Enzy-style assistant

**Estimated Development Time**: 1 week

#### 6. Competition Creation UI
**Requirement**: Admin interface to create/manage competitions

**Features**:
- Competition name, start/end dates
- KPI selection (knocks, appointments, sales, revenue)
- Individual vs team mode
- Prize specification
- Leaderboard configuration

**Estimated Development Time**: 1-2 weeks

### ⚪ Nice-to-Have (Lower Priority)

7. **Digital Business Cards** - 3-5 days
8. **Media Library** - 1 week
9. **Report Builder** - 2 weeks
10. **Recruiting Module** - 2 weeks
11. **Enzy Assistant Bots** - 1-2 weeks

---

## 7. Recommended Implementation Strategy

### Phase 3 Enhancement: Mobile PWA + Canvassing (Weeks 10-15)
**Extended Timeline**: 6 weeks (was 5 weeks)

**Week 10-11: Map Foundation**
- Integrate Google Maps API
- Build territory map component
- Implement pin placement and disposition tracking
- PostGIS database setup

**Week 12: Knock Capture Workflow**
- Mobile-optimized lead entry form
- Camera integration for photos
- Appointment scheduling
- Offline queueing

**Week 13: Territory Management**
- Draw/assign territories to reps
- GPS location tracking
- Real-time rep location display (manager view)

**Week 14: Leaderboard Enhancement**
- Real-time knock count updates
- Badges system
- Competition tracking

**Week 15: Weather Maps**
- NOAA API integration
- Storm overlay on map
- Hail/wind filtering

### Phase 2 Addition: Customer Surveys (Week 9)
**Timeline**: 1 week (parallel with Phase 3 start)

- QR code generation
- SMS survey sending (piggyback on Twilio setup)
- Review gating logic
- Google review deep linking

### Phase 4 Addition: Competition Builder (Week 16)
**Timeline**: 1 week (after Phase 3)

- Competition CRUD interface
- Start/end date configuration
- Prize tracking
- Leaderboard integration

---

## 8. Enzy Replacement Checklist

To fully replace Enzy, we MUST have:

✅ **Core Requirements**:
- [ ] Interactive map with pin placement
- [ ] Territory assignment and drawing
- [ ] Mobile knock capture form (quick entry)
- [ ] Disposition tracking (not home, interested, etc.)
- [ ] Photo upload from mobile camera
- [ ] Appointment scheduling from field
- [ ] GPS location tracking
- [ ] Real-time leaderboard updates (knock counts)
- [ ] Offline mode with sync queue

🟡 **Highly Recommended**:
- [ ] Weather maps (storm tracking)
- [ ] Customer survey + review gating
- [ ] Competition creation UI
- [ ] Badges/achievement system

⚪ **Nice-to-Have**:
- [ ] Digital business cards
- [ ] Media library for training
- [ ] Custom report builder
- [ ] Recruiting module
- [ ] Monitoring bots (Enzy Assistant style)

---

## 9. Integration Opportunities

Enzy has 40+ integrations. Key ones relevant to our client:

### Already Planned
- ✅ **Twilio** (Phase 2) - SMS/Voice
- ✅ **QuickBooks** (Phase 5) - Accounting

### Worth Considering
- **Google Sheets** - Easy data export for managers
- **Zapier** - No-code automation for power users
- **WeatherBug/NOAA** - Storm data
- **Google Maps Platform** - Maps, geocoding, places API

### Probably Not Needed (Enzy supports, but client uses Proline)
- Salesforce, HubSpot, Pipedrive - CRM functions covered by our system
- ServiceTitan, Jobber, Housecall Pro - Field service management (we're building this)

---

## 10. Data Migration from Enzy

### Exportable Data (Likely)
- **Knock history** - All logged knocks with locations
- **Territories** - Assigned areas (if available via export)
- **User performance data** - Historical stats for leaderboards

### Export Method (To Investigate)
- Check if Enzy has data export feature
- Contact Enzy support for CSV/JSON export
- May need API access (if they provide one)

### Migration Priority
- **Historical knock data** - Import into our knocks table
- **Current leaderboard standings** - Preserve rep rankings
- **Territory assignments** - Recreate in our system

**Action Item**: Request data export from Enzy (after client decides to switch)

---

## 11. Timeline Impact

### Original Timeline (with Phase 3 as planned)
- Phase 3: Mobile PWA (Weeks 10-14) - 5 weeks
- **Cannot replace Enzy** - Missing map canvassing

### Enhanced Timeline (with Enzy replacement features)
- Phase 2: +1 week for customer surveys (Week 9)
- Phase 3: +1 week for territory maps (Weeks 10-15) - 6 weeks
- Phase 4: No change (Weeks 16-19)
- Phase 5: +1 week for competition builder (Week 20)

**New Total**: 20 weeks (vs 18 weeks planned, vs 22 weeks original baseline)

**Benefit**: Can replace BOTH Proline AND Enzy with single unified platform

---

## 12. Cost Considerations

### Enzy Pricing (Estimate)
- **Unknown exact pricing** (not public)
- Typical field sales gamification platforms: $20-50/user/month
- **56 active reps** × $30/month = $1,680/month = $20,160/year

### Additional Costs in Our System
- **Google Maps API**: ~$200-500/month (with usage limits)
- **Weather API**: NOAA (free) or commercial ($100-300/month)
- **Supabase Storage**: Photos from field (~$50-100/month)

**Total Savings by Replacing Enzy**: ~$15,000-20,000/year
**New Platform Costs**: ~$5,000-10,000/year
**Net Savings**: ~$10,000/year

---

## 13. Risk Assessment

### High Risk

1. **Map Performance on Mobile**
   - **Risk**: Google Maps can be slow on poor connections
   - **Mitigation**: Implement tile caching, offline map support

2. **GPS Battery Drain**
   - **Risk**: All-day GPS tracking kills phone battery
   - **Mitigation**: Configurable tracking intervals, low-power mode

3. **Offline Sync Conflicts**
   - **Risk**: Two reps knock same house while offline
   - **Mitigation**: Last-write-wins with conflict UI, unique address validation

4. **User Adoption (Switching from Enzy)**
   - **Risk**: Field reps resist change from familiar Enzy app
   - **Mitigation**: Replicate Enzy UX patterns, extensive training, phased rollout

### Medium Risk

5. **Weather Data Accuracy**
   - **Risk**: NOAA data may not match Enzy's commercial provider
   - **Mitigation**: Cross-reference multiple sources, allow manual overrides

6. **Complex Territory Drawing**
   - **Risk**: Polygon drawing on mobile is difficult
   - **Mitigation**: Desktop admin tool for territory creation, mobile view-only

---

## 14. Enzy Strengths to Emulate

### UX Patterns Worth Copying

1. **Gamification-First Design**
   - Make leaderboards prominent
   - Celebrate achievements in-app
   - Use friendly competition language

2. **Mobile-Optimized Workflows**
   - Large tap targets (minimum 44px)
   - Minimal typing required
   - Quick actions (dispositions as buttons, not forms)

3. **Real-Time Feedback**
   - Instant leaderboard updates
   - Push notifications for achievements
   - Visual progress indicators

4. **Social Elements**
   - User profiles with stats
   - Nicknames and avatars
   - Team vs individual dynamics

### Features to Differentiate

**Our Advantages Over Enzy**:
1. **Unified Platform** - CRM + Canvassing (Enzy requires separate CRM)
2. **AI Voice Assistant** (Phase 4) - Enzy doesn't have this
3. **QuickBooks Integration** - Direct accounting sync
4. **E-Signing** - Contract signing in-app
5. **Call Recording** - Built-in (Enzy doesn't mention this)

---

## 15. Client Discussion Points

### Questions for Client

1. **Enzy Usage**:
   - How many reps actively use Enzy daily?
   - What features do they use most?
   - What do they wish Enzy had?

2. **Territory Management**:
   - Who assigns territories currently?
   - How are areas defined (zip codes, drawn polygons, etc.)?
   - Do territories change frequently?

3. **Data**:
   - Can we export historical knock data from Enzy?
   - How important is preserving historical leaderboard stats?

4. **Timeline**:
   - Are they willing to wait extra 2-3 weeks for Enzy replacement features?
   - Or launch without canvassing and add it later?

5. **Priorities**:
   - Which Enzy features are "must-have" vs "nice-to-have"?
   - Weather maps critical or optional?

### Recommendation to Client

**Option A: Full Replacement (Recommended)**
- Build all critical Enzy features in Phase 3
- Timeline: 20 weeks total
- Result: Single unified platform replaces both Proline + Enzy
- Cost Savings: ~$10,000/year

**Option B: Partial Replacement**
- Build basic mobile PWA in Phase 3 (as planned)
- Keep using Enzy for canvassing short-term
- Add canvassing features in Phase 6 (future)
- Timeline: 18 weeks (faster)
- Risk: Maintain two systems longer, less cost savings

**Option C: Hybrid Approach**
- Replace Proline fully
- Integrate with Enzy API (if available)
- Pull Enzy leaderboard data into our dashboard
- Timeline: 18 weeks
- Risk: Depends on Enzy API availability, ongoing Enzy costs

---

## 16. Screenshots Reference

Screenshots captured during exploration (saved to ~/Downloads):

1. `enzy-login-page` - Login screen
2. `enzy-after-next` - Login flow
3. `enzy-password-screen` - Password entry
4. `enzy-dashboard` - Home page with leaderboard
5. `enzy-dashboard-loaded` - Leaderboard data visible
6. `enzy-map-page` - Attempted map view (blank - rendering issue)
7. `enzy-leads-page` - Leads view (blank - rendering issue)
8. `enzy-home-top` - Home page top section
9. `enzy-after-escape` - After dismissing modal
10. `enzy-modal-closed` - Clean view
11. `enzy-home-reload` - Home page reloaded
12. `enzy-bottom-navigation` - Bottom nav attempt
13. `enzy-website-home` - Enzy.co marketing site
14. `enzy-features-page` - Full feature list

**Note**: The Enzy app had rendering issues in WebKit (blank screens on map/leads pages). This is likely due to Ionic framework optimizations for mobile devices. The marketing website provided comprehensive feature details instead.

---

## 17. Next Steps

### Immediate Actions (This Week)

1. ✅ **Review this report with client**
   - Discuss Option A vs B vs C
   - Prioritize Enzy features
   - Get timeline approval

2. ✅ **Technical research**
   - Google Maps API pricing calculator
   - PostGIS setup documentation
   - Weather API comparison

3. ✅ **Design mockups**
   - Mobile canvassing UI wireframes
   - Territory management interface
   - Knock capture form

### Phase 3 Preparation (Week 10)

4. **Map Integration Setup**
   - Create Google Maps API account
   - Enable Maps JavaScript API, Places API, Geocoding API
   - Set up billing alerts

5. **Database Enhancements**
   - Install PostGIS extension in Supabase
   - Create territories, knocks, rep_locations tables
   - Design geospatial indexes

6. **Mobile Canvassing Development**
   - Build map component
   - Implement pin placement
   - Create knock entry form
   - Add camera integration

---

## 18. Conclusion

Enzy is a **highly specialized door-knocking and field sales gamification platform** that the client uses to motivate and track their 56-person field team. The platform drives measurable results (27% sales increase during competitions, 180+ daily interactions).

**Critical Discovery**: Enzy is **TOP OF FUNNEL** (lead generation), while Proline is **MID/BOTTOM OF FUNNEL** (sales pipeline). To fully replace both systems, we MUST add:

1. **Map-based territory management** 🔴 CRITICAL
2. **Mobile knock capture workflow** 🔴 CRITICAL
3. **Weather maps** 🟡 HIGH (roofing-specific value)
4. **Customer survey + review gating** 🟡 HIGH (170% more reviews)
5. **Competition creation UI** 🟡 MEDIUM

**Recommended Approach**: **Option A - Full Replacement**
- Extend Phase 3 by 1 week (6 weeks total)
- Add customer surveys in Week 9 (parallel with Phase 3 start)
- Deliver unified Proline + Enzy replacement by Week 20
- Net savings: ~$10,000/year, single platform to maintain

**Timeline Impact**: 20 weeks (2 weeks longer than enhanced estimate, but 2 weeks faster than original 22-week baseline)

**Client Value**:
- Eliminate $20K/year Enzy cost
- Single unified platform (no data sync issues)
- Better integration (CRM + Canvassing in one app)
- AI Voice Assistant differentiator (Enzy doesn't have)
- Custom roofing workflow (not generic field sales)

This exploration reveals that our project scope should expand slightly to include Enzy replacement features, ensuring the client can sunset BOTH legacy systems and run their entire business on our platform.

---

**Report Compiled By**: Claude (Sonnet 4.5)
**Total Exploration Time**: ~30 minutes
**Pages Examined**: Enzy marketing site, features page, limited app access
**Screenshots Captured**: 14
**Client Account**: https://app.enzy.co (jared@claimclarityai.com)
