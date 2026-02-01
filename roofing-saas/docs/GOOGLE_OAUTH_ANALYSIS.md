# Google OAuth Analysis & Fix Documentation
**Date**: 2026-02-01
**Status**: Investigation Complete

## Executive Summary

The Google Calendar OAuth integration has been **recently stabilized** through 6 commits between Jan 17-31, 2026. The major issues (race conditions, locale handling, state management) have been **resolved**. This document identifies remaining edge cases and testing recommendations.

---

## Recent Fixes (Jan 17-31, 2026)

### 1. Race Condition Fix (0d73343 - Jan 31)
**Problem**: `checkGoogleConnection()` was called before OAuth URL params were processed, causing state flicker.

**Solution**:
- Added `processed` flag to OAuth state
- `GoogleCalendar` waits for `initialOAuthState?.processed === true` before any action
- Always pass `oauthParams` to GoogleCalendar (not conditionally)

**Files Modified**:
- `app/[locale]/(dashboard)/events/page.tsx`
- `components/calendar/GoogleCalendar.tsx`

### 2. Locale Preservation Fix (3f568da - Jan 30)
**Problem**: OAuth redirects were losing locale prefix (`/en/events` → `/events`), causing i18n middleware to strip query params.

**Solution**:
- Extract locale from referer URL using regex: `/^\/([a-z]{2})\//`
- Include locale in `return_to` field of state token
- Use `pathname` from `usePathname()` to preserve locale in router.replace()

**Files Modified**:
- `app/api/calendar/google/connect/route.ts`
- `app/api/calendar/google/callback/route.ts`
- `app/[locale]/(dashboard)/events/page.tsx`

### 3. Architectural Simplification (7103aeb - Jan 30)
**Problem**: Overly complex state management with `needsReauth` state causing confusion.

**Solution**:
- Removed `needsReauth` state entirely
- Simplified connection states to: `isConnected: true/false`
- Token refresh happens transparently in `getGoogleCalendarClient()`

**Files Modified**:
- `components/calendar/GoogleCalendar.tsx`

### 4. Browser Navigation Fix (7da2804 - Jan 26)
**Problem**: Using `fetch()` for OAuth flow (requires browser redirect, not AJAX).

**Solution**: Changed to `window.location.href = '/api/calendar/google/connect'`

### 5. Environment Variable Trimming (216ff6c - Jan 26)
**Problem**: Trailing newlines in `.env` file causing OAuth failures.

**Solution**: Added `.trim()` to all `process.env.GOOGLE_CLIENT_ID` and `process.env.GOOGLE_CLIENT_SECRET` reads.

### 6. Supabase Migration (7ccf620 - Jan 21)
**Added**:
- `google_calendar_tokens` table
- Token encryption functions (`encrypt_google_token`, `decrypt_google_token`)
- RLS policies for tenant isolation

---

## Current Architecture

### OAuth Flow Diagram
```
User clicks "Connect"
  ↓
/api/calendar/google/connect
  - Generates state token (tenant_id, user_id, timestamp, return_to)
  - Redirects to Google OAuth consent
  ↓
Google OAuth consent screen
  ↓
/api/calendar/google/callback?code=...&state=...
  - Exchanges code for tokens
  - Encrypts tokens with pgcrypto
  - Stores in google_calendar_tokens table
  - Redirects to /[locale]/events?google_connected=true&email=...
  ↓
GoogleCalendarWithParams (Suspense wrapper)
  - Processes URL params via useSearchParams()
  - Sets processed: true when done
  - Clears URL params with router.replace(pathname)
  ↓
GoogleCalendar component
  - Waits for initialOAuthState.processed === true
  - If googleConnected: true → fetch events
  - If googleError → show error
  - Else → checkGoogleConnection()
```

### Security Features
- **Token Encryption**: pgcrypto `pgp_sym_encrypt()` with key from `_encryption_keys` table
- **RLS Policies**: Users can only access their own tokens (`user_id = auth.uid()`)
- **CSRF Protection**: State token with timestamp validation (5-minute expiry)
- **Multi-Tenant Isolation**: Tokens scoped to `tenant_id`
- **Server-Side Secrets**: OAuth credentials in `.env` (not `NEXT_PUBLIC_`)

### Token Refresh Flow
```typescript
// In getGoogleCalendarClient() - lib/google/calendar-client.ts:255
1. Fetch token from google_calendar_tokens
2. Decrypt access_token and refresh_token
3. Check if expires_at <= now
4. If expired:
   - Call refreshAccessToken(decryptedRefreshToken)
   - Encrypt new access_token
   - Update google_calendar_tokens.access_token and expires_at
   - Return new GoogleCalendarClient(newAccessToken)
5. Else:
   - Return GoogleCalendarClient(decryptedAccessToken)
```

---

## Potential Edge Cases (Testing Needed)

### 1. Token Revocation by User in Google Account Settings
**Scenario**: User revokes app access in Google account settings while still connected in our app.

