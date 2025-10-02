'use client'

import { useEffect, useState, useMemo } from 'react'
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
import { Search, Filter } from 'lucide-react'

const STAGES = [
  { id: 'lead', name: 'New Leads', color: 'bg-blue-500' },
  { id: 'active', name: 'Active', color: 'bg-yellow-500' },
  { id: 'customer', name: 'Won', color: 'bg-green-500' },
  { id: 'lost', name: 'Lost', color: 'bg-gray-500' },
]

const CONTACTS_PER_COLUMN = 50 // Limit for performance

export function PipelineBoard() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [activeContact, setActiveContact] = useState<Contact | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStages, setSelectedStages] = useState<string[]>(STAGES.map(s => s.id))

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

  // Filter contacts based on search and selected stages
  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase()
        const email = contact.email?.toLowerCase() || ''
        const phone = contact.phone?.toLowerCase() || ''

        if (!fullName.includes(query) && !email.includes(query) && !phone.includes(query)) {
          return false
        }
      }

      return true
    })
  }, [contacts, searchQuery])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Loading pipeline...</div>
      </div>
    )
  }

  const contactsByStage = STAGES.reduce(
    (acc, stage) => {
      if (!selectedStages.includes(stage.id)) {
        acc[stage.id] = []
        return acc
      }

      const stageContacts = filteredContacts.filter((c) => c.stage === stage.id)
      // Limit contacts per column for performance
      acc[stage.id] = stageContacts.slice(0, CONTACTS_PER_COLUMN)
      acc[`${stage.id}_total`] = stageContacts.length
      return acc
    },
    {} as Record<string, Contact[] | number>
  )

  const toggleStage = (stageId: string) => {
    setSelectedStages((prev) =>
      prev.includes(stageId)
        ? prev.filter((id) => id !== stageId)
        : [...prev, stageId]
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with Search and Filters */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Stage Filter Toggles */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            {STAGES.map((stage) => (
              <button
                key={stage.id}
                onClick={() => toggleStage(stage.id)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedStages.includes(stage.id)
                    ? `${stage.color} text-white`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {stage.name}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center gap-6 text-sm text-gray-600">
          <span>Total: {contacts.length} contacts</span>
          {searchQuery && (
            <span>Filtered: {filteredContacts.length} contacts</span>
          )}
        </div>
      </div>

      {/* Pipeline Board */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 p-4 flex-1 overflow-x-auto">
          {STAGES.filter(stage => selectedStages.includes(stage.id)).map((stage) => {
            const stageContacts = contactsByStage[stage.id] as Contact[]
            const totalInStage = contactsByStage[`${stage.id}_total`] as number

            return (
              <div key={stage.id} className="flex flex-col min-w-[300px]">
                {/* Column Header with Count */}
                <div className="mb-2 px-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">{stage.name}</h3>
                    <span className="text-xs text-gray-500">
                      {stageContacts.length}
                      {totalInStage > CONTACTS_PER_COLUMN && ` of ${totalInStage}`}
                    </span>
                  </div>
                </div>

                <PipelineColumn
                  stage={stage}
                  contacts={stageContacts || []}
                />

                {/* Show more indicator */}
                {totalInStage > CONTACTS_PER_COLUMN && (
                  <div className="mt-2 text-center">
                    <p className="text-xs text-gray-500">
                      + {totalInStage - CONTACTS_PER_COLUMN} more (use search to find)
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <DragOverlay>
          {activeContact ? <ContactCard contact={activeContact} isDragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
