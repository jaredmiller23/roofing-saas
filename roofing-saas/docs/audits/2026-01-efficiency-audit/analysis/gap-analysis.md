# Gap Analysis - Phase 8

**Auditor**: Claude (Scout Role)
**Date**: 2026-01-13
**Scope**: What's missing that would transform adoption

---

## Executive Summary

The app has **features but lacks flow**:

1. **No onboarding** - Users land on dashboard cold, don't know where to start
2. **No workflow guidance** - Users complete actions but don't know what's next
3. **Field mode exists but isn't field-ready** - 17 items isn't simplified
4. **Offline detection exists, offline UX doesn't** - Users don't know they're offline
5. **73 pages undiscoverable** - Features exist but users can't find them

**The ONE thing that would transform adoption**: A true "field mode" with 5 buttons that lets a door knocker capture a lead in under 30 seconds.

---

## Gap Categories

### 1. Onboarding & Discovery

#### [GAP-001] No New User Onboarding

**What's Missing**: When a new user signs up, they land on the dashboard with no guidance on:
- What to do first
- How the workflow works
- Where to find key features
- What the value proposition is

**Impact**: Users feel lost, abandon the app before getting value.

**What Would Help**:
- Welcome wizard showing the core workflow
- Checklist: "Complete your setup" (add contact, create project, etc.)
- Contextual tooltips on first visit to each page
- Empty state CTAs that guide next action

**Competitor Reference**: JobNimbus has a "Getting Started" checklist that persists until completed.

#### [GAP-002] No Command Palette / Quick Search

**What's Missing**: With 90+ pages and 17 nav items, users need a way to quickly find things. No Cmd+K search exists.

**Impact**: Users click through menus looking for features they know exist.

**What Would Help**:
- Command palette (Cmd+K) that searches:
  - Pages ("Pipeline", "Settings")
  - Entities ("John Smith", "Project #123")
  - Actions ("Create contact", "Send signature")
- Recent items list
- Keyboard shortcuts for common actions

**Competitor Reference**: Linear, Notion, and most modern SaaS apps have this.

---

### 2. Workflow Guidance

#### [GAP-003] No "Next Step" Indicators

**What's Missing**: After completing an action (create contact, win deal), users aren't told what to do next.

**Impact**: Users complete discrete actions but don't follow through the full workflow.

**What Would Help**:
- After creating contact: "Create a project to track this opportunity"
- After project reaches "won": "Start production or send signature"
- After signature signed: "Project ready for production"
- Visual progress indicator showing where in workflow

**This was identified in CW-003 and CW-005** - reinforce as critical gap.

#### [GAP-004] No Deal Flow Automation

**What's Missing**: When a deal moves through stages, related tasks aren't auto-created.

**Impact**: Users must remember to do things at each stage.

**What Would Help**:
- Stage → Task automation:
  - "Prospect": Create task "Schedule inspection"
  - "Quote Sent": Create task "Follow up in 3 days"
  - "Won": Create task "Start production", "Send contract"
- Configurable per tenant

**Note**: The `triggerWorkflow` infrastructure exists (`lib/automation/engine.ts`) but isn't wired to stage changes.

---

### 3. Field Worker Experience

#### [GAP-005] No True Quick-Capture Mode

**What's Missing**: The FieldWorkerHome has 4 buttons, but none is the obvious "I knocked on a door, capture this lead NOW" action.

**The Door Knocker's Dream Flow**:
1. Knock on door
2. Homeowner is interested
3. Tap ONE button
4. Speak name and address into phone (voice-to-text)
5. Photo of house auto-captured
6. Lead created, GPS tagged, timestamp logged
7. Back to knocking in <30 seconds

**Current Reality**:
1. Open app
2. Navigate to Contacts
3. Tap "New Contact"
4. Fill out form manually (12+ fields)
5. Take 2-3 minutes per lead

**What Would Help**:
- "Quick Lead" FAB (floating action button) always visible in field mode
- Voice input for name/address
- Camera integration for immediate photo
- Minimal required fields (name, address, photo)
- GPS auto-capture
- Auto-create project option

**This is the killer feature for field adoption.**

#### [GAP-006] No Offline-First Data Entry

**What's Missing**: The app detects offline state but doesn't handle it gracefully.

**Impact**: Field workers in rural areas lose data when cell service drops.

**What Would Help**:
- Local storage for in-progress forms
- Queue for offline-created records
- Sync indicator showing pending uploads
- Background sync when connection returns

**Note**: The detection exists (`lib/ui-mode/detection.ts` includes `connectionType`), just not surfaced.

---

