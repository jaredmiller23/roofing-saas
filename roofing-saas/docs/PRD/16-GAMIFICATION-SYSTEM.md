# Gamification System

## Overview

The Gamification System provides a comprehensive incentive and engagement framework to motivate sales teams in the roofing industry. It awards points for productive activities, tracks achievements, maintains leaderboards across multiple metrics, and supports weekly challenges. The system integrates directly with core CRM operations (contacts, territories, photos) to automatically award points for user actions.

## User Stories

### Sales Representatives
- As a sales rep, I want to see my points and level so that I can track my progress
- As a sales rep, I want to view leaderboards so that I can see how I compare to teammates
- As a sales rep, I want to earn achievements for milestones so that I feel recognized
- As a sales rep, I want to see weekly challenges so that I have clear goals to pursue

### Office Staff / Managers
- As a manager, I want to view team leaderboards so that I can identify top performers
- As a manager, I want to track weekly challenge standings so that I can announce winners
- As a manager, I want to see achievement progress so that I can recognize team accomplishments

### Business Owners
- As an owner, I want the gamification system to motivate my team so that productivity increases
- As an owner, I want to offer tangible rewards tied to performance so that employees stay engaged
- As an owner, I want to track gamification metrics so that I can measure ROI on incentive programs

## Features

### 1. Points System

The core of gamification is a points-based reward system that awards users for completing valuable activities.

**Point Values (POINT_VALUES constant):**

| Action | Points | Description |
|--------|--------|-------------|
| CONTACT_CREATED | 10 | Creating a new contact |
| CONTACT_QUALIFIED | 20 | Qualifying a lead |
| CONTACT_CONVERTED | 50 | Converting to customer |
| PHOTO_UPLOADED | 5 | Uploading property photos |
| PHOTO_SET_COMPLETED | 25 | Uploading 5+ photos for a property |
| TERRITORY_CREATED | 10 | Creating a new territory |
| TERRITORY_COMPLETED | 30 | Completing territory canvassing |
| PROJECT_CREATED | 15 | Creating a new project |
| PROJECT_WON | 100 | Winning a project/deal |
| PROJECT_MILESTONE | 25 | Completing project milestone |
| CALL_COMPLETED | 5 | Completing a phone call |
| SMS_SENT | 2 | Sending an SMS |
| EMAIL_SENT | 3 | Sending an email |
| APPOINTMENT_SET | 20 | Setting an appointment |
| DOOR_KNOCK_LOGGED | 3 | Logging a door knock |
| DOOR_KNOCK_STREAK_BONUS | 10 | Bonus for 10+ doors in a day |
| FIRST_ACTIVITY_OF_DAY | 5 | First daily activity |
| EARLY_BIRD_BONUS | 10 | Activity before 9 AM |

**Implementation:**
- File: `lib/gamification/award-points.ts`
- Key functions: `awardPoints()`, `awardPointsSafe()`

### 2. Level System

Users progress through levels based on total points accumulated:

- **Level Calculation:** `Math.floor(total_points / 100) + 1`
- Each level requires 100 points
- Progress bar shows advancement to next level

**Implementation:**
- File: `components/gamification/PointsDisplay.tsx`
- Displays: Current level, total points, daily/weekly/monthly points

### 3. Leaderboard System

Three distinct leaderboard types for tracking different performance metrics:

#### Points Leaderboard
- Tracks total gamification points
- Pulls from `leaderboard` database view
- Supports period filters: daily, weekly, monthly, all-time

#### Knocks Leaderboard
- Tracks door knock activities
- Aggregates from `activities` table where type = 'door_knock'
- Period-filtered counts

#### Sales Leaderboard
- Tracks won projects/deals
- Aggregates from `projects` table where status = 'won'
- Period-filtered counts

**Leaderboard Features:**
- Rank icons: Crown (1st), Medal (2nd), Award (3rd)
- User avatars with fallback initials
- Current user highlight
- User's rank display
- Achievement badges on entries

**Achievement Badges on Leaderboard:**
| Badge | Criteria | Color |
|-------|----------|-------|
| Top Performer | Rank #1 | Yellow |
| High Achiever | Level 5+ | Purple |
| Rising Star | Top 5 with Level ≤3 | Green |
| Consistent Closer | 1000+ points | Blue |

**Implementation:**
- File: `app/api/gamification/leaderboard/route.ts`
- Component: `components/gamification/Leaderboard.tsx`

### 4. Achievements System

Predefined milestones that users can unlock:

