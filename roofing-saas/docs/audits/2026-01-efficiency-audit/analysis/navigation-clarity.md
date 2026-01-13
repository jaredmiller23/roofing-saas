# Navigation Clarity Audit - Phase 3 Analysis

**Auditor**: Claude (Scout Role)
**Date**: 2026-01-13
**Primary File**: `components/layout/Sidebar.tsx`

---

## Executive Summary

The navigation has **17 items across 4 sections** - far exceeding the 4-6 items optimal for adoption. Additional issues include:

1. **Confusing label/route mismatches** - "Pipeline" goes to /projects, "Emails" goes to /campaigns
2. **Duplicate icon usage** - Zap (⚡) used for both "Lead Gen" and "Campaigns"
3. **90 pages exist, only 17 in nav** - Many features are undiscoverable
4. **Contacts buried** - Primary CRM entity in COMMUNICATIONS section, not prominent
5. **Workflow doesn't match sections** - SELL → CORE → COMMS doesn't match user journey

---

## Current Navigation Structure

**Source**: `components/layout/Sidebar.tsx:49-87`

### SELL Section (6 items)
| Route | Label | Icon | Notes |
|-------|-------|------|-------|
| `/knocks` | Knock | Map | Door-to-door tracking |
| `/signatures` | Signatures | PenTool | E-signatures |
| `/claims` | Claims | FileText | Insurance claims |
| `/incentives` | Incentives | Trophy | Gamification |
| `/storm-targeting` | Lead Gen | **Zap** | Storm lead generation |
| `/storm-tracking` | Storm Intel | CloudLightning | Weather alerts |

### CORE Section (5 items)
| Route | Label | Icon | Notes |
|-------|-------|------|-------|
| `/dashboard` | Dashboard | LayoutDashboard | Home |
| `/projects` | **Pipeline** | Workflow | ⚠️ Route/label mismatch |
| `/insights` | Business Intel | Sparkles | AI insights |
| `/events` | Events | Calendar | Calendar |
| `/tasks` | Tasks | CheckSquare | Task management |

### COMMUNICATIONS Section (5 items)
| Route | Label | Icon | Notes |
|-------|-------|------|-------|
| `/call-logs` | Call Log | Phone | Call tracking |
| `/messages` | Messages | MessageSquare | SMS threads |
| `/campaigns` | **Emails** | Mail | ⚠️ Route/label mismatch |
| `/automations` | **Campaigns** | **Zap** | ⚠️ Route/label mismatch + duplicate icon |
| `/contacts` | Contacts | Users | CRM contacts |

### SETTINGS Section (1 item)
| Route | Label | Icon | Notes |
|-------|-------|------|-------|
| `/settings` | Settings | Settings | App settings |

---

## Issues Identified

### CRITICAL

#### [NAV-001] Too Many Navigation Items

- **Target**: `components/layout/Sidebar.tsx:49-87`
- **Assessment**: 17 nav items (plus sign out = 18 touchpoints) creates cognitive overload. Research shows 4-6 items is optimal for first-time users. Field workers on phones face choice paralysis.
- **Solution**: Collapse to 5-6 primary items. Move secondary features to sub-menus or command palette.
- **Verification**: Count nav items, confirm ≤7 visible without scrolling

#### [NAV-002] Label/Route Mismatches Cause Confusion

- **Target**: `components/layout/Sidebar.tsx:65, 76-77`
- **Assessment**: Three critical mismatches:
  - `/projects` labeled "Pipeline" (line 65)
  - `/campaigns` labeled "Emails" (line 76)
  - `/automations` labeled "Campaigns" (line 77)

  Users searching for "projects" won't find it. Users clicking "Campaigns" expect email campaigns but get workflow automation.

- **Solution**: Align labels with routes OR rename routes to match labels:
  - Keep `/projects` → rename label to "Projects" (or rename route to `/pipeline`)
  - Rename `/campaigns` → `/emails` OR change label to "Campaigns"
  - Rename `/automations` → `/campaigns` OR change label to "Automations"
- **Verification**: Label matches route name (or clear convention documented)

### HIGH

#### [NAV-003] Duplicate Icon Usage

- **Target**: `components/layout/Sidebar.tsx:57, 77`
- **Assessment**: Zap (⚡) icon used for:
  - "Lead Gen" (`/storm-targeting`) - line 57
  - "Campaigns" (`/automations`) - line 77

  Visual scanning fails when icons repeat. Users can't distinguish at a glance.
