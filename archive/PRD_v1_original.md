# Practical PRD for Roofing SaaS Platform (Claude Code + Solo Developer)

## Project Context
- **Developer**: Solo automation agency using Claude Code
- **Client**: Local Tennessee roofing company
- **Current Tools**: Proline (CRM/operations), Enzy (door-knocking)
- **Goal**: Single platform to replace all existing tools

## Our Realistic Approach

Given that this is a **solo developer + Claude Code** project for a local Tennessee roofing company, this PRD focuses on what we can actually build together.

## Tech Stack (Decided)

### Frontend
- **Next.js 14** with App Router (full-stack React framework)
- **Tailwind CSS** + shadcn/ui (rapid UI development)
- **Supabase** for auth, database, and real-time features
- **PWA** using next-pwa for mobile capabilities

### Backend & Infrastructure
- **Supabase** (PostgreSQL, Auth, Storage, Edge Functions)
- **Vercel** for deployment (seamless with Next.js)
- **Twilio** for SMS/calling
- **Resend** or SendGrid for email
- **OpenAI API** for AI assistant

### Why This Stack?
- **Low-code friendly**: Supabase + Next.js requires minimal backend code
- **Quick iteration**: shadcn/ui components are copy-paste ready
- **Cost-effective**: Generous free tiers for small business
- **Claude-compatible**: Claude Code can write all this code effectively

## Phased Implementation (Realistic Timeline)

### Phase 1: Core CRM (Weeks 1-4)
**Goal**: Replace basic Proline functionality
- Set up Next.js + Supabase project
- Database schema for leads, contacts, projects
- Basic CRUD operations
- Simple pipeline view
- QuickBooks OAuth integration setup

### Phase 2: Communication Hub (Weeks 5-8)
**Goal**: Essential communication features
- Twilio integration for SMS
- Email templates with Resend
- Basic call logging (not recording initially)
- Simple automation rules

### Phase 3: Mobile PWA (Weeks 9-12)
**Goal**: Replace Enzy's field functionality
- PWA setup with offline capability
- Photo upload to Supabase Storage
- Territory map using Mapbox/Google Maps
- Basic gamification (leaderboards)

### Phase 4: AI Assistant (Weeks 13-16)
**Goal**: Add the "wow factor"
- OpenAI integration for chat
- Simple RAG using Supabase Vector
- Voice input using Web Speech API
- Automated report generation

### Phase 5: Financial Integration (Weeks 17-20)
**Goal**: Complete QuickBooks integration
- Invoice sync
- Payment tracking
- Basic P&L reporting
- Job costing

## MVP Feature Set (What We'll Actually Build)

### 1. Lead & Contact Management
- Single table for all contacts (simpler than Salesforce model)
- Custom fields for roofing-specific data
- Basic pipeline stages
- Simple lead scoring

### 2. Communication
- SMS via Twilio (automated follow-ups)
- Email templates
- Call logging (manual initially)
- E-signatures using DocuSign API or simpler alternative

### 3. Field Operations
- Mobile-responsive PWA
- Photo uploads with metadata
- GPS check-ins
- Simple territory assignment

### 4. Gamification (Replacing Enzy)
- Points system in Supabase
- Real-time leaderboard
- Basic competitions
- Achievement badges

### 5. QuickBooks Integration
- OAuth connection
- Invoice creation
- Payment sync
- Customer sync

### 6. AI Assistant
- Chat interface for queries
- Voice input (browser-based)
- Simple report generation
- Lead qualification assistance

## What We're NOT Building (Initially)

- Complex workflow automation (keep it simple)
- Advanced reporting (use QuickBooks for now)
- Multi-tenant architecture (single company only)
- Native mobile apps (PWA is sufficient)
- Complex integrations (EagleView, Hover - manual for now)

## Database Schema (Simplified)

```sql
-- Core tables we'll need
contacts (id, name, email, phone, address, type, stage)
projects (id, contact_id, status, value, created_at)
activities (id, type, contact_id, content, created_at)
users (id, name, role, email) -- via Supabase Auth
gamification (user_id, points, achievements)
```

## Integration Priority

1. **QuickBooks** (critical - they already use it)
2. **Twilio** (SMS is must-have)
3. **Email provider** (basic requirement)
4. **OpenAI** (for AI assistant)
5. **Maps API** (for territory feature)

## Development Approach

1. **Start with Supabase**: Set up auth, database, and storage
2. **Build UI with shadcn/ui**: Rapid component development
3. **Iterate weekly**: Show progress to client regularly
4. **Use existing tools**: Don't reinvent the wheel
5. **Keep it simple**: Better to have working basics than broken complexity

## Success Metrics (Realistic)

- Replace Proline and Enzy within 3 months
- Save client $500+/month in software costs
- 90% feature parity with current tools
- Add AI capabilities neither tool has
- Single login for all features

## Client Requirements (Must-Have Features)

From the client's explicit requirements:
- Text messaging
- Call recording
- E-signing
- Email
- Reporting
- Employee apps with photo upload capability
- QuickBooks integration (financial management)
- RAG voice agent (executive assistant)

## Next Steps

1. Initialize Next.js project with TypeScript
2. Set up Supabase project
3. Create basic database schema
4. Build authentication flow
5. Create lead management CRUD
6. Add QuickBooks OAuth

## Important Notes

- This is a real client project, not speculative
- We're solving actual pain points (multiple systems to consolidate)
- The client wants to eliminate ALL other software
- Focus on working features over perfect architecture
- Weekly demos to client are essential