# Tracerfy Skip Tracing Integration Guide

**Date**: November 3, 2025
**Status**: ✅ Complete - Ready for Use

## 🎯 What Was Built

A complete Tracerfy skip tracing integration for door-knock follow-ups. When your reps get owner names at the door, the system automatically enriches with phone numbers and emails for immediate follow-up.

---

## 🚀 Quick Start

### 1. Environment Setup

The API key is already configured in `.env.local`:

```bash
# Tracerfy API Key (already set up)
TRACERFY_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. How It Works

**Perfect for**: Door-knock follow-ups when you have owner names

**Use Case Flow**:
1. Rep knocks on door at "123 Main St, Nashville, TN"
2. Homeowner says "I'm John Smith"
3. Rep enters into system:
   - first_name: "John"
   - last_name: "Smith"
   - address: "123 Main St"
   - city: "Nashville"
   - state: "TN"
4. System calls Tracerfy API → Returns ranked phone numbers + emails
5. Rep can immediately call/text for appointment

---

## 💻 Using the API

### Example: Enrich Single Address

```typescript
const response = await fetch('/api/storm-targeting/enrich-properties', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    addresses: [
      {
        first_name: 'John',
        last_name: 'Smith',
        street_address: '123 Main St',
        city: 'Nashville',
        state: 'TN',
      },
    ],
    provider: 'tracerfy',
    options: {
      use_cache: true, // Check cache first (free)
      include_owner_contact: true,
    },
  }),
});

const data = await response.json();
console.log('Job ID:', data.job_id);
```

### Example: Enrich Multiple Addresses

```typescript
const addresses = [
  {
    first_name: 'John',
    last_name: 'Smith',
    street_address: '123 Main St',
    city: 'Nashville',
    state: 'TN',
  },
  {
    first_name: 'Jane',
    last_name: 'Doe',
    street_address: '456 Oak Ave',
    city: 'Franklin',
    state: 'TN',
  },
];

const response = await fetch('/api/storm-targeting/enrich-properties', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    addresses,
    provider: 'tracerfy',
  }),
});
```

### Example: Poll for Results

```typescript
const pollJobStatus = async (jobId: string) => {
  const response = await fetch(
    `/api/storm-targeting/enrich-properties?jobId=${jobId}`
  );
  const data = await response.json();

  console.log('Status:', data.status);
  console.log('Progress:', data.progress);

  if (data.status === 'completed') {
    console.log('Results:', data.results);
    // data.results[0].owner_phone - Primary phone
    // data.results[0].owner_email - Primary email
    // data.results[0].property_data.phones - All ranked phones
    // data.results[0].property_data.emails - All ranked emails
  }
};
```

---

## 📊 Response Format

### Successful Enrichment

```json
{
  "success": true,
  "provider": "tracerfy",
  "full_address": "123 Main St, Nashville, TN",
  "owner_name": "John Smith",
  "owner_phone": "+1-615-555-0123",
  "owner_email": "john.smith@example.com",
  "quality_score": 85,
  "property_data": {
    "phones": [
      {
        "number": "+1-615-555-0123",
        "rank": 1,
        "is_primary": true
      },
      {
        "number": "+1-615-555-0456",
        "rank": 2,
        "is_primary": false
      }
    ],
    "emails": [
      {
        "email": "john.smith@example.com",
        "rank": 1,
        "is_primary": true
      },
      {
        "email": "j.smith@gmail.com",
        "rank": 2,
        "is_primary": false
      }
    ],
    "match_score": 92
  }
}
```

### Quality Scoring (0-100)

- **Primary phone** (30 points)
- **Additional phones** (up to 20 points, 5 per phone)
- **Emails** (up to 20 points, 7 per email)
- **Mailing address** (10 points)
- **Match score** (up to 20 points based on confidence)

**Example**:
- Has primary phone (30)
- Has 2 additional phones (10)
- Has 2 emails (14)
- Has mailing address (10)
- Match score 90 (18)
= **82/100 quality score**

---

## 🎨 UI Integration

### EnrichmentCostCalculator

Shows cost estimate before enriching:

```typescript
import { EnrichmentCostCalculator } from '@/components/storm-targeting/EnrichmentCostCalculator';