**Current Behavior**:
- `/api/calendar/google/events` returns 401 error
- Error handler checks for `401` or `invalid_grant` in error message
- Returns `{ connected: false, error: 'Google Calendar access revoked. Please reconnect.' }`

**Test**: Manually revoke access in https://myaccount.google.com/permissions and try to fetch events.

**Risk Level**: LOW (handled)

### 2. Token Expiry During Active Session
**Scenario**: User is viewing calendar, token expires, then they navigate to different month.

**Current Behavior**:
- `fetchEvents()` calls `getGoogleCalendarClient()`
- `getGoogleCalendarClient()` checks `expires_at` and auto-refreshes if needed
- If refresh fails, returns `null`
- Events endpoint returns `{ connected: false, error: '...' }`

**Test**: Set `expires_at` to past date in DB, then navigate calendar.

**Risk Level**: LOW (handled, but no user feedback on refresh failure)

### 3. Concurrent OAuth Flows (Multiple Tabs)
**Scenario**: User opens two tabs, clicks "Connect" in both, completes OAuth in one.

**Current Behavior**:
- Second tab's OAuth callback will UPSERT with `onConflict: 'tenant_id,user_id'`
- Whichever completes last wins (overwrites tokens)
- Both tabs redirect to success page

**Test**: Open two tabs, initiate OAuth in both, complete one, check if other works.

**Risk Level**: LOW (benign race - both end up connected)

### 4. State Token Expiry (>5 minutes in OAuth flow)
**Scenario**: User opens Google consent screen, waits >5 minutes, then approves.

**Current Behavior**:
```typescript
// app/api/calendar/google/callback/route.ts:50
if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
  throw ValidationError('State token expired')
}
```
- Returns error response (JSON, not redirect)
- User sees API error screen instead of friendly error

**Test**: Manually craft callback URL with old timestamp.

**Risk Level**: MEDIUM (poor UX - should redirect with error message)

### 5. Database Encryption Key Missing
**Scenario**: `_encryption_keys` table doesn't have `google_calendar_encryption_key`.

**Current Behavior**:
```sql
-- Migration creates key if not exists
INSERT INTO _encryption_keys (key_name, key_value)
SELECT 'google_calendar_encryption_key', ...
WHERE NOT EXISTS (...)
```
- Key is created on migration
- If key is deleted after migration, `get_google_calendar_encryption_key()` raises exception

**Test**: Delete encryption key, try to connect.

**Risk Level**: LOW (would require manual DB tampering)

### 6. Locale Not in URL (Direct API Call)
**Scenario**: User navigates directly to `/api/calendar/google/connect` (no referer).

**Current Behavior**:
```typescript
// app/api/calendar/google/connect/route.ts:38
let returnTo = '/en/events' // Default with locale
```
- Falls back to `/en/events`

**Test**: `curl http://localhost:3000/api/calendar/google/connect`

**Risk Level**: LOW (reasonable default)

### 7. Network Failure During Token Exchange
**Scenario**: Google OAuth API is down or times out during `exchangeAuthCode()`.

**Current Behavior**:
```typescript
// lib/google/calendar-client.ts:350
const response = await fetch(`${GOOGLE_OAUTH_URL}/token`, ...)
if (!response.ok) {
  throw new Error(`Token exchange failed: ${error}`)
}
```
- Throws error
- Callback route catches and redirects: `${origin}/en/events?google_error=Failed+to+connect`

**Test**: Mock network failure in token exchange.

**Risk Level**: LOW (handled with generic error)

### 8. Disconnect While Events Are Loading
**Scenario**: User clicks "Disconnect" while `fetchEvents()` is in progress.

**Current Behavior**:
```typescript
// components/calendar/GoogleCalendar.tsx:185
const handleDisconnect = async () => {
  await apiFetch('/api/calendar/google/disconnect', { method: 'POST' })
  setIsConnected(false)
  setEvents([])
  ...
}
```
- Disconnect completes, sets `isConnected: false`
- Ongoing `fetchEvents()` may complete after disconnect
- May briefly show events before empty state

**Test**: Click disconnect immediately after triggering fetch.

**Risk Level**: LOW (minor visual glitch)

### 9. User Switches Tenants While Connected
**Scenario**: Multi-tenant user connects Google in Tenant A, switches to Tenant B.

**Current Behavior**:
- Tokens are scoped to `(tenant_id, user_id)` unique constraint
- `getUserTenantId(user.id)` determines current tenant
- Switching tenant will show "not connected" (different tenant_id)

**Test**: Connect in one tenant, switch tenant, check connection status.

**Risk Level**: LOW (expected behavior - connection is per-tenant)

### 10. Refresh Token Revoked (Permanent Failure)
**Scenario**: Google revokes refresh token (e.g., password change, security event).

