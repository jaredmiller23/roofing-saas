# ElevenLabs Voice Integration for Roofing Assistant

**Created**: September 29, 2025
**Purpose**: Premium text-to-speech for executive voice assistant

---

## 🎯 Why ElevenLabs?

### Comparison with Alternatives
| Feature | Browser TTS | OpenAI TTS | ElevenLabs |
|---------|------------|------------|------------|
| Quality | Robotic | Good | **Excellent** |
| Latency | Instant | 500ms | 400ms |
| Cost | Free | $15/1M chars | $30/1M chars |
| Voices | Limited | 6 voices | 1000+ voices |
| Emotion | None | Limited | **Full range** |
| Languages | 20+ | 50+ | 29 |

### For Roofing Executive
- **Natural conversation** while driving
- **Professional voice** for customer-facing features
- **Consistent brand voice** across all interactions
- **Emotional intelligence** in responses

---

## 🚀 Implementation Guide

### Step 1: Account Setup
```bash
# Sign up at elevenlabs.io
# Get API key from profile
# Add to .env.local
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # Rachel voice (default)
```

### Step 2: Install SDK
```bash
npm install elevenlabs
# or
npm install @11labs/voice
```

### Step 3: Basic Integration

```typescript
// lib/elevenlabs.ts
import { ElevenLabsClient } from "elevenlabs";

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

export async function textToSpeech(
  text: string,
  voiceId: string = process.env.ELEVENLABS_VOICE_ID!
): Promise<Buffer> {
  const audioStream = await elevenlabs.generate({
    voice: voiceId,
    text: text,
    model_id: "eleven_turbo_v2",  // Fastest model
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.0,
      use_speaker_boost: true
    }
  });

  const chunks: Buffer[] = [];
  for await (const chunk of audioStream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}
```

### Step 4: Streaming for Low Latency

```typescript
// app/api/assistant/speak-stream/route.ts
import { ElevenLabsClient } from "elevenlabs";

export async function POST(request: Request) {
  const { text, voiceId = "21m00Tcm4TlvDq8ikWAM" } = await request.json();

  const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY
  });

  // Create streaming response
  const audioStream = await elevenlabs.textToSpeech.convertAsStream(
    voiceId,
    {
      text: text,
      model_id: "eleven_turbo_v2",
      optimize_streaming_latency: 3,  // Optimize for mobile
      output_format: "mp3_44100_128"
    }
  );

  // Return as streaming response
  return new Response(audioStream as any, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',  // Disable Nginx buffering
    }
  });
}
```

### Step 5: Client-Side Audio Player

```typescript
// components/VoiceAssistant.tsx
import { useState, useRef } from 'react';

export function VoiceAssistant() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function speakResponse(text: string) {
    try {
      setIsPlaying(true);

      // Stream audio from API
      const response = await fetch('/api/assistant/speak-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      // Create blob URL for audio
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Play audio
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Speech synthesis failed:', error);
      // Fallback to browser TTS
      fallbackToWebSpeech(text);
    } finally {
      setIsPlaying(false);
    }
  }

  function fallbackToWebSpeech(text: string) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  }

  return (
    <>
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
      {/* Your UI components */}
    </>
  );
}
```

---

## 🎤 Voice Selection for Roofing Business

### Recommended Voices

#### For Executive (Internal Use)
- **Adam** (professional, authoritative)
- **Antoni** (friendly, approachable)
- **Rachel** (clear, professional female)

#### For Customer-Facing
- **Bella** (warm, friendly female)
- **Domi** (professional female)
- **Josh** (confident male)

### Voice Cloning Option
```typescript
// Clone owner's voice for personalized touch
const clonedVoice = await elevenlabs.voices.clone({
  name: "Company Owner",
  files: ["owner_sample1.mp3", "owner_sample2.mp3"],
  description: "Roofing company owner's voice"
});

// Use cloned voice
await textToSpeech(text, clonedVoice.voice_id);
```

---

## 💰 Cost Optimization

### Pricing Tiers
- **Free**: 10,000 chars/month (testing only)
- **Starter**: $5/mo - 30,000 chars
- **Creator**: $22/mo - 100,000 chars
- **Pro**: $99/mo - 500,000 chars

### Character Estimation
```typescript
// Average assistant response: 150 characters
// Daily usage: 50 queries = 7,500 chars
// Monthly: 225,000 characters
// Recommended: Pro plan ($99/month)

function estimateCost(text: string): number {
  const characters = text.length;
  const costPer1000 = 0.30;  // Pro plan rate
  return (characters / 1000) * costPer1000;
}
```

