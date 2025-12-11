# CLAUDE.md

This file provides guidance to Claude Code when working with the Roofing SaaS project.

## 🎯 PROJECT OVERVIEW

**Client**: Tennessee roofing company
**Goal**: Single platform to replace Proline CRM and Enzy door-knocking app
**Original Timeline**: 22 weeks
**Enhanced Timeline**: 16-18 weeks (27% faster with Claude Code v2 + Sonnet 4.5)
**Started**: September 2025
**Phase 2 Completed**: October 1, 2025
**Phase 3 Started**: October 1, 2025 (6:30 PM)
**Phase 4 Started**: October 2, 2025
**Current Date**: December 10, 2025
**Current Phase**: Phase 5 - Workflow Automation & Polish
**Status**: Phases 1-4 Complete ✅ | Phase 5: In Progress 🔄
**Phase 4 Complete**: E-Signature ✅, TypeScript Cleanup ✅, Voice Provider System ✅, Substatus System ✅, Configurable Filters ✅, AI Conversations ✅
**Phase 4 Needs Validation**: Campaign Builder, Admin Impersonation (API-only, needs UI)
**Phase 5 Progress**: Pipeline consolidation ✅, Value statistics ✅, Workflow automation ✅, Stage validation ✅, 64 E2E tests ✅, Code cleanup ✅
**Latest Update**: December 10 - Phase 5: Workflow automation system, pipeline UX, 64 E2E tests, 3,700+ lines cleaned

## 🌟 CLAUDE CAPABILITIES (December 2025)

### Current Model: Claude Opus 4.5
- **Released**: November 24, 2025
- **The most capable frontier model** - powers this CLI
- **Context window compaction**: Automatic summarization for longer sessions
- **AI Safety Level 3**: Enterprise-grade security

### Claude Code 2.0 Features
- **Checkpoints** (Esc×2): Instant state tracking, rewind code/conversation
- **Subagents**: Specialized agents (Explore, Plan, General-purpose)
- **Hooks**: Event-triggered shell commands (PreToolUse, PostToolUse, Stop)
- **Background Tasks**: Long-running tests while building
- **Parallel Execution**: Multiple agents working simultaneously

### Extended Thinking
- **Keywords**: `think` (4K tokens), `think hard` (10K), `ultrathink` (32K)
- **Interleaved**: Can use tools DURING thinking
- **Use for**: Architecture decisions, security analysis, complex debugging

### Persistent Memory System (4-Tier Hierarchy)
1. **Enterprise policy** (org-wide)
2. **Project memory**: `./CLAUDE.md`
3. **Project rules**: `.claude/rules/*.md` ← NEW: Modular rules
4. **User memory**: `~/.claude/CLAUDE.md`
5. **Local memory**: `./CLAUDE.local.md` (private, gitignored)

### Agent Skills
- **Location**: `.claude/skills/skill-name/SKILL.md`
- **Available**: roofing-business, playwright-testing, quickbooks, compliance
- **Auto-invoked**: Model decides when to use them

### Context Compaction
- **Auto-compact**: Triggers at ~95% context capacity
- **Manual**: `/compact` command with custom instructions
- **Best practice**: Compact at 85-90%, don't wait for auto

### Claude Code for Web
- **URL**: claude.ai/code
- **Use for**: Long-running migrations, async code reviews
- **Same features**: Checkpoints, sandboxing, all CLI capabilities

### Key Context
- **Real client** with active roofing operations
- Currently using **Proline** (CRM) and **Enzy** (door-knocking app)
- Solo developer + Claude Code building together
- Client has explicitly requested all features in PRD.md

### Development Environment
- **OS**: macOS (Apple Silicon ARM64)
- **Primary Browser**: Safari/WebKit (not Chrome)
- **Important**: Claude Code may assume Windows/Chrome - always verify Mac/Safari compatibility
- **Playwright Browsers**: Chromium (1179), WebKit (2182), Firefox (1490) installed
- **Testing Priority**: Safari (WebKit) first, then Chromium, then Firefox