| Achievement | Icon | Requirement | Points Reward |
|-------------|------|-------------|---------------|
| First Steps | 🚪 | Knock 1 door | 10 |
| Conversation Starter | 💬 | 5 conversations | 25 |
| Appointment Setter | 📅 | 1 appointment | 50 |
| Closer | 🎯 | 1 sale | 200 |
| Door Warrior | 🏆 | 100 doors | 100 |
| Sales Master | 👑 | 10 sales | 500 |
| Streak Runner | 🔥 | 7-day streak | 150 |
| Photo Pro | 📸 | 50 photos | 75 |
| Team Player | ⭐ | 1000 points | 200 |
| Legend | 🌟 | 5000 points | 1000 |

**Achievement Features:**
- Category filtering
- Progress tracking
- Unlock date display
- Visual locked/unlocked states

**Implementation:**
- File: `app/api/gamification/achievements/route.ts`
- Component: `components/gamification/Achievements.tsx`
- Tables: `gamification_achievements`, `gamification_user_achievements`

### 5. Weekly Challenges

Dynamic weekly competitions with rotating themes:

**Challenge Rotation:**
1. Most Deals Closed
2. Highest Revenue
3. Top Door Knocker
4. Lead Generation Master

**Challenge Features:**
- Top 3 leaders display
- Countdown to reset (Mondays)
- Medal colors (gold, silver, bronze)
- Points-based ranking

**Rewards Structure:**
| Place | Reward |
|-------|--------|
| 1st | $500 bonus + paid day off |
| 2nd | $300 bonus + gift card |
| 3rd | $150 bonus |

**Implementation:**
- Component: `components/dashboard/WeeklyChallengeWidget.tsx`

### 6. Streak Tracking

Consecutive day activity tracking for habit building:

**Streak Types:**
- `daily_activity` - Door knocks and conversations
- `sales_streak` - Closed sales

**Streak Logic:**
- Same day activity: No change
- Consecutive day: Increment streak
- Gap: Reset to 1
- Tracks: current_streak, longest_streak, last_activity_date

**Implementation:**
- Database function: `update_streaks()`
- Table: `user_streaks`

### 7. Incentives Page

Dedicated gamification hub at `/incentives`:

**Page Sections:**
1. Points Display - Current stats
2. Weekly Challenge Widget - Current competition
3. Achievements Card - Recent accomplishments
4. Rewards & Prizes - What can be earned
5. Team Leaderboards - Knocks and Sales
6. Overall Points Leaderboard

**Implementation:**
- File: `app/(dashboard)/incentives/page.tsx`

## Technical Implementation

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Incentives Page                         │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │PointsDisplay│  │WeeklyChallenge│ │  Achievements   │   │
│  └──────┬──────┘  └───────┬──────┘  └────────┬────────┘   │
│         │                 │                   │            │
│  ┌──────┴─────────────────┴───────────────────┴──────┐    │
│  │                 Leaderboard Components             │    │
│  │  [Knocks]        [Sales]         [Points]         │    │
│  └──────────────────────┬────────────────────────────┘    │
└─────────────────────────┼──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                              │
│  ┌────────────────┐  ┌────────────┐  ┌──────────────────┐ │
│  │/api/gamification│  │/api/gami...│  │/api/gamification │ │
│  │   /points      │  │/leaderboard│  │  /achievements   │ │
│  └───────┬────────┘  └──────┬─────┘  └────────┬─────────┘ │
└──────────┼──────────────────┼─────────────────┼────────────┘
           │                  │                 │
           ▼                  ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                           │
│  ┌─────────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │gamification_    │  │ leaderboard │  │gamification_  │  │
│  │scores           │  │   (view)    │  │achievements   │  │
│  └─────────────────┘  └─────────────┘  └───────────────┘  │
│  ┌─────────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │gamification_    │  │ user_points │  │user_achievements│ │
│  │activities       │  │             │  │               │  │
│  └─────────────────┘  └─────────────┘  └───────────────┘  │
│  ┌─────────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │ user_streaks    │  │ challenges  │  │user_challenges│  │
│  └─────────────────┘  └─────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `lib/gamification/award-points.ts` | Points awarding helper functions | 143 |
| `app/api/gamification/points/route.ts` | GET/POST points API | 117 |
| `app/api/gamification/leaderboard/route.ts` | Leaderboard API with type filtering | 207 |
| `app/api/gamification/achievements/route.ts` | Achievements API | 70 |
| `components/gamification/PointsDisplay.tsx` | Points and level UI | 114 |
| `components/gamification/Leaderboard.tsx` | Leaderboard UI component | 254 |
| `components/gamification/Achievements.tsx` | Achievements UI component | 184 |
| `components/dashboard/WeeklyChallengeWidget.tsx` | Weekly challenge widget | 168 |
| `app/(dashboard)/incentives/page.tsx` | Gamification hub page | 162 |

