# Roofing SaaS - Unified CRM & Field Management

A comprehensive platform for roofing contractors, replacing Proline CRM and Enzy door-knocking app with a unified Next.js application.

## 🚀 Project Overview

**Client**: Tennessee roofing company
**Tech Stack**: Next.js 16.0.7, React 19 RC, Supabase, Tailwind CSS, shadcn/ui
**Status**: Phase 5 In Progress - 18/26 Features Complete (69%), 17/26 Production Ready (65%)
**Database**: 1,375 contacts, 1,436 projects migrated from legacy systems
**Overall Health**: B+ (87/100) - Excellent code quality, zero errors, 156 E2E tests

### Phase Progress
- ✅ **Phase 1**: Core CRM (Contacts, Projects, Activities) - 100% Complete
- ✅ **Phase 2**: Communication Hub (SMS, Email, Call Tracking) - 100% Complete
- ✅ **Phase 3**: Mobile PWA (Field tools, offline-first) - 100% Complete
- ✅ **Phase 4**: AI Voice Assistant, E-Signature, Workflows, Storm Targeting - 86% Complete
- 🔄 **Phase 5**: Financial Integration (QuickBooks API ✅, UI needed), Polish - 40% Complete

### Critical Blockers
- ⚠️ **QuickBooks UI** (12-16h) - Backend complete, needs connection/sync UI
- ⚠️ **Campaign Builder Tests** (4-6h) - Feature built, needs E2E validation
- ⚠️ **Claims Management UI** (16-20h) - API complete, needs inspection forms
- 🔒 **Security**: QB OAuth tokens need encryption (URGENT - 2-3h)

## 🏗️ Getting Started

### Prerequisites
- Node.js 18+ (Apple Silicon ARM64 recommended)
- npm or yarn
- Supabase account (project configured)
- Environment variables (see `.env.local`)

