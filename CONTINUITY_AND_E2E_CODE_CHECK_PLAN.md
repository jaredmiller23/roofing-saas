# Continuity & End-to-End Code Check Plan

**Project**: Roofing SaaS
**Date**: 2026-01-11
**Purpose**: Comprehensive validation after months of development

---

## Overview

This plan addresses two critical validation needs:
1. **Continuity Check**: Verify coherence across months of iterative development
2. **End-to-End Code Check**: Validate the entire codebase from entry to exit

---

## Part 1: Continuity Check

### 1.1 Dead Code & Orphan Detection

**Goal**: Find code that's no longer used but wasn't cleaned up

| Check | Method | Risk Level |
|-------|--------|------------|
| Unused exports | TypeScript compiler + knip | Medium |
| Orphaned files | Cross-reference imports vs file list | Medium |
| Unreachable routes | Compare route definitions vs links/navigation | High |
| Dead database tables | Compare migrations vs actual queries | High |
| Unused dependencies | depcheck / npm-check | Low |
| Stale feature flags | Search for conditional features | Medium |

**Specific Checks**:
```bash
# Find files with no imports
# Check: components/, lib/, hooks/ directories
# Look for: Files that exist but aren't imported anywhere

# Check for TODO/FIXME/HACK comments left behind
grep -r "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx"

# Find unused npm packages
npx depcheck
```

### 1.2 Pattern Consistency

**Goal**: Verify patterns established early are still followed

| Pattern | Expected | Check Method |
|---------|----------|--------------|
| API route structure | RESTful, tenant-isolated | Review all `/api/` routes |
| Form handling | React Hook Form + Zod | Search for raw `useState` forms |
| State management | Context (not Redux/Zustand) | Search for state library imports |
| Component structure | Feature folders with barrel exports | Verify index.ts exists |
| Error handling | Try/catch with proper responses | Review API error patterns |
| Theme compliance | Semantic tokens only | ESLint theme rule + manual scan |

**Known Risk Areas**:
- Early components may use hardcoded colors (pre-theme system)
- Early API routes may have inconsistent error formats
- Validation schemas may have drifted from database constraints

### 1.3 Database Schema Integrity

**Goal**: Verify migrations match actual usage

| Check | Description |
|-------|-------------|
| Migration sequence | All 51 migrations apply cleanly |
| Column usage | Every column has queries using it |
| Index effectiveness | Indexes match actual query patterns |
| RLS policy coverage | 86.7% → target 100% |
| Foreign key integrity | All references valid |
| Soft delete consistency | No queries returning `is_deleted=true` records |

**Critical Tables to Verify**:
- `contacts` (core entity, heavily modified over time)
- `projects` (pipeline stages may have changed)
- `activities` (polymorphic, complex relationships)
- `signature_templates` (recent HTML content additions)

### 1.4 Feature Completion Matrix

**Goal**: Verify no half-implemented features remain

| Feature | Status Claimed | Verification Needed |
|---------|----------------|---------------------|
| Contact CRUD | Complete | E2E tests pass |
| Project Pipeline | Complete | All 8 stages work |
| E-Signatures | Complete | PDF generation works |
| SMS Messaging | Complete | Twilio integration live |
| Email Campaigns | Complete | Resend integration live |
| Voice Assistant | Complete | OpenAI + ElevenLabs work |
| Offline Sync | Complete | Conflict resolution works |
| QuickBooks | Complete | OAuth flow works |
| Gamification | Complete | Scores calculate |
| Storm Targeting | Complete | Address generation works |

### 1.5 Configuration Drift

**Goal**: Ensure configs haven't diverged from intended state

| Config | Check |
|--------|-------|
| `package.json` | Dependencies versions reasonable |
| `next.config.ts` | Security headers still correct |
| `tsconfig.json` | Strict mode still enabled |
| `eslint.config.mjs` | Theme rule still active |
| `playwright.config.ts` | Timeouts appropriate |
| Environment variables | All documented, none orphaned |

