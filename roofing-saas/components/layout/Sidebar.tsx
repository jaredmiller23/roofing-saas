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
  Megaphone,
  FileText,
  MessageSquare
} from 'lucide-react'
import { signOut } from '@/app/(dashboard)/actions'
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

const navSections: NavSection[] = [
  {
    label: 'CORE',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/projects', label: 'Pipeline', icon: Workflow },
      { href: '/messages', label: 'Messages', icon: MessageSquare },
      { href: '/claims', label: 'Claims', icon: FileText },
      { href: '/call-logs', label: 'Call Logs', icon: Phone },
      { href: '/tasks', label: 'Tasks', icon: CheckSquare },
      { href: '/territories', label: 'Field Activity', icon: Map },
    ]
  },
  {
    label: 'GROWTH',
    items: [
      { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
      { href: '/storm-targeting', label: 'Lead Gen', icon: Zap },
    ]
  },
  {
    label: 'TEAM',
    items: [
      { href: '/incentives', label: 'Incentives', icon: Trophy },
      { href: '/events', label: 'Events', icon: Calendar },
    ]
  },
  {
    // No label for system section - just divider
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
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        aria-label="Toggle menu"
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
        className={`fixed top-0 left-0 h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-white w-64 flex flex-col z-40 transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <Link href="/dashboard" className="block">
            <h1 className="text-4xl font-bold text-white" style={{ fontFamily: "'Pacifico', cursive" }}>
              Clarity
            </h1>
            <p className="text-xs text-muted-foreground mt-1 tracking-wide">ROOFING CRM</p>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
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
                      onClick={() => setIsMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        active
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/50'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${active ? 'text-white' : 'text-muted-foreground'}`} />
                      <span className="text-sm font-medium">{link.label}</span>
                    </Link>
                  )
                })}
              </div>

              {/* Divider after each section except last */}
              {sectionIndex < navSections.length - 1 && (
                <div className="border-t border-gray-800 my-2"></div>
              )}
            </div>
          ))}
        </nav>

        {/* User Section */}
        <div className="border-t border-gray-800 p-4 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold text-sm">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{userEmail}</p>
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
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <LogOut className="h-4 w-4" />
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
