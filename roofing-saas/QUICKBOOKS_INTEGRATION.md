# QuickBooks Integration Documentation

**Date**: October 1, 2025
**Status**: Phase 1 Complete - OAuth Flow Implemented
**Environment**: Sandbox (Development)

---

## Overview

QuickBooks integration enables automatic syncing of customers and invoices between the roofing CRM and QuickBooks Online. This is a critical feature for financial management and eliminates duplicate data entry.

### Features Implemented (Phase 1)

✅ **OAuth 2.0 Authentication**
- Secure connection to QuickBooks via OAuth 2.0
- Automatic token refresh (tokens expire every hour)
- 100-day refresh token validity with reauthorization flow
- CSRF protection with state parameter

✅ **Settings Page**
- Connect/disconnect QuickBooks
- View connection status
- Manual token refresh
- Company name display
- Environment indicator (sandbox/production)

✅ **API Infrastructure**
- Token management with automatic refresh
- Retry logic for failed API calls
- Error handling for expired tokens
- Helper functions for common operations

---

## Architecture

### Database Schema

**Table**: `quickbooks_connections`

```sql
CREATE TABLE quickbooks_connections (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL UNIQUE,  -- One QB connection per tenant
  realm_id TEXT NOT NULL UNIQUE,    -- QuickBooks company ID
  company_name TEXT,

  -- OAuth tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,

  -- Expiration tracking
  token_expires_at TIMESTAMPTZ NOT NULL,        -- Access token (1 hour)
  refresh_token_expires_at TIMESTAMPTZ NOT NULL, -- Refresh token (100 days)

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,

  -- Metadata
  environment VARCHAR(20) DEFAULT 'sandbox',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Additional Columns** (for sync tracking):
- `contacts.quickbooks_customer_id` - Links contact to QB customer
- `projects.quickbooks_invoice_id` - Links project to QB invoice

### File Structure

```
/lib/quickbooks/
  ├── oauth-client.ts    # OAuth client configuration
  └── api.ts             # API helper functions

/app/api/quickbooks/
  ├── auth/route.ts      # Initiate OAuth flow
  ├── callback/route.ts  # Handle OAuth callback
  ├── refresh/route.ts   # Refresh tokens
  └── disconnect/route.ts # Disconnect QB

/app/(dashboard)/
  └── settings/page.tsx  # Settings page

/components/settings/
  └── quickbooks-connection.tsx # Connection UI

/supabase/migrations/
  ├── 20251001_comprehensive_rls_policies.sql    # RLS for all tables
  └── 20251001_quickbooks_connections.sql        # QB table & RLS
```

---

## OAuth Flow

### 1. User Initiates Connection

**Route**: `GET /api/quickbooks/auth`

1. User clicks "Connect QuickBooks" in Settings
2. Server generates CSRF token (state parameter)
3. Stores state in HTTP-only cookie
4. Redirects user to Intuit authorization page

### 2. User Authorizes

User logs into QuickBooks and grants permissions:
- Read/write access to accounting data
- OpenID profile information

### 3. Callback & Token Exchange

**Route**: `GET /api/quickbooks/callback`

1. Intuit redirects back with authorization code and state
2. Server verifies CSRF state matches cookie
3. Exchanges code for access + refresh tokens
4. Fetches company info from QuickBooks
5. Stores tokens in database (encrypted at rest)
6. Redirects to dashboard with success message

### 4. Token Management

**Automatic Refresh**:
- Access tokens expire after 1 hour
- Before each API call, check expiration
- If expiring within 5 minutes, refresh automatically
- Refresh tokens are valid for 100 days
- **Critical**: Refresh tokens change every 24 hours! Always store latest value

**Manual Refresh**:
- User can click "Refresh Token" in settings
- Route: `POST /api/quickbooks/refresh`

**Reauthorization**:
- After 100 days, refresh tokens expire
- User must reconnect QuickBooks
- System detects `REAUTH_REQUIRED` and marks connection inactive

---

## Environment Variables

```bash
# QuickBooks OAuth Configuration
QUICKBOOKS_CLIENT_ID=your_client_id_here
QUICKBOOKS_CLIENT_SECRET=your_client_secret_here
QUICKBOOKS_ENVIRONMENT=sandbox  # or 'production'
QUICKBOOKS_REDIRECT_URI=http://localhost:3000/api/quickbooks/callback

# Supabase (for token storage)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx  # Never expose client-side!
```

### Getting QuickBooks Credentials

1. Go to [Intuit Developer Portal](https://developer.intuit.com/dashboard)
2. Create a new app or select existing
3. Get Client ID and Client Secret
4. Set redirect URI to match your environment:
   - Dev: `http://localhost:3000/api/quickbooks/callback`
   - Prod: `https://yourdomain.com/api/quickbooks/callback`

---

## API Usage Examples

### Connect to QuickBooks

```typescript
// User clicks connect button
window.location.href = '/api/quickbooks/auth'
```

### Make API Calls

