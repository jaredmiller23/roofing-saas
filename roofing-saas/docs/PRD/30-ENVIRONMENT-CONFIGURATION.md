# Environment Configuration

## Overview

This document provides a comprehensive reference for all environment variables, configuration files, and deployment settings used by the Roofing SAAS application. The application uses a multi-layer configuration approach with environment files for secrets, TypeScript config files for build-time settings, and runtime configuration for various integrations.

## User Stories

### As a Developer
- I want clear documentation of all required environment variables so that I can set up my local development environment quickly
- I want to understand which variables are required vs optional so that I don't waste time on unnecessary configuration

### As a DevOps Engineer
- I want comprehensive deployment documentation so that I can properly configure production environments
- I want security best practices documented so that I can protect sensitive credentials

### As a System Administrator
- I want to understand all third-party service dependencies so that I can plan for integrations and costs
- I want clear guidance on environment-specific settings so that I can manage staging vs production

---

## Configuration Files Overview

### Key Configuration Files

| File | Purpose | Format |
|------|---------|--------|
| `.env.example` | Template for all environment variables | ENV |
| `.env.production.template` | Production-specific template | ENV |
| `.env.test` | Test environment configuration | ENV |
| `.env.local` | Local development (git-ignored) | ENV |
| `next.config.ts` | Next.js framework configuration | TypeScript |
| `tsconfig.json` | TypeScript compiler options | JSON |
| `eslint.config.mjs` | ESLint rules and plugins | ES Module |
| `postcss.config.mjs` | PostCSS/Tailwind processing | ES Module |
| `playwright.config.ts` | E2E testing configuration | TypeScript |
| `public/manifest.json` | PWA manifest | JSON |
| `sentry.*.config.ts` | Sentry error tracking (3 files) | TypeScript |

---

## Environment Variables

### Supabase Configuration (Required)

| Variable | Required | Public | Description |
|----------|----------|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Yes | Public anonymous key for client-side |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | No | Service role key for server-side admin |
| `DATABASE_URL` | Optional | No | Session pooler connection string |
| `DIRECT_URL` | Optional | No | Direct database connection for migrations |

**Source:** `lib/supabase/server.ts`, `lib/supabase/client.ts`

```bash
# Get from: https://supabase.com/dashboard/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Database connections (Settings > Database > Connection string)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
DIRECT_URL=postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres
```

### Twilio SMS/Voice (Required for Communications)

| Variable | Required | Public | Description |
|----------|----------|--------|-------------|
| `TWILIO_ACCOUNT_SID` | Yes | No | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | Yes | No | Twilio authentication token |
| `TWILIO_PHONE_NUMBER` | Yes | No | Your Twilio phone number |
| `TWILIO_MESSAGING_SERVICE_SID` | Optional | No | Messaging service for scaling |

**Source:** `lib/twilio/client.ts`

```bash
# Get from: https://console.twilio.com/
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Resend Email (Required for Email)

| Variable | Required | Public | Description |
|----------|----------|--------|-------------|
| `RESEND_API_KEY` | Yes | No | Resend API key |
| `RESEND_FROM_EMAIL` | Yes | No | Verified sender email |
| `RESEND_FROM_NAME` | Optional | No | Sender display name |
| `RESEND_WEBHOOK_SECRET` | Optional | No | Webhook signature verification |

**Source:** `lib/resend/client.ts`, `lib/resend/domain-manager.ts`

```bash
# Get from: https://resend.com/api-keys
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=Your Company Name
RESEND_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### QuickBooks Integration (Required for Financial Sync)

| Variable | Required | Public | Description |
|----------|----------|--------|-------------|
| `QUICKBOOKS_CLIENT_ID` | Yes | No | OAuth 2.0 client ID |
| `QUICKBOOKS_CLIENT_SECRET` | Yes | No | OAuth 2.0 client secret |
| `QUICKBOOKS_REDIRECT_URI` | Yes | No | OAuth callback URL |
| `QUICKBOOKS_ENVIRONMENT` | Yes | No | `sandbox` or `production` |

**Source:** `lib/quickbooks/oauth-client.ts`, `lib/quickbooks/client.ts`