- **Solution**: Change one icon. Suggestions:
  - Lead Gen: `Target` or `Radar` icon
  - Campaigns: `Send` or `Repeat` icon
- **Verification**: No duplicate icons in nav

#### [NAV-004] Contacts Buried in COMMUNICATIONS

- **Target**: `components/layout/Sidebar.tsx:78`
- **Assessment**: Contacts is the primary CRM entity - the start of all workflows. It's buried as the 5th item in the 3rd section (COMMUNICATIONS). Users must scroll past 14 items to find it.
- **Solution**: Move Contacts to CORE section, ideally position 2 (after Dashboard).
- **Verification**: Contacts visible in top 5 nav items

#### [NAV-005] Workflow Doesn't Match Section Order

- **Target**: `components/layout/Sidebar.tsx` (section order)
- **Assessment**: The logical workflow is:
  ```
  Knock (field) → Contact (create) → Project (track) → Signature (close) → Done
  ```
  But the nav sections are:
  ```
  SELL → CORE → COMMUNICATIONS → SETTINGS
  ```

  Contacts (step 2 of workflow) is in COMMUNICATIONS. Projects (step 3) is in CORE. Signatures (step 4) is in SELL. The order makes no sense.

- **Solution**: Reorganize by workflow stage, not feature category:
  ```
  WORKFLOW: Dashboard, Knock, Contacts, Pipeline, Signatures
  TOOLS: Tasks, Events, Call Log, Messages
  INSIGHTS: Business Intel, Storm Intel, Claims
  SETTINGS: Settings
  ```
- **Verification**: Primary workflow items are in logical order in a single section

### MEDIUM

#### [NAV-006] 73 Pages Not in Navigation

- **Target**: Multiple files in `app/[locale]/(dashboard)/`
- **Assessment**: 90 pages exist but only 17 are in nav. Features not discoverable:
  - `/digital-cards/*` - Digital business cards
  - `/financial/*` - Financial analytics, commissions, reports
  - `/territories/*` - Territory management
  - `/field/*` - Field worker pages (today, call, me)
  - `/jobs/*` - Job tracking (separate from projects)
  - `/voice-assistant/*` - Voice assistant
  - `/project-files/*` - File management
  - `/inspect/*` - Inspection tools
  - `/estimates/*` - Estimate builder

  Users don't know these features exist.

- **Solution**: Either:
  - A) Add to nav (but this conflicts with NAV-001)
  - B) Add to command palette (Cmd+K)
  - C) Add contextual links (e.g., "Estimates" button on project page)
  - D) Determine which features are actually needed and remove the rest
- **Verification**: All active features discoverable via nav OR command palette

#### [NAV-007] Duplicate/Redundant Routes

- **Target**: Multiple files
- **Assessment**: Several redundant routes exist:
  - `/pipeline/page.tsx` - Just redirects to `/projects` (line 10)
  - `/admin/audit-log/` AND `/admin/audit-logs/` - Typo duplicate
  - `/financial/*` AND `/financials/` - Singular vs plural
  - `/voice/` AND `/voice-assistant/` - Two voice pages

- **Solution**: Remove duplicates, consolidate routes
- **Verification**: No route redirects to another route (except legacy support)

#### [NAV-008] No Search/Command Palette in Nav

- **Target**: `components/layout/Sidebar.tsx`
- **Assessment**: With 90 pages and only 17 in nav, users need search. Command palette exists (`components/command-palette/`) but no nav entry for it.
- **Solution**: Add "Search" item to nav OR persistent search icon in header
- **Verification**: Search accessible within 1 click from any page

---

## Page Inventory (90 Total)

### In Navigation (17)
```
/dashboard, /projects, /insights, /events, /tasks,
/knocks, /signatures, /claims, /incentives, /storm-targeting, /storm-tracking,
/call-logs, /messages, /campaigns, /automations, /contacts,
/settings
```

