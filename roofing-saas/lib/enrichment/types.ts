/**
 * Property Enrichment Types
 *
 * Types and interfaces for property data enrichment services
 * Supports multiple providers: BatchData, PropertyRadar, skip tracing, etc.
 */

// =====================================================
// PROVIDER TYPES
// =====================================================

export type EnrichmentProvider =
  | 'batchdata'
  | 'propertyradar'
  | 'tracerfy'
  | 'lead_sherpa'
  | 'county_assessor'
  | 'manual';

export type EnrichmentJobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

// =====================================================
// ADDRESS INPUT
// =====================================================

export interface AddressInput {
  id?: string; // Optional extracted_address ID
  full_address?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  latitude?: number;
  longitude?: number;

  // Owner information (required for skip tracing providers like Tracerfy)
  first_name?: string;
  last_name?: string;
  owner_name?: string; // Full name if first/last not separately available
}

// =====================================================
// ENRICHMENT RESULT
// =====================================================

export interface PropertyEnrichmentResult {
  success: boolean;
  provider: EnrichmentProvider;

  // Address Identification
  address_hash: string;
  full_address: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  latitude?: number;
  longitude?: number;

  // Owner Information
  owner_name?: string;
  owner_phone?: string;
  owner_email?: string;
  owner_mailing_address?: string;

  // Property Characteristics
  property_type?: string; // residential, commercial, multi-family
  year_built?: number;
  square_footage?: number;
  bedrooms?: number;
  bathrooms?: number;
  lot_size?: number;
  stories?: number;

  // Financial Data
  assessed_value?: number;
  market_value?: number;
  last_sale_date?: string; // ISO date string
  last_sale_price?: number;
  equity_estimate?: number;
  mortgage_balance?: number;

  // Roof-Specific Data
  roof_material?: string;
  roof_age?: number;
  roof_condition?: string;

  // Provider-Specific
  provider_id?: string;
  property_data?: Record<string, unknown>; // Raw provider data

  // Quality Metrics
  quality_score?: number; // 0-100
  data_completeness?: number; // 0-100 (% of fields populated)
  confidence?: number; // 0-100

  // Cache Info
  cached?: boolean;
  cache_hit?: boolean;
  enriched_at?: string; // ISO timestamp
  expires_at?: string; // ISO timestamp

  // Error Handling
  error?: string;
  error_details?: Record<string, unknown>;
}

// =====================================================
// BATCH ENRICHMENT
// =====================================================

export interface BatchEnrichmentRequest {
  addresses: AddressInput[];
  provider: EnrichmentProvider;
  options?: EnrichmentOptions;
}

export interface EnrichmentOptions {
  // Cache Options
  use_cache?: boolean; // Default: true
  cache_ttl_days?: number; // Default: 180 (6 months)
  force_refresh?: boolean; // Ignore cache, always fetch fresh

  // Data Options
  include_owner_contact?: boolean; // Default: true
  include_property_details?: boolean; // Default: true
  include_financial_data?: boolean; // Default: true
  include_roof_data?: boolean; // Default: true

  // Quality Filters
  min_quality_score?: number; // Only return results >= this score
  require_owner_phone?: boolean; // Must have phone number
  require_owner_email?: boolean; // Must have email

  // Rate Limiting
  batch_size?: number; // Default: 100 (process in batches)
  delay_ms?: number; // Delay between API calls (default: 100ms)
  max_retries?: number; // Default: 3

  // Cost Management
  max_cost_dollars?: number; // Stop if cost exceeds this
  estimate_only?: boolean; // Calculate cost without enriching
}

export interface BatchEnrichmentResult {
  job_id: string;
  status: EnrichmentJobStatus;
  total_addresses: number;
  processed_count: number;
  successful_count: number;
  failed_count: number;
  cached_count: number;

  // Results
  results: PropertyEnrichmentResult[];
  errors: EnrichmentError[];

  // Timing
  started_at: string;
  completed_at?: string;
  estimated_completion_at?: string;
  duration_ms?: number;

  // Cost Tracking
  cost_estimate: CostEstimate;
  actual_cost?: number;

  // Quality Metrics
  average_quality_score?: number;
  average_completeness?: number;
}

// =====================================================
// ERROR HANDLING
// =====================================================

export interface EnrichmentError {
  address: AddressInput;
  error_type: EnrichmentErrorType;
  error_message: string;
  error_details?: Record<string, unknown>;
  retry_count: number;
  timestamp: string;
}

export type EnrichmentErrorType =
  | 'address_not_found'
  | 'invalid_address'
  | 'api_error'
  | 'rate_limit'
  | 'network_error'
  | 'timeout'
  | 'authentication_error'
  | 'insufficient_credits'
  | 'unknown_error';

