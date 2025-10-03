# Production Deployment Checklist

Quick reference checklist for deploying Roofing SaaS to production.

**Last Updated**: October 2, 2025
**Estimated Time**: 4-6 hours (first deployment)

---

## Pre-Deployment (Do This First)

### Infrastructure Setup
- [ ] Create production Supabase project
- [ ] Save database password in password manager
- [ ] Create Vercel account (if not already)
- [ ] Purchase custom domain (if not already)
- [ ] Upgrade Twilio from trial to paid account
- [ ] Purchase Twilio phone number
- [ ] Set up Resend account and verify domain

### API Keys Collection
- [ ] Supabase URL and keys (3 items)
- [ ] Database connection strings (2 items)
- [ ] Twilio credentials (3 items)
- [ ] Resend API key and email (2 items)
- [ ] QuickBooks production credentials (3 items)
- [ ] OpenAI API key (1 item)
- [ ] Generate `NEXTAUTH_SECRET` (`openssl rand -base64 32`)

### Code Preparation
- [ ] All features tested locally
- [ ] No console errors in browser
- [ ] Run `npm run typecheck` - passes ✅
- [ ] Run `npm run lint` - no critical errors
- [ ] Run `npm run build` - succeeds ✅
- [ ] All tests passing (`npm test`)
- [ ] Latest code pushed to `main` branch

---

## Database Setup

### Schema Deployment
- [ ] Connect to production database (use `DIRECT_URL`)
- [ ] Run all migrations from `/supabase/migrations/archive/`
- [ ] Verify tables created (run query: `SELECT tablename FROM pg_tables WHERE schemaname='public'`)
- [ ] Verify RLS enabled on all tables
- [ ] Test RLS policies (try querying without auth)

### Storage Setup
- [ ] Create `documents` bucket (private)
- [ ] Create `photos` bucket (private)
- [ ] Create `avatars` bucket (public)
- [ ] Apply RLS policies to storage buckets
- [ ] Test file upload/download

### Seed Data
- [ ] Create production tenant:
  ```sql
  INSERT INTO tenants (name, subdomain, subscription_status, is_active)
  VALUES ('Tennessee Roofing', 'tennessee', 'active', true)
  RETURNING id;
  ```
- [ ] Save tenant ID as `DEFAULT_TENANT_ID`
- [ ] Create admin user account (via app after deployment)
- [ ] Import production data (if migrating from Proline/Enzy)

---

## Vercel Deployment

### Project Setup
- [ ] Connect Git repository to Vercel
- [ ] Set framework preset to Next.js
- [ ] Verify build command: `npm run build`
- [ ] Verify output directory: `.next`

### Environment Variables
Copy from `.env.production.template` and set these in Vercel:

**Supabase (Required)**:
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `DATABASE_URL`
- [ ] `DIRECT_URL`

