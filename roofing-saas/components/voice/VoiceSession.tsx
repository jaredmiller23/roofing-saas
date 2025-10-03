'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, MicOff, PhoneOff, Loader2 } from 'lucide-react'

interface VoiceSessionProps {
  contactId?: string
  projectId?: string
  onSessionEnd?: () => void
  onError?: (error: Error) => void
}

type SessionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

interface ConversationMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  functionCall?: {
    name: string
    parameters: Record<string, unknown>
    result?: unknown
  }
}

interface SessionConfig {
  instructions: string
  voice: string
  temperature: number
  turn_detection?: {
    type: string
    threshold?: number
    prefix_padding_ms?: number
    silence_duration_ms?: number
  }
  input_audio_transcription?: {
    model: string
  }
  tools: Array<{
    type: string
    name: string
    description: string
    parameters: object
  }>
}

/**
 * VoiceSession Component
 *
 * Manages OpenAI Realtime API voice assistant session with WebRTC
 * - Establishes peer-to-peer WebRTC connection
 * - Handles microphone audio streaming
 * - Processes function calls for CRM actions
 * - Manages session lifecycle
 */
export function VoiceSession({
  contactId,
  projectId,
  onSessionEnd,
  onError
}: VoiceSessionProps) {
  // Session state
  const [status, setStatus] = useState<SessionStatus>('idle')
  const [isMuted, setIsMuted] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([])

  // WebRTC refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)

  /**
   * Initialize voice session
   * 1. Request microphone permission
   * 2. Create session with backend
   * 3. Establish WebRTC connection
   */
  const startSession = useCallback(async () => {
    try {
      setStatus('connecting')

      // Step 1: Get microphone access with OpenAI-optimized constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1, // mono
          sampleRate: 24000, // 24kHz for OpenAI
          echoCancellation: true,
          noiseSuppression: true
        }
      })
      audioStreamRef.current = stream

      // Step 2: Create session and get ephemeral token
      const sessionResponse = await fetch('/api/voice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: contactId,
          project_id: projectId,
          context: {
            timestamp: new Date().toISOString(),
          }
        })
      })

      if (!sessionResponse.ok) {
        throw new Error('Failed to create voice session')
      }

      const responseData = await sessionResponse.json()
      const { session_id, ephemeral_token } = responseData.data
      console.log('Received session from backend:', {
        session_id,
        tokenType: typeof ephemeral_token,
        tokenLength: ephemeral_token?.length,
        tokenStart: ephemeral_token?.substring(0, 30) + '...',
        fullToken: ephemeral_token // DEBUG: show full token
      })
      setSessionId(session_id)

      // Step 3: Create RTCPeerConnection with STUN server
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      })
      peerConnectionRef.current = pc

      // Step 4: Add remote audio track handler (before other setup)
      pc.addEventListener('track', (event) => {
        const remoteAudio = new Audio()
        remoteAudio.srcObject = event.streams[0]
        remoteAudio.play()
      })

      // Step 5: Add microphone track to peer connection (BEFORE data channel!)
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream)
      })

      // Step 6: Create data channel for events
      const dc = pc.createDataChannel('oai-events')
      dataChannelRef.current = dc

      // Setup data channel event handlers
      dc.addEventListener('open', () => {
        console.log('Data channel opened')
        setStatus('connected')

        // Configure session with CRM function calling
        const config: SessionConfig = {
          instructions: `You are a helpful AI assistant for a roofing field team with full conversation context awareness.

**Context & Memory:**
- You maintain full conversation context throughout our interaction
- Reference previous messages naturally (e.g., "that contact", "the address you mentioned")
- Ask contextual follow-up questions (e.g., "Would you like to log a knock there too?")
- Remember entities from earlier turns (contacts, addresses, projects)
- Use pronouns when context is clear instead of repeating names

**Your Capabilities:**

CRM Actions:
- Create new contacts (leads/customers)
- Add notes to contacts or projects
- Search for existing contacts by name or address
- Log door knock activities with disposition (interested, not_interested, not_home, callback, appointment)
- Update contact pipeline stage (new, contacted, qualified, proposal, negotiation, won, lost)

Communication:
- Send SMS messages (e.g., "Send a text to 5551234567 saying 'Running 10 minutes late'")
- Initiate phone calls (e.g., "Call Sarah Johnson at 5559876543")
- Always confirm SMS content and phone calls before executing

Intelligence Features:
- Get weather forecasts for roofing work planning
- Search roofing knowledge base for warranties, materials, best practices
- Search the web for current market intelligence

**Important Guidelines:**
- Read phone numbers digit-by-digit (e.g., "4-2-3-5-5-5-5-5-5-5" not "four hundred twenty-three")
- Be concise and professional
- Ask clarifying questions when context is ambiguous
- Always confirm actions before executing
- Suggest related actions based on conversation context

**Multi-turn Examples:**
User: "Create a contact named Sarah Johnson at 555-9876"
You: [creates contact] "Done! Sarah Johnson is now in the system. Would you like to add any notes about her?"

User: "Log a knock at 123 Oak Street, they were interested"
You: [logs knock] "Recorded! Should I create a contact for this address or schedule a follow-up?"`,
          voice: 'alloy',
          temperature: 0.7,
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500
          },
          input_audio_transcription: {
            model: 'whisper-1'
          },
          tools: [
            {
              type: 'function',
              name: 'create_contact',
              description: 'Create a new contact (lead/customer) in the CRM',
              parameters: {
                type: 'object',
                properties: {
                  first_name: { type: 'string' },
                  last_name: { type: 'string' },
                  phone: { type: 'string' },
                  address: { type: 'string' },
                  notes: { type: 'string' }
                },
                required: ['first_name', 'last_name']
              }
            },
            {
              type: 'function',
              name: 'add_note',
              description: 'Add a note to an existing contact or project',
              parameters: {
                type: 'object',
                properties: {
                  entity_type: {
                    type: 'string',
                    enum: ['contact', 'project']
                  },
                  entity_id: { type: 'string' },
                  note: { type: 'string' }
                },
                required: ['entity_type', 'entity_id', 'note']
              }
            },
            {
              type: 'function',
              name: 'search_contact',
              description: 'Search for a contact by name or address',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string' }
                },
                required: ['query']
              }
            },
            {
              type: 'function',
              name: 'log_knock',
              description: 'Log a door knock activity at an address',
              parameters: {
                type: 'object',
                properties: {
                  address: { type: 'string' },
                  disposition: {
                    type: 'string',
                    enum: ['interested', 'not_interested', 'not_home', 'callback', 'appointment']
                  },
                  notes: { type: 'string' },
                  contact_id: { type: 'string', description: 'Optional contact ID if known' }
                },
                required: ['address', 'disposition']
              }
            },
            {
              type: 'function',
              name: 'update_contact_stage',
              description: 'Update the pipeline stage of a contact',
              parameters: {
                type: 'object',
                properties: {
                  contact_id: { type: 'string' },
                  stage: {
                    type: 'string',
                    enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
                  }
                },
                required: ['contact_id', 'stage']
              }
            },
            {
              type: 'function',
              name: 'send_sms',
              description: 'Send a text message (SMS) to a contact or phone number',
              parameters: {
                type: 'object',
                properties: {
                  to: {
                    type: 'string',
                    description: 'Phone number to send to (10 digits, e.g., 5551234567)'
                  },
                  body: {
                    type: 'string',
                    description: 'The text message to send (max 1600 characters)'
                  },
                  contact_id: {
                    type: 'string',
                    description: 'Optional contact ID to associate this SMS with'
                  }
                },
                required: ['to', 'body']
              }
            },
            {
              type: 'function',
              name: 'make_call',
              description: 'Initiate a phone call to a contact or phone number',
              parameters: {
                type: 'object',
                properties: {
                  to: {
                    type: 'string',
                    description: 'Phone number to call (10 digits, e.g., 5551234567)'
                  },
                  contact_id: {
                    type: 'string',
                    description: 'Optional contact ID to associate this call with'
                  },
                  record: {
                    type: 'boolean',
                    description: 'Whether to record the call (default: true)'
                  }
                },
                required: ['to']
              }
            },
            {
              type: 'function',
              name: 'get_weather',
              description: 'Get weather forecast for a location to plan roofing work',
              parameters: {
                type: 'object',
                properties: {
                  location: {
                    type: 'string',
                    description: 'Location (city, state, or zip code). Defaults to Nashville, TN'
                  },
                  days: {
                    type: 'number',
                    description: 'Number of forecast days (1-7). Default: 3'
                  }
                },
                required: []
              }
            },
            {
              type: 'function',
              name: 'search_roofing_knowledge',
              description: 'Search roofing knowledge base for technical information, best practices, materials, warranties, and installation techniques',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'What to search for (e.g., "GAF Timberline warranty", "ice dam prevention", "metal roof installation")'
                  }
                },
                required: ['query']
              }
            },
            {
              type: 'function',
              name: 'search_web',
              description: 'Search the web for current information like pricing, availability, weather alerts, or competitor research',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'What to search for (e.g., "copper flashing price", "storm warnings Nashville", "metal roofing trends 2025")'
                  }
                },
                required: ['query']
              }
            }
          ]
        }

        dc.send(JSON.stringify({
          type: 'session.update',
          session: config
        }))

        // Send initial greeting trigger with CRM context
        setTimeout(async () => {
          let contextMessage = 'Hello'

          // Inject contact context if available
          if (contactId) {
            try {
              const contactRes = await fetch(`/api/contacts/${contactId}`)
              if (contactRes.ok) {
                const contactData = await contactRes.json()
                const contact = contactData.contact
                contextMessage = `Hello. I'm currently working with ${contact.first_name} ${contact.last_name}${contact.phone ? ` (${contact.phone})` : ''}${contact.address ? ` at ${contact.address}` : ''}.`
              }
            } catch (err) {
              console.error('Failed to fetch contact context:', err)
            }
          }

          // Inject project context if available
          if (projectId) {
            try {
              const projectRes = await fetch(`/api/projects/${projectId}`)
              if (projectRes.ok) {
                const projectData = await projectRes.json()
                const project = projectData.project
                contextMessage = `Hello. I'm currently working on project: ${project.name}${project.status ? ` (${project.status})` : ''}.`
              }
            } catch (err) {
              console.error('Failed to fetch project context:', err)
            }
          }

          dc.send(JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'message',
              role: 'user',
              content: [{
                type: 'input_text',
                text: contextMessage
              }]
            }
          }))

          // Trigger response
          dc.send(JSON.stringify({
            type: 'response.create'
          }))
        }, 100) // Small delay to ensure session is ready
      })

      dc.addEventListener('message', handleDataChannelMessage)
      dc.addEventListener('close', () => {
        console.log('Data channel closed')
        setStatus('disconnected')
      })

      // Step 7: Create offer and set local description
      await pc.setLocalDescription()

      // Step 8: Send offer to OpenAI Realtime API
      console.log('Connecting to OpenAI Realtime API...', {
        endpoint: 'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
        hasToken: !!ephemeral_token,
        hasSdp: !!pc.localDescription?.sdp
      })

      const sdpResponse = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ephemeral_token}`,
          'Content-Type': 'application/sdp'
        },
        body: pc.localDescription?.sdp
      })

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text()
        console.error('OpenAI Realtime API error:', {
          status: sdpResponse.status,
          statusText: sdpResponse.statusText,
          body: errorText
        })
        throw new Error(`Failed to connect to OpenAI Realtime API: ${sdpResponse.status} ${errorText}`)
      }

      // Step 9: Set remote description from answer
      const answer = {
        type: 'answer' as RTCSdpType,
        sdp: await sdpResponse.text()
      }
      await pc.setRemoteDescription(answer)

      console.log('WebRTC connection established')
    } catch (error) {
      console.error('Failed to start voice session:', error)
      setStatus('error')
      onError?.(error as Error)
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, projectId, onError])
  // Note: cleanup and handleDataChannelMessage are stable refs, intentionally excluded

  /**
   * Handle messages from OpenAI via data channel
   */
  const handleDataChannelMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data)
      console.log('Received message:', message.type)

      // Track user transcription
      if (message.type === 'conversation.item.input_audio_transcription.completed') {
        const userMessage: ConversationMessage = {
          id: message.item_id || Date.now().toString(),
          role: 'user',
          content: message.transcript || '',
          timestamp: new Date()
        }
        setConversationHistory(prev => [...prev, userMessage])
      }

      // Track assistant response transcript
      if (message.type === 'response.audio_transcript.done') {
        const assistantMessage: ConversationMessage = {
          id: message.item_id || Date.now().toString(),
          role: 'assistant',
          content: message.transcript || '',
          timestamp: new Date()
        }
        setConversationHistory(prev => [...prev, assistantMessage])
      }

      // Handle function calls
      if (message.type === 'response.function_call_arguments.done') {
        const { name, call_id, arguments: args } = message

        // Track function call in conversation
        const functionMessage: ConversationMessage = {
          id: call_id || Date.now().toString(),
          role: 'system',
          content: `Executing: ${name}`,
          timestamp: new Date(),
          functionCall: {
            name,
            parameters: JSON.parse(args)
          }
        }
        setConversationHistory(prev => [...prev, functionMessage])

        executeCRMFunction(name, JSON.parse(args), call_id)
      }
    } catch (error) {
      console.error('Error handling data channel message:', error)
    }
  }, [])

  /**
   * Execute CRM function and send result back to OpenAI
   */
  const executeCRMFunction = async (
    functionName: string,
    parameters: Record<string, unknown>,
    callId: string
  ) => {
    try {
      console.log(`Executing function: ${functionName}`, parameters)

      let result: unknown

      switch (functionName) {
        case 'create_contact':
          result = await fetch('/api/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parameters)
          }).then(r => r.json())
          break

        case 'add_note':
          result = await fetch('/api/activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              activity_type: 'note',
              ...parameters
            })
          }).then(r => r.json())
          break

        case 'search_contact':
          result = await fetch(`/api/contacts?search=${encodeURIComponent(parameters.query as string)}`)
            .then(r => r.json())
          break

        case 'log_knock':
          result = await fetch('/api/knocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: parameters.address,
              disposition: parameters.disposition,
              notes: parameters.notes,
              contact_id: parameters.contact_id,
              // Use approximate coordinates if address geocoding not available
              // In production, you'd geocode the address
              latitude: 0,
              longitude: 0
            })
          }).then(r => r.json())
          break

        case 'update_contact_stage':
          result = await fetch(`/api/contacts/${parameters.contact_id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stage: parameters.stage
            })
          }).then(r => r.json())
          break

        case 'send_sms':
          result = await fetch('/api/sms/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: parameters.to,
              body: parameters.body,
              contactId: parameters.contact_id
            })
          }).then(r => r.json())
          break

        case 'make_call':
          result = await fetch('/api/voice/call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: parameters.to,
              contactId: parameters.contact_id,
              record: parameters.record !== false // Default to true
            })
          }).then(r => r.json())
          break

        case 'get_weather':
          result = await fetch('/api/voice/weather', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: parameters.location || 'Nashville,TN,US',
              days: parameters.days || 3
            })
          }).then(r => r.json())
          break

        case 'search_roofing_knowledge':
          result = await fetch('/api/voice/search-rag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: parameters.query
            })
          }).then(r => r.json())
          break

        case 'search_web':
          result = await fetch('/api/voice/search-web', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: parameters.query
            })
          }).then(r => r.json())
          break

        default:
          throw new Error(`Unknown function: ${functionName}`)
      }

      // Send result back to OpenAI
      if (dataChannelRef.current) {
        dataChannelRef.current.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: callId,
            output: JSON.stringify(result)
          }
        }))

        // Trigger OpenAI to generate response based on function result
        dataChannelRef.current.send(JSON.stringify({
          type: 'response.create'
        }))
      }
    } catch (error) {
      console.error(`Error executing ${functionName}:`, error)

      // Send error back to OpenAI
      if (dataChannelRef.current) {
        dataChannelRef.current.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: callId,
            output: JSON.stringify({ error: (error as Error).message })
          }
        }))

        // Trigger OpenAI to generate response even for errors
        dataChannelRef.current.send(JSON.stringify({
          type: 'response.create'
        }))
      }
    }
  }

  /**
   * Toggle microphone mute
   */
  const toggleMute = useCallback(() => {
    if (audioStreamRef.current) {
      const audioTracks = audioStreamRef.current.getAudioTracks()
      audioTracks.forEach(track => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }, [isMuted])

  /**
   * End voice session
   */
  const endSession = useCallback(() => {
    cleanup()
    setStatus('disconnected')
    onSessionEnd?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSessionEnd])
  // Note: cleanup is a stable ref, intentionally excluded

  /**
   * Cleanup WebRTC resources
   */
  const cleanup = useCallback(() => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop())
      audioStreamRef.current = null
    }

    if (dataChannelRef.current) {
      dataChannelRef.current.close()
      dataChannelRef.current = null
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    setSessionId(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-6 bg-white rounded-lg shadow-lg">
      {/* Status indicator */}
      <div className="text-center">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          status === 'connected' ? 'bg-green-100 text-green-800' :
          status === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
          status === 'error' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {status === 'connecting' && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
          {status === 'idle' && 'Ready to start'}
          {status === 'connecting' && 'Connecting...'}
          {status === 'connected' && 'Connected'}
          {status === 'disconnected' && 'Disconnected'}
          {status === 'error' && 'Connection error'}
        </div>
      </div>

      {/* Session ID */}
      {sessionId && (
        <p className="text-xs text-gray-500">
          Session: {sessionId.slice(0, 8)}...
        </p>
      )}

      {/* Controls */}
      <div className="flex items-center space-x-4">
        {status === 'idle' && (
          <button
            onClick={startSession}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Mic className="w-5 h-5 mr-2" />
            Start Voice Assistant
          </button>
        )}

        {status === 'connected' && (
          <>
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full transition-colors ${
                isMuted
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            <button
              onClick={endSession}
              className="p-4 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Instructions */}
      {status === 'idle' && (
        <div className="text-center text-sm text-gray-600 max-w-md">
          <p>Click &quot;Start Voice Assistant&quot; to begin speaking with your AI assistant.</p>
          <p className="mt-2">You can create contacts, add notes, search your CRM, log door knocks, and update pipeline stages using voice commands.</p>
        </div>
      )}

      {status === 'connected' && (
        <div className="text-center text-sm text-gray-600 max-w-md">
          <p>Listening... You can now speak to your assistant.</p>
          <p className="mt-2">Try: &quot;Log a door knock at 123 Main St, disposition interested&quot;</p>
        </div>
      )}

      {/* Conversation Transcript */}
      {conversationHistory.length > 0 && (
        <div className="w-full max-w-2xl mt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Conversation Transcript</h3>
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto space-y-3">
            {conversationHistory.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.role === 'assistant'
                      ? 'bg-gray-200 text-gray-900'
                      : 'bg-purple-100 text-purple-900 text-xs'
                  }`}
                >
                  {message.role === 'system' && message.functionCall ? (
                    <div>
                      <p className="font-semibold">{message.content}</p>
                      <p className="text-xs mt-1 opacity-75">
                        {JSON.stringify(message.functionCall.parameters, null, 2).slice(0, 100)}
                        {JSON.stringify(message.functionCall.parameters).length > 100 && '...'}
                      </p>
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                  <p className="text-xs opacity-75 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
