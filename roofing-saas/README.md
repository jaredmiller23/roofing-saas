# Roofing SaaS - Unified CRM & Field Management

A comprehensive platform for roofing contractors, replacing Proline CRM and Enzy door-knocking app with a unified Next.js application.

## 🚀 Project Overview

**Client**: Tennessee roofing company
**Tech Stack**: Next.js 15, Supabase, Tailwind CSS, shadcn/ui
**Status**: Phase 2 Complete, Phase 3 In Progress (60%)
**Database**: 1,375 contacts, 1,436 projects migrated from legacy systems

### Phase Progress
- ✅ **Phase 1**: Core CRM (Contacts, Projects, Activities)
- ✅ **Phase 2**: Communication Hub (SMS, Email, Call Tracking)
- 🔄 **Phase 3**: Mobile PWA (60% complete - Field tools, offline-first)
- ⏳ **Phase 4**: AI Voice Assistant (Planned)
- ⏳ **Phase 5**: Financial Integration (QuickBooks, Commissions)

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

### Completed (Phases 1-2)
- ✅ Multi-tenant architecture with RLS
- ✅ Contact management with advanced search/filters
- ✅ Project pipeline with drag-and-drop
- ✅ Activity tracking and timeline
- ✅ SMS messaging (Twilio integration)
- ✅ Email campaigns (Resend integration)
- ✅ Call tracking and recording
- ✅ Document management (Supabase Storage)
- ✅ Territory management
- ✅ Team collaboration features
- ✅ Gamification system (points, leaderboards, achievements)

### In Progress (Phase 3)
- 🔄 PWA with offline-first architecture
- 🔄 Field photo capture and management
- 🔄 Door-knocking tools
- 🔄 Mobile-optimized UI
- 🔄 Service worker for offline sync

### Planned
- ⏳ AI voice assistant (OpenAI Realtime API)
- ⏳ QuickBooks integration
- ⏳ Commission tracking
- ⏳ Advanced analytics
- ⏳ E-signature workflow

## 🛠️ Tech Stack

**Frontend**
- Next.js 15 (App Router, React 19)
- Tailwind CSS
- shadcn/ui components
- Lucide icons

**Backend & Database**
- Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- Row Level Security (RLS) for multi-tenancy

**Integrations**
- Twilio (SMS/Voice)
- Resend (Email)
- OpenAI (AI Assistant - planned)
- QuickBooks (Financial - planned)

**Testing & Quality**
- Playwright (E2E tests)
- TypeScript (strict mode)
- ESLint
- Git hooks (Husky)

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

**Last Updated**: October 2, 2025
**Version**: Phase 3 In Progress (60%)
**Next Milestone**: Phase 3 Completion, then AI Voice Assistant (Phase 4)
