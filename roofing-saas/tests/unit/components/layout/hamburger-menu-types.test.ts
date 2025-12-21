/**
 * Unit tests for HamburgerMenu component types and interfaces
 */

import { describe, it, expect } from 'vitest'
import type { HamburgerMenuProps } from '@/components/layout/HamburgerMenu'
import type { FieldWorkerTopBarIGProps } from '@/components/layout/types'

describe('HamburgerMenu Types', () => {
  describe('HamburgerMenuProps Interface', () => {
    it('should accept all valid props', () => {
      const validProps: HamburgerMenuProps = {
        className: 'custom-class',
        isOpen: false,
        onClick: () => {},
        ariaLabel: 'Toggle menu',
        size: 'md',
        variant: 'ghost',
      }

      expect(validProps.className).toBe('custom-class')
      expect(validProps.isOpen).toBe(false)
      expect(typeof validProps.onClick).toBe('function')
      expect(validProps.ariaLabel).toBe('Toggle menu')
      expect(validProps.size).toBe('md')
      expect(validProps.variant).toBe('ghost')
    })

    it('should allow optional props to be undefined', () => {
      const minimalProps: HamburgerMenuProps = {}
      expect(minimalProps.className).toBeUndefined()
      expect(minimalProps.isOpen).toBeUndefined()
      expect(minimalProps.onClick).toBeUndefined()
    })

    it('should accept valid size variants', () => {
      const sizes: Array<HamburgerMenuProps['size']> = ['sm', 'md', 'lg']
      sizes.forEach(size => {
        const props: HamburgerMenuProps = { size }
        expect(['sm', 'md', 'lg']).toContain(props.size)
      })
    })

    it('should accept valid button variants', () => {
      const variants: Array<HamburgerMenuProps['variant']> = ['ghost', 'outline', 'secondary']
      variants.forEach(variant => {
        const props: HamburgerMenuProps = { variant }
        expect(['ghost', 'outline', 'secondary']).toContain(props.variant)
      })
    })
  })
})

describe('FieldWorkerTopBarIG Types', () => {
  describe('FieldWorkerTopBarIGProps Interface', () => {
    it('should include hamburger menu props', () => {
      const propsWithMenu: FieldWorkerTopBarIGProps = {
        showHamburgerMenu: true,
        isMenuOpen: false,
        onMenuClick: () => {},
      }

      expect(propsWithMenu.showHamburgerMenu).toBe(true)
      expect(propsWithMenu.isMenuOpen).toBe(false)
      expect(typeof propsWithMenu.onMenuClick).toBe('function')
    })

    it('should work with all original props plus hamburger menu', () => {
      const fullProps: FieldWorkerTopBarIGProps = {
        className: 'test-class',
        notificationCount: 5,
        showNotificationBadge: true,
        stories: [],
        showStories: false,
        showHamburgerMenu: true,
        isMenuOpen: false,
        onNotificationClick: () => {},
        onSettingsClick: () => {},
        onStoryClick: () => {},
        onMenuClick: () => {},
      }

      // Verify all props are accessible
      expect(fullProps.showHamburgerMenu).toBe(true)
      expect(fullProps.isMenuOpen).toBe(false)
      expect(typeof fullProps.onMenuClick).toBe('function')
      expect(fullProps.notificationCount).toBe(5)
    })
  })
})

describe('Component Integration', () => {
  describe('Props Compatibility', () => {
    it('should allow hamburger menu props to be passed through', () => {
      // Test that the props from FieldWorkerTopBarIG can be mapped to HamburgerMenu
      const topBarProps: FieldWorkerTopBarIGProps = {
        showHamburgerMenu: true,
        isMenuOpen: true,
        onMenuClick: () => 'clicked',
      }

      // These props should be compatible with HamburgerMenu
      const hamburgerProps: HamburgerMenuProps = {
        isOpen: topBarProps.isMenuOpen,
        onClick: topBarProps.onMenuClick,
      }

      expect(hamburgerProps.isOpen).toBe(true)
      expect(hamburgerProps.onClick?.()).toBe('clicked')
    })

    it('should handle undefined callback functions gracefully', () => {
      const propsWithoutCallbacks: FieldWorkerTopBarIGProps = {
        showHamburgerMenu: true,
        onMenuClick: undefined,
      }

      // Should not throw when accessing undefined callbacks
      expect(() => {
        const callback = propsWithoutCallbacks.onMenuClick
        if (callback) callback()
      }).not.toThrow()
    })
  })
})