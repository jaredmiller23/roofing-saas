import { VoiceSession } from '@/components/voice/VoiceSession'

export default function VoiceAssistantPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI Voice Assistant
        </h1>
        <p className="text-gray-600 mb-8">
          Use voice commands to manage your CRM while in the field
        </p>

        <VoiceSession />

        {/* Feature list */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Create Contacts</h3>
            <p className="text-sm text-gray-600">
              &quot;Create a new contact named John Smith at 123 Main Street&quot;
            </p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Add Notes</h3>
            <p className="text-sm text-gray-600">
              &quot;Add a note: Customer interested in metal roofing&quot;
            </p>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Search Contacts</h3>
            <p className="text-sm text-gray-600">
              &quot;Find John Smith&quot; or &quot;Search for 123 Main Street&quot;
            </p>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Coming Soon</h3>
            <p className="text-sm text-gray-600">
              Log activities, check project status, and more...
            </p>
          </div>
        </div>

        {/* Technical notes */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Technical Details</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Uses OpenAI Realtime API with WebRTC</li>
            <li>• Ultra-low latency (&lt;1 second response time)</li>
            <li>• Direct speech-to-speech processing</li>
            <li>• Secure peer-to-peer connection</li>
            <li>• Works on modern browsers (Chrome, Safari, Edge)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
