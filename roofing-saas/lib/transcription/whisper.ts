/**
 * Whisper Transcription Service
 *
 * Provides call transcription using OpenAI Whisper API with:
 * - Automatic retry with exponential backoff for rate limits
 * - AI-powered call summary generation using GPT-4o
 * - Sentiment analysis and key point extraction
 *
 * Usage:
 *   const result = await transcribeAudio(twilioRecordingUrl)
 *   const summary = await generateCallSummary(result.text)
 */

import OpenAI from 'openai'
import { logger } from '@/lib/logger'
import { openai, createChatCompletion } from '@/lib/ai/openai-client'

// Retry configuration
const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

export interface TranscriptionResult {
  text: string
  confidence: number
  provider: 'openai_whisper' | 'twilio'
  duration_seconds?: number
}

export interface CallSummary {
  summary: string
  sentiment: 'positive' | 'neutral' | 'negative'
  key_points: string[]
}

/**
 * Check if error is a rate limit error (429)
 */
function isRateLimitError(error: unknown): boolean {
  return (
    error instanceof OpenAI.APIError &&
    error.status === 429
  )
}

/**
 * Calculate retry delay with exponential backoff
 */
function getRetryDelay(attempt: number): number {
  return Math.pow(2, attempt) * BASE_DELAY_MS
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Download audio from Twilio recording URL
 *
 * Twilio recordings require authentication via query params
 * Returns audio as a File object for Whisper API
 */
async function downloadTwilioRecording(recordingUrl: string): Promise<File> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    throw new Error('Missing Twilio credentials for recording download')
  }

  // Twilio recordings need .mp3 extension and auth params
  const url = `${recordingUrl}.mp3`
  const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')

  logger.info('Downloading Twilio recording', { url: recordingUrl })

  const response = await fetch(url, {
    headers: {
      'Authorization': authHeader,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to download recording: ${response.status} ${response.statusText}`)
  }

  const blob = await response.blob()
  return new File([blob], 'recording.mp3', { type: 'audio/mpeg' })
}

/**
 * Transcribe audio using OpenAI Whisper API
 *
 * @param recordingUrl - URL to the Twilio recording (without .mp3 extension)
 * @returns TranscriptionResult with text and metadata
 */
export async function transcribeAudio(recordingUrl: string): Promise<TranscriptionResult> {
  logger.info('Starting Whisper transcription', { recordingUrl })

  // Download audio file from Twilio
  const audioFile = await downloadTwilioRecording(recordingUrl)

  // Transcribe with retry logic
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const startTime = Date.now()

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        response_format: 'verbose_json',
      })

      const duration = (Date.now() - startTime) / 1000

      logger.info('Whisper transcription complete', {
        textLength: transcription.text.length,
        processingTime: duration,
      })

      return {
        text: transcription.text,
        confidence: 0.95, // Whisper doesn't provide confidence, use fixed value
        provider: 'openai_whisper',
        duration_seconds: transcription.duration,
      }
    } catch (error) {
      if (isRateLimitError(error) && attempt < MAX_RETRIES - 1) {
        const waitTime = getRetryDelay(attempt)

        logger.warn('Whisper rate limited, retrying', {
          attempt: attempt + 1,
          maxRetries: MAX_RETRIES,
          waitTimeMs: waitTime,
        })

        await sleep(waitTime)
        continue
      }

      logger.error('Whisper transcription failed', { error, recordingUrl })
      throw error
    }
  }

  throw new Error('Whisper: Max retries exceeded')
}

/**
 * Generate AI-powered call summary using GPT-4o
 *
 * Extracts:
 * - Brief summary of the conversation
 * - Sentiment (positive, neutral, negative)
 * - Key discussion points
 *
 * @param transcription - Full transcription text
 * @returns CallSummary object
 */
export async function generateCallSummary(transcription: string): Promise<CallSummary> {
  if (!transcription || transcription.trim().length === 0) {
    return {
      summary: 'No transcription available',
      sentiment: 'neutral',
      key_points: [],
    }
  }

  logger.info('Generating call summary', { transcriptionLength: transcription.length })

  try {
    const completion = await createChatCompletion(openai, {
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant that analyzes call transcriptions for a roofing company CRM.
Your task is to provide a brief summary, detect sentiment, and extract key discussion points.

Respond in JSON format:
{
  "summary": "1-2 sentence summary of the call",
  "sentiment": "positive" | "neutral" | "negative",
  "key_points": ["point 1", "point 2", "point 3"]
}

Guidelines:
- Keep summary concise (under 100 words)
- Sentiment should reflect the overall tone and outcome
- Extract 2-5 key points that would be useful for follow-up
- Focus on action items, decisions, and customer concerns`,
        },
        {
          role: 'user',
          content: `Analyze this call transcription:\n\n${transcription}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from GPT')
    }

    const result = JSON.parse(content) as CallSummary

    // Validate and normalize response
    return {
      summary: result.summary || 'Summary not available',
      sentiment: ['positive', 'neutral', 'negative'].includes(result.sentiment)
        ? result.sentiment
        : 'neutral',
      key_points: Array.isArray(result.key_points) ? result.key_points : [],
    }
  } catch (error) {
    logger.error('Failed to generate call summary', { error })

    // Return default summary on error
    return {
      summary: 'Unable to generate summary',
      sentiment: 'neutral',
      key_points: [],
    }
  }
}

/**
 * Transcribe audio and generate summary in one call
 *
 * Convenience function that combines transcription and summarization
 */
export async function transcribeAndSummarize(recordingUrl: string): Promise<{
  transcription: TranscriptionResult
  summary: CallSummary
}> {
  const transcription = await transcribeAudio(recordingUrl)
  const summary = await generateCallSummary(transcription.text)

  return { transcription, summary }
}
