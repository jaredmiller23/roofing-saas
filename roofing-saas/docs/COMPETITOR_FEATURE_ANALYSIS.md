# Competitor Feature Analysis: ProLine vs Enzy vs Roofing SaaS

**Analysis Date:** December 10, 2025
**Updated:** December 10, 2025 (Hands-on exploration of actual apps)
**Purpose:** Identify feature gaps and opportunities for the Roofing SaaS platform

## Executive Summary

This analysis compares our Roofing SaaS platform against two key competitors:
- **ProLine** - CRM focused on sales, quoting, and communication automation ($497-$1,697/mo)
- **Enzy** - Performance management and door-knocking/canvassing platform (v5.2.4)

Our platform is designed to replace BOTH systems with a single unified solution.

---

## Hands-On Exploration Summary (December 10, 2025)

### ProLine - Key Observations

**Technology Stack:** Built on Bubble.io (no-code platform)

**Dashboard Features:**
- 10 dashboard tabs: Overview, Usage, Leaderboard, Marketing, Sales, Production, Cash Flow, Billing, Profitability, Activity, Map
- Real-time payment chart showing $189,478.29 over date range
- Activity feed with team messages

**Boards/Pipeline:**
- Kanban-style pipeline with colored stage pills
- Stages: SALES INSURANCE (1301), PRODUCTION (41), BILLING (26), CLOSED (91), OLD RECRUITING (102)
- Sub-columns: NEW LEADS (1041), REHASH (18), NO DAMAGE (13)
- Contact cards show: Initial avatar, Name, Address, Days-in-stage counter
- Quick action menu on hover: Call, Message, Details, Project Tasks, Activity, Directions, Campaigns, Move to Stage

**Project Detail View:**
- **Customer Portal URL** - Unique shareable link for each project (e.g., proline.app/project/wyaz3sh72jwv)
- **Role-based assignees**: Assignee, Inside Sales, Production, Accounting
- **Insurance-specific fields**: Adjuster, Alternate Contact
- **8 detail tabs**: Activity, Events, Files, Tasks, Measure, Quote, Order, Jobs, Billing, Budget
- Activity feed showing all changes with timestamps

**Tasks:**
- Checkbox-based task list with due dates (red when overdue)
- Task types: "Prep For PA", "Upload SOL, Photos, Verify Check", "Follow up 1 call/1text"
- @Mentions create tasks automatically

**Communication:**
- SMS tab (13 unread) with conversation threads
- Chat (Beta) for internal team messaging
- Calls tab with voicemail count (54 voicemails)
- Call log shows direction indicators and timestamps

**Team Management:**
- Organization: "APPALACHIAN STORM RESTORATION"
- 11 team members with individual phone numbers
- User roles: Full users vs "Limited User"

### Enzy - Key Observations

**App Version:** 5.2.4

**Leaderboard:**
- Weekly metrics with team comparison (DK: 116 vs CM: 32)
- Individual rankings with knock counts (jacob big money malmgren: 62)
- Filters: Week to Date, Knocks, Rep

**Messages:**
- Automated reports: Personal Bests, Birthdays, Flight Risk, Personal Firsts
- Team/company chat threads
- Unread indicators and notification mute options

**Leads Management:**
- **4 view modes**: Map, Leads (table), Card (kanban), Calendar
- **Setter/Closer tracking**: Who set appointment vs who closes the deal
- **Team assignment**: Team Tri City, Team Louisville
- **Lead statuses**: IRA Signed, Contracted, Appointment Scheduled
- **Revenue tracking**: Per-lead revenue ($19,400 shown)
- **Satisfaction checkbox**: Track customer satisfaction

**Map View:**
- Full Google Maps integration
- Lead pins with color coding
- Draw, Filter, Navigation tools
- "Load this view" for saved map views

**Menu/Settings:**
- Library (training resources)
- Reports (analytics)
- Profile (user settings)
- Admin (management panel)
- Survey (customer surveys)
- External Links (integrations)
- Recruit (hiring tools)

### Key Integration Point
Both ProLine and Enzy share customer data - "Monika Banks" (14005 Petwood Blvd, Louisville, KY 40272) appeared in both systems, showing they're used together for the same roofing company.

---

## Feature Comparison Matrix

### Legend
- ✅ = Implemented
- 🔨 = Partially Implemented / In Progress
- ❌ = Not Implemented (Gap)
- ⚡ = Our Advantage (Better than competitor)

---

## 1. CRM & Contact Management