### Development Server
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### Available Scripts
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues automatically
npm run typecheck    # Run TypeScript compiler check
npm test             # Run Playwright E2E tests
npm run test:ui      # Run tests with UI
```

## 📚 Documentation

**Main Documentation**: See [`/docs/README.md`](/docs/README.md) for complete documentation index.

### Quick Links

#### For Development
- **Session Restart**: [`/docs/sessions/SESSION_RESTART_GUIDE.md`](/docs/sessions/SESSION_RESTART_GUIDE.md)
- **Database Setup**: [`/docs/deployment/DATABASE_SETUP.md`](/docs/deployment/DATABASE_SETUP.md)
- **Troubleshooting**: [`/docs/reference/TROUBLESHOOTING.md`](/docs/reference/TROUBLESHOOTING.md)
- **Validation**: [`/docs/reference/VALIDATION.md`](/docs/reference/VALIDATION.md)

#### For Data Migration
- **Proline Import**: [`/docs/imports/PROLINE_EXPLORATION_REPORT.md`](/docs/imports/PROLINE_EXPLORATION_REPORT.md)
- **Enzy Import**: [`/docs/imports/ENZY_IMPORT_GUIDE.md`](/docs/imports/ENZY_IMPORT_GUIDE.md)

#### For Integration Work
- **QuickBooks**: [`/docs/integrations/QUICKBOOKS_INTEGRATION.md`](/docs/integrations/QUICKBOOKS_INTEGRATION.md)
- **Twilio SMS**: [`/docs/integrations/TWILIO_SMS_INTEGRATION_RESEARCH.md`](/docs/integrations/TWILIO_SMS_INTEGRATION_RESEARCH.md)

#### Project Status
- **Phase 2 Complete**: [`/docs/sessions/PHASE_2_COMPLETE.md`](/docs/sessions/PHASE_2_COMPLETE.md)
- **Phase 3 Status**: [`/docs/sessions/PHASE_3_SESSION_STATUS.md`](/docs/sessions/PHASE_3_SESSION_STATUS.md)
- **Active Items**: [`ITEMS_TO_CIRCLE_BACK.md`](/ITEMS_TO_CIRCLE_BACK.md)
- **Implementation Plan**: [`COMBINED_IMPLEMENTATION_PLAN.md`](/COMBINED_IMPLEMENTATION_PLAN.md)

## 🎯 Key Features

### ✅ Production Ready (17 Features)
- ✅ Multi-tenant architecture with RLS (86.7% coverage)
- ✅ Contact management with advanced search/filters
- ✅ Project pipeline with 8-stage Kanban (drag-and-drop, stage validation)
- ✅ Activity tracking and timeline
- ✅ SMS messaging (Twilio integration, bulk support)
- ✅ Email campaigns (Resend integration, templates)
- ✅ Call tracking and recording (Twilio Voice)
- ✅ Document management (Supabase Storage)
- ✅ Territory management with polygon drawing
- ✅ PWA with offline-first architecture (IndexedDB, service worker)
- ✅ Field photo capture and management
- ✅ Door-knocking/canvassing tools
- ✅ E-signature workflow (DocuSign-style)
- ✅ **AI Voice Assistant** (OpenAI + ElevenLabs, <2s latency, 50+ commands) 🌟
- ✅ Workflow automation (5 templates, stage triggers)
- ✅ Storm targeting (map draw → 500 addresses in 60s)
- ✅ Substatus system & configurable filters

### ⚠️ Incomplete (6 Features)
- 🔄 Campaign builder (backend ✅, needs E2E tests)
- 🔄 QuickBooks integration (API ✅, needs UI) - **CRITICAL**
- 🔄 Gamification (API ✅, needs leaderboard UI)
- 🔄 Digital business cards (API ✅, needs sharing UI)
- 🔄 Claims management (API ✅, needs inspection UI)
- 🔄 Advanced analytics (partial API)

### 🚫 Post-MVP
- ⏳ Commission tracking (tables exist, not started)
- ⏳ Job costing (tables exist, partial API)

## 🛠️ Tech Stack

**Frontend**
- Next.js 16.0.7 (App Router, React 19 RC)
- TypeScript 5.7.2 (strict mode, 0 errors)
- Tailwind CSS
- shadcn/ui components (115 components, 45 base UI)
- Lucide icons

**Backend & Database**
- Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- Row Level Security (RLS) for multi-tenancy (86.7% coverage)
- 60 database tables, 51 migrations

**Integrations (All Operational)**
- Twilio (SMS/Voice, compliance handling)
- Resend (Email delivery, custom domains)
- OpenAI (Whisper STT, GPT-4, Embeddings, Realtime API)
- ElevenLabs (Text-to-Speech streaming)
- QuickBooks (OAuth 2.0, sync endpoints - backend complete)
- Google Places & OpenStreetMap (Geocoding, address extraction)

**Testing & Quality**
- Playwright (156 E2E tests across 14 test files)
- TypeScript (strict mode, 0 compilation errors)
- ESLint (0 errors)
- Pre-commit hooks (lint + typecheck)
- Overall Health: B+ (87/100)

## 🏗️ Project Structure

```
/roofing-saas/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Main application
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # shadcn/ui base components
│   ├── dashboard/        # Dashboard widgets
│   ├── contacts/         # Contact features
│   ├── projects/         # Project features
│   └── gamification/     # Gamification UI
├── lib/                   # Utilities & helpers
│   ├── supabase/         # Supabase client
│   └── utils/            # Helper functions
├── docs/                  # Project documentation
│   ├── imports/          # Data migration guides
│   ├── deployment/       # Setup & deployment
│   ├── sessions/         # Development logs
│   ├── integrations/     # Integration docs
│   ├── reference/        # Technical reference
│   └── archive/          # Historical docs
├── supabase/              # Database migrations
├── scripts/               # Automation scripts
└── e2e/                   # End-to-end tests
```

## 🔒 Environment Variables

Required environment variables (see `.env.local`):
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_PASSWORD=

# Twilio (SMS/Voice)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Resend (Email)
RESEND_API_KEY=

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🧪 Testing

```bash
# Run all E2E tests
npm test

# Run tests with UI
npm run test:ui

# Run tests in headed mode
npm run test:headed

# Generate test report
npm run test:report
```

## 📦 Database

**Supabase Project**: `wfifizczqvogbcqamnmw`

### Key Tables
- `contacts` - Lead and customer information
- `projects` - Deals and jobs
- `activities` - All interactions (calls, texts, emails, notes)
- `gamification_scores` - User points and levels
- `territories` - Geographic sales territories
- `sms_messages` - SMS communication log
- `email_campaigns` - Email marketing

See [`/docs/deployment/DATABASE_SETUP.md`](/docs/deployment/DATABASE_SETUP.md) for full schema.

## 🤖 AI Development

This project leverages Claude Code with Archon MCP for task management.

**AI Instructions**: See [`CLAUDE.md`](/CLAUDE.md) for AI assistant guidelines.

## 🚀 Deployment

**Platform**: Vercel
**Database**: Supabase (hosted)

See [`/docs/deployment/PENDING_SETUP.md`](/docs/deployment/PENDING_SETUP.md) for deployment checklist.

## 📞 Support

For questions about:
- **Development**: Check `/docs/reference/TROUBLESHOOTING.md`
- **Data Import**: Check `/docs/imports/`
- **Integrations**: Check `/docs/integrations/`
- **Session Restart**: Check `/docs/sessions/SESSION_RESTART_GUIDE.md`

## 📝 License

Proprietary - Tennessee Roofing Company

---

**Last Updated**: December 11, 2025
**Version**: Phase 5 In Progress - 18/26 Features Complete (69%)
**Next Milestone**: Complete QuickBooks UI, Campaign tests, Claims UI (40-54 hours to MVP)
**Production Launch**: 2-3 weeks with all critical features
