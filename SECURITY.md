# Security Policy

**Last Updated**: November 18, 2025
**Project**: Roofing SaaS Platform

---

## 🔐 Security Overview

This document outlines our security policies, best practices, and incident response procedures for the Roofing SaaS platform.

### Quick Links
- [Credential Management](#credential-management)
- [Incident Response](#incident-response)
- [Reporting Vulnerabilities](#reporting-security-vulnerabilities)
- [Best Practices](#security-best-practices)

---

## 🚨 Critical Security Rules

### ❌ NEVER DO THIS

1. **Commit credentials to git**
   - API keys, tokens, passwords
   - Database connection strings
   - OAuth client secrets
   - Service account keys

2. **Hardcode secrets in code**
   - No `const API_KEY = "sk-..."`
   - No inline connection strings
   - No embedded passwords

3. **Share credentials in documentation**
   - No credentials in README files
   - No credentials in markdown docs
   - No credentials in code comments
   - No credentials in commit messages

4. **Store credentials in files with these names**
   - `*PRODUCTION*.md`
   - `*CREDENTIALS*.md`
   - `*SECRETS*.md`
   - `*DEPLOYMENT_GUIDE*.md`

### ✅ ALWAYS DO THIS

1. **Use environment variables**
   ```typescript
   const apiKey = process.env.TWILIO_AUTH_TOKEN
   ```

2. **Use `.env.local` for development**
   ```bash
   # .env.local (gitignored)
   TWILIO_AUTH_TOKEN=your-real-token
   ```

3. **Use `.env.example` for templates**
   ```bash
   # .env.example (committed)
   TWILIO_AUTH_TOKEN=your-twilio-auth-token-here
   ```

4. **Use Vercel Environment Variables for production**
   - Settings > Environment Variables
   - Select "Production" environment
   - Never expose in code

---

## 🔑 Credential Management

### Development Environment

**File**: `.env.local` (gitignored)

```bash
# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# OpenAI
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxx

# Resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# QuickBooks
QUICKBOOKS_CLIENT_ID=ABxxxxxxxxxxxxxxxxx
QUICKBOOKS_CLIENT_SECRET=your-client-secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Production Environment

**Platform**: Vercel Environment Variables

1. Go to Vercel Dashboard
2. Select your project
3. Settings > Environment Variables
4. Add each variable:
   - Name: `TWILIO_AUTH_TOKEN`
   - Value: Your production token
   - Environment: **Production** only

### Template File

**File**: `.env.example` (committed to git)

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# OpenAI API
OPENAI_API_KEY=your-openai-api-key

# Resend Email
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@your-domain.com

# QuickBooks OAuth
QUICKBOOKS_CLIENT_ID=your-quickbooks-client-id
QUICKBOOKS_CLIENT_SECRET=your-quickbooks-client-secret
QUICKBOOKS_REDIRECT_URI=https://your-domain.com/api/quickbooks/callback

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

---

## 🛡️ Security Safeguards

### 1. Pre-Commit Hooks (git-secrets)

**Purpose**: Prevent credentials from being committed

**Installation**:
```bash
# Install git-secrets (macOS)
brew install git-secrets

# Initialize in repository
cd roofing-saas
git secrets --install
git secrets --register-aws

# Add custom patterns (see docs/PREVENTION_PLAN.md)
```

**How It Works**:
- Scans every commit before allowing it
- Blocks commits containing credential patterns
- Immediate feedback to developer

**Testing**:
```bash
# Test that git-secrets is working
echo "TWILIO_AUTH_TOKEN=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" > test.txt
git add test.txt
git commit -m "test"
# Should block with credential pattern match
git reset HEAD test.txt
rm test.txt
```

### 2. Enhanced .gitignore

**Protected Files**:
- `.env.production`
- `.env.local.backup`
- `secrets/` directory
- `credentials/` directory
- `*DEPLOYMENT_GUIDE*.md`
- `*PRODUCTION*.md`
- `*CREDENTIALS*.md`

See `.gitignore` for complete list.

### 3. GitHub Secret Scanning

**Status**: Should be enabled

**Setup**:
1. Go to GitHub repository
2. Settings > Security > Code security and analysis
3. Enable "Secret scanning"
4. Enable "Push protection"

**What It Does**:
- Scans commits for known secret patterns
- Blocks pushes containing secrets
- Alerts repository admins

---

## 🚨 Incident Response

### If You Accidentally Commit Credentials

**IMMEDIATE STEPS**:

1. **STOP** - Do not push to GitHub if not yet pushed

2. **Remove from git** (if not pushed):
   ```bash
   # Remove file from last commit
   git reset HEAD~1
   git rm <file-with-credentials>
   git commit -m "Remove file with credentials"
   ```

3. **Remove from history** (if already pushed):
   ```bash
   # ⚠️ WARNING: Rewrites git history - coordinate with team
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch <file-with-credentials>' \
     --prune-empty --tag-name-filter cat -- --all

   git push --force origin main
   ```

4. **Rotate credentials IMMEDIATELY**:
   - Twilio: Console > Account > Auth Tokens > Create New
   - OpenAI: Platform > API Keys > Revoke > Create New
   - Resend: Dashboard > API Keys > Revoke > Create New
   - QuickBooks: Developer Portal > Apps > Regenerate Secret

5. **Verify rotation**:
   - Test that old credentials no longer work
   - Update `.env.local` with new credentials
   - Update Vercel environment variables
   - Test application with new credentials

6. **Document incident**:
   - What was exposed
   - How long it was exposed
   - What was rotated
   - Prevention measures added

### Previous Incidents

**November 18, 2025** - Production Deployment Guide
- **Exposed**: Twilio, OpenAI, Resend, QuickBooks credentials
- **Duration**: October 4 - November 18 (45 days in git history)
- **Resolution**: Complete git history rewrite (165 commits)
- **Prevention**: git-secrets, enhanced .gitignore, this SECURITY.md
- **Status**: All credentials rotated

---

## 🔍 Reporting Security Vulnerabilities

### How to Report

**For Production Issues**:
1. DO NOT create a public GitHub issue
2. Contact project owner directly
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

**For Code Issues**:
1. Create private security advisory on GitHub
2. Repository > Security > Advisories > New draft
3. Provide detailed description
4. Suggest fixes if possible

### What We Fix

**Priority 1 (Immediate)**:
- Exposed credentials
- SQL injection vulnerabilities
- XSS vulnerabilities
- Authentication bypasses
- Data leaks

**Priority 2 (Next Release)**:
- CSRF vulnerabilities
- Insecure dependencies
- Missing rate limiting
- Weak cryptography

**Priority 3 (Future)**:
- Code quality issues
- Non-security bugs
- Feature requests

---

## 📋 Security Best Practices

### For Developers

**Before Committing**:
- [ ] Run `npm run lint` (checks code quality)
- [ ] Run `npm run build` (verifies TypeScript)
- [ ] Check `git status` for unexpected files
- [ ] Review `git diff` for credentials
- [ ] Verify `.env.local` not staged

**When Adding Dependencies**:
- [ ] Check for known vulnerabilities (`npm audit`)
- [ ] Verify package is actively maintained
- [ ] Review package's permissions/access
- [ ] Use specific versions (not `*` or `latest`)

**When Working with APIs**:
- [ ] Store credentials in environment variables
- [ ] Use least-privilege API keys
- [ ] Implement rate limiting
- [ ] Add error handling (don't expose internals)
- [ ] Log security events

### For AI Assistants (Claude Code)

**Rules**:
1. **NEVER** create files with real credentials
2. **ALWAYS** use environment variable placeholders
3. **CHECK** if file should be gitignored before creating
4. **VERIFY** code quality standards before committing
5. **ASK** user before lowering quality thresholds
6. **RESEARCH** official documentation for security

**Red Flags**:
- Hardcoded API keys in code
- File names: "PRODUCTION", "CREDENTIALS", "SECRETS"
- Lowering linting thresholds
- Committing without build/lint checks
- Creating deployment guides with credentials

### For Database Access

**Supabase Row Level Security (RLS)**:
- All tables must have RLS enabled
- Policies must verify tenant_id
- Use service role only in server components
- Never expose service role key to client

**Query Best Practices**:
- Use parameterized queries (prevent SQL injection)
- Validate all user inputs
- Limit query results (prevent data dumps)
- Log suspicious queries

---

## 🔐 Authentication & Authorization

### Supabase Auth

**User Authentication**:
- Email + Password (with verification)
- Magic links (optional)
- OAuth providers (future)

**Session Management**:
- HTTP-only cookies (secure)
- Auto-refresh tokens
- Expire after inactivity

**Authorization**:
- Role-Based Access Control (RBAC)
- Tenant isolation via RLS
- Field-level permissions

### Multi-Tenant Security

**Tenant Isolation**:
```sql
-- Every query must filter by tenant_id
CREATE POLICY "Users can only see their tenant's data"
  ON contacts
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );
```

**Data Validation**:
- Verify tenant_id on all operations
- Check user permissions before actions
- Audit tenant switching (admin impersonation)

---

## 📊 Security Monitoring

### What We Monitor

**Application Level**:
- Failed login attempts (Supabase Auth)
- API rate limiting (Vercel/Supabase)
- Error rates (Sentry)
- Unusual access patterns

**Infrastructure Level**:
- Vercel deployment security
- Supabase database security
- Third-party API usage
- SSL certificate expiry

### Logs to Review

**Weekly**:
- Sentry error reports
- Supabase auth logs
- API usage patterns

**Monthly**:
- Dependency vulnerabilities (`npm audit`)
- git-secrets pattern updates
- Access control reviews

---

## 🎓 Security Training

### Required Reading

1. **This Document** (SECURITY.md)
2. Prevention Plan (docs/PREVENTION_PLAN.md)
3. Contributing Guidelines (CONTRIBUTING.md)
4. Supabase RLS Guide (docs/MULTI_TENANT_ARCHITECTURE_GUIDE.md)

### Security Checklist

Before your first commit:
- [ ] Read this SECURITY.md
- [ ] Install git-secrets
- [ ] Verify `.env.local` is gitignored
- [ ] Understand credential management
- [ ] Know incident response procedure

---

## 📝 Compliance

### Data Privacy

**GDPR Considerations**:
- User data stored in Supabase (EU or US region)
- Right to be forgotten (soft delete implemented)
- Data export functionality (future)
- Consent tracking (future)

### Call Recording (TCPA)

**Compliance Requirements**:
- Disclosure before recording
- Consent tracking in database
- State-specific rules (two-party consent)
- Storage retention policies

See: docs/COMPLIANCE_GUIDE.md (future)

---

## 🔄 Security Roadmap

### Implemented ✅
- Multi-tenant RLS policies
- Environment variable management
- Pre-commit linting hooks
- Enhanced .gitignore patterns
- git-secrets integration (pending install)
- This SECURITY.md document

### In Progress 🚧
- GitHub Secret Scanning enablement
- git-secrets pattern testing
- Credential rotation (Nov 18 incident)

### Planned 📋
- Automated security audits (monthly)
- Penetration testing (before production launch)
- Bug bounty program (post-launch)
- SOC 2 compliance (future)

---

## 📞 Contact

**Security Issues**: Contact project owner directly (do not use public channels)

**Questions**: Create GitHub issue with label `security-question`

**Emergencies**: If actively exploited, contact immediately

---

**Remember**: Security is everyone's responsibility. When in doubt, ask before committing!

---

*This document is version-controlled and reviewed quarterly. Last review: November 18, 2025*
