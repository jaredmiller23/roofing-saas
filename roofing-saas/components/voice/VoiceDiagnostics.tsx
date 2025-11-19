'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react'

interface DiagnosticResult {
  key: string
  status: 'success' | 'error' | 'warning'
  message: string
  value?: string
}

export function VoiceDiagnostics() {
  const [isOpen, setIsOpen] = useState(false)
  const [testResults, setTestResults] = useState<Record<string, DiagnosticResult>>({})

  const runDiagnostics = async () => {
    const results: Record<string, DiagnosticResult> = {}

    // 0. Browser detection
    const userAgent = navigator.userAgent
    const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent)
    const isChrome = /chrome/i.test(userAgent) && !/edge/i.test(userAgent)
    const isFirefox = /firefox/i.test(userAgent)

    results.browser = {
      key: 'Browser Detection',
      status: 'success',
      message: isSafari ? '🧭 Safari detected' : isChrome ? '🌐 Chrome detected' : isFirefox ? '🦊 Firefox detected' : '❓ Unknown browser'
    }

    // 1. Check environment variables
    results.elevenlabsAgentId = {
      key: 'NEXT_PUBLIC_ELEVENLABS_AGENT_ID',
      value: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID,
      status: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ? 'success' : 'error',
      message: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ?
        `✓ Set to: ${process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID}` :
        '✗ Not set! Add to .env.local'
    }

    // 2. Check ElevenLabs SDK
    try {
      const { Conversation } = await import('@elevenlabs/client')
      results.elevenLabsSDK = {
        key: '@elevenlabs/client',
        status: Conversation ? 'success' : 'error',
        message: Conversation ? '✓ SDK loaded successfully' : '✗ SDK not available'
      }
    } catch (err) {
      results.elevenLabsSDK = {
        key: '@elevenlabs/client',
        status: 'error',
        message: `✗ Failed to load: ${(err as Error).message}`
      }
    }

    // 3. Test API endpoint
    try {
      const response = await fetch('/api/voice/session/elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID
        })
      })

      const data = await response.json()

      results.apiEndpoint = {
        key: '/api/voice/session/elevenlabs',
        status: response.ok ? 'success' : 'error',
        message: response.ok ?
          `✓ API working! Session ID: ${data.data?.session_id}` :
          `✗ API error: ${data.error?.message || response.statusText}`
      }
    } catch (err) {
      results.apiEndpoint = {
        key: '/api/voice/session/elevenlabs',
        status: 'error',
        message: `✗ Request failed: ${(err as Error).message}`
      }
    }

    // 4. Check if MediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      results.microphone = {
        key: 'Microphone Access',
        status: 'error',
        message: '✗ MediaDevices API not supported in this browser'
      }
    } else {
      // 5. Check microphone permission with progressive fallback
      let micSuccess = false
      let micMethod = ''
      let micError = null
      const attempts: string[] = []

      // Try #1: Full constraints
      try {
        console.log('[Diagnostics] Trying full constraints...')
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        })
        stream.getTracks().forEach(track => track.stop())
        micSuccess = true
        micMethod = 'with full constraints (ideal)'
        attempts.push('✓ Full constraints')
      } catch (err) {
        const error = err as Error
        attempts.push(`✗ Full: ${error.message}`)
        console.warn('[Diagnostics] Full constraints failed:', error)

        // Try #2: Just echo cancellation
        try {
          console.log('[Diagnostics] Trying echo cancellation only...')
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true }
          })
          stream.getTracks().forEach(track => track.stop())
          micSuccess = true
          micMethod = 'with echo cancellation (good)'
          attempts.push('✓ Echo cancellation only')
        } catch (err2) {
          const error2 = err2 as Error
          attempts.push(`✗ Echo: ${error2.message}`)
          console.warn('[Diagnostics] Echo cancellation failed:', error2)

          // Try #3: No constraints
          try {
            console.log('[Diagnostics] Trying basic audio (no constraints)...')
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            stream.getTracks().forEach(track => track.stop())
            micSuccess = true
            micMethod = 'with no constraints (basic)'
            attempts.push('✓ Basic audio (no constraints)')
          } catch (err3) {
            micError = err3 as Error
            attempts.push(`✗ Basic: ${micError.message}`)
            console.error('[Diagnostics] All microphone attempts failed:', err3)
          }
        }
      }

      if (micSuccess) {
        results.microphone = {
          key: 'Microphone Access',
          status: 'success',
          message: `✓ Microphone permission granted ${micMethod}`,
          value: attempts.join(' → ')
        }
      } else {
        results.microphone = {
          key: 'Microphone Access',
          status: 'error',
          message: `✗ All attempts failed. Last error: ${micError?.name}: ${micError?.message}`,
          value: attempts.join(' → ')
        }
      }
    }

    setTestResults(results)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true)
          runDiagnostics()
        }}
        className="fixed bottom-4 right-4 px-4 py-2 bg-purple-600 text-white rounded-lg shadow-lg hover:bg-purple-700 text-sm font-medium"
      >
        🔍 Run Diagnostics
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Voice Assistant Diagnostics
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {Object.entries(testResults).map(([key, result]) => (
              <div
                key={key}
                className={`p-4 rounded-lg border-2 ${
                  result.status === 'success'
                    ? 'border-green-200 bg-green-50'
                    : result.status === 'warning'
                    ? 'border-yellow-200 bg-yellow-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.status === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : result.status === 'warning' ? (
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {result.key}
                    </h3>
                    <p className="text-sm text-gray-700 mt-1 font-mono">
                      {result.message}
                    </p>
                    {result.value && (
                      <p className="text-xs text-gray-500 mt-1 break-all">
                        Value: {result.value}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={runDiagnostics}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Run Again
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
