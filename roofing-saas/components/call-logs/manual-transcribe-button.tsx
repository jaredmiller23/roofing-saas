'use client'

import { useState } from 'react'
import { Loader2, FileAudio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api/client'

interface ManualTranscribeButtonProps {
  callId: string
  hasTranscription: boolean
}

/**
 * Button to manually trigger transcription for a call recording
 *
 * Shows different states:
 * - "Transcribe" when no transcription exists
 * - "Re-transcribe" when transcription already exists
 * - Loading state while processing
 */
export function ManualTranscribeButton({
  callId,
  hasTranscription,
}: ManualTranscribeButtonProps) {
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleTranscribe = async () => {
    setIsTranscribing(true)
    setError(null)

    try {
      await apiFetch(`/api/call-logs/${callId}/transcribe`, {
        method: 'POST',
        body: { force: hasTranscription },
      })

      // Refresh the page to show new transcription
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed')
    } finally {
      setIsTranscribing(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleTranscribe}
        disabled={isTranscribing}
        variant={hasTranscription ? 'outline' : 'default'}
        size="sm"
        className="gap-2"
      >
        {isTranscribing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Transcribing...
          </>
        ) : (
          <>
            <FileAudio className="h-4 w-4" />
            {hasTranscription ? 'Re-transcribe' : 'Transcribe Recording'}
          </>
        )}
      </Button>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
