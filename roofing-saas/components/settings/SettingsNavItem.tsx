'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export interface SettingsNavItemProps {
  id: string
  label: string
  icon: LucideIcon
  isActive: boolean
  onClick: () => void
  /** If provided, renders as Link instead of button */
  href?: string
  /** Render as list item (full-width with chevron) or sidebar item */
  variant?: 'sidebar' | 'list'
}

export function SettingsNavItem({
  id,
  label,
  icon: Icon,
  isActive,
  onClick,
  href,
  variant = 'sidebar',
}: SettingsNavItemProps) {
  const isList = variant === 'list'

  const className = cn(
    'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors w-full',
    'min-h-[48px]', // Touch-friendly target (48px for mobile)
    isList
      ? 'text-foreground hover:bg-muted'
      : isActive
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  )

  if (href) {
    return (
      <Link href={href} className={className}>
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span className="flex-1">{label}</span>
        {isList && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      data-settings-nav={id}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="flex-1">{label}</span>
      {isList && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </button>
  )
}
