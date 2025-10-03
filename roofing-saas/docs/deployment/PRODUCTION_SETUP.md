# Production Environment Setup Guide

Complete guide for deploying the Roofing SaaS application to production.

**Last Updated**: October 2, 2025
**Target Platform**: Vercel
**Database**: Supabase (PostgreSQL)

---

## Prerequisites

Before starting, ensure you have:
- [ ] Production Supabase project created
- [ ] Custom domain configured
- [ ] SSL certificate (automatic with Vercel)
- [ ] Production API keys for all integrations
- [ ] Vercel account with appropriate plan

---

## 1. Supabase Production Setup

### 1.1 Create Production Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Configure:
   - **Name**: `roofing-saas-production`
   - **Database Password**: Generate strong password (save in password manager)
   - **Region**: Choose closest to your users (e.g., `us-east-1`)
   - **Plan**: Pro or higher (for production support)

### 1.2 Get API Keys

Navigate to **Settings > API**:

```bash
# Copy these values:
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

### 1.3 Get Database Connection Strings

Navigate to **Settings > Database > Connection String**:

```bash
# Session Pooler (for app connections)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# Direct Connection (for migrations)
DIRECT_URL=postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres
```

### 1.4 Apply Database Schema

Run migrations from your local machine:

```bash
# Set environment to production database
export SUPABASE_DB_URL="[DIRECT_URL from above]"

# Apply all migrations
psql $SUPABASE_DB_URL < supabase/migrations/archive/[migration-file].sql
```

Or use Supabase SQL Editor to run migration files directly.

### 1.5 Create Production Tenant

```sql
-- Run in Supabase SQL Editor
INSERT INTO tenants (name, subdomain, subscription_status, is_active)
VALUES ('Your Company Name', 'yourcompany', 'active', true)
RETURNING id;

-- Save the returned UUID as DEFAULT_TENANT_ID
```

### 1.6 Enable Storage

1. Navigate to **Storage > Create Bucket**
2. Create buckets:
   - `documents` (private)
   - `photos` (private)
   - `avatars` (public)

3. Set up RLS policies (see `/docs/reference/RLS_FIX_SUMMARY.md`)

---

## 2. External Service Configuration

### 2.1 Twilio (SMS/Voice)

1. **Upgrade to Paid Account**
   - Navigate to [Twilio Console](https://console.twilio.com)
   - Upgrade from trial to paid account
   - Add payment method

2. **Purchase Phone Number**
   - Console > Phone Numbers > Buy a Number
   - Choose a local number in your service area
   - Enable SMS and Voice capabilities

3. **Get Credentials**
   ```bash
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your-auth-token
   TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
   ```

4. **Configure Webhooks** (after deployment):
   - Phone Numbers > Your Number > Configure
   - **SMS Webhook URL**: `https://yourdomain.com/api/sms/webhook`
   - **Voice Webhook URL**: `https://yourdomain.com/api/voice/webhook`
   - **Method**: POST
   - **Webhook Type**: TwiML

### 2.2 Resend (Email)