## 🎯 ARCHON MCP WORKFLOW - CRITICAL

**⚠️ ARCHON IS FIRST & LAST STOP FOR EVERY SESSION ⚠️**

### MANDATORY Workflow (NO EXCEPTIONS):

**1. START OF SESSION - ALWAYS:**
```
mcp__archon__find_tasks(filter_by="status", filter_value="todo")
```
- Get current TODO tasks from Archon
- Review what needs to be done
- Ask user which task to work on OR suggest priority based on task_order

**2. START OF WORK - MARK IN PROGRESS:**
```
mcp__archon__manage_task("update", task_id="...", status="doing")
```
- Mark task as "doing" before starting work
- ONLY ONE task should be "doing" at a time

**3. DURING WORK - USE LOCAL TODO FOR GRANULAR TRACKING:**
- Use TodoWrite for step-by-step progress within the task
- First local todo: Update Archon task status
- Keep local todos aligned with Archon task

**4. AFTER COMPLETING WORK - UPDATE STATUS:**
```
mcp__archon__manage_task("update", task_id="...", status="done")
OR
mcp__archon__manage_task("update", task_id="...", status="review")
```
- Mark "done" if fully complete
- Mark "review" if needs user verification

**5. END OF SESSION - DOCUMENT WORK:**
```
mcp__archon__manage_task("create",
  project_id="...",
  title="Clear descriptive title",
  description="Detailed description of what was accomplished",
  status="done",
  feature="Phase X or Infrastructure or Component"
)
```
- Create tasks for ALL work completed during session
- Include file paths, key decisions, status
- Create follow-up tasks if verification needed

**6. CREATE FOLLOW-UP TASKS:**
```
mcp__archon__manage_task("create",
  project_id="...",
  title="Verify [thing] after [time/condition]",
  description="What needs verification and how to verify it",
  status="todo",
  assignee="User" or "AI IDE Agent",
  task_order=100  // Higher priority
)
```

### NEVER:
- ❌ Start work without checking Archon tasks
- ❌ Complete work without updating Archon
- ❌ Make assumptions about status without verification
- ❌ Say "you're all set" or "up and running" without actual checks
- ❌ End session without documenting work in Archon

### Project ID:
```
Tennessee Roofing SaaS: 42f928ef-ac24-4eed-b539-61799e3dc325
```

### ✅ ARCHON OPERATIONAL STATUS (December 10, 2025)
**Status**: 100% Operational - Technical ✅ Process ✅

**Health Check**: All systems functioning
- MCP Server: Running and healthy
- All tools: Accessible and functional
- Database: Connected
- Knowledge Base: 35+ documentation sources

**December 10 Updates**:
- **Phase 5 Started**: Workflow Automation & Polish
- Pipeline Consolidation: Unified at `/projects`, `/pipeline` redirects properly
- Pipeline Value Statistics: Total value shown per stage and overall
- 8 Pipeline Stages: Prospect → Qualified → Quote Sent → Negotiation → Won → Production → Complete → Lost
- Orphaned Component Cleanup: ~3,700+ lines removed
  - Removed duplicate project components (Kanban, Card, Column)
  - Removed 10+ unused components from various modules
  - Cleaner, more maintainable codebase
- E2E Test Improvements:
  - Fixed auth isolation (unauthenticated vs authenticated tests)
  - All 17 Pipeline tests now pass
  - Proper `storageState` handling for test scenarios
- Pre-commit hooks: Working (ESLint + TypeScript checks)
- Build status: ✅ 0 errors

**Claude Rules Added**:
- `supabase-patterns.md` - RLS, auth helpers, query conventions
- `component-standards.md` - UI patterns, shadcn usage
- `testing-requirements.md` - Playwright E2E patterns

**Quick Health Check**: `mcp__archon__health_check`

## 🛠 TECH STACK (DECIDED - DO NOT CHANGE)

