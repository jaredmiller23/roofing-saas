---
name: quickbooks
description: QuickBooks Online API integration best practices. Use when implementing OAuth flow, syncing invoices/customers/payments, handling rate limits, or planning financial integration architecture.
allowed-tools: Bash, Read, WebFetch
---

# QuickBooks Integration Skill

**Domain**: QuickBooks Online API Integration
**Purpose**: Best practices for syncing invoices, customers, and payments
**Last Updated**: December 13, 2025

## When This Skill Loads

This skill automatically loads when you're:
- Implementing QuickBooks OAuth flow
- Building invoice sync features
- Working on financial/accounting features
- Discussing payment processing
- Planning QuickBooks integration architecture

## Core Knowledge Areas

### 1. OAuth 2.0 Flow (PKCE)
### 2. API Rate Limiting & Error Handling
### 3. Entity Mapping (Our App <-> QuickBooks)
### 4. Best Practices (Polling vs Webhooks)
### 5. Common Pitfalls & Solutions

## OAuth 2.0 with PKCE

### Flow Steps
```
1. User clicks "Connect QuickBooks"
2. Generate code_verifier and code_challenge
3. Redirect to QB authorization URL
4. User authorizes in QB
5. QB redirects back with authorization code
6. Exchange code for tokens (access + refresh)
7. Store tokens encrypted (Supabase Vault)
8. Use access token for API calls
9. Refresh token expires in 101 days (reauth needed)
```

### Token Management
- **Access Token**: Short-lived (1 hour), use for API calls
- **Refresh Token**: Long-lived (101 days), use to get new access token
- **Automatic Refresh**: Refresh access token transparently before expiry
- **Reauth Required**: After 101 days, user must reconnect QuickBooks
- **Storage**: Encrypt tokens in database (use Supabase Vault)

### Security Best Practices
- Use PKCE flow (not basic OAuth)
- Never log tokens
- Rotate refresh token with each use
- Validate redirect URLs
- Use state parameter to prevent CSRF

## Rate Limiting

### Limits
- **500 requests per minute** (per company/realm ID)
- **5,000 requests per day** (per company)
- **Per entity type**: Varies (e.g., 10 concurrent batch operations)

### Strategies
**1. Batch Operations** (Recommended)
```
Instead of:
- 20 individual create invoice requests = 20 API calls

Use batch:
- 1 batch request with 20 invoices = 1 API call
- Max 30 entities per batch
```

**2. Polling Interval**
```
Don't: Poll every 1 minute (720 requests/day just for status)
Do: Poll every 15 minutes (96 requests/day)
```

**3. Exponential Backoff**
```
If 429 rate limit error:
- Wait 1 second, retry
- If fail again: Wait 2 seconds
- If fail again: Wait 4 seconds
- Max retry: 3-5 attempts
```

**4. Queue System**
```
For bulk operations (e.g., sync 100 invoices):
- Don't sync all at once
- Use background job queue
- Process 10-20 at a time
- Respect rate limits
```

## Entity Mapping

### Our App -> QuickBooks

| Our App Entity | QB Entity | Notes |
|----------------|-----------|-------|
| Contact | Customer | Sync name, email, phone, address |
| Project (with deposit) | Estimate | Before contract signed |
| Project (signed contract) | Invoice | After contract, before payment |
| Payment | Payment | Link to invoice |
| Organization | Company | One QB company per tenant |

### Field Mapping Examples

**Contact -> Customer**:
```json
{
  "DisplayName": contact.fullName,
  "GivenName": contact.firstName,
  "FamilyName": contact.lastName,
  "PrimaryEmailAddr": { "Address": contact.email },
  "PrimaryPhone": { "FreeFormNumber": contact.phone },
  "BillAddr": {
    "Line1": contact.address,
    "City": contact.city,
    "CountrySubDivisionCode": contact.state,
    "PostalCode": contact.zipCode
  }
}
```

**Project -> Invoice**:
```json
{
  "CustomerRef": { "value": qbCustomerId },
  "Line": [
    {
      "Amount": project.totalAmount,
      "DetailType": "SalesItemLineDetail",
      "SalesItemLineDetail": {
        "ItemRef": { "value": "1" },
        "Qty": project.squareFootage / 100,
        "UnitPrice": project.pricePerSquare
      },
      "Description": "Roof replacement - X sq ft"
    },
    {
      "Amount": project.laborCost,
      "DetailType": "SalesItemLineDetail",
      "Description": "Labor"
    }
  ],
  "DueDate": project.dueDate,
  "TotalAmt": project.totalAmount
}
```

## Error Handling

### Common Errors

**401 Unauthorized**
- **Cause**: Access token expired
- **Solution**: Refresh token automatically

**429 Too Many Requests**
- **Cause**: Rate limit exceeded
- **Solution**: Exponential backoff, reduce polling frequency

