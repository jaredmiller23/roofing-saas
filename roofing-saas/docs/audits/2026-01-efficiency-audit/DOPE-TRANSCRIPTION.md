# DOPE: Call Transcription Implementation

**Date**: 2026-01-13
**Type**: Implementation Targeting Document
**Analyst**: Claude (Scout Role)
**For**: Sniper Team (Execution)

---

## Executive Summary

The infrastructure for call transcription is **90% complete** but the final 10% - the actual transcription service integration - is missing. Database schema exists. Recording webhooks exist. UI components exist. The gap is a single missing route and ~200 lines of service code.

**The ONE Thing**: Create `/api/voice/transcribe` route and integrate OpenAI Whisper API.

**Estimated Total Effort**: ~3-4 hours of focused sniper work

---

## Current State Analysis

### What EXISTS (Ready to Use)

| Component | Location | Status |
|-----------|----------|--------|
| Call logs table with transcription fields | `supabase/migrations/20251003000500_call_logs_table.sql:39-42` | ✅ Ready |
| Voicemail table with transcription fields | `supabase/migrations/20251213140158_aria_tables.sql:79-81` | ✅ Ready |
| Recording webhook (receives Twilio callbacks) | `app/api/voice/recording/route.ts` | ✅ Working |
| TwiML with transcription callback URL | `lib/twilio/voice.ts:182` | ✅ Configured |
| Audio player component | `components/call-logs/audio-player.tsx` | ✅ Complete |
| Call logs table UI | `components/call-logs/call-logs-table.tsx` | ✅ Working |
| OpenAI client with retry logic | `lib/ai/openai-client.ts` | ✅ Ready |
| Call logs API | `app/api/call-logs/route.ts` | ✅ Working |

### What's MISSING (Needs Implementation)

| Component | Location | Status |
|-----------|----------|--------|
| Transcription callback route | `app/api/voice/transcribe/route.ts` | ❌ Does not exist |
| Whisper API integration | `lib/transcription/whisper.ts` | ❌ Does not exist |
| Transcription trigger in recording webhook | `app/api/voice/recording/route.ts:89-90` | ❌ TODOs not implemented |
| Transcription display in UI | `components/call-logs/` | ❌ Not built |
| AI summary generation | N/A | ❌ Not built |

---

## Implementation Tasks

### [TRANS-001] Create Whisper Transcription Service

**Priority**: Critical (Foundation)
**Effort**: 45 minutes

- **Target**: Create `lib/transcription/whisper.ts` (new file)
- **Assessment**: No transcription service exists. Need a utility that downloads audio from Twilio URL and sends to OpenAI Whisper API.
- **Solution**:
  ```typescript
  // lib/transcription/whisper.ts
  import OpenAI from 'openai'
  import { logger } from '@/lib/logger'

  export interface TranscriptionResult {
    text: string
    confidence: number
    provider: 'openai_whisper'
    duration_seconds: number
  }

  export async function transcribeAudio(recordingUrl: string): Promise<TranscriptionResult> {
    // 1. Download audio from Twilio URL (add .mp3 extension)
    // 2. Send to OpenAI Whisper API
    // 3. Return transcription with confidence score
  }

  export async function generateCallSummary(transcription: string): Promise<{
    summary: string
    sentiment: 'positive' | 'neutral' | 'negative'
    key_points: string[]
  }> {
    // Use GPT-4o to summarize transcription
  }
  ```
