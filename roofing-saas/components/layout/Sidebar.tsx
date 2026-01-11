'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Workflow,
  CheckSquare,
  Phone,
  Settings,
  Trophy,
  Calendar,
  Map,
  Zap,
  Menu,
  X,
  LogOut,
  FileText,
  MessageSquare,
  PenTool,
  Sparkles,
  CloudLightning,
  Users,
  Mail
} from 'lucide-react'
import { signOut } from '@/app/[locale]/(dashboard)/actions'
import { UserPicker, ConfirmImpersonationDialog } from '@/components/impersonation'
import type { UserForImpersonation } from '@/lib/impersonation/types'

interface NavLink {
  href: string
  label: string
  icon: React.ElementType
}

interface NavSection {
  label?: string
  items: NavLink[]
}

interface SidebarProps {
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

export function Sidebar({ userEmail, userRole = 'user' }: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserForImpersonation | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => pathname === href
  const isAdmin = userRole === 'admin'

  const handleUserSelect = (user: UserForImpersonation) => {
    setSelectedUser(user)
    setIsDialogOpen(true)
  }

  const handleStartImpersonation = async (userId: string, reason?: string) => {
    try {
      const response = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, reason }),
      })

      if (response.ok) {
        // Reload page to start impersonation session
        window.location.reload()
      } else {
        const data = await response.json()
        alert(`Failed to start impersonation: ${data.error}`)
      }
    } catch (error) {
      console.error('Error starting impersonation:', error)
      alert('Failed to start impersonation. Please try again.')
    }
  }

  return (
    <>
      {/* Mobile Menu Button - hidden when ig-nav-active via CSS */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 mt-safe-top ml-safe-left p-2 bg-sidebar text-sidebar-foreground rounded-lg hover:bg-sidebar/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={isMobileOpen ? "Close menu" : "Open menu"}
        aria-expanded={isMobileOpen}
        aria-controls="sidebar-navigation"
        data-sidebar-mobile-trigger
      >
        {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar-navigation"
        className={`sidebar-navigation fixed top-0 left-0 h-screen bg-gradient-to-b from-sidebar to-slate text-sidebar-foreground w-64 flex flex-col z-40 transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <Link href="/dashboard" className="block">
            <h1 className="text-4xl font-bold text-sidebar-foreground" style={{ fontFamily: "'Pacifico', cursive" }}>
              Job Clarity
            </h1>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3" role="list">
          {navSections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {/* Section Header */}
              {section.label && (
                <div className="px-4 pt-4 pb-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.label}
                  </h3>
                </div>
              )}

              {/* Section Items */}
              <div className="space-y-1 mb-4" role="list">
                {section.items.map((link) => {
                  const Icon = link.icon
                  const active = isActive(link.href)

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        active
                          ? 'bg-primary text-white shadow-lg shadow-primary/50'
                          : 'text-sidebar-foreground/80 hover:bg-sidebar/80 hover:text-white'
                      }`}
                      aria-current={active ? 'page' : undefined}
                      role="listitem"
                    >
                      <Icon className={`h-5 w-5 ${active ? 'text-white' : 'text-muted-foreground'}`} aria-hidden="true" />
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

        {/* User Section */}
        <div className="border-t border-sidebar-border p-4 space-y-2">
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

          <form action={signOut} className="w-full">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar/80 hover:text-sidebar-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Sign out of your account"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </form>
        </div>
      </aside>

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
