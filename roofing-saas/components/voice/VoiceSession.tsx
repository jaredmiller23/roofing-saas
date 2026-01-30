'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, MicOff, PhoneOff, Loader2 } from 'lucide-react'
import { createVoiceProvider, VoiceProviderType, VoiceProvider, FunctionCallEvent, VoiceFunction } from '@/lib/voice/providers'
import { ApprovalModal } from '@/components/aria/ApprovalModal'
import type { ARIAExecutionResult } from '@/lib/aria/types'

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

interface PendingApproval {
  result: ARIAExecutionResult
  callId: string
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

  // HITL approval state
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)

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

      // Step 3: Fetch ARIA function tools from the server
      // This includes CRM, QuickBooks, SMS, Email, Weather, and more
      let ariaTools: VoiceFunction[] = []
      try {
        const toolsResponse = await fetch('/api/aria/execute')
        if (toolsResponse.ok) {
          const toolsData = await toolsResponse.json()
          ariaTools = toolsData.data?.functions || []
          console.log(`✓ Loaded ${ariaTools.length} ARIA functions`)
        } else {
          console.warn('Failed to load ARIA functions, using fallback')
        }
      } catch (err) {
        console.warn('Error loading ARIA functions:', err)
      }

      // Step 4: Fetch contact's preferred language (if contact provided)
      let contactLanguage: string | undefined
      if (contactId) {
        try {
          const contactRes = await fetch(`/api/contacts/${contactId}`)
          if (contactRes.ok) {
            const contactData = await contactRes.json()
            contactLanguage = contactData.data?.preferred_language
          }
        } catch { /* ignore — language is optional */ }
      }

      // Step 5: Initialize session with provider
      const sessionResponse = await voiceProvider.initSession({
        provider,
        contactId,
        projectId,
        instructions: undefined, // Use provider defaults
        voice: undefined,
        temperature: undefined,
        tools: ariaTools,
        language: contactLanguage,
      })

      setSessionId(sessionResponse.session_id)

      // Step 6: Establish WebRTC connection with provider
      const isMobile = isMobileDevice()
      await voiceProvider.establishConnection(
        sessionResponse,
        stream,
        (event: FunctionCallEvent) => {
          // Handle function calls via ARIA orchestrator
          executeARIAFunction(event.name, event.parameters, event.call_id)
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
      console.error('Error stack:', err.stack)
      setStatus('error')
      setErrorMessage(err.message)
      onError?.(err)
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, contactId, projectId, onError])
  // Note: cleanup and executeARIAFunction are defined below - intentionally excluded to avoid circular dependency


  /**
   * Execute ARIA function via API and send result back to provider
   * Uses the unified ARIA orchestrator for all function calls
   */
  const executeARIAFunction = useCallback(async (
    functionName: string,
    parameters: Record<string, unknown>,
    callId: string
  ) => {
    try {
      console.log(`Executing ARIA function: ${functionName}`, parameters)

      // Call ARIA execute endpoint - handles all function types
      const response = await fetch('/api/aria/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          function_name: functionName,
          parameters,
          context: {
            contact_id: contactId,
            project_id: projectId,
            channel: 'voice_outbound',
            session_id: sessionId,
          },
        }),
      })

      const result = await response.json()

      // Check if result requires human approval
      if (result.data?.awaitingApproval && result.data?.draft) {
        console.log('Function result requires approval, showing modal')
        setPendingApproval({
          result: result.data,
          callId,
        })
        setShowApprovalModal(true)
        return // Don't send result back yet, wait for approval
      }

      // Send normal result back to provider
      if (voiceProviderRef.current) {
        voiceProviderRef.current.sendFunctionResult({
          call_id: callId,
          result: {
            success: result.data?.success ?? result.success,
            data: result.data?.data ?? result.data,
            message: result.data?.message,
            error: result.data?.error,
          },
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
            error: (error as Error).message,
          },
        })
      }
    }
  }, [contactId, projectId, sessionId])

  /**
   * Handle approval modal approval - inform voice AI of success
   */
  const handleApprovalApproved = useCallback(() => {
    if (pendingApproval && voiceProviderRef.current) {
      console.log('User approved draft, informing voice AI')
      voiceProviderRef.current.sendFunctionResult({
        call_id: pendingApproval.callId,
        result: {
          success: true,
          message: `${pendingApproval.result.draft?.type?.toUpperCase()} message sent successfully after user approval.`,
          data: { approved: true, sent: true },
        },
      })
    }
    // Clean up approval state
    setPendingApproval(null)
    setShowApprovalModal(false)
  }, [pendingApproval])

  /**
   * Handle approval modal cancellation - inform voice AI of cancellation
   */
  const handleApprovalCancelled = useCallback(() => {
    if (pendingApproval && voiceProviderRef.current) {
      console.log('User cancelled draft, informing voice AI')
      voiceProviderRef.current.sendFunctionResult({
        call_id: pendingApproval.callId,
        result: {
          success: false,
          message: `User cancelled the ${pendingApproval.result.draft?.type || 'message'} draft. The message was not sent.`,
          data: { approved: false, sent: false },
        },
      })
    }
    // Clean up approval state
    setPendingApproval(null)
    setShowApprovalModal(false)
  }, [pendingApproval])

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
            className="flex items-center px-6 py-4 md:py-3 bg-primary text-white rounded-lg hover:bg-primary/90 active:bg-primary/80 transition-colors font-medium text-base md:text-sm touch-manipulation"
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
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 active:bg-muted/70'
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
            <p className="mt-2 text-xs text-primary">
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
            <p className="mt-2 text-xs text-primary">
              Optimized for {isIOSDevice() ? 'iOS' : 'Android'} audio
            </p>
          )}
        </div>
      )}

      {/* Conversation Transcript */}
      {conversationHistory.length > 0 && (
        <div className="w-full max-w-2xl mt-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Conversation Transcript</h3>
          <div className="bg-muted/30 rounded-lg p-4 max-h-96 overflow-y-auto space-y-3">
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

      {/* HITL Approval Modal */}
      {pendingApproval?.result.draft && (
        <ApprovalModal
          draft={pendingApproval.result.draft}
          isOpen={showApprovalModal}
          onClose={handleApprovalCancelled}
          onApproved={handleApprovalApproved}
        />
      )}
    </div>
  )
}
