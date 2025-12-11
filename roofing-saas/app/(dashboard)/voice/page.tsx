'use client'

import { useState, useEffect } from 'react'
import { VoiceSession } from '@/components/voice/VoiceSession'
import { Mic, AlertCircle, Info } from 'lucide-react'

interface Contact {
  id: string
  first_name: string
  last_name: string
}

interface Project {
  id: string
  name: string
}

/**
 * Voice Assistant Demo Page
 *
 * Test the AI Voice Assistant with real authentication
 * Features:
 * - Optional context (contact/project selection)
 * - Live voice session
 * - Session history
 */
export default function VoicePage() {
  const [selectedContact, setSelectedContact] = useState<string>('')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  // const [recentSessions, setRecentSessions] = useState<VoiceSessionRecord[]>([]) // TODO: Display session history
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoadingData(true)
    try {
      // Fetch contacts for context dropdown
      const contactsRes = await fetch('/api/contacts?limit=50')
      const contactsData = await contactsRes.json()
      setContacts(contactsData.contacts || [])

      // Fetch projects for context dropdown
      const projectsRes = await fetch('/api/projects?limit=50')
      const projectsData = await projectsRes.json()
      setProjects(projectsData.projects || [])
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load contacts and projects')
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleSessionEnd = () => {
    console.log('Voice session ended')
    // Optionally reload session history here
  }

  const handleError = (error: Error) => {
    console.error('Voice session error:', error)
    setError(error.message)
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Mic className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">AI Voice Assistant</h1>
          </div>
          <p className="text-gray-600">
            Talk to your CRM - Create contacts, log knocks, search records, and more using your voice
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">How to use the Voice Assistant:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Click &ldquo;Start Voice Assistant&rdquo; and allow microphone access</li>
                <li><strong>CRM Actions:</strong> &ldquo;Create a new contact named Sarah Johnson with phone 555-9876&rdquo;</li>
                <li><strong>Field Work:</strong> &ldquo;Log a door knock at 456 Oak Street, disposition interested&rdquo;</li>
                <li><strong>Communication:</strong> &ldquo;Send a text to 555-1234 saying Running 10 minutes late&rdquo;</li>
                <li><strong>Phone Calls:</strong> &ldquo;Call Sarah Johnson&rdquo;</li>
                <li><strong>Weather:</strong> &ldquo;What&apos;s the weather forecast for tomorrow?&rdquo;</li>
                <li><strong>Roofing Knowledge:</strong> &ldquo;What&apos;s the warranty on GAF Timberline shingles?&rdquo;</li>
                <li><strong>Web Search:</strong> &ldquo;What are current roofing material prices in Nashville?&rdquo;</li>
                <li>The assistant will confirm actions before executing them</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-900">
                <p className="font-medium">Error:</p>
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Context Selection (Optional) */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Optional Context
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Select a contact or project to provide context to the assistant
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contact Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact
              </label>
              <select
                value={selectedContact}
                onChange={(e) => setSelectedContact(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoadingData}
              >
                <option value="">No contact selected</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Project Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoadingData}
              >
                <option value="">No project selected</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Voice Session Component */}
        <div className="mb-6">
          <VoiceSession
            contactId={selectedContact || undefined}
            projectId={selectedProject || undefined}
            onSessionEnd={handleSessionEnd}
            onError={handleError}
          />
        </div>

        {/* Technical Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Technical Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600 font-medium">Provider</p>
              <p className="text-foreground">OpenAI Realtime API</p>
            </div>
            <div>
              <p className="text-gray-600 font-medium">Model</p>
              <p className="text-foreground">gpt-4o-realtime-preview</p>
            </div>
            <div>
              <p className="text-gray-600 font-medium">Voice</p>
              <p className="text-foreground">Alloy</p>
            </div>
            <div>
              <p className="text-gray-600 font-medium">Cost</p>
              <p className="text-foreground">~$0.30/minute</p>
            </div>
            <div>
              <p className="text-gray-600 font-medium">Target Latency</p>
              <p className="text-foreground">&lt;2 seconds</p>
            </div>
            <div>
              <p className="text-gray-600 font-medium">Functions Available</p>
              <p className="text-foreground">10 CRM + Intelligence</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              <strong>Available Functions:</strong> create_contact, add_note, search_contact, log_knock, update_contact_stage, send_sms, make_call, get_weather, search_roofing_knowledge, search_web
            </p>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Coming Soon: Phase 4.2 & 4.3
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold">•</span>
              <span><strong>ElevenLabs Integration:</strong> Premium voice quality at 75% lower cost ($0.08/min)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold">•</span>
              <span><strong>Mobile Optimization:</strong> Perfect for iOS Safari and Android Chrome</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold">•</span>
              <span><strong>Roofing Knowledge Base:</strong> Domain-specific terminology and insights</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold">•</span>
              <span><strong>Multi-turn Conversations:</strong> Natural follow-up questions</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