```javascript
// Frontend
- Next.js 14 with App Router
- Tailwind CSS + shadcn/ui
- PWA using next-pwa

// Backend & Data
- Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- Vercel deployment

// Integrations (by phase)
- Twilio (SMS/calling)
- Resend/SendGrid (email)
- OpenAI API (AI assistant)
- QuickBooks API (financial)
```

## 📋 ESSENTIAL DOCUMENTS

### Core Planning
1. **PRD_v2.md** - Product requirements (v2.1 enhanced with parallel strategies)
2. **START_HERE.md** - Setup instructions (updated Oct 1 with new capabilities)
3. **PHASE_BREAKDOWN.md** - Detailed tasks (v2.0 with subagent/parallel patterns)
4. **DATABASE_SCHEMA_v2.sql** - Multi-tenant database structure

### Claude Capabilities (November 2025)
5. **SONNET_4.5_CAPABILITIES.md** - Claude Sonnet 4.5 feature guide
6. **EXTENDED_THINKING_GUIDE.md** - When and how to use extended thinking
7. **CHECKPOINT_WORKFLOWS.md** - Best practices for checkpoint usage
8. **AGENT_SKILLS_SETUP.md** - Domain-specific knowledge packages
9. **MEMORY_API_USAGE.md** - Persistent context patterns

### Technical Architecture
10. **AI_VOICE_ASSISTANT_ARCHITECTURE.md** - Voice AI technical blueprint
11. **MULTI_TENANT_ARCHITECTURE_GUIDE.md** - RLS and tenant isolation patterns

## 🚀 CURRENT STATUS

### ✅ Completed
- Project planning and documentation
- Supabase project created (credentials in .env.example)
- Git repository initialized
- MCP servers configured
- **Phase 1**: Core CRM (contacts, projects, pipeline, documents)
- **Phase 2**: Communication Hub (SMS, email, call logging, automation)
- **Phase 3**: Mobile PWA (territories, knock logging, photo capture)
- **Phase 4.1**: E-Signature system with DocuSign-style signing
- **TypeScript Cleanup (Oct 4)**: All compilation errors resolved
  - Fixed Next.js 15 params Promise types (4 routes)
  - Fixed Supabase relationship array types
  - Fixed type assertions across automation, geo, resend, twilio libraries
  - Fixed Leaflet Draw event types
  - Fixed Lucide icon props
  - **Quality**: 0 TypeScript errors, 0 ESLint errors, 0 warnings
  - **Documentation**: See `docs/sessions/SESSION_2025-10-04_TYPESCRIPT_CLEANUP.md`

### 🔄 Phase 5 In Progress (December 10, 2025)

#### Pipeline Consolidation & UX
- **Single Pipeline View**: Unified at `/projects` with Kanban/Table toggle
- **Value Statistics**: Pipeline value per stage and total visible
- **8-Stage Pipeline**: Prospect → Qualified → Quote Sent → Negotiation → Won → Production → Complete → Lost
- **Quick Filter Chips**: Fast filtering in Kanban view
- **Mark Lost Button**: Quick action on project cards
- **Reactivate Button**: Recover lost opportunities
- **Adjuster Field**: Insurance adjuster tracking (competitor parity)
- **Days-in-Stage Counter**: Track opportunity aging

#### Workflow Automation System
- **Pipeline Stage Validation** (`lib/pipeline/validation.ts`)
  - Enforces valid stage transitions
  - Required fields per stage (estimated_value for quote_sent, approved_value for won)
  - Auto-syncs status field based on pipeline_stage
