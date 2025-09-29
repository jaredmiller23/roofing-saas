# Voice Assistant Implementation Plan

**Created**: September 29, 2025
**Purpose**: Practical approach to RAG voice assistant for roofing executive

---

## 🎯 Realistic Scope Definition

### What the Client Actually Needs
Based on "RAG voice agent (executive assistant)" requirement:
- **Quick answers** about customers, jobs, schedules
- **Voice input** for hands-free operation (driving between jobs)
- **Simple queries** not complex conversations
- **Mobile-first** for field use

### What We'll Build (MVP)
```
Executive: "What's the status of the Johnson project?"
Assistant: "The Johnson project at 123 Oak Street is 75% complete.
           The crew finished the tear-off yesterday and will start
           laying shingles today, weather permitting."
```

---

## 📱 Implementation Approach

### Phase 1: Text-Based RAG (Week 13)
Start with text, add voice later

```typescript
// /app/api/assistant/query/route.ts
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: Request) {
  const { query, userId } = await request.json();

  // 1. Get context from database
  const context = await getRelevantContext(query);

  // 2. Generate response
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: `You are an executive assistant for a roofing company.
                 Answer based on this context: ${JSON.stringify(context)}`
      },
      { role: 'user', content: query }
    ],
    temperature: 0.3,
    max_tokens: 200
  });

  return NextResponse.json({
    response: completion.choices[0].message.content
  });
}

async function getRelevantContext(query: string) {
  // Search projects, customers, schedules
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .textSearch('search_vector', query)
    .limit(5);

  const { data: schedule } = await supabase
    .from('schedules')
    .select('*')
    .gte('date', new Date().toISOString())
    .limit(10);

  return { projects, schedule };
}
```

### Phase 2: Add Voice Input (Week 14)

#### Browser-Based (Simplest)
```typescript
// components/VoiceInput.tsx
'use client';

import { useState, useEffect } from 'react';

export function VoiceInput({ onTranscript }) {
  const [listening, setListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        onTranscript(transcript);
        setListening(false);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setListening(false);
      };

      setRecognition(recognition);
    }
  }, []);

  const toggleListening = () => {
    if (listening) {
      recognition?.stop();
    } else {
      recognition?.start();
    }
    setListening(!listening);
  };

  return (
    <button
      onClick={toggleListening}
      className={`p-4 rounded-full ${
        listening ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
      }`}
    >
      {listening ? '🎤 Listening...' : '🎤 Tap to speak'}
    </button>
  );
}
```

### Phase 3: Add Voice Output (Week 15)

#### Text-to-Speech Response
```typescript
// utils/textToSpeech.ts
export async function speakResponse(text: string) {
  if ('speechSynthesis' in window) {
    // Browser TTS (free, simple)
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } else {
    // Fallback to OpenAI TTS (better quality, costs money)
    const response = await fetch('/api/assistant/speak', {
      method: 'POST',
      body: JSON.stringify({ text })
    });

    const audioBlob = await response.blob();
    const audio = new Audio(URL.createObjectURL(audioBlob));
    audio.play();
  }
}
```

---

## 🗣️ Common Voice Queries to Support

### Project Status
- "What's the status of the Johnson project?"
- "Which jobs are scheduled for tomorrow?"
- "How many projects are we completing this week?"

### Customer Information
- "What's the phone number for Mike Smith?"
- "When did we last contact the Williams family?"
- "Who requested a quote yesterday?"

### Crew Management
- "Where is crew 2 working today?"
- "Who's available for emergency call tomorrow?"
- "What's the schedule for next Monday?"

### Financial
- "What's our total revenue this month?"
- "How much does customer Johnson owe?"
- "What payments are due this week?"

---

## 💾 Database Schema for RAG

```sql
-- Add vector search capability
CREATE EXTENSION IF NOT EXISTS vector;

-- Add search vectors to existing tables
ALTER TABLE projects ADD COLUMN search_vector tsvector;
ALTER TABLE contacts ADD COLUMN search_vector tsvector;

-- Create indexes for fast search
CREATE INDEX idx_projects_search ON projects USING GIN(search_vector);
CREATE INDEX idx_contacts_search ON contacts USING GIN(search_vector);

-- Update search vectors on insert/update
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.name, '') || ' ' ||
    COALESCE(NEW.address, '') || ' ' ||
    COALESCE(NEW.notes, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_search_update
  BEFORE INSERT OR UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();
```

---

## 🚀 Progressive Enhancement Plan

### MVP (Week 13-14)
- ✅ Text-based queries
- ✅ Search existing data
- ✅ Simple responses
- ✅ Mobile PWA interface

### Enhanced (Week 15)
- ✅ Voice input (Web Speech API)
- ✅ Voice output (Browser TTS)
- ✅ Query history
- ✅ Favorite queries

### Future (Post-launch)
- OpenAI Whisper for better accuracy
- ElevenLabs for natural voice
- Proactive notifications
- Multi-turn conversations

---

## 💰 Cost Analysis

### MVP Approach (Browser-based)
- **Speech Recognition**: Free (Web Speech API)
- **Text-to-Speech**: Free (Browser TTS)
- **OpenAI GPT-4**: ~$0.01 per query
- **Monthly (1000 queries)**: ~$10

### Enhanced Approach
- **Whisper API**: $0.006 per minute
- **OpenAI TTS**: $0.015 per 1K characters
- **GPT-4**: $0.01 per query
- **Monthly (1000 queries)**: ~$40

---

## ⚡ Quick Implementation Checklist

### Week 13: Foundation
- [ ] Set up OpenAI API key
- [ ] Create assistant API endpoint
- [ ] Add search vectors to database
- [ ] Build basic chat interface

### Week 14: Voice Input
- [ ] Implement Web Speech API
- [ ] Add voice recording UI
- [ ] Handle transcription errors
- [ ] Test on mobile devices

### Week 15: Voice Output
- [ ] Add browser TTS
- [ ] Create voice preferences
- [ ] Implement audio feedback
- [ ] Optimize for driving use

### Week 16: Polish
- [ ] Add query shortcuts
- [ ] Improve context retrieval
- [ ] Fine-tune prompts
- [ ] Create user guide

---

## 📱 Mobile UI Example

```typescript
// app/assistant/page.tsx
export default function AssistantPage() {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <h1 className="text-xl font-bold">Roofing Assistant</h1>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2 p-4">
        <button className="p-3 bg-white rounded shadow">
          📅 Today's Schedule
        </button>
        <button className="p-3 bg-white rounded shadow">
          🏠 Active Projects
        </button>
        <button className="p-3 bg-white rounded shadow">
          👥 Crew Status
        </button>
        <button className="p-3 bg-white rounded shadow">
          💰 Pending Payments
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map(msg => (
          <div className={`mb-4 ${msg.role === 'user' ? 'text-right' : ''}`}>
            <div className={`inline-block p-3 rounded ${
              msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-white'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Voice Input */}
      <div className="p-4 bg-white border-t">
        <VoiceInput onTranscript={handleVoiceInput} />
      </div>
    </div>
  );
}
```

---

## ✅ Success Metrics

- Response time < 2 seconds
- Accuracy > 90% for common queries
- Voice recognition success > 85%
- User adoption > 50% in first month

This pragmatic approach delivers real value without over-engineering!