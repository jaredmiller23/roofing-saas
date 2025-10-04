/**
 * Voice Provider Abstraction
 * Allows switching between OpenAI Realtime API and ElevenLabs Conversational AI
 */

export type VoiceProviderType = 'openai' | 'elevenlabs'

export interface VoiceProviderConfig {
  provider: VoiceProviderType
  contactId?: string
  projectId?: string
  instructions?: string
  voice?: string
  temperature?: number
  tools?: VoiceFunction[]
}

export interface VoiceFunction {
  type: 'function'
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export interface SessionResponse {
  session_id: string
  provider: VoiceProviderType
  ephemeral_token: string
  voice_id?: string // For ElevenLabs
  agent_id?: string // For ElevenLabs
  config?: {
    instructions?: string
    voice?: string
    temperature?: number
    turn_detection?: unknown // OpenAI-specific config, structure varies
    tools?: VoiceFunction[]
  }
}

export interface WebRTCConnectionConfig {
  iceServers: RTCIceServer[]
  token: string
  provider: VoiceProviderType
}

export interface FunctionCallEvent {
  call_id: string
  name: string
  parameters: Record<string, unknown>
}

export interface FunctionResultEvent {
  call_id: string
  result: unknown
}

/**
 * Base Voice Provider Interface
 * All providers must implement this interface
 */
export abstract class VoiceProvider {
  abstract readonly name: VoiceProviderType

  /**
   * Initialize a new voice session
   * Returns session config including ephemeral token
   */
  abstract initSession(config: VoiceProviderConfig): Promise<SessionResponse>

  /**
   * Establish WebRTC peer connection
   * Returns RTCPeerConnection instance
   */
  abstract establishConnection(
    sessionResponse: SessionResponse,
    audioStream: MediaStream,
    onFunctionCall: (event: FunctionCallEvent) => void,
    onConnected: () => void,
    onDisconnected: () => void
  ): Promise<RTCPeerConnection>

  /**
   * Send function call result back to provider
   */
  abstract sendFunctionResult(result: FunctionResultEvent): void

  /**
   * Cleanup and disconnect
   */
  abstract cleanup(): void

  /**
   * Get cost per minute
   */
  abstract getCostPerMinute(): number
}

/**
 * Provider factory
 */
export interface VoiceProviderFactory {
  createProvider(type: VoiceProviderType): VoiceProvider
}
