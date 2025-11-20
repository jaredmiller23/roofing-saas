# Property Enrichment Integration Guide

**Date**: November 3, 2025
**Status**: ✅ Phase 1 Week 1 Complete (BatchData Integration)

## 🎯 What Was Built

A complete property enrichment system that automatically enriches storm-targeted addresses with owner contact info and property details.

### Core Components

1. **Types & Interfaces** (`/lib/enrichment/types.ts`)
   - Comprehensive TypeScript types for all enrichment operations
   - Support for multiple providers (BatchData, Tracerfy, PropertyRadar, etc.)
   - Quality scoring and cost tracking types

2. **BatchData API Client** (`/lib/enrichment/batchdata-client.ts`)
   - Full API integration with error handling
   - Automatic rate limiting (100ms between requests)
   - Retry logic (up to 3 attempts with exponential backoff)
   - Batch processing (50 addresses per batch default)
   - Response transformation to standard format
   - Request statistics tracking

3. **Enrichment Queue Manager** (`/lib/enrichment/enrichment-queue.ts`)
   - Background job processing
   - Supabase database integration
   - Automatic caching (6-month TTL default)
   - Quality filtering
   - Progress tracking
   - Cost calculation

4. **API Route** (`/app/api/storm-targeting/enrich-properties/route.ts`)
   - `POST /api/storm-targeting/enrich-properties` - Start enrichment job
   - `GET /api/storm-targeting/enrich-properties?jobId=xxx` - Get job status
   - Authentication & authorization
   - Input validation
   - Error handling

5. **UI Components**
   - `EnrichmentProgress` - Real-time progress display with polling
   - `EnrichmentCostCalculator` - Cost estimation before enrichment

---

## 🚀 Quick Start

### 1. Environment Setup

Add to `.env.local`:

```bash
# BatchData API (Required for property enrichment)
BATCHDATA_API_KEY=your_batchdata_api_key_here

# Optional: Custom API URL and timeout
# BATCHDATA_API_URL=https://api.batchdata.com/api/v1
# BATCHDATA_TIMEOUT_MS=30000
```

### 2. Get BatchData API Key

