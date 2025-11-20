# Incomplete Features - Decision Required

**Date Created**: November 20, 2025
**Status**: PENDING USER DECISIONS

This document tracks features that are partially implemented and require decisions on how to proceed.

---

## 🔴 DECISION 1: Digital Business Cards

### Current Status
- ❌ **Migration**: Deleted in commit 50b4fe4 (Nov 19, 2025)
- ❌ **Database Tables**: Do not exist
- ⚠️ **API Routes**: May exist at `/api/digital-cards/` but non-functional
- 📝 **Original Migration**: 488 lines (available in git history: commit 6b77aaf)

### History
1. Created November 18, 2025 as part of "6 major features"
2. Intentionally excluded during November 19 migration repair
3. 5 other features were deployed, this one was left out

### Options

#### Option A: Deploy It ✅
**Effort**: 1-2 hours
**Steps**:
1. Restore migration from git history
2. Apply to production database
3. Test API routes
4. Add to feature list
**Pros**: Feature becomes available, API routes work
**Cons**: Adds untested feature to production

#### Option B: Delete API Routes 🗑️
**Effort**: 30 minutes
**Steps**:
1. Remove `/api/digital-cards/` routes
2. Remove any UI components
3. Document as "not deployed"
**Pros**: Clean codebase, no dead code
**Cons**: Loses work that was done

#### Option C: Defer to Phase 5 📅
**Effort**: 15 minutes
**Steps**:
1. Move to Phase 5 backlog in Archon
2. Keep code but don't claim as deployed
3. Revisit after current features validated
**Pros**: Preserves work, doesn't clutter current phase
**Cons**: Code sits unused

### 👉 YOUR DECISION
**Choose one**: [ ] Deploy [ ] Delete [ ] Defer

**Reasoning**:
_[Fill in why you chose this option]_

**Action Items**:
_[Claude will execute based on your decision]_

---

## 🟡 DECISION 2: Configurable Filters (Backend Only)

### Current Status
- ✅ **Migration**: Applied (20251119000400_configurable_filters.sql, 521 lines)
- ✅ **Database Tables**: `saved_filters`, `filter_templates` exist
- ✅ **API Routes**: `/api/filters/` functional
- ❌ **UI**: No dashboard page or components

### What Works
- API for creating saved filters
- API for applying filters to queries
- Backend filter execution engine

### What's Missing
- No UI to create filters
- No UI to manage saved filters
- No UI to apply filters to views

### Options

#### Option A: Build Complete UI 🎨
**Effort**: 4-6 hours
**Features**:
- Filter builder component
- Saved filters management page
- Quick filter dropdown in list views
**Pros**: Feature is complete and usable
**Cons**: Significant time investment

#### Option B: Build Minimal UI 🎯
**Effort**: 2-3 hours
**Features**:
- Simple saved filters dropdown
- Basic create/edit dialog
- Apply to current view only
**Pros**: Functional with less effort
**Cons**: Limited UX

#### Option C: Keep API-Only 📡
**Effort**: 5 minutes (documentation update)
**Features**:
- Document API endpoints
- Mark as "API available, UI pending"
- Keep for programmatic use or future UI
**Pros**: No additional work
**Cons**: Not usable by non-technical users

### 👉 YOUR DECISION
**Choose one**: [ ] Full UI [ ] Minimal UI [ ] API-Only

**Priority**: [ ] High [ ] Medium [ ] Low

**Reasoning**:
_[Fill in why you chose this option]_

---

## 🟡 DECISION 3: Substatus System (Backend Only)

### Current Status
- ✅ **Migration**: Applied (20251119000500_substatus_system.sql, 527 lines)
- ✅ **Database Tables**: `substatuses`, `contact_substatus_history` exist
- ✅ **API Routes**: `/api/substatus/` functional
- ❌ **UI**: No dashboard page or components

### What Works
- API for creating custom substatuses per pipeline stage
- API for assigning substatuses to contacts
- Substatus history tracking

### What's Missing
- No UI to manage substatuses (create/edit/delete)
- No UI to assign substatuses to contacts
- No substatus display in contact views

### Use Case
Allows more granular pipeline tracking:
- Lead → Hot/Warm/Cold
- Proposal → Pending/Accepted/Negotiating
- Closed Won → Paid/Payment Plan/Pending Payment

### Options

#### Option A: Build Complete UI 🎨
**Effort**: 4-6 hours
**Features**:
- Substatus management page
- Inline substatus selector in contact cards
- Substatus history timeline
**Pros**: Pipeline becomes much more useful
**Cons**: Significant time investment

#### Option B: Build Minimal UI 🎯
**Effort**: 2-3 hours
**Features**:
- Simple substatus dropdown in contact edit
- Basic substatus configuration page
**Pros**: Functional with less effort
**Cons**: Missing advanced features (history, etc.)

#### Option C: Keep API-Only 📡
**Effort**: 5 minutes (documentation update)
**Features**:
- Document API endpoints
- Mark as "API available, UI pending"
- Keep for API integrations or future UI
**Pros**: No additional work
**Cons**: Feature isn't usable in UI

### 👉 YOUR DECISION
**Choose one**: [ ] Full UI [ ] Minimal UI [ ] API-Only

**Priority**: [ ] High [ ] Medium [ ] Low

**Reasoning**:
_[Fill in why you chose this option]_

---

## 📊 DECISION SUMMARY

Once you've made your decisions above, update this table:

| Feature | Decision | Priority | Estimated Effort | Status |
|---------|----------|----------|------------------|--------|
| Digital Business Cards | _[Deploy/Delete/Defer]_ | _[H/M/L]_ | _[X hours]_ | ⏳ Pending |
| Configurable Filters | _[Full/Minimal/API-Only]_ | _[H/M/L]_ | _[X hours]_ | ⏳ Pending |
| Substatus System | _[Full/Minimal/API-Only]_ | _[H/M/L]_ | _[X hours]_ | ⏳ Pending |

**Total Estimated Effort**: _[X hours]_

---

## 🎯 NEXT STEPS

After completing this document:
1. Share decisions with Claude
2. Claude will create Archon tasks for chosen options
3. Execute work in priority order
4. Update this document with completion status

---

## 📝 NOTES

_[Add any additional context, considerations, or notes here]_
