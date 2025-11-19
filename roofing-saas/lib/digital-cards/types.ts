// =============================================
// Digital Business Cards - Type Definitions
// =============================================
// Purpose: TypeScript types for digital business cards system
// Author: Claude Code
// Date: 2025-11-18
// =============================================

// =============================================
// DATABASE TYPES
// =============================================

export interface DigitalBusinessCard {
  id: string
  tenant_id: string
  user_id: string

  // Personal Information
  full_name: string
  job_title?: string | null
  phone?: string | null
  email?: string | null

  // Company Information
  company_name?: string | null
  company_address?: string | null
  company_phone?: string | null
  company_email?: string | null
  company_website?: string | null

  // Social Links
  linkedin_url?: string | null
  facebook_url?: string | null
  instagram_url?: string | null
  twitter_url?: string | null

  // Card Content
  tagline?: string | null
  bio?: string | null
  services?: string | null // Comma-separated or JSON array

  // Branding
  brand_color: string // Hex color (#3b82f6)
  logo_url?: string | null
  profile_photo_url?: string | null
  background_image_url?: string | null

  // Card Settings
  slug: string
  qr_code_url?: string | null
  card_url?: string | null
  is_active: boolean
  enable_contact_form: boolean
  enable_appointment_booking: boolean

  // Analytics Summary
  total_views: number
  total_vcard_downloads: number
  total_phone_clicks: number
  total_email_clicks: number
  total_contact_form_submissions: number

  // Metadata
  created_at: string
  updated_at: string
  last_viewed_at?: string | null
}

export type InteractionType =
  | 'view'
  | 'vcard_download'
  | 'phone_click'
  | 'email_click'
  | 'website_click'
  | 'linkedin_click'
  | 'facebook_click'
  | 'instagram_click'
  | 'twitter_click'
  | 'contact_form_submit'
  | 'appointment_booked'

export interface BusinessCardInteraction {
  id: string
  card_id: string

  // Interaction Details
  interaction_type: InteractionType

  // Prospect Information (from contact form)
  prospect_name?: string | null
  prospect_email?: string | null
  prospect_phone?: string | null
  prospect_company?: string | null
  prospect_message?: string | null

  // Tracking Data
  ip_address?: string | null
  user_agent?: string | null
  referrer?: string | null
  device_type?: string | null // 'mobile', 'tablet', 'desktop'
  browser?: string | null
  os?: string | null
  country?: string | null
  city?: string | null

  // Metadata
  interaction_metadata?: Record<string, unknown> | null
  created_at: string
}

// =============================================
// API REQUEST/RESPONSE TYPES
// =============================================

// GET /api/digital-cards
export interface GetDigitalCardsResponse {
  cards: DigitalBusinessCard[]
  total: number
}

// GET /api/digital-cards/:id
export interface GetDigitalCardResponse {
  card: DigitalBusinessCard
}

// GET /api/digital-cards/slug/:slug (public)
export interface GetCardBySlugResponse {
  card: PublicCardData
}

// POST /api/digital-cards
export interface CreateDigitalCardRequest {
  full_name: string
  job_title?: string
  phone?: string
  email?: string

  company_name?: string
  company_address?: string
  company_phone?: string
  company_email?: string
  company_website?: string

  linkedin_url?: string
  facebook_url?: string
  instagram_url?: string
  twitter_url?: string

  tagline?: string
  bio?: string
  services?: string

  brand_color?: string
  slug?: string
  enable_contact_form?: boolean
  enable_appointment_booking?: boolean
}

export interface CreateDigitalCardResponse {
  card: DigitalBusinessCard
}

// PATCH /api/digital-cards/:id
export interface UpdateDigitalCardRequest {
  full_name?: string
  job_title?: string
  phone?: string
  email?: string

  company_name?: string
  company_address?: string
  company_phone?: string
  company_email?: string
  company_website?: string

  linkedin_url?: string
  facebook_url?: string
  instagram_url?: string
  twitter_url?: string

  tagline?: string
  bio?: string
  services?: string

  brand_color?: string
  logo_url?: string
  profile_photo_url?: string
  background_image_url?: string

  slug?: string
  is_active?: boolean
  enable_contact_form?: boolean
  enable_appointment_booking?: boolean
}

export interface UpdateDigitalCardResponse {
  card: DigitalBusinessCard
}

// GET /api/digital-cards/:id/analytics
export interface GetCardAnalyticsResponse {
  summary: CardAnalyticsSummary
  interactions_by_type: InteractionTypeSummary[]
  recent_interactions: BusinessCardInteraction[]
  performance_metrics: PerformanceMetrics
  chart_data: ChartData
}

// POST /api/digital-cards/:id/interactions (public)
export interface CreateInteractionRequest {
  interaction_type: InteractionType
  prospect_name?: string
  prospect_email?: string
  prospect_phone?: string
  prospect_company?: string
  prospect_message?: string
  referrer?: string
  device_type?: string
}

export interface CreateInteractionResponse {
  interaction: BusinessCardInteraction
}

// POST /api/digital-cards/:id/contact (public contact form)
export interface SubmitContactFormRequest {
  name: string
  email: string
  phone?: string
  company?: string
  message: string
}

export interface SubmitContactFormResponse {
  success: boolean
  message: string
}

