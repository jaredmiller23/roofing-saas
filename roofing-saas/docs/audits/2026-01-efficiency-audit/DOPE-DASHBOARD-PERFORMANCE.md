# DOPE: Dashboard Performance Optimization

**Document Type**: Design & Operational Planning for Execution
**Created**: 2026-01-13
**Status**: Ready for execution

---

## Problem Statement

Dashboard load times are unacceptable: **8-10 seconds** to load. A senior engineer would consider this a critical issue for a production application. Users experience:

- 9,978ms to load dashboard page
- 8,444ms to load contacts page (likely same root causes)

This destroys user experience and violates our "works on a phone, on a roof, in a truck" principle.

---

## Root Cause Analysis

### Architecture Issue: Widget Explosion

The dashboard page renders **7 parallel widgets**, each making independent API calls:

| Widget | API Endpoint | Queries |
|--------|--------------|---------|
| DashboardMetrics | `/api/dashboard/metrics` | 8-10 |
| ActivityFeed | `/api/dashboard/activity` | 3 |
| WeeklyChallengeWidget | `/api/dashboard/weekly-challenge` | 2 |
| Leaderboard (knocks) | `/api/gamification/leaderboard?type=knocks` | 3 |
| Leaderboard (sales) | `/api/gamification/leaderboard?type=sales` | 3 |
| PointsDisplay | `/api/gamification/points` | 1 |
| WeatherWidget | External API | 1 (cached) |

**Total: 21-23 database queries per page load**

### Critical Performance Issues

#### 1. Unbounded Queries (SEVERE)

**Leaderboard API** (`app/api/gamification/leaderboard/route.ts`):
```typescript
// Lines 95-100: Fetches ALL activities with NO LIMIT
const { data: knockCounts } = await supabase
  .from('activities')
  .select('created_by')
  .eq('tenant_id', tenantId)
  .eq('type', 'door_knock')
  .gte('created_at', getDateByPeriod(period))
  // NO .limit() - fetches EVERYTHING then aggregates in JS
```

For a tenant with 10,000+ door knock activities, this downloads all 10,000 records to count them.

**Weekly Challenge API** (`app/api/dashboard/weekly-challenge/route.ts`):
```typescript
// Lines 36-42: Same pattern - fetches ALL activities
const { data: allKnockActivities } = await supabase
  .from('activities')
  .select('created_by')
  .eq('tenant_id', tenantId)
  .eq('type', 'door_knock')
  .gte('created_at', weekStart.toISOString())
  // NO .limit() - aggregates in JS
```

#### 2. Duplicate User Lookups (MEDIUM)

`getUserInfoMap()` called by leaderboard fetches ALL tenant users on every request:
```typescript
// Lines 42-64: RPC call for every leaderboard load
const { data: users } = await supabase.rpc('get_tenant_users_with_info', {
  p_tenant_id: tenantId
})
```

#### 3. No HTTP Caching (MEDIUM)

Most endpoints return no cache headers, forcing full re-fetch on every navigation.

#### 4. Sequential Queries in Activity Feed (LOW)

Activity feed makes 3 sequential queries that could be parallelized or combined.

---

## Recommended Solutions

### Phase 1: Quick Wins (High Impact, Low Effort)

#### 1.1 Database-Side Aggregation for Leaderboard

**Current**: Fetch all rows → count in JavaScript
**Fix**: Use Supabase RPC with SQL aggregation

**File**: Create `supabase/migrations/20260113000000_leaderboard_aggregation.sql`