```bash
# Get from: https://developer.intuit.com/app/developer/myapps
QUICKBOOKS_CLIENT_ID=your-client-id
QUICKBOOKS_CLIENT_SECRET=your-client-secret
QUICKBOOKS_REDIRECT_URI=http://localhost:3000/api/quickbooks/callback
QUICKBOOKS_ENVIRONMENT=sandbox
```

### Google Maps Platform (Required for Mapping)

| Variable | Required | Public | Description |
|----------|----------|--------|-------------|
| `GOOGLE_MAPS_API_KEY` | Yes | No | Server-side API key |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Yes | Yes | Client-side API key |

**Source:** `lib/maps/geocoding.ts`, `lib/maps/routes.ts`, `lib/address-extraction/google-places-client.ts`

```bash
# Get from: https://console.cloud.google.com/apis/credentials
# Enable: Maps JavaScript API, Geocoding API, Places API, Directions API
GOOGLE_MAPS_API_KEY=AIzaSyD...server-key...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyD...client-key...
```

### Google Calendar OAuth (Optional)

| Variable | Required | Public | Description |
|----------|----------|--------|-------------|
| `GOOGLE_CLIENT_ID` | Optional | No | OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | No | OAuth 2.0 client secret |

```bash
# Get from: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### OpenAI (Required for AI Features)

| Variable | Required | Public | Description |
|----------|----------|--------|-------------|
| `OPENAI_API_KEY` | Yes | No | OpenAI API key for embeddings and voice |

**Source:** `lib/embeddings.ts`

```bash
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### ElevenLabs Voice AI (Optional Premium Voice)

| Variable | Required | Public | Description |
|----------|----------|--------|-------------|
| `ELEVENLABS_API_KEY` | Optional | No | ElevenLabs API key |
| `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` | Optional | Yes | Conversational AI agent ID |

**Source:** `lib/voice/providers/elevenlabs-provider.ts`

```bash
# Get from: https://elevenlabs.io/app/settings/api-keys
ELEVENLABS_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=agent_your_agent_id_here
```

### Property Data Enrichment (Optional)

| Variable | Required | Public | Description |
|----------|----------|--------|-------------|
| `BATCHDATA_API_KEY` | Optional | No | BatchData property lookup |
| `BATCHDATA_API_URL` | Optional | No | API endpoint override |
| `BATCHDATA_TIMEOUT_MS` | Optional | No | Request timeout (default: 30000) |
| `TRACERFY_API_KEY` | Optional | No | Tracerfy skip tracing |
| `TRACERFY_API_URL` | Optional | No | API endpoint override |
| `TRACERFY_TIMEOUT_MS` | Optional | No | Request timeout (default: 60000) |

**Source:** `lib/enrichment/batchdata-client.ts`, `lib/enrichment/tracerfy-client.ts`, `lib/enrichment/enrichment-queue.ts`

```bash
# BatchData - https://developer.batchdata.com/
BATCHDATA_API_KEY=your-api-key-here
BATCHDATA_API_URL=https://api.batchdata.com
BATCHDATA_TIMEOUT_MS=30000

# Tracerfy - https://tracerfy.com/api
TRACERFY_API_KEY=your-api-key-here
TRACERFY_API_URL=https://api.tracerfy.com
TRACERFY_TIMEOUT_MS=60000
```

### Claims Agent Integration (Optional)

| Variable | Required | Public | Description |
|----------|----------|--------|-------------|
| `CLAIMS_AGENT_API_URL` | Optional | No | Claims Agent API endpoint |
| `CLAIMS_AGENT_API_KEY` | Optional | No | Claims Agent authentication |

**Source:** `lib/claims/sync-service.ts`

```bash
CLAIMS_AGENT_API_URL=https://api.claimsagent.com
CLAIMS_AGENT_API_KEY=your-api-key-here
```

### OpenWeather (Optional)

| Variable | Required | Public | Description |
|----------|----------|--------|-------------|
| `OPENWEATHER_API_KEY` | Optional | No | Weather data for voice assistant |

