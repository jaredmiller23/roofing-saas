/**
 * ADDRESS EXTRACTION TYPES
 * Types for storm-targeting bulk address extraction system
 */

// =====================================================
// CORE TYPES
// =====================================================

export interface LatLng {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface Polygon {
  coordinates: LatLng[];
}

// =====================================================
// OSM / OVERPASS API TYPES
// =====================================================

export interface OSMElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number; // For nodes
  lon?: number; // For nodes
  tags?: Record<string, string>;
  center?: { lat: number; lon: number }; // For ways/relations
  geometry?: Array<{ lat: number; lon: number }>; // For ways
}

export interface OverpassResponse {
  version: number;
  generator: string;
  osm3s: {
    timestamp_osm_base: string;
    copyright: string;
  };
  elements: OSMElement[];
}

export interface BuildingData {
  id: string; // OSM ID
  lat: number;
  lng: number;
  buildingType?: string; // house, detached, apartments, commercial, etc
  propertyType?: string; // residential, commercial, industrial
  tags: Record<string, string>; // All OSM tags
}

// =====================================================
// ADDRESS EXTRACTION TYPES
// =====================================================

export interface ExtractedAddress {
  // Location
  lat: number;
  lng: number;

  // Address (after geocoding)
  fullAddress?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  county?: string;

  // Building characteristics (from OSM)
  osmPropertyType?: string;
  osmBuildingType?: string;
  osmTags?: Record<string, string>;

  // Metadata
  source: 'osm' | 'google_places' | 'manual';
  confidence: number; // 0-1, based on data completeness
  isResidential: boolean;
}

export interface AddressExtractionResult {
  addresses: ExtractedAddress[];
  stats: {
    totalBuildings: number;
    residentialCount: number;
    commercialCount: number;
    unknownCount: number;
    processingTimeMs: number;
  };
  boundingBox: BoundingBox;
  areaSquareMiles: number;
}

// =====================================================
// GEOCODING TYPES
// =====================================================

export interface GeocodingRequest {
  lat: number;
  lng: number;
}

export interface GeocodingResponse {
  lat: number;
  lng: number;
  success: boolean;

  // Address components
  fullAddress?: string;
  streetNumber?: string;
  streetName?: string;
  city?: string;
  county?: string;
  state?: string;
  zipCode?: string;
  country?: string;

  // Metadata
  placeId?: string; // Google Place ID
  formattedAddress?: string;
  locationType?: string; // ROOFTOP, RANGE_INTERPOLATED, etc

  // Error handling
  error?: string;
}

export interface BatchGeocodingResult {
  results: GeocodingResponse[];
  stats: {
    total: number;
    successful: number;
    failed: number;
    processingTimeMs: number;
    costEstimate: number; // USD
  };
}

// =====================================================
// PROPERTY ENRICHMENT TYPES
// =====================================================

export interface PropertyEnrichmentRequest {
  address: string;
  lat?: number;
  lng?: number;
}

export interface PropertyEnrichmentResponse {
  success: boolean;

  // Owner information
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  ownerMailingAddress?: string;

  // Property characteristics
  propertyType?: string;
  yearBuilt?: number;
  squareFootage?: number;
  bedrooms?: number;
  bathrooms?: number;
  lotSize?: number;
  stories?: number;

  // Financial data
  assessedValue?: number;
  marketValue?: number;
  lastSaleDate?: string;
  lastSalePrice?: number;
  equityEstimate?: number;
  mortgageBalance?: number;

  // Roof-specific
  roofMaterial?: string;
  roofAge?: number;
  roofCondition?: string;

  // Provider info
  provider: 'propertyradar' | 'batchdata' | 'county_assessor' | 'manual';
  providerId?: string;

  // Raw data
  rawData?: Record<string, unknown>;

  // Error handling
  error?: string;
}

// =====================================================
// DATABASE TYPES (matching SQL schema)
// =====================================================