| Feature | ProLine | Enzy | Roofing SaaS | Notes |
|---------|---------|------|--------------|-------|
| Contact Database | ✅ | ✅ | ✅ | Full contact management |
| Company/Organization Linking | ✅ | ❌ | ✅ | Multi-tenant ready |
| Contact Import (CSV) | ✅ | ✅ | 🔨 | Need bulk import UI |
| Lead Source Tracking | ✅ | ✅ | ✅ | Built into pipeline |
| Contact Activity Timeline | ✅ | ✅ | ✅ | Activity feed |
| Duplicate Detection | ✅ | ❌ | ❌ | **GAP** |
| Custom Fields | ✅ | ✅ | ✅ | JSON custom_fields |

---

## 2. Pipeline & Sales Management

| Feature | ProLine | Enzy | Roofing SaaS | Notes |
|---------|---------|------|--------------|-------|
| Pipeline Kanban Board | ✅ | ❌ | ✅ ⚡ | 8-stage pipeline with filters |
| Drag & Drop Stage Changes | ✅ | ❌ | ✅ | DnD-kit implementation |
| Pipeline Stage Customization | ✅ | ❌ | 🔨 | Settings exist, need full UI |
| Deal/Project Value Tracking | ✅ | ❌ | ✅ | estimated_value, approved_value |
| Lead Scoring | ✅ | ❌ | ✅ | Automatic scoring |
| Win/Loss Tracking | ✅ | ❌ | ✅ | Won/Lost stages + reactivate |
| Stage Transition Automation | ✅ | ❌ | ✅ | Start Production, Job Complete |
| Pipeline Value Summary | ✅ | ❌ | ✅ | Total opportunities display |

---

## 3. Quoting & Proposals

| Feature | ProLine | Enzy | Roofing SaaS | Notes |
|---------|---------|------|--------------|-------|
| Multi-Option Quotes | ✅ | ❌ | ❌ | **MAJOR GAP** |
| Quote Templates | ✅ | ❌ | ❌ | **MAJOR GAP** |
| Quote Generation | ✅ | ❌ | ❌ | **MAJOR GAP** |
| Send Quote via SMS/Email | ✅ | ❌ | 🔨 | Can send links manually |
| Digital Signature on Quotes | ✅ | ❌ | ✅ | E-signature system |
| Quote-to-Job Conversion | ✅ | ❌ | 🔨 | Pipeline to Production workflow |
| Material/Labor Line Items | ✅ | ❌ | ❌ | **GAP** - need line item support |
| Price Book | ✅ | ❌ | ❌ | **GAP** |
| Aerial Measurement Integration | ❌ (EagleView only) | ❌ | ❌ | Could integrate EagleView |

---

## 4. Communication

| Feature | ProLine | Enzy | Roofing SaaS | Notes |
|---------|---------|------|--------------|-------|
| SMS Messaging | ✅ | ✅ (via Twilio) | ✅ | Twilio integration |
| Email Messaging | ✅ | ❌ | ✅ | Resend integration |
| Virtual Phone Numbers | ✅ | ❌ | ❌ | **GAP** - using single Twilio # |
| Call Recording | ✅ | ❌ | ✅ | Call logs with recordings |
| Unlimited Calling | ✅ | ❌ | 🔨 | Twilio metered |
| SMS/Email Templates | ✅ | ❌ | ✅ | Template settings |
| Speed-to-Lead Automation | ✅ | ❌ | ❌ | **GAP** - instant lead response |
| Automated Follow-up Sequences | ✅ | ❌ | 🔨 | Campaign builder exists |
| Two-Way SMS | ✅ | ❌ | ✅ | Webhook handlers |

---

## 5. Scheduling & Calendar

| Feature | ProLine | Enzy | Roofing SaaS | Notes |
|---------|---------|------|--------------|-------|
| Calendar View | ✅ | ✅ | ✅ | Standard + Google Calendar |
| Appointment Scheduling | ✅ | ✅ | ✅ | Events system |
| Daily/Dispatch View | ✅ | ❌ | ❌ | **GAP** - need dispatch board |
| Sales Calendar | ✅ | ❌ | ✅ | Events by type |
| Production Calendar | ✅ | ❌ | 🔨 | Jobs have dates |
| Booking Pages | ✅ | ❌ | ❌ | **GAP** - public booking links |

---

## 6. Payments & Invoicing