- **Workflow Triggers**: `pipeline_stage_changed`, `project_won`, `job_completed`
- **Start Production Workflow** (`app/api/projects/[id]/start-production/route.ts`)
  - Auto-generates job numbers (YY-####)
  - Validates project is in 'won' stage
- **Automations Settings UI** (`components/settings/AutomationSettings.tsx`)
  - 5 pre-built workflow templates
  - Enable/disable workflows from Settings
- **Campaign Execution Engine**: Wired and functional
- **E-signature Email Notifications**: Automated notifications on signature events

#### Codebase Cleanup
- **~3,700+ lines removed**: Orphaned components cleaned up
- **17 components deleted**: Duplicate project, organizations, tasks, surveys, settings components
- **Logger standardization**: Replaced ~25 console.log statements with proper logger

#### Testing
- **Pipeline E2E**: All 17 tests passing with proper auth isolation
- **Workflows E2E**: 16 new tests (`e2e/workflows.spec.ts`)
- **Additional E2E**: pins.spec.ts, storm-leads.spec.ts, voice-assistant.spec.ts (48 new tests total)

#### Security & Types
- npm audit fix applied (vulnerabilities reduced)
- Claims integration fields added to Project type

### ⏳ Next Steps (Phase 5 Continuation)
**Check Archon for current priorities**:
1. 📋 Run `mcp__archon__find_tasks(filter_by="status", filter_value="todo")`
2. 🎯 Review pending tasks and prioritize with user
3. 💡 Remaining Phase 5 Work:
   - Admin Impersonation UI (backend complete, needs frontend)
   - Campaign Builder validation
   - QuickBooks integration
   - Final UX polish
   - PWA mobile testing (deferred until code stabilizes)
   - User Acceptance Testing (UAT)

## 📁 PROJECT STRUCTURE (TO BE CREATED)

```
/roofing-saas/
├── app/                     # Next.js 14 app directory
│   ├── (auth)/             # Auth pages
│   ├── (dashboard)/        # Main app
│   ├── api/                # API routes
│   └── layout.tsx
├── components/
│   ├── ui/                 # shadcn/ui components
│   └── features/           # Feature components
├── lib/
│   ├── supabase/          # Supabase client
│   └── utils/             # Helpers
└── supabase/              # Migrations
```

## 🚦 GETTING STARTED

### Step 1: Initialize Next.js Project
```bash
npx create-next-app@latest roofing-saas --typescript --tailwind --app
cd roofing-saas
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install next-pwa
npx shadcn-ui@latest init
```

### Step 2: Environment Setup
```bash
cp ../.env.example .env.local
# Get keys from Supabase Dashboard:
# - Settings > API > anon key
# - Settings > API > service_role key
```

### Step 3: Database Setup
Create tables in Supabase SQL Editor:
- contacts (leads/customers)
- projects (deals/jobs)
- activities (interactions)
- gamification (points/achievements)

## 📊 ENHANCED DEVELOPMENT PHASES

### Phase 0: Data Migration (Week 0) ← CURRENT
- [ ] ⚡ Parallel data analysis + ETL research
- [ ] 🤖 Subagent: Migration strategy optimization
- [ ] 📍 Checkpoint-safe migration execution

### Phase 1: Core CRM (Weeks 1-4) ⚡ ACCELERATED
- [ ] ⚡ Parallel project setup + research
- [ ] 📍 Database schema with checkpoint validation
- [ ] ⚡ Auth + tenant + invitation (parallel)
- [ ] 🚀 **30-hour sprint**: Complete contact module
- [ ] ⚡ Pipeline + documents (parallel development)
- [ ] 🤖 QuickBooks research → implementation

### Phase 2: Communication (Weeks 5-8) ⚡ ACCELERATED
- ⚡ SMS + Email integration (parallel)
- 🤖 Compliance research (subagent-driven)
- ⚡ Call management + automation (parallel)

### Phase 3: Mobile PWA (Weeks 9-12) ⚡ ACCELERATED
- 🚀 **30-hour sprint**: Offline-first architecture
- ⚡ Field tools + canvassing (parallel)
- 📍 Checkpoint: Offline sync validation

### Phase 4: AI Assistant (Weeks 13-16) 🌟 PERFECT FIT
- 🚀 **30-hour sprint**: Complete audio pipeline
- 🤖 5 subagents: Pre-sprint research blitz
- ⚡ WebRTC + Whisper + GPT-4 + ElevenLabs (parallel)
- 📍 Checkpoint optimization: <2 sec latency

### Phase 5: Financial (Weeks 17-18) ⚡ ACCELERATED
- 🤖 Job costing research (subagent)
- ⚡ QuickBooks + commissions (parallel)
- Advanced analytics with Phase 4 AI

## ⚠️ CRITICAL RULES

### Development Workflow (UPDATED - Oct 2)
1. **ARCHON FIRST & LAST** - Check tasks before starting, update after finishing
2. **Use Subagents Proactively** - Research before implementing
3. **Leverage Checkpoints** - Experiment boldly, rewind if needed
4. **Execute in Parallel** - Build multiple components simultaneously
5. **30-Hour Sprints** - Use for complex features (contacts, voice AI)
6. **Background Tasks** - Run tests while continuing development
7. **NO ASSUMPTIONS** - Verify status, don't assume "all set" or "working"

### Project Standards
1. **Follow PRD_v2.md phases** - Enhanced with parallel strategies
2. **Keep it simple** - Use Supabase features, avoid complexity
3. **Test everything** - This is production software
4. **Client requirements are non-negotiable**:
   - Text messaging
   - Call recording capability
   - E-signing
   - Email automation
   - Mobile app with photos
   - QuickBooks integration
   - AI voice assistant ← **Crown jewel, perfect for Sonnet 4.5**

## 💾 DATABASE CONVENTIONS

```sql
-- Standard fields for all tables
id: UUID primary key
created_at: timestamp
updated_at: timestamp
created_by: UUID references auth.users
is_deleted: boolean (soft delete)

-- Table names
contacts (not leads)
projects (not deals/jobs)
activities (all interactions)
```

## 🔌 SUPABASE CONNECTION

**Project URL**: https://wfifizczqvogbcqamnmw.supabase.co
**Project ID**: wfifizczqvogbcqamnmw

✅ **API keys already configured in .env.local**
- Anon key and service role key are ready
- Database connection strings need to be added from Dashboard > Settings > Database

## 🎯 ENHANCED QUALITY CHECKLIST

### Automated with Hooks (Setup First!)
- [ ] Pre-commit hook: `npm run lint` (automated)
- [ ] Pre-commit hook: `npm run typecheck` (automated)
- [ ] Pre-push hook: Test suite execution (automated)

### Manual Validation with Checkpoints
- [ ] 📍 Test happy path (checkpoint if issues)
- [ ] 📍 Test error cases (rewind if bugs found)
- [ ] Check mobile view (checkpoint responsive design)
- [ ] Verify RLS policies (checkpoint security)
- [ ] ⚡ Run tests in background while continuing dev

### Before Phase Completion
- [ ] 📍 **Major Checkpoint**: Validate entire phase
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Client demo prepared

## 🚫 DO NOT

- Change the tech stack
- Add complex dependencies
- Build features outside current phase
- Create unnecessary abstractions
- Skip Supabase RLS policies
- Forget this is for a REAL client

## ✅ DO - ENHANCED WORKFLOW

### Leverage New Capabilities
- **Launch subagents** for research before implementation
- **Use checkpoints** to experiment with architecture
- **Execute in parallel** whenever possible (2-3x faster)
- **Run background tasks** for long-running operations
- **Setup hooks** for automated quality assurance

### Development Best Practices
- Follow enhanced phases (see PRD_v2.md for parallel strategies)
- Use Supabase built-in features
- Keep code simple and readable
- Test thoroughly (with checkpoints!)
- Comment business logic
- Update progress regularly

### Specific to This Project
- **Phase 4 (AI Voice)**: Perfect for 30-hour sprint capability
- **Complex modules**: Use autonomous extended sessions
- **Research tasks**: Always delegate to subagents
- **Risky changes**: Use checkpoints for safety

---

**Remember**: This is a real client project with a HUGE advantage - Claude Code v2 + Sonnet 4.5 give us unprecedented capabilities. We can deliver faster (16-18 weeks vs 22), with higher quality (checkpoint testing), and with the AI Voice Assistant as a true differentiator. Let's leverage these capabilities fully!