/**
 * Google Gemini Live API Voice Provider
 * Implements WebSocket-based voice assistant using Gemini 2.0 Live API
 *
 * Cost: $0.05/minute (83% cheaper than OpenAI)
 * Features: Native audio, 30 HD voices, 24 languages, function calling
 */

import {
  VoiceProvider,
  VoiceProviderConfig,
  SessionResponse,
  FunctionCallEvent,
  FunctionResultEvent,
} from './types'
import { logger } from '@/lib/logger'

export class GeminiProvider extends VoiceProvider {
  readonly name = 'gemini' as const

  private websocket: WebSocket | null = null
  private audioContext: AudioContext | null = null
  private audioWorkletNode: AudioWorkletNode | null = null
  private isConnected: boolean = false
  private sourceNode: MediaStreamAudioSourceNode | null = null

  async initSession(config: VoiceProviderConfig): Promise<SessionResponse> {
    // Get session config from backend
    const response = await fetch('/api/voice/session/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_id: config.contactId,
        project_id: config.projectId,
        context: {
          timestamp: new Date().toISOString(),
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to create Gemini voice session')
    }

    const data = await response.json()
    const { session_id, ephemeral_token, model } = data.data

    return {
      session_id,
      provider: 'gemini',
      ephemeral_token,
      model: model || 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        instructions: config.instructions,
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
    logger.info('Establishing Gemini Live API connection', {
      model: sessionResponse.model
    })

    // Verify browser environment
    if (typeof window === 'undefined') {
      throw new Error('Gemini provider requires browser environment')
    }

    try {
      // Create WebSocket connection to Gemini Live API
      // Format: wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${sessionResponse.ephemeral_token}`

      this.websocket = new WebSocket(wsUrl)

      // Setup WebSocket event handlers
      this.websocket.onopen = () => {
        logger.info('Gemini WebSocket opened')
        this.isConnected = true

        // Send setup message with configuration
        this.sendSetupMessage(sessionResponse)

        // Setup audio processing
        this.setupAudioProcessing(audioStream)

        onConnected()
      }

      this.websocket.onclose = () => {
        logger.info('Gemini WebSocket closed')
        this.isConnected = false
        onDisconnected()
      }

      this.websocket.onerror = (error) => {
        logger.error('Gemini WebSocket error', { error })
        this.isConnected = false
      }

      this.websocket.onmessage = (event) => {
        this.handleWebSocketMessage(event, onFunctionCall)
      }

      // Return mock RTCPeerConnection for interface compatibility
      // (Gemini uses WebSocket, not WebRTC)
      return new RTCPeerConnection()
    } catch (error) {
      logger.error('Failed to establish Gemini connection', { error })
      throw error
    }
  }

  private sendSetupMessage(sessionResponse: SessionResponse): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      logger.error('WebSocket not open for setup message')
      return
    }

    const setupMessage = {
      setup: {
        model: sessionResponse.model,
        generation_config: {
          temperature: sessionResponse.config?.temperature || 0.7,
          response_modalities: ['AUDIO'], // Native audio output
        },
        system_instruction: {
          parts: [
            {
              text: sessionResponse.config?.instructions || 'You are a helpful AI assistant for a roofing company.',
            },
          ],
        },
        tools: sessionResponse.config?.tools?.map(tool => ({
          function_declarations: [{
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          }],
        })),
      },
    }

    this.websocket.send(JSON.stringify(setupMessage))
    logger.info('Sent Gemini setup message')
  }

