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
  LogOut,
  FileText,
  MessageSquare,
  PenTool,
  Sparkles,
  CloudLightning,
  Monitor
} from 'lucide-react'
import { signOut } from '@/app/[locale]/(dashboard)/actions'
import { useUIMode } from '@/hooks/useUIMode'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
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

interface FieldWorkerNavProps {
  userEmail: string
  userRole?: string
}

const navSections: NavSection[] = [
  {
    label: 'SELL',
    items: [
      { href: '/storm-targeting', label: 'Lead Gen', icon: Zap },
      { href: '/knocks', label: 'Knock', icon: Map },
      { href: '/storm-tracking', label: 'Storm Intel', icon: CloudLightning },
      { href: '/projects', label: 'Pipeline', icon: Workflow },
    ]
  },
  {
    label: 'CORE',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/insights', label: 'Business Intelligence', icon: Sparkles },
      { href: '/tasks', label: 'Tasks', icon: CheckSquare },
      { href: '/claims', label: 'Claims', icon: FileText },
      { href: '/incentives', label: 'Incentives', icon: Trophy },
      { href: '/events', label: 'Events', icon: Calendar },
    ]
  },
  {
    label: 'COMMUNICATIONS',
    items: [
      { href: '/messages', label: 'Messages', icon: MessageSquare },
      { href: '/call-logs', label: 'Call Logs', icon: Phone },
      { href: '/signatures', label: 'Signatures', icon: PenTool },
    ]
  },
  {
    label: 'SETTINGS',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings },
    ]
  },
]

export function FieldWorkerNav({ userEmail, userRole = 'user' }: FieldWorkerNavProps) {
  const [selectedUser, setSelectedUser] = useState<UserForImpersonation | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const pathname = usePathname()
  const { setMode } = useUIMode()

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

  const handleSwitchToFullView = () => {
    setMode('full', true)
    setIsDrawerOpen(false)
  }

  return (
    <>
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
                className="p-2 hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Open navigation menu"
              >
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>

            <SheetContent side="left" className="w-80 p-0">
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
                <nav className="flex-1 overflow-y-auto py-4 px-3 bg-gradient-to-b from-sidebar to-slate">
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
                      <div className="space-y-1 mb-4">
                        {section.items.map((link) => {
                          const Icon = link.icon
                          const active = isActive(link.href)

                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setIsDrawerOpen(false)}
                              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                                active
                                  ? 'bg-primary text-white shadow-lg shadow-primary/50'
                                  : 'text-sidebar-foreground/80 hover:bg-sidebar/80 hover:text-white'
                              }`}
                              aria-current={active ? 'page' : undefined}
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

                  {/* Switch to Full View */}
                  <button
                    onClick={handleSwitchToFullView}
                    className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar/80 hover:text-sidebar-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label="Switch to full view"
                  >
                    <Monitor className="h-4 w-4" aria-hidden="true" />
                    <span className="text-sm font-medium">Switch to Full View</span>
                  </button>

                  {/* Sign Out */}
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