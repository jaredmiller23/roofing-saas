'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type CookieConsentValue = 'all' | 'necessary'

export function getCookieConsent(): CookieConsentValue | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('cookie-consent') as CookieConsentValue | null
}

export function hasAnalyticsConsent(): boolean {
  return getCookieConsent() === 'all'
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const existing = localStorage.getItem('cookie-consent')
    if (existing) return

    const timer = setTimeout(() => {
      setVisible(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  function accept(value: CookieConsentValue) {
    localStorage.setItem('cookie-consent', value)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 inset-x-0 z-50 transform transition-transform duration-300 ease-out"
      style={{ animation: 'slideUp 300ms ease-out forwards' }}
    >
      <div className="mx-auto max-w-4xl p-4">
        <div className="rounded-lg border border-border bg-card p-4 shadow-lg sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground">
              We use cookies to improve your experience. By continuing to use this site, you agree to
              our use of cookies.{' '}
              <Link href="/privacy" className="text-primary underline underline-offset-4 hover:text-primary/80">
                Privacy Policy
              </Link>
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => accept('necessary')}
              >
                Necessary Only
              </Button>
              <Button
                size="sm"
                onClick={() => accept('all')}
              >
                Accept All
              </Button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