// =====================================================
// COST TRACKING
// =====================================================

export interface CostEstimate {
  provider: EnrichmentProvider;
  total_addresses: number;
  cached_addresses: number;
  new_lookups: number;

  // Cost Breakdown
  property_lookup_cost: number;
  skip_trace_cost: number;
  total_cost: number;

  // Per-Item Costs
  cost_per_property: number;
  cost_per_skip_trace: number;

  // Savings
  cache_savings: number; // Amount saved by using cache
  estimated_total_without_cache: number;
}

// =====================================================
// BATCHDATA API TYPES
// =====================================================

export interface BatchDataConfig {
  api_key: string;
  base_url?: string; // Default: https://api.batchdata.com/api/v1
  timeout_ms?: number; // Default: 30000
}

export interface BatchDataPropertyResponse {
  status: 'success' | 'error';
  message?: string;
  data?: {
    // Property Identification
    property_id: string;
    formatted_address: string;
    street_address: string;
    city: string;
    state: string;
    zip_code: string;
    county: string;
    latitude: number;
    longitude: number;

    // Owner Information
    owner_name?: string;
    owner_type?: string; // individual, corporation, trust, etc
    mailing_address?: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };

    // Property Details
    property_type: string;
    property_use: string;
    year_built?: number;
    effective_year_built?: number;
    building_sqft?: number;
    lot_sqft?: number;
    bedrooms?: number;
    bathrooms?: number;
    stories?: number;
    units?: number;

    // Structure Details
    construction_type?: string;
    roof_type?: string;
    roof_cover?: string;
    foundation_type?: string;
    exterior_walls?: string;

    // Financial Information
    assessed_value?: number;
    assessed_land_value?: number;
    assessed_improvement_value?: number;
    market_value?: number;
    tax_amount?: number;
    tax_year?: number;

    // Sales History
    last_sale_date?: string;
    last_sale_price?: number;
    last_sale_type?: string;
    prior_sale_date?: string;
    prior_sale_price?: number;

    // Mortgage/Liens
    mortgage_amount?: number;
    mortgage_date?: string;
    mortgage_lender?: string;
    lien_amount?: number;

    // Parcel Information
    apn?: string; // Assessor Parcel Number
    legal_description?: string;
    subdivision?: string;

    // Additional Data
    pool?: boolean;
    garage_spaces?: number;
    parking_spaces?: number;
    heating_type?: string;
    cooling_type?: string;

    // Data Quality
    data_source?: string;
    last_updated?: string;
    confidence_score?: number;
  };
  credits_used?: number;
}

// =====================================================
// TRACERFY (SKIP TRACING) TYPES
// =====================================================

export interface TracerfyConfig {
  api_key: string;
  base_url?: string; // Default: https://tracerfy.com/v1/api
  timeout_ms?: number;
  poll_interval_ms?: number; // Default: 5000 (5 seconds) - for checking async job status
  max_poll_attempts?: number; // Default: 60 (5 minutes total with 5s intervals)
}

export interface TracerfySkipTraceResponse {
  status: 'success' | 'error';
  message?: string;
  data?: {
    // Person Identification
    full_name: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    age?: number;
    dob?: string;

    // Contact Information
    phones?: Array<{
      number: string;
      type: 'mobile' | 'landline' | 'voip';
      carrier?: string;
      is_active: boolean;
      confidence: number; // 0-100
      last_seen?: string;
    }>;

    emails?: Array<{
      email: string;
      type: 'personal' | 'work' | 'disposable';
      is_active: boolean;
      confidence: number;
      last_seen?: string;
    }>;

    // Address Information
    current_address?: {
      street: string;
      city: string;
      state: string;
      zip: string;
      move_date?: string;
    };

    previous_addresses?: Array<{
      street: string;
      city: string;
      state: string;
      zip: string;
      from_date?: string;
      to_date?: string;
    }>;

    // Relatives/Associates
    relatives?: Array<{
      name: string;
      relationship?: string;
      age?: number;
    }>;

    // Data Quality
    match_score: number; // 0-100
    data_sources: string[];
    last_verified?: string;
  };
  credits_used?: number;
}

// =====================================================
// ENRICHMENT QUEUE
// =====================================================

export interface EnrichmentQueueItem {
  id: string;
  address: AddressInput;
  provider: EnrichmentProvider;
  options?: EnrichmentOptions;
  status: EnrichmentJobStatus;
  retry_count: number;
  result?: PropertyEnrichmentResult;
  error?: EnrichmentError;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface EnrichmentQueue {
  job_id: string;
  items: EnrichmentQueueItem[];
  options: EnrichmentOptions;
  status: EnrichmentJobStatus;
  progress: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cached: number;
  };
  cost: CostEstimate;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

// =====================================================
// QUALITY SCORING
// =====================================================

export interface PropertyQualityMetrics {
  overall_score: number; // 0-100