### NOT in Navigation (73)
```
Admin:
  /admin/audit-log, /admin/audit-logs

Contacts (detail/edit/new):
  /contacts/[id], /contacts/[id]/edit, /contacts/new

Projects (detail/edit/new/claims):
  /projects/[id], /projects/[id]/edit, /projects/new,
  /projects/[id]/claims, /projects/[id]/claims/[claimId],
  /projects/[id]/claims/inspection, /projects/[id]/costing

Pipeline:
  /pipeline (redirect), /pipeline/analytics

Jobs:
  /jobs, /jobs/[id], /jobs/[id]/edit, /jobs/new

Estimates:
  /estimates/[id]

Signatures (detail/send/templates):
  /signatures/[id], /signatures/[id]/send, /signatures/new,
  /signatures/templates, /signatures/templates/[id],
  /signatures/templates/[id]/editor, /signatures/templates/new

Campaigns (detail/analytics/templates):
  /campaigns/[id]/analytics, /campaigns/[id]/builder,
  /campaigns/new, /campaigns/templates

Automations (detail/new):
  /automations/[id], /automations/new

Tasks (detail/edit/board/new):
  /tasks/[id], /tasks/[id]/edit, /tasks/board, /tasks/new

Events (detail/edit/new):
  /events/[id], /events/[id]/edit, /events/new

Call Logs (detail/edit/new):
  /call-logs/[id], /call-logs/[id]/edit, /call-logs/new

Messages:
  /messages/[contactId]

Knocks (detail/new):
  /knocks/[id]/edit, /knocks/new

Claims:
  /claims/intelligence

Territories:
  /territories, /territories/[id], /territories/[id]/edit, /territories/new

Financial:
  /financial/analytics, /financial/commissions, /financial/reports,
  /financials

Digital Cards:
  /digital-cards, /digital-cards/[id]/qr

Field:
  /field/call, /field/me, /field/today

Project Files:
  /project-files, /project-files/[id], /project-files/[id]/edit, /project-files/new

Voice:
  /voice, /voice-assistant

Other:
  /inspect/[projectId]

Settings:
  /settings/language, /settings/my-card, /settings/profile, /settings/scoring

Storm:
  /storm-targeting/leads
```

---

## User Persona Analysis

### Door Knocker (Primary User)
**What they need daily**:
1. Knock (track door knocks)
2. Contacts (create leads)
3. Call Log (track calls)
4. Tasks (daily checklist)

**Current experience**:
- Knock is 1st item ✅
- Contacts is 15th item ❌
- Call Log is 7th item (acceptable)
- Tasks is 11th item ❌

### Manager
**What they need daily**:
1. Dashboard (overview)
2. Pipeline (deal flow)
3. Events (schedule)
4. Insights (analytics)

**Current experience**:
- Dashboard is 7th item ❌
- Pipeline is 8th item ❌
- Events is 10th item ❌
- Insights is 9th item ❌

(All in middle of list, not easily scannable)

---

## Recommended Navigation Structure

### Option A: Workflow-Based (Recommended)

```
WORKFLOW (5 items - visible without scroll)
├── Dashboard (LayoutDashboard)
├── Contacts (Users)
├── Pipeline (Workflow)  → /projects
├── Signatures (PenTool)
└── Tasks (CheckSquare)

FIELD (3 items)
├── Knock (Map)
├── Call Log (Phone)
└── Messages (MessageSquare)

INTEL (3 items)
├── Insights (Sparkles)
├── Storm (CloudLightning)
└── Claims (FileText)

SETTINGS (1 item)
└── Settings (Settings)

Total: 12 items (down from 17)
```

### Option B: Role-Based Adaptive Nav

Field Worker sees:
```
Knock, Contacts, Pipeline, Tasks, Call Log
```

Manager sees:
```
Dashboard, Pipeline, Insights, Events, Settings
```

Owner sees:
```
Dashboard, Pipeline, Financial, Team, Settings
```

---

## Files Audited

| File | Lines | Purpose |
|------|-------|---------|
| `components/layout/Sidebar.tsx` | 267 | Main navigation |
| `app/[locale]/(dashboard)/pipeline/page.tsx` | 12 | Redirect to /projects |
| 90 page.tsx files | - | All dashboard pages |

---

## Summary for HANDOFF.md

| Issue ID | Priority | Summary |
|----------|----------|---------|
| NAV-001 | Critical | 17 nav items (should be 5-7) |
| NAV-002 | Critical | Label/route mismatches (Pipeline→/projects) |
| NAV-003 | High | Duplicate Zap icon |
| NAV-004 | High | Contacts buried (should be prominent) |
| NAV-005 | High | Section order doesn't match workflow |
| NAV-006 | Medium | 73 pages not discoverable |
| NAV-007 | Medium | Duplicate/redundant routes |
| NAV-008 | Medium | No search in nav |
