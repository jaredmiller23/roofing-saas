"use client"

import { useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PhotoManager } from '@/components/photos'
import { ContactSubstatusManager } from '@/components/contacts/ContactSubstatusManager'
import { PresenceIndicator } from '@/components/collaboration/PresenceIndicator'
import { RealtimeToast, realtimeToastPresets } from '@/components/collaboration/RealtimeToast'
import { usePresence, type PresenceUser } from '@/lib/hooks/usePresence'

interface Contact {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  mobile_phone?: string
  source?: string
  type: string
  stage: string
  substatus?: string
  address_street?: string
  address_city?: string
  address_state?: string
  address_zip?: string
  property_type?: string
  roof_type?: string
  roof_age?: number
  square_footage?: number
  stories?: number
  insurance_carrier?: string
  policy_number?: string
}

interface ContactDetailClientProps {
  contact: Contact
  tenantId: string
  user: {
    id: string
    email?: string
    name?: string
    avatar?: string
  }
}

export function ContactDetailClient({ contact, tenantId, user }: ContactDetailClientProps) {
  // Track presence for this contact
  const { presentUsers, count } = usePresence({
    entityType: 'contact',
    entityId: contact.id,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    },
    onUserJoin: (presenceUser: PresenceUser) => {
      const userName = presenceUser.userName || presenceUser.userEmail || 'Someone'
      toast.custom(() => (
        <RealtimeToast {...realtimeToastPresets.userJoined(userName, presenceUser.userAvatar)} />
      ))
    },
    onUserLeave: (presenceUser: PresenceUser) => {
      const userName = presenceUser.userName || presenceUser.userEmail || 'Someone'
      toast.custom(() => (
        <RealtimeToast {...realtimeToastPresets.userLeft(userName, presenceUser.userAvatar)} />
      ))
    },
  })

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {contact.first_name} {contact.last_name}
              </h1>
              {/* Presence Indicator */}
              <PresenceIndicator
                entityType="contact"
                entityId={contact.id}
                user={user}
                size="sm"
                maxDisplay={3}
              />
            </div>
            <div className="flex gap-2 mt-2 items-center">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full capitalize">
                {contact.type}
              </span>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-semibold rounded-full capitalize">
                {contact.stage}
              </span>
              <ContactSubstatusManager
                contactId={contact.id}
                stage={contact.stage}
                currentSubstatus={contact.substatus || null}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/contacts/${contact.id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Edit
            </Link>
            <Link
              href="/contacts"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Back
            </Link>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Email</label>
              <p className="mt-1 text-gray-900">{contact.email || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Phone</label>
              <p className="mt-1 text-gray-900">{contact.phone || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Mobile Phone</label>
              <p className="mt-1 text-gray-900">{contact.mobile_phone || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Source</label>
              <p className="mt-1 text-gray-900">{contact.source || '-'}</p>
            </div>
          </div>
        </div>

        {/* Address */}
        {(contact.address_street || contact.address_city) && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Address</h2>
            <div className="text-gray-900">
              {contact.address_street && <p>{contact.address_street}</p>}
              {(contact.address_city || contact.address_state || contact.address_zip) && (
                <p>
                  {contact.address_city}
                  {contact.address_state && `, ${contact.address_state}`}
                  {contact.address_zip && ` ${contact.address_zip}`}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Property Details */}
        {(contact.property_type || contact.roof_type || contact.roof_age) && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contact.property_type && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Property Type</label>
                  <p className="mt-1 text-gray-900">{contact.property_type}</p>
                </div>
              )}
              {contact.roof_type && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Roof Type</label>
                  <p className="mt-1 text-gray-900">{contact.roof_type}</p>
                </div>
              )}
              {contact.roof_age !== null && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Roof Age</label>
                  <p className="mt-1 text-gray-900">{contact.roof_age} years</p>
                </div>
              )}
              {contact.square_footage && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Square Footage</label>
                  <p className="mt-1 text-gray-900">{contact.square_footage.toLocaleString()} sq ft</p>
                </div>
              )}
              {contact.stories && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Stories</label>
                  <p className="mt-1 text-gray-900">{contact.stories}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Insurance */}
        {(contact.insurance_carrier || contact.policy_number) && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Insurance Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contact.insurance_carrier && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Insurance Carrier</label>
                  <p className="mt-1 text-gray-900">{contact.insurance_carrier}</p>
                </div>
              )}
              {contact.policy_number && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Policy Number</label>
                  <p className="mt-1 text-gray-900">{contact.policy_number}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Photos */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Photos</h2>
          <PhotoManager
            contactId={contact.id}
            tenantId={tenantId}
            uploadMode="immediate"
            showUpload={true}
            showGallery={true}
          />
        </div>
      </div>
    </div>
  )
}
