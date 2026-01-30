'use client'

import { useState } from 'react'
import { MessageSquare, X } from 'lucide-react'
import { ARIAChat } from './ARIAChat'

/**
 * Floating ARIA chat button + panel.
 * Renders a bottom-right FAB that toggles the chat panel open/closed.
 */
export function ARIAChatButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Chat panel */}
      <ARIAChat isOpen={isOpen} onClose={() => setIsOpen(false)} />

      {/* Floating button - hidden when panel is open */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 p-3.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:bg-primary/80 transition-all hover:scale-105 active:scale-95"
          aria-label="Open ARIA chat"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
      )}

      {/* Close button overlay when panel is open (desktop only, visible over sidebar gap) */}
      {isOpen && (
        <button
          onClick={() => setIsOpen(false)}
          className="fixed bottom-6 right-6 z-[60] p-3.5 rounded-full bg-muted text-muted-foreground shadow-lg hover:bg-muted/80 transition-all sm:hidden"
          aria-label="Close ARIA chat"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </>
  )
}