- **Key Implementation Details**:
  - Use `openai.audio.transcriptions.create()` with model `whisper-1`
  - Twilio recordings need auth - use `{recordingUrl}.mp3?AccountSid={SID}&AuthToken={TOKEN}`
  - Consider using `fetch()` to get audio as blob, then pass to Whisper
  - Return confidence as 0.95 (Whisper doesn't provide confidence, use fixed value)
- **Verification**:
  ```bash
  # Test with a known Twilio recording URL
  curl -X POST http://localhost:3000/api/voice/transcribe/test \
    -H "Content-Type: application/json" \
    -d '{"recording_url": "https://api.twilio.com/..."}'
  ```

---

### [TRANS-002] Create Transcription Webhook Route

**Priority**: Critical (Receives Twilio callbacks)
**Effort**: 30 minutes

- **Target**: Create `app/api/voice/transcribe/route.ts` (new file)
- **Assessment**: TwiML at `lib/twilio/voice.ts:182` sets `transcribeCallback="/api/voice/transcribe"` but this route doesn't exist. Twilio calls fail silently.
- **Solution**:
  ```typescript
  // app/api/voice/transcribe/route.ts
  import { NextRequest, NextResponse } from 'next/server'
  import { createClient } from '@/lib/supabase/server'
  import { logger } from '@/lib/logger'
  import { verifyTwilioSignature, parseTwilioFormData } from '@/lib/webhooks/security'

  export async function POST(request: NextRequest) {
    // 1. Parse Twilio form data (TranscriptionSid, TranscriptionText, etc.)
    // 2. Verify Twilio signature
    // 3. Find associated voicemail_message by call_sid
    // 4. Update with Twilio's native transcription
    // 5. Optionally trigger Whisper for higher accuracy
    // 6. Return 200 OK
  }
  ```
- **Twilio Transcription Fields** (from webhook):
  - `TranscriptionSid` - Unique ID
  - `TranscriptionText` - The transcription
  - `TranscriptionStatus` - 'completed' or 'failed'
  - `TranscriptionUrl` - URL to transcription
  - `RecordingSid` - Associated recording
  - `CallSid` - Associated call
- **Verification**: Check Twilio console for successful webhook delivery after a voicemail

---

### [TRANS-003] Wire Recording Webhook to Trigger Transcription

**Priority**: High (Enables automatic transcription)
**Effort**: 20 minutes

- **Target**: `app/api/voice/recording/route.ts:89-90`
- **Assessment**: Recording webhook has TODOs but no implementation. When recording completes, it should trigger transcription.
- **Current Code**:
  ```typescript
  // Lines 89-90 - Currently just comments
  // TODO: Optionally download and store recording in Supabase Storage
  // TODO: Optionally trigger transcription service
  ```
- **Solution**: Add after line 88:
  ```typescript
  // Trigger transcription if recording completed successfully
  if (recordingStatus === 'completed' && recordingUrl) {
    // Fire-and-forget transcription (don't block webhook response)
    transcribeRecordingAsync(activity.id, recordingUrl, activity.tenant_id)
      .catch(err => logger.error('Background transcription failed', { error: err }))
  }
  ```
- **Create helper function** `transcribeRecordingAsync`:
  ```typescript
  async function transcribeRecordingAsync(
    activityId: string,
    recordingUrl: string,
    tenantId: string
  ) {
    const { transcribeAudio, generateCallSummary } = await import('@/lib/transcription/whisper')

    // 1. Transcribe audio
    const result = await transcribeAudio(recordingUrl)

    // 2. Generate AI summary
    const summary = await generateCallSummary(result.text)

    // 3. Update activity metadata with transcription
    const supabase = await createClient()
    await supabase
      .from('activities')
      .update({
        metadata: {
          ...existingMetadata,
          transcription: result.text,
          transcription_confidence: result.confidence,
          transcription_provider: result.provider,
          summary: summary.summary,
          sentiment: summary.sentiment,
          key_points: summary.key_points,
        }
      })
      .eq('id', activityId)

    // 4. Also update call_logs if exists
    await supabase
      .from('call_logs')
      .update({
        transcription: result.text,
        transcription_confidence: result.confidence,
        transcription_provider: result.provider,
        summary: summary.summary,
        sentiment: summary.sentiment,
        key_points: summary.key_points,
      })
      .eq('tenant_id', tenantId)
      .eq('twilio_call_sid', callSid)
  }
  ```
- **Verification**:
  1. Make a test call with recording enabled
  2. Wait for recording webhook
  3. Check `call_logs` table - transcription field should be populated within 30-60 seconds

---

### [TRANS-004] Add Transcription Display to Call Detail UI

**Priority**: Medium (User-facing)
**Effort**: 30 minutes

- **Target**: Create `components/call-logs/call-transcription.tsx` (new file)
- **Assessment**: Audio player exists but there's no UI to display transcriptions. Users can listen but not read.
- **Solution**:
  ```typescript
  // components/call-logs/call-transcription.tsx
  'use client'

  interface CallTranscriptionProps {
    transcription: string | null
    summary: string | null
    sentiment: 'positive' | 'neutral' | 'negative' | null
    keyPoints: string[] | null
    confidence: number | null
    provider: string | null
  }

  export function CallTranscription({
    transcription,
    summary,
    sentiment,
    keyPoints,
    confidence,
    provider
  }: CallTranscriptionProps) {
    if (!transcription) {
      return (
        <div className="bg-muted/30 rounded-lg p-4 text-center text-muted-foreground">
          <p>Transcription not available</p>
          <p className="text-sm">Recording may still be processing</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {/* AI Summary Card */}
        {summary && (
          <div className="bg-primary/10 rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-2">AI Summary</h4>
            <p className="text-muted-foreground">{summary}</p>
            {sentiment && (
              <span className={`inline-block mt-2 px-2 py-1 rounded text-xs ${
                sentiment === 'positive' ? 'bg-green-500/20 text-green-500' :
                sentiment === 'negative' ? 'bg-red-500/20 text-red-500' :
                'bg-muted text-muted-foreground'
              }`}>
                {sentiment} sentiment
              </span>
            )}
          </div>
        )}

        {/* Key Points */}
        {keyPoints && keyPoints.length > 0 && (
          <div>
            <h4 className="font-medium text-foreground mb-2">Key Points</h4>
            <ul className="list-disc list-inside text-muted-foreground">
              {keyPoints.map((point, i) => <li key={i}>{point}</li>)}
            </ul>
          </div>
        )}

        {/* Full Transcription */}
        <div>
          <h4 className="font-medium text-foreground mb-2">Full Transcription</h4>
          <div className="bg-card border border-border rounded-lg p-4 max-h-64 overflow-y-auto">
            <p className="text-foreground whitespace-pre-wrap">{transcription}</p>
          </div>
          {confidence && provider && (
            <p className="text-xs text-muted-foreground mt-2">
              Transcribed by {provider} (confidence: {(confidence * 100).toFixed(0)}%)
            </p>
          )}
        </div>
      </div>
    )
  }
  ```
- **Integration Point**: Add to call detail page (likely `app/[locale]/(dashboard)/call-logs/[id]/page.tsx`)
- **Verification**: View a call with transcription - summary, sentiment, key points, and full text should display

---

### [TRANS-005] Add Voicemail Transcription Display

**Priority**: Medium (Parallel to TRANS-004)
**Effort**: 30 minutes

- **Target**: Create voicemail UI component or page (if not exists)
- **Assessment**: `voicemail_messages` table exists with transcription fields but no UI to display them.
- **Solution**:
  1. Check if voicemail page exists: `app/[locale]/(dashboard)/voicemail/`
  2. If not, create basic voicemail list and detail pages
  3. Reuse `CallTranscription` component for display
- **Database Fields Available**:
  - `transcription` - Full text
  - `transcription_confidence` - 0.00-1.00
  - `transcription_provider` - 'twilio', 'openai_whisper'
  - `summary` - AI-generated
  - `urgency` - low, normal, high, urgent
  - `detected_intent` - What they're calling about
  - `sentiment` - positive, neutral, negative
- **Verification**: Voicemail page shows transcriptions with urgency indicators

---

### [TRANS-006] Add Manual Transcription Trigger

**Priority**: Low (Nice-to-have)
**Effort**: 20 minutes

- **Target**: Add "Transcribe" button to call detail page
- **Assessment**: For recordings that didn't auto-transcribe, users should be able to manually trigger transcription.
- **Solution**:
  1. Add button to call detail UI
  2. Create API endpoint `POST /api/call-logs/[id]/transcribe`
  3. Endpoint fetches recording URL and triggers transcription
- **Verification**: Click "Transcribe" on a call without transcription - transcription appears after processing

---

### [TRANS-007] Environment Variables Setup

**Priority**: Critical (Required for all)
**Effort**: 5 minutes

- **Target**: `.env.local` and `.env.example`
- **Assessment**: Whisper API uses the same OpenAI key but should verify it's configured.
- **Required Variables**:
  ```bash
  # Already should exist (verify)
  OPENAI_API_KEY=sk-...

  # For downloading recordings (if not using account-level auth)
  TWILIO_ACCOUNT_SID=AC...
  TWILIO_AUTH_TOKEN=...
  ```
- **Solution**: Verify these exist in `.env.local`. If not, add them.
- **Verification**: `echo $OPENAI_API_KEY | head -c 10` shows `sk-` prefix

---

## Architecture Decision: Whisper vs Twilio Native

### Option 1: Twilio Native Transcription (Simpler)
- **Pros**: Already configured in TwiML, automatic, no extra API cost
- **Cons**: English-only, lower accuracy, ~80% confidence typical
- **Use When**: Budget-constrained, English-only users

### Option 2: OpenAI Whisper (Recommended)
- **Pros**: Higher accuracy (~95%), multilingual, better handling of accents/noise
- **Cons**: Additional API cost (~$0.006/minute), slight delay
- **Use When**: Quality matters, diverse user base

### Recommendation
**Use both in sequence**:
1. Accept Twilio's native transcription immediately (for instant display)
2. Trigger Whisper in background for higher-quality version
3. Replace Twilio transcription with Whisper when complete
4. Store both for comparison/fallback

---

## Cost Analysis

### Whisper API Pricing
- **Cost**: $0.006 per minute of audio
- **Example**: 100 calls/day × 3 min avg = 300 min/day = $1.80/day = $54/month

### GPT-4o Summarization
- **Cost**: ~$0.002-0.005 per call (depends on transcription length)
- **Example**: 100 calls/day = $0.20-0.50/day = $6-15/month

### Total Monthly Cost Estimate
- **Light Usage** (50 calls/day): ~$35/month
- **Medium Usage** (100 calls/day): ~$70/month
- **Heavy Usage** (300 calls/day): ~$200/month

---

## Testing Plan

### Unit Tests
1. `lib/transcription/whisper.test.ts` - Test Whisper integration with mock audio
2. `app/api/voice/transcribe/route.test.ts` - Test webhook parsing

### Integration Tests
1. End-to-end: Make call → Recording → Transcription → Display
2. Voicemail flow: Leave voicemail → Transcription → Urgency detection

### Manual Testing Checklist
- [ ] Make outbound call with recording enabled
- [ ] Verify recording appears in call logs
- [ ] Verify transcription appears within 60 seconds
- [ ] Verify AI summary is generated
- [ ] Verify sentiment is detected
- [ ] Verify key points are extracted
- [ ] Leave voicemail on inbound number
- [ ] Verify voicemail transcription appears
- [ ] Verify urgency is detected

---

## Files to Create/Modify

### New Files
| File | Purpose | Lines (est.) |
|------|---------|--------------|
| `lib/transcription/whisper.ts` | Whisper API integration | ~80 |
| `app/api/voice/transcribe/route.ts` | Twilio transcription webhook | ~70 |
| `components/call-logs/call-transcription.tsx` | Transcription display UI | ~100 |

### Files to Modify
| File | Change | Lines Changed |
|------|--------|---------------|
| `app/api/voice/recording/route.ts` | Add transcription trigger | ~30 |
| Call detail page (TBD) | Add transcription component | ~10 |

### Total New Code
- **New files**: ~250 lines
- **Modifications**: ~40 lines
- **Total**: ~290 lines

---

## Execution Order (Sniper Sequence)

1. **[TRANS-007]** Verify environment variables (5 min)
2. **[TRANS-001]** Create Whisper service (45 min)
3. **[TRANS-002]** Create transcribe webhook route (30 min)
4. **[TRANS-003]** Wire recording webhook (20 min)
5. **[TRANS-004]** Create transcription UI component (30 min)
6. **Test** End-to-end flow (15 min)
7. **[TRANS-005]** Voicemail transcription UI (30 min)
8. **[TRANS-006]** Manual transcription trigger (20 min - optional)

**Total**: 3-4 hours

---

## Verification Checklist

After all fixes:
- [ ] `npm run build` succeeds
- [ ] `npm run typecheck` passes
- [ ] Make test call → recording saved
- [ ] Recording webhook triggers transcription
- [ ] Transcription appears in database within 60 seconds
- [ ] Transcription displays in call detail UI
- [ ] AI summary is generated
- [ ] Sentiment is detected
- [ ] Key points are extracted
- [ ] Voicemail transcription works
- [ ] No Twilio webhook errors in console

---

## Related Documentation

- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [Twilio Recording Events](https://www.twilio.com/docs/voice/api/recording#recording-status-callback-parameters)
- [Twilio Transcription](https://www.twilio.com/docs/voice/twiml/record#transcribe)

---

*Scout role complete. Targets identified. Ready for sniper execution.*
