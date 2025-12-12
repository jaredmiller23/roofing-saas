'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { X } from 'lucide-react'

interface PinData {
  latitude: number
  longitude: number
  address?: string
  address_street?: string
  address_city?: string
  address_state?: string
  address_zip?: string
  disposition?: string
  notes?: string
}

interface PinPopupProps {
  pin: PinData
  isEditMode?: boolean
  onSave: (data: PinData & { create_contact?: boolean; contact_data?: unknown }) => void
  onCancel: () => void
  onDelete?: () => void
}

export function PinPopup({ pin, isEditMode = false, onSave, onCancel, onDelete }: PinPopupProps) {
  const [disposition, setDisposition] = useState<string>(pin.disposition || '')
  const [notes, setNotes] = useState(pin.notes || '')
  const [createContact, setCreateContact] = useState(false)
  const [contactData, setContactData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
  })

  const dispositions = [
    { value: 'interested', label: '👍 Interested', color: 'bg-green-500 hover:bg-green-600' },
    { value: 'not_home', label: '🚪 Not Home', color: 'bg-orange-500 hover:bg-orange-600' },
    { value: 'not_interested', label: '❌ Not Interested', color: 'bg-red-500 hover:bg-red-600' },
    { value: 'appointment', label: '📅 Appointment', color: 'bg-blue-500 hover:bg-blue-600' },
    { value: 'callback', label: '📞 Callback', color: 'bg-purple-500 hover:bg-purple-600' },
    { value: 'do_not_contact', label: '🚫 DNC', color: 'bg-gray-500 hover:bg-gray-600' },
    { value: 'already_customer', label: '✅ Customer', color: 'bg-teal-500 hover:bg-teal-600' },
  ]

  const handleSave = () => {
    if (!disposition) {
      alert('Please select a disposition')
      return
    }

    onSave({
      ...pin,
      disposition,
      notes: notes || undefined,
      create_contact: createContact,
      contact_data: createContact ? contactData : undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-lg">{isEditMode ? 'Edit Pin' : 'Drop Pin'}</h3>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Address */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Address</Label>
            <p className="text-sm text-foreground mt-1">
              {pin.address || 'Address not found'}
            </p>
            {pin.address_zip && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {pin.address_city}, {pin.address_state} {pin.address_zip}
              </p>
            )}
          </div>

          {/* Quick Disposition Buttons */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground mb-2 block">
              Disposition *
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {dispositions.map((disp) => (
                <button
                  key={disp.value}
                  onClick={() => setDisposition(disp.value)}
                  className={`
                    px-4 py-3 rounded-lg text-white font-medium text-sm
                    transition-all transform active:scale-95
                    ${disposition === disp.value
                      ? `${disp.color} ring-2 ring-offset-2 ring-black`
                      : `${disp.color} opacity-70`}
                  `}
                  style={{
                    // Make touch targets at least 44x44px for mobile
                    minHeight: '44px',
                  }}
                >
                  {disp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-sm font-medium text-muted-foreground">
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this property..."
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Create Contact Toggle - only show for new pins */}
          {!isEditMode && (
            <div className="border-t pt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createContact}
                  onChange={(e) => setCreateContact(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-foreground">
                  Create lead in CRM
                </span>
              </label>
              <p className="text-xs text-muted-foreground mt-1 ml-7">
                Automatically create a contact record for this property
              </p>
            </div>
          )}

          {/* Contact Data (if creating contact) */}
          {createContact && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="text-sm font-semibold text-foreground">Contact Information</h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="first_name" className="text-xs">
                    First Name
                  </Label>
                  <Input
                    id="first_name"
                    value={contactData.first_name}
                    onChange={(e) =>
                      setContactData({ ...contactData, first_name: e.target.value })
                    }
                    placeholder="John"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="last_name" className="text-xs">
                    Last Name
                  </Label>
                  <Input
                    id="last_name"
                    value={contactData.last_name}
                    onChange={(e) =>
                      setContactData({ ...contactData, last_name: e.target.value })
                    }
                    placeholder="Smith"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone" className="text-xs">
                  Phone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={contactData.phone}
                  onChange={(e) =>
                    setContactData({ ...contactData, phone: e.target.value })
                  }
                  placeholder="(555) 123-4567"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-xs">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={contactData.email}
                  onChange={(e) =>
                    setContactData({ ...contactData, email: e.target.value })
                  }
                  placeholder="john@example.com"
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 px-4 py-3 flex gap-3 border-t">
          {isEditMode && onDelete && (
            <Button
              variant="destructive"
              onClick={onDelete}
              className="mr-auto"
            >
              Delete
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!disposition}
            className="flex-1"
          >
            {isEditMode ? 'Update Pin' : createContact ? 'Save Pin & Create Lead' : 'Save Pin'}
          </Button>
        </div>
      </div>
    </div>
  )
}
