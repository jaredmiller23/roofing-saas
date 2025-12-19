'use client'

/**
 * UI Preferences Hook
 *
 * Provides access to user UI preferences including navigation style,
 * theme, and other interface settings. Handles client-side hydration
 * and provides optimistic updates with database persistence.
 */

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserUIPreferences, upsertUserUIPreferences, updateNavStyle } from '@/lib/db/ui-preferences-client'
import {
  UIPreferences,
  NavStyle,
  UIMode,
  DEFAULT_UI_PREFERENCES,
  NAV_STYLE_STORAGE_KEY
} from '@/lib/db/ui-preferences'
import type { User } from '@supabase/supabase-js'

export interface UseUIPreferencesReturn {
  /** Current UI preferences */
  preferences: UIPreferences
  /** Loading state during initial fetch */
  loading: boolean
  /** Whether the component is mounted (avoids hydration issues) */
  mounted: boolean
  /** Update navigation style */
  setNavStyle: (navStyle: NavStyle) => Promise<void>
  /** Update UI mode */
  setUIMode: (uiMode: UIMode | undefined, autoDetect?: boolean) => Promise<void>
  /** Update multiple preferences at once */
  updatePreferences: (preferences: Partial<UIPreferences>) => Promise<void>
  /** Refresh preferences from database */
  refresh: () => Promise<void>
}

/**
 * Hook to access and manage user UI preferences
 */