```bash
# Get from: https://openweathermap.org/api
OPENWEATHER_API_KEY=your-api-key-here
```

### Sentry Error Tracking (Optional but Recommended)

| Variable | Required | Public | Description |
|----------|----------|--------|-------------|
| `SENTRY_DSN` | Optional | No | Server-side Sentry DSN |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Yes | Client-side Sentry DSN |
| `SENTRY_ORG` | Optional | No | Sentry organization slug |
| `SENTRY_PROJECT` | Optional | No | Sentry project slug |

```bash
# Get from: https://sentry.io/settings/
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=roofing-saas
```

### Application Configuration

| Variable | Required | Public | Description |
|----------|----------|--------|-------------|
| `NEXT_PUBLIC_APP_URL` | Yes | Yes | Application base URL |
| `NEXTAUTH_URL` | Optional | No | NextAuth callback URL |
| `NEXTAUTH_SECRET` | Optional | No | Session encryption secret |
| `NODE_ENV` | Auto | No | `development`, `test`, or `production` |
| `DEFAULT_TENANT_ID` | Optional | No | Default tenant for production |

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-here  # openssl rand -base64 32
NODE_ENV=development
DEFAULT_TENANT_ID=your-production-tenant-uuid
```

### Netlify (Optional)

| Variable | Required | Public | Description |
|----------|----------|--------|-------------|
| `NETLIFY_API_TOKEN` | Optional | No | DNS management API token |

```bash
# Get from: https://app.netlify.com/user/applications
NETLIFY_API_TOKEN=nfp_xxxxxxxxxxxxxxxxxxxxxx
```

### Vercel-Injected Variables

These are automatically available in Vercel deployments:

| Variable | Description |
|----------|-------------|
| `VERCEL_ENV` | `development`, `preview`, or `production` |
| `VERCEL_GIT_COMMIT_SHA` | Git commit hash (used for Sentry releases) |
| `NEXT_PUBLIC_VERCEL_ENV` | Public environment indicator |
| `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` | Public commit hash |

---

## Next.js Configuration

### `next.config.ts`

**Key Configuration Sections:**

#### 1. PWA Configuration (next-pwa)

```typescript
const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  clientsClaim: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [/* 12 caching strategies */]
});
```

**Caching Strategies:**
| Cache Name | Handler | Max Age | Content Type |
|------------|---------|---------|--------------|
| `google-fonts-webfonts` | CacheFirst | 365 days | Google Fonts |
| `google-fonts-stylesheets` | StaleWhileRevalidate | 7 days | Font CSS |
| `static-font-assets` | StaleWhileRevalidate | 7 days | Font files |
| `static-image-assets` | StaleWhileRevalidate | 24 hours | Images |
| `next-image` | StaleWhileRevalidate | 24 hours | Next.js optimized images |
| `static-audio-assets` | CacheFirst | 24 hours | Audio files |
| `static-video-assets` | CacheFirst | 24 hours | Video files |
| `static-js-assets` | StaleWhileRevalidate | 24 hours | JavaScript |
| `static-style-assets` | StaleWhileRevalidate | 24 hours | CSS |
| `next-data` | StaleWhileRevalidate | 24 hours | Next.js data |
| `static-data-assets` | NetworkFirst | 24 hours | JSON/XML/CSV |
| `apis` | NetworkFirst | 24 hours | API routes |
| `others` | NetworkFirst | 24 hours | Other resources |

#### 2. Core Next.js Settings

```typescript
const nextConfig: NextConfig = {
  reactStrictMode: false,  // Disabled to prevent map double-init
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [{
      protocol: 'https',
      hostname: 'wfifizczqvogbcqamnmw.supabase.co',
      pathname: '/storage/v1/object/public/**',
    }],
  },
};
```

#### 3. HTTP Headers

```typescript
async headers() {
  return [
    {
      source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    {
      source: '/_next/static/:path*',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    {
      source: '/api/:path*',
      headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
    },
  ];
}
```

#### 4. Sentry Integration

```typescript
export default withSentryConfig(withPWA(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  reactComponentAnnotation: { enabled: true },
  tunnelRoute: "/monitoring",
  disableLogger: true,
  automaticVercelMonitors: true,
});
```

---

## TypeScript Configuration

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "scripts"]
}
```

**Key Settings:**
- **Target:** ES2017 for broad browser support
- **Strict Mode:** Enabled for type safety
- **Path Aliases:** `@/*` maps to project root
- **Module Resolution:** Bundler (Next.js optimized)

---

## ESLint Configuration

### `eslint.config.mjs`

**Plugins:**
- `@next/eslint-plugin-next` - Next.js specific rules
- `@typescript-eslint` - TypeScript linting
- `eslint-plugin-react` - React rules
- `eslint-plugin-react-hooks` - Hooks rules

**Ignored Paths:**
- `node_modules/**`
- `.next/**`, `out/**`, `build/**`, `dist/**`
- `scripts/**` - One-time scripts
- `e2e/**`, `**/*.spec.ts`, `**/*.test.ts` - Test files
- `types/intuit-oauth.d.ts`, `types/next-pwa.d.ts` - 3rd party types

**Key Rules:**
```javascript
{
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  'react/no-unescaped-entities': 'warn',
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'warn',
  'prefer-const': 'warn',
}
```

---

## Playwright Configuration

### `playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
    { name: 'webkit', use: { ...devices['Desktop Safari'], storageState: 'playwright/.auth/user.json' }, dependencies: ['setup'] },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], storageState: 'playwright/.auth/user.json' }, dependencies: ['setup'] },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