1. Sign up at [BatchData.io](https://batchdata.io)
2. Navigate to Settings > API Keys
3. Create a new API key
4. Copy the key to your `.env.local` file

**Pricing** (as of Nov 2025):
- Pay-as-you-go: $0.025 per property lookup
- Monthly plans start at $500/month for 20,000 lookups ($0.025 each)
- Free samples available for testing

---

## 💻 Integration Examples

### Example 1: Storm Targeting Page Integration

Add enrichment to your storm targeting workflow:

```typescript
'use client';

import { useState } from 'react';
import { EnrichmentProgress } from '@/components/storm-targeting/EnrichmentProgress';
import { EnrichmentCostCalculator } from '@/components/storm-targeting/EnrichmentCostCalculator';
import { Button } from '@/components/ui/button';

export function StormTargetingPage() {
  const [enrichmentJobId, setEnrichmentJobId] = useState<string | null>(null);
  const [extractedAddresses, setExtractedAddresses] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('batchdata');

  // After addresses are extracted...
  const handleEnrichAddresses = async () => {
    try {
      const response = await fetch('/api/storm-targeting/enrich-properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addresses: extractedAddresses.map(addr => ({
            full_address: addr.full_address,
            latitude: addr.latitude,
            longitude: addr.longitude,
          })),
          provider: selectedProvider,
          options: {
            use_cache: true,
            include_owner_contact: true,
            include_property_details: true,
            include_financial_data: true,
            include_roof_data: true,
            min_quality_score: 50, // Only return results with 50+ quality score
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setEnrichmentJobId(data.job_id);
      } else {
        console.error('Enrichment failed:', data.error);
      }
    } catch (error) {
      console.error('Enrichment request failed:', error);
    }
  };

  const handleEnrichmentComplete = (result: any) => {
    console.log('Enrichment complete!', result);
    // Update UI with enriched data
    // Optionally import to contacts table
  };

  return (
    <div className="space-y-6">
      {/* Your existing storm targeting UI */}

      {/* Show cost calculator after addresses extracted */}
      {extractedAddresses.length > 0 && !enrichmentJobId && (
        <>
          <EnrichmentCostCalculator
            addressCount={extractedAddresses.length}
            cachedCount={0} // Calculate from cache if needed
            onProviderChange={setSelectedProvider}
          />

          <Button onClick={handleEnrichAddresses} size="lg">
            Start Enrichment ({extractedAddresses.length} addresses)
          </Button>
        </>
      )}

      {/* Show progress when job is running */}
      {enrichmentJobId && (
        <EnrichmentProgress
          jobId={enrichmentJobId}
          onComplete={handleEnrichmentComplete}
          showDetails={true}
        />
      )}
    </div>
  );
}
```

### Example 2: Estimate Cost Only

Calculate cost without starting enrichment:

```typescript
const estimateCost = async () => {
  const response = await fetch('/api/storm-targeting/enrich-properties', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      addresses: myAddresses,
      provider: 'batchdata',
      options: {
        estimate_only: true, // Don't actually enrich
      },
    }),
  });

  const data = await response.json();
  console.log('Estimated cost:', data.cost_estimate);
};
```

### Example 3: Poll for Job Status Manually

If you don't want to use the `EnrichmentProgress` component:

```typescript
const checkJobStatus = async (jobId: string) => {
  const response = await fetch(
    `/api/storm-targeting/enrich-properties?jobId=${jobId}`
  );

  const data = await response.json();

  if (data.success) {
    console.log('Job status:', data.status);
    console.log('Progress:', data.progress);
    console.log('Results:', data.results);
  }
};

// Poll every 2 seconds until complete
const pollInterval = setInterval(async () => {
  const status = await checkJobStatus(jobId);

  if (status.status === 'completed' || status.status === 'failed') {
    clearInterval(pollInterval);
  }
}, 2000);
```

### Example 4: High-Volume Batch Processing

For large jobs (1000+ addresses):

```typescript
const enrichLargeDataset = async (addresses: any[]) => {
  // Split into batches of 500
  const batchSize = 500;
  const batches = [];

  for (let i = 0; i < addresses.length; i += batchSize) {
    batches.push(addresses.slice(i, i + batchSize));
  }

  const jobIds = [];

  // Process batches sequentially (or parallelize with caution)
  for (const batch of batches) {
    const response = await fetch('/api/storm-targeting/enrich-properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addresses: batch,
        provider: 'batchdata',
        options: {
          batch_size: 100, // Internal batch size
          delay_ms: 50, // Faster processing
          max_cost_dollars: 50, // Stop if exceeds $50
        },
      }),
    });

    const data = await response.json();
    jobIds.push(data.job_id);

    // Wait 5 seconds between batches
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  return jobIds;
};
```

---

## 📊 Database Schema

Enriched data is stored in two tables:

### `property_enrichment_cache`

Caches enriched property data to avoid redundant API calls:

```sql
CREATE TABLE property_enrichment_cache (
  id UUID PRIMARY KEY,
  address_hash TEXT UNIQUE NOT NULL, -- MD5 hash for fast lookup
  full_address TEXT NOT NULL,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),

  -- Provider Info
  provider TEXT NOT NULL, -- 'batchdata', 'tracerfy', etc.
  provider_id TEXT,

  -- Owner Information
  owner_name TEXT,
  owner_phone TEXT,
  owner_email TEXT,
  owner_mailing_address TEXT,

  -- Property Details
  property_type TEXT,
  year_built INTEGER,
  square_footage INTEGER,
  bedrooms INTEGER,
  bathrooms DECIMAL(3,1),
  lot_size DECIMAL,
  stories INTEGER,

  -- Financial Data
  assessed_value BIGINT,
  market_value BIGINT,
  last_sale_date DATE,
  last_sale_price BIGINT,
  equity_estimate BIGINT,
  mortgage_balance BIGINT,

  -- Roof Data
  roof_material TEXT,
  roof_age INTEGER,
  roof_condition TEXT,

  -- Raw Data
  property_data JSONB,

  -- Cache Management
  enriched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '6 months'),
  hit_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `bulk_import_jobs`

Tracks enrichment jobs and progress:

```sql
CREATE TABLE bulk_import_jobs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES auth.users(id),
  targeting_area_id UUID REFERENCES storm_targeting_areas(id),

  job_type TEXT NOT NULL, -- 'enrich_properties'
  status TEXT NOT NULL DEFAULT 'pending',

  -- Progress
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  successful_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_completion_at TIMESTAMPTZ,

  -- Settings & Results
  import_settings JSONB,
  results JSONB
);
```

---

## 🎯 Quality Scoring

Every enriched property receives a quality score (0-100):

### Scoring Breakdown

| Category | Points | Fields |
|----------|--------|--------|
| Owner Info | 40 | name (10), phone (10), email (10), mailing address (10) |
| Property Details | 30 | year_built (5), sqft (5), bedrooms (5), bathrooms (5), lot_size (5), type (5) |
| Financial Data | 20 | assessed/market value (10), last sale price (5), equity/mortgage (5) |
| Roof Data | 10 | age (5), material (3), condition (2) |

**Total**: 100 points

### Usage

Filter low-quality results:

```typescript
options: {
  min_quality_score: 70, // Only return properties with 70+ score
  require_owner_phone: true, // Must have phone number
  require_owner_email: false, // Email optional
}
```

---

## 💰 Cost Management

### Automatic Cache

- All enriched properties are cached for 6 months (configurable)
- Cache hits are free
- Cache savings are tracked and displayed
- Example: 500 addresses, 200 cached = only pay for 300

### Cost Limits

Set maximum spend per job:

```typescript
options: {
  max_cost_dollars: 25, // Stop if cost exceeds $25
}
```

### Estimate Before Enriching

```typescript
options: {
  estimate_only: true, // Calculate cost without enriching
}
```

### Provider Pricing Comparison

| Provider | Cost per Lookup | Model | Best For |
|----------|----------------|-------|----------|
| **BatchData** | $0.025 | Pay-as-you-go | High volume, flexible |
| **Tracerfy** | $0.009 | Pay-as-you-go | Contact info only |
| **Lead Sherpa** | $0.12 | Pay-as-you-go | Premium skip tracing |
| **PropertyRadar** | ~$0 | $119/month | Limited queries, real estate focused |
| **County Assessor** | Free | Free | Limited data, no contact info |

---

## 🧪 Testing

### Test with Sample Data

```typescript
const testAddresses = [
  {
    full_address: '123 Main St, Nashville, TN 37203',
    latitude: 36.1627,
    longitude: -86.7816,
  },
  {
    full_address: '456 Oak Ave, Franklin, TN 37064',
    latitude: 35.9251,
    longitude: -86.8689,
  },
];

