/**
 * Google Calendar API Client
 * Handles OAuth 2.0 authentication and Calendar API requests
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// Google OAuth endpoints
const GOOGLE_OAUTH_URL = 'https://oauth2.googleapis.com'
const GOOGLE_CALENDAR_API_URL = 'https://www.googleapis.com/calendar/v3'
const GOOGLE_TASKS_API_URL = 'https://tasks.googleapis.com/tasks/v1'

// Token response from Google
interface TokenResponse {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in: number
  scope: string
  id_token?: string
}

// Google user info
interface GoogleUserInfo {
  email: string
  name?: string
  picture?: string
}

// Calendar event
export interface GoogleCalendarEvent {
  id?: string
  summary: string
  description?: string
  location?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus?: string
  }>
  reminders?: {
    useDefault: boolean
    overrides?: Array<{
      method: 'email' | 'popup'
      minutes: number
    }>
  }
}

// Task list
export interface GoogleTaskList {
  id: string
  title: string
  updated?: string
}

// Task
export interface GoogleTask {
  id?: string
  title: string
  notes?: string
  due?: string
  status?: 'needsAction' | 'completed'
  completed?: string
}

/**
 * Google Calendar API Client
 */
export class GoogleCalendarClient {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    baseUrl: string,
    method: string,
    endpoint: string,
    data?: unknown
  ): Promise<T> {
    const url = `${baseUrl}${endpoint}`

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    }

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data)
    }

    logger.debug('Google API Request', { method, endpoint })

    const response = await fetch(url, options)

    if (!response.ok) {
      const error = await response.text()
      logger.error('Google API Error', { status: response.status, error })
      throw new Error(`Google API error: ${response.status} - ${error}`)
    }

    // Handle empty responses (like DELETE)
    const text = await response.text()
    if (!text) {
      return {} as T
    }

    return JSON.parse(text)
  }

  // ============================================================================
  // Calendar API Methods
  // ============================================================================

  /**
   * List calendars
   */
  async listCalendars(): Promise<{ items: Array<{ id: string; summary: string; primary?: boolean }> }> {
    return this.request(GOOGLE_CALENDAR_API_URL, 'GET', '/users/me/calendarList')
  }

  /**
   * Get primary calendar
   */
  async getPrimaryCalendar(): Promise<{ id: string; summary: string }> {
    return this.request(GOOGLE_CALENDAR_API_URL, 'GET', '/calendars/primary')
  }

  /**
   * List events from a calendar
   */
  async listEvents(
    calendarId: string = 'primary',
    options?: {
      timeMin?: string
      timeMax?: string
      maxResults?: number
      singleEvents?: boolean
      orderBy?: 'startTime' | 'updated'
    }
  ): Promise<{ items: GoogleCalendarEvent[] }> {
    const params = new URLSearchParams()
    if (options?.timeMin) params.append('timeMin', options.timeMin)
    if (options?.timeMax) params.append('timeMax', options.timeMax)
    if (options?.maxResults) params.append('maxResults', options.maxResults.toString())
    if (options?.singleEvents !== undefined) params.append('singleEvents', options.singleEvents.toString())
    if (options?.orderBy) params.append('orderBy', options.orderBy)

    const query = params.toString() ? `?${params.toString()}` : ''
    return this.request(GOOGLE_CALENDAR_API_URL, 'GET', `/calendars/${encodeURIComponent(calendarId)}/events${query}`)
  }

  /**
   * Get a single event
   */
  async getEvent(calendarId: string = 'primary', eventId: string): Promise<GoogleCalendarEvent> {
    return this.request(GOOGLE_CALENDAR_API_URL, 'GET', `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`)
  }

  /**
   * Create an event
   */
  async createEvent(calendarId: string = 'primary', event: GoogleCalendarEvent): Promise<GoogleCalendarEvent> {
    return this.request(GOOGLE_CALENDAR_API_URL, 'POST', `/calendars/${encodeURIComponent(calendarId)}/events`, event)
  }

  /**
   * Update an event
   */
  async updateEvent(calendarId: string = 'primary', eventId: string, event: GoogleCalendarEvent): Promise<GoogleCalendarEvent> {
    return this.request(GOOGLE_CALENDAR_API_URL, 'PUT', `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, event)
  }

  /**
   * Delete an event
   */
  async deleteEvent(calendarId: string = 'primary', eventId: string): Promise<void> {
    await this.request(GOOGLE_CALENDAR_API_URL, 'DELETE', `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`)
  }

  // ============================================================================
  // Tasks API Methods
  // ============================================================================

  /**
   * List task lists
   */
  async listTaskLists(): Promise<{ items: GoogleTaskList[] }> {
    return this.request(GOOGLE_TASKS_API_URL, 'GET', '/users/@me/lists')
  }

  /**
   * List tasks in a task list
   */
  async listTasks(taskListId: string = '@default'): Promise<{ items: GoogleTask[] }> {
    return this.request(GOOGLE_TASKS_API_URL, 'GET', `/lists/${taskListId}/tasks`)
  }

  /**
   * Create a task
   */
  async createTask(taskListId: string = '@default', task: GoogleTask): Promise<GoogleTask> {
    return this.request(GOOGLE_TASKS_API_URL, 'POST', `/lists/${taskListId}/tasks`, task)
  }

  /**
   * Update a task
   */
  async updateTask(taskListId: string = '@default', taskId: string, task: GoogleTask): Promise<GoogleTask> {
    return this.request(GOOGLE_TASKS_API_URL, 'PATCH', `/lists/${taskListId}/tasks/${taskId}`, task)
  }

  /**
   * Delete a task
   */
  async deleteTask(taskListId: string = '@default', taskId: string): Promise<void> {
    await this.request(GOOGLE_TASKS_API_URL, 'DELETE', `/lists/${taskListId}/tasks/${taskId}`)
  }

  /**
   * Complete a task
   */
  async completeTask(taskListId: string = '@default', taskId: string): Promise<GoogleTask> {
    return this.updateTask(taskListId, taskId, {
      title: '', // Will be ignored in PATCH
      status: 'completed',
      completed: new Date().toISOString(),
    })
  }
}

/**
 * Get Google Calendar client for user
 */
export async function getGoogleCalendarClient(userId: string, tenantId: string): Promise<GoogleCalendarClient | null> {
  const supabase = await createClient()

  // Get token from database
  const { data: token, error } = await supabase
    .from('google_calendar_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !token) {
    logger.warn('No Google Calendar token found', { userId, tenantId, error })
    return null
  }

  // Decrypt tokens
  const { data: decryptedAccessToken, error: accessTokenError } = await supabase
    .rpc('decrypt_google_token', { encrypted_data: token.access_token })

  const { data: decryptedRefreshToken, error: refreshTokenError } = await supabase
    .rpc('decrypt_google_token', { encrypted_data: token.refresh_token })

  if (accessTokenError || refreshTokenError || !decryptedAccessToken || !decryptedRefreshToken) {
    logger.error('Failed to decrypt Google tokens', {
      userId,
      tenantId,
      accessTokenError,
      refreshTokenError
    })
    return null
  }

  // Check if token is expired
  const expiresAt = new Date(token.expires_at)
  const now = new Date()

  if (expiresAt <= now) {
    // Token expired, need to refresh
    logger.info('Google token expired, refreshing', { userId, tenantId })
    const newToken = await refreshAccessToken(decryptedRefreshToken as string)

    if (!newToken) {
      logger.error('Failed to refresh Google token', { userId, tenantId })
      return null
    }

    // Encrypt new tokens
    const { data: rawEncryptedAccessToken } = await supabase
      .rpc('encrypt_google_token', { plaintext: newToken.access_token })
    const encryptedAccessToken = rawEncryptedAccessToken as string | null

    if (!encryptedAccessToken) {
      logger.error('Failed to encrypt new Google token', { userId, tenantId })
      return null
    }

    // Update token in database
    await supabase
      .from('google_calendar_tokens')
      .update({
        access_token: encryptedAccessToken,
        expires_at: new Date(Date.now() + newToken.expires_in * 1000).toISOString(),
      })
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)

    return new GoogleCalendarClient(newToken.access_token)
  }

  return new GoogleCalendarClient(decryptedAccessToken as string)
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeAuthCode(
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })

  const response = await fetch(`${GOOGLE_OAUTH_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })

  if (!response.ok) {
    const error = await response.text()
    logger.error('Failed to exchange Google auth code', { error })
    throw new Error(`Token exchange failed: ${error}`)
  }

  return await response.json()
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const response = await fetch(`${GOOGLE_OAUTH_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })

  if (!response.ok) {
    const error = await response.text()
    logger.error('Failed to refresh Google token', { error })
    return null
  }

  return await response.json()
}

/**
 * Get user info from access token
 */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get user info: ${error}`)
  }

  return await response.json()
}

/**
 * Revoke Google OAuth token
 */
export async function revokeToken(token: string): Promise<void> {
  const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  if (!response.ok) {
    const error = await response.text()
    logger.warn('Failed to revoke Google token (may already be revoked)', { error })
  }
}

/**
 * Get authorization URL for OAuth flow
 */
export function getAuthorizationUrl(redirectUri: string, state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID

  if (!clientId) {
    throw new Error('Google Client ID not configured')
  }

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/tasks',
    'https://www.googleapis.com/auth/userinfo.email',
  ]

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent', // Force consent to get refresh token
    state,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}