**Test Environment Variables (`.env.test`):**
```bash
TEST_USER_EMAIL=test@roofingsaas.com
TEST_USER_PASSWORD=TestPassword123!
TEST_TENANT_ID=224f6614-d559-4427-b87d-9132af39a575
TEST_USER_ID=5c349897-07bd-4ac8-9777-62744ce3fc3b
```

---

## Sentry Error Tracking

### Three Configuration Files

| File | Runtime | Sample Rate (Prod) | Features |
|------|---------|-------------------|----------|
| `sentry.client.config.ts` | Browser | 10% traces | Replay, INP tracking |
| `sentry.server.config.ts` | Node.js | 10% traces | HTTP integration |
| `sentry.edge.config.ts` | Edge | 5% traces | Lightweight for edge limits |

**Common Configuration:**
- Environment detection via `VERCEL_ENV` or `NODE_ENV`
- Sensitive data scrubbing (auth headers, tokens, passwords)
- Browser extension error filtering
- Release tracking via Git commit SHA

**Ignored Errors:**
- `ResizeObserver loop` errors
- Network errors (`Failed to fetch`, `NetworkError`)
- User cancellations (`AbortError`)
- Next.js navigation (`NEXT_REDIRECT`, `NEXT_NOT_FOUND`)
- Browser extension errors

---

## PWA Manifest

### `public/manifest.json`

```json
{
  "name": "Roofing SaaS - CRM & Field Management",
  "short_name": "Roofing SaaS",
  "description": "Complete roofing business management platform for CRM, field operations, and door-to-door sales",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0066cc",
  "orientation": "portrait-primary",
  "categories": ["business", "productivity"]
}
```

**Icons:** 10 icon sizes (72px to 512px, including maskable)

**Shortcuts:**
- "New Contact" → `/contacts/new`
- "Take Photo" → `/photos/capture`

**Share Target:**
- Accepts images via Web Share API
- POST to `/share` endpoint

---

## Git Hooks (Husky)

### `.husky/pre-commit`

```bash
cd roofing-saas
npx lint-staged
npm run typecheck
```

**Lint-Staged Configuration:**
Runs ESLint with auto-fix on staged files before commit.

---

## NPM Scripts

### Development
| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `next dev --turbopack` | Start development server |
| `build` | `next build` | Production build |
| `build:dev` | `next build --turbopack` | Development build |
| `start` | `next start` | Start production server |

### Quality
| Script | Command | Purpose |
|--------|---------|---------|
| `lint` | `eslint --max-warnings 5` | Run linter |
| `lint:fix` | `eslint --fix` | Auto-fix lint issues |
| `typecheck` | `tsc --noEmit` | TypeScript type checking |

