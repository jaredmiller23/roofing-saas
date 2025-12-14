'use client'

import { useState as _useState } from 'react'
import { useRouter } from 'next/navigation'
import { Contact } from '@/lib/types/contact'

interface DuplicateMatch {
  contact: Contact
  match_reason: string[]
  confidence: 'high' | 'medium' | 'low'
}

interface DuplicateWarningDialogProps {
  isOpen: boolean
  matches: DuplicateMatch[]
  onClose: () => void
  onContinue: () => void
}

export function DuplicateWarningDialog({
  isOpen,
  matches,
  onClose,
  onContinue,
}: DuplicateWarningDialogProps) {
  const router = useRouter()

  if (!isOpen || matches.length === 0) return null

  // Show the highest confidence match
  const primaryMatch = matches[0]

  const handleViewExisting = () => {
    router.push(`/contacts/${primaryMatch.contact.id}`)
  }

  const handleContinueCreating = () => {
    onContinue()
    onClose()
  }

  const formatContactName = (contact: Contact) => {
    return `${contact.first_name} ${contact.last_name}`
  }

  const formatContactDetails = (contact: Contact) => {
    const details: string[] = []

    if (contact.email) {
      details.push(`Email: ${contact.email}`)
    }

    if (contact.phone) {
      details.push(`Phone: ${contact.phone}`)
    }

    if (contact.mobile_phone) {
      details.push(`Mobile: ${contact.mobile_phone}`)
    }

    if (contact.company) {
      details.push(`Company: ${contact.company}`)
    }

    if (contact.address_street && contact.address_city) {
      details.push(`Address: ${contact.address_street}, ${contact.address_city}`)
    } else if (contact.address_city && contact.address_state) {
      details.push(`Location: ${contact.address_city}, ${contact.address_state}`)
    }

    return details
  }

  const getConfidenceColor = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-muted-foreground bg-muted border-border'
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Potential Duplicate Contact
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-muted-foreground transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <p className="text-sm text-muted-foreground">
              We found {matches.length} potential duplicate{matches.length > 1 ? 's' : ''} based on the information you entered:
            </p>

            {/* Primary Match */}
            <div className={`border rounded-lg p-4 ${getConfidenceColor(primaryMatch.confidence)}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-sm">
                    {formatContactName(primaryMatch.contact)}
                  </h4>
                  <div className="text-xs mt-1">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(primaryMatch.confidence)}`}>
                      {primaryMatch.confidence.charAt(0).toUpperCase() + primaryMatch.confidence.slice(1)} match
                    </span>
                  </div>
                </div>
              </div>

              {/* Match reasons */}
              <div className="mb-3">
                <p className="text-xs font-medium mb-1">Matched on:</p>
                <div className="flex flex-wrap gap-1">
                  {primaryMatch.match_reason.map((reason, index) => (
                    <span
                      key={index}
                      className="inline-flex px-2 py-1 rounded-full text-xs bg-card bg-opacity-60"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>

              {/* Contact details */}
              <div className="space-y-1">
                {formatContactDetails(primaryMatch.contact).map((detail, index) => (
                  <p key={index} className="text-xs">
                    {detail}
                  </p>
                ))}
              </div>

              {/* Creation date */}
              <p className="text-xs mt-2 opacity-75">
                Created: {new Date(primaryMatch.contact.created_at).toLocaleDateString()}
              </p>
            </div>

            {/* Additional matches note */}
            {matches.length > 1 && (
              <p className="text-xs text-muted-foreground">
                + {matches.length - 1} other potential duplicate{matches.length - 1 > 1 ? 's' : ''} found
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-border">
            <div className="flex gap-3">
              <button
                onClick={handleViewExisting}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
              >
                View Existing Contact
              </button>
              <button
                onClick={handleContinueCreating}
                className="flex-1 px-4 py-2 border border-border text-foreground text-sm font-medium rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
              >
                Continue Creating
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}