| Feature | ProLine | Enzy | Roofing SaaS | Notes |
|---------|---------|------|--------------|-------|
| Invoice Generation | ✅ | ❌ | ❌ | **MAJOR GAP** |
| Invoice Templates | ✅ | ❌ | ❌ | **GAP** |
| Payment Processing | ✅ | ❌ | ❌ | **MAJOR GAP** (card/ACH) |
| Payment Tracking | ✅ | ❌ | 🔨 | Job has payment fields |
| QuickBooks Integration | ✅ | ❌ | 🔨 | OAuth setup, need sync |
| Expense Tracking | ✅ | ❌ | 🔨 | Job costing page |
| Profit/Loss Reports | ✅ | ❌ | ✅ | Financial reports page |

---

## 7. Production & Job Management

| Feature | ProLine | Enzy | Roofing SaaS | Notes |
|---------|---------|------|--------------|-------|
| Job/Work Orders | ✅ | ❌ | ✅ | Jobs system |
| Material Orders | ✅ | ❌ | ❌ | **GAP** |
| Job Costing | ✅ | ❌ | ✅ | Project costing page |
| Crew Assignment | ✅ | ❌ | 🔨 | Assignee field exists |
| Job Status Workflow | ✅ | ❌ | ✅ | Status → Pipeline automation |
| Photo Documentation | ✅ | ✅ | ✅ | Photo manager |
| Progress Tracking | ✅ | ❌ | ✅ | completion_percentage |

---

## 8. Door Knocking & Canvassing (Enzy's Strength)

| Feature | ProLine | Enzy | Roofing SaaS | Notes |
|---------|---------|------|--------------|-------|
| Territory Management | ❌ | ✅ | ✅ ⚡ | Polygon territories |
| Map-Based Canvassing | ❌ | ✅ | ✅ ⚡ | House pin dropper |
| Knock Logging | ❌ | ✅ | ✅ ⚡ | Outcome tracking |
| GPS/Location Tracking | ❌ | ✅ | ✅ | Geolocation on knocks |
| Door-to-Door Route Planning | ❌ | ✅ | ❌ | **GAP** |
| Storm/Weather Maps | ❌ | ✅ | ✅ ⚡ | Storm targeting with hail data |
| Hail Size Filtering | ❌ | ✅ | ✅ | NOAA integration |
| Storm Date Filtering | ❌ | ✅ | ✅ | Date range filters |

---

## 9. Gamification & Team Management (Enzy's Strength)

| Feature | ProLine | Enzy | Roofing SaaS | Notes |
|---------|---------|------|--------------|-------|
| Leaderboards | ❌ | ✅ | ✅ | Points-based |
| Achievements/Badges | ❌ | ✅ | ✅ | Achievement system |
| Points System | ❌ | ✅ | ✅ | Gamification module |
| Competitions/Incentives | ❌ | ✅ | ✅ | Incentives page |
| Weekly Challenges | ❌ | ✅ | ✅ | Widget on dashboard |
| User Profiles | ❌ | ✅ | ✅ | Profile settings |
| Team Messaging | ❌ | ✅ | ❌ | **GAP** - internal chat |
| Digital Business Cards | ❌ | ✅ | ✅ | My Card settings |

---

## 10. AI & Automation

| Feature | ProLine | Enzy | Roofing SaaS | Notes |
|---------|---------|------|--------------|-------|
| AI Voice Agent (Inbound) | ✅ ($797+) | ❌ | ✅ ⚡ | ElevenLabs integration |
| AI Voice Agent (Outbound) | ✅ ($797+) | ❌ | 🔨 | Can extend |
| AI Call Summaries | ✅ ($797+) | ❌ | ❌ | **GAP** |
| AI Call Scoring | ✅ ($797+) | ❌ | ❌ | **GAP** |
| AI Assistant Chatbot | ❌ | ✅ | ✅ | AI Assistant bar |
| Automation Engine | ✅ | ❌ | 🔨 | Campaign automations |
| Zapier Integration | ✅ | ❌ | ❌ | **GAP** |

---

## 11. Reporting & Analytics

| Feature | ProLine | Enzy | Roofing SaaS | Notes |
|---------|---------|------|--------------|-------|
| Dashboard Metrics | ✅ | ✅ | ✅ | Dashboard page |
| Sales Reports | ✅ | ✅ | ✅ | Financial reports |
| Pipeline Reports | ✅ | ❌ | ✅ | Built into pipeline |
| Custom Report Builder | ✅ | ✅ | ❌ | **GAP** |
| CSV Export | ✅ | ✅ | 🔨 | Some tables have export |
| Commission Reports | ✅ | ❌ | ✅ | Commissions page |

