# Sentry Setup Guide

**Error Tracking & Performance Monitoring**
**Date**: November 18, 2025
**Status**: ⚠️ Setup Required

---

## Overview

Sentry provides real-time error tracking, performance monitoring, and session replay for production debugging and monitoring.

### What's Included

- ✅ **Error Tracking**: Catch and track errors in client, server, and edge runtimes
- ✅ **Performance Monitoring**: Track API response times, page load speeds, database queries
- ✅ **Session Replay**: Watch user sessions leading up to errors
- ✅ **Release Tracking**: Track errors by git commit/release
- ✅ **Source Maps**: Pretty stack traces with original TypeScript code
- ✅ **Alerts**: Email/Slack notifications for critical errors

---

## Prerequisites

- Sentry account (free tier available)
- Admin access to create Sentry project
- Vercel deployment (for automatic source maps)

---

## Step 1: Create Sentry Account

1. **Sign Up**
   - Go to https://sentry.io/signup/
   - Create account with email or GitHub
   - Select "Next.js" as platform

2. **Create Project**
   - Name: `roofing-saas`
   - Platform: `Next.js`
   - Alert frequency: `On every new issue`
   - Click **Create Project**

3. **Get DSN**
   - After creating project, you'll see the DSN
   - Format: `https://xxxxx@oxxxxx.ingest.sentry.io/xxxxx`
   - **Save this** - you'll need it for environment variables

---

## Step 2: Configure Environment Variables

### Local Development (.env.local)

Add these variables to your `.env.local` file:

```bash
# Sentry Configuration
SENTRY_DSN="https://xxxxx@oxxxxx.ingest.sentry.io/xxxxx"
NEXT_PUBLIC_SENTRY_DSN="https://xxxxx@oxxxxx.ingest.sentry.io/xxxxx"
SENTRY_ORG="your-org-slug"
SENTRY_PROJECT="roofing-saas"

# Optional: Auth token for source maps upload
SENTRY_AUTH_TOKEN="sntrys_xxxxx"
```

**Note**: Use the same DSN for both `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`.

---

### Vercel Production

Add environment variables in Vercel dashboard:

1. Go to **Vercel** → **Your Project** → **Settings** → **Environment Variables**

2. Add each variable:

| Variable | Value | Environments |
|----------|-------|--------------|
| `SENTRY_DSN` | Your Sentry DSN | Production, Preview, Development |
| `NEXT_PUBLIC_SENTRY_DSN` | Your Sentry DSN | Production, Preview, Development |
| `SENTRY_ORG` | Your org slug | Production, Preview |
| `SENTRY_PROJECT` | `roofing-saas` | Production, Preview |
| `SENTRY_AUTH_TOKEN` | Auth token (see below) | Production, Preview |

---

## Step 3: Create Sentry Auth Token

Required for uploading source maps during builds.

1. **Generate Token**
   - Go to https://sentry.io/settings/account/api/auth-tokens/
   - Click **Create New Token**
   - Name: `Vercel Deployment`
   - Scopes:
     - ✅ `project:read`
     - ✅ `project:releases`
     - ✅ `org:read`
   - Click **Create Token**

2. **Copy Token**
   - Format: `sntrys_xxxxxxxxxxxxx`
   - Add to `.env.local` and Vercel environment variables

---

## Step 4: Verify Installation

### Check Files Created

Ensure these files exist:

```
✅ sentry.client.config.ts
✅ sentry.server.config.ts
✅ sentry.edge.config.ts
✅ instrumentation.ts
✅ next.config.ts (updated with Sentry)
```

### Test Locally

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Check Console**
   - Should see "Sentry Logger [Log]" messages if debug enabled
   - No errors about missing DSN

3. **Trigger Test Error**
   - Add this to any page:
     ```typescript
     if (typeof window !== 'undefined') {
       throw new Error('Test Sentry error!')
     }
     ```
   - Visit the page
   - Check Sentry dashboard for error

