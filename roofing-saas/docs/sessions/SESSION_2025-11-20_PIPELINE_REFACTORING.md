# Session: Pipeline Refactoring (Phase 1)
**Date:** November 20, 2025
**Goal:** Simplify Sales & Projects page by removing confusing "Leads vs Jobs" toggle
**Status:** Phase 1 Complete ✅

---

## 🎯 Problem Statement

The /projects page had a **fundamental UX problem**: A toggle between "Leads" and "Jobs" that switched between two completely different data sources (contacts vs projects). This created confusion because:

1. **Toggle implied related views** - but they were completely separate entities
2. **Kanban views lacked filters** - only table views had configurable filters
3. **No clear handoff** - unclear when/how a lead becomes a job
4. **Too many pages** - sales pipeline felt fragmented
5. **Purpose was lost** - "all the blah blah" obscured the core goal

User quote: *"The PURPOSE is lost with all the blah blah"*

---

## 🔬 Research Phase

### Proline CRM Analysis
Researched how Proline (the CRM being replaced) structures their pipeline:

**Key Findings:**
- **Project-centric model** - Projects exist from day one, not just after sale
- **Unified workflow** - Projects move through stages: Lead → Quote → Won → Production → Complete
- **Auto-job generation** - When quote signed → automatically creates production jobs
- **Weakness** - Poor filtering capabilities (our opportunity to differentiate)

### Current Implementation Analysis
Explored codebase to understand current structure:

**Findings:**
- `/projects` page had entity toggle: Leads (contacts table) vs Jobs (projects table)
- Configurable filters implemented for **tables only**, not Kanban views
- Rendering loop issues blocking filter integration (from Nov 20 session)
- Terminology inconsistent (leads vs contacts vs customers)
- Projects filters not seeded (only contact filters exist)

---

## 📋 Implementation Plan (5 Phases)

### ✅ Phase 1: Simplify Page UI (COMPLETED)
**Goal:** Remove toggle confusion, add clear purpose

**Changes Made:**
1. Removed "Leads vs Jobs" entity toggle
2. Renamed "Sales & Projects" → "Pipeline" in navigation
3. Added quick filter chips: [All | Active Opportunities | In Production | Closed]
4. Changed "New Lead" button → "New Opportunity"
5. Simplified to single Kanban/Table view toggle
6. Updated page title and description

**Files Modified:**
- `/app/(dashboard)/projects/page.tsx` (152 lines → 153 lines, -60 lines of toggle logic)
- `/components/layout/Sidebar.tsx` (changed label line 46)

**Git Status:**
```
M app/(dashboard)/projects/page.tsx
M components/layout/Sidebar.tsx
```

### ⏳ Phase 2: Extend Data Model (TODO)
**Goal:** Make projects table support full sales lifecycle

**Changes Needed:**
- Add `pipeline_stage` enum (prospect → qualified → quote → won → production → complete → lost)
- Add lead fields: `lead_source`, `priority`, `lead_score`, `estimated_close_date`
- Migrate contact stage data into project records
- Ensure `contact_id` relationship exists

**Archon Task:** `84322354-4af5-4561-b43f-cab57450adb3`

### ⏳ Phase 3: Add Filters to Kanban (TODO)
**Goal:** Bring configurable filters to Kanban views

**Changes Needed:**
- Update PipelineBoard to accept `quickFilter` prop
- Apply filter logic to Kanban data fetching
- Add FilterBar component above Kanban columns
- Connect quickFilter chips to actual data filtering

**Archon Task:** `69a95353-8bde-448a-8bee-72f9b4b78b75`

### ⏳ Phase 4: Fix Filter Rendering Loops (TODO)
**Goal:** Resolve infinite render issues blocking integration

**Problem:** useSearchParams() returns unstable object causing re-renders

**Archon Task:** `09c7130c-dd65-417f-95fe-fa74841be610`

### ⏳ Phase 5: Workflow Automation & Polish (TODO)
**Goal:** Complete end-to-end workflow + cleanup

