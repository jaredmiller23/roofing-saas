'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, MicOff, PhoneOff, Loader2 } from 'lucide-react'
import { createVoiceProvider, VoiceProviderType, VoiceProvider, FunctionCallEvent, VoiceFunction } from '@/lib/voice/providers'

interface VoiceSessionProps {
  provider?: VoiceProviderType
  contactId?: string
  projectId?: string
  onSessionEnd?: () => void
  onError?: (error: Error) => void
}

type SessionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * Browser API type extensions for mobile features
 * These APIs may not have complete TypeScript definitions
 */
interface WakeLockSentinel {
  release: () => Promise<void>
}

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext
}

/**
 * Detect if the device is mobile
 */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false

  const userAgent = navigator.userAgent.toLowerCase()
  const isMobile = /iphone|ipad|ipod|android|webos|blackberry|windows phone/.test(userAgent)
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  return isMobile || hasTouch
}

/**
 * Detect iOS specifically (has unique audio requirements)
 */
function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false

  const userAgent = navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(userAgent)
}

/**
 * Get optimal audio constraints for the device
 */
function getAudioConstraints(): MediaStreamConstraints['audio'] {
  const isMobile = isMobileDevice()
  const isIOS = isIOSDevice()

  // Use basic constraints for maximum compatibility
  // Browsers will use the closest supported values
  if (isIOS) {
    // iOS Safari - be very conservative
    return {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    }
  } else if (isMobile) {
    // Android and other mobile devices
    return {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    }
  } else {
    // Desktop devices - add optional ideal constraints
    return {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: { ideal: 24000 },
      channelCount: { ideal: 1 },
    }
  }
}

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
  provider = 'openai',
  contactId,
  projectId,
  onSessionEnd,
  onError
}: VoiceSessionProps) {
  // Session state
  const [status, setStatus] = useState<SessionStatus>('idle')
  const [isMuted, setIsMuted] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [conversationHistory] = useState<ConversationMessage[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Provider and stream refs
  const voiceProviderRef = useRef<VoiceProvider | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  /**
   * Initialize voice session using selected provider
   * 1. Request microphone permission
   * 2. Create provider instance
   * 3. Initialize session and establish connection
   */
  const startSession = useCallback(async () => {
    try {
      setStatus('connecting')
      setErrorMessage(null) // Clear any previous errors

      // Step 1: Get microphone access with progressive fallback
      let stream: MediaStream | null = null

      // Try #1: Device-optimized constraints
      try {
        const audioConstraints = getAudioConstraints()
        console.log('Trying audio constraints:', audioConstraints)
        stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints
        })
      } catch (err) {
        console.warn('Failed with optimized constraints, trying basic...', err)

        // Try #2: Just echo cancellation
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true }
          })
        } catch (err2) {
          console.warn('Failed with echo cancellation, trying raw audio...', err2)

          // Try #3: No constraints at all - just get any audio
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true
          })
        }
      }

      if (!stream) {
        throw new Error('Failed to access microphone')
      }

      audioStreamRef.current = stream
      console.log('✓ Microphone access granted')

      // For iOS: Initialize Audio Context to ensure audio can play
      if (isIOSDevice() && typeof window !== 'undefined') {
        const AudioContextConstructor = window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext
        if (AudioContextConstructor) {
          const audioContext = new AudioContextConstructor()
          if (audioContext.state === 'suspended') {
            await audioContext.resume()
          }
        }
      }

      // Step 2: Create voice provider instance
      const voiceProvider = createVoiceProvider(provider)
      voiceProviderRef.current = voiceProvider

      // Step 3: Define CRM tools for the provider
      const crmTools: VoiceFunction[] = [
        {
          type: 'function' as const,
          name: 'create_contact',
          description: 'Create a new contact (lead/customer) in the CRM',
          parameters: {
            type: 'object' as const,
            properties: {
              first_name: { type: 'string' },
              last_name: { type: 'string' },
              phone: { type: 'string' },
              address: { type: 'string' },
            },
            required: ['first_name', 'last_name']
          }
        },
        {
          type: 'function' as const,
          name: 'search_contact',
          description: 'Search for a contact by name or address',
          parameters: {
            type: 'object' as const,
            properties: {
              query: { type: 'string' }
            },
            required: ['query']
          }
        },
        {
          type: 'function' as const,
          name: 'add_note',
          description: 'Add a note to an existing contact or project',
          parameters: {
            type: 'object' as const,
            properties: {
              entity_id: { type: 'string' },
              note: { type: 'string' }
            },
            required: ['entity_id', 'note']
          }
        },
        {
          type: 'function' as const,
          name: 'log_knock',
          description: 'Log a door knock activity at an address',
          parameters: {
            type: 'object' as const,
            properties: {
              address: { type: 'string' },
              disposition: {
                type: 'string',
                enum: ['interested', 'not_interested', 'not_home']
              }
            },
            required: ['address', 'disposition']
          }
        },
        {
          type: 'function' as const,
          name: 'update_contact_stage',
          description: 'Update the pipeline stage of a contact',
          parameters: {
            type: 'object' as const,
            properties: {
              contact_id: { type: 'string' },
              stage: {
                type: 'string',
                enum: ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']
              }
            },
            required: ['contact_id', 'stage']
          }
        }
      ]

      // Step 4: Initialize session with provider
      const sessionResponse = await voiceProvider.initSession({
        provider,
        contactId,
        projectId,
        instructions: undefined, // Use provider defaults
        voice: undefined,
        temperature: undefined,
        tools: crmTools,
      })

      setSessionId(sessionResponse.session_id)

      // Step 4: Establish WebRTC connection with provider
      const isMobile = isMobileDevice()
      await voiceProvider.establishConnection(
        sessionResponse,
        stream,
        (event: FunctionCallEvent) => {
          // Handle function calls
          executeCRMFunction(event.name, event.parameters, event.call_id)
        },
        async () => {
          // On connected
          console.log(`${provider} voice assistant connected`)
          setStatus('connected')

          // Request wake lock on mobile
          if (isMobile && 'wakeLock' in navigator) {
            try {
              const wakeLock = await (navigator as { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> } }).wakeLock?.request('screen')
              if (wakeLock) {
                wakeLockRef.current = wakeLock
                console.log('[Mobile] Wake lock acquired')
              }
            } catch (err) {
              console.warn('[Mobile] Failed to acquire wake lock:', err)
            }
          }
        },
        () => {
          // On disconnected
          console.log(`${provider} voice assistant disconnected`)
          setStatus('disconnected')
        }
      )

      console.log(`${provider} voice session established`)
    } catch (error) {
      const err = error as Error
      console.error('Failed to start voice session:', err)
      setStatus('error')
      setErrorMessage(err.message)
      onError?.(err)
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, contactId, projectId, onError])
  // Note: cleanup and executeCRMFunction are stable refs, intentionally excluded


  /**
   * Execute CRM function and send result back to provider
   */
  const executeCRMFunction = useCallback(async (
    functionName: string,
    parameters: Record<string, unknown>,
    callId: string
  ) => {
    try {
      console.log(`Executing function: ${functionName}`, parameters)

      let apiResult: unknown

      switch (functionName) {
        case 'create_contact':
          apiResult = await fetch('/api/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parameters)
          }).then(r => r.json())
          break

        case 'add_note':
          apiResult = await fetch('/api/activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              activity_type: 'note',
              ...parameters
            })
          }).then(r => r.json())
          break

        case 'search_contact':
          apiResult = await fetch(`/api/contacts?search=${encodeURIComponent(parameters.query as string)}`)
            .then(r => r.json())
          break

        case 'log_knock':
          apiResult = await fetch('/api/knocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: parameters.address,
              disposition: parameters.disposition,
              notes: parameters.notes,
              contact_id: parameters.contact_id,
              latitude: 0,
              longitude: 0
            })
          }).then(r => r.json())
          break

        case 'update_contact_stage':
          apiResult = await fetch(`/api/contacts/${parameters.contact_id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stage: parameters.stage
            })
          }).then(r => r.json())
          break

        case 'send_sms':
          apiResult = await fetch('/api/sms/send', {
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
          apiResult = await fetch('/api/voice/call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: parameters.to,
              contactId: parameters.contact_id,
              record: parameters.record !== false
            })
          }).then(r => r.json())
          break

        case 'get_weather':
          apiResult = await fetch('/api/voice/weather', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: parameters.location || 'Nashville,TN,US',
              days: parameters.days || 3
            })
          }).then(r => r.json())
          break

        case 'search_roofing_knowledge':
          apiResult = await fetch('/api/voice/search-rag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: parameters.query
            })
          }).then(r => r.json())
          break

        case 'search_web':
          apiResult = await fetch('/api/voice/search-web', {
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

      // Send result back to provider
      if (voiceProviderRef.current) {
        voiceProviderRef.current.sendFunctionResult({
          call_id: callId,
          result: {
            success: true,
            data: apiResult as Record<string, unknown> | Array<Record<string, unknown>> | string | number | boolean | null
          }
        })
      }
    } catch (error) {
      console.error(`Error executing ${functionName}:`, error)

      // Send error back to provider
      if (voiceProviderRef.current) {
        voiceProviderRef.current.sendFunctionResult({
          call_id: callId,
          result: {
            success: false,
            error: (error as Error).message
          }
        })
      }
    }
  }, [])

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
   * Cleanup resources
   */
  const cleanup = useCallback(() => {
    // Stop audio stream
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop())
      audioStreamRef.current = null
    }

    // Cleanup provider
    if (voiceProviderRef.current) {
      voiceProviderRef.current.cleanup()
      voiceProviderRef.current = null
    }

    // Release wake lock on mobile
    if (wakeLockRef.current) {
      wakeLockRef.current.release()
        .then(() => console.log('[Mobile] Wake lock released'))
        .catch((err: Error) => console.warn('[Mobile] Failed to release wake lock:', err))
      wakeLockRef.current = null
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
    <div className="flex flex-col items-center justify-center space-y-4 p-4 md:p-6 bg-card rounded-lg shadow-lg">
      {/* Status indicator */}
      <div className="text-center">
        <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm md:text-base font-medium ${
          status === 'connected' ? 'bg-green-100 text-green-800' :
          status === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
          status === 'error' ? 'bg-red-100 text-red-800' :
          'bg-muted text-muted-foreground'
        }`}>
          {status === 'connecting' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {status === 'idle' && 'Ready to start'}
          {status === 'connecting' && 'Connecting...'}
          {status === 'connected' && 'Connected'}
          {status === 'disconnected' && 'Disconnected'}
          {status === 'error' && 'Connection error'}
        </div>

        {/* Error message */}
        {status === 'error' && errorMessage && (
          <div className="mt-2 text-xs text-red-600 max-w-md">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Session ID */}
      {sessionId && (
        <p className="text-xs text-muted-foreground">
          Session: {sessionId.slice(0, 8)}...
        </p>
      )}

      {/* Controls - Mobile-optimized touch targets */}
      <div className="flex items-center space-x-4">
        {status === 'idle' && (
          <button
            onClick={startSession}
            className="flex items-center px-6 py-4 md:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium text-base md:text-sm touch-manipulation"
          >
            <Mic className="w-5 h-5 md:w-5 md:h-5 mr-2" />
            Start Voice Assistant
          </button>
        )}

        {status === 'connected' && (
          <>
            <button
              onClick={toggleMute}
              className={`p-5 md:p-4 rounded-full transition-colors touch-manipulation ${
                isMuted
                  ? 'bg-red-100 text-red-600 hover:bg-red-200 active:bg-red-300'
                  : 'bg-gray-100 text-muted-foreground hover:bg-muted active:bg-gray-300'
              }`}
              aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="w-7 h-7 md:w-6 md:h-6" /> : <Mic className="w-7 h-7 md:w-6 md:h-6" />}
            </button>

            <button
              onClick={endSession}
              className="p-5 md:p-4 bg-red-600 text-white rounded-full hover:bg-red-700 active:bg-red-800 transition-colors touch-manipulation"
              aria-label="End voice session"
            >
              <PhoneOff className="w-7 h-7 md:w-6 md:h-6" />
            </button>
          </>
        )}
      </div>

      {/* Instructions */}
      {status === 'idle' && (
        <div className="text-center text-sm md:text-base text-muted-foreground max-w-md px-4">
          <p>
            {isMobileDevice() ? 'Tap' : 'Click'} &quot;Start Voice Assistant&quot; to begin speaking with your AI assistant.
          </p>
          <p className="mt-2">You can create contacts, add notes, search your CRM, log door knocks, and update pipeline stages using voice commands.</p>
          {isMobileDevice() && (
            <p className="mt-2 text-xs text-blue-600">
              📱 Mobile optimized for field use
            </p>
          )}
        </div>
      )}

      {status === 'connected' && (
        <div className="text-center text-sm md:text-base text-muted-foreground max-w-md px-4">
          <p className="font-medium">🎤 Listening... You can now speak to your assistant.</p>
          <p className="mt-2 text-xs md:text-sm">Try: &quot;Log a door knock at 123 Main St, disposition interested&quot;</p>
          {isMobileDevice() && (
            <p className="mt-2 text-xs text-blue-600">
              Optimized for {isIOSDevice() ? 'iOS' : 'Android'} audio
            </p>
          )}
        </div>
      )}

      {/* Conversation Transcript */}
      {conversationHistory.length > 0 && (
        <div className="w-full max-w-2xl mt-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Conversation Transcript</h3>
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
                      ? 'bg-muted text-foreground'
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
