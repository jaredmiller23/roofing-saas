'use client'

import { FileText, MessageSquare, TrendingUp, AlertCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface CallTranscriptionProps {
  transcription: string | null
  summary: string | null
  sentiment: 'positive' | 'neutral' | 'negative' | null
  keyPoints: string[] | null
  confidence: number | null
  provider: string | null
  isProcessing?: boolean
}

/**
 * Display component for call transcription with AI summary
 *
 * Shows:
 * - AI-generated summary with sentiment badge
 * - Key discussion points
 * - Full transcription text
 * - Provider and confidence metadata
 */
export function CallTranscription({
  transcription,
  summary,
  sentiment,
  keyPoints,
  confidence,
  provider,
  isProcessing = false,
}: CallTranscriptionProps) {
  // Show processing state
  if (isProcessing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Transcription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span>Transcription in progress...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show empty state
  if (!transcription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Transcription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No transcription available</p>
            <p className="text-sm text-muted-foreground">
              Recording may still be processing or transcription was not enabled
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getSentimentColor = (sent: string | null) => {
    switch (sent) {
      case 'positive':
        return 'bg-green-500/20 text-green-600 border-green-500/30'
      case 'negative':
        return 'bg-red-500/20 text-red-600 border-red-500/30'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getProviderLabel = (prov: string | null) => {
    switch (prov) {
      case 'openai_whisper':
        return 'OpenAI Whisper'
      case 'twilio':
        return 'Twilio'
      default:
        return prov || 'Unknown'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          Transcription
          {sentiment && (
            <Badge variant="outline" className={`ml-auto ${getSentimentColor(sentiment)}`}>
              {sentiment} tone
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Summary */}
        {summary && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium text-foreground text-sm mb-1">AI Summary</h4>
                <p className="text-muted-foreground text-sm">{summary}</p>
              </div>
            </div>
          </div>
        )}

        {/* Key Points */}
        {keyPoints && keyPoints.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium text-foreground text-sm">Key Points</h4>
            </div>
            <ul className="space-y-1.5 ml-6">
              {keyPoints.map((point, index) => (
                <li
                  key={index}
                  className="text-sm text-muted-foreground list-disc"
                >
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Full Transcription */}
        <div>
          <h4 className="font-medium text-foreground text-sm mb-2">Full Transcription</h4>
          <div className="bg-muted/30 border border-border rounded-lg p-4 max-h-64 overflow-y-auto">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {transcription}
            </p>
          </div>
        </div>

        {/* Metadata */}
        {(confidence || provider) && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
            {provider && (
              <span>Transcribed by {getProviderLabel(provider)}</span>
            )}
            {confidence && (
              <span>Confidence: {(confidence * 100).toFixed(0)}%</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
