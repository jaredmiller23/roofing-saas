'use client'

import Link from 'next/link'
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
}

export function SettingsNavItem({
  id,
  label,
  icon: Icon,
  isActive,
  onClick,
  href,
}: SettingsNavItemProps) {
  const className = cn(
    'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors w-full',
    'min-h-[44px]', // Touch-friendly target
    isActive
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  )

  if (href) {
    return (
      <Link href={href} className={className}>
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span>{label}</span>
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
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span>{label}</span>
    </button>
  )
}
