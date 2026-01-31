'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Phone, MessageSquare, Mail, Building2, PhoneOff, User, MapPin } from 'lucide-react'
import { DNCBadge } from './DNCBadge'
import { CallComplianceCheck } from './CallComplianceCheck'
import type { Contact } from '@/lib/types/contact'
import { getCombinedTypeLabel, formatStage } from '@/lib/types/contact'
import { apiFetch } from '@/lib/api/client'

interface ContactCardProps {
  contact: Contact
  showQuickActions?: boolean
  showCallCheck?: boolean
  compact?: boolean
}

/**
 * ContactCard component displays contact information in a card format
 * Includes DNC status badge, compliance checks, and quick actions
 */
export function ContactCard({
  contact,
  showQuickActions = true,
  showCallCheck = false,
  compact = false
}: ContactCardProps) {
  const [showingCallCheck, setShowingCallCheck] = useState(showCallCheck)
  const [addingToDNC, setAddingToDNC] = useState(false)

  const primaryPhone = contact.phone || contact.mobile_phone

  const handleAddToInternalDNC = async () => {
    if (!primaryPhone) return

    setAddingToDNC(true)
    try {
      await apiFetch('/api/compliance/internal-dnc', {
        method: 'POST',
        body: {
          contactId: contact.id,
          phoneNumber: primaryPhone,
          reason: 'Added manually from contact card'
        }
      })

      // Refresh the page to update the DNC status
      window.location.reload()
    } catch (error) {
      console.error('Failed to add to Internal DNC:', error)
      alert('Failed to add to Internal DNC. Please try again.')
    } finally {
      setAddingToDNC(false)
    }
  }

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      new: 'bg-primary/10 text-primary',
      contacted: 'bg-yellow-500 text-white',
      qualified: 'bg-secondary/10 text-secondary',
      proposal: 'bg-primary/10 text-primary',
      negotiation: 'bg-orange-500 text-white',
      won: 'bg-green-500 text-white',
      lost: 'bg-muted text-muted-foreground',
    }
    return colors[stage] || 'bg-muted text-muted-foreground'
  }

  return (
    <div className="bg-card rounded-lg shadow p-4 border border-border hover:shadow-md transition-shadow">
      {/* Header with name and badges */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <Link
            href={`/contacts/${contact.id}`}
            className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
          >
            {contact.first_name} {contact.last_name}
          </Link>

          {contact.company && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
              <Building2 className="h-3 w-3" />
              <span>{contact.company}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-3">
          <DNCBadge status={contact.dnc_status} showLabel={!compact} />
        </div>
      </div>

      {/* Contact info */}
      <div className="space-y-2 mb-3">
        {/* Type and Stage */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            {getCombinedTypeLabel(contact)}
          </Badge>
          <Badge className={`text-xs ${getStageColor(contact.stage)}`}>
            {formatStage(contact.stage)}
          </Badge>
        </div>

        {/* Contact details */}
        {!compact && (
          <div className="space-y-1">
            {contact.email && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span className="truncate">{contact.email}</span>
              </div>
            )}

            {primaryPhone && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{primaryPhone}</span>
              </div>
            )}

            {(contact.address_city || contact.address_state) && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="truncate">
                  {contact.address_city}{contact.address_state && `, ${contact.address_state}`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compliance Check */}
      {showingCallCheck && primaryPhone && (
        <div className="mb-3 p-2 bg-muted/30 rounded border border-border">
          <CallComplianceCheck
            phoneNumber={primaryPhone}
            contactId={contact.id}
          />
        </div>
      )}

      {/* Quick Actions */}
      {showQuickActions && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {/* Call actions */}
            {primaryPhone && (
              <>
                {!showingCallCheck ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowingCallCheck(true)}
                          className="h-8 w-8 p-0"
                        >
                          <Phone className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Check compliance & call</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowingCallCheck(false)}
                          className="h-8 w-8 p-0"
                        >
                          <Phone className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Hide compliance check</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="h-8 w-8 p-0"
                      >
                        <a href={`sms:${primaryPhone}`}>
                          <MessageSquare className="h-3 w-3" />
                        </a>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Send SMS</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}

            {/* Email action */}
            {contact.email && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      className="h-8 w-8 p-0"
                    >
                      <a href={`mailto:${contact.email}`}>
                        <Mail className="h-3 w-3" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Send Email</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Add to Internal DNC - only show if not already on internal DNC */}
            {primaryPhone && contact.dnc_status !== 'internal' && contact.dnc_status !== 'both' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAddToInternalDNC}
                      disabled={addingToDNC}
                      className="h-8 w-8 p-0"
                    >
                      <PhoneOff className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add to Internal DNC</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* View contact */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="h-8 w-8 p-0"
                  >
                    <Link href={`/contacts/${contact.id}`}>
                      <User className="h-3 w-3" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View contact details</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}
    </div>
  )
}