export interface StormEvent {
  id: string;
  tenantId: string;
  noaaEventId?: string;
  eventDate: string;
  eventType: 'hail' | 'tornado' | 'thunderstorm_wind' | 'flood' | 'other';
  magnitude?: number;
  state: string;
  county?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  pathLength?: number;
  pathWidth?: number;
  pathPolygon?: unknown; // PostGIS Geography type (GeoJSON)
  propertyDamage?: number;
  cropDamage?: number;
  injuries?: number;
  deaths?: number;
  eventNarrative?: string;
  episodeNarrative?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StormTargetingArea {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  boundaryPolygon: unknown; // PostGIS Geography type (GeoJSON)
  stormEventId?: string;
  areaSquareMiles?: number;
  addressCount: number;
  estimatedProperties?: number;
  status: 'draft' | 'extracting' | 'extracted' | 'enriching' | 'enriched' | 'importing' | 'imported' | 'error';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface BulkImportJob {
  id: string;
  tenantId: string;
  targetingAreaId?: string;
  jobType: 'extract_addresses' | 'enrich_properties' | 'import_contacts';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  skippedItems: number;
  createdContacts?: number;
  updatedContacts?: number;
  duplicateContacts?: number;
  errorMessage?: string;
  errorLog?: unknown;
  retryCount: number;
  maxRetries: number;
  startedAt?: string;
  completedAt?: string;
  estimatedCompletionAt?: string;
  importSettings?: unknown;
  results?: unknown;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface ExtractedAddressDB {
  id: string;
  tenantId: string;
  targetingAreaId: string;
  bulkImportJobId?: string;
  latitude: number;
  longitude: number;
  fullAddress?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  osmPropertyType?: string;
  osmBuildingType?: string;
  isEnriched: boolean;
  enrichmentCacheId?: string;
  isSelected: boolean;
  skipReason?: string;
  isDuplicate: boolean;
  duplicateContactId?: string;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface ExtractAddressesRequest {
  polygon: Polygon; // Array of lat/lng coordinates
  targetingAreaId?: string; // Optional - save to DB
  targetingAreaName?: string; // Optional - create new area
  stormEventId?: string; // Optional - link to storm event
}

export interface ExtractAddressesResponse {
  success: boolean;
  targetingAreaId?: string;
  bulkImportJobId?: string;
  addresses: ExtractedAddress[];
  stats: {
    totalBuildings: number;
    residentialCount: number;
    commercialCount: number;
    areaSquareMiles: number;
    estimatedProperties: number;
    processingTimeMs: number;
  };
  error?: string;
}

export interface EnrichPropertiesRequest {
  targetingAreaId: string;
  provider: 'propertyradar' | 'batchdata' | 'county_assessor';
  addressIds?: string[]; // Optional - specific addresses to enrich
}

export interface EnrichPropertiesResponse {
  success: boolean;
  bulkImportJobId: string;
  stats: {
    total: number;
    enriched: number;
    cached: number;
    failed: number;
    estimatedCost: number;
  };
  error?: string;
}

export interface ImportContactsRequest {
  targetingAreaId: string;
  settings: {
    source: string; // e.g., "Storm - Oct 15 2025 - Davidson County"
    tags?: string[]; // e.g., ["Hail Oct 2025"]
    pipelineStage?: string;
    assignedTo?: string; // User ID
    leadScore?: number;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  };
  addressIds?: string[]; // Optional - specific addresses to import (defaults to all selected)
}

export interface ImportContactsResponse {
  success: boolean;
  bulkImportJobId: string;
  stats: {
    total: number;
    created: number;
    updated: number;
    duplicates: number;
    failed: number;
  };
  error?: string;
}

// =====================================================
// UTILITY TYPES
// =====================================================

export interface ProcessingProgress {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  currentItem: number;
  totalItems: number;
  estimatedTimeRemainingMs?: number;
  message?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
  validationErrors?: ValidationError[];
}

export type ApiResponse<T> = T | ApiError;