```sql
-- Knock leaderboard by period
CREATE OR REPLACE FUNCTION get_knock_leaderboard(
  p_tenant_id UUID,
  p_since TIMESTAMPTZ,
  p_limit INT DEFAULT 10
) RETURNS TABLE(
  user_id UUID,
  knock_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT a.created_by, COUNT(*) as knock_count
  FROM activities a
  WHERE a.tenant_id = p_tenant_id
    AND a.type = 'door_knock'
    AND a.created_at >= p_since
  GROUP BY a.created_by
  ORDER BY knock_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sales leaderboard by period
CREATE OR REPLACE FUNCTION get_sales_leaderboard(
  p_tenant_id UUID,
  p_since TIMESTAMPTZ,
  p_limit INT DEFAULT 10
) RETURNS TABLE(
  user_id UUID,
  sales_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.created_by, COUNT(*) as sales_count
  FROM projects p
  WHERE p.tenant_id = p_tenant_id
    AND p.status = 'won'
    AND p.updated_at >= p_since
    AND p.is_deleted = false
  GROUP BY p.created_by
  ORDER BY sales_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Weekly challenge participant count
CREATE OR REPLACE FUNCTION get_weekly_challenge_stats(
  p_tenant_id UUID,
  p_user_id UUID,
  p_since TIMESTAMPTZ
) RETURNS TABLE(
  user_knock_count BIGINT,
  participant_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM activities
     WHERE tenant_id = p_tenant_id AND type = 'door_knock'
     AND created_by = p_user_id AND created_at >= p_since),
    (SELECT COUNT(DISTINCT created_by) FROM activities
     WHERE tenant_id = p_tenant_id AND type = 'door_knock'
     AND created_at >= p_since);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Impact**: Eliminates 10,000+ row downloads, reduces to single row per RPC call.

#### 1.2 Update Leaderboard API to Use RPC

**File**: `app/api/gamification/leaderboard/route.ts`

Replace lines 93-134 (knocks section):
```typescript
if (type === 'knocks') {
  const { data: knockData, error } = await supabase.rpc('get_knock_leaderboard', {
    p_tenant_id: tenantId,
    p_since: getDateByPeriod(period),
    p_limit: limit
  })

  if (error) throw InternalError('Failed to fetch knock leaderboard')

  leaderboard = (knockData || []).map(row => {
    const userInfo = userInfoMap.get(row.user_id)
    return {
      user_id: row.user_id,
      user_name: userInfo?.name || 'Unknown',
      knock_count: Number(row.knock_count),
      avatar_url: userInfo?.avatar_url || null
    }
  })
}
```

#### 1.3 Update Weekly Challenge API to Use RPC

**File**: `app/api/dashboard/weekly-challenge/route.ts`

Replace lines 36-66:
```typescript
const { data: stats, error } = await supabase.rpc('get_weekly_challenge_stats', {
  p_tenant_id: tenantId,
  p_user_id: user.id,
  p_since: weekStart.toISOString()
})

if (error) throw new Error('Failed to fetch weekly challenge data')