export function useUIPreferences(): UseUIPreferencesReturn {
  const [user, setUser] = useState<User | null>(null)
  const [preferences, setPreferences] = useState<UIPreferences>(DEFAULT_UI_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()

  // Handle hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Get current user on mount
  useEffect(() => {
    if (!mounted) return

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    getUser()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth, mounted])

  // Load preferences on mount and user change
  useEffect(() => {
    if (!mounted) return

    const loadPreferences = async () => {
      setLoading(true)
      try {
        if (user?.id) {
          // Get tenant ID from tenant_users table (using getUserTenantId pattern)
          const { data: tenantData } = await supabase
            .from('tenant_users')
            .select('tenant_id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .order('joined_at', { ascending: false })
            .limit(1)

          const tenantId = tenantData?.[0]?.tenant_id
          if (tenantId) {
            const dbPreferences = await getUserUIPreferences(user.id, tenantId)
            if (dbPreferences) {
              setPreferences({
                nav_style: dbPreferences.nav_style,
                ui_mode: dbPreferences.ui_mode,
                ui_mode_auto_detect: dbPreferences.ui_mode_auto_detect,
                theme: dbPreferences.theme,
                sidebar_collapsed: dbPreferences.sidebar_collapsed,
              })
            } else {
              // No preferences in DB yet, check localStorage for migration
              const localNavStyle = localStorage.getItem(NAV_STYLE_STORAGE_KEY) as NavStyle
              if (localNavStyle && (localNavStyle === 'traditional' || localNavStyle === 'instagram')) {
                const migrationPreferences = {
                  ...DEFAULT_UI_PREFERENCES,
                  nav_style: localNavStyle,
                }
                setPreferences(migrationPreferences)
                // Save to database
                await upsertUserUIPreferences(user.id, tenantId, migrationPreferences)
              } else {
                setPreferences(DEFAULT_UI_PREFERENCES)
              }
            }
          }
        } else {
          // Guest user - use localStorage only
          const localNavStyle = localStorage.getItem(NAV_STYLE_STORAGE_KEY) as NavStyle
          if (localNavStyle && (localNavStyle === 'traditional' || localNavStyle === 'instagram')) {
            setPreferences({
              ...DEFAULT_UI_PREFERENCES,
              nav_style: localNavStyle,
            })
          } else {
            setPreferences(DEFAULT_UI_PREFERENCES)
          }
        }
      } catch (error) {
        console.error('Failed to load UI preferences:', error)
        setPreferences(DEFAULT_UI_PREFERENCES)
      } finally {
        setLoading(false)
      }
    }

    loadPreferences()
  }, [user?.id, mounted, supabase])

  // Update navigation style
  const setNavStyle = useCallback(async (navStyle: NavStyle) => {
    // Optimistic update
    setPreferences(prev => ({ ...prev, nav_style: navStyle }))

    try {
      if (user?.id) {
        // Get tenant ID
        const { data: tenantData } = await supabase
          .from('tenant_users')
          .select('tenant_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('joined_at', { ascending: false })
          .limit(1)

        const tenantId = tenantData?.[0]?.tenant_id
        if (tenantId) {
          await updateNavStyle(user.id, tenantId, navStyle)
        }
      }
      // Always update localStorage for persistence
      localStorage.setItem(NAV_STYLE_STORAGE_KEY, navStyle)
    } catch (error) {
      console.error('Failed to update navigation style:', error)
      // Revert optimistic update on error
      setPreferences(prev => ({
        ...prev,
        nav_style: prev.nav_style === navStyle ? DEFAULT_UI_PREFERENCES.nav_style : prev.nav_style
      }))
    }
  }, [user?.id, supabase])

  // Update UI mode
  const setUIMode = useCallback(async (uiMode: UIMode | undefined, autoDetect: boolean = true) => {
    // Optimistic update
    setPreferences(prev => ({
      ...prev,
      ui_mode: uiMode,
      ui_mode_auto_detect: autoDetect
    }))

    try {
      if (user?.id) {
        // Get tenant ID
        const { data: tenantData } = await supabase
          .from('tenant_users')
          .select('tenant_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('joined_at', { ascending: false })
          .limit(1)

        const tenantId = tenantData?.[0]?.tenant_id
        if (tenantId) {
          await upsertUserUIPreferences(user.id, tenantId, {
            ui_mode: uiMode,
            ui_mode_auto_detect: autoDetect,
          })
        }
      }
    } catch (error) {
      console.error('Failed to update UI mode:', error)
      // Revert optimistic update on error
      setPreferences(prev => ({
        ...prev,
        ui_mode: prev.ui_mode,
        ui_mode_auto_detect: prev.ui_mode_auto_detect
      }))
    }
  }, [user?.id, supabase])

  // Update multiple preferences
  const updatePreferences = useCallback(async (newPreferences: Partial<UIPreferences>) => {
    // Optimistic update
    setPreferences(prev => ({ ...prev, ...newPreferences }))

    try {
      if (user?.id) {
        // Get tenant ID
        const { data: tenantData } = await supabase
          .from('tenant_users')
          .select('tenant_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('joined_at', { ascending: false })
          .limit(1)

        const tenantId = tenantData?.[0]?.tenant_id
        if (tenantId) {
          await upsertUserUIPreferences(user.id, tenantId, newPreferences)
        }
      }

      // Update localStorage for nav_style if provided
      if (newPreferences.nav_style) {
        localStorage.setItem(NAV_STYLE_STORAGE_KEY, newPreferences.nav_style)
      }
    } catch (error) {
      console.error('Failed to update UI preferences:', error)
      // Revert optimistic update on error
      setPreferences(prev => {
        const reverted = { ...prev }
        Object.keys(newPreferences).forEach(key => {
          delete reverted[key as keyof UIPreferences]
        })
        return reverted
      })
    }
  }, [user?.id, supabase])

  // Refresh from database
  const refresh = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      // Get tenant ID
      const { data: tenantData } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('joined_at', { ascending: false })
        .limit(1)

      const tenantId = tenantData?.[0]?.tenant_id
      if (tenantId) {
        const dbPreferences = await getUserUIPreferences(user.id, tenantId)
        if (dbPreferences) {
          setPreferences({
            nav_style: dbPreferences.nav_style,
            ui_mode: dbPreferences.ui_mode,
            ui_mode_auto_detect: dbPreferences.ui_mode_auto_detect,
            theme: dbPreferences.theme,
            sidebar_collapsed: dbPreferences.sidebar_collapsed,
          })
        }
      }
    } catch (error) {
      console.error('Failed to refresh UI preferences:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id, supabase])

  return {
    preferences,
    loading,
    mounted,
    setNavStyle,
    setUIMode,
    updatePreferences,
    refresh,
  }
}

/**
 * Utility function to get navigation style display name
 */
export function getNavStyleDisplayName(navStyle: NavStyle): string {
  switch (navStyle) {
    case 'traditional':
      return 'Traditional'
    case 'instagram':
      return 'Instagram Style'
    default:
      return 'Unknown'
  }
}

/**
 * Utility function to get navigation style description
 */
export function getNavStyleDescription(navStyle: NavStyle): string {
  switch (navStyle) {
    case 'traditional':
      return 'Classic navigation with sidebar and top bar'
    case 'instagram':
      return 'Instagram-inspired layout with bottom navigation and stories'
    default:
      return 'Unknown navigation style'
  }
}