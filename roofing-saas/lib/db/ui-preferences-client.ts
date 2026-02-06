/**
 * UI Preferences Supabase Client Operations
 * 
 * Provides functions for managing user UI preferences in the database.
 */

import { createClient } from '@/lib/supabase/client'
import type { UIPreferencesRow, UIPreferencesInput, NavStyle, UIMode } from './ui-preferences'

/**
 * Get user's UI preferences from the database
 */
export async function getUserUIPreferences(userId: string, tenantId: string): Promise<UIPreferencesRow | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('user_ui_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch UI preferences: ${error.message}`)
  }

  return data as unknown as UIPreferencesRow | null
}

/**
 * Create or update user's UI preferences
 */
export async function upsertUserUIPreferences(
  userId: string,
  tenantId: string,
  preferences: UIPreferencesInput
): Promise<UIPreferencesRow> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('user_ui_preferences')
    .upsert({
      user_id: userId,
      tenant_id: tenantId,
      ...preferences,
    }, {
      onConflict: 'user_id,tenant_id'
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to save UI preferences: ${error.message}`)
  }

  return data as unknown as UIPreferencesRow
}

/**
 * Update just the navigation style preference
 */
export async function updateNavStyle(
  userId: string,
  tenantId: string,
  navStyle: NavStyle
): Promise<void> {
  await upsertUserUIPreferences(userId, tenantId, { nav_style: navStyle })
}

/**
 * Update UI mode preference
 */
export async function updateUIMode(
  userId: string,
  tenantId: string,
  uiMode: UIMode | undefined,
  autoDetect: boolean = true
): Promise<void> {
  await upsertUserUIPreferences(userId, tenantId, {
    ui_mode: uiMode,
    ui_mode_auto_detect: autoDetect,
  })
}