  private setupAudioProcessing(audioStream: MediaStream): void {
    // Create AudioContext for processing microphone input
    this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
      sampleRate: 16000, // Gemini expects 16kHz
    })

    // Create source node from microphone stream
    this.sourceNode = this.audioContext.createMediaStreamSource(audioStream)

    // Create script processor for audio chunks
    // Note: ScriptProcessorNode is deprecated but widely supported
    // TODO: Migrate to AudioWorkletNode for better performance
    const bufferSize = 4096
    const processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1)

    processor.onaudioprocess = (event) => {
      if (!this.isConnected || !this.websocket) return

      const inputData = event.inputBuffer.getChannelData(0)

      // Convert Float32Array to Int16Array (16-bit PCM)
      const pcmData = new Int16Array(inputData.length)
      for (let i = 0; i < inputData.length; i++) {
        // Clamp to [-1, 1] and convert to 16-bit integer
        const s = Math.max(-1, Math.min(1, inputData[i]))
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
      }

      // Convert to base64 for transmission
      const base64Audio = this.arrayBufferToBase64(pcmData.buffer)

      // Send audio chunk to Gemini
      this.websocket?.send(JSON.stringify({
        realtime_input: {
          media_chunks: [
            {
              mime_type: 'audio/pcm',
              data: base64Audio,
            },
          ],
        },
      }))
    }

    // Connect nodes: microphone -> processor -> destination
    this.sourceNode.connect(processor)
    processor.connect(this.audioContext.destination)
  }

  private handleWebSocketMessage(event: MessageEvent, onFunctionCall: (event: FunctionCallEvent) => void): void {
    try {
      const message = JSON.parse(event.data)

      // Handle server-to-client audio
      if (message.server_content?.model_turn?.parts) {
        for (const part of message.server_content.model_turn.parts) {
          if (part.inline_data?.mime_type === 'audio/pcm' && part.inline_data?.data) {
            this.playAudioResponse(part.inline_data.data)
          }
        }
      }

      // Handle function calls
      if (message.server_content?.model_turn?.parts) {
        for (const part of message.server_content.model_turn.parts) {
          if (part.function_call) {
            const functionCall: FunctionCallEvent = {
              call_id: part.function_call.id || `gemini_${Date.now()}`,
              name: part.function_call.name,
              parameters: part.function_call.args || {},
            }
            logger.info('Gemini function call received', {
              callId: functionCall.call_id,
              name: functionCall.name,
              hasParameters: !!functionCall.parameters,
            })
            onFunctionCall(functionCall)
          }
        }
      }

      // Handle turn completion
      if (message.server_content?.turn_complete) {
        logger.info('Gemini turn complete')
      }

    } catch (error) {
      logger.error('Error parsing Gemini WebSocket message', { error })
    }
  }

  private playAudioResponse(base64Audio: string): void {
    try {
      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Audio)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Convert 16-bit PCM to Float32Array for AudioContext
      const int16Array = new Int16Array(bytes.buffer)
      const float32Array = new Float32Array(int16Array.length)
      for (let i = 0; i < int16Array.length; i++) {
        // Convert from 16-bit int to float [-1, 1]
        float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7FFF)
      }

      // Create audio buffer and play
      if (!this.audioContext) {
        this.audioContext = new AudioContext()
      }

      const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, 24000) // 24kHz output
      audioBuffer.getChannelData(0).set(float32Array)

      const source = this.audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(this.audioContext.destination)
      source.start()

    } catch (error) {
      logger.error('Error playing Gemini audio response', { error })
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  sendFunctionResult(result: FunctionResultEvent): void {
    if (!this.isConnected || !this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      logger.error('Gemini WebSocket not open for sending function result')
      return
    }

    logger.info('Sending function result to Gemini', {
      callId: result.call_id,
      hasResult: !!result.result,
    })

    // Send function response to Gemini
    this.websocket.send(JSON.stringify({
      client_content: {
        turns: [
          {
            role: 'user',
            parts: [
              {
                function_response: {
                  id: result.call_id,
                  name: result.result.data ? 'success' : 'error',
                  response: result.result,
                },
              },
            ],
          },
        ],
        turn_complete: true,
      },
    }))
  }

  cleanup(): void {
    logger.info('Cleaning up Gemini provider')

    // Disconnect audio nodes
    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }

    if (this.audioWorkletNode) {
      this.audioWorkletNode.disconnect()
      this.audioWorkletNode = null
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    // Close WebSocket
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }

    this.isConnected = false
  }

  getCostPerMinute(): number {
    // Gemini 2.0 Live API pricing: $0.05/minute (83% cheaper than OpenAI)
    return 0.05
  }
}