### Testing
| Script | Command | Purpose |
|--------|---------|---------|
| `test:e2e` | `playwright test` | Run E2E tests |
| `test:e2e:ui` | `playwright test --ui` | Interactive test UI |
| `test:e2e:report` | `playwright show-report` | View test report |

### Utilities
| Script | Command | Purpose |
|--------|---------|---------|
| `setup-email-domain` | `tsx scripts/setup-email-domain.ts` | Configure Resend domain |
| `check-email-status` | `tsx scripts/check-email-status.ts` | Check domain verification |
| `migrate-proline` | `tsx scripts/migrate-proline-data.ts` | Data migration |

---

## Proxy/Middleware Configuration

### `proxy.ts`

Authentication middleware for route protection:

```typescript
const publicRoutes = [
  '/', '/login', '/register', '/reset-password',
  '/auth/callback', '/auth/update-password',
  '/api/sms/test',  // Development only
  '/api/sms/webhook', '/api/email/webhook',
  '/api/voice/webhook', '/api/voice/twiml', '/api/voice/recording',
];
```

**Matcher Pattern:**
```typescript
'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
```

---

## Deployment Configuration

### Vercel Deployment

**Build Settings:**
- Framework Preset: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`

**Required Environment Variables:**
1. All Supabase variables
2. All Twilio variables (for communications)
3. Resend API key (for email)
4. `NEXT_PUBLIC_APP_URL` (your domain)
5. `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
6. `DEFAULT_TENANT_ID` (from Supabase tenants table)

### Webhook Configuration

After deployment, configure webhooks in external services:

| Service | Webhook URL |
|---------|-------------|
| Twilio SMS | `https://yourdomain.com/api/sms/webhook` |
| Twilio Voice | `https://yourdomain.com/api/voice/webhook` |
| QuickBooks | `https://yourdomain.com/api/quickbooks/webhook` |
| Resend Email | `https://yourdomain.com/api/email/webhook` |

---

## Security Best Practices

### Environment Variables

1. **Never commit secrets** - `.env.local` is gitignored
2. **Use different keys** for development, staging, production
3. **Rotate keys quarterly** - NEXTAUTH_SECRET, API keys
4. **Enable 2FA** on all service accounts

### Key Restrictions

1. **Google Maps API Key:**
   - Restrict to HTTP referrers
   - Limit to required APIs only
   - Set budget alerts

2. **Supabase:**
   - Use RLS for data access control
   - Service role key only on server

3. **Twilio:**
   - Configure rate limits
   - Webhook signature verification

---

## File References

| File | Full Path |
|------|-----------|
| `.env.example` | `/Users/ccai/roofing saas/roofing-saas/.env.example` |
| `.env.production.template` | `/Users/ccai/roofing saas/roofing-saas/.env.production.template` |
| `.env.test` | `/Users/ccai/roofing saas/roofing-saas/.env.test` |
| `next.config.ts` | `/Users/ccai/roofing saas/roofing-saas/next.config.ts` |
| `tsconfig.json` | `/Users/ccai/roofing saas/roofing-saas/tsconfig.json` |
| `eslint.config.mjs` | `/Users/ccai/roofing saas/roofing-saas/eslint.config.mjs` |
| `postcss.config.mjs` | `/Users/ccai/roofing saas/roofing-saas/postcss.config.mjs` |
| `playwright.config.ts` | `/Users/ccai/roofing saas/roofing-saas/playwright.config.ts` |
| `package.json` | `/Users/ccai/roofing saas/roofing-saas/package.json` |
| `public/manifest.json` | `/Users/ccai/roofing saas/roofing-saas/public/manifest.json` |
| `proxy.ts` | `/Users/ccai/roofing saas/roofing-saas/proxy.ts` |
| `sentry.client.config.ts` | `/Users/ccai/roofing saas/roofing-saas/sentry.client.config.ts` |
| `sentry.server.config.ts` | `/Users/ccai/roofing saas/roofing-saas/sentry.server.config.ts` |
| `sentry.edge.config.ts` | `/Users/ccai/roofing saas/roofing-saas/sentry.edge.config.ts` |
| `.husky/pre-commit` | `/Users/ccai/roofing saas/roofing-saas/.husky/pre-commit` |
| `public/sw-custom.js` | `/Users/ccai/roofing saas/roofing-saas/public/sw-custom.js` |
| `PRODUCTION_SETUP.md` | `/Users/ccai/roofing saas/roofing-saas/docs/deployment/PRODUCTION_SETUP.md` |
| `GOOGLE_MAPS_SETUP.md` | `/Users/ccai/roofing saas/roofing-saas/docs/GOOGLE_MAPS_SETUP.md` |

