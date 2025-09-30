# CLAUDE.md

This file provides guidance to Claude Code when working with the Roofing SaaS project.

## 🎯 PROJECT OVERVIEW

**Client**: Tennessee roofing company
**Goal**: Single platform to replace Proline CRM and Enzy door-knocking app
**Timeline**: 20-week phased delivery (started September 2025)
**Current Phase**: Phase 1 - Core CRM (Weeks 1-4)
**Status**: Project initialized, ready for development

### Key Context
- **Real client** with active roofing operations
- Currently using **Proline** (CRM) and **Enzy** (door-knocking app)
- Solo developer + Claude Code building together
- Client has explicitly requested all features in PRD.md

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

1. **PRD.md** - Product requirements and phased roadmap
2. **knowledge_base_roofing_platform.md** - Technical implementation details
3. **roofing_industry_apis.md** - Industry-specific integrations

## 🚀 CURRENT STATUS

### ✅ Completed
- Project planning and documentation
- Supabase project created (credentials in .env.example)
- Git repository initialized
- MCP servers configured

### ⏳ Next Steps (Phase 1)
1. Initialize Next.js project
2. Create database schema
3. Implement authentication
4. Build contact CRUD operations
5. Create pipeline view
6. Set up QuickBooks OAuth

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

## 📊 DEVELOPMENT PHASES

### Phase 1: Core CRM (Weeks 1-4) ← CURRENT
- [ ] Project setup
- [ ] Database schema
- [ ] Authentication
- [ ] Contact CRUD
- [ ] Pipeline view
- [ ] QuickBooks OAuth

### Phase 2: Communication (Weeks 5-8)
- Twilio SMS integration
- Email templates
- Call logging
- Basic automation

### Phase 3: Mobile PWA (Weeks 9-12)
- PWA setup
- Photo uploads
- Territory management
- Gamification

### Phase 4: AI Assistant (Weeks 13-16)
- OpenAI integration
- Voice input
- Report generation

### Phase 5: Financial (Weeks 17-20)
- QuickBooks sync
- Invoice management
- Job costing

## ⚠️ CRITICAL RULES

1. **Follow PRD.md phases** - Don't jump ahead
2. **Keep it simple** - Use Supabase features, avoid complexity
3. **Test everything** - This is production software
4. **Client requirements are non-negotiable**:
   - Text messaging
   - Call recording capability
   - E-signing
   - Email automation
   - Mobile app with photos
   - QuickBooks integration
   - AI voice assistant

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

## 🎯 QUALITY CHECKLIST

Before committing code:
- [ ] Run `npm run lint`
- [ ] Run `npm run typecheck`
- [ ] Test happy path
- [ ] Test error cases
- [ ] Check mobile view
- [ ] Verify RLS policies

## 🚫 DO NOT

- Change the tech stack
- Add complex dependencies
- Build features outside current phase
- Create unnecessary abstractions
- Skip Supabase RLS policies
- Forget this is for a REAL client

## ✅ DO

- Follow phases strictly
- Use Supabase built-in features
- Keep code simple and readable
- Test thoroughly
- Comment business logic
- Update progress regularly

---

**Remember**: This is a real client project. They're counting on us to deliver a working solution that replaces their current tools. Keep it simple, make it work, iterate based on feedback.