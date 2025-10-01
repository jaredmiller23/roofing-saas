'use client'

import { useDroppable } from '@dnd-kit/core'
import { Contact } from '@/lib/types/contact'
import { ContactCard } from './contact-card'

interface PipelineColumnProps {
  stage: {
    id: string
    name: string
    color: string
  }
  contacts: Contact[]
}

export function PipelineColumn({ stage, contacts }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })

  return (
    <div className="flex-shrink-0 w-80 flex flex-col">
      {/* Column Header */}
      <div className="bg-white rounded-t-lg border border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${stage.color}`} />
            <h3 className="font-semibold text-gray-900">{stage.name}</h3>
          </div>
          <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {contacts.length}
          </span>
        </div>
      </div>

      {/* Cards Container */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 bg-gray-50 rounded-b-lg border-x border-b border-gray-200
          p-3 overflow-y-auto space-y-3 min-h-[200px]
          ${isOver ? 'bg-blue-50 border-blue-300' : ''}
        `}
      >
        {contacts.map((contact) => (
          <ContactCard key={contact.id} contact={contact} />
        ))}

        {contacts.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Drop contacts here
          </div>
        )}
      </div>
    </div>
  )
}
