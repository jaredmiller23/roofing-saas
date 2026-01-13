# Reconnaissance Report: Dashboard & Knocks Page Issues

**Date**: 2026-01-13
**Type**: Bug Investigation (Recon Only - No Touch)
**Analyst**: Claude (Scout Role)
**For**: Sniper Team (Execution)

---

## Executive Summary

Four user-reported issues on the Dashboard and Knocks pages trace to a **single systemic pattern**: UI elements exist without backend wiring. This is not new - it's the same pattern identified in the main efficiency audit (HANDOFF.md). These bugs represent incomplete feature development, not regression.

**The ONE Thing**: All four issues are symptoms of **features that were designed and partially implemented but never wired up**. The backend infrastructure exists. The UI exists. The connection between them is missing.

---

## Findings Summary

| # | Issue | Root Cause | Effort |
|---|-------|------------|--------|
| 1 | View Leaderboard button does nothing | No onClick handler | 5 min |
| 2 | Calendar button does nothing | No onClick handler | 5 min |
| 3 | Daily/Weekly/Monthly not clickable | Static divs, not buttons | 10 min |
| 4 | Recent Activity shows "Team Member" | API doesn't query created_by | 15 min |
| 5 | Recent Activity not clickable | Items are divs, not links | 15 min |
| 6 | Knock page activity empty | `result.pins` should be `result.data` | 2 min |

**Total estimated fix time**: ~52 minutes of focused sniper work

---

## Detailed Findings

### [DASH-001] View Leaderboard Button Non-Functional

- **Target**: `components/dashboard/WeeklyChallengeWidget.tsx:271-278`
- **Assessment**: The "View Leaderboard" and Calendar buttons are purely decorative. They render but have no onClick handlers. This is not a bug - the functionality was never implemented.
- **Evidence**:
  ```tsx
  // Lines 271-278 - NO onClick anywhere
  <Button size="sm" className="flex-1">
    <TrendingUp className="h-4 w-4 mr-2" />
    View Leaderboard
  </Button>
  <Button variant="outline" size="sm">
    <Calendar className="h-4 w-4" />
  </Button>
  ```
- **Backend Status**: ✅ READY - Full leaderboard API and component exist:
  - `app/api/gamification/leaderboard/route.ts` (239 lines, full functionality)
  - `components/gamification/Leaderboard.tsx` (254 lines, fully built)
- **Solution**: Add onClick handlers. Options:
  1. Open modal with `<Leaderboard />` component
  2. Navigate to `/gamification/leaderboard` page (if exists)
  3. Add Dialog wrapper to show leaderboard inline
- **Verification**: Click "View Leaderboard" → Leaderboard displays with rankings

### [DASH-002] Daily/Weekly/Monthly Points Not Interactive

- **Target**: `components/gamification/PointsDisplay.tsx:100-130`
- **Assessment**: The Daily/Weekly/Monthly boxes LOOK like buttons but are static `<div>` elements. Users expect to click them to filter/drill down. They cannot.
- **Evidence**:
  ```tsx
  // Line 100-130 - divs styled to look interactive but aren't
  <div className="grid grid-cols-3 gap-3">
    <div className="text-center p-3 bg-muted/30 rounded-lg">
      <div className="flex items-center justify-center mb-1">
        <Target className="h-4 w-4 text-muted-foreground mr-1" />
        <span className="text-xs text-muted-foreground">Daily</span>
      </div>
      <p className="text-lg font-semibold text-foreground">
        {points.daily_points}
      </p>
    </div>
    // ... same pattern for Weekly, Monthly
  </div>
  ```
- **Backend Status**: ⚠️ PARTIAL - Points API returns aggregated totals, but there's no breakdown endpoint
- **Solution**: Two options:
  1. **Quick**: Add hover state + tooltip explaining "Total for period" (clarify intent)
  2. **Full**: Make clickable to show activity breakdown for that period
- **Verification**: If quick fix - hover shows explanation. If full - click shows period details.

### [DASH-003] Recent Activity Shows "Team Member" Instead of Names

- **Target**: `app/api/dashboard/activity/route.ts:39-55, 114-121`
- **Assessment**: The activity API queries projects and contacts but never selects the `created_by` field or joins to user info. Without user attribution, the frontend falls back to "Team Member".
- **Evidence (API)**:
  ```tsx
  // Line 39-55: Projects query - NO created_by
  .select(`
    id, name, status, updated_at,
    contacts(id, name, email, phone)
  `)

  // Line 114-121: Contacts query - NO created_by
  .select(`
    id, name, email, phone, contact_category, status, created_at,
    projects(id, name)
  `)
  ```
- **Evidence (Frontend fallback)**:
  ```tsx
  // components/dashboard/ActivityFeed.tsx:87-88
  user: {
    name: item.metadata?.contact_name || item.metadata?.user || 'Team Member',
    avatar: undefined
  }
  ```
- **Backend Status**: ❌ MISSING - API needs to query created_by and resolve to user name
- **Solution**:
  1. Add `created_by` to both queries
  2. Join to tenant_users/profiles to get name
  3. Include user info in response
- **Verification**: Activity items show actual user names, not "Team Member"

### [DASH-004] Recent Activity Items Not Clickable

- **Target**: `components/dashboard/ActivityFeed.tsx` (entire file)
- **Assessment**: Activity items are rendered as static divs. Users expect to click "New project: Smith Residence" to go to that project. They cannot.
- **Evidence**: No `<Link>` components, no `onClick` handlers on activity items
- **Backend Status**: ✅ READY - Activity items contain IDs needed for linking
- **Solution**: Wrap activity items in `<Link>` based on type:
  - Project activities → `/projects/{id}`
  - Contact activities → `/contacts/{id}`
  - Knock activities → `/knocks` (or pin detail if exists)
