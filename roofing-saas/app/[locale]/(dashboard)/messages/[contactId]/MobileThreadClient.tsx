'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from '@/lib/i18n/navigation'
import { MessageThread } from '@/components/messages'
import { apiFetch } from '@/lib/api/client'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, AlertCircle } from 'lucide-react'

interface ContactInfo {
  id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  mobile_phone: string | null
}

interface MobileThreadClientProps {
  contactId: string
}

/**
 * MobileThreadClient
 *
 * Full-screen mobile thread view for a specific contact's SMS conversation.
 * Fetches contact info (name, phone) then renders the existing MessageThread
 * component in a full-height layout with back navigation.
 */
export function MobileThreadClient({ contactId }: MobileThreadClientProps) {
  const router = useRouter()
  const [contact, setContact] = useState<ContactInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadContact = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiFetch<ContactInfo>(`/api/contacts/${contactId}`)
      setContact(data)
    } catch (err) {
      logger.error('Failed to load contact for mobile thread', { error: err, contactId })
      setError(err instanceof Error ? err.message : 'Failed to load contact')
    } finally {
      setLoading(false)
    }
  }, [contactId])

  useEffect(() => {
    loadContact()
  }, [loadContact])

  const handleBack = useCallback(() => {
    router.push('/messages')
  }, [router])

  const contactName = contact
    ? [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unknown Contact'
    : ''

  const contactPhone = contact?.mobile_phone || contact?.phone || ''

  // Loading state
  if (loading) {
    return (
      <div className="h-dvh flex flex-col bg-background">
        <div className="border-b border-border p-4 bg-background flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={i % 2 === 0 ? 'flex justify-end' : 'flex justify-start'}>
              <Skeleton className="h-16 w-64 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error || !contact) {
    return (
      <div className="h-dvh flex flex-col bg-background">
        <div className="border-b border-border p-4 bg-background">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-9 w-9 touch-manipulation"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-lg font-semibold text-foreground">
                Could not load conversation
              </p>
              <p className="text-sm text-muted-foreground">
                {error || 'Contact not found'}
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleBack} className="touch-manipulation">
                Back to Messages
              </Button>
              <Button onClick={loadContact} className="touch-manipulation">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Thread view
  return (
    <div className="h-dvh flex flex-col bg-background">
      <MessageThread
        contactId={contactId}
        contactName={contactName}
        contactPhone={contactPhone}
        onBack={handleBack}
        showBackButton={true}
      />
    </div>
  )
}
