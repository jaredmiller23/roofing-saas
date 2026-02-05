'use client'

/**
 * NavigationDrawer Component
 *
 * Instagram-style slide-out navigation drawer for field workers.
 * Opens from the left when hamburger menu is tapped.
 *
 * Features:
 * - Abbreviated quick access menu (Dashboard, Pipeline, Signatures, Knock, Incentives)
 * - "Full Menu" button to expand and show all features
 * - Haptic feedback on interactions
 * - Smooth slide animation
 * - Accessibility support (focus trap, aria labels)
 */

import { useState, useEffect } from 'react'
import { Link } from '@/lib/i18n/navigation'
import { usePathname } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { signOut } from '@/app/[locale]/(dashboard)/actions'
import {
  Home,
  GitBranch,
  PenTool,
  DoorClosed,
  Trophy,
  ChevronDown,
  ChevronUp,
  Users,
  MessageSquare,
  Calendar,
  BarChart3,
  ClipboardList,
  Settings,
  Bell,
  HelpCircle,
  LogOut,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  description?: string
}

interface NavigationDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean
  /** Callback when drawer should close */
  onClose: () => void
  /** Optional CSS class name */
  className?: string
}

// Quick access items (abbreviated menu)
const quickAccessItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, description: 'Home' },
  { href: '/projects', label: 'Pipeline', icon: GitBranch, description: 'View projects' },
  { href: '/signatures', label: 'Signatures', icon: PenTool, description: 'E-signatures' },
  { href: '/knocks', label: 'Knock', icon: DoorClosed, description: 'Door knocking' },
  { href: '/gamification', label: 'Incentives', icon: Trophy, description: 'Rewards & goals' },
]

// Full menu items (expanded view)
const fullMenuItems: NavItem[] = [
  { href: '/contacts', label: 'Contacts', icon: Users, description: 'Customer contacts' },
  { href: '/messages', label: 'Messages', icon: MessageSquare, description: 'Conversations' },
  { href: '/tasks', label: 'Tasks', icon: Calendar, description: 'Calendar & tasks' },
  { href: '/reports', label: 'Reports', icon: BarChart3, description: 'Analytics' },
  { href: '/claims', label: 'Claims', icon: ClipboardList, description: 'Insurance claims' },
]

// Utility items (always shown in expanded)
const utilityItems: NavItem[] = [
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/help', label: 'Help', icon: HelpCircle },
]

export function NavigationDrawer({ isOpen, onClose, className }: NavigationDrawerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const pathname = usePathname()

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)

    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // Reset expanded state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setIsExpanded(false)
    }
  }, [isOpen])

  // Haptic feedback helper
  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }
  }

  // Check if a path is active
  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  // Handle nav item click
  const handleNavClick = () => {
    triggerHaptic()
    onClose()
  }

  // Handle expand/collapse
  const handleExpandToggle = () => {
    triggerHaptic()
    setIsExpanded(!isExpanded)
  }

  // Render a nav item
  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon
    const active = isActive(item.href)

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={handleNavClick}
        className={cn(
          'flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200',
          'hover:bg-muted/50 active:bg-muted',
          !prefersReducedMotion && 'active:scale-[0.98]',
          active && 'bg-primary/10 text-primary',
          !active && 'text-foreground'
        )}
        aria-current={active ? 'page' : undefined}
      >
        <Icon className={cn('h-5 w-5', active && 'text-primary')} />
        <div className="flex flex-col">
          <span className={cn('font-medium', active && 'text-primary')}>
            {item.label}
          </span>
          {item.description && (
            <span className="text-xs text-muted-foreground">{item.description}</span>
          )}
        </div>
      </Link>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="left"
        className={cn(
          'w-[280px] sm:w-[320px] p-0 flex flex-col',
          className
        )}
      >
        {/* Header */}
        <SheetHeader className="p-4 pb-2 border-b border-border/50">
          <SheetTitle className="text-lg font-bold text-foreground">
            Menu
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Quick access to features
          </SheetDescription>
        </SheetHeader>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {/* Quick Access Section */}
          <div className="space-y-1">
            {quickAccessItems.map(renderNavItem)}
          </div>

          {/* Expand/Collapse Button */}
          <div className="pt-3">
            <Button
              variant="ghost"
              onClick={handleExpandToggle}
              className={cn(
                'w-full justify-between px-3 py-3 h-auto',
                'text-muted-foreground hover:text-foreground',
                !prefersReducedMotion && 'active:scale-[0.98]'
              )}
              aria-expanded={isExpanded}
              aria-controls="full-menu-section"
            >
              <span className="font-medium">
                {isExpanded ? 'Show Less' : 'Full Menu'}
              </span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Expanded Menu Section */}
          {isExpanded && (
            <div
              id="full-menu-section"
              className={cn(
                'space-y-1 pt-2',
                !prefersReducedMotion && 'animate-in slide-in-from-top-2 duration-200'
              )}
            >
              <Separator className="my-2" />

              {/* Full Menu Items */}
              {fullMenuItems.map(renderNavItem)}

              <Separator className="my-2" />

              {/* Utility Items */}
              {utilityItems.map(renderNavItem)}

              <Separator className="my-2" />

              {/* Sign Out Button */}
              <form action={signOut} className="w-full">
                <Button
                  type="submit"
                  variant="ghost"
                  onClick={() => triggerHaptic()}
                  className={cn(
                    'w-full justify-start gap-3 px-3 py-3 h-auto',
                    'text-destructive hover:text-destructive hover:bg-destructive/10',
                    !prefersReducedMotion && 'active:scale-[0.98]'
                  )}
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Sign Out</span>
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Footer - App Version (optional) */}
        <div className="p-4 border-t border-border/50 text-center">
          <span className="text-xs text-muted-foreground">
            Job Clarity v1.0
          </span>
        </div>
      </SheetContent>
    </Sheet>
  )
}