### Caching Strategy
```typescript
// Cache common responses
const responseCache = new Map<string, Buffer>();

export async function getCachedSpeech(text: string): Promise<Buffer> {
  const cacheKey = crypto
    .createHash('md5')
    .update(text)
    .digest('hex');

  if (responseCache.has(cacheKey)) {
    return responseCache.get(cacheKey)!;
  }

  const audio = await textToSpeech(text);
  responseCache.set(cacheKey, audio);

  // Store in Supabase for persistence
  await supabase.storage
    .from('voice-cache')
    .upload(`${cacheKey}.mp3`, audio);

  return audio;
}
```

---

## 🔄 Complete Voice Pipeline

### Full Implementation
```typescript
// app/api/assistant/voice-query/route.ts
import { OpenAI } from 'openai';
import { ElevenLabsClient } from "elevenlabs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const audioFile = formData.get('audio') as File;

  // 1. Transcribe with Whisper
  const openai = new OpenAI();
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-1",
    language: "en"
  });

  // 2. Process query with GPT-4
  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: "You are a roofing company assistant." },
      { role: "user", content: transcription.text }
    ],
    max_tokens: 150,  // Keep responses concise for voice
  });

  const responseText = completion.choices[0].message.content;

  // 3. Convert to speech with ElevenLabs
  const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY
  });

  const audioStream = await elevenlabs.textToSpeech.convertAsStream(
    process.env.ELEVENLABS_VOICE_ID!,
    {
      text: responseText,
      model_id: "eleven_turbo_v2",
      optimize_streaming_latency: 3
    }
  );

  // 4. Return audio stream
  return new Response(audioStream as any, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'X-Response-Text': encodeURIComponent(responseText)  // Include text for UI
    }
  });
}
```

---

## 📱 Mobile-Optimized Implementation

### PWA Voice Interface
```typescript
// components/MobileVoiceAssistant.tsx
export function MobileVoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);

    mediaRecorder.current.ondataavailable = (event) => {
      audioChunks.current.push(event.data);
    };

    mediaRecorder.current.onstop = async () => {
      const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
      audioChunks.current = [];
      await processVoiceQuery(audioBlob);
    };

    mediaRecorder.current.start();
    setIsListening(true);
  }

  function stopRecording() {
    mediaRecorder.current?.stop();
    setIsListening(false);
  }

  async function processVoiceQuery(audioBlob: Blob) {
    setIsProcessing(true);

    const formData = new FormData();
    formData.append('audio', audioBlob);

    const response = await fetch('/api/assistant/voice-query', {
      method: 'POST',
      body: formData
    });

    // Play response directly
    const audioResponse = await response.blob();
    const audio = new Audio(URL.createObjectURL(audioResponse));
    await audio.play();

    setIsProcessing(false);
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <button
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
        className={`w-32 h-32 rounded-full ${
          isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
        } text-white shadow-lg`}
        disabled={isProcessing}
      >
        {isProcessing ? '⏳' : isListening ? '🎤' : '🎙️'}
      </button>
      <p className="mt-4 text-gray-600">
        {isProcessing ? 'Processing...' : isListening ? 'Listening...' : 'Hold to speak'}
      </p>
    </div>
  );
}
```

---

## ⚡ Performance Optimization

### Latency Reduction
1. **Use Turbo model**: 50% faster than regular
2. **Stream responses**: Start playback before complete
3. **Pregenerate common responses**: Cache frequently used
4. **Regional deployment**: Deploy close to users

### Offline Fallback
```typescript
// Register service worker for offline caching
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

// sw.js - Cache voice responses
self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/assistant/speak')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
        .catch(() => {
          // Return cached generic response
          return caches.match('/offline-response.mp3');
        })
    );
  }
});
```

---

## 🎯 Implementation Checklist

### Week 13-14: Foundation
- [ ] Create ElevenLabs account
- [ ] Select and test voices
- [ ] Basic TTS integration
- [ ] Error handling with fallback

### Week 15: Optimization
- [ ] Implement streaming
- [ ] Add response caching
- [ ] Optimize for mobile
- [ ] Test in vehicles (driving scenario)

### Week 16: Polish
- [ ] Voice selection UI
- [ ] Volume controls
- [ ] Playback speed adjustment
- [ ] Usage analytics

---

## 💡 Pro Tips

1. **Start with free tier** during development
2. **Use turbo model** for lowest latency
3. **Cache everything** to reduce costs
4. **Implement fallbacks** for reliability
5. **Test in cars** for real-world validation

This integration provides professional-grade voice output that will impress the roofing executive!