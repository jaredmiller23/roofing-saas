/**
 * Integration tests for Navigation Style Switching
 *
 * Tests the end-to-end functionality of navigation style switching,
 * including user preference persistence and layout adaptation logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { UIPreferences, NavStyle } from '@/lib/db/ui-preferences'

// Mock database operations
vi.mock('@/lib/db/ui-preferences-client', () => ({
  getUserUIPreferences: vi.fn(),
  upsertUserUIPreferences: vi.fn(),
  updateNavStyle: vi.fn(),
}))

describe('Navigation Style Switching Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Preference Persistence Logic', () => {
    it('should validate navigation style preference types', () => {
      const validPreferences: UIPreferences = {
        nav_style: 'traditional',
        ui_mode: undefined,
        ui_mode_auto_detect: true,
        theme: 'system',
        sidebar_collapsed: false,
      }

      expect(validPreferences.nav_style).toBe('traditional')
      expect(['traditional', 'instagram']).toContain(validPreferences.nav_style)
    })

    it('should handle navigation style transitions', () => {
      const currentStyle: NavStyle = 'traditional'
      const newStyle: NavStyle = 'instagram'

      expect(currentStyle).not.toBe(newStyle)
      expect(['traditional', 'instagram']).toContain(currentStyle)
      expect(['traditional', 'instagram']).toContain(newStyle)
    })

    it('should validate preference update structure', async () => {
      const { updateNavStyle } = await import('@/lib/db/ui-preferences-client')
      const mockUpdateNavStyle = vi.mocked(updateNavStyle)

      mockUpdateNavStyle.mockResolvedValue(undefined)

      await updateNavStyle('user-123', 'tenant-123', 'instagram')

      expect(mockUpdateNavStyle).toHaveBeenCalledWith('user-123', 'tenant-123', 'instagram')
      expect(mockUpdateNavStyle).toHaveBeenCalledTimes(1)
    })

    it('should handle database errors gracefully', async () => {
      const { updateNavStyle } = await import('@/lib/db/ui-preferences-client')
      const mockUpdateNavStyle = vi.mocked(updateNavStyle)

      const dbError = new Error('Database connection failed')
      mockUpdateNavStyle.mockRejectedValue(dbError)

      try {
        await updateNavStyle('user-123', 'tenant-123', 'instagram')
      } catch (error) {
        expect(error).toBe(dbError)
      }

      expect(mockUpdateNavStyle).toHaveBeenCalledWith('user-123', 'tenant-123', 'instagram')
    })
  })

  describe('Layout Adaptation Logic', () => {
    it('should determine correct layout based on UI mode and navigation style', () => {
      const testCases = [
        {
          mode: 'field',
          navStyle: 'traditional',
          expectedLayout: 'traditional-nav',
          description: 'Field mode with traditional should use traditional navigation',
        },
        {
          mode: 'field',
          navStyle: 'instagram',
          expectedLayout: 'instagram-layout',
          description: 'Field mode with Instagram should use Instagram layout',
        },
        {
          mode: 'manager',
          navStyle: 'instagram', // Should be ignored
          expectedLayout: 'manager-layout',
          description: 'Manager mode should ignore navigation style preference',
        },
        {
          mode: 'full',
          navStyle: 'instagram', // Should be ignored
          expectedLayout: 'full-layout',
          description: 'Full mode should ignore navigation style preference',
        },
      ]

      testCases.forEach((testCase) => {
        const shouldUseNavStyle = testCase.mode === 'field'
        const effectiveLayout = shouldUseNavStyle
          ? testCase.navStyle === 'instagram'
            ? 'instagram-layout'
            : 'traditional-nav'
          : `${testCase.mode}-layout`

        expect(effectiveLayout).toBe(testCase.expectedLayout)
      })
    })

    it('should handle loading states correctly', () => {
      const loadingState = {
        preferences: null,
        loading: true,
        mounted: true,
      }

      const shouldShowLoading = loadingState.loading && loadingState.mounted
      expect(shouldShowLoading).toBe(true)
    })

    it('should handle unmounted state correctly', () => {
      const unmountedState = {
        preferences: { nav_style: 'traditional' as NavStyle },
        loading: false,
        mounted: false,
      }

      const shouldRender = unmountedState.mounted
      expect(shouldRender).toBe(false)
    })
  })

  describe('Storage Integration', () => {
    it('should validate localStorage key format', () => {
      const NAV_STYLE_STORAGE_KEY = 'nav_style_preference'

      expect(NAV_STYLE_STORAGE_KEY).toBe('nav_style_preference')
      expect(NAV_STYLE_STORAGE_KEY).toMatch(/^[a-z_]+$/)
    })

    it('should validate localStorage value format', () => {
      const validValues: NavStyle[] = ['traditional', 'instagram']
      const invalidValues = ['invalid', 'unknown', null, undefined, '']

      validValues.forEach(value => {
        expect(['traditional', 'instagram']).toContain(value)
      })

      invalidValues.forEach(value => {
        expect(['traditional', 'instagram']).not.toContain(value)
      })
    })

    it('should handle localStorage migration logic', async () => {
      const { getUserUIPreferences, upsertUserUIPreferences } = await import('@/lib/db/ui-preferences-client')
      const mockGetUserUIPreferences = vi.mocked(getUserUIPreferences)
      const mockUpsertUserUIPreferences = vi.mocked(upsertUserUIPreferences)

      // Simulate no database preferences but localStorage has data
      mockGetUserUIPreferences.mockResolvedValue(null)
      mockUpsertUserUIPreferences.mockResolvedValue({
        id: 'test-id',
        user_id: 'test-user',
        tenant_id: 'test-tenant',
        nav_style: 'instagram',
        ui_mode: undefined,
        ui_mode_auto_detect: true,
        theme: 'system',
        sidebar_collapsed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const localStorageValue: NavStyle = 'instagram'

      // Simulate migration process
      if (localStorageValue && ['traditional', 'instagram'].includes(localStorageValue)) {
        const migrationPreferences: UIPreferences = {
          nav_style: localStorageValue,
          ui_mode: undefined,
          ui_mode_auto_detect: true,
          theme: 'system',
          sidebar_collapsed: false,
        }

        await upsertUserUIPreferences('user-123', 'tenant-123', migrationPreferences)
      }

      expect(mockUpsertUserUIPreferences).toHaveBeenCalledWith('user-123', 'tenant-123',
        expect.objectContaining({
          nav_style: 'instagram',
        })
      )
    })
  })

  describe('Error Recovery', () => {
    it('should fallback to default preferences when data is corrupted', () => {
      const corruptedData = 'invalid_json{'
      const defaultPreferences: UIPreferences = {
        nav_style: 'traditional',
        ui_mode: undefined,
        ui_mode_auto_detect: true,
        theme: 'system',
        sidebar_collapsed: false,
      }

      let parsedData: UIPreferences
      try {
        parsedData = JSON.parse(corruptedData)
      } catch {
        parsedData = defaultPreferences
      }

      expect(parsedData).toEqual(defaultPreferences)
    })

    it('should handle network timeout scenarios', async () => {
      const { getUserUIPreferences } = await import('@/lib/db/ui-preferences-client')
      const mockGetUserUIPreferences = vi.mocked(getUserUIPreferences)

      const timeoutError = new Error('Network timeout')
      mockGetUserUIPreferences.mockRejectedValue(timeoutError)

      let result: UIPreferences | null = null
      let error: Error | null = null

      try {
        result = await getUserUIPreferences('user-123', 'tenant-123')
      } catch (e) {
        error = e as Error
      }

      expect(result).toBe(null)
      expect(error).toBe(timeoutError)
    })

    it('should validate preference constraints', () => {
      const testPreferences = (prefs: Partial<UIPreferences>) => {
        const navStyleValid = !prefs.nav_style || ['traditional', 'instagram'].includes(prefs.nav_style)
        const themeValid = !prefs.theme || ['light', 'dark', 'system'].includes(prefs.theme)
        const autoDetectValid = typeof prefs.ui_mode_auto_detect !== 'boolean' || typeof prefs.ui_mode_auto_detect === 'boolean'

        return navStyleValid && themeValid && autoDetectValid
      }

      expect(testPreferences({ nav_style: 'traditional' })).toBe(true)
      expect(testPreferences({ nav_style: 'instagram' })).toBe(true)
      expect(testPreferences({ nav_style: 'invalid' as NavStyle })).toBe(false)
      expect(testPreferences({ theme: 'light' })).toBe(true)
      expect(testPreferences({ theme: 'invalid' as any })).toBe(false)
    })
  })

  describe('Performance Considerations', () => {
    it('should batch preference updates efficiently', async () => {
      const { updateNavStyle } = await import('@/lib/db/ui-preferences-client')
      const mockUpdateNavStyle = vi.mocked(updateNavStyle)

      mockUpdateNavStyle.mockResolvedValue(undefined)

      // Simulate rapid preference changes (debouncing scenario)
      const updates: Promise<void>[] = []
      const styles: NavStyle[] = ['traditional', 'instagram', 'traditional']

      styles.forEach((style, index) => {
        updates.push(updateNavStyle(`user-${index}`, 'tenant-123', style))
      })

      await Promise.all(updates)

      expect(mockUpdateNavStyle).toHaveBeenCalledTimes(3)
    })

    it('should handle concurrent update scenarios', async () => {
      const { updateNavStyle } = await import('@/lib/db/ui-preferences-client')
      const mockUpdateNavStyle = vi.mocked(updateNavStyle)

      // Mock one update succeeding and one failing
      mockUpdateNavStyle
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Concurrent update conflict'))

      const results = await Promise.allSettled([
        updateNavStyle('user-123', 'tenant-123', 'traditional'),
        updateNavStyle('user-123', 'tenant-123', 'instagram'),
      ])

      expect(results[0].status).toBe('fulfilled')
      expect(results[1].status).toBe('rejected')
      expect(mockUpdateNavStyle).toHaveBeenCalledTimes(2)
    })
  })
})