// Start test enrichment
const response = await fetch('/api/storm-targeting/enrich-properties', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    addresses: testAddresses,
    provider: 'batchdata',
  }),
});
```

### Verify Results

Check the `property_enrichment_cache` table:

```sql
SELECT
  full_address,
  owner_name,
  owner_phone,
  owner_email,
  year_built,
  square_footage,
  assessed_value,
  roof_age,
  enriched_at
FROM property_enrichment_cache
ORDER BY enriched_at DESC
LIMIT 10;
```

---

## ⚠️ Important Notes

### Rate Limiting

- BatchData client enforces 100ms minimum delay between requests
- Batch processing uses 100ms default (configurable)
- Reduce `delay_ms` for faster processing (but watch for rate limits)

### Error Handling

The system handles various error types:
- `address_not_found` - Address doesn't exist in provider database
- `invalid_address` - Address format is invalid
- `api_error` - Provider API error
- `rate_limit` - Too many requests
- `network_error` - Network connectivity issue
- `authentication_error` - Invalid API key
- `insufficient_credits` - Out of API credits

### Retry Logic

- Automatic retry up to 3 times (configurable)
- Exponential backoff: 1s, 2s, 4s
- Non-retryable errors (auth, not found) skip retries

### Cache Management

- Cache expires after 6 months (configurable)
- `force_refresh` option bypasses cache
- Cache hit count tracked for analytics
- Old cache entries can be manually purged

---

## 🔜 Next Steps (Week 2)

**Tracerfy Skip Tracing Integration** (Contact Info Enhancement)

Will add:
1. Tracerfy API client for owner phone/email lookup
2. Waterfall enrichment (BatchData → Tracerfy)
3. Phone number validation and ranking
4. Email verification
5. One-click "Enrich & Import" workflow

**Estimated**: 2-3 days

---

## 📚 References

- BatchData API Docs: https://developer.batchdata.com/docs
- Enrichment Types: `/lib/enrichment/types.ts`
- API Route: `/app/api/storm-targeting/enrich-properties/route.ts`
- Components: `/components/storm-targeting/`

---

**Questions or Issues?**

Check the error logs in the API route or enrichment queue manager for detailed debugging info.
