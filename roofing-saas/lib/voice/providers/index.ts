/**
 * Voice Provider Factory
 * Centralized provider creation and management
 */

import { VoiceProvider, VoiceProviderType } from './types'
import { OpenAIProvider } from './openai-provider'
import { ElevenLabsProvider } from './elevenlabs-provider'

export * from './types'
export { OpenAIProvider } from './openai-provider'
export { ElevenLabsProvider } from './elevenlabs-provider'

/**
 * Create a voice provider instance
 */
export function createVoiceProvider(type: VoiceProviderType): VoiceProvider {
  switch (type) {
    case 'openai':
      return new OpenAIProvider()
    case 'elevenlabs':
      return new ElevenLabsProvider()
    default:
      throw new Error(`Unknown voice provider: ${type}`)
  }
}

/**
 * Get available providers with their capabilities
 */
export function getAvailableProviders() {
  return [
    {
      type: 'openai' as const,
      name: 'OpenAI Realtime API',
      description: 'High-quality voice assistant with proven reliability',
      costPerMinute: 0.30,
      features: [
        'WebRTC audio streaming',
        'Function calling support',
        'Multi-turn conversations',
        'Context awareness',
      ],
      status: 'ready' as const,
    },
    {
      type: 'elevenlabs' as const,
      name: 'ElevenLabs Conversational AI',
      description: 'Premium voice quality with 75% cost savings',
      costPerMinute: 0.08,
      features: [
        '5,000+ premium voices',
        'Client and server tools',
        'Sub-100ms latency',
        '32+ languages',
      ],
      status: 'ready' as const,
      note: 'Requires ELEVENLABS_API_KEY and NEXT_PUBLIC_ELEVENLABS_AGENT_ID in environment',
    },
  ]
}

/**
 * Get default provider type
 */
export function getDefaultProvider(): VoiceProviderType {
  return 'openai'
}
