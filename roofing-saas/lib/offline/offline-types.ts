/**
 * Offline capabilities type definitions
 * Defines the data structures and interfaces for advanced offline functionality
 */

export interface OfflineRecord {
  id: string;
  table: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  data: Record<string, unknown>;
  timestamp: number;
  synced: boolean;
  retry_count: number;
  conflict?: ConflictResolution;
}

export interface ConflictResolution {
  id: string;
  local_version: Record<string, unknown>;
  server_version: Record<string, unknown>;
  resolution_strategy: 'local_wins' | 'server_wins' | 'manual' | 'merge';
  resolved: boolean;
  resolved_data?: Record<string, unknown>;
  resolved_at?: number;
}

export interface SyncStatus {
  is_online: boolean;
  is_syncing: boolean;
  last_sync: number | null;
  pending_changes: number;
  failed_syncs: number;
  sync_errors: SyncError[];
}

export interface SyncError {
  id: string;
  operation: OfflineRecord;
  error: string;
  timestamp: number;
  retry_after?: number;
}

export interface CacheConfig {
  tables: string[];
  max_age: number; // milliseconds
  max_size: number; // number of records
  strategy: 'cache_first' | 'network_first' | 'cache_only' | 'network_only';
}

export interface SyncOptions {
  force?: boolean;
  tables?: string[];
  resolve_conflicts?: boolean;
  max_retries?: number;
  batch_size?: number;
  [key: string]: unknown;
}

export interface OfflineFormData {
  id: string;
  form_type: 'inspection' | 'estimate' | 'contact' | 'project' | 'signature';
  data: Record<string, unknown>;
  photos: OfflinePhoto[];
  timestamp: number;
  synced: boolean;
}

export interface OfflinePhoto {
  id: string;
  blob_data: string; // base64 encoded
  filename: string;
  mime_type: string;
  size: number;
  timestamp: number;
  synced: boolean;
}

export interface OfflineProject {
  id: string;
  name: string;
  address: string;
  contacts: OfflineContact[];
  documents: OfflineDocument[];
  forms: OfflineFormData[];
  photos: OfflinePhoto[];
  last_updated: number;
  synced: boolean;
}

export interface OfflineContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  metadata?: Record<string, unknown>;
}

export interface OfflineDocument {
  id: string;
  name: string;
  type: string;
  blob_data: string; // base64 encoded
  size: number;
  timestamp: number;
  synced: boolean;
}

export interface NetworkState {
  is_online: boolean;
  connection_type: string;
  effective_type: string;
  downlink: number;
  rtt: number;
  [key: string]: unknown;
}

// Event types for offline functionality
export type OfflineEventType =
  | 'sync_started'
  | 'sync_completed'
  | 'sync_failed'
  | 'conflict_detected'
  | 'conflict_resolved'
  | 'network_changed'
  | 'cache_updated'
  | 'signature_queued'
  | 'signature_synced'
  | 'signature_sync_failed';

export interface OfflineEvent {
  type: OfflineEventType;
  data?: Record<string, unknown>;
  timestamp: number;
}
