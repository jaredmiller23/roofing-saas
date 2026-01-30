/**
 * ElevenLabs Conversational AI Voice Provider
 * Implements WebRTC-based voice assistant using ElevenLabs SDK
 */

import {
  VoiceProvider,
  VoiceProviderConfig,
  SessionResponse,
  FunctionCallEvent,
  FunctionResultEvent,
  FunctionCallParameters,
  FunctionCallResult,
} from './types'
import { logger } from '@/lib/logger'
import { Conversation } from '@elevenlabs/client'

export class ElevenLabsProvider extends VoiceProvider {
  readonly name = 'elevenlabs' as const

  private conversation: Conversation | null = null
  private isConnected: boolean = false
  private pendingResolvers: Map<string, (value: FunctionCallResult) => void> = new Map()

  async initSession(config: VoiceProviderConfig): Promise<SessionResponse> {
    // Get signed URL from backend
    const response = await fetch('/api/voice/session/elevenlabs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_id: config.contactId,
        project_id: config.projectId,
        agent_id: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID,
        language: config.language,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create ElevenLabs voice session')
    }

    const data = await response.json()
    const { session_id, signed_url, agent_id } = data.data

    // Build language-aware instructions for ElevenLabs
    const languageNames: Record<string, string> = { es: 'Spanish', fr: 'French' }
    let instructions = config.instructions
    if (config.language && config.language !== 'en' && languageNames[config.language]) {
      const langName = languageNames[config.language]
      instructions = `${instructions || ''}\n\nYou MUST respond in ${langName}. All spoken responses must be in ${langName}.`
    }

    return {
      session_id,
      provider: 'elevenlabs',
      ephemeral_token: signed_url,
      agent_id,
      language: config.language,
      config: {
        instructions,
        voice: config.voice,
        temperature: config.temperature,
        tools: config.tools,
      },
    }
  }

  async establishConnection(
    sessionResponse: SessionResponse,
    audioStream: MediaStream,
    onFunctionCall: (event: FunctionCallEvent) => void,
    onConnected: () => void,
    onDisconnected: () => void
  ): Promise<RTCPeerConnection> {
    logger.info('Establishing ElevenLabs connection with signed URL', {
      hasSignedUrl: !!sessionResponse.ephemeral_token,
      agentId: sessionResponse.agent_id
    })

    // Verify we're in a browser environment
    if (typeof window === 'undefined') {
      throw new Error('ElevenLabs provider requires browser environment')
    }

    // Verify Conversation is available
    if (!Conversation) {
      throw new Error('ElevenLabs SDK not loaded - please ensure @elevenlabs/client is installed')
    }

    try {
      // Map CRM functions to client tools (ElevenLabs will execute these client-side)
      const clientTools: Record<string, (parameters: FunctionCallParameters) => Promise<FunctionCallResult>> = {}

      if (sessionResponse.config?.tools) {
        for (const tool of sessionResponse.config.tools) {
          clientTools[tool.name] = async (parameters: FunctionCallParameters) => {
            logger.info('Client tool called', { name: tool.name, parameters })

            // Trigger the function call handler
            const callId = `${tool.name}_${Date.now()}`
            onFunctionCall({
              call_id: callId,
              name: tool.name,
              parameters,
            })

            // Return a promise that will be resolved when sendFunctionResult is called
            return new Promise<FunctionCallResult>((resolve) => {
              // Store resolver for later
              this.pendingResolvers.set(callId, resolve)
            })
          }
        }
      }

      // Start conversation session using signed URL
      // Note: ElevenLabs SDK expects a specific clientTools type signature
      // We use type assertion here as our stricter types are compatible at runtime
      this.conversation = await Conversation.startSession({
        signedUrl: sessionResponse.ephemeral_token,
        clientTools: clientTools as unknown as Record<string, (parameters: unknown) => string | number | void | Promise<string | number | void>>,

        onConnect: () => {
          logger.info('ElevenLabs conversation connected')
          this.isConnected = true
          onConnected()
        },

        onDisconnect: () => {
          logger.info('ElevenLabs conversation disconnected')
          this.isConnected = false
          onDisconnected()
        },

        onError: (error: Error | string) => {
          logger.error('ElevenLabs connection error', { error })
        },
      })

      logger.info('ElevenLabs conversation session started', {
        conversationId: this.conversation?.getId(),
      })

      // Return mock peer connection (SDK handles WebRTC internally)
      // ElevenLabs SDK abstracts the RTCPeerConnection
      return new RTCPeerConnection()
    } catch (error) {
      logger.error('Failed to establish ElevenLabs connection', { error })
      throw error
    }
  }

  sendFunctionResult(result: FunctionResultEvent): void {
    if (!this.isConnected || !this.conversation) {
      logger.error('ElevenLabs not connected for sending function result')
      return
    }

    logger.info('Sending function result to ElevenLabs', {
      callId: result.call_id,
      hasResult: !!result.result,
    })

    // Resolve the pending promise for this call
    const resolver = this.pendingResolvers.get(result.call_id)
    if (resolver) {
      resolver(result.result)
      this.pendingResolvers.delete(result.call_id)
    }
  }

  cleanup(): void {
    if (this.conversation) {
      logger.info('Ending ElevenLabs conversation')
      this.conversation.endSession()
      this.conversation = null
    }
    this.isConnected = false
  }

  getCostPerMinute(): number {
    // ElevenLabs Conversational AI pricing: ~$0.08/min (75% cheaper than OpenAI)
    return 0.08
  }
}