### Database Functions

#### award_points()
```sql
CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id UUID,
  p_points INTEGER,
  p_reason TEXT,
  p_activity_id UUID DEFAULT NULL
) RETURNS VOID
```

**Purpose:** Awards points to a user and logs the activity.

**Actions:**
1. Gets user's tenant_id from tenant_users
2. Inserts/updates gamification_scores (total_points, current_level)
3. Logs activity to gamification_activities
4. Updates weekly/monthly point totals
5. Resets counters when new week/month detected

#### check_achievements()
```sql
CREATE OR REPLACE FUNCTION public.check_achievements(
  p_user_id UUID
) RETURNS JSONB
```

**Purpose:** Checks if user has earned new achievements.

**Returns:** JSON array of newly earned achievements

**Checks:**
- First Steps (1+ doors)
- Appointment Setter (1+ appointments)
- Closer (1+ deals)
- Door Warrior (100+ doors)
- Team Player (1000+ points)
- Legend (5000+ points)

### Data Flow

#### Points Award Flow
```
User Action (e.g., create contact)
         │
         ▼
API Route (e.g., /api/contacts)
         │
         ├── Main operation (create contact)
         │
         ▼
awardPointsSafe(userId, POINT_VALUES.CONTACT_CREATED, reason, activityId)
         │
         ▼
award_points() RPC call
         │
         ├── Update gamification_scores
         ├── Insert gamification_activities
         └── check_achievements() called automatically
                    │
                    └── Returns any new achievements
```

#### Leaderboard Query Flow
```
GET /api/gamification/leaderboard?period=weekly&type=knocks
         │
         ▼
Parse query params (period, limit, type)
         │
         ├── type=knocks → Query activities table
         ├── type=sales → Query projects table
         └── type=points → Query leaderboard view
                    │
                    ▼
Aggregate counts by user
         │
         ▼
Get user names from auth.users
         │
         ▼
Build and sort leaderboard
         │
         ▼
Return with currentUserRank
```

## API Endpoints