  // Field Completeness (0-100)
  owner_info_completeness: number;
  property_info_completeness: number;
  financial_info_completeness: number;
  roof_info_completeness: number;

  // Data Quality Flags
  has_owner_name: boolean;
  has_owner_phone: boolean;
  has_owner_email: boolean;
  has_mailing_address: boolean;
  has_property_details: boolean;
  has_financial_data: boolean;
  has_roof_age: boolean;

  // Confidence Metrics
  address_confidence: number; // 0-100
  owner_confidence: number; // 0-100
  property_confidence: number; // 0-100

  // Age/Freshness
  data_age_days: number;
  is_stale: boolean; // > 180 days
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Calculate quality score for enriched property data
 */
export function calculateQualityScore(result: PropertyEnrichmentResult): number {
  let score = 0;
  let maxScore = 0;

  // Owner Information (40 points)
  if (result.owner_name) { score += 10; }
  if (result.owner_phone) { score += 10; }
  if (result.owner_email) { score += 10; }
  if (result.owner_mailing_address) { score += 10; }
  maxScore += 40;

  // Property Details (30 points)
  if (result.year_built) { score += 5; }
  if (result.square_footage) { score += 5; }
  if (result.bedrooms) { score += 5; }
  if (result.bathrooms) { score += 5; }
  if (result.lot_size) { score += 5; }
  if (result.property_type) { score += 5; }
  maxScore += 30;

  // Financial Data (20 points)
  if (result.assessed_value || result.market_value) { score += 10; }
  if (result.last_sale_price) { score += 5; }
  if (result.equity_estimate || result.mortgage_balance) { score += 5; }
  maxScore += 20;

  // Roof Data (10 points)
  if (result.roof_age) { score += 5; }
  if (result.roof_material) { score += 3; }
  if (result.roof_condition) { score += 2; }
  maxScore += 10;

  return Math.round((score / maxScore) * 100);
}

/**
 * Calculate data completeness percentage
 */
export function calculateCompleteness(result: PropertyEnrichmentResult): number {
  const fields = [
    'owner_name',
    'owner_phone',
    'owner_email',
    'owner_mailing_address',
    'property_type',
    'year_built',
    'square_footage',
    'bedrooms',
    'bathrooms',
    'lot_size',
    'stories',
    'assessed_value',
    'market_value',
    'last_sale_price',
    'roof_material',
    'roof_age',
    'roof_condition',
  ];

  const presentFields = fields.filter(field =>
    result[field as keyof PropertyEnrichmentResult] != null
  );

  return Math.round((presentFields.length / fields.length) * 100);
}

/**
 * Generate address hash for cache lookup
 */
export function generateAddressHash(address: AddressInput): string {
  // Normalize address for consistent hashing
  const normalized = [
    address.street_address?.toLowerCase().trim(),
    address.city?.toLowerCase().trim(),
    address.state?.toUpperCase().trim(),
    address.zip_code?.replace(/[^0-9]/g, '').substring(0, 5),
  ]
    .filter(Boolean)
    .join('|');

  // Simple hash (in production, use crypto.subtle.digest or similar)
  return btoa(normalized);
}

/**
 * Format cost as USD string
 */
export function formatCost(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Estimate enrichment cost
 */
export function estimateEnrichmentCost(
  addresses: AddressInput[],
  provider: EnrichmentProvider,
  cachedCount: number = 0
): CostEstimate {
  const total = addresses.length;
  const cached = cachedCount;
  const newLookups = total - cached;

  // Provider pricing (in cents)
  const pricing = {
    batchdata: 2.5, // $0.025 per lookup
    propertyradar: 0, // Monthly subscription
    tracerfy: 0.9, // $0.009 per skip trace
    lead_sherpa: 12, // $0.12 per skip trace
    county_assessor: 0, // Free
    manual: 0,
  };

  const propertyLookupCost = newLookups * pricing[provider];
  const skipTraceCost = 0; // Separate from property lookup
  const totalCost = propertyLookupCost + skipTraceCost;

  const cacheSavings = cached * pricing[provider];
  const estimatedTotalWithoutCache = total * pricing[provider];

  return {
    provider,
    total_addresses: total,
    cached_addresses: cached,
    new_lookups: newLookups,
    property_lookup_cost: propertyLookupCost,
    skip_trace_cost: skipTraceCost,
    total_cost: totalCost,
    cost_per_property: pricing[provider],
    cost_per_skip_trace: 0,
    cache_savings: cacheSavings,
    estimated_total_without_cache: estimatedTotalWithoutCache,
  };
}
