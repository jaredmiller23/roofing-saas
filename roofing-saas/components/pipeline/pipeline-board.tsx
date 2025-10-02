'use client'

import { useEffect, useState } from 'react'
import { Contact } from '@/lib/types/contact'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { PipelineColumn } from './pipeline-column'
import { ContactCard } from './contact-card'

const STAGES = [
  { id: 'lead', name: 'New Leads', color: 'bg-blue-500' },
  { id: 'active', name: 'Active', color: 'bg-yellow-500' },
  { id: 'customer', name: 'Won', color: 'bg-green-500' },
  { id: 'lost', name: 'Lost', color: 'bg-gray-500' },
]

export function PipelineBoard() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [activeContact, setActiveContact] = useState<Contact | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    fetchContacts()
  }, [])

  async function fetchContacts() {
    try {
      // Fetch all contacts for pipeline view (increased limit to 2000)
      const response = await fetch('/api/contacts?limit=2000')
      if (response.ok) {
        const result = await response.json()
        // Handle new response format: { success, data: { contacts, ... } }
        const data = result.data || result
        setContacts(data.contacts || [])
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const contact = contacts.find((c) => c.id === event.active.id)
    setActiveContact(contact || null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveContact(null)

    if (!over) return

    const contactId = active.id as string
    const newStage = over.id as string
    const contact = contacts.find((c) => c.id === contactId)

    if (!contact || contact.stage === newStage) return

    // Optimistic update
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId ? { ...c, stage: newStage as Contact['stage'] } : c
      )
    )

    // Update on server
    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      })

      if (!response.ok) {
        throw new Error('Failed to update contact')
      }
    } catch (error) {
      console.error('Failed to update contact stage:', error)
      // Revert on error
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contactId ? { ...c, stage: contact.stage } : c
        )
      )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Loading pipeline...</div>
      </div>
    )
  }

  const contactsByStage = STAGES.reduce(
    (acc, stage) => {
      acc[stage.id] = contacts.filter((c) => c.stage === stage.id)
      return acc
    },
    {} as Record<string, Contact[]>
  )

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 p-8 h-full">
        {STAGES.map((stage) => (
          <PipelineColumn
            key={stage.id}
            stage={stage}
            contacts={contactsByStage[stage.id] || []}
          />
        ))}
      </div>

      <DragOverlay>
        {activeContact ? <ContactCard contact={activeContact} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}