**Current Behavior**:
```typescript
// lib/google/calendar-client.ts:370
export async function refreshAccessToken(refreshToken: string) {
  const response = await fetch(...)
  if (!response.ok) {
    logger.error('Failed to refresh Google token', { error })
    return null // Returns null on failure
  }
}
```
- `getGoogleCalendarClient()` returns `null`
- Events endpoint returns `{ connected: false, error: '...' }`
- User sees "not connected" state

**Test**: Manually invalidate refresh token in DB.

**Risk Level**: MEDIUM (no way to recover without re-auth - should show "Re-authorize" button)

---

## Recommended Improvements

### Priority 1: State Token Expiry UX
**Current**: Returns JSON error when state expires.
**Better**: Redirect to `/[locale]/events?google_error=Authorization+expired.+Please+try+again`

```typescript
// app/api/calendar/google/callback/route.ts:50
if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
  return NextResponse.redirect(
    `${request.nextUrl.origin}${returnTo}?google_error=${encodeURIComponent('Authorization expired. Please try again.')}`
  )
}
```

### Priority 2: Refresh Failure Recovery
**Current**: Silent failure when refresh token is invalid.
**Better**: Detect refresh failure, delete stale token, show "Re-authorize" UI.

```typescript
// In getGoogleCalendarClient():
if (expiresAt <= now) {
  const newToken = await refreshAccessToken(decryptedRefreshToken)
  if (!newToken) {
    // Refresh failed - delete stale token
    await supabase
      .from('google_calendar_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
    return null
  }
  // ... encrypt and update
}
```

### Priority 3: Loading State During Token Refresh
**Current**: No indication to user that token is being refreshed.
**Better**: Show "Refreshing connection..." during refresh.

(This requires state management in the component - complex)

### Priority 4: Token Exchange Timeout
**Current**: No timeout on `fetch()` calls to Google APIs.
**Better**: Add timeout to prevent indefinite hangs.

```typescript
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s

const response = await fetch(url, {
  ...options,
  signal: controller.signal,
})

clearTimeout(timeoutId)
```

---

## Testing Checklist

### Manual Testing
- [ ] Happy path: Connect → View events → Navigate months → Disconnect
- [ ] Locale preservation: Test from `/es/events`, `/fr/events`
- [ ] State token expiry: Wait >5 minutes on consent screen
- [ ] Token revocation: Revoke in Google account settings, try to fetch
- [ ] Concurrent tabs: Initiate OAuth in 2 tabs simultaneously
- [ ] Token expiry: Set `expires_at` to past, navigate calendar
- [ ] Network failure: Kill connection during token exchange
- [ ] Disconnect during load: Click disconnect while events are fetching

### Automated Testing (Playwright)
```typescript
// e2e/calendar/google-oauth.spec.ts
test('Google OAuth happy path', async ({ page }) => {
  await page.goto('/en/events')
  await page.click('button:has-text("Google Calendar")')
  await page.click('button:has-text("Connect Google Calendar")')
  // Mock Google OAuth flow or use real credentials
  // Verify connected state
  // Verify events load
  // Disconnect
  // Verify disconnected state
})
```

---

## Environment Variables

### Required
```bash
GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-client-secret>
```
Note: Get these from Google Cloud Console → APIs & Services → Credentials

### OAuth Redirect URI (Google Cloud Console)
```
http://localhost:3000/api/calendar/google/callback (Development)
https://roofing-saas.vercel.app/api/calendar/google/callback (Production)
```

### Scopes Requested
```
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/tasks
https://www.googleapis.com/auth/userinfo.email
```

---

## Files Reference

### Core Files
| File | Purpose |
|------|---------|
| `app/[locale]/(dashboard)/events/page.tsx` | Events page with GoogleCalendarWithParams wrapper |
| `components/calendar/GoogleCalendar.tsx` | Main Google Calendar component |
| `app/api/calendar/google/connect/route.ts` | OAuth initiation endpoint |
| `app/api/calendar/google/callback/route.ts` | OAuth callback handler |
| `app/api/calendar/google/status/route.ts` | Connection status check |
| `app/api/calendar/google/events/route.ts` | Fetch events from Google |
| `app/api/calendar/google/disconnect/route.ts` | Revoke and delete connection |
| `lib/google/calendar-client.ts` | Google Calendar API client |
| `supabase/migrations/20260131000000_google_calendar_integration.sql` | Database schema |

### Database Tables
| Table | Purpose |
|-------|---------|
| `google_calendar_tokens` | Stores encrypted OAuth tokens |
| `_encryption_keys` | Stores encryption key for pgcrypto |

---

## Conclusion

The Google OAuth implementation is **production-ready** with recent fixes addressing major issues. The remaining edge cases are **low-risk** and primarily affect UX in rare scenarios.

**Recommended Next Steps**:
1. Implement Priority 1 fix (state token expiry UX)
2. Implement Priority 2 fix (refresh failure recovery)
3. Add Playwright E2E tests for OAuth flow
4. Monitor error logs for real-world edge cases

**Overall Assessment**: ✅ **STABLE** (as of 2026-02-01)
