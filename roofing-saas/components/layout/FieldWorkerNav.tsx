'use client'

/**
 * FieldWorkerNav Component
 *
 * Mobile-first navigation with hamburger menu for field workers.
 * Replaces the full sidebar with a compact top bar and slide-out drawer.
 *
 * P2.5 Polish: Added smooth transitions, staggered nav item animations,
 * enhanced touch feedback, and reduced motion support.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Workflow,
  CheckSquare,
  Settings,
  Calendar,
  CalendarClock,
  Map,
  Menu,
  LogOut,
  PenTool,
  Users,
} from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import { signOut } from '@/app/[locale]/(dashboard)/actions'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { UserPicker, ConfirmImpersonationDialog } from '@/components/impersonation'
import type { UserForImpersonation } from '@/lib/impersonation/types'
import { cn } from '@/lib/utils'

interface NavLink {
  href: string
  label: string
  icon: React.ElementType
}

interface NavSection {
  label?: string
  items: NavLink[]
}

interface FieldWorkerNavProps {
  userEmail: string
  userRole?: string
}

// Simplified navigation for field workers (8 essential items)
// Field workers need: today, knock, contacts, pipeline, signatures, tasks, events, settings
const navSections: NavSection[] = [
  {
    // No section label - flat list for simplicity
    items: [
      { href: '/field/today', label: 'Today', icon: CalendarClock },
      { href: '/knocks', label: 'Knock', icon: Map },
      { href: '/contacts', label: 'Contacts', icon: Users },
      { href: '/projects', label: 'Pipeline', icon: Workflow },
      { href: '/signatures', label: 'Signatures', icon: PenTool },
      { href: '/tasks', label: 'Tasks', icon: CheckSquare },
      { href: '/events', label: 'Events', icon: Calendar },
      { href: '/settings', label: 'Settings', icon: Settings },
    ]
  },
]

export function FieldWorkerNav({ userEmail, userRole = 'user' }: FieldWorkerNavProps) {
  const [selectedUser, setSelectedUser] = useState<UserForImpersonation | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [navItemsVisible, setNavItemsVisible] = useState(false)
  const pathname = usePathname()

  // Check for reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)

    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // Animate nav items when drawer opens
  useEffect(() => {
    if (isDrawerOpen) {
      const timer = setTimeout(() => setNavItemsVisible(true), 100)
      return () => clearTimeout(timer)
    } else {
      setNavItemsVisible(false)
    }
  }, [isDrawerOpen])

  const isActive = (href: string) => pathname === href
  const isAdmin = userRole === 'admin'

  // Calculate stagger delay for nav items
  const getNavItemDelay = (sectionIndex: number, itemIndex: number) => {
    if (prefersReducedMotion) return '0ms'
    const totalIndex = navSections.slice(0, sectionIndex).reduce((acc, s) => acc + s.items.length, 0) + itemIndex
    return `${totalIndex * 30}ms`
  }

  const handleUserSelect = (user: UserForImpersonation) => {
    setSelectedUser(user)
    setIsDialogOpen(true)
  }

  const handleStartImpersonation = async (userId: string, reason?: string) => {
    try {
      await apiFetch('/api/admin/impersonate', {
        method: 'POST',
        body: { user_id: userId, reason },
      })
      // Reload page to start impersonation session
      window.location.reload()
    } catch (error) {
      console.error('Error starting impersonation:', error)
      alert('Failed to start impersonation. Please try again.')
    }
  }

  return (
    <>
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-safe-top">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center">
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Pacifico', cursive" }}>
              Job Clarity
            </h1>
          </Link>

          {/* Hamburger Menu */}
          <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "p-2 rounded-lg transition-all duration-200",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  !prefersReducedMotion && "active:scale-95"
                )}
                aria-label="Open navigation menu"
                aria-expanded={isDrawerOpen}
                aria-controls="field-nav-drawer"
              >
                <Menu className={cn(
                  "h-6 w-6 transition-transform duration-200",
                  isDrawerOpen && !prefersReducedMotion && "rotate-90"
                )} />
              </button>
            </SheetTrigger>

            <SheetContent side="left" className="w-80 p-0" id="field-nav-drawer">
              <div className="flex flex-col h-full">
                {/* Header */}
                <SheetHeader className="border-b bg-gradient-to-b from-sidebar to-slate text-sidebar-foreground p-6">
                  <SheetTitle className="text-left">
                    <h1 className="text-3xl font-bold" style={{ fontFamily: "'Pacifico', cursive" }}>
                      Job Clarity
                    </h1>
                  </SheetTitle>
                </SheetHeader>

                {/* Navigation */}
                <nav
                  className="flex-1 overflow-y-auto py-4 px-3 bg-gradient-to-b from-sidebar to-slate"
                  aria-label="Main navigation"
                >
                  {navSections.map((section, sectionIndex) => (
                    <div key={sectionIndex} role="group" aria-labelledby={section.label ? `nav-section-${sectionIndex}` : undefined}>
                      {/* Section Header */}
                      {section.label && (
                        <div className="px-4 pt-4 pb-2">
                          <h3
                            id={`nav-section-${sectionIndex}`}
                            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                          >
                            {section.label}
                          </h3>
                        </div>
                      )}

                      {/* Section Items */}
                      <div className="space-y-1 mb-4">
                        {section.items.map((link, itemIndex) => {
                          const Icon = link.icon
                          const active = isActive(link.href)

                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setIsDrawerOpen(false)}
                              style={{
                                transitionDelay: navItemsVisible ? '0ms' : getNavItemDelay(sectionIndex, itemIndex),
                              }}
                              className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg",
                                "transition-all duration-200 ease-out",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                // Entry animation
                                navItemsVisible || prefersReducedMotion
                                  ? 'opacity-100 translate-x-0'
                                  : 'opacity-0 -translate-x-2',
                                // Active/hover states
                                active
                                  ? 'bg-primary text-white shadow-lg shadow-primary/50'
                                  : 'text-sidebar-foreground/80 hover:bg-sidebar/80 hover:text-white',
                                // Touch feedback
                                !prefersReducedMotion && 'active:scale-[0.98]'
                              )}
                              aria-current={active ? 'page' : undefined}
                            >
                              <Icon
                                className={cn(
                                  "h-5 w-5 transition-transform duration-150",
                                  active ? 'text-white' : 'text-muted-foreground',
                                  !prefersReducedMotion && 'group-hover:scale-110'
                                )}
                                aria-hidden="true"
                              />
                              <span className="text-sm font-medium">{link.label}</span>
                            </Link>
                          )
                        })}
                      </div>

                      {/* Divider after each section except last */}
                      {sectionIndex < navSections.length - 1 && (
                        <div className="border-t border-sidebar-border my-2"></div>
                      )}
                    </div>
                  ))}
                </nav>

                {/* User Section & Controls */}
                <div className="border-t bg-gradient-to-b from-sidebar to-slate text-sidebar-foreground p-4 space-y-3">
                  {/* User Info */}
                  <div className="flex items-center gap-3 px-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                      {userEmail.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-sidebar-foreground truncate">{userEmail}</p>
                      <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
                    </div>
                  </div>

                  {/* Admin-only: Impersonate User */}
                  {isAdmin && (
                    <div className="px-2">
                      <UserPicker onUserSelect={handleUserSelect} />
                    </div>
                  )}

                  {/* Sign Out */}
                  <form action={signOut} className="w-full">
                    <button
                      type="submit"
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2 rounded-lg",
                        "text-sidebar-foreground/80 hover:bg-sidebar/80 hover:text-sidebar-foreground",
                        "transition-all duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        !prefersReducedMotion && "active:scale-[0.98]"
                      )}
                      aria-label="Sign out of your account"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      <span className="text-sm font-medium">Sign Out</span>
                    </button>
                  </form>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Impersonation Confirmation Dialog */}
      <ConfirmImpersonationDialog
        user={selectedUser}
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false)
          setSelectedUser(null)
        }}
        onConfirm={handleStartImpersonation}
      />
    </>
  )
}