### GET /api/gamification/points
- **Purpose:** Get current user's points and level
- **Auth:** Required
- **Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "total_points": 1250,
    "current_level": 13,
    "daily_points": 45,
    "weekly_points": 320,
    "monthly_points": 890,
    "all_time_best_daily": 125,
    "all_time_best_weekly": 500,
    "all_time_best_monthly": 1800
  }
}
```

### POST /api/gamification/points
- **Purpose:** Award points to current user
- **Auth:** Required
- **Body:**
```json
{
  "points": 10,
  "reason": "contact_created",
  "activity_id": "uuid"
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "points_awarded": 10,
    "new_achievements": []
  }
}
```

### GET /api/gamification/leaderboard
- **Purpose:** Get leaderboard data
- **Auth:** Required
- **Query Params:**
  - `period`: daily | weekly | monthly | all (default: all)
  - `limit`: number (default: 10)
  - `type`: points | knocks | sales (default: points)
- **Response:**
```json
{
  "success": true,
  "data": {
    "period": "weekly",
    "type": "knocks",
    "leaderboard": [
      {
        "rank": 1,
        "user_id": "uuid",
        "name": "John Smith",
        "avatar_url": null,
        "role": null,
        "points": 145,
        "level": 2,
        "isCurrentUser": false
      }
    ],
    "currentUserRank": 5
  }
}
```

### GET /api/gamification/achievements
- **Purpose:** Get all achievements with user's unlock status
- **Auth:** Required
- **Response:**
```json
{
  "success": true,
  "data": {
    "achievements": [
      {
        "id": "uuid",
        "name": "First Steps",
        "description": "Knock on your first door",
        "icon": "trophy",
        "points_required": null,
        "category": "activity",
        "unlocked": true,
        "unlocked_at": "2025-10-01T..."
      }
    ],
    "total": 10,
    "unlocked": 4
  }
}
```

## Data Models

### gamification_scores
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant reference |
| user_id | UUID | User reference |
| total_points | INTEGER | All-time points |
| current_level | INTEGER | Calculated level |
| daily_points | INTEGER | Today's points |
| weekly_points | INTEGER | This week's points |
| monthly_points | INTEGER | This month's points |
| all_time_best_daily | INTEGER | Best daily record |
| all_time_best_weekly | INTEGER | Best weekly record |
| all_time_best_monthly | INTEGER | Best monthly record |
| doors_knocked | INTEGER | Total doors stat |
| appointments_set | INTEGER | Total appointments |
| deals_closed | INTEGER | Total deals |
| achievements | JSONB | User's achievements |
| last_activity_date | DATE | Last activity |
| created_at | TIMESTAMPTZ | Creation time |
| updated_at | TIMESTAMPTZ | Last update |

### gamification_achievements
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Achievement name (unique) |
| description | TEXT | Display description |
| icon | TEXT | Icon name or emoji |
| points_required | INTEGER | Points threshold |
| category | TEXT | Category for filtering |
| created_at | TIMESTAMPTZ | Creation time |
| updated_at | TIMESTAMPTZ | Last update |

### gamification_user_achievements
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant reference |
| user_id | UUID | User reference |
| achievement_id | UUID | Achievement reference |
| unlocked_at | TIMESTAMPTZ | When unlocked |
| created_at | TIMESTAMPTZ | Creation time |

### user_points (Alternative Schema)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant reference |
| user_id | UUID | User reference |
| action_type | TEXT | Action that earned points |
| points_earned | INTEGER | Points for this action |
| activity_id | UUID | Related activity |
| contact_id | UUID | Related contact |
| project_id | UUID | Related project |
| metadata | JSONB | Additional data |
| earned_at | TIMESTAMPTZ | When earned |
| created_at | TIMESTAMPTZ | Creation time |

### challenges
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Optional tenant scope |
| title | TEXT | Challenge title |
| description | TEXT | Challenge description |
| challenge_type | TEXT | daily, weekly, special |
| requirement_type | TEXT | doors_knocked, etc. |
| requirement_value | INTEGER | Target value |
| points_reward | INTEGER | Points for completion |
| start_date | DATE | Challenge start |
| end_date | DATE | Challenge end |
| is_active | BOOLEAN | Active status |

### user_streaks
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant reference |
| user_id | UUID | User reference |
| streak_type | TEXT | Type of streak |
| current_streak | INTEGER | Current count |
| longest_streak | INTEGER | Best ever |
| last_activity_date | DATE | Last contribution |

## Database Indexes

```sql
-- Points tracking
CREATE INDEX idx_user_points_tenant_user ON user_points(tenant_id, user_id);
CREATE INDEX idx_user_points_earned_at ON user_points(earned_at DESC);

-- Achievements
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);

-- Challenges
CREATE INDEX idx_user_challenges_user ON user_challenges(user_id);
CREATE INDEX idx_user_challenges_active ON user_challenges(challenge_id, is_completed);

-- Streaks
CREATE INDEX idx_user_streaks_user ON user_streaks(user_id);

