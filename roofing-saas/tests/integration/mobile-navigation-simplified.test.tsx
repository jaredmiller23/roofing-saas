/**
 * Mobile Navigation Simplified Integration Tests
 *
 * Core integration tests for mobile navigation components
 * with proper TypeScript types and minimal complexity.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mobile navigation components
import { FieldWorkerBottomNav } from '@/components/layout/FieldWorkerBottomNav'
import { FieldWorkerNav } from '@/components/layout/FieldWorkerNav'
import { HamburgerMenu } from '@/components/layout/HamburgerMenu'
import { MobileSearchBar } from '@/components/layout/MobileSearchBar'
import { usePermissions } from '@/hooks/usePermissions'

// Mock dependencies
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  })),
}))

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({
    canView: vi.fn(() => true),
    canEdit: vi.fn(() => true),
    canDelete: vi.fn(() => true),
  })),
}))

vi.mock('@/hooks/useUIMode', () => ({
  useUIMode: vi.fn(() => ({
    mode: 'field',
    setMode: vi.fn(),
  })),
}))

vi.mock('@/components/voice/VoiceSession', () => ({
  VoiceSession: ({ onSessionEnd }: { onSessionEnd?: () => void }) => (
    <div data-testid="voice-session">
      <p>Voice Session Active</p>
      <button onClick={onSessionEnd}>End Session</button>
    </div>
  ),
}))

vi.mock('@/components/impersonation', () => ({
  UserPicker: ({ onUserSelect }: {
    onUserSelect?: (user: { id: string; email: string }) => void
  }) => (
    <button
      data-testid="user-picker"
      onClick={() => onUserSelect?.({ id: 'test-user', email: 'test@example.com' })}
    >
      Pick User
    </button>
  ),
  ConfirmImpersonationDialog: ({ isOpen }: { isOpen?: boolean }) =>
    isOpen ? <div data-testid="impersonation-dialog">Dialog Open</div> : null,
}))

vi.mock('@/app/[locale]/(dashboard)/actions', () => ({
  signOut: vi.fn(),
}))

describe('Mobile Navigation Simplified Integration', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn(),
      writable: true,
    })
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    cleanup()
  })

  describe('FieldWorkerBottomNav Core Functionality', () => {
    it('should render bottom navigation with all required elements', () => {
      render(<FieldWorkerBottomNav />)

      expect(screen.getByRole('navigation', { name: /bottom navigation/i })).toBeInTheDocument()
      expect(screen.getByTestId('voice-assistant-button')).toBeInTheDocument()
      // Updated: Now uses business workflow tabs instead of social-style tabs
      expect(screen.getByTestId('nav-tab-pipeline')).toBeInTheDocument()
      expect(screen.getByTestId('nav-tab-signatures')).toBeInTheDocument()
    })

    it('should open voice session modal when voice button is clicked', async () => {
      render(<FieldWorkerBottomNav />)

      await user.click(screen.getByTestId('voice-assistant-button'))

      await waitFor(() => {
        expect(screen.getByTestId('voice-session')).toBeInTheDocument()
      })
    })

    it('should provide haptic feedback on interactions', async () => {
      const vibrateFn = vi.fn()
      Object.defineProperty(navigator, 'vibrate', { value: vibrateFn })

      render(<FieldWorkerBottomNav />)

      await user.click(screen.getByTestId('voice-assistant-button'))
      expect(vibrateFn).toHaveBeenCalled()
    })
  })

  describe('FieldWorkerNav Hamburger Menu', () => {
    const defaultProps = {
      userEmail: 'test@example.com',
      userRole: 'user' as const,
    }

    it('should render header with hamburger menu', () => {
      render(<FieldWorkerNav {...defaultProps} />)

      expect(screen.getByRole('banner')).toBeInTheDocument()
      expect(screen.getByText('Job Clarity')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /open navigation menu/i })).toBeInTheDocument()
    })

    it('should open navigation drawer when hamburger is clicked', async () => {
      render(<FieldWorkerNav {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /open navigation menu/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('should display user information in drawer', async () => {
      render(<FieldWorkerNav {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /open navigation menu/i }))

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
        expect(screen.getByText('user')).toBeInTheDocument()
      })
    })
  })

  describe('HamburgerMenu Component', () => {
    it('should render with default props', () => {
      render(<HamburgerMenu />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should handle click events', async () => {
      const handleClick = vi.fn()
      render(<HamburgerMenu onClick={handleClick} />)

      await user.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should update aria-expanded based on isOpen prop', () => {
      const { rerender } = render(<HamburgerMenu isOpen={false} />)
      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')

      rerender(<HamburgerMenu isOpen={true} />)
      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('MobileSearchBar Component', () => {
    it('should expand when search icon is clicked', async () => {
      render(<MobileSearchBar />)

      expect(screen.getByLabelText(/open search/i)).toBeInTheDocument()

      await user.click(screen.getByLabelText(/open search/i))

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })
    })

    it('should handle text input and submission', async () => {
      const handleSearch = vi.fn()
      render(<MobileSearchBar onSearch={handleSearch} isExpanded={true} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'test query')
      await user.keyboard('{Enter}')

      expect(handleSearch).toHaveBeenCalledWith('test query')
    })

    it('should clear input when clear button is clicked', async () => {
      const handleQueryChange = vi.fn()
      render(
        <MobileSearchBar
          isExpanded={true}
          value="test"
          onQueryChange={handleQueryChange}
        />
      )

      const clearButton = screen.getByLabelText(/clear search/i)
      await user.click(clearButton)

      expect(handleQueryChange).toHaveBeenCalledWith('')
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle multiple components working together', async () => {
      render(
        <div>
          <FieldWorkerNav userEmail="test@example.com" />
          <FieldWorkerBottomNav />
        </div>
      )

      // Both navigation systems should be present
      expect(screen.getByRole('banner')).toBeInTheDocument()
      expect(screen.getByRole('navigation', { name: /bottom navigation/i })).toBeInTheDocument()

      // Test hamburger menu opens
      await user.click(screen.getByRole('button', { name: /open navigation menu/i }))
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('should handle voice assistant interaction', async () => {
      render(<FieldWorkerBottomNav />)

      // Voice button should be interactive
      await user.click(screen.getByTestId('voice-assistant-button'))

      await waitFor(() => {
        expect(screen.getByTestId('voice-session')).toBeInTheDocument()
      })
    })

    it('should handle responsive design classes', () => {
      render(
        <div>
          <FieldWorkerNav userEmail="test@example.com" />
          <FieldWorkerBottomNav />
        </div>
      )

      const header = screen.getByRole('banner')
      const bottomNav = screen.getByRole('navigation')

      // Check for mobile-first CSS classes
      expect(header).toHaveClass('sticky', 'top-0')
      expect(bottomNav).toHaveClass('fixed', 'bottom-0')
    })
  })

  describe('Accessibility Features', () => {
    it('should provide proper ARIA labels', () => {
      render(<FieldWorkerBottomNav />)

      const voiceButton = screen.getByTestId('voice-assistant-button')
      expect(voiceButton).toHaveAttribute('aria-label')

      // Updated: Now uses business workflow tabs
      const pipelineTab = screen.getByTestId('nav-tab-pipeline')
      expect(pipelineTab).toHaveAttribute('aria-label')
    })

    it('should support keyboard navigation', async () => {
      render(<FieldWorkerBottomNav />)

      const voiceButton = screen.getByTestId('voice-assistant-button')
      voiceButton.focus()

      expect(voiceButton).toHaveFocus()

      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByTestId('voice-session')).toBeInTheDocument()
      })
    })

    it('should disable voice button when voice_assistant permission is denied', () => {
      // Override usePermissions mock to deny voice_assistant access.
      // vi.mocked() works because the top-level vi.mock wraps usePermissions
      // with vi.fn(), allowing per-test return value overrides.
      vi.mocked(usePermissions).mockReturnValue({
        permissions: null,
        loading: false,
        error: null,
        can: vi.fn(() => true),
        canView: vi.fn((module: string) => module !== 'voice_assistant'),
        canCreate: vi.fn(() => true),
        canEdit: vi.fn(() => true),
        canDelete: vi.fn(() => true),
        canAny: vi.fn(() => true),
        canAll: vi.fn(() => true),
        isAdmin: false,
        isOwner: false,
        refresh: vi.fn(),
      })

      render(<FieldWorkerBottomNav />)

      const voiceButton = screen.getByTestId('voice-assistant-button')
      expect(voiceButton).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    it('should render without throwing when browser APIs vary', () => {
      // Verify component renders regardless of browser API state
      // Note: jsdom navigator.vibrate is non-configurable, so we can't
      // fully simulate missing APIs, but we verify graceful rendering
      expect(() => render(<FieldWorkerBottomNav />)).not.toThrow()

      const voiceButton = screen.getByTestId('voice-assistant-button')
      expect(voiceButton).toBeInTheDocument()
    })

    it('should handle component unmounting during interaction', async () => {
      const { unmount } = render(<FieldWorkerBottomNav />)

      await user.click(screen.getByTestId('voice-assistant-button'))

      // Unmount while interaction is happening
      unmount()

      // Should not cause errors
      expect(() => render(<FieldWorkerBottomNav />)).not.toThrow()
    })

    it('should validate props gracefully', () => {
      const invalidProps = {
        userEmail: '',
        userRole: undefined as unknown as 'user',
      }

      expect(() => render(<FieldWorkerNav {...invalidProps} />)).not.toThrow()
      expect(screen.getByText('Job Clarity')).toBeInTheDocument()
    })
  })
})