```typescript
import { makeQuickBooksApiCall } from '@/lib/quickbooks/api'

// Get company info
const companyInfo = await makeQuickBooksApiCall(
  tenantId,
  '/companyinfo/REALM_ID'
)

// Create customer
const customer = await makeQuickBooksApiCall(
  tenantId,
  '/customer',
  'POST',
  {
    DisplayName: 'John Doe',
    PrimaryEmailAddr: { Address: 'john@example.com' },
    PrimaryPhone: { FreeFormNumber: '555-1234' },
  }
)

// Query data
const invoices = await makeQuickBooksApiCall(
  tenantId,
  '/query?query=' + encodeURIComponent('SELECT * FROM Invoice MAXRESULTS 100')
)
```

### Helper Functions

```typescript
import {
  getCompanyInfo,
  createQuickBooksCustomer,
  getQuickBooksCustomers,
  createQuickBooksInvoice,
  getQuickBooksInvoices,
} from '@/lib/quickbooks/api'

// Get company info
const company = await getCompanyInfo(tenantId)

// Create customer from contact
const qbCustomer = await createQuickBooksCustomer(tenantId, {
  DisplayName: `${contact.first_name} ${contact.last_name}`,
  GivenName: contact.first_name,
  FamilyName: contact.last_name,
  PrimaryEmailAddr: { Address: contact.email },
  PrimaryPhone: { FreeFormNumber: contact.phone },
  BillAddr: {
    Line1: contact.address_street,
    City: contact.address_city,
    CountrySubDivisionCode: contact.address_state,
    PostalCode: contact.address_zip,
  },
})

// Store QB customer ID for future reference
await updateContact(contact.id, {
  quickbooks_customer_id: qbCustomer.Customer.Id
})
```

---

## Security Considerations

### Token Storage
- ✅ Tokens stored server-side only (never client-side)
- ✅ RLS policies enforce tenant isolation
- ✅ HTTP-only cookies for CSRF protection
- ⚠️ Consider encrypting tokens at rest (use `pgcrypto`)

### API Access
- ✅ All routes require authentication
- ✅ Tenant ID validated before operations
- ✅ Automatic token refresh prevents exposure
- ✅ Failed auth marks connection inactive

### Error Handling
- Never expose tokens in error messages
- Log errors server-side only
- Show user-friendly messages
- Track sync errors in database

---

## Troubleshooting

### "Connection failed" Error

**Check**:
1. Environment variables are set correctly
2. Redirect URI matches exactly (including http/https)
3. QuickBooks app is not in read-only mode
4. User has admin permissions in QuickBooks

### "REAUTH_REQUIRED" Error

**Cause**: Refresh token expired (100 days)
**Solution**: User must reconnect QuickBooks

### "Invalid state" Error

**Cause**: CSRF token mismatch or expired (10 minute timeout)
**Solution**: Try connecting again

### 401 Unauthorized Errors

**Cause**: Token invalid or expired
**Solutions**:
1. Automatic refresh should handle this
2. If persists, check token expiration logic
3. Verify `refresh_token` is being updated (changes every 24 hours!)

---

## Phase 2 - Future Enhancements

### Planned Features

**Customer Sync** (Week 17):
- [ ] Automatic sync when creating/updating contacts
- [ ] Bidirectional sync (QB → CRM)
- [ ] Conflict resolution
- [ ] Batch sync for existing contacts

**Invoice Generation** (Week 17):
- [ ] Create invoices from won projects
- [ ] Line item mapping from project scope
- [ ] Payment tracking
- [ ] Status synchronization

**Advanced Features** (Week 18-20):
- [ ] Webhook integration for real-time updates
- [ ] Estimate creation from proposals
- [ ] Payment collection via QB Payments
- [ ] Financial reporting integration

---

## Testing

### Sandbox Testing

1. Use sandbox credentials from Intuit Developer Portal
2. Create test company in QuickBooks Sandbox
3. Test OAuth flow end-to-end
4. Verify token refresh works
5. Test reauthorization after disconnecting

### Production Deployment

**Requirements**:
1. Complete Intuit App Assessment
2. Get production credentials
3. Update environment variables
4. Change `QUICKBOOKS_ENVIRONMENT=production`
5. Test with real QuickBooks company

**Checklist**:
- [ ] OAuth flow tested
- [ ] Token refresh tested
- [ ] Error handling verified
- [ ] User permissions correct
- [ ] SSL/HTTPS enabled
- [ ] Redirect URIs match production

---

## API Rate Limits

QuickBooks API Rate Limits (as of 2025):
- **500 requests per minute** per app
- **10,000 requests per day** (resets at midnight Pacific Time)

### Handling Rate Limits

```typescript
// Implement exponential backoff
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After')
  await sleep(retryAfter * 1000)
  return retry()
}
```

### Best Practices

- Cache frequently accessed data
- Batch operations when possible
- Use webhooks instead of polling
- Implement request queuing for bulk operations

---

## Resources

- [QuickBooks API Documentation](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account)
- [OAuth 2.0 Guide](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization)
- [API Explorer](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account) - Test API calls
- [Intuit Developer Forums](https://help.developer.intuit.com/)
- [Sample Code](https://github.com/IntuitDeveloper/SampleApp-OAuth2-nodejs)

---

## Support

For issues or questions:
1. Check [troubleshooting section](#troubleshooting)
2. Review [Intuit Developer Forums](https://help.developer.intuit.com/)
3. Check error logs in Supabase
4. Verify environment variables

**Status**: ✅ Phase 1 OAuth integration complete and ready for testing