1. **Verify Domain**
   - Navigate to [Resend Dashboard](https://resend.com/domains)
   - Add your domain (e.g., `yourdomain.com`)
   - Add DNS records to your DNS provider:
     ```
     Type: TXT
     Name: _resend
     Value: [provided-by-resend]

     Type: MX
     Priority: 10
     Value: feedback-smtp.us-east-1.amazonses.com
     ```
   - Wait for verification (can take up to 48 hours)

2. **Create API Key**
   ```bash
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   RESEND_FROM_NAME=Your Company Name
   ```

### 2.3 QuickBooks Online

1. **Create Production App**
   - Navigate to [QuickBooks Developer](https://developer.intuit.com)
   - Create new app or promote from sandbox
   - Get production credentials:
     ```bash
     QUICKBOOKS_CLIENT_ID=[production-client-id]
     QUICKBOOKS_CLIENT_SECRET=[production-client-secret]
     QUICKBOOKS_ENVIRONMENT=production
     ```

2. **Configure Redirect URI**
   - App Settings > Keys & OAuth
   - Add redirect URI: `https://yourdomain.com/api/quickbooks/callback`

### 2.4 OpenAI (Phase 4)

1. **Create Production API Key**
   - Navigate to [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create new key: "Roofing SaaS Production"
   - **Set Usage Limits** (recommended):
     - Hard limit: $100/month (adjust as needed)
     - Email alerts at 50%, 75%, 90%

2. **Save Key**:
   ```bash
   OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

---

## 3. Vercel Deployment

### 3.1 Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" > "Project"
3. Import your Git repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 3.2 Configure Environment Variables

In Vercel Project Settings > Environment Variables, add ALL variables from `.env.production.template`:

**Critical Variables** (must be set):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_APP_URL` (set to your custom domain)
- `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
- `DEFAULT_TENANT_ID`

**Environment**: Select "Production" for all variables

### 3.3 Configure Custom Domain

1. Project Settings > Domains
2. Add your custom domain: `yourdomain.com`
3. Configure DNS:
   ```
   Type: CNAME
   Name: yourdomain.com
   Value: cname.vercel-dns.com
   ```
4. Wait for DNS propagation (5-60 minutes)
5. SSL certificate issued automatically

### 3.4 Deploy

1. Push to `main` branch or click "Deploy" in Vercel
2. Monitor build logs for errors
3. Test deployment at your custom domain

---

## 4. Post-Deployment Configuration

### 4.1 Update Webhook URLs

**Twilio**:
1. Console > Phone Numbers > Your Number
2. Update webhooks to production URLs:
   - SMS: `https://yourdomain.com/api/sms/webhook`
   - Voice: `https://yourdomain.com/api/voice/webhook`

**QuickBooks**:
1. Developer Dashboard > Your App > Webhooks
2. Add webhook URL: `https://yourdomain.com/api/quickbooks/webhook`

### 4.2 Test Critical Flows

Run through these scenarios:
- [ ] User registration and login
- [ ] Create contact
- [ ] Send SMS (verify delivery)
- [ ] Send email (verify delivery)
- [ ] Create project
- [ ] Upload document/photo
- [ ] Voice call (if Phase 4 deployed)
- [ ] QuickBooks sync (if Phase 5 deployed)

### 4.3 Configure Monitoring

**Vercel Analytics**:
1. Project Settings > Analytics
2. Enable Web Analytics and Speed Insights

**Supabase Monitoring**:
1. Dashboard > Project > Database
2. Set up alerts for:
   - Database size (alert at 80% capacity)
   - API requests (alert at 90% quota)
   - Database connections

**Error Tracking** (Optional):
- Set up Sentry or similar for error tracking
- Configure in `next.config.ts`

### 4.4 Set Up Backups

**Database Backups**:
1. Supabase Dashboard > Database > Backups
2. Enable daily backups (included in Pro plan)
3. Test restore procedure

**Document Storage Backups**:
1. Supabase Dashboard > Storage > Backups
2. Configure automated backups

---

## 5. Security Hardening

### 5.1 Enable 2FA

Enable two-factor authentication on:
- [ ] Supabase account
- [ ] Vercel account
- [ ] Twilio account
- [ ] Resend account
- [ ] QuickBooks Developer account
- [ ] OpenAI account

### 5.2 API Rate Limiting

**Twilio**:
- Set rate limits in Console > Account > Rate Limits
- Recommended: 100 SMS/minute, 10 calls/minute

**OpenAI**:
- Already configured via usage limits

**Supabase**:
- Pro plan includes DDoS protection
- Configure rate limiting in Edge Functions if needed

### 5.3 Regular Key Rotation

Schedule quarterly rotation of:
- [ ] NEXTAUTH_SECRET
- [ ] Supabase service role key
- [ ] Twilio auth token
- [ ] Resend API key
- [ ] OpenAI API key

---

## 6. Troubleshooting

### Build Failures

**Issue**: Build fails on Vercel
**Solution**:
1. Check build logs in Vercel dashboard
2. Verify all environment variables are set
3. Test build locally: `npm run build`
4. Check TypeScript errors: `npm run typecheck`

### Webhook Not Receiving

**Issue**: Twilio/QuickBooks webhooks not working
**Solution**:
1. Verify webhook URL is correct (HTTPS required)
2. Check API route logs in Vercel Functions
3. Test webhook with webhook testing tool (webhook.site)
4. Verify webhook signature validation

### Database Connection Issues

**Issue**: App can't connect to Supabase
**Solution**:
1. Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
2. Check API key hasn't expired
3. Verify RLS policies allow access
4. Check Supabase project is active (not paused)

### Email Delivery Failure

**Issue**: Emails not being delivered
**Solution**:
1. Verify domain is verified in Resend
2. Check DNS records are correct
3. Review Resend logs for bounce/complaint
4. Check spam folder
5. Verify `RESEND_FROM_EMAIL` matches verified domain

---

## 7. Performance Optimization

### 7.1 Enable Caching

**Vercel Edge Network**:
- Automatic for static assets
- Configure via `next.config.ts`

**Database Query Optimization**:
- Review slow queries in Supabase Dashboard
- Add indexes for frequently queried fields
- Enable Supabase connection pooling

### 7.2 Image Optimization

- Images automatically optimized by Next.js Image component
- Configure in `next.config.ts`:
  ```typescript
  images: {
    domains: ['wfifizczqvogbcqamnmw.supabase.co'],
    formats: ['image/avif', 'image/webp'],
  }
  ```

### 7.3 Monitor Performance

Use Vercel Speed Insights to track:
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Cumulative Layout Shift (CLS)

**Target Metrics**:
- LCP: < 2.5s
- FID: < 100ms
- CLS: < 0.1

---

## 8. Maintenance

### Daily
- [ ] Monitor error logs (Vercel Functions)
- [ ] Check SMS/email delivery metrics

### Weekly
- [ ] Review Supabase database usage
- [ ] Check API quotas (Twilio, Resend, OpenAI)
- [ ] Review security alerts

### Monthly
- [ ] Review and optimize database queries
- [ ] Check for dependency updates: `npm outdated`
- [ ] Review access logs for suspicious activity
- [ ] Test backup restore procedure

### Quarterly
- [ ] Rotate API keys and secrets
- [ ] Review and update SSL certificates (auto-renewed by Vercel)
- [ ] Capacity planning review
- [ ] Security audit

---

## Support Contacts

**Technical Issues**:
- Vercel Support: https://vercel.com/support
- Supabase Support: support@supabase.io
- Twilio Support: https://support.twilio.com

**Billing Issues**:
- Check respective dashboards for billing contacts

---

## Related Documentation

- [Deployment Checklist](/docs/deployment/DEPLOYMENT_CHECKLIST.md)
- [Database Setup](/docs/deployment/DATABASE_SETUP.md)
- [Troubleshooting Guide](/docs/reference/TROUBLESHOOTING.md)
- [Session Restart Guide](/docs/sessions/SESSION_RESTART_GUIDE.md)
