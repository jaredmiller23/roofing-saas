'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { signOut } from '@/app/(dashboard)/actions'

interface NavLink {
  href: string
  label: string
}

interface DashboardNavProps {
  userEmail: string
}

const navLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/contacts', label: 'Contacts' },
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/organizations', label: 'Organizations' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/project-files', label: 'Files' },
  { href: '/call-logs', label: 'Call Logs' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/events', label: 'Events' },
  { href: '/surveys', label: 'Surveys' },
  { href: '/projects', label: 'Projects' },
  { href: '/territories', label: 'Territories' },
  { href: '/settings', label: 'Settings' },
]

export function DashboardNav({ userEmail }: DashboardNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => pathname === href

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden lg:flex lg:items-center lg:space-x-8">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm font-medium whitespace-nowrap transition-colors ${
              isActive(link.href)
                ? 'text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Mobile/Tablet Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        aria-label="Toggle navigation menu"
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Mobile Menu Panel */}
          <div className="fixed top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50 lg:hidden">
            <div className="max-h-[calc(100vh-4rem)] overflow-y-auto">
              <div className="px-4 py-2 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      isActive(link.href)
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}

                {/* User Info & Sign Out in Mobile Menu */}
                <div className="border-t border-gray-200 mt-2 pt-2">
                  <div className="px-3 py-2">
                    <p className="text-sm text-gray-600">{userEmail}</p>
                  </div>
                  <form action={signOut} className="w-full">
                    <button
                      type="submit"
                      className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Desktop User Menu */}
      <div className="hidden lg:flex lg:items-center lg:space-x-4 lg:flex-shrink-0">
        <span className="text-sm text-gray-600 whitespace-nowrap">{userEmail}</span>
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </>
  )
}
