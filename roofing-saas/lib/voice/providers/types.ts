/**
 * Voice Provider Abstraction
 * Allows switching between OpenAI Realtime API, ElevenLabs Conversational AI, and Google Gemini Live API
 */

export type VoiceProviderType = 'openai' | 'elevenlabs' | 'gemini'

export interface VoiceProviderConfig {
  provider: VoiceProviderType
  contactId?: string
  projectId?: string
  instructions?: string
  voice?: string
  temperature?: number
  tools?: VoiceFunction[]
  language?: string
}

export interface VoiceFunctionParameter {
  type: string
  description?: string
  enum?: string[]
  items?: VoiceFunctionParameter
  properties?: Record<string, VoiceFunctionParameter>
  required?: string[]
}

export interface VoiceFunction {
  type: 'function'
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, VoiceFunctionParameter>
    required?: string[]
  }
}

export interface TurnDetectionConfig {
  type?: 'server_vad'
  threshold?: number
  prefix_padding_ms?: number
  silence_duration_ms?: number
}

export interface SessionResponse {
  session_id: string
  provider: VoiceProviderType
  ephemeral_token: string
  voice_id?: string // For ElevenLabs
  agent_id?: string // For ElevenLabs
  model?: string // For Gemini (e.g., 'gemini-2.5-flash-native-audio-preview-09-2025')
  config?: {
    instructions?: string
    voice?: string
    temperature?: number
    turn_detection?: TurnDetectionConfig // OpenAI-specific config
    tools?: VoiceFunction[]
  }
}

export interface WebRTCConnectionConfig {
  iceServers: RTCIceServer[]
  token: string
  provider: VoiceProviderType
}

export interface FunctionCallParameters {
  [key: string]: string | number | boolean | null | FunctionCallParameters | Array<string | number | boolean | null>
}

export interface FunctionCallResult {
  success: boolean
  data?: Record<string, unknown> | Array<Record<string, unknown>> | string | number | boolean | null
  error?: string
  message?: string
}

export interface FunctionCallEvent {
  call_id: string
  name: string
  parameters: FunctionCallParameters
}

export interface FunctionResultEvent {
  call_id: string
  result: FunctionCallResult
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
