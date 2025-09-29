# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 MISSION CRITICAL - READ FIRST

**PROJECT STATUS**: Active development for REAL CLIENT
**APPROACH**: Solo developer + Claude Code building together
**TIMELINE**: 20-week phased delivery starting September 2025
**KNOWLEDGE BASE**: Using Archon for centralized documentation and task management

### Key Context
- This is a **real roofing company in Tennessee** with active operations
- They currently use **Proline** (CRM) and **Enzy** (door-knocking)
- Goal: **Single platform to replace ALL their software**
- Developer: Solo no/low-code automation agency using Claude Code
- Client has explicitly requested all features in the PRD.md file

### 🧠 Archon Integration
This project uses **Archon** (http://localhost:3737) as the central knowledge and task management system:
- **Knowledge Base**: All project documentation, APIs, and references are stored in Archon
- **Task Management**: Project phases and tasks are tracked in Archon
- **MCP Server**: Claude Code connects via MCP for consistent context across sessions

To access project knowledge and tasks:
1. Ensure Archon is running: `cd /Users/ccai/archon && docker compose up -d`
2. Access UI at: http://localhost:3737
3. MCP connection available at: http://localhost:8051

## 🗄️ IMPORTANT: Dual Supabase Architecture

This project uses **TWO separate Supabase instances** with distinct purposes:

### 1. Archon Supabase Database (Knowledge Base)
- **Purpose**: Centralized knowledge storage for ALL projects
- **Contains**: Documentation, code examples, API references, prompts
- **Project Ref**: `pcduofjokergeakxgjpp`
- **Tables**: `archon_*` (settings, sources, crawled_pages, code_examples, etc.)
- **Shared across**: All client projects built with Claude Code
- **MCP Name**: Should be `supabase-archon` or `archon-knowledge`

### 2. Roofing SaaS Supabase Database (Operational)
- **Purpose**: This roofing company's operational data
- **Contains**: Contacts, projects, activities, invoices, etc.
- **Project Ref**: [TO BE CONFIGURED - awaiting credentials]
- **Tables**: `contacts`, `projects`, `activities`, etc. (as per PRD)
- **Specific to**: This Tennessee roofing company only
- **MCP Name**: Should be `supabase-roofing` or `supabase-app`

⚠️ **CRITICAL**: Never confuse these two databases!
- **Archon DB** = Development knowledge & documentation
- **Roofing DB** = Client's business data

## 🔌 MCP Server Configuration

The `.mcp.json` file should contain BOTH Supabase connections:

```json
{
  "mcpServers": {
    "supabase-archon": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=pcduofjokergeakxgjpp"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "[archon_token]"
      }
    },
    "supabase-roofing": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=[roofing_project_ref]"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "[roofing_token]"
      }
    },
    "archon": {
      "uri": "http://localhost:8051/mcp",
      "transport": "sse"
    }
  }
}
```

### Using MCP Tools:
- **For knowledge queries**: Use `mcp__supabase-archon__*` tools
- **For app data**: Use `mcp__supabase-roofing__*` tools
- **For task management**: Use `mcp__archon__*` tools

## 📋 Project Documents

**ALWAYS READ THESE FIRST**:
1. `/Users/ccai/Roofing SaaS/PRD.md` - Product requirements (our bible)
2. `/Users/ccai/knowledge_base_roofing_platform.md` - Technical implementation details
3. `/Users/ccai/roofing_industry_apis.md` - Industry-specific integrations

## 🛠 Tech Stack (DECIDED - DO NOT CHANGE)

```javascript
// Frontend
- Next.js 14 with App Router
- Tailwind CSS + shadcn/ui
- PWA using next-pwa

// Backend & Data
- Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- Vercel deployment

// Integrations
- Twilio (SMS/calling)
- Resend/SendGrid (email)
- OpenAI API (AI assistant)
- QuickBooks API (financial)
```

## 📁 Project Structure

```
/roofing-saas/
├── app/                     # Next.js 14 app directory
│   ├── (auth)/             # Auth pages (login, register)
│   ├── (dashboard)/        # Main app pages
│   ├── api/                # API routes
│   └── layout.tsx          # Root layout
├── components/
│   ├── ui/                 # shadcn/ui components
│   └── features/           # Feature-specific components
├── lib/
│   ├── supabase/          # Supabase client and queries
│   ├── integrations/      # Third-party integrations
│   └── utils/             # Helper functions
├── public/                 # Static assets
└── supabase/              # Database migrations and types
```

## 🚀 Development Commands

```bash
# Initial setup (if not done)
npx create-next-app@latest roofing-saas --typescript --tailwind --app
cd roofing-saas
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npx shadcn-ui@latest init

# Development
npm run dev              # Start dev server (port 3000)
npm run build           # Build for production
npm run lint            # Run ESLint
npm run typecheck       # TypeScript checking

# Supabase
npx supabase init       # Initialize Supabase
npx supabase start      # Start local Supabase
npx supabase db push    # Push migrations
```

## 🎯 Current Phase & Priorities

### We are in: Phase 1 - Core CRM (Weeks 1-4)
**Focus on**:
1. Basic lead/contact management
2. Simple pipeline view
3. CRUD operations
4. QuickBooks OAuth setup

**DO NOT** work on advanced features yet. Follow the phases in PRD.md.

## ⚠️ CRITICAL RULES

### 1. ALWAYS Check PRD.md First
Before implementing ANY feature, verify it's in the current phase of PRD.md

### 2. Keep It Simple
- Use Supabase Row Level Security (RLS) instead of complex auth
- Use shadcn/ui components instead of building custom UI
- Use Supabase Realtime instead of WebSockets
- Use Vercel cron instead of complex schedulers

### 3. Client Requirements (Non-Negotiable)
The client explicitly needs:
- ✅ Text messaging
- ✅ Call recording capability
- ✅ E-signing
- ✅ Email automation
- ✅ Reporting
- ✅ Mobile app with photo upload
- ✅ QuickBooks integration
- ✅ AI voice assistant

### 4. Database Conventions
```sql
-- Always use these field names
id: UUID primary key
created_at: timestamp
updated_at: timestamp
created_by: UUID references auth.users
is_deleted: boolean (soft delete)

-- Table naming
contacts (not leads - single table for all)
projects (not deals or jobs)
activities (all interactions)
```

### 5. API Patterns
```typescript
// Always use this pattern for API routes
export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  // Check auth
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Your logic here
}
```

## 🔄 Integration Status

| Service | Status | Priority | Notes |
|---------|--------|----------|-------|
| QuickBooks | 🔴 Not Started | Critical | OAuth2 setup needed |
| Twilio | 🔴 Not Started | High | SMS required |
| OpenAI | 🔴 Not Started | Medium | Phase 4 |
| Resend/SendGrid | 🔴 Not Started | High | Email required |
| Google Maps | 🔴 Not Started | Medium | Phase 3 |

## 📝 Communication Protocol

### When Starting Work
1. Read PRD.md to understand current phase
2. Check this file for tech stack and conventions
3. Look for any existing code before creating new files
4. Use TodoWrite to track your tasks

### When Implementing Features
1. Start with the simplest working version
2. Use existing Supabase/shadcn features
3. Test locally before committing
4. Update integration status table above

### When Stuck
1. Check if the feature is actually needed in current phase
2. Look for simpler alternatives (Supabase usually has one)
3. Document blockers clearly
4. Move to next task if blocked

## 🚫 DO NOT

- Change the tech stack without discussion
- Add complex dependencies (keep it simple)
- Build features not in the current phase
- Create complex abstractions (YAGNI)
- Forget this is for a REAL client who needs it working

## ✅ DO

- Follow the phases in PRD.md strictly
- Use Supabase features wherever possible
- Keep the client's explicit requirements in mind
- Test thoroughly - this is production software
- Comment complex business logic
- Update this file when you add new patterns

## 🔍 Quick Reference

### Supabase Client
```typescript
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
```

### Database Types
```typescript
// Generate types from Supabase
npx supabase gen types typescript --project-id [project-id] > lib/database.types.ts
```

### Environment Variables
```env
# Roofing SaaS Application (Operational Database)
NEXT_PUBLIC_SUPABASE_URL=[roofing_project_url]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[roofing_anon_key]
SUPABASE_SERVICE_KEY=[roofing_service_key]

# Archon Knowledge Base (if needed in app)
ARCHON_SUPABASE_URL=https://pcduofjokergeakxgjpp.supabase.co
ARCHON_SUPABASE_ANON_KEY=[archon_anon_key - only if accessing knowledge from app]

# Third-party Services
QUICKBOOKS_CLIENT_ID=
QUICKBOOKS_CLIENT_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
OPENAI_API_KEY=
RESEND_API_KEY=
```

## ✔️ Quality Checklist (Adapted for Solo Dev + Claude)

### Before Committing Code
**Code Quality & Safety**
- [ ] Run `npm run lint` - fix all warnings
- [ ] Run `npm run typecheck` - ensure TypeScript is happy
- [ ] Add try/catch blocks for all API calls
- [ ] Log errors to console (we'll add Sentry later)

**Functionality & Validation**
- [ ] Test the happy path manually
- [ ] Test with bad inputs (empty fields, wrong formats)
- [ ] Check it works in both desktop and mobile views
- [ ] Verify database operations are idempotent

**Performance (Keep It Simple)**
- [ ] Page loads under 3 seconds on 3G
- [ ] No N+1 database queries (use Supabase's built-in joins)
- [ ] Images are optimized and lazy-loaded

### Architecture Decisions
**Why This Stack?**
- Next.js 14: Best DX, great with Vercel
- Supabase: Handles auth, database, realtime, storage - no backend needed
- shadcn/ui: Copy-paste components that just work
- PWA: No app store hassles, works offline

**Security Basics**
- [ ] Never commit .env files
- [ ] Use Supabase RLS for all tables
- [ ] Sanitize inputs (Supabase does most of this)
- [ ] API keys only in environment variables

### Deployment Checklist
**Before Each Demo (Weekly)**
- [ ] Push to GitHub
- [ ] Deploy to Vercel preview URL
- [ ] Test core flows on mobile
- [ ] Update Integration Status table above

**Going to Production**
- [ ] Set up error monitoring (Sentry)
- [ ] Configure Vercel production environment
- [ ] Set up Supabase production project
- [ ] Enable Vercel Analytics

## 🧠 Archon Setup Instructions

### Initial Setup (One-Time)
If Archon project hasn't been created yet:

1. **Start Archon**:
   ```bash
   cd /Users/ccai/archon && docker compose up -d
   ```

2. **Create Project in Archon**:
   - Go to http://localhost:3737
   - Navigate to Projects → Create New Project
   - Name: "Tennessee Roofing SaaS Platform"
   - Description: "Complete replacement for Proline CRM and Enzy door-knocking app"

3. **Upload Knowledge Base**:
   - Knowledge Base → Upload Documents
   - Upload these files:
     - `/Users/ccai/Roofing SaaS/PRD.md`
     - `/Users/ccai/knowledge_base_roofing_platform.md`
     - `/Users/ccai/roofing_industry_apis.md`

4. **Create Phase-Based Tasks**:
   - Add tasks for current phase from PRD.md
   - Each task should map to specific deliverables

### Using Archon During Development

1. **Query Knowledge**: Use MCP tools to search documentation
2. **Update Tasks**: Mark tasks as in-progress/completed as you work
3. **Add Context**: Upload new documentation as it's created
4. **Track Progress**: Use Archon's project view for status updates

## 📊 Progress Tracking

**PRIMARY**: Use Archon for project and task management (http://localhost:3737)
**SECONDARY**: Use TodoWrite tool for session-specific tasks

Current Phase 1 focus (check Archon for latest):
1. Project setup
2. Database schema
3. Auth flow
4. Basic CRUD for contacts
5. Pipeline view

Remember: **This is a real client project.** They're counting on us to deliver a working solution that replaces their current tools. Keep it simple, make it work, iterate based on feedback.

## 🔧 MCP Server Configuration

### ⚠️ CRITICAL DISCOVERY (September 29, 2025)
**Claude Code ignores project `.mcp.json` files by default!**

After extensive debugging, we discovered that Claude Code uses a three-tier configuration system:
1. **Project `.mcp.json`** - Defined but IGNORED unless explicitly approved
2. **User `~/.mcp.json`** - Also IGNORED by Claude Code
3. **Global `~/.claude.json`** - Project-specific sections - THIS IS WHAT CLAUDE CODE USES

### Current MCP Servers (As of Sept 29, 2025)

| Server | Status | Purpose | Connection |
|--------|--------|---------|------------|
| supabase | ✅ Connected | Archon knowledge base | pcduofjokergeakxgjpp |
| supabase-roofing | ✅ Connected | Roofing app database | ibdajxguadfapmcxnogd |
| archon | ✅ Connected | Task management & RAG | localhost:8051 |
| n8n-cloud | ✅ Connected | Workflow automation | 79 workflows |
| filesystem | ✅ Connected | File operations | /Users/ccai |
| git | ❌ Failed | Version control | Not a git repo |
| time | ❌ Failed | Time utilities | Package issue |

### How to Properly Add MCP Servers

```bash
# REQUIRED: Use claude mcp add command (NOT .mcp.json files!)

# 1. Supabase instances (with environment variables)
claude mcp add -e SUPABASE_ACCESS_TOKEN=your_token -- server-name npx -y @supabase/mcp-server-supabase@latest --project-ref=your-ref

# 2. HTTP/SSE servers like Archon
claude mcp add --transport http archon http://localhost:8051/mcp

# 3. Node.js based servers
claude mcp add -e KEY1=value1 -- server-name node /path/to/server.js

# 4. NPM packages (filesystem, git, time, etc.)
claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem@latest /Users/ccai

# Remove servers (if in multiple scopes)
claude mcp remove server-name -s local  # Remove from local scope
claude mcp remove server-name -s project  # Remove from project .mcp.json

# Verify configuration
claude mcp list

# Check actual stored config
cat ~/.claude.json | jq '.projects."/Users/ccai/Roofing SaaS".mcpServers'
```

### Complete Setup Commands for This Project

```bash
# Core servers (ALREADY CONFIGURED)
claude mcp add -e SUPABASE_ACCESS_TOKEN=sbp_316a707ce3b1abdf40ca707c92c558cc06192d98 -- supabase npx -y @supabase/mcp-server-supabase@latest --project-ref=pcduofjokergeakxgjpp
claude mcp add -e SUPABASE_ACCESS_TOKEN=sbp_af41de7a9b0a203312bbe8d727c0f223d05bd50f -- supabase-roofing npx -y @supabase/mcp-server-supabase@latest --project-ref=ibdajxguadfapmcxnogd
claude mcp add --transport http archon http://localhost:8051/mcp
claude mcp add -e N8N_API_URL="https://pawpawsshop.app.n8n.cloud/api/v1" -e N8N_API_KEY="[key]" -- n8n-cloud node /Users/ccai/n8n-mcp-server/build/index.js
claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem@latest /Users/ccai

# Optional servers (AS NEEDED)
claude mcp add git -- npx -y @modelcontextprotocol/server-git@latest  # Only works in git repos
claude mcp add time -- npx -y @modelcontextprotocol/server-time@latest  # Needs package install
```

### Common Issues and Solutions:

#### 1. "Can't find roofing data in Supabase"
- **Problem**: You're connected to Archon DB instead of Roofing DB
- **Check**: Run a query - if you see `archon_*` tables, you're in the wrong database
- **Solution**:
  - Verify which MCP server you're using (`claude mcp list`)
  - Archon tables: `archon_settings`, `archon_sources`, etc.
  - Roofing tables: `contacts`, `projects`, `activities`, etc.

#### 2. "MCP servers not showing up after restart"
- **Root Cause**: Claude Code reads from `~/.claude.json`, NOT from project `.mcp.json`
- **Solution**: Use `claude mcp add` commands to properly register servers
- **Verify**: Check `~/.claude.json` has servers under your project path

#### 3. "Wrong database schema appearing"
- **Remember the distinction**:
  - **Archon DB**: Knowledge, documentation, code examples
  - **Roofing DB**: Customer data, business operations
- **Never mix these up!** Different purposes, different data

#### 4. "Archon MCP not available"
- **Start Archon**: `cd /Users/ccai/archon && docker compose up -d`
- **Check health**: `docker ps | grep archon`
- **Add properly**: `claude mcp add --transport http archon http://localhost:8051/mcp`

#### 5. "Can't distinguish between Supabase instances"
- **Use clear naming**:
  - `supabase` or `supabase-archon` for knowledge base
  - `supabase-roofing` for operational data
- **Tool prefixes will reflect the name**:
  - `mcp__supabase__execute_sql` vs `mcp__supabase-roofing__execute_sql`