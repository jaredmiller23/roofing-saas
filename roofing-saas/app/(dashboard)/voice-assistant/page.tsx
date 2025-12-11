'use client'

import { useState } from 'react'
import { VoiceSession } from '@/components/voice/VoiceSession'
import { VoiceDiagnostics } from '@/components/voice/VoiceDiagnostics'
import { getAvailableProviders, VoiceProviderType } from '@/lib/voice/providers'

export default function VoiceAssistantPage() {
  const [selectedProvider, setSelectedProvider] = useState<VoiceProviderType>('openai')
  const providers = getAvailableProviders()
  const currentProvider = providers.find(p => p.type === selectedProvider)

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          AI Voice Assistant
        </h1>
        <p className="text-gray-600 mb-4">
          Use voice commands to manage your CRM while in the field
        </p>

        {/* Provider Selection */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <h3 className="text-sm font-semibold text-foreground mb-3">Voice Provider</h3>
          <div className="flex items-center gap-4">
            {providers.map((provider) => (
              <button
                key={provider.type}
                onClick={() => setSelectedProvider(provider.type)}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  selectedProvider === provider.type
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-background border border-gray-200'
                }`}
              >
                <div className="text-left">
                  <div className="font-semibold">{provider.name}</div>
                  <div className={`text-xs mt-1 ${selectedProvider === provider.type ? 'text-blue-100' : 'text-gray-500'}`}>
                    ${provider.costPerMinute.toFixed(2)}/min
                    {provider.type === 'elevenlabs' && ' (73% savings)'}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {currentProvider && (
            <div className="mt-3 text-xs text-gray-600">
              <p className="font-medium mb-1">{currentProvider.description}</p>
              <ul className="space-y-0.5">
                {currentProvider.features.map((feature, idx) => (
                  <li key={idx}>• {feature}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <VoiceSession provider={selectedProvider} />

        {/* Feature list */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-foreground mb-2">Create Contacts</h3>
            <p className="text-sm text-gray-600">
              &quot;Create a new contact named John Smith at 123 Main Street&quot;
            </p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-foreground mb-2">Add Notes</h3>
            <p className="text-sm text-gray-600">
              &quot;Add a note: Customer interested in metal roofing&quot;
            </p>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <h3 className="font-semibold text-foreground mb-2">Search Contacts</h3>
            <p className="text-sm text-gray-600">
              &quot;Find John Smith&quot; or &quot;Search for 123 Main Street&quot;
            </p>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg">
            <h3 className="font-semibold text-foreground mb-2">Coming Soon</h3>
            <p className="text-sm text-gray-600">
              Log activities, check project status, and more...
            </p>
          </div>
        </div>

        {/* Technical notes */}
        <div className="mt-8 p-4 bg-background rounded-lg">
          <h3 className="font-semibold text-foreground mb-2">Technical Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 font-medium">Provider</p>
              <p className="text-sm text-foreground">{currentProvider?.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Cost</p>
              <p className="text-sm text-foreground">${currentProvider?.costPerMinute.toFixed(2)}/min</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Status</p>
              <p className="text-sm text-green-600 font-medium">{currentProvider?.status === 'ready' ? '✓ Ready' : 'Configuring'}</p>
            </div>
          </div>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• WebRTC audio streaming</li>
            <li>• Ultra-low latency (&lt;2 second response time)</li>
            <li>• Direct speech-to-speech processing</li>
            <li>• Secure peer-to-peer connection</li>
            <li>• Works on modern browsers (Chrome, Safari, Edge)</li>
            <li>• 10 CRM functions + Intelligence tools</li>
          </ul>
        </div>

        {/* Diagnostics Tool */}
        <VoiceDiagnostics />
      </div>
    </div>
  )
}
