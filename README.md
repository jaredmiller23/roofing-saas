# Roofing SaaS - Tennessee Roofing Company CRM

## 🚀 Quick Start

1. **Environment Setup**: Copy `.env.example` to `.env.local`
2. **Install Dependencies**: `cd roofing-saas && npm install`
3. **Run Development**: `npm run dev`
4. **Access App**: http://localhost:3000

## 📁 Project Structure

```
/Roofing SaaS/
├── roofing-saas/          # Next.js 15 application
│   ├── app/               # Next.js app directory (routes, API)
│   ├── components/        # React components
│   ├── lib/              # Utilities, integrations, business logic
│   ├── supabase/         # Database migrations
│   ├── e2e/              # Playwright end-to-end tests
│   ├── types/            # TypeScript type declarations
│   └── public/           # Static assets, PWA files
├── docs/                  # Technical documentation
│   ├── integrations/      # Third-party integration guides
│   └── architecture/      # System design documents
├── sessions/              # Development session reports
├── archive/               # Historical documents
├── CLAUDE.md             # Claude Code AI assistant instructions
├── README.md             # This file
├── SESSION_STATUS_*.md   # Latest session status
├── PRD_v2.md            # Product requirements
└── DATABASE_SCHEMA_v2.sql # Database schema
```

## 🎯 Current Status

**Phase**: Phase 3 - Mobile PWA (Week 10)
**Environment**: Development ✅ Production Build Ready
**Database**: Supabase (wfifizczqvogbcqamnmw)
**Latest Session**: October 2, 2025 - Build Fixes & SMS Integration

### ✅ Completed Features
**Phase 1 & 2 Complete**:
- Multi-tenant authentication & RLS
- Contact management (CRUD) with full activity tracking
- Pipeline view with drag-drop
- Photo upload/gallery with compression & Supabase storage
- Territory management with Leaflet maps
- Gamification system (points, levels, leaderboards, achievements)
- Email integration (Resend) with templates
- QuickBooks integration (OAuth, sync, invoicing)

**Phase 3 Progress**:
- ✅ Offline photo queue with IndexedDB (Dexie.js)
- ✅ Service Worker background sync
- ✅ PWA infrastructure with next-pwa
- ✅ Production build optimization (25+ TypeScript errors fixed)
- ✅ SMS integration code ready (8 TCPA-compliant templates)
- ✅ Playwright E2E testing infrastructure

### 🚧 In Progress
- Testing SMS integration with Twilio
- Staging deployment preparation
- Mobile device PWA testing (iOS/Android)

## 📚 Key Documentation

- **[START_HERE.md](./START_HERE.md)** - Setup and getting started
- **[PRD_v2.md](./PRD_v2.md)** - Full product requirements
- **[CLAUDE.md](./CLAUDE.md)** - AI assistant guidelines
- **[DATABASE_SCHEMA_v2.sql](./DATABASE_SCHEMA_v2.sql)** - Database structure

## 🔧 Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Deployment**: Vercel
- **PWA**: next-pwa for mobile experience

## 🔗 Important Links

- **Supabase Dashboard**: [Project Dashboard](https://supabase.com/dashboard/project/wfifizczqvogbcqamnmw)
- **Local Dev**: http://localhost:3000
- **API Docs**: http://localhost:3000/api-doc

## 📞 Support

For questions about this project, contact the development team or refer to the documentation in the `/docs` folder.