const userKnockCount = Number(stats?.[0]?.user_knock_count || 0)
const participantCount = Number(stats?.[0]?.participant_count || 0)
```

**Impact**: 2 queries → 1 query, eliminates unbounded fetch.

---

### Phase 2: Medium Effort Optimizations

#### 2.1 Add HTTP Caching Headers

**Files**: All dashboard API routes

Add cache headers for short-lived caching (revalidation on stale):
```typescript
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'private, max-age=30, stale-while-revalidate=60'
  }
})
```

This allows browser to serve cached data while revalidating in background.

#### 2.2 Cache User Info Map

**File**: `app/api/gamification/leaderboard/route.ts`

The `getUserInfoMap()` call fetches all users every time. Options:
- Cache in memory with TTL (5 minutes)
- Move to React Query client-side with staleTime
- Create a dedicated user service with caching

**Simple fix**: Add 5-minute in-memory cache:
```typescript
const USER_CACHE = new Map<string, { data: Map<string, UserInfo>; expires: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getUserInfoMapCached(supabase, tenantId) {
  const cached = USER_CACHE.get(tenantId)
  if (cached && cached.expires > Date.now()) {
    return cached.data
  }

  const data = await getUserInfoMap(supabase, tenantId)
  USER_CACHE.set(tenantId, { data, expires: Date.now() + CACHE_TTL })
  return data
}
```

---

### Phase 3: Architecture Improvements (Longer Term)

#### 3.1 Consolidated Dashboard API

Instead of 7 API calls, create a single consolidated endpoint:

**File**: `app/api/dashboard/consolidated/route.ts`

```typescript
export async function GET(request: NextRequest) {
  // Fetch all dashboard data in parallel with single auth check
  const [metrics, activity, challenge, knockLeaders, salesLeaders, points] =
    await Promise.all([
      getMetrics(supabase, tenantId, scope),
      getActivityFeed(supabase, tenantId),
      getWeeklyChallenge(supabase, tenantId, userId),
      getKnockLeaderboard(supabase, tenantId),
      getSalesLeaderboard(supabase, tenantId),
      getUserPoints(supabase, userId)
    ])

  return NextResponse.json({ metrics, activity, challenge, knockLeaders, salesLeaders, points })
}
```

**Benefits**:
- Single auth check instead of 7
- Single Supabase client creation instead of 7
- Server-side parallel execution is faster than client-side
- Single HTTP request instead of 7

#### 3.2 Database Indexes

Ensure proper indexes exist for common query patterns:

```sql
-- Activities by tenant, type, and date (for leaderboards)
CREATE INDEX IF NOT EXISTS idx_activities_tenant_type_created
ON activities(tenant_id, type, created_at);

-- Projects by tenant, status, and updated_at (for sales leaderboard)
CREATE INDEX IF NOT EXISTS idx_projects_tenant_status_updated
ON projects(tenant_id, status, updated_at)
WHERE is_deleted = false;
```

---

## Implementation Plan

### Execution Order

| Phase | Task | Est. Time | Impact |
|-------|------|-----------|--------|
| 1.1 | Create SQL aggregation functions | 30 min | HIGH |
| 1.2 | Update leaderboard API | 30 min | HIGH |
| 1.3 | Update weekly-challenge API | 20 min | HIGH |
| 2.1 | Add HTTP cache headers | 20 min | MEDIUM |
| 2.2 | Cache user info map | 30 min | MEDIUM |
| 3.1 | Consolidated dashboard API | 2 hours | HIGH |
| 3.2 | Database indexes | 15 min | MEDIUM |

**Recommended**: Start with Phase 1 (Quick Wins) for immediate 50-70% improvement.

---

## Files to Modify

### New Files
| File | Purpose |
|------|---------|
| `supabase/migrations/20260113000000_leaderboard_aggregation.sql` | SQL functions for aggregation |

### Modified Files
| File | Change |
|------|--------|
| `app/api/gamification/leaderboard/route.ts` | Use RPC instead of client-side aggregation |
| `app/api/dashboard/weekly-challenge/route.ts` | Use RPC for stats |
| All dashboard API routes | Add cache headers |

---

## Expected Results

### Before
- Dashboard load: **8-10 seconds**
- Database queries: **21-23 per load**
- Data transferred: **Potentially 10,000+ rows**

### After Phase 1
- Dashboard load: **2-3 seconds** (estimated 60-70% improvement)
- Database queries: **15-17 per load**
- Data transferred: **< 100 rows total**

### After All Phases
- Dashboard load: **< 1 second** (target)
- Database queries: **5-7 per load** (consolidated API)
- Data transferred: **< 50 rows total**

---

## Verification Checklist

- [ ] `npm run build` succeeds
- [ ] `npm run typecheck` passes
- [ ] SQL migration executes without errors
- [ ] Dashboard loads in < 3 seconds (Phase 1 target)
- [ ] All widgets display correct data
- [ ] Leaderboard shows correct rankings
- [ ] Weekly challenge shows correct counts
- [ ] No console errors in browser

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| SQL function bugs | Medium | Test with sample data before migration |
| Cache stale data | Low | Use short TTLs (30-60 seconds) |
| Breaking existing behavior | Medium | Compare before/after data for same user |

---

## Out of Scope

- Weather widget optimization (already uses external caching)
- Mobile-specific optimizations (separate effort)
- Real-time updates (WebSocket) - future enhancement