<EnrichmentCostCalculator
  addressCount={addresses.length}
  cachedCount={0}
  defaultProvider="tracerfy"
  onProviderChange={setSelectedProvider}
/>
```

**Features**:
- Displays $0.009 per lookup pricing
- Shows "Names Required" badge for Tracerfy
- Calculates cache savings
- Warns if addresses missing owner names

### EnrichmentProgress

Shows real-time progress during enrichment:

```typescript
import { EnrichmentProgress } from '@/components/storm-targeting/EnrichmentProgress';

<EnrichmentProgress
  jobId={enrichmentJobId}
  onComplete={(result) => {
    console.log('Enrichment complete!', result);
  }}
  showDetails={true}
/>
```

**Features**:
- Auto-polls every 2 seconds
- Progress bar (0-100%)
- Shows successful/failed/cached counts
- Displays estimated cost
- Quality metrics and errors

---

## ⚠️ Important Requirements

### CRITICAL: Owner Names Required

Tracerfy **REQUIRES** first_name and last_name for every address.

**✅ Valid Request**:
```json
{
  "addresses": [
    {
      "first_name": "John",
      "last_name": "Smith",
      "street_address": "123 Main St",
      "city": "Nashville",
      "state": "TN"
    }
  ],
  "provider": "tracerfy"
}
```

**❌ Invalid Request** (will return 400 error):
```json
{
  "addresses": [
    {
      "street_address": "123 Main St",
      "city": "Nashville",
      "state": "TN"
      // Missing first_name and last_name
    }
  ],
  "provider": "tracerfy"
}
```

### Error Response

If addresses are missing names:

```json
{
  "error": "Tracerfy requires owner names",
  "message": "Tracerfy skip tracing requires first_name and last_name for each address. Use this provider for door-knock follow-ups when you have owner names. For storm targeting (addresses only), use a different approach like DealMachine or PropertyRadar.",
  "addresses_missing_names": 5,
  "total_addresses": 10
}
```

---

## 💰 Pricing & Cost Management

### Cost Per Lookup

- **$0.009** per address lookup
- Cached lookups are **FREE**
- No monthly minimums

### Example Costs

| Addresses | New Lookups | Cached | Total Cost |
|-----------|-------------|--------|------------|
| 10 | 10 | 0 | $0.09 |
| 50 | 50 | 0 | $0.45 |
| 100 | 80 | 20 | $0.72 |
| 500 | 300 | 200 | $2.70 |
| 1000 | 600 | 400 | $5.40 |

### Automatic Caching

All enriched properties are cached for **6 months** (default):

```typescript
options: {
  use_cache: true,  // Check cache first (default)
  cache_ttl_days: 180,  // 6 months (default)
  force_refresh: false,  // Bypass cache if needed
}
```

### Cost Limits

Set maximum spend per job:

```typescript
options: {
  max_cost_dollars: 5,  // Stop if cost exceeds $5
}
```

---

## 🔧 Technical Architecture

### Files Created/Modified

#### **Created**:
1. `/lib/enrichment/tracerfy-client.ts` (628 lines)
   - TracerfyClient class
   - Asynchronous batch processing
   - CSV format conversion
   - Queue polling mechanism
   - Error handling and retries

#### **Modified**:
1. `/lib/enrichment/types.ts`
   - Added owner name fields to AddressInput
   - Updated TracerfyConfig with polling options

2. `/lib/enrichment/enrichment-queue.ts`
   - Added TracerfyClient initialization
   - Added Tracerfy batch processing logic

3. `/app/api/storm-targeting/enrich-properties/route.ts`
   - Added Tracerfy API key validation
   - Added owner name requirement validation

4. `/components/storm-targeting/EnrichmentCostCalculator.tsx`
   - Updated Tracerfy description
   - Added "Names Required" badge

5. `/.env.example`
   - Added Tracerfy configuration documentation

6. `/.env.local`
   - Added TRACERFY_API_KEY (configured)

### API Flow

1. **Submit Job** → POST to `/api/storm-targeting/enrich-properties`
   - Validates owner names present
   - Converts to CSV format
   - Submits to Tracerfy → Returns queue_id

2. **Poll Status** → GET from `/api/storm-targeting/enrich-properties?jobId=xxx`
   - Checks queue status every 5 seconds
   - Returns when processing complete

3. **Transform Results** → Parse Tracerfy response
   - Extracts and ranks phone numbers
   - Extracts and ranks emails
   - Calculates quality score
   - Stores in cache

### Processing Times

Based on Tracerfy documentation:
- **100 records**: ~1 minute
- **1,000 records**: ~5 minutes
- **10,000 records**: ~50 minutes

---

## 🧪 Testing

### Test with Sample Data

```typescript
const testAddresses = [
  {
    first_name: 'John',
    last_name: 'Doe',
    street_address: '123 Main St',
    city: 'Nashville',
    state: 'TN',
  },
  {
    first_name: 'Jane',
    last_name: 'Smith',
    street_address: '456 Oak Ave',
    city: 'Franklin',
    state: 'TN',
  },
];

