'use client'

/**
 * ManagerLayout Component
 *
 * Middle-ground layout optimized for tablets and managers.
 * Features:
 * - Collapsible sidebar (icon-only by default, expand on hover/click)
 * - Larger touch targets than desktop
 * - Focused navigation for management tasks
 *
 * P3.1 of Adaptive UI System
 */

import { useState, useEffect, ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Workflow,
  CheckSquare,
  MessageSquare,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Monitor,
  Map,
  PenTool,
  FileText,
  Trophy,
  Zap,
  CloudLightning,
  Sparkles,
  Calendar,
  Phone,
  Mail
} from 'lucide-react'
import { signOut } from '@/app/[locale]/(dashboard)/actions'
import { useUIMode } from '@/hooks/useUIMode'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

interface NavSection {
  label?: string
  items: NavItem[]
}

interface ManagerLayoutProps {
  children: ReactNode
  userEmail: string
  userRole?: string
}

// Navigation structure per owner specification
// Source of truth: docs/specs/SIDEBAR_NAVIGATION.md
const navSections: NavSection[] = [
  {
    label: 'SELL',
    items: [
      { href: '/knocks', label: 'Knock', icon: Map },
      { href: '/signatures', label: 'Signatures', icon: PenTool },
      { href: '/claims', label: 'Claims', icon: FileText },
      { href: '/incentives', label: 'Incentives', icon: Trophy },
      { href: '/storm-targeting', label: 'Lead Gen', icon: Zap },
      { href: '/storm-tracking', label: 'Storm Intel', icon: CloudLightning },
    ]
  },
  {
    label: 'CORE',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/projects', label: 'Pipeline', icon: Workflow },
      { href: '/insights', label: 'Business Intel', icon: Sparkles },
      { href: '/events', label: 'Events', icon: Calendar },
      { href: '/tasks', label: 'Tasks', icon: CheckSquare },
    ]
  },
  {
    label: 'COMMUNICATIONS',
    items: [
      { href: '/call-logs', label: 'Call Log', icon: Phone },
      { href: '/messages', label: 'Messages', icon: MessageSquare },
      { href: '/campaigns', label: 'Emails', icon: Mail },
      { href: '/contacts', label: 'Contacts', icon: Users },
    ]
  },
  {
    label: 'SETTINGS',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings },
    ]
  },
]

export function ManagerLayout({ children, userEmail, userRole = 'user' }: ManagerLayoutProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const pathname = usePathname()
  const { setMode } = useUIMode()

  // Check for reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)

    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const isActive = (href: string) => pathname === href || pathname.endsWith(href)

  // Sidebar expands on hover or when pinned
  const shouldExpand = isExpanded || isHovering

  const handleSwitchToFullView = () => {
    setMode('full', true)
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Collapsible Sidebar */}
      <aside
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={cn(
          "fixed top-0 left-0 h-screen bg-gradient-to-b from-sidebar to-slate text-sidebar-foreground",
          "flex flex-col z-40 pt-safe-top",
          "transition-all ease-out",
          prefersReducedMotion ? 'duration-0' : 'duration-200',
          shouldExpand ? 'w-64' : 'w-16'
        )}
        role="navigation"
        aria-label="Manager navigation"
      >
        {/* Header with toggle */}
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          {shouldExpand ? (
            <Link href="/dashboard" className="block">
              <h1 className="text-xl font-bold text-sidebar-foreground" style={{ fontFamily: "'Pacifico', cursive" }}>
                Job Clarity
              </h1>
            </Link>
          ) : (
            <Link href="/dashboard" className="block mx-auto">
              <span className="text-xl font-bold text-sidebar-foreground">JC</span>
            </Link>
          )}

          {/* Pin toggle - only show when expanded */}
          {shouldExpand && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                "hover:bg-sidebar-accent",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
              aria-label={isExpanded ? "Unpin sidebar" : "Pin sidebar open"}
              title={isExpanded ? "Unpin sidebar" : "Pin sidebar open"}
            >
              {isExpanded ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2" role="list">
          {navSections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {/* Section Header - only when expanded */}
              {section.label && shouldExpand && (
                <div className="px-3 pt-3 pb-1">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.label}
                  </h3>
                </div>
              )}

              {/* Section Items */}
              {section.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg transition-all mb-1",
                      // Larger touch targets for tablet
                      "min-h-[44px] px-3",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      active
                        ? 'bg-primary text-white shadow-lg shadow-primary/50'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar/80 hover:text-white',
                      !prefersReducedMotion && 'active:scale-[0.98]',
                      // Center icon when collapsed
                      !shouldExpand && 'justify-center'
                    )}
                    aria-current={active ? 'page' : undefined}
                    title={!shouldExpand ? item.label : undefined}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 flex-shrink-0",
                        active ? 'text-white' : 'text-muted-foreground'
                      )}
                      aria-hidden="true"
                    />
                    {shouldExpand && (
                      <span className="text-sm font-medium whitespace-nowrap">
                        {item.label}
                      </span>
                    )}
                  </Link>
                )
              })}

              {/* Divider after each section except last */}
              {sectionIndex < navSections.length - 1 && shouldExpand && (
                <div className="border-t border-sidebar-border my-2 mx-2"></div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer section */}
        <div className="border-t border-sidebar-border p-2 space-y-1">
          {/* User info - only when expanded */}
          {shouldExpand && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0">
                {userEmail.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{userEmail}</p>
                <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
              </div>
            </div>
          )}

          {/* Switch to Full View */}
          <button
            onClick={handleSwitchToFullView}
            className={cn(
              "flex items-center gap-3 rounded-lg w-full min-h-[44px] px-3",
              "text-sidebar-foreground/80 hover:bg-sidebar/80 hover:text-sidebar-foreground",
              "transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              !prefersReducedMotion && 'active:scale-[0.98]',
              !shouldExpand && 'justify-center'
            )}
            title={!shouldExpand ? "Switch to Full View" : undefined}
            aria-label="Switch to full desktop view"
          >
            <Monitor className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {shouldExpand && (
              <span className="text-sm font-medium">Full View</span>
            )}
          </button>

          {/* Sign Out */}
          <form action={signOut} className="w-full">
            <button
              type="submit"
              className={cn(
                "flex items-center gap-3 rounded-lg w-full min-h-[44px] px-3",
                "text-sidebar-foreground/80 hover:bg-sidebar/80 hover:text-sidebar-foreground",
                "transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !prefersReducedMotion && 'active:scale-[0.98]',
                !shouldExpand && 'justify-center'
              )}
              title={!shouldExpand ? "Sign Out" : undefined}
              aria-label="Sign out of your account"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              {shouldExpand && (
                <span className="text-sm font-medium">Sign Out</span>
              )}
            </button>
          </form>
        </div>
      </aside>

      {/* Main content area */}
      <main
        className={cn(
          "flex-1 transition-all",
          prefersReducedMotion ? 'duration-0' : 'duration-200',
          shouldExpand ? 'ml-64' : 'ml-16'
        )}
      >
        {children}
      </main>
    </div>
  )
}
