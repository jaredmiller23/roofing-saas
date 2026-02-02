'use client'

import { SettingsNavItem, type SettingsNavItemProps } from './SettingsNavItem'

export interface SettingsNavGroupProps {
  label: string
  items: Omit<SettingsNavItemProps, 'isActive' | 'onClick' | 'variant'>[]
  activeId: string | null
  onSelect: (id: string) => void
  /** Render as list (full-width) or sidebar */
  variant?: 'sidebar' | 'list'
}

export function SettingsNavGroup({
  label,
  items,
  activeId,
  onSelect,
  variant = 'sidebar',
}: SettingsNavGroupProps) {
  return (
    <div className="space-y-1">
      <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </h3>
      <nav className="space-y-0.5">
        {items.map((item) => (
          <SettingsNavItem
            key={item.id}
            {...item}
            isActive={activeId === item.id}
            onClick={() => onSelect(item.id)}
            variant={variant}
          />
        ))}
      </nav>
    </div>
  )
}
