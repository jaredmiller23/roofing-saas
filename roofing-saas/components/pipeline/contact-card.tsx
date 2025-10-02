'use client'

import { useDraggable } from '@dnd-kit/core'
import { Contact } from '@/lib/types/contact'
import Link from 'next/link'
import { Phone, MessageSquare, Mail, DollarSign, TrendingUp, Clock } from 'lucide-react'

interface ContactCardProps {
  contact: Contact
  isDragging?: boolean
}

export function ContactCard({ contact, isDragging = false }: ContactCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: contact.id,
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const formatCurrency = (value: number | null) => {
    if (!value) return null
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    const diffInWeeks = Math.floor(diffInDays / 7)
    return `${diffInWeeks}w ago`
  }

  const getLeadScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 60) return 'text-blue-600 bg-blue-50'
    if (score >= 40) return 'text-yellow-600 bg-yellow-50'
    return 'text-gray-600 bg-gray-50'
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        bg-white rounded-lg border border-gray-200 p-4
        hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-50 rotate-3 shadow-lg' : ''}
      `}
    >
      {/* Header: Name + Value + Score */}
      <div className="flex items-start justify-between mb-3">
        <Link
          href={`/contacts/${contact.id}`}
          className="font-semibold text-gray-900 hover:text-blue-600 flex-1"
          onClick={(e) => e.stopPropagation()}
        >
          {contact.first_name} {contact.last_name}
        </Link>
        {contact.lead_score > 0 && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getLeadScoreColor(contact.lead_score)}`}>
            <TrendingUp className="h-3 w-3" />
            {contact.lead_score}
          </div>
        )}
      </div>

      {/* Property Value */}
      {contact.property_value && (
        <div className="flex items-center gap-1.5 mb-2 text-lg font-bold text-green-700">
          <DollarSign className="h-4 w-4" />
          {formatCurrency(contact.property_value)}
        </div>
      )}

      {/* Contact Details */}
      <div className="space-y-1 text-sm text-gray-600">
        {contact.email && (
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span className="truncate">{contact.email}</span>
          </div>
        )}

        {(contact.phone || contact.mobile_phone) && (
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            <span>{contact.phone || contact.mobile_phone}</span>
          </div>
        )}

        {contact.address_city && (
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>
              {contact.address_city}
              {contact.address_state && `, ${contact.address_state}`}
            </span>
          </div>
        )}
      </div>

      {/* Type Badge + Last Updated */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded capitalize">
            {contact.type}
          </span>
          {contact.priority !== 'normal' && (
            <span
              className={`inline-block px-2 py-1 text-xs font-semibold rounded capitalize ${
                contact.priority === 'urgent'
                  ? 'bg-red-100 text-red-800'
                  : contact.priority === 'high'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-gray-100 text-gray-800'
              }`}
            >
              {contact.priority}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          {getTimeSince(contact.updated_at)}
        </div>
      </div>

      {/* Quick Actions - Mobile Friendly */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
        {(contact.phone || contact.mobile_phone) && (
          <a
            href={`tel:${contact.phone || contact.mobile_phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-md text-xs font-medium transition-colors"
            title="Call"
          >
            <Phone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Call</span>
          </a>
        )}
        {(contact.phone || contact.mobile_phone) && (
          <a
            href={`sms:${contact.phone || contact.mobile_phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-xs font-medium transition-colors"
            title="Text"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Text</span>
          </a>
        )}
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md text-xs font-medium transition-colors"
            title="Email"
          >
            <Mail className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Email</span>
          </a>
        )}
      </div>
    </div>
  )
}
