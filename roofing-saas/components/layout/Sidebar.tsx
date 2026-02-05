'use client'

import { useState } from 'react'
import { Link } from '@/lib/i18n/navigation'
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
  Target,
  Menu,
  X,
  LogOut,
  FileText,
  MessageSquare,
  PenTool,
  Sparkles,
  CloudLightning,
  Users,
  Mail,
  Lock,
  Voicemail,
  BookOpen,
  Bot,
} from 'lucide-react'
import { signOut } from '@/app/[locale]/(dashboard)/actions'
import { UserPicker, ConfirmImpersonationDialog } from '@/components/impersonation'
import { apiFetch } from '@/lib/api/client'
import { toast } from 'sonner'
import type { UserForImpersonation } from '@/lib/impersonation/types'
import { useFeatureAccess } from '@/lib/billing/hooks'
import type { PlanFeatures } from '@/lib/billing/types'

interface NavLink {
  href: string
  label: string
  icon: React.ElementType
  /** Feature required to access this nav item */
  feature?: keyof PlanFeatures
}

interface NavSection {
  label?: string
  items: NavLink[]
}

interface SidebarProps {
  userEmail: string
  userRole?: string
}

// Navigation structure reorganized for workflow clarity
// Core workflow items first, then sales tools, then communications
const navSections: NavSection[] = [
  {
    label: 'CORE',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/contacts', label: 'Contacts', icon: Users },
      { href: '/projects', label: 'Pipeline', icon: Workflow },
      { href: '/signatures', label: 'Signatures', icon: PenTool },
      { href: '/tasks', label: 'Tasks', icon: CheckSquare },
      { href: '/events', label: 'Events', icon: Calendar },
    ]
  },
  {
    label: 'SELL',
    items: [
      { href: '/knocks', label: 'Knock', icon: Map },
      { href: '/storm-targeting', label: 'Lead Gen', icon: Target, feature: 'stormData' },
      { href: '/storm-tracking', label: 'Storm Intel', icon: CloudLightning, feature: 'stormData' },
      { href: '/claims', label: 'Claims', icon: FileText, feature: 'claimsTracking' },
      { href: '/incentives', label: 'Incentives', icon: Trophy },
      { href: '/insights', label: 'Insights', icon: Sparkles },
    ]
  },
  {
    label: 'COMMUNICATIONS',
    items: [
      { href: '/call-logs', label: 'Call Log', icon: Phone },
      { href: '/voicemail', label: 'Voicemail', icon: Voicemail },
      { href: '/messages', label: 'Messages', icon: MessageSquare },
      { href: '/campaigns', label: 'Campaigns', icon: Mail, feature: 'campaigns' },
    ]
  },
  {
    label: 'AI',
    items: [
      { href: '/aria/knowledge', label: 'Knowledge Base', icon: BookOpen },
      { href: '/aria/approvals', label: 'Approvals', icon: Bot },
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
  const { features, isLoading: featuresLoading } = useFeatureAccess()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const isAdmin = userRole === 'admin'

  /**
   * Check if a nav item should be accessible based on feature requirements
   */
  const hasFeatureAccess = (feature: keyof PlanFeatures | undefined): boolean => {
    // No feature requirement = always accessible
    if (!feature) return true
    // While loading features, show all items (don't hide during load)
    if (featuresLoading) return true
    return features[feature]
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
      toast.error('Failed to start impersonation. Please try again.')
    }
  }

  return (
    <>
      {/* Mobile Menu Button - Only shown when sidebar is closed */}
      {!isMobileOpen && (
        <button
          onClick={() => setIsMobileOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-50 mt-safe-top ml-safe-left p-2 bg-sidebar text-sidebar-foreground rounded-lg shadow-lg hover:bg-sidebar/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Open menu"
          aria-expanded={false}
          aria-controls="sidebar-navigation"
          data-sidebar-mobile-trigger
        >
          <Menu className="h-6 w-6" />
        </button>
      )}

      {/* Mobile Backdrop - More opaque to prevent text bleed-through */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/80 z-30 backdrop-blur-sm"
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
        {/* Logo with mobile close button */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="block">
              <h1 className="text-4xl font-bold text-sidebar-foreground" style={{ fontFamily: "'Pacifico', cursive" }}>
                Job Clarity
              </h1>
            </Link>
            {/* Mobile close button - inside header to avoid overlap */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-2 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar/80 rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
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
                  const hasAccess = hasFeatureAccess(link.feature)

                  // For items without access, show locked state
                  if (!hasAccess) {
                    return (
                      <Link
                        key={link.href}
                        href="/settings?tab=billing"
                        onClick={() => setIsMobileOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sidebar-foreground/40 hover:text-sidebar-foreground/60 hover:bg-sidebar/40"
                        title={`Upgrade to Professional to access ${link.label}`}
                        role="listitem"
                      >
                        <Icon className="h-5 w-5 text-sidebar-foreground/40" aria-hidden="true" />
                        <span className="text-sm font-medium flex-1">{link.label}</span>
                        <Lock className="h-4 w-4 text-sidebar-foreground/40" aria-hidden="true" />
                      </Link>
                    )
                  }

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
              className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg text-sidebar-foreground/80 hover:bg-sidebar/80 hover:text-sidebar-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
