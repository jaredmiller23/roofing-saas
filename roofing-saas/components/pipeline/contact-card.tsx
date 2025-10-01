'use client'

import { useDraggable } from '@dnd-kit/core'
import { Contact } from '@/lib/types/contact'
import Link from 'next/link'

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
      {/* Contact Name */}
      <Link
        href={`/contacts/${contact.id}`}
        className="font-semibold text-gray-900 hover:text-blue-600 block mb-2"
        onClick={(e) => e.stopPropagation()}
      >
        {contact.first_name} {contact.last_name}
      </Link>

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

      {/* Type Badge */}
      <div className="mt-3 flex items-center gap-2">
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
    </div>
  )
}