- **Verification**: Click activity item → navigates to correct detail page

### [DASH-005] Knock Page Recent Activity Empty

- **Target**: `app/[locale]/(dashboard)/knocks/page.tsx:123`
- **Assessment**: **CRITICAL BUG** - The frontend expects `result.pins` but API returns `result.data`. This is a data contract mismatch that causes silent failure.
- **Evidence**:
  ```tsx
  // Line 123 - WRONG property accessed
  const result = await response.json()
  setKnocks(result.pins || [])  // ❌ Should be result.data
  ```

  ```tsx
  // API returns (lib/api/response.ts:35-46)
  {
    success: true,
    data: [...pins...]  // ✅ Correct location
  }
  ```
- **Grep confirmation**: All other components use `result.data`:
  ```
  KpisTab.tsx:33:        setKpis(result.data || [])
  AchievementsTab.tsx:150:  setAchievements(result.data || [])
  RewardsTab.tsx:109:     setRewards(result.data || [])
  knocks/page.tsx:123:    setKnocks(result.pins || [])  // ← Only outlier
  ```
- **Solution**: Change `result.pins` to `result.data`
- **Verification**: Knock page shows recent activity (7 knocks visible as reported)

---

## Forest Analysis: Systemic Implications

### Pattern: "UI Without Backend Wiring"

This is the **same pattern** identified throughout the efficiency audit (HANDOFF.md). Infrastructure gets built, UI gets designed, but the connection between them is missing.

**Why this happens**:
1. Features developed in isolation (backend team, frontend team)
2. No integration testing at the feature level
3. PRs merged based on "code looks right" not "feature works"
4. No acceptance testing against user stories

### Upstream Implications

**1. Development Process Gap**
- These aren't regressions - they're incomplete implementations
- PRs are being merged without functional verification
- Suggests need for feature-level acceptance criteria

**2. API Response Contract Confusion**
The `result.pins` bug indicates developer confusion about the standard response wrapper. Multiple components have defensive patterns like:
```tsx
result.data?.photos || result.photos || []
```
This defensive coding suggests the contract isn't clear or consistently followed.

**3. User Attribution Gap**
The "Team Member" issue indicates **activity attribution is not being tracked consistently**. This affects:
- Gamification (whose points?)
- Performance tracking (who did what?)
- Audit trails (compliance)
- Accountability

### Downstream Implications

**1. User Trust**
Clicking buttons that do nothing erodes user confidence. Users will:
- Stop trying to use features
- Assume the app is broken
- Report bugs that aren't really bugs

**2. Gamification System Integrity**
The Weekly Challenge widget shows stats but users can't interact. The gamification system appears half-built from the user's perspective, even though backend is complete.

**3. Data Quality**
Without user attribution, activity data loses forensic value. "Someone created this project" is less useful than "Ted created this project at 3pm".

---

## Recommendations (Sniper Execution Order)

### Immediate (This Session)

1. **[DASH-005] Fix Knock page data access** - 2 minutes
   - Change `result.pins` to `result.data` at knocks/page.tsx:123
   - Highest impact for effort ratio

2. **[DASH-001] Wire leaderboard button** - 5 minutes
   - Add onClick to open Leaderboard in dialog/modal
   - Backend already complete

### Near-Term (Next Session)

3. **[DASH-003] Fix user attribution in activity** - 15 minutes
   - Modify activity API to include created_by with user lookup
   - Requires API change + minor frontend adjustment

4. **[DASH-004] Make activity items clickable** - 15 minutes
   - Wrap items in Link based on activity type
   - Straightforward, no backend changes needed

### Deferred (Lower Priority)

5. **[DASH-002] Points display interactivity** - Decision needed
   - Quick: Add tooltip explaining it's display-only
   - Full: Build period breakdown view
   - Recommend quick fix unless user research indicates need

---

## Related Findings in HANDOFF.md

These issues connect to previously documented patterns:

| HANDOFF Issue | Connection |
|---------------|------------|
| CW-001 (Homeowner gate) | Same "infrastructure exists, wiring missing" pattern |
| NAV-001 (Field mode simplification) | UI suggests functionality that doesn't deliver |
| GAM-001 (Points not clickable) | Exact same issue |
| CC-002 (Error handling patterns) | Activity API follows inconsistent patterns |

---

## Verification Checklist (For Sniper)

After fixes:
- [ ] Knock page shows 7 pins in Recent Activity
- [ ] View Leaderboard button opens leaderboard view
- [ ] Activity items show actual user names
- [ ] Activity items are clickable and navigate correctly
- [ ] `npm run build` succeeds
- [ ] `npm run typecheck` passes

---

## Appendix: Files Examined

| File | Lines | Purpose |
|------|-------|---------|
| `app/[locale]/(dashboard)/dashboard/page.tsx` | 98 | Dashboard layout |
| `components/dashboard/WeeklyChallengeWidget.tsx` | 282 | Challenge widget with buttons |
| `components/gamification/PointsDisplay.tsx` | 133 | Points display component |
| `components/dashboard/ActivityFeed.tsx` | 277 | Activity feed component |
| `app/[locale]/(dashboard)/knocks/page.tsx` | 501 | Knocks page |
| `app/api/pins/route.ts` | 419 | Pins/Knocks API |
| `app/api/dashboard/activity/route.ts` | 157 | Activity feed API |
| `lib/api/response.ts` | 133 | API response helpers |
| `components/gamification/Leaderboard.tsx` | 254 | Full leaderboard component |
| `app/api/gamification/leaderboard/route.ts` | 239 | Leaderboard API |

---

*Scout role complete. Targets identified. Ready for sniper execution.*
