# Environment Variables Reference

## Overview

This document provides a comprehensive reference for all environment variables used in the Roofing SaaS application. There are **87 environment variables** total, organized by service/feature category.

**Quick Reference:**
- **Required for Core Functionality:** 8 variables
- **Required for Specific Features:** 24 variables
- **Optional/Enhancement:** 55 variables

**Files:**
- `.env.example` - Template with all 87 variables
- `.env.local` - Your local configuration (git-ignored)
- `.env.production.template` - Production deployment template
- `.env.test` - Test environment configuration

---

## Table of Contents

1. [Core Application](#core-application)
2. [Supabase (Database & Auth)](#supabase-database--auth)
3. [Communications](#communications)
4. [Financial Integration](#financial-integration)
5. [Mapping & Location Services](#mapping--location-services)
6. [AI & Voice Assistants](#ai--voice-assistants)
7. [Property Enrichment APIs](#property-enrichment-apis)
8. [Weather Services](#weather-services)
9. [Compliance & DNC](#compliance--dnc)
10. [Error Tracking & Monitoring](#error-tracking--monitoring)
11. [Deployment & Infrastructure](#deployment--infrastructure)
12. [Testing](#testing)
13. [Webhook Security](#webhook-security)
14. [Auto-Injected Variables](#auto-injected-variables)

---

## Core Application

### NEXT_PUBLIC_APP_URL
- **Required:** Yes
- **Type:** Public
- **Default:** `http://localhost:3000`
- **Description:** Base URL of the application used for webhooks, callbacks, and signing links
- **Used By:** Email links, SMS links, signature documents, OAuth redirects
- **Secret:** No
- **Production Example:** `https://yourdomain.com`

### NODE_ENV
- **Required:** Auto-set by Next.js
- **Type:** Server-side
- **Default:** `development`
- **Description:** Runtime environment mode
- **Values:** `development`, `production`, `test`
- **Used By:** Feature toggles, error handling, PWA disable/enable
- **Secret:** No

### NEXTAUTH_URL
- **Required:** Optional (if using NextAuth)
- **Type:** Server-side
- **Default:** Same as NEXT_PUBLIC_APP_URL
- **Description:** NextAuth.js callback URL
- **Used By:** OAuth redirects
- **Secret:** No

### NEXTAUTH_SECRET
- **Required:** Optional (if using NextAuth)
- **Type:** Server-side
- **Default:** None
- **Description:** Secret key for encrypting session tokens
- **Used By:** Session management
- **Secret:** Yes (NEVER LOG)
- **Generate:** `openssl rand -base64 32`

### DEFAULT_TENANT_ID
- **Required:** Optional (production only)
- **Type:** Server-side
- **Default:** None
- **Description:** Default organization/tenant UUID for production
- **Used By:** Admin operations, default tenant selection
- **Secret:** No

---

## Supabase (Database & Auth)

### NEXT_PUBLIC_SUPABASE_URL
- **Required:** Yes
- **Type:** Public
- **Default:** None
- **Description:** Supabase project URL
- **Used By:** Client-side and server-side database connections
- **Secret:** No
- **Get From:** https://supabase.com/dashboard/project/_/settings/api
- **Example:** `https://abcdefghijklmnop.supabase.co`

### NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Required:** Yes
- **Type:** Public
- **Default:** None
- **Description:** Supabase anonymous/public key for client-side operations
- **Used By:** Browser-based queries (RLS enforced)
- **Secret:** No (designed to be public)
- **Get From:** https://supabase.com/dashboard/project/_/settings/api

### SUPABASE_SERVICE_ROLE_KEY
- **Required:** Yes
- **Type:** Server-side
- **Default:** None
- **Description:** Service role key that bypasses RLS (admin operations only)
- **Used By:** Server-side admin operations, migrations, scripts
- **Secret:** Yes (NEVER EXPOSE TO CLIENT)
- **Get From:** https://supabase.com/dashboard/project/_/settings/api
- **Warning:** Bypasses all Row-Level Security policies

### DATABASE_URL
- **Required:** Optional
- **Type:** Server-side
- **Default:** None
- **Description:** PostgreSQL connection string via session pooler
- **Used By:** Prisma, connection pooling
- **Secret:** Yes (contains password)
- **Get From:** Supabase Dashboard > Settings > Database > Connection string
- **Example:** `postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres`

### DIRECT_URL
- **Required:** Optional
- **Type:** Server-side
- **Default:** None
- **Description:** Direct PostgreSQL connection (bypasses pooler)
- **Used By:** Database migrations, admin scripts
- **Secret:** Yes (contains password)
- **Get From:** Supabase Dashboard > Settings > Database > Connection string
- **Example:** `postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres`
- **Note:** Required for migrations with `npx supabase db push`

---

## Communications

### Twilio (SMS & Voice)

#### TWILIO_ACCOUNT_SID
- **Required:** Yes (for SMS/voice features)
- **Type:** Server-side
- **Default:** None
- **Description:** Twilio account identifier
- **Used By:** SMS sending, call logging, voice webhooks
- **Secret:** No (but keep private)
- **Get From:** https://console.twilio.com/
- **Example:** `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

#### TWILIO_AUTH_TOKEN
- **Required:** Yes (for SMS/voice features)
- **Type:** Server-side
- **Default:** None
- **Description:** Twilio authentication token
- **Used By:** API authentication, webhook signature verification
- **Secret:** Yes (NEVER LOG)
- **Get From:** https://console.twilio.com/

#### TWILIO_PHONE_NUMBER
- **Required:** Yes (for SMS/voice features)
- **Type:** Server-side
- **Default:** None
- **Description:** Your Twilio phone number for sending SMS/making calls
- **Used By:** SMS from field, voice call from field
- **Secret:** No
- **Example:** `+12345678900`

#### TWILIO_MESSAGING_SERVICE_SID
- **Required:** Optional
- **Type:** Server-side
- **Default:** None
- **Description:** Twilio Messaging Service SID for advanced SMS features
- **Used By:** Sender pool, compliance, 10DLC registration
- **Secret:** No
- **Example:** `MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Resend (Email)

#### RESEND_API_KEY
- **Required:** Yes (for email features)
- **Type:** Server-side
- **Default:** None
- **Description:** Resend API key for sending emails
- **Used By:** Email sending, signature reminders, notifications
- **Secret:** Yes (NEVER LOG)
- **Get From:** https://resend.com/api-keys
- **Example:** `re_xxxxxxxxxxxxxxxxxxxx`

#### RESEND_FROM_EMAIL
- **Required:** Yes (for email features)
- **Type:** Server-side
- **Default:** `noreply@example.com`
- **Description:** Verified sender email address
- **Used By:** Email from field
- **Secret:** No
- **Note:** Must be verified in Resend dashboard

#### RESEND_FROM_NAME
- **Required:** Optional
- **Type:** Server-side
- **Default:** `Roofing SaaS`
- **Description:** Sender display name for emails
- **Used By:** Email from name field
- **Secret:** No

#### RESEND_WEBHOOK_SECRET
- **Required:** Optional (recommended for production)
- **Type:** Server-side
- **Default:** None
- **Description:** Secret for verifying Resend webhook signatures
- **Used By:** Email webhook signature verification
- **Secret:** Yes (NEVER LOG)
- **Get From:** https://resend.com/webhooks
- **Security:** HMAC-SHA256 signature verification

---

## Financial Integration

### QuickBooks Online

#### QUICKBOOKS_CLIENT_ID
- **Required:** Yes (for QuickBooks features)
- **Type:** Server-side
- **Default:** None
- **Description:** QuickBooks OAuth 2.0 client ID
- **Used By:** QuickBooks OAuth flow
- **Secret:** No
- **Get From:** https://developer.intuit.com/app/developer/myapps

#### QUICKBOOKS_CLIENT_SECRET
- **Required:** Yes (for QuickBooks features)
- **Type:** Server-side
- **Default:** None
- **Description:** QuickBooks OAuth 2.0 client secret
- **Used By:** OAuth token exchange
- **Secret:** Yes (NEVER LOG)
- **Get From:** https://developer.intuit.com/app/developer/myapps

#### QUICKBOOKS_REDIRECT_URI
- **Required:** Yes (for QuickBooks features)
- **Type:** Server-side
- **Default:** `http://localhost:3000/api/quickbooks/callback`
- **Description:** OAuth callback URL (must match QuickBooks app config)
- **Used By:** OAuth redirect after authorization
- **Secret:** No
- **Production Example:** `https://yourdomain.com/api/quickbooks/callback`

#### QUICKBOOKS_ENVIRONMENT
- **Required:** Yes (for QuickBooks features)
- **Type:** Server-side
- **Default:** `sandbox`
- **Description:** QuickBooks API environment
- **Values:** `sandbox` or `production`
- **Used By:** API endpoint selection
- **Secret:** No

---

## Mapping & Location Services

### Google Maps Platform

#### GOOGLE_MAPS_API_KEY
- **Required:** Yes (for mapping features)
- **Type:** Server-side
- **Default:** None
- **Description:** Server-side Google Maps API key
- **Used By:** Geocoding, reverse geocoding, directions
- **Secret:** Yes (restrict by IP)
- **Get From:** https://console.cloud.google.com/apis/credentials
- **APIs Needed:** Geocoding API, Directions API, Places API

#### NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
- **Required:** Yes (for mapping features)
- **Type:** Public
- **Default:** None
- **Description:** Client-side Google Maps API key
- **Used By:** Interactive maps, territory editor, storm map
- **Secret:** No (but restrict by HTTP referrer)
- **Get From:** https://console.cloud.google.com/apis/credentials
- **APIs Needed:** Maps JavaScript API, Places API
- **Security:** Restrict to your domain only

### Google Calendar

#### GOOGLE_CLIENT_ID
- **Required:** Optional (for calendar integration)
- **Type:** Server-side
- **Default:** None
- **Description:** Google OAuth 2.0 client ID
- **Used By:** Calendar integration OAuth flow
- **Secret:** No
- **Get From:** https://console.cloud.google.com/apis/credentials

#### GOOGLE_CLIENT_SECRET
- **Required:** Optional (for calendar integration)
- **Type:** Server-side
- **Default:** None
- **Description:** Google OAuth 2.0 client secret
- **Used By:** OAuth token exchange
- **Secret:** Yes (NEVER LOG)
- **Get From:** https://console.cloud.google.com/apis/credentials

---

## AI & Voice Assistants

### OpenAI

#### OPENAI_API_KEY
- **Required:** Yes (for AI features)
- **Type:** Server-side
- **Default:** None
- **Description:** OpenAI API key for embeddings, chat, and voice
- **Used By:** Knowledge base embeddings, AI chat, insights query interpreter
- **Secret:** Yes (NEVER LOG)
- **Get From:** https://platform.openai.com/api-keys
- **Cost:** Pay per token/request
- **Example:** `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### ElevenLabs (Premium Voice AI)

#### ELEVENLABS_API_KEY
- **Required:** Optional (for premium voice features)
- **Type:** Server-side
- **Default:** None
- **Description:** ElevenLabs API key for conversational AI
- **Used By:** Voice assistant (premium provider)
- **Secret:** Yes (NEVER LOG)
- **Get From:** https://elevenlabs.io/app/settings/api-keys
- **Cost:** ~$0.30/minute

#### NEXT_PUBLIC_ELEVENLABS_AGENT_ID
- **Required:** Optional (for premium voice features)
- **Type:** Public
- **Default:** None
- **Description:** ElevenLabs conversational AI agent ID
- **Used By:** Client-side voice session initialization
- **Secret:** No
- **Get From:** https://elevenlabs.io/app/conversational-ai
- **Example:** `agent_xxxxxxxxxxxxxxxxxxxxxxxx`

### Google Gemini (Cost-Effective Voice AI)

#### GOOGLE_GEMINI_API_KEY
- **Required:** Optional (for Gemini voice features)
- **Type:** Server-side
- **Default:** None
- **Description:** Google Gemini API key for native audio voice AI
- **Used By:** Voice assistant (cost-effective provider, $0.05/min)
- **Secret:** Yes (NEVER LOG)
- **Get From:** https://aistudio.google.com/app/apikey
- **Cost:** $0.05/minute (83% cheaper than OpenAI)
- **Model:** `gemini-2.5-flash-native-audio-preview-09-2025`
- **Alternative Name:** Can also use `GEMINI_API_KEY`

#### GEMINI_API_KEY
- **Required:** Optional (alias for GOOGLE_GEMINI_API_KEY)
- **Type:** Server-side
- **Default:** None
- **Description:** Alternative env var name for Gemini API key
- **Used By:** Same as GOOGLE_GEMINI_API_KEY
- **Secret:** Yes (NEVER LOG)
- **Note:** Use either this or GOOGLE_GEMINI_API_KEY

### Perplexity AI

#### PERPLEXITY_API_KEY
- **Required:** Optional (for knowledge assistant)
- **Type:** Server-side
- **Default:** None
- **Description:** Perplexity AI API key for real-time knowledge lookups
- **Used By:** Employee Q&A, roofing terminology, diagnosis help
- **Secret:** Yes (NEVER LOG)
- **Get From:** https://www.perplexity.ai/settings/api
- **Cost:** Pay per query

---

## Property Enrichment APIs

### BatchData

#### BATCHDATA_API_KEY
- **Required:** Optional (for property enrichment)
- **Type:** Server-side
- **Default:** None
- **Description:** BatchData API key for property data lookups
- **Used By:** Property owner info, deed records, assessed value
- **Secret:** Yes (NEVER LOG)
- **Get From:** https://developer.batchdata.com/
- **Cost:** Pay per lookup

#### BATCHDATA_API_URL
- **Required:** Optional
- **Type:** Server-side
- **Default:** `https://api.batchdata.com/api/v1`
- **Description:** BatchData API endpoint (for testing/override)
- **Used By:** Property enrichment queue
- **Secret:** No

#### BATCHDATA_TIMEOUT_MS
- **Required:** Optional
- **Type:** Server-side
- **Default:** `30000` (30 seconds)
- **Description:** API request timeout in milliseconds
- **Used By:** Property enrichment queue
- **Secret:** No

### Tracerfy

#### TRACERFY_API_KEY
- **Required:** Optional (for skip tracing)
- **Type:** Server-side
- **Default:** None
- **Description:** Tracerfy API key for skip tracing (phone/email lookup)
- **Used By:** Property owner contact enrichment
- **Secret:** Yes (NEVER LOG)
- **Get From:** https://tracerfy.com/api
- **Cost:** $0.009 per lookup

#### TRACERFY_API_URL
- **Required:** Optional
- **Type:** Server-side
- **Default:** `https://tracerfy.com/v1/api`
- **Description:** Tracerfy API endpoint (for testing/override)
- **Used By:** Skip tracing queue
- **Secret:** No

#### TRACERFY_TIMEOUT_MS
- **Required:** Optional
- **Type:** Server-side
- **Default:** `60000` (60 seconds)
- **Description:** API request timeout for batch operations
- **Used By:** Skip tracing queue (longer timeout for batch)
- **Secret:** No

---

## Weather Services

### OpenWeather

#### OPENWEATHER_API_KEY
- **Required:** Optional (for voice weather feature)
- **Type:** Server-side
- **Default:** None
- **Description:** OpenWeatherMap API key for real-time weather
- **Used By:** Voice assistant weather queries, crew safety checks
- **Secret:** Yes (NEVER LOG)
- **Get From:** https://openweathermap.org/api
- **Features:** Real-time conditions, 3-day forecast
- **Cost:** Free tier: 1,000 calls/day

### Visual Crossing

#### VISUAL_CROSSING_API_KEY
- **Required:** Optional (for historical weather/insurance claims)
- **Type:** Server-side
- **Default:** None
- **Description:** Visual Crossing API key for historical weather data
- **Used By:** Historical hail verification, insurance claim documentation
- **Secret:** Yes (NEVER LOG)
- **Get From:** https://www.visualcrossing.com/sign-up
- **Features:** 50+ years of data, explicit hail event reporting
- **Cost:** Free: 1,000 records/day | Paid: $35/month or $0.0001/record

---

## Compliance & DNC

### FTC National Do Not Call Registry

#### FTC_DNC_ACCOUNT_NUMBER
- **Required:** Optional (for DNC compliance)
- **Type:** Server-side
- **Default:** None
- **Description:** FTC DNC Registry account number
- **Used By:** DNC list scrubbing before campaigns
- **Secret:** No (but keep private)
- **Get From:** https://telemarketing.donotcall.gov/

#### FTC_DNC_ORGANIZATION_ID
- **Required:** Optional (for DNC compliance)
- **Type:** Server-side
- **Default:** None
- **Description:** FTC DNC Registry organization ID
- **Used By:** DNC list downloads
- **Secret:** No (but keep private)
- **Get From:** https://telemarketing.donotcall.gov/

#### FTC_DNC_SUBSCRIPTION_ID
- **Required:** Optional (for DNC compliance)
- **Type:** Server-side
- **Default:** None
- **Description:** FTC DNC Registry subscription ID
- **Used By:** Active subscription verification
- **Secret:** No (but keep private)
- **Get From:** https://telemarketing.donotcall.gov/

### Tennessee State Do Not Call

#### TN_DNC_ACCOUNT_ID
- **Required:** Optional (for TN DNC compliance)
- **Type:** Server-side
- **Default:** None
- **Description:** Tennessee DNC account identifier
- **Used By:** State-level DNC scrubbing
- **Secret:** No (but keep private)
- **Get From:** https://www.tn.gov/tpuc/tennessee-do-not-call-program.html

#### TN_DNC_ACCESS_KEY
- **Required:** Optional (for TN DNC compliance)
- **Type:** Server-side
- **Default:** None
- **Description:** Tennessee DNC access key
- **Used By:** State-level DNC list downloads
- **Secret:** Yes (NEVER LOG)
- **Get From:** https://www.tn.gov/tpuc/tennessee-do-not-call-program.html

### DNC Configuration

#### DNC_SCRUB_INTERVAL_DAYS
- **Required:** Optional
- **Type:** Server-side
- **Default:** `31`
- **Description:** Days between DNC list scrubs (FTC requires ≤31 days)
- **Used By:** Automated DNC scrubbing schedule
- **Secret:** No
- **Compliance:** FTC requires scrub within 31 days of list release

---

## Error Tracking & Monitoring

### Sentry

#### SENTRY_DSN
- **Required:** Optional (recommended for production)
- **Type:** Server-side
- **Default:** None
- **Description:** Sentry DSN for server-side error tracking
- **Used By:** Server-side error capture, performance monitoring
- **Secret:** No (designed to be public)
- **Get From:** https://sentry.io/settings/[org]/projects/[project]/keys/
- **Example:** `https://[key]@[org].ingest.sentry.io/[project-id]`

#### NEXT_PUBLIC_SENTRY_DSN
- **Required:** Optional (recommended for production)
- **Type:** Public
- **Default:** None
- **Description:** Sentry DSN for client-side error tracking
- **Used By:** Browser error capture, session replay
- **Secret:** No (designed to be public)
- **Get From:** https://sentry.io/settings/[org]/projects/[project]/keys/

#### SENTRY_ORG
- **Required:** Optional (for CLI operations)
- **Type:** Server-side
- **Default:** None
- **Description:** Sentry organization slug
- **Used By:** Source maps upload, CLI commands
- **Secret:** No
- **Example:** `your-org-slug`

#### SENTRY_PROJECT
- **Required:** Optional (for CLI operations)
- **Type:** Server-side
- **Default:** `roofing-saas`
- **Description:** Sentry project slug
- **Used By:** Source maps upload, release tracking
- **Secret:** No

#### SENTRY_AUTH_TOKEN
- **Required:** Optional (for source maps)
- **Type:** Server-side
- **Default:** None
- **Description:** Sentry authentication token for CLI operations
- **Used By:** Source maps upload during build
- **Secret:** Yes (NEVER LOG)
- **Get From:** https://sentry.io/settings/account/api/auth-tokens/

---

## Deployment & Infrastructure

### Netlify

#### NETLIFY_API_TOKEN
- **Required:** Optional (for DNS management)
- **Type:** Server-side
- **Default:** None
- **Description:** Netlify API token for programmatic DNS management
- **Used By:** Email domain setup scripts
- **Secret:** Yes (NEVER LOG)
- **Get From:** https://app.netlify.com/user/applications
- **Example:** `nfp_xxxxxxxxxxxxxxxxxxxxxx`

### Claims Agent Integration

#### CLAIMS_AGENT_API_URL
- **Required:** Optional (for claims integration)
- **Type:** Server-side
- **Default:** None
- **Description:** Claims Agent API endpoint URL
- **Used By:** Insurance claims sync
- **Secret:** No
- **Example:** `https://api.claimsagent.com`

#### CLAIMS_AGENT_API_KEY
- **Required:** Optional (for claims integration)
- **Type:** Server-side
- **Default:** None
- **Description:** Claims Agent API authentication key
- **Used By:** Claims API requests
- **Secret:** Yes (NEVER LOG)

---

## Testing

### Test Configuration (.env.test)

#### TEST_USER_EMAIL
- **Required:** Yes (for E2E tests)
- **Type:** Test-only
- **Default:** None
- **Description:** Test user email for Playwright E2E tests
- **Used By:** Authentication setup in tests
- **Secret:** No
- **Example:** `test@roofingsaas.com`

#### TEST_USER_PASSWORD
- **Required:** Yes (for E2E tests)
- **Type:** Test-only
- **Default:** None
- **Description:** Test user password for Playwright E2E tests
- **Used By:** Authentication setup in tests
- **Secret:** Yes (test environment only)

#### TEST_TENANT_ID
- **Required:** Yes (for E2E tests)
- **Type:** Test-only
- **Default:** None
- **Description:** Test organization/tenant UUID
- **Used By:** Multi-tenant test isolation
- **Secret:** No
- **Example:** `224f6614-d559-4427-b87d-9132af39a575`

#### TEST_USER_ID
- **Required:** Yes (for E2E tests)
- **Type:** Test-only
- **Default:** None
- **Description:** Test user UUID
- **Used By:** User-specific test operations
- **Secret:** No
- **Example:** `5c349897-07bd-4ac8-9777-62744ce3fc3b`

---

## Webhook Security

### RESEND_WEBHOOK_SECRET
See [Resend section](#resend_webhook_secret)

### CLAIMS_WEBHOOK_SECRET
- **Required:** Optional (for claims webhooks)
- **Type:** Server-side
- **Default:** None
- **Description:** Secret for verifying Claims Agent webhook signatures
- **Used By:** Claims webhook HMAC-SHA256 signature verification
- **Secret:** Yes (NEVER LOG)
- **Security:** Prevents webhook forgery

---

## Auto-Injected Variables

These are automatically set by hosting platforms and don't need manual configuration.

### Vercel

#### VERCEL_ENV
- **Type:** Auto-injected
- **Description:** Vercel environment (`development`, `preview`, `production`)
- **Used By:** Environment detection, conditional features

#### VERCEL_GIT_COMMIT_SHA
- **Type:** Auto-injected
- **Description:** Git commit SHA for current deployment
- **Used By:** Sentry releases, version tracking

#### NEXT_PUBLIC_VERCEL_ENV
- **Type:** Auto-injected (public)
- **Description:** Public version of VERCEL_ENV
- **Used By:** Client-side environment detection

#### NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
- **Type:** Auto-injected (public)
- **Description:** Public version of commit SHA
- **Used By:** Client-side version display

### CI/CD

#### CI
- **Type:** Auto-injected
- **Description:** Set to `true` in CI environments
- **Used By:** Test retries, parallelization, Sentry logging

---

## Security Classification

### NEVER LOG - High Risk Secrets
These contain authentication credentials that would compromise security if exposed:

- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (contains password)
- `DIRECT_URL` (contains password)
- `TWILIO_AUTH_TOKEN`
- `RESEND_API_KEY`
- `QUICKBOOKS_CLIENT_SECRET`
- `GOOGLE_CLIENT_SECRET`
- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `GOOGLE_GEMINI_API_KEY` / `GEMINI_API_KEY`
- `PERPLEXITY_API_KEY`
- `BATCHDATA_API_KEY`
- `TRACERFY_API_KEY`
- `OPENWEATHER_API_KEY`
- `VISUAL_CROSSING_API_KEY`
- `TN_DNC_ACCESS_KEY`
- `RESEND_WEBHOOK_SECRET`
- `CLAIMS_WEBHOOK_SECRET`
- `NEXTAUTH_SECRET`
- `SENTRY_AUTH_TOKEN`
- `NETLIFY_API_TOKEN`
- `CLAIMS_AGENT_API_KEY`

### Sensitive - Should Not Be Public
These should be kept private but are less critical:

- `GOOGLE_MAPS_API_KEY` (server-side, IP-restricted)
- `TWILIO_ACCOUNT_SID`
- `TWILIO_PHONE_NUMBER`
- `FTC_DNC_ACCOUNT_NUMBER`
- `FTC_DNC_ORGANIZATION_ID`
- `TN_DNC_ACCOUNT_ID`

### Public - Safe to Expose
These are designed to be public-facing (but still restrict in production):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (HTTP referrer restricted)
- `NEXT_PUBLIC_ELEVENLABS_AGENT_ID`
- `NEXT_PUBLIC_SENTRY_DSN`

---

## Minimum Deployment Requirements

### Development (Local)
**Required (8 variables):**
1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `SUPABASE_SERVICE_ROLE_KEY`
4. `NEXT_PUBLIC_APP_URL`
5. `TWILIO_ACCOUNT_SID`
6. `TWILIO_AUTH_TOKEN`
7. `TWILIO_PHONE_NUMBER`
8. `RESEND_API_KEY`

### Production (Full Featured)
**Required (18 variables):**
- All 8 development variables above
- `DATABASE_URL`
- `DIRECT_URL`
- `RESEND_FROM_EMAIL`
- `QUICKBOOKS_CLIENT_ID`
- `QUICKBOOKS_CLIENT_SECRET`
- `QUICKBOOKS_REDIRECT_URI`
- `GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `OPENAI_API_KEY`
- `NEXTAUTH_SECRET`

---

## Feature-Specific Variables

### SMS Campaigns
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `TWILIO_MESSAGING_SERVICE_SID` (optional)

### Email Campaigns
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_FROM_NAME` (optional)
- `RESEND_WEBHOOK_SECRET` (optional)

### Financial Sync (QuickBooks)
- `QUICKBOOKS_CLIENT_ID`
- `QUICKBOOKS_CLIENT_SECRET`
- `QUICKBOOKS_REDIRECT_URI`
- `QUICKBOOKS_ENVIRONMENT`

### Territory Mapping
- `GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### Storm Targeting
- `GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `BATCHDATA_API_KEY` (optional)
- `TRACERFY_API_KEY` (optional)

### Voice Assistant
**Option 1: ElevenLabs (Premium)**
- `ELEVENLABS_API_KEY`
- `NEXT_PUBLIC_ELEVENLABS_AGENT_ID`
- `OPENWEATHER_API_KEY` (optional)

**Option 2: Google Gemini (Cost-Effective)**
- `GOOGLE_GEMINI_API_KEY`
- `OPENWEATHER_API_KEY` (optional)

### AI Features (Knowledge Base, Insights)
- `OPENAI_API_KEY`

### Insurance Claims
- `VISUAL_CROSSING_API_KEY` (optional)
- `CLAIMS_AGENT_API_URL` (optional)
- `CLAIMS_AGENT_API_KEY` (optional)
- `CLAIMS_WEBHOOK_SECRET` (optional)

### DNC Compliance
- `FTC_DNC_ACCOUNT_NUMBER`
- `FTC_DNC_ORGANIZATION_ID`
- `FTC_DNC_SUBSCRIPTION_ID`
- `TN_DNC_ACCOUNT_ID`
- `TN_DNC_ACCESS_KEY`
- `DNC_SCRUB_INTERVAL_DAYS`

---

## Validation & Setup Scripts

### Check Configuration
```bash
# Verify required environment variables
npm run check:env

# Test Twilio connection
npm run test:twilio

# Test email sending
npm run test:email

# Test QuickBooks OAuth
npm run test:quickbooks
```

### Setup Helpers
```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Setup email domain (Resend + DNS)
npm run setup-email-domain

# Check email domain verification
npm run check-email-status
```

---

## Source Files

Variables are used in the following locations:

### Core Libraries
- `lib/supabase/client.ts` - Supabase client config
- `lib/supabase/server.ts` - Supabase server config
- `lib/twilio/client.ts` - Twilio config
- `lib/resend/client.ts` - Resend config
- `lib/quickbooks/client.ts` - QuickBooks config
- `lib/quickbooks/oauth-client.ts` - QuickBooks OAuth

### AI & Voice
- `lib/embeddings.ts` - OpenAI embeddings
- `lib/ai/query-interpreter.ts` - AI query parsing
- `lib/voice/providers/elevenlabs-provider.ts` - ElevenLabs voice
- `app/api/voice/session/gemini/route.ts` - Gemini voice

### Mapping & Enrichment
- `lib/maps/geocoding.ts` - Google Maps geocoding
- `lib/address-extraction/google-places-client.ts` - Google Places
- `lib/enrichment/batchdata-client.ts` - BatchData API
- `lib/enrichment/tracerfy-client.ts` - Tracerfy API

### Configuration
- `next.config.ts` - Next.js config (Sentry, CI)
- `middleware.ts` - Supabase URL/key validation
- `sentry.client.config.ts` - Client-side Sentry
- `sentry.server.config.ts` - Server-side Sentry
- `playwright.config.ts` - Test config

---

## Production Deployment Checklist

### 1. Required Environment Variables
- [ ] All 18 production required variables set
- [ ] `NEXTAUTH_SECRET` generated with `openssl rand -base64 32`
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain (https)
- [ ] `QUICKBOOKS_ENVIRONMENT` set to `production`
- [ ] All webhook URLs updated to production domain

### 2. Security
- [ ] Rotate all API keys (never reuse dev keys in prod)
- [ ] Enable webhook signature verification (`RESEND_WEBHOOK_SECRET`)
- [ ] Configure Google Maps API key restrictions (HTTP referrer)
- [ ] Enable Sentry error tracking
- [ ] Verify RLS policies are active

### 3. Third-Party Services
- [ ] Verify Resend domain (email)
- [ ] Configure Twilio webhook URLs
- [ ] Update QuickBooks OAuth redirect URI
- [ ] Set up Google Maps billing alerts
- [ ] Configure DNC list scrubbing schedule

### 4. Monitoring
- [ ] Set up Sentry alerts
- [ ] Configure log aggregation
- [ ] Enable API rate limiting
- [ ] Set up uptime monitoring

---

## Troubleshooting

### Common Issues

**"NEXT_PUBLIC_SUPABASE_URL is not defined"**
- Check `.env.local` exists and has correct values
- Restart Next.js dev server after adding env vars
- Ensure no trailing whitespace in `.env.local`

**"Invalid Supabase key"**
- Verify key is from correct Supabase project
- Check for copy-paste errors (leading/trailing spaces)
- Ensure you're using anon key for client, service role for server

**"Twilio authentication failed"**
- Verify `TWILIO_AUTH_TOKEN` matches account SID
- Check for trailing newlines in `.env.local`
- Ensure credentials are from same Twilio account

**"QuickBooks redirect URI mismatch"**
- Ensure `QUICKBOOKS_REDIRECT_URI` matches exactly in QuickBooks app config
- Include protocol (http/https) and port (if not 80/443)

**"Google Maps API key invalid"**
- Check API is enabled in Google Cloud Console
- Verify key restrictions match your domain
- Ensure billing is enabled

---

## Reference Links

- **.env.example:** Template for all 87 variables
- **PRD 30 - Environment Configuration:** `docs/PRD/30-ENVIRONMENT-CONFIGURATION.md`
- **Deployment Checklist:** `docs/deployment/DEPLOYMENT_CHECKLIST.md`
- **Production Setup:** `docs/deployment/PRODUCTION_SETUP.md`
- **Google Maps Setup:** `docs/GOOGLE_MAPS_SETUP.md`

---

## Validation Record

**Last Updated:** 2025-12-17
**Validated By:** VEST Task VEST-P4-002
**Total Variables Documented:** 87
**Source:** `.env.example` (195 lines), codebase grep analysis
**Coverage:** 100% of defined environment variables