**Changes Needed:**
- "Start Production" action when opportunity won
- Stage transition validation (can't skip stages)
- Required fields per stage
- Terminology cleanup throughout codebase

**Archon Task:** `b8df5149-84d7-4c29-a224-3d38fd2229cd`

---

## 🎨 Before/After Comparison

### Before (Confusing)
```
[Toggle: Leads | Jobs]  [View: Kanban | Table]  [+ New Lead]

→ Leads Kanban: Shows contacts from contacts table
→ Leads Table: Shows contacts with project counts
→ Jobs Kanban: Shows projects from projects table
→ Jobs Table: Shows projects with details
→ Filters: Only on table views, not Kanban
```

### After (Clear)
```
Pipeline
[View: Kanban | Table]  [+ New Opportunity]

Quick Filters: [All] [Active] [In Production] [Closed]

→ Kanban: Unified opportunity view (single data source)
→ Table: Same data, different presentation
→ Filters: Will work on both views (Phase 3)
```

---

## 🧠 Key Design Decisions

### 1. **Why "Pipeline" instead of "Sales & Projects"?**
- Single, clear purpose: track opportunities from first contact to completion
- Matches roofing industry terminology (sales pipeline)
- Removes artificial separation between "sales" and "projects"

### 2. **Why Remove Toggle Entirely?**
- Toggle implied related views but switched completely different data sources
- Confusing mental model: Are leads and jobs the same thing?
- Better approach: Use filters to slice a single unified view

### 3. **Why Quick Filter Chips?**
- Replace toggle with explicit filtering intent
- Visual indication of current filter state
- Foundation for configurable filters (Phase 3)
- Users can see "All" vs "Active" vs "Production" - clearer than "Leads" vs "Jobs"

### 4. **Why Keep Kanban + Table Toggle?**
- These are **presentation choices** on the same data (unlike entity toggle)
- Some users prefer visual Kanban, others prefer detailed tables
- Both views will support same filters (after Phase 3)

---

## 📊 User Impact

### Small Team (Current State)
- **Before:** Confused by Leads vs Jobs separation
- **After:** One clear view of "opportunities to make money"
- **Benefit:** Simplified workflow, faster onboarding

### Future Growth (Separate Sales/Production Teams)
- Quick filters provide natural division: "Active" for sales team, "Production" for crew
- Can still add role-based views later if needed
- Foundation supports scaling without architectural change

---

## 🔗 Related Documentation

- **Research Report:** See Archon task `8e3da605-227c-4421-a739-850317430f50` for Proline analysis
- **Filter System:** `/docs/sessions/SESSION_2025-11-20_FILTERBAR_RENDERING_LOOP.md`
- **Proline Comparison:** Research shows they use unified project model (validates our approach)

---

## ⚡ Quick Start for Future Claude Instances

**Context:** We're consolidating the fragmented "Sales & Projects" page into a unified "Pipeline" view.

**Current State (Phase 1 Complete):**
- ✅ Page renamed to "Pipeline"
- ✅ Entity toggle removed
- ✅ Quick filter chips added
- ✅ UI simplified

**Next Steps:**
1. Check Archon for current phase (likely Phase 2: Data Model)
2. Read this doc for full context
3. Continue with remaining phases as needed

**Testing:**
1. Navigate to `/projects` - should see "Pipeline" title
2. No "Leads vs Jobs" toggle should exist
3. Quick filter chips should be visible (All, Active, Production, Closed)
4. Quick filters don't work yet (need Phase 3 implementation)

---

## 🚀 Deployment Status

**Phase 1:** Ready to commit and deploy
**Next:** User testing, then proceed to Phase 2 (Data Model)

---

## 📝 Notes for Future Sessions

1. **Quick filters are UI-only** - They're passed as props but not yet implemented in PipelineBoard/LeadsWithFilters
2. **Terminology shift** - Start using "opportunities" and "pipeline" instead of "leads" and "jobs"
3. **Data model unchanged** - Phase 1 is pure UI simplification, data structure changes in Phase 2
4. **ProjectsKanbanBoard unused** - After Phase 2, this component may be removed entirely

---

**Session End:** Phase 1 complete, documented, ready for user review and Phase 2 planning.
