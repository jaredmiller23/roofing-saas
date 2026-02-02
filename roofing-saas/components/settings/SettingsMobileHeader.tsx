'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface SettingsMobileHeaderProps {
  title: string
  onBack?: () => void
  backHref?: string
}

export function SettingsMobileHeader({ title, onBack, backHref }: SettingsMobileHeaderProps) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
      {onBack ? (
        <button
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-muted rounded-md transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      ) : backHref ? (
        <Link
          href={backHref}
          className="p-2 -ml-2 hover:bg-muted rounded-md transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      ) : null}
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
    </div>
  )
}
