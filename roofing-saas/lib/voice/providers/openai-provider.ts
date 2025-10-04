/**
 * OpenAI Realtime API Voice Provider
 * Implements WebRTC-based voice assistant using OpenAI's Realtime API
 */

import {
  VoiceProvider,
  VoiceProviderConfig,
  SessionResponse,
  FunctionCallEvent,
  FunctionResultEvent,
} from './types'
import { logger } from '@/lib/logger'

export class OpenAIProvider extends VoiceProvider {
  readonly name = 'openai' as const

  private peerConnection: RTCPeerConnection | null = null
  private dataChannel: RTCDataChannel | null = null

  async initSession(config: VoiceProviderConfig): Promise<SessionResponse> {
    const response = await fetch('/api/voice/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'openai',
        contact_id: config.contactId,
        project_id: config.projectId,
        context: {
          timestamp: new Date().toISOString(),
        },
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create OpenAI voice session')
    }

    const data = await response.json()
    const { session_id, ephemeral_token } = data.data

    return {
      session_id,
      provider: 'openai',
      ephemeral_token,
      config: {
        instructions: config.instructions,
        voice: config.voice || 'alloy',
        temperature: config.temperature || 0.7,
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
    // Create RTCPeerConnection with STUN server
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })
    this.peerConnection = pc

    // Add remote audio track handler
    pc.addEventListener('track', (event) => {
      const remoteAudio = new Audio()
      remoteAudio.srcObject = event.streams[0]
      remoteAudio.play().catch(err => {
        logger.error('Failed to play remote audio', { error: err })
      })
    })

    // Add microphone track to peer connection
    audioStream.getTracks().forEach(track => {
      pc.addTrack(track, audioStream)
    })

    // Create data channel for events
    const dc = pc.createDataChannel('oai-events')
    this.dataChannel = dc

    // Setup data channel event handlers
    dc.addEventListener('open', () => {
      logger.info('OpenAI data channel opened')
      onConnected()

      // Configure session
      if (sessionResponse.config) {
        dc.send(JSON.stringify({
          type: 'session.update',
          session: sessionResponse.config,
        }))
      }
    })

    dc.addEventListener('close', () => {
      logger.info('OpenAI data channel closed')
      onDisconnected()
    })

    dc.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data)

        // Handle function calls
        if (message.type === 'response.function_call_arguments.done') {
          const functionCall: FunctionCallEvent = {
            call_id: message.call_id,
            name: message.name,
            parameters: JSON.parse(message.arguments),
          }
          onFunctionCall(functionCall)
        }
      } catch (error) {
        logger.error('Error parsing data channel message', { error })
      }
    })

    // Create SDP offer
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    // Send offer to OpenAI and get answer
    const sdpResponse = await fetch(
      'https://api.openai.com/v1/realtime/sessions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionResponse.ephemeral_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-realtime-preview-2024-12-17',
          voice: sessionResponse.config?.voice || 'alloy',
        }),
      }
    )

    if (!sdpResponse.ok) {
      throw new Error('Failed to get SDP answer from OpenAI')
    }

    const sdpData = await sdpResponse.json()
    const answer: RTCSessionDescriptionInit = {
      type: 'answer',
      sdp: sdpData.sdp,
    }

    await pc.setRemoteDescription(answer)

    return pc
  }

  sendFunctionResult(result: FunctionResultEvent): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      logger.error('Data channel not open for sending function result')
      return
    }

    this.dataChannel.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: result.call_id,
        output: JSON.stringify(result.result),
      },
    }))

    // Trigger response generation
    this.dataChannel.send(JSON.stringify({
      type: 'response.create',
    }))
  }

  cleanup(): void {
    if (this.dataChannel) {
      this.dataChannel.close()
      this.dataChannel = null
    }

    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }
  }

  getCostPerMinute(): number {
    // OpenAI Realtime API pricing: $0.06/min input + $0.24/min output = ~$0.30/min average
    return 0.30
  }
}
