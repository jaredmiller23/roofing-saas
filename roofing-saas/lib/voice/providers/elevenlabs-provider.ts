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
} from './types'
import { logger } from '@/lib/logger'
import { Conversation } from '@elevenlabs/client'

export class ElevenLabsProvider extends VoiceProvider {
  readonly name = 'elevenlabs' as const

  private conversation: Conversation | null = null
  private isConnected: boolean = false

  async initSession(config: VoiceProviderConfig): Promise<SessionResponse> {
    // Get signed URL from backend
    const response = await fetch('/api/voice/session/elevenlabs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_id: config.contactId,
        project_id: config.projectId,
        agent_id: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create ElevenLabs voice session')
    }

    const data = await response.json()
    const { session_id, signed_url, agent_id } = data.data

    return {
      session_id,
      provider: 'elevenlabs',
      ephemeral_token: signed_url,
      agent_id,
      config: {
        instructions: config.instructions,
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
    logger.info('Establishing ElevenLabs connection with signed URL')

    try {
      // Map CRM functions to client tools (ElevenLabs will execute these client-side)
      const clientTools: Record<string, (parameters: any) => Promise<any>> = {}

      if (sessionResponse.config?.tools) {
        for (const tool of sessionResponse.config.tools) {
          clientTools[tool.name] = async (parameters: any) => {
            logger.info('Client tool called', { name: tool.name, parameters })

            // Trigger the function call handler
            const callId = `${tool.name}_${Date.now()}`
            onFunctionCall({
              call_id: callId,
              name: tool.name,
              parameters,
            })

            // Return a promise that will be resolved when sendFunctionResult is called
            return new Promise((resolve) => {
              // Store resolver for later (this is a simplified approach)
              // In production, you'd want a proper promise management system
              ;(this as any)[`pending_${callId}`] = resolve
            })
          }
        }
      }

      // Start conversation session using signed URL
      this.conversation = await Conversation.startSession({
        signedUrl: sessionResponse.ephemeral_token,
        clientTools,

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

        onError: (error: any) => {
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
    const resolver = (this as any)[`pending_${result.call_id}`]
    if (resolver) {
      resolver(result.result)
      delete (this as any)[`pending_${result.call_id}`]
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
