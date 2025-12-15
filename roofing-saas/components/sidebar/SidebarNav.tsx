'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

interface SidebarNavProps {
  items: NavItem[]
  onItemClick?: () => void
  className?: string
}

export function SidebarNav({ items, onItemClick, className }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav className={cn('space-y-1', className)} role="navigation" aria-label="Sidebar navigation">
      {items.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isActive
                ? 'bg-primary text-white shadow-lg shadow-primary/50'
                : 'text-sidebar-foreground/80 hover:bg-sidebar/80 hover:text-white'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon
              className={cn(
                'h-5 w-5',
                isActive ? 'text-white' : 'text-muted-foreground'
              )}
              aria-hidden="true"
            />
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
