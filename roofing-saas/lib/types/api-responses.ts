/**
 * API Response Types
 *
 * Proper TypeScript interfaces for API responses to replace `any` types
 * throughout the application.
 */

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T = unknown> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Analytics and metrics responses
 */
export interface AnalyticsResponse {
  metrics: {
    [key: string]: number | string;
  };
  trends: {
    period: string;
    value: number;
    change: number;
  }[];
  charts: ChartData[];
}

export interface ChartData {
  name: string;
  data: Array<{
    x: string | number;
    y: number;
    label?: string;
  }>;
  type: 'line' | 'bar' | 'pie' | 'area';
}

/**
 * Project and contact related responses
 */
export interface ProjectResponse {
  id: string;
  name: string;
  address: string;
  status: string;
  created_at: string;
  updated_at: string;
  contact_id?: string;
  metadata?: Record<string, unknown>;
}

export interface ContactResponse {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  score?: number;
  status: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

/**
 * Estimate and automation responses
 */
export interface EstimateResponse {
  id: string;
  project_id: string;
  total_amount: number;
  line_items: EstimateLineItem[];
  status: string;
  created_at: string;
  updated_at: string;
  options?: EstimateOption[];
}

export interface EstimateLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  category?: string;
}

export interface EstimateOption {
  id: string;
  name: string;
  description?: string;
  price_adjustment: number;
  is_selected: boolean;
}

export interface AutomationResponse {
  id: string;
  name: string;
  description?: string;
  trigger_type: string;
  actions: AutomationAction[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutomationAction {
  id: string;
  type: string;
  config: Record<string, unknown>;
  order: number;
}

/**
 * Storm tracking and notifications
 */
export interface StormResponse {
  id: string;
  name: string;
  category: number;
  latitude: number;
  longitude: number;
  wind_speed: number;
  pressure: number;
  movement_direction: number;
  movement_speed: number;
  forecast_path: StormPoint[];
  updated_at: string;
}

export interface StormPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  intensity: number;
}

export interface NotificationResponse {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}

/**
 * Audit and admin responses
 */
export interface AuditLogResponse {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  changes: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

/**
 * Form and upload responses
 */
export interface UploadResponse {
  id: string;
  filename: string;
  url: string;
  size: number;
  mime_type: string;
  created_at: string;
}

export interface FormSubmissionResponse {
  id: string;
  form_type: string;
  data: Record<string, unknown>;
  files: UploadResponse[];
  submitted_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * Sync and offline responses
 */
export interface SyncResponse {
  success: boolean;
  synced_records: number;
  failed_records: number;
  conflicts: number;
  last_sync: string;
  errors?: SyncError[];
}

export interface SyncError {
  table: string;
  record_id: string;
  error: string;
  retry_count: number;
}