---

## Validation Record

### Files Examined
- `/Users/ccai/roofing saas/roofing-saas/.env.example` - 139 lines, complete env var template
- `/Users/ccai/roofing saas/roofing-saas/.env.production.template` - 130 lines, production template
- `/Users/ccai/roofing saas/roofing-saas/.env.test` - 23 lines, test configuration
- `/Users/ccai/roofing saas/roofing-saas/next.config.ts` - 269 lines, full Next.js config with PWA/Sentry
- `/Users/ccai/roofing saas/roofing-saas/tsconfig.json` - 43 lines, TypeScript settings
- `/Users/ccai/roofing saas/roofing-saas/eslint.config.mjs` - 79 lines, ESLint config
- `/Users/ccai/roofing saas/roofing-saas/postcss.config.mjs` - 6 lines, Tailwind v4 setup
- `/Users/ccai/roofing saas/roofing-saas/playwright.config.ts` - 92 lines, E2E test config
- `/Users/ccai/roofing saas/roofing-saas/package.json` - 97 lines, scripts and dependencies
- `/Users/ccai/roofing saas/roofing-saas/public/manifest.json` - 132 lines, PWA manifest
- `/Users/ccai/roofing saas/roofing-saas/proxy.ts` - 120 lines, auth middleware
- `/Users/ccai/roofing saas/roofing-saas/sentry.client.config.ts` - 141 lines, browser error tracking
- `/Users/ccai/roofing saas/roofing-saas/sentry.server.config.ts` - 139 lines, server error tracking
- `/Users/ccai/roofing saas/roofing-saas/sentry.edge.config.ts` - 72 lines, edge error tracking
- `/Users/ccai/roofing saas/roofing-saas/.husky/pre-commit` - 4 lines, git hooks
- `/Users/ccai/roofing saas/roofing-saas/public/sw-custom.js` - Custom service worker
- `/Users/ccai/roofing saas/roofing-saas/docs/deployment/PRODUCTION_SETUP.md` - 445 lines, deployment guide
- `/Users/ccai/roofing saas/roofing-saas/docs/GOOGLE_MAPS_SETUP.md` - 262 lines, maps setup guide
- `/Users/ccai/roofing saas/roofing-saas/app/layout.tsx` - 69 lines, app metadata

### Source Code Verification
- Grep search for `process.env.` across `lib/` directory confirmed all documented env vars
- Verified Supabase client usage in `lib/supabase/server.ts` and `lib/supabase/client.ts`
- Verified Twilio client in `lib/twilio/client.ts`
- Verified Resend client in `lib/resend/client.ts`
- Verified QuickBooks OAuth in `lib/quickbooks/oauth-client.ts`
- Verified Google Maps in `lib/maps/geocoding.ts` and `lib/address-extraction/`
- Verified enrichment providers in `lib/enrichment/batchdata-client.ts` and `tracerfy-client.ts`
- Verified ElevenLabs in `lib/voice/providers/elevenlabs-provider.ts`
- Verified Claims Agent in `lib/claims/sync-service.ts`

### Verification Steps
1. Read all .env* files to document every environment variable
2. Read next.config.ts to document build configuration and PWA settings
3. Read all Sentry config files to document error tracking setup
4. Grep for `process.env.` to find all env var usage in source code
5. Cross-referenced env vars with actual usage in lib/ files
6. Verified deployment docs match configuration files
7. Confirmed all file paths exist via Glob/Read operations

### Validated By
PRD Documentation Agent - Session 32
Date: 2025-12-11T16:35:00Z
