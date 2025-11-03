/**
 * ADDRESS EXTRACTION MODULE
 * Export all address extraction functionality
 */

// Core clients
export { overpassClient, extractAddressesFromPolygon, estimateBuildingCountInPolygon } from './overpass-client';
export { googlePlacesClient, extractAddressesWithGooglePlaces } from './google-places-client';
export { geocodingClient, batchReverseGeocode, enrichAddressesWithGeocoding, estimateGeocodingCost } from './geocoder';

// Types
export type {
  // Core types
  LatLng,
  BoundingBox,
  Polygon,

  // OSM types
  OSMElement,
  OverpassResponse,
  BuildingData,

  // Address types
  ExtractedAddress,
  AddressExtractionResult,

  // Geocoding types
  GeocodingRequest,
  GeocodingResponse,
  BatchGeocodingResult,

  // Property enrichment types
  PropertyEnrichmentRequest,
  PropertyEnrichmentResponse,

  // Database types
  StormEvent,
  StormTargetingArea,
  BulkImportJob,
  ExtractedAddressDB,

  // API types
  ExtractAddressesRequest,
  ExtractAddressesResponse,
  EnrichPropertiesRequest,
  EnrichPropertiesResponse,
  ImportContactsRequest,
  ImportContactsResponse,

  // Utility types
  ProcessingProgress,
  ValidationError,
  ApiError,
  ApiResponse,
} from './types';