4. **Remove Test Error**
   - Delete the test code
   - Error should appear in Sentry within seconds

---

## Step 5: Configure Alerts

### Email Alerts

1. Go to **Sentry** → **Settings** → **Projects** → **roofing-saas**
2. Click **Alerts**
3. Default alert already created: "Send a notification for new issues"
4. Customize:
   - **When**: `A new issue is created`
   - **Then**: `Send a notification via email`
   - **To**: Your email or team@yourcompany.com

### Slack Integration (Optional)

1. Go to **Settings** → **Integrations**
2. Find **Slack**
3. Click **Add to Slack**
4. Authorize and select channel (e.g., `#engineering-alerts`)
5. Configure alert rules to post to Slack

---

## Step 6: Performance Monitoring

Performance monitoring is already configured in the Sentry config files.

### What's Tracked

- **Page Load Times**: Time to First Byte (TTFB), First Contentful Paint (FCP)
- **API Response Times**: All `/api/*` routes
- **Database Queries**: Supabase query performance
- **User Interactions**: Button clicks, form submissions

### View Performance Data

1. Go to **Sentry** → **Performance**
2. See:
   - Transaction list (pages/API routes)
   - Response time graphs
   - Slow queries
   - Apdex score

---

## Step 7: Session Replay

Session replay records user sessions and plays them back when errors occur.

### Privacy Settings

Already configured in `sentry.client.config.ts`:
- ✅ `maskAllText: true` - Masks all text content
- ✅ `blockAllMedia: true` - Blocks images/video
- ✅ Sensitive endpoints excluded

### View Replays

1. Go to **Sentry** → **Replays**
2. Click any session
3. Watch video of user actions leading to error
4. See network requests, console logs, DOM mutations

**Sample Rate**: 10% of all sessions, 100% of error sessions

---

## Environment Variables Reference

| Variable | Purpose | Required | Example |
|----------|---------|----------|---------|
| `SENTRY_DSN` | Server-side error tracking | Yes | `https://xxx@oxx.ingest.sentry.io/xxx` |
| `NEXT_PUBLIC_SENTRY_DSN` | Client-side error tracking | Yes | Same as `SENTRY_DSN` |
| `SENTRY_ORG` | Organization slug for source maps | Yes (prod) | `your-company` |
| `SENTRY_PROJECT` | Project name for source maps | Yes (prod) | `roofing-saas` |
| `SENTRY_AUTH_TOKEN` | Upload source maps | Yes (prod) | `sntrys_xxxxxx` |

---

## Configuration Details

### Client Configuration (Browser)

**File**: `sentry.client.config.ts`

**Features**:
- Error tracking for React components
- Performance monitoring for page loads
- Session replay with privacy masks
- Network request tracking
- Ignores browser extension errors

**Sample Rate**:
- **Development**: 100% of transactions
- **Production**: 10% of transactions (to reduce costs)

---

### Server Configuration (Node.js)

**File**: `sentry.server.config.ts`

**Features**:
- API route error tracking
- Database query monitoring
- HTTP request tracking
- Server-side performance monitoring

**Sample Rate**:
- **Development**: 100% of transactions
- **Production**: 10% of transactions

---

### Edge Configuration

**File**: `sentry.edge.config.ts`

**Features**:
- Middleware error tracking
- Edge function monitoring
- Lower resource usage (edge runtime constraints)

**Sample Rate**:
- **Development**: 100% of transactions
- **Production**: 5% of transactions (more aggressive due to edge limits)

---

## Usage Examples

### Manual Error Reporting

```typescript
import * as Sentry from '@sentry/nextjs'

try {
  // Some code that might fail
  await riskyOperation()
} catch (error) {
  Sentry.captureException(error, {
    level: 'error',
    tags: {
      operation: 'riskyOperation',
      user_action: 'button_click',
    },
    extra: {
      userId: user.id,
      attempt: retryCount,
    },
  })

  // Show user-friendly error
  toast.error('Something went wrong. Our team has been notified.')
}
```

---

### Custom Performance Tracking

