'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  DoorOpen,
  Workflow,
  CheckSquare,
  Users,
  Phone,
  Settings,
  Trophy,
  Building2,
  FileText,
  Briefcase,
  Calendar,
  ClipboardList,
  Map,
  CloudLightning,
  ListChecks,
  Menu,
  X,
  LogOut
} from 'lucide-react'
import { signOut } from '@/app/(dashboard)/actions'

interface NavLink {
  href: string
  label: string
  icon: React.ElementType
}

interface SidebarProps {
  userEmail: string
}

const navLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/knocks', label: 'Knocks', icon: DoorOpen },
  { href: '/pipeline', label: 'Pipeline', icon: Workflow },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/call-logs', label: 'Call Logs', icon: Phone },
  { href: '/settings', label: 'Settings', icon: Settings },

  // Secondary navigation
  { href: '/incentives', label: 'Incentives', icon: Trophy },
  { href: '/organizations', label: 'Organizations', icon: Building2 },
  { href: '/project-files', label: 'Files', icon: FileText },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/surveys', label: 'Surveys', icon: ClipboardList },
  { href: '/projects', label: 'Projects', icon: Workflow },
  { href: '/territories', label: 'Territories', icon: Map },
  { href: '/storm-targeting', label: 'Storm Targeting', icon: CloudLightning },
  { href: '/storm-targeting/leads', label: 'Storm Leads', icon: ListChecks },
]

export function Sidebar({ userEmail }: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => pathname === href

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
            <p className="text-xs text-gray-400 mt-1 tracking-wide">ROOFING CRM</p>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navLinks.map((link) => {
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
                <Icon className={`h-5 w-5 ${active ? 'text-white' : 'text-gray-400'}`} />
                <span className="text-sm font-medium">{link.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Section */}
        <div className="border-t border-gray-800 p-4">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold text-sm">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{userEmail}</p>
              <p className="text-xs text-gray-400">Admin</p>
            </div>
          </div>

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
    </>
  )
}
