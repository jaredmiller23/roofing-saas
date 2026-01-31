'use client'

import { useState, useEffect } from 'react'
import { VoiceSession } from '@/components/voice/VoiceSession'
import { VoiceDiagnostics } from '@/components/voice/VoiceDiagnostics'
import { getAvailableProviders, VoiceProviderType } from '@/lib/voice/providers'
import { Mic, Info, AlertCircle, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { apiFetchPaginated } from '@/lib/api/client'

interface Contact {
  id: string
  first_name: string
  last_name: string
}

interface Project {
  id: string
  name: string
}

export default function VoiceAssistantPage() {
  // Provider state
  const [selectedProvider, setSelectedProvider] = useState<VoiceProviderType>('openai')
  const providers = getAvailableProviders()
  const currentProvider = providers.find(p => p.type === selectedProvider)

  // Context state
  const [selectedContact, setSelectedContact] = useState<string>('')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadContextData()
  }, [])

  const loadContextData = async () => {
    setIsLoadingData(true)
    setError(null)

    try {
      const [contactsResult, projectsResult] = await Promise.all([
        apiFetchPaginated<Contact[]>('/api/contacts?limit=50'),
        apiFetchPaginated<Project[]>('/api/projects?limit=50'),
      ])

      setContacts(contactsResult.data)
      setProjects(projectsResult.data)
    } catch (err) {
      console.error('Error loading context data:', err)
      setError(`Error loading context data: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleSessionEnd = () => {
    console.log('Voice session ended')
  }

  const handleError = (err: Error) => {
    console.error('Voice session error:', err)
    setError(err.message)
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary rounded-lg">
            <Mic className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              ARIA Voice Assistant
            </h1>
            <p className="text-muted-foreground">
              Your AI-powered CRM assistant - manage contacts, log activities, and more using voice
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-900">
                <p className="font-medium">Error:</p>
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Usage Instructions */}
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm text-primary">
              <p className="font-medium mb-2">Voice Commands You Can Use:</p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-primary/90">
                <li>&ldquo;Create a contact named John Smith&rdquo;</li>
                <li>&ldquo;Log a door knock at 123 Main St&rdquo;</li>
                <li>&ldquo;Send a text to 555-1234&rdquo;</li>
                <li>&ldquo;Call Sarah Johnson&rdquo;</li>
                <li>&ldquo;What&apos;s the weather tomorrow?&rdquo;</li>
                <li>&ldquo;Search for recent storm damage&rdquo;</li>
                <li>&ldquo;Add a note: Customer interested&rdquo;</li>
                <li>&ldquo;What&apos;s GAF shingle warranty?&rdquo;</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Provider Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Voice Provider</CardTitle>
            <CardDescription>Choose your preferred AI voice provider</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {providers.map((provider) => (
                <button
                  key={provider.type}
                  onClick={() => setSelectedProvider(provider.type)}
                  className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    selectedProvider === provider.type
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-card text-muted-foreground hover:bg-muted border border-border'
                  }`}
                >
                  <div className="text-left">
                    <div className="font-semibold">{provider.name}</div>
                    <div className={`text-xs mt-1 ${selectedProvider === provider.type ? 'text-white/80' : 'text-muted-foreground'}`}>
                      ${provider.costPerMinute.toFixed(2)}/min
                      {provider.type === 'elevenlabs' && ' (73% savings)'}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {currentProvider && (
              <div className="mt-3 text-xs text-muted-foreground">
                <p className="font-medium mb-1">{currentProvider.description}</p>
                <ul className="space-y-0.5">
                  {currentProvider.features.map((feature, idx) => (
                    <li key={idx}>• {feature}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Context Selection */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Context (Optional)</CardTitle>
                <CardDescription>
                  Select a contact or project to provide context to ARIA
                  {isLoadingData && " (Loading...)"}
                  {!isLoadingData && (
                    <span className="text-xs ml-2">
                      ({contacts.length} contacts, {projects.length} projects)
                    </span>
                  )}
                </CardDescription>
              </div>
              <button
                onClick={loadContextData}
                disabled={isLoadingData}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh context data"
              >
                <RefreshCw className={`h-3 w-3 ${isLoadingData ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Contact {isLoadingData && "(Loading...)"}
                </label>
                <select
                  value={selectedContact}
                  onChange={(e) => setSelectedContact(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoadingData}
                >
                  {isLoadingData ? (
                    <option value="">Loading contacts...</option>
                  ) : contacts.length === 0 ? (
                    <option value="">No contacts available</option>
                  ) : (
                    <>
                      <option value="">No contact selected</option>
                      {contacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.first_name} {contact.last_name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Project {isLoadingData && "(Loading...)"}
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoadingData}
                >
                  {isLoadingData ? (
                    <option value="">Loading projects...</option>
                  ) : projects.length === 0 ? (
                    <option value="">No projects available</option>
                  ) : (
                    <>
                      <option value="">No project selected</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Debug info */}
            {!isLoadingData && (
              <div className="mt-4 p-3 bg-muted rounded-md text-xs text-muted-foreground">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Contacts:</span> {contacts.length} loaded
                  </div>
                  <div>
                    <span className="font-medium">Projects:</span> {projects.length} loaded
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Voice Session */}
        <VoiceSession
          provider={selectedProvider}
          contactId={selectedContact || undefined}
          projectId={selectedProject || undefined}
          onSessionEnd={handleSessionEnd}
          onError={handleError}
        />

        {/* Technical Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Technical Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Provider</p>
                <p className="text-sm text-foreground">{currentProvider?.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Cost</p>
                <p className="text-sm text-foreground">${currentProvider?.costPerMinute.toFixed(2)}/min</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Status</p>
                <p className="text-sm text-green-600 font-medium">
                  {currentProvider?.status === 'ready' ? '✓ Ready' : 'Configuring'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Target Latency</p>
                <p className="text-sm text-foreground">&lt;2 seconds</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Connection</p>
                <p className="text-sm text-foreground">WebRTC P2P</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Functions</p>
                <p className="text-sm text-foreground">10 CRM + Intelligence</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                <strong>Available ARIA Functions:</strong> create_contact, add_note, search_contact, log_knock, update_contact_stage, send_sms, make_call, get_weather, search_roofing_knowledge, search_web
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Diagnostics */}
        <VoiceDiagnostics />
      </div>
    </div>
  )
}
