# 🚀 START HERE - Roofing SaaS Development

**Project Status**: Ready to begin development
**Current Date**: September 30, 2025
**Phase**: 1 of 5 (Core CRM)

## ⚡ IMMEDIATE NEXT STEPS

### 1️⃣ Get Supabase API Keys (5 mins)
```bash
# Go to: https://supabase.com/dashboard/project/ibdajxguadfapmcxnogd
# Navigate to: Settings > API
# Copy these keys:
- anon (public) key → NEXT_PUBLIC_SUPABASE_ANON_KEY
- service_role key → SUPABASE_SERVICE_ROLE_KEY
```

### 2️⃣ Initialize Next.js Project (10 mins)
```bash
# From this directory
npx create-next-app@latest roofing-saas --typescript --tailwind --app

# Answer prompts:
# ✓ Would you like to use ESLint? → Yes
# ✓ Would you like to use `src/` directory? → No
# ✓ Would you like to use App Router? → Yes (already selected)
# ✓ Would you like to customize import alias? → No

cd roofing-saas

# Install essential dependencies
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install next-pwa
npm install lucide-react

# Install shadcn/ui
npx shadcn-ui@latest init
# Choose: Default style, Slate base color, CSS variables
```

### 3️⃣ Set Up Environment (2 mins)
```bash
# Copy environment template
cp ../.env.example .env.local

# Edit .env.local and add:
# - Supabase anon key
# - Supabase service role key
# (Other keys can wait for later phases)
```

### 4️⃣ Create Database Schema (15 mins)

Go to Supabase SQL Editor and run:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create contacts table
CREATE TABLE contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE,

  -- Contact fields
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address_street VARCHAR(255),
  address_city VARCHAR(100),
  address_state VARCHAR(2),
  address_zip VARCHAR(10),

  -- CRM fields
  type VARCHAR(50) DEFAULT 'lead', -- lead, customer, prospect
  stage VARCHAR(50) DEFAULT 'new', -- new, contacted, qualified, proposal, won, lost
  source VARCHAR(100), -- website, referral, door-knock, etc.
  assigned_to UUID REFERENCES auth.users(id),

  -- Custom roofing fields
  roof_type VARCHAR(100),
  last_inspection_date DATE,
  property_value DECIMAL(12, 2),
  insurance_carrier VARCHAR(100),

  -- Indexes
  UNIQUE(email),
  INDEX idx_contacts_stage (stage),
  INDEX idx_contacts_assigned (assigned_to)
);

-- Create projects table
CREATE TABLE projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE,

  -- Project fields
  contact_id UUID REFERENCES contacts(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'estimate', -- estimate, scheduled, in_progress, completed, cancelled
  value DECIMAL(12, 2),

  -- Dates
  estimated_start DATE,
  actual_start DATE,
  estimated_completion DATE,
  actual_completion DATE,

  -- Details
  description TEXT,
  materials_cost DECIMAL(12, 2),
  labor_cost DECIMAL(12, 2),
  profit_margin DECIMAL(5, 2),

  -- QuickBooks
  quickbooks_id VARCHAR(100),

  -- Indexes
  INDEX idx_projects_contact (contact_id),
  INDEX idx_projects_status (status)
);

-- Create activities table
CREATE TABLE activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES auth.users(id),

  -- Activity fields
  contact_id UUID REFERENCES contacts(id),
  project_id UUID REFERENCES projects(id),
  type VARCHAR(50) NOT NULL, -- call, email, sms, meeting, note, task
  direction VARCHAR(10), -- inbound, outbound

  -- Content
  subject VARCHAR(255),
  content TEXT,

  -- Metadata
  duration_seconds INTEGER,
  outcome VARCHAR(100),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Indexes
  INDEX idx_activities_contact (contact_id),
  INDEX idx_activities_project (project_id),
  INDEX idx_activities_type (type)
);

-- Create gamification table
CREATE TABLE gamification (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,

  -- Points and levels
  total_points INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,

  -- Activity counts
  doors_knocked INTEGER DEFAULT 0,
  appointments_set INTEGER DEFAULT 0,
  deals_closed INTEGER DEFAULT 0,

  -- Achievements (JSON array of achievement IDs)
  achievements JSONB DEFAULT '[]'::jsonb,

  -- Streaks
  current_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  last_activity_date DATE,

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable Row Level Security
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic - refine later)
CREATE POLICY "Users can view all contacts" ON contacts FOR SELECT USING (true);
CREATE POLICY "Users can insert contacts" ON contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update contacts" ON contacts FOR UPDATE USING (true);

CREATE POLICY "Users can view all projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Users can insert projects" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update projects" ON projects FOR UPDATE USING (true);

CREATE POLICY "Users can view all activities" ON activities FOR SELECT USING (true);
CREATE POLICY "Users can insert activities" ON activities FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their gamification" ON gamification FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their gamification" ON gamification FOR UPDATE USING (auth.uid() = user_id);
```

### 5️⃣ Test Supabase Connection (5 mins)

Create `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

Test with a simple API route or page.

## 📊 PHASE 1 CHECKLIST

### Week 1 Goals
- [x] Project documentation
- [x] Supabase project setup
- [ ] Next.js initialization
- [ ] Database schema
- [ ] Basic auth flow

### Week 2 Goals
- [ ] Contact list view
- [ ] Contact create/edit forms
- [ ] Search and filtering
- [ ] Real-time updates

### Week 3 Goals
- [ ] Pipeline kanban view
- [ ] Drag-and-drop functionality
- [ ] Stage progression
- [ ] Basic analytics

### Week 4 Goals
- [ ] QuickBooks OAuth
- [ ] Basic sync functionality
- [ ] Testing and refinement
- [ ] Deploy to Vercel

## 🎯 SUCCESS METRICS

By end of Phase 1, we should have:
- ✅ Working authentication
- ✅ Full CRUD for contacts
- ✅ Visual pipeline management
- ✅ QuickBooks connected
- ✅ Deployed to production

## 💡 TIPS

1. **Start simple** - Get basic CRUD working before adding complexity
2. **Use shadcn/ui** - Don't build UI components from scratch
3. **Test on mobile** - Client's team will use phones in the field
4. **Commit often** - Small, focused commits are better
5. **Ask for help** - Use Archon knowledge base for examples

## 🔗 RESOURCES

- [Supabase Dashboard](https://supabase.com/dashboard/project/ibdajxguadfapmcxnogd)
- [Next.js Docs](https://nextjs.org/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)

## ❓ QUESTIONS TO RESOLVE

1. **Domain name**: What URL will the client want?
2. **Company branding**: Need logo, colors, company name
3. **User roles**: Admin vs sales rep vs field tech permissions?
4. **Data migration**: How much historical data from Proline?
5. **Training**: When/how to train the team?

---

**Ready to start?** Begin with step 1 above and work through sequentially. The foundation matters - don't rush!