---

## 12. Mobile & Field Tools

| Feature | ProLine | Enzy | Roofing SaaS | Notes |
|---------|---------|------|--------------|-------|
| Native iOS App | ✅ | ✅ | 🔨 | PWA (works but not App Store) |
| Native Android App | ✅ | ✅ | 🔨 | PWA |
| PWA Support | ✅ | ✅ | ✅ ⚡ | Full offline support |
| Offline Mode | ✅ | ✅ | ✅ ⚡ | Dexie.js sync |
| Photo Capture | ✅ | ✅ | ✅ | Camera integration |
| GPS Tracking | ✅ | ✅ | ✅ | Geolocation |

---

## 13. Review Generation

| Feature | ProLine | Enzy | Roofing SaaS | Notes |
|---------|---------|------|--------------|-------|
| Review Requests | ✅ | ✅ | ❌ | **GAP** |
| Customer Surveys | ❌ | ✅ | 🔨 | Survey infrastructure exists |
| Review Gating | ❌ | ✅ | ❌ | **GAP** - route by sentiment |
| Google Review Link | ✅ | ✅ | ❌ | **GAP** |

---

## 14. Recruiting & Onboarding (Enzy Unique)

| Feature | ProLine | Enzy | Roofing SaaS | Notes |
|---------|---------|------|--------------|-------|
| 1099 Onboarding | ❌ | ✅ | ❌ | Not planned |
| Background Checks | ❌ | ✅ | ❌ | Not planned |
| Document Collection | ❌ | ✅ | ❌ | Not planned |
| Training Videos | ❌ | ✅ | ❌ | Could add media library |

---

## Priority Feature Gaps

### Critical (Must Have) - Revenue Impact

1. **Quote/Proposal System** ❌
   - Multi-option quote builder
   - Quote templates
   - Line items (materials, labor)
   - Send via SMS/Email with e-signature
   - *ProLine's core value proposition*

2. **Invoice & Payments** ❌
   - Invoice generation from quotes/jobs
   - Payment processing (Stripe)
   - Payment tracking
   - ACH support

3. **Speed-to-Lead Automation** ❌
   - Instant response to new leads
   - Auto-assignment
   - First-touch automation

### High Priority - Competitive Parity

4. **Virtual Phone Numbers** ❌
   - Per-user phone numbers
   - Route calls properly
   - Currently single Twilio number

5. **AI Call Summaries** ❌
   - Transcribe and summarize calls
   - ProLine offers this at $797/mo tier

6. **Review Generation** ❌
   - Automated review requests
   - Google review integration
   - Follow up on satisfied customers

7. **Dispatch Board View** ❌
   - Daily job dispatch calendar
   - Crew assignment visual

### Medium Priority - Nice to Have

8. **Custom Report Builder** ❌
9. **Zapier Integration** ❌
10. **Route Planning** ❌
11. **Team Messaging/Chat** ❌
12. **Duplicate Contact Detection** ❌
13. **Booking Pages** ❌

---

## Our Competitive Advantages

### vs ProLine
1. **Storm Targeting** ⚡ - ProLine doesn't have weather/hail data
2. **Territory Management** ⚡ - No canvassing tools in ProLine
3. **Gamification** ⚡ - ProLine lacks team engagement features
4. **Price** ⚡ - ProLine is $497-$1,697/mo

### vs Enzy
1. **Full CRM** ⚡ - Enzy is gamification-focused, not a full CRM
2. **Pipeline Management** ⚡ - Enzy lacks sales pipeline
3. **E-Signature** ⚡ - Enzy doesn't have document signing
4. **Financial Tracking** ⚡ - Enzy has no invoicing/payments
5. **AI Voice** ⚡ - Enzy lacks AI capabilities

### vs Both
1. **Single Platform** ⚡ - Replaces BOTH systems
2. **Custom Built** ⚡ - Tailored to client's exact needs
3. **Cost Effective** ⚡ - No per-seat fees like competitors
4. **Modern Stack** ⚡ - Next.js/Supabase vs Bubble (ProLine)

---

## Recommended Development Priorities

### Phase 6: Quote & Invoice System (Highest Impact)

1. **Quote Builder**
   - Multi-option templates
   - Line item editor
   - Material/labor breakdown
   - Send via SMS/Email
   - E-signature integration (already built)

2. **Invoice System**
   - Generate from quote/job
   - Stripe payment integration
   - Payment tracking
   - Send via SMS/Email