```typescript
import * as Sentry from '@sentry/nextjs'

// Start transaction
const transaction = Sentry.startTransaction({
  op: 'enrichment',
  name: 'Batch Property Enrichment',
})

// Create span for database query
const dbSpan = transaction.startChild({
  op: 'db.query',
  description: 'Fetch addresses for enrichment',
})

const addresses = await fetchAddresses()
dbSpan.finish()

// Create span for API call
const apiSpan = transaction.startChild({
  op: 'http.client',
  description: 'Call BatchData API',
})

const results = await batchDataClient.enrich(addresses)
apiSpan.finish()

// Finish transaction
transaction.finish()
```

---

### Add Contextual Data

```typescript
import * as Sentry from '@sentry/nextjs'

// Set user context
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.full_name,
})

// Set custom tags
Sentry.setTag('tenant_id', tenantId)
Sentry.setTag('user_role', userRole)

// Set extra context
Sentry.setContext('enrichment', {
  provider: 'batchdata',
  addresses_count: 150,
  cost_estimate: 15.0,
})
```

---

## Monitoring Best Practices

### ✅ Do's

- **Set user context** in all authenticated pages
- **Add custom tags** for filtering (tenant_id, feature, etc.)
- **Use transactions** for tracking complex operations
- **Review alerts** weekly to catch recurring issues
- **Set up Slack integration** for critical errors
- **Check performance** monthly to catch regressions

### ❌ Don'ts

- **Don't log sensitive data** (passwords, API keys, PII)
- **Don't ignore warnings** about high event volume
- **Don't set 100% sample rate** in production (costly)
- **Don't track expected errors** (404s, validation errors)
- **Don't forget** to test error tracking after deployment

---

## Troubleshooting

### Issue: "DSN not found" error

**Solution**:
- Verify `SENTRY_DSN` is set in `.env.local` or Vercel
- Check DSN format: `https://xxxxx@oxxxxx.ingest.sentry.io/xxxxx`
- Ensure both `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` are set

---

### Issue: Source maps not uploading

**Solution**:
- Verify `SENTRY_AUTH_TOKEN` is set
- Check token has `project:releases` scope
- Verify `SENTRY_ORG` and `SENTRY_PROJECT` match Sentry dashboard
- Check build logs for Sentry upload errors

---

### Issue: Too many events (quota exceeded)

**Solution**:
- Reduce sample rates in config files
- Add more patterns to `ignoreErrors` array
- Filter out noisy errors (e.g., network timeouts)
- Upgrade Sentry plan if needed

---

### Issue: Session replays not recording

**Solution**:
- Verify `replaysSessionSampleRate` > 0
- Check browser console for replay errors
- Ensure user granted permissions (no ad blockers)
- Verify DSN is accessible from client

---

## Cost Estimates

**Sentry Pricing** (as of 2024):

### Free Tier (Developer Plan)
- **5,000 errors/month**
- **10,000 transactions/month**
- **50 replays/month**
- **1 team member**
- **30-day retention**

### Team Plan ($26/month)
- **50,000 errors/month** ($0.000045 per additional)
- **100,000 transactions/month** ($0.00004 per additional)
- **500 replays/month** ($0.005 per additional)
- **Unlimited team members**
- **90-day retention**

**Estimated Usage** (with 10% sample rates):
- ~1,000-5,000 errors/month (depends on bugs!)
- ~20,000-50,000 transactions/month
- ~100-300 replays/month

**Recommendation**: Start with **Free Tier**, upgrade if needed

---

## Next Steps

After setup:

1. ✅ Deploy to Vercel (triggers source map upload)
2. ✅ Test error tracking with a test error
3. ✅ Configure alerts (email/Slack)
4. ✅ Set up custom dashboards
5. ✅ Train team on using Sentry for debugging

---

## Related Documentation

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)
- [Releases](https://docs.sentry.io/product/releases/)

---

**Status**: ⚠️ **Manual setup required** - Configure Sentry account and add environment variables
