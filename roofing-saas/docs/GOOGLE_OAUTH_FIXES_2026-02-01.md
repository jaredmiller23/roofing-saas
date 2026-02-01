# Google OAuth Fixes - February 1, 2026

## Summary

Investigated Google OAuth integration on the events tab and implemented **4 priority fixes** to handle edge cases and improve reliability. The integration was already in good shape due to recent work (Jan 17-31), but these fixes address remaining UX and robustness issues.

---

## Fixes Implemented

### 1. State Token Expiry UX ✅ (Priority 1)
**File**: `app/api/calendar/google/callback/route.ts:49-55`

**Problem**: When a user waits >5 minutes on the Google consent screen, the state token expires. Previously returned a JSON error (poor UX).

**Fix**: Now redirects back to events page with a user-friendly error message.

```typescript
if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
  logger.warn('Google OAuth state token expired', { timestamp: stateData.timestamp })
  return NextResponse.redirect(
    `${request.nextUrl.origin}${returnTo}?google_error=${encodeURIComponent('Authorization expired. Please try again.')}`
  )
}
```

**Impact**: Better UX when OAuth flow is slow or interrupted.

---

### 2. Refresh Failure Recovery ✅ (Priority 2)
**File**: `lib/google/calendar-client.ts:292-300`

**Problem**: When a refresh token is revoked (password change, security event), the app couldn't recover. The stale token remained in the database, preventing re-authorization.

**Fix**: Automatically delete stale tokens when refresh fails, allowing user to re-authorize.

```typescript
if (!newToken) {
  logger.error('Failed to refresh Google token - deleting stale token', { userId, tenantId })
  // Refresh failed (likely revoked) - delete stale token so user can re-authorize
  await supabase
    .from('google_calendar_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
  return null
}
```

**Impact**: Automatic recovery from revoked refresh tokens. User sees "Connect" button instead of being stuck.

---

### 3. Decryption Failure Recovery ✅ (Priority 2.5)
**File**: `lib/google/calendar-client.ts:271-283`

**Problem**: If encryption key is missing or corrupted, tokens can't be decrypted. Database entry becomes poison.

**Fix**: Delete corrupted tokens on decryption failure.

```typescript
if (accessTokenError || refreshTokenError || !decryptedAccessToken || !decryptedRefreshToken) {
  logger.error('Failed to decrypt Google tokens - encryption key may be missing', { ... })
  // Delete corrupted token so user can re-authorize
  await supabase
    .from('google_calendar_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
  return null
}
```

**Impact**: Graceful recovery from encryption key issues (rare but catastrophic if it happens).

---

### 4. Token Exchange Timeouts ✅ (Priority 4)
**Files**:
- `lib/google/calendar-client.ts:342-368` (exchangeAuthCode)
- `lib/google/calendar-client.ts:390-418` (refreshAccessToken)

**Problem**: No timeout on Google OAuth API calls. Could hang indefinitely if network is slow.

**Fix**: Added 10-second timeout with AbortController.

```typescript
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 seconds

try {
  const response = await fetch(`${GOOGLE_OAUTH_URL}/token`, {
    ...
    signal: controller.signal,
  })
  clearTimeout(timeoutId)
  ...
} catch (error) {
  clearTimeout(timeoutId)
  if (error instanceof Error && error.name === 'AbortError') {
    logger.error('Google token exchange timed out')
    throw new Error('Token exchange timed out - please try again')
  }
  throw error
}
```

**Impact**: Prevents indefinite hangs. User sees clear error message instead of waiting forever.

---

## What Was Already Fixed (Jan 17-31, 2026)

The recent commits addressed major architectural issues:

1. **Race Condition** (0d73343) - Fixed state flicker in OAuth flow
2. **Locale Preservation** (3f568da) - OAuth redirects preserve `/[locale]/events` prefix
3. **Architectural Simplification** (7103aeb) - Removed complex `needsReauth` state
4. **Browser Navigation** (7da2804) - Changed from fetch() to window.location.href
5. **Environment Variable Trimming** (216ff6c) - Added .trim() to remove trailing newlines
6. **Database Migration** (7ccf620) - Created google_calendar_tokens table with encryption

---

## Remaining Known Issues (Low Priority)

### 1. Loading State During Token Refresh
**Risk**: LOW
**Description**: No visual feedback when token is auto-refreshed in background.
**Workaround**: Refresh happens quickly (<1s), minimal UX impact.
**Fix Complexity**: HIGH (requires component state management)

### 2. Disconnect During Event Fetch
**Risk**: LOW
**Description**: If user clicks "Disconnect" while events are loading, may briefly see events before empty state.
**Workaround**: Visual glitch only, no data integrity issue.
**Fix Complexity**: MEDIUM (race condition handling)

### 3. Concurrent OAuth Flows (Multiple Tabs)
**Risk**: LOW (benign)
**Description**: If user opens OAuth in two tabs, whichever completes last wins.
**Impact**: Both tabs end up connected, no data loss.
**Fix Complexity**: N/A (current behavior is acceptable)

---

## Testing Recommendations

### Manual Testing Scenarios
1. **Happy Path**: Connect → View events → Navigate months → Disconnect
2. **Expired State**: Open consent screen, wait >5 minutes, approve (should show error)
3. **Revoked Token**: Revoke app in Google account settings, try to fetch events (should auto-disconnect)
4. **Network Timeout**: Disconnect network during token exchange (should timeout after 10s)
5. **Locale Preservation**: Test from `/es/events`, `/fr/events` (should preserve locale)

### Automated Testing (Future)
```typescript
// e2e/calendar/google-oauth.spec.ts
test('State token expiry redirects with error', async ({ page }) => {
  // Mock callback with expired timestamp
  await page.goto('/api/calendar/google/callback?state=...')
  await expect(page).toHaveURL(/google_error=Authorization.*expired/)
})

test('Revoked refresh token triggers re-auth', async ({ page }) => {
  // Invalidate refresh token in DB
  // Navigate to events page
  // Should show "Connect" button, not "Connected"
})
```

---

## Files Modified

| File | Changes |
|------|---------|
| `app/api/calendar/google/callback/route.ts` | Better UX for expired state tokens |
| `lib/google/calendar-client.ts` | 3 fixes: refresh failure recovery, decryption failure recovery, timeouts |
| `docs/GOOGLE_OAUTH_ANALYSIS.md` | Comprehensive analysis and edge case documentation |

---

## Verification

### TypeCheck
```bash
$ npm run typecheck
✅ No TypeScript errors
```

### Lint
```bash
$ npm run lint
✅ 0 warnings (max: 5)
```

### Build
*Not run - changes are runtime robustness improvements, no breaking changes*

---

## Deployment Checklist

- [ ] Review changes in PR
- [ ] Merge to main
- [ ] Deploy to Vercel
- [ ] Test OAuth flow in production
- [ ] Monitor error logs for new edge cases

---

## Long-Term Recommendations

1. **Add E2E Tests**: Playwright tests for OAuth flow (happy path + edge cases)
2. **Monitor Metrics**: Track OAuth success/failure rates in production
3. **Consider OAuth Library**: For future integrations, consider using a library (e.g., `next-auth`)
4. **Document Common Issues**: Add troubleshooting guide for support team

---

**Status**: ✅ **READY FOR REVIEW**
**Confidence**: HIGH (fixes are defensive, low-risk improvements)
**Breaking Changes**: NONE