### Phase 7: Communication Enhancements

3. **Speed-to-Lead**
   - Webhook for new leads
   - Auto-response templates
   - Assignment rules

4. **Review Generation**
   - Post-job review request flow
   - Google/Facebook review links
   - Sentiment gating

5. **AI Call Features**
   - Call transcription (Whisper)
   - Call summary generation (GPT)

### Phase 8: Operations Polish

6. **Dispatch Board**
   - Daily view calendar
   - Drag-drop job scheduling
   - Crew assignment

7. **Report Builder**
   - Custom metric selection
   - Date range filters
   - Export options

---

## New Feature Gaps Discovered (Hands-On Exploration)

### From ProLine

1. **Customer Portal URL** - ProLine generates unique shareable links for each project
   - Customers can view project status, documents, sign contracts
   - Example: `proline.app/project/wyaz3sh72jwv`
   - **Our Status**: ❌ Not implemented
   - **Priority**: HIGH - Improves customer communication and reduces calls

2. **Role-Based Assignees** - Separate tracking for different roles on a project
   - Assignee (main owner)
   - Inside Sales (office staff)
   - Production (field crew)
   - Accounting (billing/payments)
   - **Our Status**: 🔨 Single assignee only
   - **Priority**: MEDIUM - Better for larger teams

3. **Days-in-Stage Counter** - Each contact shows how long they've been in current stage
   - Visual aging indicator on kanban cards
   - **Our Status**: ❌ Not displayed
   - **Priority**: MEDIUM - Helps identify stale leads

4. **Adjuster Field** - Dedicated insurance adjuster contact field
   - Critical for insurance claims workflow
   - **Our Status**: ❌ Not implemented
   - **Priority**: HIGH - Core roofing business need

5. **@Mention Tasks** - Mentioning someone creates a task for them automatically
   - "Ted Washburn mentioned you in a note for..."
   - **Our Status**: ❌ Not implemented
   - **Priority**: MEDIUM - Team collaboration

6. **Voicemail Inbox** - Dedicated voicemail management
   - Shows count (54 voicemails seen)
   - **Our Status**: ❌ Not implemented
   - **Priority**: LOW - Requires Twilio setup

7. **Internal Chat (Beta)** - Team messaging within the CRM
   - **Our Status**: ❌ Not implemented
   - **Priority**: LOW - Could use Slack integration instead

### From Enzy

1. **Setter/Closer Tracking** - Distinguish who set appointment vs who closes
   - Commission attribution
   - Performance tracking per role
   - **Our Status**: ❌ Single assignee
   - **Priority**: HIGH - Important for sales teams

2. **Team Competition** - Team vs team leaderboards (DK vs CM)
   - 116 vs 32 comparison shown
   - **Our Status**: 🔨 Individual leaderboards only
   - **Priority**: MEDIUM - Gamification enhancement

3. **Flight Risk Reports** - Automated alerts for at-risk employees
   - "Flight Risk sent you a report"
   - **Our Status**: ❌ Not implemented
   - **Priority**: LOW - HR feature

4. **Satisfaction Checkbox** - Track customer satisfaction per lead
   - Simple checkbox in lead table
   - **Our Status**: ❌ Not tracked
   - **Priority**: LOW - Nice to have

5. **Saved Map Views** - "Load this view" for saved map configurations
   - Save filter + location combinations
   - **Our Status**: ❌ Not implemented
   - **Priority**: LOW - UX enhancement

### Implementation Recommendations

| Feature | Effort | Impact | Priority |
|---------|--------|--------|----------|
| Customer Portal URL | Medium | High | P1 |
| Adjuster Field | Low | High | P1 |
| Setter/Closer Tracking | Medium | High | P1 |
| Days-in-Stage Counter | Low | Medium | P2 |
| Role-Based Assignees | Medium | Medium | P2 |
| @Mention Tasks | Medium | Medium | P2 |
| Team Competition | Low | Low | P3 |
| Saved Map Views | Low | Low | P3 |

---

## Sources

### Direct Exploration (December 10, 2025)
- ProLine App: https://proline.app/dashboard (logged in as Fnushi97@gmail.com)
- Enzy App: https://app.enzy.co/login (logged in as jared@claimclarityai.com)

### Public Sources
- [ProLine Pricing](https://useproline.com/pricing/)
- [ProLine Homepage](https://useproline.com/)
- [Enzy App](https://app.enzy.co/login)
- [Best Roofing CRMs 2025](https://hookagency.com/blog/best-roofing-crms/)