const response = await fetch('/api/storm-targeting/enrich-properties', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    addresses: testAddresses,
    provider: 'tracerfy',
  }),
});
```

### Verify Cache

Check the `property_enrichment_cache` table:

```sql
SELECT
  full_address,
  owner_name,
  owner_phone,
  owner_email,
  quality_score,
  enriched_at
FROM property_enrichment_cache
WHERE provider = 'tracerfy'
ORDER BY enriched_at DESC
LIMIT 10;
```

---

## 🔍 Debugging

### Check API Key

```bash
cd roofing-saas
grep TRACERFY_API_KEY .env.local
```

### Check Logs

Server-side errors are logged to console:

```typescript
console.error('Tracerfy enrichment error:', error);
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Tracerfy API key not configured` | Missing TRACERFY_API_KEY | Add to .env.local |
| `Tracerfy requires owner names` | Missing first_name/last_name | Add owner names to request |
| `Authentication failed` | Invalid API key | Check TRACERFY_API_KEY value |
| `Insufficient credits` | Out of credits | Add credits to Tracerfy account |
| `Rate limit exceeded` | Too many requests | Implement delay or retry logic |

---

## 📚 Comparison: Tracerfy vs Others

| Provider | Cost | Use Case | Owner Names Required? |
|----------|------|----------|----------------------|
| **Tracerfy** | $0.009 | Contact info only | ✅ YES |
| **BatchData** | $0.025 | Full property data | ❌ NO |
| **PropertyRadar** | $119/mo | Area-based queries | ❌ NO |
| **DealMachine** | $99/mo | Storm targeting | ❌ NO |

### When to Use Tracerfy

✅ **Perfect for**:
- Door-knock follow-ups (have owner names)
- Referral enrichment ("Call John Smith")
- Contact verification/validation
- Phone/email skip tracing

❌ **NOT for**:
- Storm targeting (addresses only, no names)
- Area-based property queries
- Initial lead generation

---

## 🔜 Next Steps

### For Storm Targeting (Separate Workflow)

Tracerfy cannot be used for storm targeting because it requires owner names. For storm targeting, consider:

**Option A**: DealMachine Manual Workflow ($99/mo)
- Draw polygon on map
- Export CSV with addresses + owner contact
- Import to system

**Option B**: PropertyRadar API ($599/mo)
- Fully automated API integration
- Area-based queries with contact info
- Higher cost but cleaner UX

---

## ✅ Integration Checklist

- [x] TracerfyClient created and tested
- [x] Enrichment queue updated
- [x] API routes validation added
- [x] UI components updated
- [x] API key configured in .env.local
- [x] Types updated for owner names
- [x] Error handling implemented
- [x] Documentation created
- [ ] End-to-end testing with real addresses
- [ ] User training on door-knock workflow
- [ ] Storm targeting alternative implemented

---

## 📞 Support

- **Tracerfy Docs**: https://tracerfy.com/skip-tracing-api-documentation/
- **API Key**: Located in Account Settings > API
- **Pricing**: $0.009 per lookup, no monthly minimums
- **Support**: support@tracerfy.com

---

**Status**: ✅ Ready for door-knock follow-up testing
**Next**: Test with real addresses from door-knocking operations