-- Performance indexes
CREATE INDEX idx_points_transactions_user ON points_transactions(user_id, created_at DESC);
CREATE INDEX idx_achievements_user ON achievements(user_id, unlocked_at DESC);
```

## RLS Policies

### point_rules
- SELECT: All authenticated users can view

### user_points
- SELECT: Users can view points in their tenant
- INSERT: Users can insert points in their tenant

### achievements
- SELECT: All authenticated users can view active achievements

### user_achievements
- SELECT: Users can view achievements in their tenant
- INSERT: System can insert user achievements

### challenges
- SELECT: Users can view active challenges (system-wide or their tenant)

### user_challenges
- SELECT/UPDATE: Users can view/update their own challenge progress

### user_streaks
- SELECT: Users can view streaks in their tenant
- ALL: Users can manage their own streaks

## Integration Points

### Contact Management
- **File:** `app/api/contacts/route.ts`
- **Integration:** Awards `CONTACT_CREATED` points on POST

### Territory Management
- **File:** `app/api/territories/route.ts`
- **Integration:** Awards `TERRITORY_CREATED` points on POST

### Photo Upload
- **File:** `app/api/photos/upload/route.ts`
- **Integration:** Awards `PHOTO_UPLOADED` points on upload
- **Bonus:** Awards `PHOTO_SET_COMPLETED` every 5 photos

### Activity Tracking
- Points can be linked to activities via `activity_id`
- Streaks updated on door_knock and conversation activities

### Automation Engine
- Workflows can trigger point awards
- Achievements checked after point awards

## Configuration

### Environment Variables
None specific to gamification - uses standard Supabase connection.

### Point Values
Configured in `lib/gamification/award-points.ts`:
```typescript
export const POINT_VALUES = {
  CONTACT_CREATED: 10,
  CONTACT_QUALIFIED: 20,
  // ... etc
}
```

### Level Thresholds
- 100 points per level
- Calculated: `FLOOR(total_points / 100) + 1`

## Security

### Authentication
- All API endpoints require authenticated user
- User ID extracted from Supabase auth

### Multi-Tenancy
- Points scoped to tenant via tenant_id
- Leaderboards show only tenant users
- RLS policies enforce tenant isolation

### Non-Blocking Design
- `awardPointsSafe()` catches errors silently
- Gamification failures don't break core operations
- Logged for monitoring

## Testing

### E2E Test Coverage
- File: `e2e/ui-crawler.spec.ts`
- Tests gamification features at `/gamification`
- Tests incentives page at `/incentives`

### Manual Testing
1. Create contact → Verify points awarded
2. Upload photos → Verify photo points and bonus
3. Check leaderboard → Verify period filtering
4. View achievements → Verify unlock status

## Performance Considerations

### Caching
- Leaderboard data aggregated per request
- Consider caching for high-traffic deployments

### Async Points
- `awardPointsSafe()` is non-blocking
- Points awarded in background

### Index Optimization
- Indexes on frequently queried columns
- Composite indexes for leaderboard queries

## Future Enhancements

1. **Push Notifications** - Alert users to new achievements
2. **Team Challenges** - Group competitions
3. **Custom Rewards** - Admin-defined prize structures
4. **Point Multipliers** - Seasonal or promotional bonuses
5. **Achievement Categories** - More granular filtering
6. **Social Sharing** - Share achievements externally
7. **Real-time Leaderboards** - WebSocket updates
8. **Mobile Gamification Widget** - PWA dashboard integration

---

## Validation Record

### Files Examined
1. `/Users/ccai/roofing saas/roofing-saas/lib/gamification/award-points.ts` - Points helper with POINT_VALUES constant (143 lines)
2. `/Users/ccai/roofing saas/roofing-saas/app/api/gamification/points/route.ts` - Points API GET/POST (117 lines)
3. `/Users/ccai/roofing saas/roofing-saas/app/api/gamification/leaderboard/route.ts` - Leaderboard API with 3 types (207 lines)
4. `/Users/ccai/roofing saas/roofing-saas/app/api/gamification/achievements/route.ts` - Achievements API (70 lines)
5. `/Users/ccai/roofing saas/roofing-saas/components/gamification/PointsDisplay.tsx` - Points display component (114 lines)
6. `/Users/ccai/roofing saas/roofing-saas/components/gamification/Leaderboard.tsx` - Leaderboard component (254 lines)
7. `/Users/ccai/roofing saas/roofing-saas/components/gamification/Achievements.tsx` - Achievements component (184 lines)
8. `/Users/ccai/roofing saas/roofing-saas/components/dashboard/WeeklyChallengeWidget.tsx` - Weekly challenge widget (168 lines)
9. `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/incentives/page.tsx` - Incentives page (162 lines)
10. `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/archive/phase3/20251002_create_gamification_tables.sql` - Table definitions (454 lines)
11. `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251002_gamification_functions.sql` - Database functions (199 lines)
12. `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251004_performance_indexes.sql` - Performance indexes (96 lines)
13. `/Users/ccai/roofing saas/roofing-saas/app/api/contacts/route.ts` - Contact API with points integration
14. `/Users/ccai/roofing saas/roofing-saas/app/api/territories/route.ts` - Territory API with points integration
15. `/Users/ccai/roofing saas/roofing-saas/app/api/photos/upload/route.ts` - Photo upload with points integration
16. `/Users/ccai/roofing saas/roofing-saas/e2e/ui-crawler.spec.ts` - E2E test references

### Directory Structure Verified
```
lib/gamification/
  award-points.ts

app/api/gamification/
  achievements/route.ts
  leaderboard/route.ts
  points/route.ts

components/gamification/
  Achievements.tsx
  Leaderboard.tsx
  PointsDisplay.tsx
```

### Archon RAG Queries
- Query: "gamification points system achievements leaderboard" - No relevant domain-specific docs found

### Verification Steps
1. Read all gamification API route files - Verified GET/POST handlers and data flow
2. Read all gamification UI components - Verified state management and API calls
3. Read database migration files - Verified table schemas, indexes, and RLS policies
4. Verified points integration in contacts, territories, photos APIs via grep
5. Confirmed file existence via ls commands
6. Confirmed E2E test coverage via grep

### Validated By
PRD Documentation Agent - Session 18
Date: 2025-12-11T15:07:00Z
