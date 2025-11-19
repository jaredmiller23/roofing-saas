/**
 * Admin User Impersonation Types
 * Type definitions for admin impersonation system
 */

// Database Types
export interface ImpersonationLog {
  id: string
  tenant_id: string
  admin_user_id: string
  impersonated_user_id: string
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  reason: string | null
  ip_address: string | null
  user_agent: string | null
  status: 'active' | 'ended' | 'expired' | 'terminated'
  created_at: string
  updated_at: string
}

// Session Types
export interface ImpersonationSession {
  admin_user_id: string
  admin_email: string
  impersonated_user_id: string
  impersonated_email: string
  impersonated_role: string
  started_at: string
  expires_at: string
  reason?: string
  log_id: string
}

// API Request/Response Types
export interface StartImpersonationRequest {
  user_id: string
  reason?: string
}

export interface StartImpersonationResponse {
  success: boolean
  session: ImpersonationSession
  error?: string
}

export interface StopImpersonationResponse {
  success: boolean
  duration_seconds: number
  error?: string
}

export interface ImpersonationStatusResponse {
  is_impersonating: boolean
  admin_user?: {
    id: string
    email: string
  }
  impersonated_user?: {
    id: string
    email: string
    role: string
  }
  started_at?: string
  expires_at?: string
  time_remaining_seconds?: number
  reason?: string
}

export interface ImpersonationLogWithUsers extends ImpersonationLog {
  admin_email: string
  admin_name: string
  impersonated_email: string
  impersonated_name: string
}

export interface ListImpersonationLogsRequest {
  admin_user_id?: string
  impersonated_user_id?: string
  status?: ImpersonationLog['status']
  limit?: number
  offset?: number
}

export interface ListImpersonationLogsResponse {
  logs: ImpersonationLogWithUsers[]
  total: number
  has_more: boolean
}

// UI Types
export interface UserForImpersonation {
  id: string
  email: string
  first_name?: string
  last_name?: string
  role: string
  last_active?: string
  is_admin: boolean
}

export interface RecentImpersonation {
  user_id: string
  email: string
  name: string
  role: string
  last_impersonated_at: string
}

// Cookie Storage
export interface ImpersonationCookie {
  admin_user_id: string
  impersonated_user_id: string
  started_at: string
  expires_at: string
  reason?: string
  log_id: string
}

// Constants
export const IMPERSONATION_COOKIE_NAME = 'impersonation_session'
export const IMPERSONATION_DURATION_HOURS = 4
export const IMPERSONATION_WARNING_MINUTES = 5
