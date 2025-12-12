'use client'

/**
 * QuickActionsMenu Component
 * Dropdown menu with common CRM actions for AI assistant
 */

import { useState, useRef, useEffect } from 'react'
import {
  Plus,
  X,
  UserPlus,
  Search,
  FileText,
  DoorClosed,
  TrendingUp,
  Phone,
  MessageSquare,
  Cloud
} from 'lucide-react'
import type { QuickActionConfig } from '@/lib/ai-assistant/types'
import { useAIAssistant } from '@/lib/ai-assistant/context'

const QUICK_ACTIONS: QuickActionConfig[] = [
  {
    id: 'create_contact',
    label: 'Create Contact',
    icon: UserPlus,
    description: 'Add a new lead or customer',
    requiresContext: false,
  },
  {
    id: 'search_crm',
    label: 'Search CRM',
    icon: Search,
    description: 'Find contacts, projects, or jobs',
    requiresContext: false,
  },
  {
    id: 'add_note',
    label: 'Add Note',
    icon: FileText,
    description: 'Add a note to current contact/project',
    requiresContext: true,
    showInContexts: ['contact', 'project'],
  },
  {
    id: 'log_knock',
    label: 'Log Door Knock',
    icon: DoorClosed,
    description: 'Record a field canvassing activity',
    requiresContext: false,
  },
  {
    id: 'check_pipeline',
    label: 'Check Pipeline',
    icon: TrendingUp,
    description: 'View pipeline status and metrics',
    requiresContext: false,
  },
  {
    id: 'make_call',
    label: 'Make Call',
    icon: Phone,
    description: 'Initiate a phone call',
    requiresContext: true,
    showInContexts: ['contact'],
  },
  {
    id: 'send_sms',
    label: 'Send SMS',
    icon: MessageSquare,
    description: 'Send a text message',
    requiresContext: true,
    showInContexts: ['contact'],
  },
  {
    id: 'get_weather',
    label: 'Get Weather',
    icon: Cloud,
    description: 'Check weather for scheduling',
    requiresContext: false,
  },
]

export function QuickActionsMenu() {
  const { sendMessage, currentContext } = useAIAssistant()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Filter actions based on current context
  const availableActions = QUICK_ACTIONS.filter(action => {
    // If action requires context and we don't have it, hide it
    if (action.requiresContext && !currentContext?.entity_id) {
      return false
    }

    // If action is limited to specific contexts, check if we're in one
    if (action.showInContexts && currentContext?.entity_type) {
      return action.showInContexts.includes(currentContext.entity_type)
    }

    return true
  })

  const handleActionClick = async (action: QuickActionConfig) => {
    setIsOpen(false)

    // Generate appropriate prompt based on action
    let prompt = ''

    switch (action.id) {
      case 'create_contact':
        prompt = 'I want to create a new contact. Can you help me with that?'
        break
      case 'search_crm':
        prompt = 'I need to search for something in the CRM'
        break
      case 'add_note':
        if (currentContext?.entity_type === 'contact') {
          prompt = 'Add a note to this contact'
        } else if (currentContext?.entity_type === 'project') {
          prompt = 'Add a note to this project'
        }
        break
      case 'log_knock':
        prompt = 'I want to log a door knock activity'
        break
      case 'check_pipeline':
        prompt = 'Show me the current pipeline status'
        break
      case 'make_call':
        prompt = 'I want to make a call to this contact'
        break
      case 'send_sms':
        prompt = 'I want to send an SMS to this contact'
        break
      case 'get_weather':
        prompt = 'What is the weather forecast for this week?'
        break
      default:
        prompt = action.label
    }

    // Send message to AI
    await sendMessage(prompt)
  }

  return (
    <div ref={menuRef} className="relative">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-full transition-all ${
          isOpen
            ? 'bg-primary text-white shadow-lg'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        }`}
        title="Quick actions"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-card rounded-xl shadow-2xl border border-border overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 bg-muted/30 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {availableActions.length} actions available
            </p>
          </div>

          {/* Actions list */}
          <div className="max-h-96 overflow-y-auto">
            {availableActions.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No actions available for current context
              </div>
            ) : (
              <div className="p-2">
                {availableActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleActionClick(action)}
                      className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-accent active:bg-muted/80 transition-colors text-left group"
                    >
                      {/* Icon */}
                      <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground text-sm">
                          {action.label}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {action.description}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-muted/30 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Or just type what you need in the chat
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