---

## Part 2: End-to-End Code Check

### 2.1 Build Validation Chain

```bash
# 1. Type check (must pass with 0 errors)
npm run typecheck

# 2. Lint check (must have ≤5 warnings)
npm run lint

# 3. Production build (must succeed)
npm run build

# 4. E2E tests (all 156 must pass)
npm run test:e2e

# 5. Manual smoke test
npm run start  # Then test key flows manually
```

### 2.2 Type Safety Audit

**Goal**: Verify type safety hasn't degraded

| Check | Expected | Red Flags |
|-------|----------|-----------|
| `any` usage | Minimal, justified | Frequent `any` casts |
| Type assertions | Rare, documented | `as unknown as X` patterns |
| Generic constraints | Proper bounds | `<T>` without constraints |
| Null checks | Optional chaining used | `!` non-null assertions |
| API response types | Fully typed | `unknown` response bodies |

**Files to Scrutinize**:
- `lib/types/*.ts` - Core type definitions
- `app/api/**/*.ts` - API route handlers
- `lib/supabase/*.ts` - Database client types

### 2.3 Security Audit

**Goal**: No security regressions

| Vulnerability | Check Method |
|---------------|--------------|
| SQL Injection | Review all Supabase queries for interpolation |
| XSS | Review `dangerouslySetInnerHTML` usage |
| CSRF | Verify API routes check auth |
| Auth bypass | Test tenant isolation |
| Secrets exposure | No `.env` values in client bundle |
| Dependency vulns | `npm audit` |

**High-Risk Areas**:
- Signature documents (PDF generation, file access)
- SMS sending (could be abused for spam)
- Admin impersonation (must verify permissions)
- File uploads (storage access control)

### 2.4 API Consistency Audit

**Goal**: All APIs follow consistent patterns

| Check | Standard |
|-------|----------|
| Auth check | First line checks `getCurrentUser()` |
| Tenant isolation | Queries include `tenant_id` |
| Error responses | `{ error: string }` with proper status |
| Success responses | Consistent shape per resource |
| Pagination | `page`, `limit` params |
| Rate limiting | Applied to write operations |

**API Routes to Audit** (40+):
```
/api/contacts
/api/projects
/api/activities
/api/signatures
/api/messages
/api/campaigns
/api/call-logs
/api/project-files
/api/pins
/api/settings
/api/gamification/*
/api/estimates
/api/tasks
/api/search
/api/admin/*
/api/quickbooks/*
```

### 2.5 Component Health Check

**Goal**: Components follow established patterns

| Check | Description |
|-------|-------------|
| Server vs Client | Correct directive placement |
| Props typing | All props have interfaces |
| Hook rules | No conditional hooks |
| Effect dependencies | Proper dependency arrays |
| Cleanup | Effects return cleanup functions |
| Key props | Lists have stable keys |

**High-Traffic Components**:
- `ContactList` / `ContactCard`
- `ProjectPipeline` / `ProjectCard`
- `Sidebar` / `BottomNav`
- `AIAssistantChat`
- `SignatureForm`

### 2.6 Test Coverage Analysis

**Goal**: Critical paths have test coverage

| Area | Tests Exist | Coverage Quality |
|------|-------------|------------------|
| Auth flows | Yes (auth.spec.ts) | Verify |
| Contact CRUD | Yes (27KB) | Verify |
| Project pipeline | Yes | Verify |
| E-signatures | Yes (3 files) | Verify |
| Campaigns | Yes (24KB) | Verify |
| Mobile nav | Yes | Verify |
| Offline sync | ? | Check |
| Voice assistant | ? | Check |
| QuickBooks | ? | Check |

**Test Gaps to Investigate**:
- Integration tests for third-party services
- Offline/sync scenario tests
- Voice command coverage
- Error recovery paths

### 2.7 Performance Baseline