// =============================================
// HELPER TYPES
// =============================================

// Public-facing card data (excludes sensitive analytics)
export interface PublicCardData {
  id: string
  full_name: string
  job_title?: string | null
  phone?: string | null
  email?: string | null

  company_name?: string | null
  company_address?: string | null
  company_phone?: string | null
  company_email?: string | null
  company_website?: string | null

  linkedin_url?: string | null
  facebook_url?: string | null
  instagram_url?: string | null
  twitter_url?: string | null

  tagline?: string | null
  bio?: string | null
  services?: string | null

  brand_color: string
  logo_url?: string | null
  profile_photo_url?: string | null
  background_image_url?: string | null

  enable_contact_form: boolean
  enable_appointment_booking: boolean
}

// Analytics summary
export interface CardAnalyticsSummary {
  total_views: number
  total_vcard_downloads: number
  total_phone_clicks: number
  total_email_clicks: number
  total_contact_form_submissions: number
  total_interactions: number
  unique_visitors: number
  last_viewed_at?: string | null
}

// Interaction type summary
export interface InteractionTypeSummary {
  interaction_type: InteractionType
  count: number
  unique_ips: number
  latest_interaction?: string | null
}

// Performance metrics
export interface PerformanceMetrics {
  total_views: number
  unique_visitors: number
  conversion_rate: number // Percentage
  avg_daily_views: number
  top_referrer?: string | null
  top_country?: string | null
  top_device?: string | null
}

// Chart data for analytics visualizations
export interface ChartData {
  views_over_time: TimeSeriesDataPoint[]
  interactions_by_type: { type: string; count: number }[]
  devices: { device: string; count: number }[]
  countries: { country: string; count: number }[]
}

export interface TimeSeriesDataPoint {
  date: string
  views: number
  interactions: number
}

// vCard generation data
export interface VCardData {
  firstName: string
  lastName: string
  fullName: string
  title?: string
  organization?: string
  email?: string
  phone?: string
  website?: string
  address?: string
  photo?: string
  note?: string
  socialProfiles?: {
    linkedin?: string
    facebook?: string
    instagram?: string
    twitter?: string
  }
}

// QR code generation options
export interface QRCodeOptions {
  size?: number
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  margin?: number
  color?: {
    dark?: string
    light?: string
  }
}

// =============================================
// FORM TYPES (for UI components)
// =============================================

export interface CardFormData {
  // Personal
  full_name: string
  job_title: string
  phone: string
  email: string

  // Company
  company_name: string
  company_address: string
  company_phone: string
  company_email: string
  company_website: string

  // Social
  linkedin_url: string
  facebook_url: string
  instagram_url: string
  twitter_url: string

  // Content
  tagline: string
  bio: string
  services: string

  // Branding
  brand_color: string

  // Settings
  enable_contact_form: boolean
  enable_appointment_booking: boolean
}

export interface ContactFormData {
  name: string
  email: string
  phone: string
  company: string
  message: string
}

// =============================================
// VALIDATION TYPES
// =============================================

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

// =============================================
// UTILITY TYPES
// =============================================

// Extract services array from comma-separated string
export type ParsedServices = string[]

// Device detection result
export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop'
  browser: string
  os: string
}

// Geolocation result
export interface GeolocationInfo {
  country?: string
  city?: string
  ip?: string
}

// =============================================
// CONSTANTS
// =============================================

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  view: 'Page View',
  vcard_download: 'vCard Download',
  phone_click: 'Phone Click',
  email_click: 'Email Click',
  website_click: 'Website Click',
  linkedin_click: 'LinkedIn Click',
  facebook_click: 'Facebook Click',
  instagram_click: 'Instagram Click',
  twitter_click: 'Twitter Click',
  contact_form_submit: 'Contact Form',
  appointment_booked: 'Appointment',
}

export const DEFAULT_BRAND_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
]

export const DEVICE_TYPES = ['mobile', 'tablet', 'desktop'] as const

export const DEFAULT_QR_CODE_SIZE = 300
export const DEFAULT_QR_CODE_ERROR_CORRECTION = 'M'

// =============================================
// TYPE GUARDS
// =============================================

export function isValidInteractionType(value: string): value is InteractionType {
  return [
    'view',
    'vcard_download',
    'phone_click',
    'email_click',
    'website_click',
    'linkedin_click',
    'facebook_click',
    'instagram_click',
    'twitter_click',
    'contact_form_submit',
    'appointment_booked',
  ].includes(value)
}

export function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

export function isValidSlug(value: string): boolean {
  return /^[a-z0-9-]+$/.test(value)
}

// =============================================
// HELPER FUNCTIONS
// =============================================

export function parseServices(servicesString?: string | null): ParsedServices {
  if (!servicesString) return []
  return servicesString
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export function formatServicesString(services: ParsedServices): string {
  return services.join(', ')
}

export function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getFullCardUrl(slug: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/card/${slug}`
}

export function getInteractionTypeLabel(type: InteractionType): string {
  return INTERACTION_TYPE_LABELS[type] || type
}

export function calculateConversionRate(
  conversions: number,
  views: number
): number {
  if (views === 0) return 0
  return Math.round((conversions / views) * 100 * 100) / 100 // Round to 2 decimals
}
