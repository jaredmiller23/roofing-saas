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
**Current Date**: November 20, 2025
**Current Phase**: Phase 4 - Validation & Stabilization
**Status**: Phases 1-3 Complete ✅ | Phase 4: 5 features deployed Nov 19 (UNTESTED) ⚠️
**Phase 4 Complete**: E-Signature ✅, TypeScript Cleanup ✅, Voice Provider System ✅
**Phase 4 Needs Validation**: Campaign Builder, Admin Impersonation, AI Conversations, Configurable Filters (backend-only), Substatus System (backend-only)
**Latest Update**: November 20 cleanup - ESLint fixed, documentation consolidated, drift identified

## 🌟 ENHANCED CAPABILITIES (October 1, 2025)

### Claude Code v2 Features - USE PROACTIVELY
- **Checkpoints** (Esc×2): Experiment boldly, rewind if needed
- **Subagents**: Delegate research before implementation
- **Hooks**: Automated linting, type checking, testing
- **Background Tasks**: Long-running tests while building
- **Parallel Execution**: 2-3x faster research and development

### Sonnet 4.5 Capabilities - LEVERAGE FULLY
- **30-Hour Sprints**: Complete phases like AI Voice Assistant
- **Parallel Research**: Multiple deep dives simultaneously
- **Enhanced Planning**: Optimal architecture decisions
- **Domain Expertise**: Superior roofing business logic
- **Best Coding Model**: Industry-leading code quality

## 🚀 NOVEMBER 2025 UPDATES - NEW SUPERPOWERS

### Extended Thinking (NEW)
- **What**: Deeper reasoning mode for complex decisions
- **When to Use**:
  - Architecture decisions (AI Voice pipeline, data models)
  - Security & compliance analysis (TCPA, RLS policies)
  - Performance optimization strategies
  - Complex data migrations & transformations
- **How**: Available on-demand for complex reasoning tasks
- **Benefit**: Better decisions on critical path items
- **Guide**: See `/docs/guides/EXTENDED_THINKING_GUIDE.md`

### Memory API (NEW - 500K Tokens)
- **What**: Persistent context across sessions (~1,000 pages)
- **Availability**: Max, Enterprise, Team plans (rolling out to Pro)
- **Use For**:
  - Project architecture & design decisions
  - Coding patterns & preferences
  - Business rules & constraints
  - Integration credentials context
- **Benefit**: Stop repeating context every session
- **Guide**: See `/docs/guides/MEMORY_API_USAGE.md`

### Agent Skills (BETA)
- **What**: Domain-specific knowledge packages
- **Current Skills**:
  - `roofing-business`: Industry terms, workflows, compliance basics
  - `quickbooks`: API patterns, accounting rules, OAuth flows
  - `compliance`: TCPA, call recording laws, data retention
- **How It Works**: Organized folders with instructions/scripts/resources
- **When to Use**: Automatically loaded for domain-specific tasks
- **Benefit**: Consistent business logic, reduced context repetition
- **Guide**: See `/docs/guides/AGENT_SKILLS_SETUP.md`

### Enhanced Checkpoints (UPDATED)
- **What**: Esc×2 or `/rewind` to instantly restore code/conversation state
- **Improvements**: Better state management, more reliable rewinding
- **Best Practices**:
  - Before major refactors
  - When experimenting with architecture
  - Testing new integrations (Twilio, QuickBooks)
  - Complex data transformations
- **Benefit**: Fearless experimentation
- **Guide**: See `/docs/guides/CHECKPOINT_WORKFLOWS.md`

### Context Editing (NEW)
- **What**: Automatic thinking block clearing (`clear_thinking_20251015`)
- **Benefit**: Reduced token usage in long sessions
- **How**: Automatically manages internal reasoning blocks
- **Impact**: More efficient long-running development sessions

### Claude Code for Web (October 2025)
- **What**: Browser-based async coding agent
- **Use Cases**:
  - Long-running data migrations
  - Batch processing setup
  - Async code reviews
- **Benefit**: Start tasks, come back later
- **Same Features**: Checkpoints, sandboxing, all CLI capabilities

### Enhanced Security
- **Filesystem Sandboxing**: Safer file operations with intelligent guardrails
- **Network Sandboxing**: Controlled external API access
- **Benefit**: Reduced permission prompts, safer autonomous work

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

### ✅ ARCHON OPERATIONAL STATUS (November 20, 2025)
**Status**: 100% Operational - Technical ✅ Process ✅

**Health Check**: All systems functioning
- MCP Server: Running and healthy
- All tools: Accessible and functional
- Database: Connected
- Tasks: Current priority - validate November 19 features

**Critical Updates (Nov 20)**:
- git-secrets: VERIFIED WORKING (investigation report was incorrect)
- ESLint: FIXED (migrated to pure flat config)
- Pre-commit hooks: RESTORED and working
- Documentation: CONSOLIDATED (root: 30→5 files)
- November features: 5 deployed (NOT 6), needs testing

**Workflow Documentation**:
- Session checklists: `/docs/ARCHON_SESSION_CHECKLISTS.md`
- Implementation guide: `/docs/ARCHON_WORKFLOW_IMPLEMENTATION.md`
- Recent cleanup: `/docs/sessions/SESSION_2025-11-20_CLEANUP_AND_INVESTIGATION.md`

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

### ⏳ Next Steps (Phase 4 Continuation)
**Check Archon for current priorities**:
1. 📋 Run `mcp__archon__find_tasks(filter_by="status", filter_value="todo")`
2. 🎯 Review pending tasks and prioritize with user
3. 💡 Potential areas for development:
   - Job budgeting/P&L system
   - Order management tool
   - Additional Phase 4 features
   - Performance optimizations
   - UI/UX enhancements

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