**Application (Required)**:
- [ ] `NEXT_PUBLIC_APP_URL` (https://yourdomain.com)
- [ ] `NEXTAUTH_URL` (https://yourdomain.com)
- [ ] `NEXTAUTH_SECRET` (generated earlier)
- [ ] `NODE_ENV=production`
- [ ] `DEFAULT_TENANT_ID` (from database)

**Twilio (Required for SMS/Voice)**:
- [ ] `TWILIO_ACCOUNT_SID`
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_PHONE_NUMBER`
- [ ] `TWILIO_MESSAGING_SERVICE_SID` (optional)

**Email (Required for Campaigns)**:
- [ ] `RESEND_API_KEY`
- [ ] `RESEND_FROM_EMAIL`
- [ ] `RESEND_FROM_NAME`

**QuickBooks (Required for Phase 5)**:
- [ ] `QUICKBOOKS_CLIENT_ID`
- [ ] `QUICKBOOKS_CLIENT_SECRET`
- [ ] `QUICKBOOKS_REDIRECT_URI`
- [ ] `QUICKBOOKS_ENVIRONMENT=production`

**OpenAI (Required for Phase 4)**:
- [ ] `OPENAI_API_KEY`

**Optional**:
- [ ] `NETLIFY_API_TOKEN` (if using Netlify DNS)

### Domain Setup
- [ ] Add custom domain in Vercel
- [ ] Configure DNS CNAME record
- [ ] Wait for DNS propagation (5-60 min)
- [ ] Verify SSL certificate issued ✅
- [ ] Test HTTPS access

### Deployment
- [ ] Trigger deployment (push to `main` or manual deploy)
- [ ] Monitor build logs for errors
- [ ] Build completes successfully ✅
- [ ] Deployment live at production URL ✅

---

## Post-Deployment Configuration

### Webhook Updates

**Twilio SMS**:
- [ ] Navigate to Twilio Console > Phone Numbers > Your Number
- [ ] Set webhook URL: `https://yourdomain.com/api/sms/webhook`
- [ ] Set method: POST
- [ ] Test by sending SMS to your Twilio number

**Twilio Voice**:
- [ ] Same phone number config
- [ ] Set voice webhook: `https://yourdomain.com/api/voice/webhook`
- [ ] Set method: POST
- [ ] Test by calling your Twilio number

**QuickBooks**:
- [ ] Navigate to QuickBooks Developer > Your App > Webhooks
- [ ] Add webhook: `https://yourdomain.com/api/quickbooks/webhook`
- [ ] Verify webhook signature validation works

### Application Testing

**Authentication**:
- [ ] Sign up new user account
- [ ] Verify email (if email verification enabled)
- [ ] Log in successfully
- [ ] Log out and log back in

**Contact Management**:
- [ ] Create new contact
- [ ] Search for contact
- [ ] Update contact info
- [ ] View contact details page
- [ ] Delete contact (soft delete)

**Project/Pipeline**:
- [ ] Create new project
- [ ] Associate with contact
- [ ] Move through pipeline stages
- [ ] Update project value
- [ ] View project details

**Communication**:
- [ ] Send SMS to test contact (verify delivery)
- [ ] Make test call (if Phase 4 deployed)
- [ ] Send test email (verify inbox delivery)
- [ ] Check activity timeline shows communication

**Documents**:
- [ ] Upload document
- [ ] View document
- [ ] Download document
- [ ] Delete document

**Photos** (Phase 3):
- [ ] Upload photo
- [ ] View in gallery
- [ ] Add photo metadata
- [ ] Delete photo

**Gamification** (Phase 3):
- [ ] Verify points awarded for activities
- [ ] Check leaderboard displays
- [ ] View personal stats

---

## Monitoring Setup

### Vercel
- [ ] Enable Analytics in Project Settings
- [ ] Enable Speed Insights
- [ ] Set up deployment notifications (Slack/Email)

### Supabase
- [ ] Enable database alerts (80% capacity)
- [ ] Enable API usage alerts (90% quota)
- [ ] Set up connection pool monitoring

### External Services
- [ ] Set Twilio usage alerts ($50, $100 thresholds)
- [ ] Set Resend usage alerts
- [ ] Set OpenAI usage limits ($100/month recommended)

### Error Tracking (Optional but Recommended)
- [ ] Set up Sentry or similar service
- [ ] Configure error notifications
- [ ] Test error reporting

---

## Security Hardening

### Account Security
- [ ] Enable 2FA on Vercel
- [ ] Enable 2FA on Supabase
- [ ] Enable 2FA on Twilio
- [ ] Enable 2FA on Resend
- [ ] Enable 2FA on QuickBooks Developer
- [ ] Enable 2FA on OpenAI

### API Security
- [ ] Verify all API keys are production-specific (not dev/test keys)
- [ ] Confirm RLS policies active on all tables
- [ ] Test unauthorized access (should be blocked)
- [ ] Verify CORS settings are restrictive
- [ ] Check rate limiting is active

### Data Security
- [ ] Verify database backups enabled (daily)
- [ ] Test database restore procedure
- [ ] Confirm storage buckets have proper RLS
- [ ] Review access logs for suspicious activity

---

## Performance Verification

### Speed Tests
- [ ] Test homepage load time (< 2 seconds)
- [ ] Test contact list load (< 1 second)
- [ ] Test project pipeline load (< 1.5 seconds)
- [ ] Test dashboard widgets load (< 2 seconds)
- [ ] Run Lighthouse audit (score > 90)

### Functionality Under Load
- [ ] Test with 10 concurrent users (if possible)
- [ ] Monitor API response times
- [ ] Check database query performance
- [ ] Verify no memory leaks (check Vercel metrics)

---

## Documentation & Handoff

### Internal Documentation
- [ ] Document all production API keys (in password manager)
- [ ] Create runbook for common issues
- [ ] Document backup/restore procedures
- [ ] Create incident response plan

### User Documentation
- [ ] Update user guide with production URLs
- [ ] Create quick start guide for new users
- [ ] Document any feature differences from dev/staging

### Team Handoff
- [ ] Train team on production access
- [ ] Share monitoring dashboard access
- [ ] Review escalation procedures
- [ ] Schedule regular check-ins (weekly for first month)

---

## Go-Live

### Final Checks
- [ ] All checklist items above completed ✅
- [ ] Stakeholder approval received
- [ ] Support team briefed and ready
- [ ] Rollback plan documented
- [ ] Launch communication prepared

### Launch
- [ ] Set DNS to production
- [ ] Announce launch to users
- [ ] Monitor error logs closely (first 24 hours)
- [ ] Be available for immediate support

### Post-Launch (First Week)
- [ ] Daily monitoring of key metrics
- [ ] Address any critical bugs immediately
- [ ] Gather user feedback
- [ ] Document lessons learned
- [ ] Plan immediate improvements

---

## Rollback Procedure (If Needed)

If critical issues arise:

1. **Immediate**:
   - [ ] Revert DNS to previous/maintenance page
   - [ ] Notify users of temporary outage
   - [ ] Document the issue

2. **Investigation**:
   - [ ] Review error logs
   - [ ] Identify root cause
   - [ ] Create fix plan

3. **Resolution**:
   - [ ] Fix issue in dev environment
   - [ ] Test fix thoroughly
   - [ ] Redeploy when confident
   - [ ] Update DNS back to production

4. **Post-Mortem**:
   - [ ] Document what went wrong
   - [ ] Update checklist to prevent repeat
   - [ ] Communicate learnings to team

---

## Monthly Maintenance

After successful deployment, schedule monthly checks:

- [ ] Review and optimize database queries
- [ ] Check for npm package updates (`npm outdated`)
- [ ] Review API usage and costs
- [ ] Test backup restore procedure
- [ ] Review security alerts
- [ ] Update documentation as needed

---

## Support & Escalation

### Technical Issues
1. Check [Troubleshooting Guide](/docs/reference/TROUBLESHOOTING.md)
2. Review Vercel logs
3. Check Supabase logs
4. Contact respective support if service-specific

### Critical Issues
- Database down → Supabase Support (support@supabase.io)
- App down → Check Vercel status (status.vercel.com)
- SMS not working → Twilio Support
- Emails not sending → Resend Support

---

**Deployment Status**: [ ] Not Started / [ ] In Progress / [ ] Complete

**Deployed By**: _______________

**Date**: _______________

**Production URL**: https://_______________

**Notes**:
