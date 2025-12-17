# VEST Execution Plan - Foundation Stabilization

**Created**: December 17, 2025
**Purpose**: Execution-ready task specifications for VEST sessions
**Goal**: Get codebase to 100% stability before feature development

---

## Execution Phases

| Phase | Focus | Tasks | Risk |
|-------|-------|-------|------|
| **0** | Stop Crashes | Fix table name mismatches | Low |
| **1** | Remove Dead Code | Delete unreachable code, .bak files | Low |
| **2** | Create Missing Tables | Add tables for intended features | Medium |
| **3** | Security & Infrastructure | Headers, CI/CD | Low |
| **4** | Polish | Env docs, automation consolidation | Low |

---

## Phase 0: Stop Crashes (Execute First)

These tasks fix runtime errors. Execute in order.

### VEST-P0-001: Fix Gamification Table Name Mismatches

**Priority**: CRITICAL
**Risk**: Low (string replacements only)
**Time**: 15 minutes

**Problem**: Code references tables with `_configs` suffix, but production uses simpler names.

| Code Uses | Production Has | Action |
|-----------|----------------|--------|
| `challenge_configs` | `challenges` | Change code |
| `point_rule_configs` | `point_rules` | Change code |
| `reward_configs` | (doesn't exist) | Create table |
| `kpi_definitions` | `kpi_snapshots` | Change code OR create table |

**Files to Modify**:

```
app/api/gamification/challenges/route.ts
  Line 31: .from('challenge_configs') → .from('challenges')
  Line 76: .from('challenge_configs') → .from('challenges')

app/api/gamification/challenges/[id]/route.ts
  Line 44: .from('challenge_configs') → .from('challenges')
  Line 90: .from('challenge_configs') → .from('challenges')

app/api/gamification/point-rules/route.ts
  Line 38: .from('point_rule_configs') → .from('point_rules')
  Line 94: .from('point_rule_configs') → .from('point_rules')

app/api/gamification/point-rules/[id]/route.ts
  Line 55: .from('point_rule_configs') → .from('point_rules')
  Line 115: .from('point_rule_configs') → .from('point_rules')

app/api/gamification/kpis/route.ts
  Line 34: .from('kpi_definitions') → .from('kpi_snapshots')
  Line 82: .from('kpi_definitions') → .from('kpi_snapshots')

app/api/gamification/kpis/[id]/route.ts
  Lines 36, 59, 85, 132, 142: .from('kpi_definitions') → .from('kpi_snapshots')
```

**Also Create** `reward_configs` table (doesn't exist in prod):

```sql
-- Migration: create_reward_configs.sql
CREATE TABLE reward_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL DEFAULT 0,
  quantity_available INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reward_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage org rewards" ON reward_configs
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE INDEX idx_reward_configs_tenant ON reward_configs(tenant_id);
```

**Verification**:
```bash
npm run typecheck
npm run build
# Navigate to /en/incentives - should load
```

---

### VEST-P0-002: Delete Organizations Code (Table Dropped)

**Priority**: CRITICAL
**Risk**: Low (deleting dead code)
**Time**: 20 minutes

**Problem**: `organizations` table was dropped in migration 20251119000600, but code still exists.

**Directories to DELETE** (entire directories):
```
rm -rf app/[locale]/(dashboard)/organizations/
rm -rf app/(dashboard)/organizations/
rm -rf app/api/organizations/
rm -rf components/organizations/
```

**Files to SEARCH and MODIFY** (remove imports/references):
```bash
# Find all files referencing organizations
grep -r "OrganizationSelector\|/organizations\|from.*organizations" --include="*.tsx" --include="*.ts" app/ components/ lib/
```

Expected files to modify:
- Remove `OrganizationSelector` imports
- Remove `/organizations` links from sidebars/navs
- Remove any organization-related context usage

**Verification**:
```bash
npm run typecheck  # Must pass
npm run build      # Must pass
grep -r "organizations" --include="*.tsx" app/  # Should return minimal results
```

---

## Phase 1: Remove Dead Code

These tasks clean up unreachable code. Safe to execute in parallel.

### VEST-P1-001: Remove Legacy Dashboard Directory

**Priority**: HIGH
**Risk**: Low (code never executes)
**Lines Removed**: ~23,000
**Time**: 5 minutes

**Problem**: `app/(dashboard)/` is legacy non-locale version superseded by `app/[locale]/(dashboard)/`. Middleware redirects all traffic to locale paths.

**Command**:
```bash
rm -rf "app/(dashboard)/"
```

**Verification**:
```bash
npm run build                    # Must pass
# Visit http://localhost:3000/dashboard
# Should redirect to /en/dashboard
```

---

### VEST-P1-002: Remove Unused Sidebar Component

**Priority**: MEDIUM
**Risk**: Low
**Lines Removed**: ~290
**Time**: 2 minutes

**Problem**: `components/sidebar/` has zero imports. Active sidebar is `components/layout/Sidebar.tsx`.

**Evidence**:
```bash
grep -r "components/sidebar" --include="*.tsx" --include="*.ts"
# Returns no results
```

**Command**:
```bash
rm -rf components/sidebar/
```

**Verification**:
```bash
npm run build  # Must pass
```

---

### VEST-P1-003: Remove Backup Files

**Priority**: LOW
**Risk**: None
**Files Removed**: 21
**Time**: 2 minutes

**Command**:
```bash
find . -name "*.bak" -type f -delete
```

**Files to be deleted**:
```
app/api/signature-documents/[id]/download/route.ts.bak
app/api/signature-documents/[id]/route.ts.bak
app/api/signature-documents/[id]/send/route.ts.bak
app/api/signature-documents/[id]/sign/route.ts.bak
app/api/signature-documents/[id]/resend/route.ts.bak
app/layout.tsx.bak
components/ui/button.tsx.bak
components/ui/empty-state.tsx.bak
components/ui/select.tsx.bak
components/settings/SettingsTabs.tsx.bak
components/settings/appearance-settings.tsx.bak
components/estimates/QuoteProposalView.tsx.bak
components/estimates/estimate-form.tsx.bak
components/storm/StormAlertPanel.tsx.bak
components/storm/AffectedCustomers.tsx.bak
components/storm/StormMap.tsx.bak
lib/dashboard/DashboardEditor.tsx.bak
lib/realtime/channel-manager.ts.bak
lib/hooks/useRealtimeSubscription.ts.bak
lib/ar/damage-classifier.ts.bak
lib/ar/ar-engine.ts.bak
```

**Verification**:
```bash
find . -name "*.bak" -type f  # Should return empty
npm run build                  # Must pass
```

---

## Phase 2: Create Missing Tables

These tasks create tables for intended features. Execute in order (some have dependencies).

### VEST-P2-001: Create AR Assessment Tables

**Priority**: MEDIUM
**Risk**: Medium (new schema)
**Time**: 30 minutes

**Problem**: AR assessment feature code exists but tables don't.

**Files that reference these tables**:
- `app/api/ar/*` routes
- `lib/ar/*` utilities

**Migration** (create `supabase/migrations/[timestamp]_create_ar_tables.sql`):

```sql
-- AR Assessment Tables
-- For augmented reality damage assessment feature

CREATE TABLE ar_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  project_id UUID REFERENCES projects(id),
  user_id UUID NOT NULL,
  device_info JSONB,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT DEFAULT 'in_progress',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ar_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES ar_sessions(id) ON DELETE CASCADE,
  measurement_type TEXT NOT NULL, -- 'area', 'length', 'angle'
  value DECIMAL NOT NULL,
  unit TEXT NOT NULL, -- 'sq_ft', 'ft', 'degrees'
  coordinates JSONB, -- 3D coordinates
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ar_damage_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES ar_sessions(id) ON DELETE CASCADE,
  damage_type TEXT NOT NULL, -- 'missing_shingle', 'crack', 'dent', etc.
  severity TEXT DEFAULT 'moderate', -- 'minor', 'moderate', 'severe'
  coordinates JSONB,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE ar_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_damage_markers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage org AR sessions" ON ar_sessions
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Users can manage AR measurements via session" ON ar_measurements
  FOR ALL USING (
    session_id IN (
      SELECT id FROM ar_sessions WHERE tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY "Users can manage AR damage markers via session" ON ar_damage_markers
  FOR ALL USING (
    session_id IN (
      SELECT id FROM ar_sessions WHERE tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

-- Indexes
CREATE INDEX idx_ar_sessions_tenant ON ar_sessions(tenant_id);
CREATE INDEX idx_ar_sessions_project ON ar_sessions(project_id);
CREATE INDEX idx_ar_measurements_session ON ar_measurements(session_id);
CREATE INDEX idx_ar_damage_markers_session ON ar_damage_markers(session_id);
```

**Verification**:
```bash
npx supabase db push
npm run build
# Navigate to AR assessment from a project - should load
```

---

### VEST-P2-002: Create Estimates/Quoting Tables

**Priority**: HIGH
**Risk**: Medium
**Time**: 30 minutes

**Problem**: Estimates feature code exists but `quote_options` and `quote_line_items` tables don't.

**Migration**:

```sql
-- Estimates/Quoting Tables

CREATE TABLE quote_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  description TEXT,
  is_selected BOOLEAN DEFAULT false,
  subtotal DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_option_id UUID REFERENCES quote_options(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL DEFAULT 1,
  unit TEXT DEFAULT 'each',
  unit_price DECIMAL NOT NULL,
  total DECIMAL GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE quote_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage org quotes" ON quote_options
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Users can manage quote line items" ON quote_line_items
  FOR ALL USING (
    quote_option_id IN (
      SELECT id FROM quote_options WHERE tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

-- Indexes
CREATE INDEX idx_quote_options_tenant ON quote_options(tenant_id);
CREATE INDEX idx_quote_options_project ON quote_options(project_id);
CREATE INDEX idx_quote_line_items_option ON quote_line_items(quote_option_id);
```

---

### VEST-P2-003: Create DNC Compliance Tables

**Priority**: MEDIUM
**Risk**: Medium
**Time**: 20 minutes

**Problem**: DNC (Do Not Call) compliance feature code exists but tables don't.

**Migration**:

```sql
-- DNC (Do Not Call) Compliance Tables

CREATE TABLE dnc_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  reason TEXT, -- 'customer_request', 'federal_dnc', 'state_dnc', 'internal'
  source TEXT, -- 'manual', 'import', 'api'
  added_by UUID,
  added_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ, -- null = permanent
  is_active BOOLEAN DEFAULT true,
  UNIQUE(tenant_id, phone_number)
);

CREATE TABLE dnc_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  records_total INTEGER DEFAULT 0,
  records_imported INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_log JSONB,
  imported_by UUID,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE dnc_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE dnc_imports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage org DNC" ON dnc_registry
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Users can manage org DNC imports" ON dnc_imports
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Indexes
CREATE INDEX idx_dnc_registry_tenant ON dnc_registry(tenant_id);
CREATE INDEX idx_dnc_registry_phone ON dnc_registry(phone_number);
CREATE INDEX idx_dnc_imports_tenant ON dnc_imports(tenant_id);
```

---

### VEST-P2-004: Create Audit Log Table

**Priority**: MEDIUM
**Risk**: Low
**Time**: 15 minutes

**Migration**:

```sql
-- Audit Log Table

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'login', 'export', etc.
  entity_type TEXT NOT NULL, -- 'contact', 'project', 'user', etc.
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy (admins only can view)
CREATE POLICY "Admins can view org audit log" ON audit_log
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') = 'admin'
  );

-- Insert policy for system
CREATE POLICY "System can insert audit logs" ON audit_log
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Indexes
CREATE INDEX idx_audit_log_tenant ON audit_log(tenant_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
```

---

### VEST-P2-005: Create Query History Table (Insights)

**Priority**: LOW
**Risk**: Low
**Time**: 10 minutes

**Migration**:

```sql
-- Query History for Business Intelligence

CREATE TABLE query_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  query_text TEXT NOT NULL,
  query_type TEXT, -- 'natural_language', 'sql', 'saved_report'
  is_favorite BOOLEAN DEFAULT false,
  result_count INTEGER,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE query_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can manage own query history" ON query_history
  FOR ALL USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND user_id = auth.uid()
  );

-- Indexes
CREATE INDEX idx_query_history_user ON query_history(user_id);
CREATE INDEX idx_query_history_tenant ON query_history(tenant_id);
CREATE INDEX idx_query_history_created ON query_history(created_at DESC);
```

---

### VEST-P2-006: Create Commission Tables

**Priority**: MEDIUM
**Risk**: Medium
**Time**: 25 minutes

**Problem**: Code references `commission_plans`, `commission_records`, `commission_summary_by_user`. Production has `commissions` and `commission_rules` but not the referenced tables.

**Option A**: Rename code to use existing tables
**Option B**: Create the expected tables

**Migration (Option B)**:

```sql
-- Commission System Tables

CREATE TABLE commission_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  rules JSONB NOT NULL DEFAULT '[]', -- Array of commission rules
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE commission_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES commission_plans(id),
  project_id UUID REFERENCES projects(id),
  amount DECIMAL NOT NULL,
  percentage DECIMAL,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'paid'
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- View for summaries
CREATE OR REPLACE VIEW commission_summary_by_user AS
SELECT
  tenant_id,
  user_id,
  COUNT(*) as total_records,
  SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
  SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_amount,
  SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_amount,
  SUM(amount) as total_amount
FROM commission_records
GROUP BY tenant_id, user_id;

-- Enable RLS
ALTER TABLE commission_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view org commission plans" ON commission_plans
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Admins can manage commission plans" ON commission_plans
  FOR ALL USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') = 'admin'
  );

CREATE POLICY "Users can view own commissions" ON commission_records
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (user_id = auth.uid() OR (auth.jwt() ->> 'role') = 'admin')
  );

CREATE POLICY "Admins can manage commissions" ON commission_records
  FOR ALL USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') = 'admin'
  );

-- Indexes
CREATE INDEX idx_commission_plans_tenant ON commission_plans(tenant_id);
CREATE INDEX idx_commission_records_tenant ON commission_records(tenant_id);
CREATE INDEX idx_commission_records_user ON commission_records(user_id);
CREATE INDEX idx_commission_records_status ON commission_records(status);
```

---

## Phase 3: Security & Infrastructure

### VEST-P3-001: Add Security Headers

**Priority**: HIGH
**Risk**: Low
**Time**: 20 minutes

**Problem**: No CSP, X-Frame-Options, HSTS headers configured.

**File to Modify**: `next.config.ts`

Add to the config:

```typescript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(self), geolocation=(self)',
        },
      ],
    },
  ];
},
```

**Note**: CSP requires careful configuration based on external resources used. Start with report-only mode.

**Verification**:
```bash
npm run build
npm run dev
curl -I http://localhost:3000 | grep -E "X-Frame|X-Content|Strict-Transport"
```

---

### VEST-P3-002: Create CI/CD Workflow

**Priority**: HIGH
**Risk**: Low
**Time**: 30 minutes

**Create**: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run TypeScript check
        run: npm run typecheck

  build:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

  e2e-tests:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

**Also Create**: `.github/workflows/security.yml`

```yaml
name: Security

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 1'  # Weekly on Monday

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run npm audit
        run: npm audit --audit-level=high
        continue-on-error: true
```

**Verification**:
- Push to a branch
- Check GitHub Actions tab
- Verify all jobs pass

---

## Phase 4: Polish (Optional)

### VEST-P4-001: Audit Automation Engines

**Priority**: LOW
**Risk**: Research only

**Problem**: 3 automation implementations exist:
- `lib/automation/engine.ts` - server-side, database-backed
- `lib/automation/workflow-engine.ts` - client-side, OOP, in-memory
- `lib/automation/trigger-manager.ts` - event manager

**Task**:
1. Trace which is used in production routes
2. Document findings
3. Recommend consolidation approach

### VEST-P4-002: Document Environment Variables

**Priority**: LOW
**Time**: 45 minutes

Document all 86 env vars with:
- Required vs optional
- Default values
- Where to get the value
- Which features depend on it

---

## Execution Checklist

### Ready to Execute (No Dependencies)
- [ ] VEST-P0-001: Gamification table names
- [ ] VEST-P0-002: Delete organizations code
- [ ] VEST-P1-001: Remove legacy dashboard
- [ ] VEST-P1-002: Remove unused sidebar
- [ ] VEST-P1-003: Remove .bak files
- [ ] VEST-P3-001: Security headers
- [ ] VEST-P3-002: CI/CD workflow

### Requires Schema Changes
- [ ] VEST-P2-001: AR tables
- [ ] VEST-P2-002: Estimates tables
- [ ] VEST-P2-003: DNC tables
- [ ] VEST-P2-004: Audit log table
- [ ] VEST-P2-005: Query history table
- [ ] VEST-P2-006: Commission tables

### Research Tasks
- [ ] VEST-P4-001: Automation audit
- [ ] VEST-P4-002: Env var documentation

---

## Success Criteria

After all phases complete:

1. **Zero runtime crashes** - All referenced tables exist
2. **Build passes** - `npm run build` succeeds
3. **Tests pass** - 86+ E2E tests green
4. **Security baseline** - Headers configured, CI/CD active
5. **Clean codebase** - No dead code, no .bak files

**Target Score**: 95/100 (A)

---

*This document is the execution source for VEST sessions. Update as tasks complete.*