**Goal**: Establish performance expectations

| Metric | Target | Check Method |
|--------|--------|--------------|
| Build time | <60s | `time npm run build` |
| Bundle size | <500KB (first load) | Build output |
| FCP | <1.5s | Lighthouse |
| TTI | <3s | Lighthouse |
| API response | <200ms (p95) | Manual testing |

### 2.8 Integration Health

**Goal**: All integrations operational

| Integration | Health Check |
|-------------|--------------|
| Supabase | DB connection, RLS working |
| Twilio | SMS send test |
| Resend | Email send test |
| OpenAI | Whisper + GPT test |
| ElevenLabs | TTS test |
| QuickBooks | OAuth refresh test |
| Google Maps | Geocode test |
| Sentry | Error capture test |

---

## Part 3: Execution Plan

### Phase 1: Automated Checks (1-2 hours)

```bash
# Run in sequence
npm run typecheck       # 0 errors expected
npm run lint           # ≤5 warnings expected
npm run build          # Must succeed
npm run test:e2e       # 156 tests expected
npm audit              # Check for vulns
npx depcheck           # Unused dependencies
```

### Phase 2: Static Analysis (2-3 hours)

1. **Dead code scan**
   - Run TypeScript unused exports check
   - Scan for orphaned files
   - Review TODO/FIXME comments

2. **Pattern consistency review**
   - Sample 10 API routes for consistency
   - Sample 10 components for pattern adherence
   - Review form implementations

3. **Database audit**
   - Compare migration columns vs query usage
   - Check RLS policy coverage
   - Verify soft delete queries

### Phase 3: Dynamic Validation (2-3 hours)

1. **Manual smoke test**
   - Full contact lifecycle
   - Full project lifecycle
   - Signature workflow
   - Voice assistant interaction
   - Offline → online sync

2. **Integration verification**
   - Test each third-party integration
   - Verify error handling

3. **Performance check**
   - Run Lighthouse
   - Check bundle sizes
   - Profile slow operations

### Phase 4: Documentation & Report (1 hour)

1. Generate findings report
2. Categorize by severity (Critical/High/Medium/Low)
3. Create remediation tasks in Archon
4. Update project status

---

## Risk Assessment

### High Priority (Fix Immediately)
- Security vulnerabilities
- Data integrity issues
- Auth bypass possibilities
- Broken core features

### Medium Priority (Fix Before Launch)
- Pattern inconsistencies
- Missing test coverage
- Performance issues
- Dead code accumulation

### Low Priority (Technical Debt)
- Unused dependencies
- Documentation gaps
- Minor style inconsistencies
- Over-engineering

---

## Success Criteria

| Criterion | Threshold |
|-----------|-----------|
| TypeScript errors | 0 |
| ESLint warnings | ≤5 |
| Build success | Yes |
| E2E tests pass | 156/156 |
| Security vulns | 0 critical/high |
| Pattern violations | <10 |
| Dead code files | <5 |
| Integration health | All operational |

---

## Appendix: File Inventory

### Critical Files (Must Review)
- `app/layout.tsx` - Root layout
- `lib/auth/session.ts` - Auth system
- `lib/supabase/server.ts` - DB client
- `lib/offline/sync-manager.ts` - Offline system
- `middleware.ts` - Route protection

### High-Traffic Components
- `components/contacts/ContactList.tsx`
- `components/projects/ProjectPipeline.tsx`
- `components/layout/Sidebar.tsx`
- `components/ai-assistant/AIAssistantChat.tsx`
- `components/signatures/SignatureForm.tsx`

### Integration Points
- `lib/twilio/` - SMS/Voice
- `lib/resend/` - Email
- `lib/ai/` - OpenAI
- `lib/voice/` - ElevenLabs
- `lib/quickbooks/` - QuickBooks
- `lib/maps/` - Google Maps

---

*Plan created 2026-01-11. Execute phases in order, document findings continuously.*
