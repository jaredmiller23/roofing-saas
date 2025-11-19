# Contributing Guidelines

**Project**: Roofing SaaS Platform
**Last Updated**: November 18, 2025

---

## 🎯 Overview

Thank you for contributing to the Roofing SaaS platform! This document outlines our code quality standards, development workflow, and best practices.

### Quick Links
- [Code Quality Standards](#code-quality-standards)
- [Development Workflow](#development-workflow)
- [Commit Guidelines](#commit-guidelines)
- [Testing Requirements](#testing-requirements)

---

## ⚡ Code Quality Standards

### The Golden Rule

> **"Cleaner is better."** - Project Owner

We maintain high code quality standards. Never compromise quality for speed.

### ESLint Standards

**Maximum Warnings**: 10 (enforced by pre-commit hook)

```json
// .lintstagedrc.json
{
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix --max-warnings 10"
  ]
}
```

**What This Means**:
- Pre-commit hook blocks commits with >10 warnings
- ESLint auto-fixes on commit (formatting, simple issues)
- You must manually fix remaining warnings
- **NEVER** increase this threshold without explicit approval

**Common Violations**:
```typescript
// ❌ BAD: Unused imports
import { useState, useEffect, useCallback } from 'react'
// Only using useState

// ✅ GOOD: Only import what you use
import { useState } from 'react'

// ❌ BAD: Unused variables
const handleClick = () => {
  const result = doSomething()
  // result never used
}

// ✅ GOOD: Remove or use variables
const handleClick = () => {
  doSomething()
}

// ❌ BAD: 'any' types (when avoidable)
const data: any = fetchData()

// ✅ GOOD: Explicit types
const data: UserData = fetchData()
```

### TypeScript Standards

**Strict Mode**: Enabled

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

**Requirements**:
- Build must succeed: `npm run build`
- No TypeScript errors (zero tolerance)
- Prefer explicit types over `any`
- Use type inference where clear
- Document complex types

**Type Safety Examples**:
```typescript
// ❌ BAD: Using 'any'
function processData(data: any) {
  return data.map((item: any) => item.value)
}

// ✅ GOOD: Explicit types
interface DataItem {
  value: string
}

function processData(data: DataItem[]): string[] {
  return data.map(item => item.value)
}

// ✅ ACCEPTABLE: 'any' with explanation
// @ts-expect-error - Third-party library has no types
import Papa from 'papaparse'
```

### Code Style

**Formatting**: Automatically handled by ESLint + Prettier

**Naming Conventions**:
```typescript
// Components: PascalCase
export function ContactForm() {}

// Functions: camelCase
export function formatPhoneNumber() {}

// Constants: UPPER_SNAKE_CASE
export const MAX_RETRY_ATTEMPTS = 3

// Types/Interfaces: PascalCase
export interface UserProfile {}
export type ContactStatus = 'active' | 'inactive'

// Files: kebab-case
// contact-form.tsx
// user-profile.ts
```

**Import Order**:
```typescript
// 1. React/Next.js
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 2. Third-party libraries
import { createClient } from '@supabase/supabase-js'

// 3. Internal modules (@/ imports)
import { ContactForm } from '@/components/contacts/contact-form'
import { formatPhone } from '@/lib/utils/formatting'

// 4. Types
import type { Contact } from '@/lib/types/contact'

// 5. Relative imports (avoid if possible)
import { localHelper } from './helpers'
```

---

## 🔄 Development Workflow

### Setup

1. **Clone and Install**:
   ```bash
   git clone https://github.com/jaredmiller23/roofing-saas.git
   cd roofing-saas
   npm install
   ```

2. **Environment Setup**:
   ```bash
   cp .env.example .env.local
   # Fill in your development credentials
   ```

3. **Install git-secrets** (prevents credential commits):
   ```bash
   brew install git-secrets
   cd roofing-saas
   git secrets --install
   git secrets --register-aws
   # See docs/PREVENTION_PLAN.md for custom patterns
   ```

4. **Verify Setup**:
   ```bash
   npm run build      # Should succeed
   npm run lint       # Should have ≤10 warnings
   npm run test       # Should pass (when implemented)
   ```

### Daily Development

**Standard Workflow**:

1. **Pull latest changes**:
   ```bash
   git pull origin main
   npm install  # Update dependencies if needed
   ```

2. **Create feature branch** (optional):
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Develop with quality checks**:
   ```bash
   # Continuous type checking (in separate terminal)
   npm run dev  # Runs Next.js dev server

   # Before committing
   npm run build     # Verify TypeScript
   npm run lint      # Check code quality
   ```

4. **Commit with standards**:
   ```bash
   git add .
   git commit -m "feat: Add contact export feature"
   # Pre-commit hooks run automatically:
   # - ESLint with max 10 warnings
   # - git-secrets credential scan
   ```

5. **Push and deploy**:
   ```bash
   git push origin main
   # Vercel automatically deploys
   ```

### Quality Gate Checklist

Before **EVERY** commit:

- [ ] `npm run build` succeeds (no TypeScript errors)
- [ ] `npm run lint` passes (≤10 warnings)
- [ ] Changes tested locally in browser
- [ ] No console errors in browser
- [ ] No credentials in code (git-secrets will check)
- [ ] Descriptive commit message

Before **EVERY** push:

- [ ] All commits follow guidelines
- [ ] Features work in development
- [ ] No breaking changes to existing features
- [ ] README updated if needed

---

## 📝 Commit Guidelines

### Commit Message Format

**Structure**:
```
<type>: <description>

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance (deps, config, etc.)

**Examples**:
```bash
# Good commit messages
git commit -m "feat: Add contact export to CSV feature"
git commit -m "fix: Resolve phone number formatting for international numbers"
git commit -m "docs: Update SECURITY.md with credential rotation steps"
git commit -m "refactor: Extract contact validation logic to shared utility"
git commit -m "chore: Update Sentry SDK to v10.25.0"

# Bad commit messages (too vague)
git commit -m "fix stuff"
git commit -m "update"
git commit -m "changes"
git commit -m "wip"
```

**Multi-line Commits** (for complex changes):
```bash
git commit -m "feat: Add comprehensive E2E test suites

- Add Playwright configuration for WebKit/Chromium/Firefox
- Create auth setup with test user fixtures
- Add comprehensive project CRUD tests
- Add error state handling tests
- Configure GitHub Actions for CI

Closes #123"
```

### Commit Best Practices

**DO**:
- ✅ Write clear, descriptive messages
- ✅ Commit logical units of work
- ✅ Reference issue numbers when applicable
- ✅ Run quality checks before committing
- ✅ Keep commits focused (one feature/fix per commit)

**DON'T**:
- ❌ Commit "WIP" or "temp" to main branch
- ❌ Mix multiple unrelated changes in one commit
- ❌ Commit without testing
- ❌ Use vague messages like "fix" or "update"
- ❌ Commit generated files (build artifacts, node_modules)

### Pre-Commit Hook Behavior

**Automatic on `git commit`**:

1. **lint-staged** runs:
   ```bash
   eslint --fix --max-warnings 10
   ```
   - Auto-fixes formatting issues
   - Blocks if >10 warnings remain

2. **git-secrets** runs:
   - Scans commit for credential patterns
   - Blocks if credentials detected
   - Shows which line/pattern matched

**If Blocked**:
```bash
# ESLint blocked (too many warnings)
# Fix the warnings, then retry commit
npm run lint
# Address issues, then:
git add .
git commit -m "your message"

# git-secrets blocked (credential detected)
# Remove credentials, use environment variables
# See SECURITY.md for proper credential management
```

---

## 🧪 Testing Requirements

### Test Standards (Future)

**When Implemented**:
- Unit tests: Jest/Vitest
- Integration tests: React Testing Library
- E2E tests: Playwright

**Current E2E Tests**:
```bash
# Run end-to-end tests
npm run test:e2e

# Run specific test
npm run test:e2e -- projects.comprehensive.spec.ts

# Run in UI mode (debugging)
npm run test:e2e:ui
```

**Coverage Requirements** (future):
- Minimum 80% coverage for new features
- Critical paths: 100% coverage
- Test both happy path and error states

### Manual Testing Checklist

Until automated testing is comprehensive:

**For Every Feature**:
- [ ] Test happy path (normal user flow)
- [ ] Test error states (validation failures)
- [ ] Test edge cases (empty data, max values)
- [ ] Test on Safari (primary browser)
- [ ] Test on mobile viewport
- [ ] Test with real Supabase data
- [ ] Verify RLS policies (multi-tenant isolation)

---

## 🏗️ Architecture Guidelines

### Multi-Tenant Design

**ALWAYS include tenant_id**:
```typescript
// ❌ BAD: Missing tenant_id check
const contacts = await supabase
  .from('contacts')
  .select('*')

// ✅ GOOD: Filtered by tenant
const contacts = await supabase
  .from('contacts')
  .select('*')
  .eq('tenant_id', user.tenant_id)
```

**Use RLS Policies**:
- Let database enforce tenant isolation
- Don't rely on application logic alone
- See: docs/MULTI_TENANT_ARCHITECTURE_GUIDE.md

### Component Structure

**File Organization**:
```
components/
├── ui/                    # shadcn/ui primitives
│   ├── button.tsx
│   └── dialog.tsx
├── contacts/             # Feature components
│   ├── contact-form.tsx
│   ├── contacts-table.tsx
│   └── contact-details.tsx
└── layout/               # Layout components
    ├── sidebar.tsx
    └── nav.tsx
```

**Component Patterns**:
```typescript
// ✅ GOOD: Server Component (default)
export default async function ContactsPage() {
  const supabase = await createClient()
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')

  return <ContactsTable contacts={contacts} />
}

// ✅ GOOD: Client Component (when needed)
'use client'

export function ContactForm() {
  const [name, setName] = useState('')
  // Interactive component
}
```

### API Routes

**Naming**: `app/api/[resource]/route.ts`

**Structure**:
```typescript
// app/api/contacts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Authenticate
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get tenant_id
  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()

  // Query with tenant isolation
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('tenant_id', tenantUser.tenant_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ contacts })
}
```

---

## 🔐 Security Guidelines

### Credential Management

**See**: [SECURITY.md](./SECURITY.md) for comprehensive security policies

**Quick Rules**:
- ✅ Use environment variables for all secrets
- ✅ Use `.env.local` for development (gitignored)
- ✅ Use `.env.example` for templates (committed)
- ✅ Use Vercel Environment Variables for production
- ❌ NEVER commit credentials to git
- ❌ NEVER hardcode API keys in source code

**Pre-Commit Check**:
```bash
# git-secrets automatically scans for:
- Twilio credentials
- OpenAI API keys
- Resend API keys
- QuickBooks secrets
- Generic API key patterns
```

### Database Security

**Row Level Security (RLS)**:
- All tables have RLS enabled
- Policies enforce tenant_id filtering
- Service role used only in server components
- Never expose service role key to client

**Query Validation**:
```typescript
// ✅ GOOD: Parameterized queries (Supabase handles)
const { data } = await supabase
  .from('contacts')
  .select('*')
  .eq('email', userInput)  // Safe - Supabase sanitizes

// ❌ BAD: Raw SQL with user input (if using raw queries)
const { data } = await supabase.rpc('custom_query', {
  query: `SELECT * FROM contacts WHERE email = '${userInput}'`
  // NEVER DO THIS - SQL injection risk
})
```

---

## 📊 Performance Guidelines

### Database Queries

**Optimize Queries**:
```typescript
// ❌ BAD: N+1 queries
const contacts = await supabase.from('contacts').select('*')
for (const contact of contacts.data) {
  const projects = await supabase
    .from('projects')
    .select('*')
    .eq('contact_id', contact.id)
  // Called N times!
}

// ✅ GOOD: Single query with join
const contacts = await supabase
  .from('contacts')
  .select(`
    *,
    projects (*)
  `)
// Single query, all data
```

**Use Indexes**:
- All foreign keys should have indexes
- Add indexes for frequently queried columns
- See migration files for index definitions

### Component Performance

**Use React Best Practices**:
```typescript
// ✅ GOOD: Memoize expensive calculations
const sortedContacts = useMemo(
  () => contacts.sort((a, b) => a.name.localeCompare(b.name)),
  [contacts]
)

// ✅ GOOD: Memoize callbacks
const handleClick = useCallback(() => {
  doSomething(value)
}, [value])
```

**Lazy Load Heavy Components**:
```typescript
// ✅ GOOD: Code splitting
import dynamic from 'next/dynamic'

const HeavyMap = dynamic(() => import('./HeavyMap'), {
  ssr: false,
  loading: () => <div>Loading map...</div>
})
```

---

## 📚 Documentation

### Code Documentation

**When to Comment**:
```typescript
// ❌ BAD: Obvious comments
// Set name to value
setName(value)

// ✅ GOOD: Explain "why" not "what"
// Proline CRM uses MM/DD/YYYY format, convert to ISO 8601
const isoDate = convertProlineDate(dateString)

// ✅ GOOD: Document business logic
// Per TCPA compliance, must log consent before enabling SMS
await logSmsConsent(contactId, consentDate)
```

**Function Documentation**:
```typescript
/**
 * Transform Proline contact data to our schema
 *
 * Handles field mapping, data validation, and stores original
 * Proline ID in notes for relationship linking during migration.
 *
 * @param contact - Raw contact data from Proline CSV
 * @param options - Migration options including tenant_id and user_id
 * @returns Transformed contact ready for database insertion
 */
function transformContact(
  contact: ProlineContact,
  options: MigrationOptions
): DatabaseContact {
  // ...
}
```

### README Files

**Project README**: High-level overview, setup instructions
**Feature READMEs**: Complex features (e.g., docs/AI_VOICE_ASSISTANT_ARCHITECTURE.md)

---

## 🚀 Deployment

### Vercel Deployment

**Automatic**:
- Every push to `main` triggers Vercel deployment
- Build must succeed (TypeScript, ESLint)
- Environment variables configured in Vercel dashboard

**Manual Verification**:
```bash
# Before pushing
npm run build     # Verifies build works
npm run lint      # Checks code quality

# After pushing
# 1. Go to Vercel dashboard
# 2. Verify deployment succeeded
# 3. Test critical paths in production
```

### Deployment Checklist

Before pushing to `main`:
- [ ] TypeScript compiles (`npm run build`)
- [ ] ESLint passes (≤10 warnings)
- [ ] Tests pass (when implemented)
- [ ] Changes tested locally
- [ ] No credentials in code
- [ ] Environment variables documented in `.env.example`

After deployment:
- [ ] Verify deployment succeeded in Vercel
- [ ] Test critical user flows
- [ ] Check Sentry for errors
- [ ] Monitor Supabase logs

---

## 🐛 Troubleshooting

### Common Issues

**"ESLint: Too many warnings"**:
```bash
# See what's failing
npm run lint

# Common fixes:
# - Remove unused imports
# - Remove unused variables
# - Fix 'any' types where possible
# - Add missing useEffect dependencies
```

**"TypeScript build error"**:
```bash
# See detailed errors
npm run build

# Common fixes:
# - Fix type mismatches
# - Add missing type imports
# - Update Next.js params to handle Promises (Next 15+)
```

**"git-secrets blocked my commit"**:
```bash
# See what matched
git secrets --scan

# Common fixes:
# - Move credentials to .env.local
# - Replace with environment variable
# - Use placeholder in .env.example
# - See SECURITY.md for proper credential management
```

---

## 📞 Getting Help

**Questions**:
- Check existing documentation (CLAUDE.md, SECURITY.md, etc.)
- Search closed GitHub issues
- Create new GitHub issue with details

**Bugs**:
- Verify it's actually a bug (test locally)
- Check Sentry for error details
- Create GitHub issue with reproduction steps

**Security Issues**:
- See [SECURITY.md](./SECURITY.md) for reporting procedure
- DO NOT create public issue for security vulnerabilities

---

## 🎓 Learning Resources

### Project Documentation
- [CLAUDE.md](./CLAUDE.md) - Project overview and guidelines
- [SECURITY.md](./SECURITY.md) - Security policies
- [docs/PREVENTION_PLAN.md](./docs/PREVENTION_PLAN.md) - Incident prevention
- [docs/MULTI_TENANT_ARCHITECTURE_GUIDE.md](./docs/MULTI_TENANT_ARCHITECTURE_GUIDE.md) - RLS patterns

### Technology Stack
- [Next.js 14 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

## 🤝 Code Review

### For Reviewers

**Check**:
- [ ] Code follows style guidelines
- [ ] TypeScript types are explicit and correct
- [ ] No credentials in code
- [ ] RLS policies enforced
- [ ] Error handling present
- [ ] Tests added (when applicable)
- [ ] Documentation updated

**Questions to Ask**:
- Does this handle edge cases?
- Is tenant isolation maintained?
- Are errors logged appropriately?
- Could this be simplified?

### For Contributors

**Before Requesting Review**:
- [ ] All quality checks pass
- [ ] Changes tested thoroughly
- [ ] Commit messages descriptive
- [ ] Documentation updated
- [ ] No console.logs left in code

---

## 📋 Maintenance

### Weekly Tasks
- [ ] Review and deploy pending changes
- [ ] Check for dependency updates (`npm outdated`)
- [ ] Review Sentry error reports
- [ ] Verify Vercel deployments succeeded

### Monthly Tasks
- [ ] Security audit (`npm audit`)
- [ ] Update git-secrets patterns
- [ ] Review code quality metrics
- [ ] Update documentation if needed

---

**Remember**: "Cleaner is better." Quality over speed, always.

---

*This document is living and should be updated as standards evolve. Last review: November 18, 2025*