### 4. Communication & Follow-Up

#### [GAP-007] No Follow-Up Reminder System

**What's Missing**: When users create contacts or log calls, they can create tasks manually. But there's no "Remind me to follow up in 3 days" quick action.

**Impact**: Leads go cold because follow-ups are forgotten.

**What Would Help**:
- "Follow up" button on contact/project detail pages
- Quick options: Tomorrow, 3 days, 1 week, Custom
- Auto-creates task with due date
- SMS/push notification on due date

#### [GAP-008] No Lead Scoring / Priority Sorting

**What's Missing**: All contacts appear equal in lists. No automatic scoring based on engagement, property value, weather events, etc.

**Impact**: Sales reps waste time on low-quality leads.

**What Would Help**:
- Auto-calculated lead score based on:
  - Days since last contact
  - Property size/value
  - Weather damage in area
  - Engagement (opened emails, answered calls)
- Sort lists by score by default
- Visual indicator (hot/warm/cold)

**Note**: Schema has `lead_score` field, but it's not calculated or displayed.

---

### 5. Analytics & Insights

#### [GAP-009] No "Today" Dashboard for Field Workers

**What's Missing**: Dashboard shows company-wide metrics. Field workers need "My day" view:
- My appointments today
- My follow-ups due
- My recent knocks
- My stats vs. goal

**Impact**: Field workers start day without clear priorities.

**What Would Help**:
- Role-based dashboard variants
- Field worker dashboard showing:
  - Today's schedule
  - Due tasks
  - Daily knock/call goals
  - Live stats

**Note**: `/field/today` exists but isn't the default for field workers.

#### [GAP-010] No Win/Loss Analysis

**What's Missing**: No easy way to see why deals were won or lost.

**Impact**: Can't improve sales process without understanding outcomes.

**What Would Help**:
- Required "loss reason" when marking deal lost
- Win/loss report by:
  - Sales rep
  - Lead source
  - Time in pipeline
  - Carrier (for insurance claims)
- Trend analysis over time

---

## Priority Ranking

| Gap | Impact | Effort | Priority |
|-----|--------|--------|----------|
| GAP-005 | Very High | Medium | **1** |
| GAP-003 | High | Low | **2** |
| GAP-001 | High | Medium | **3** |
| GAP-002 | High | Medium | **4** |
| GAP-007 | Medium | Low | 5 |
| GAP-006 | Medium | High | 6 |
| GAP-004 | Medium | Medium | 7 |
| GAP-009 | Medium | Medium | 8 |
| GAP-008 | Medium | Medium | 9 |
| GAP-010 | Low | Medium | 10 |

---

## The ONE Feature

If you could only build one thing:

### Quick Lead Capture (GAP-005)

**Why This One**:
1. **Primary user** - Door knockers are the primary users, they knock 50-100 doors/day
2. **Current pain** - 2-3 minutes per lead capture = 100-300 minutes/day = 3-5 HOURS lost
3. **Competitive advantage** - No competitor does voice-to-lead well
4. **Adoption driver** - If it's faster to capture leads in the app than on paper, adoption follows

**What It Looks Like**:
```
┌─────────────────────────────────┐
│                                 │
│     [Voice Input Animation]    │
│                                 │
│   "John Smith, 123 Oak Street" │
│                                 │
│   📍 GPS: 35.1234, -80.5678    │
│   📷 [Photo thumbnail]         │
│                                 │
│   ┌─────────────────────────┐  │
│   │    [Create Lead]        │  │
│   └─────────────────────────┘  │
│                                 │
│   [+ Add Details] [Discard]    │
│                                 │
└─────────────────────────────────┘
```

**Implementation Path**:
1. Create `/field/quick-lead` page
2. Add floating button to field mode
3. Integrate Web Speech API for voice
4. Auto-capture GPS on page load
5. Camera integration for photo
6. Minimal form (just name, address)
7. One-tap submit → lead created

---

## Summary for HANDOFF.md

| Issue ID | Priority | Summary |
|----------|----------|---------|
| GAP-005 | Critical | No quick-capture mode for field workers |
| GAP-003 | High | No "next step" workflow guidance |
| GAP-001 | High | No new user onboarding |
| GAP-002 | High | No command palette / quick search |
| GAP-007 | Medium | No follow-up reminder quick action |
| GAP-006 | Medium | No offline-first data entry |
| GAP-004 | Medium | No stage → task automation |
| GAP-009 | Medium | No "my day" dashboard for field workers |
| GAP-008 | Medium | No lead scoring / priority sorting |
| GAP-010 | Low | No win/loss analysis |