**400 Bad Request**
- **Cause**: Invalid data (missing required field, wrong format)
- **Solution**: Validate data before sending, show user-friendly error
- **Common Issues**:
  - Missing CustomerRef in invoice
  - Invalid date format (use YYYY-MM-DD)
  - Duplicate invoice number

**500 Internal Server Error**
- **Cause**: QuickBooks outage or bug
- **Solution**: Retry with exponential backoff, log for review

**404 Not Found**
- **Cause**: Entity doesn't exist (maybe deleted in QB)
- **Solution**: Re-sync to find correct ID or create new entity

## Best Practices (Learned from Experience)

### DON'T Use Webhooks (Unreliable)
**Problem**: QB webhooks are finicky, often miss events
**Solution**: Use polling every 15 minutes instead
**Rationale**: More reliable, easier to debug, respects rate limits

### DO Use Batch API for Multiple Operations
**Example**: Syncing 20 invoices
```
Bad: 20 individual API calls (slow, hits rate limit)
Good: 2 batch requests (10 invoices each) - fast, efficient
```

### DO Use Idempotency Keys
**Purpose**: Prevent duplicate invoices if request retries
**Implementation**:
```typescript
const idempotencyKey = `invoice-${projectId}-${Date.now()}`;
// Store key with invoice, check before creating duplicate
```

### DO Sync in Background
**Pattern**: User triggers sync -> Job queued -> Background worker processes
**Benefits**: No blocking UI, can retry failures, respect rate limits

### DO Handle Partial Failures
**Scenario**: Batch of 20 invoices, 3 fail
**Solution**:
- Log which ones failed
- Retry failed ones separately
- Notify user of partial success
- Don't block on failures

### DO Cache QB Entity IDs
**Why**: Avoid redundant lookups
**How**: Store QB Customer ID with our Contact record
**Example**:
```sql
ALTER TABLE contacts ADD COLUMN qb_customer_id TEXT;
```

### DON'T Assume Immediate Consistency
**Reality**: QB sometimes lags (create invoice -> query -> not found yet)
**Solution**:
- Use ID from create response (most reliable)
- If querying, wait 1-2 seconds or poll until exists

## Code Patterns

### OAuth Token Refresh Pattern
```typescript
async function refreshQuickBooksToken(refreshToken: string) {
  const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  const tokens = await response.json();

  // Store new tokens encrypted
  await supabase.vault.createSecret({
    name: `qb_tokens_${userId}`,
    secret: JSON.stringify(tokens)
  });

  return tokens;
}
```

### Create Invoice with Error Handling
```typescript
async function createQBInvoice(project: Project) {
  try {
    // 1. Get or create QB customer
    const qbCustomerId = project.contact.qb_customer_id ||
      await getOrCreateQBCustomer(project.contact);

    // 2. Build invoice object
    const invoice = {
      CustomerRef: { value: qbCustomerId },
      Line: buildInvoiceLines(project),
      DueDate: project.dueDate,
      TotalAmt: project.totalAmount
    };

    // 3. Create invoice
    const response = await qbApi.post('/invoice', invoice);

    // 4. Store QB invoice ID
    await supabase
      .from('projects')
      .update({ qb_invoice_id: response.Invoice.Id })
      .eq('id', project.id);

    return response.Invoice;

  } catch (error) {
    if (error.status === 401) {
      await refreshToken();
      return createQBInvoice(project); // Retry
    }

    if (error.status === 429) {
      await wait(60000); // 1 minute
      return createQBInvoice(project);
    }

    console.error('QB invoice creation failed:', error);
    throw new Error('Failed to sync invoice to QuickBooks');
  }
}
```

### Polling Pattern
```typescript
// Background job (runs every 15 minutes)
async function syncQuickBooksInvoices() {
  const projects = await getProjectsNeedingSync();

  for (const project of projects) {
    try {
      await createOrUpdateQBInvoice(project);

      await supabase
        .from('projects')
        .update({ qb_synced_at: new Date().toISOString() })
        .eq('id', project.id);

    } catch (error) {
      await logSyncError(project.id, error);
    }
  }
}
```

## Integration Checklist

Before deploying QB integration:
- [ ] OAuth flow working (PKCE)
- [ ] Token refresh automated
- [ ] Tokens stored encrypted
- [ ] Rate limiting handled (exponential backoff)
- [ ] Batch API used for bulk operations
- [ ] Polling interval: 15 minutes (not <5 min)
- [ ] Error handling for 401, 429, 400, 500
- [ ] Idempotency keys prevent duplicates
- [ ] QB entity IDs cached in database
- [ ] Partial failure handling
- [ ] Background job queue for sync
- [ ] User notification for sync status
- [ ] Audit logging for compliance
- [ ] Test with QB sandbox account

## Resources

**Official Docs**: https://developer.intuit.com/app/developer/qbo/docs
**OAuth Guide**: https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization
**API Explorer**: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities

---

**Remember**: QB integration is finicky. Use polling (not webhooks), batch operations, and robust error handling. When in doubt, refer to this skill for proven patterns.
