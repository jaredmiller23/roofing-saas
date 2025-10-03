# Phase 4: AI Voice Assistant - Implementation Plan

**Status**: 🚧 In Progress
**Date Created**: October 3, 2025
**Architecture**: OpenAI Realtime API with WebRTC
**Priority**: Crown Jewel Feature

---

## 🎯 Executive Summary

Building an industry-first voice assistant for roofing field teams using OpenAI's Realtime API with WebRTC. This enables hands-free CRM interactions while on roofs or in the field.

**Key Benefits**:
- ⚡ **Ultra-low latency**: <1 second response time
- 💰 **Cost-efficient**: $2.80-3.30/user/month
- 🎙️ **Natural speech**: Direct speech-to-speech (no intermediate steps)
- 🔧 **CRM integration**: Built-in function calling for contacts, notes, photos
- 🛡️ **Secure**: End-to-end encryption via WebRTC

---

## 📋 Technical Approach

### Architecture: OpenAI Realtime API + WebRTC

**Why This Approach**:
✅ Single API call for speech-to-speech (vs 3-step pipeline)
✅ Native WebRTC support (peer-to-peer, low latency)
✅ Built-in function calling (CRM actions)
✅ Production-ready from OpenAI
✅ 2-3x faster than Whisper + GPT-4 + ElevenLabs

**What We're NOT Using** (Original Plan):
❌ Whisper API (speech-to-text)
❌ GPT-4 Turbo (text processing)
❌ ElevenLabs (text-to-speech)
❌ Multiple API orchestration

---

## 🏗️ Implementation Phases

### Phase 4.1: Foundation (Week 13)
**Goal**: Establish WebRTC connection and basic voice interaction

**Tasks**:
- [ ] Create database schema (`voice_sessions` table)
- [ ] Set up API route: `/api/voice/session` (session creation)
- [ ] Implement WebRTC client component
- [ ] Test basic speech-to-speech interaction
- [ ] Handle microphone permissions

**Deliverables**:
- Voice session management
- Working WebRTC connection
- Basic conversation capability

---

### Phase 4.2: CRM Integration (Week 14)
**Goal**: Enable voice commands for CRM actions

**Tasks**:
- [ ] Design function calling schema
- [ ] Implement CRM functions:
  - `create_contact` - Add new contact by voice
  - `add_note` - Dictate notes to existing contact/project
  - `search_contact` - Find contact by name/address
  - `get_project_status` - Check project details
  - `log_activity` - Record door knock, appointment, etc.
- [ ] Build function execution layer
- [ ] Add confirmation UX for actions

**Deliverables**:
- 5+ working voice commands
- CRM actions from voice
- Activity logging

---

### Phase 4.3: Context & RAG (Week 15)
**Goal**: Voice assistant understands roofing business context

**Tasks**:
- [ ] Integrate with contact/project data
- [ ] Implement session context (current contact, project)
- [ ] Add roofing industry knowledge base
- [ ] Build conversation memory
- [ ] Add multi-turn conversation support

**Deliverables**:
- Context-aware responses
- Multi-turn conversations
- Industry-specific knowledge

---

### Phase 4.4: Production Polish (Week 16)
**Goal**: Production-ready voice assistant

**Tasks**:
- [ ] Add interruption handling
- [ ] Implement error recovery
- [ ] Add offline fallback
- [ ] Performance optimization
- [ ] Security hardening
- [ ] User testing & feedback

**Deliverables**:
- Production-ready system
- Error handling
- Performance benchmarks
- User documentation

---

## 💾 Database Schema

### `voice_sessions` Table

```sql
CREATE TABLE voice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Session metadata
  session_id TEXT UNIQUE NOT NULL, -- OpenAI session ID
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, failed
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Context
  contact_id UUID REFERENCES contacts(id), -- Active contact during session
  project_id UUID REFERENCES projects(id), -- Active project during session
  context JSONB, -- Session context (location, recent activities, etc.)

  -- Usage tracking
  total_audio_duration_seconds INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  function_calls_count INTEGER DEFAULT 0,

  -- Technical
  connection_info JSONB, -- WebRTC connection details
  error_log JSONB[], -- Any errors during session

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes
  CONSTRAINT voice_sessions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_voice_sessions_tenant_id ON voice_sessions(tenant_id);
CREATE INDEX idx_voice_sessions_user_id ON voice_sessions(user_id);
CREATE INDEX idx_voice_sessions_status ON voice_sessions(status);
CREATE INDEX idx_voice_sessions_started_at ON voice_sessions(started_at DESC);

-- RLS Policies
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own voice sessions"
  ON voice_sessions FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can create their own voice sessions"
  ON voice_sessions FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update their own voice sessions"
  ON voice_sessions FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );
```

### `voice_function_calls` Table (Activity Log)

```sql
CREATE TABLE voice_function_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  session_id UUID NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,

  -- Function details
  function_name TEXT NOT NULL, -- e.g., 'create_contact', 'add_note'
  parameters JSONB NOT NULL, -- Function parameters
  result JSONB, -- Function result
  status TEXT NOT NULL, -- success, failed, pending

  -- Entity references
  entity_type TEXT, -- 'contact', 'project', 'activity'
  entity_id UUID, -- Related entity ID

  -- Timing
  called_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Error handling
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_voice_function_calls_session_id ON voice_function_calls(session_id);
CREATE INDEX idx_voice_function_calls_function_name ON voice_function_calls(function_name);
CREATE INDEX idx_voice_function_calls_status ON voice_function_calls(status);

-- RLS
ALTER TABLE voice_function_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own function calls"
  ON voice_function_calls FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );
```

---

## 🎙️ WebRTC Client Architecture

### Component Structure

```
/app/(dashboard)/voice/
├── page.tsx                    # Voice assistant page
└── components/
    ├── VoiceSession.tsx        # Main WebRTC component
    ├── MicrophoneControl.tsx   # Mic permissions & controls
    ├── SessionStatus.tsx       # Connection status display
    ├── FunctionConfirmation.tsx # Confirm actions before executing
    └── VoiceHistory.tsx        # Session history & playback
```

### WebRTC Connection Flow

```typescript
// 1. Initialize session
POST /api/voice/session
→ Returns: { session_id, ephemeral_token }

// 2. Establish WebRTC connection
const pc = new RTCPeerConnection();
const dc = pc.createDataChannel("oai-events");

// 3. Add microphone stream
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
stream.getTracks().forEach(track => pc.addTrack(track, stream));

// 4. Generate offer
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);

// 5. Send offer to OpenAI
POST https://api.openai.com/v1/realtime
Authorization: Bearer {ephemeral_token}
Body: { type: "offer", sdp: offer.sdp }

// 6. Receive answer
const answer = await response.json();
await pc.setRemoteDescription(answer);

// 7. Configure session
dc.send(JSON.stringify({
  type: "session.update",
  session: {
    instructions: "You are a helpful assistant for roofing field teams...",
    voice: "alloy",
    temperature: 0.7,
    tools: [/* Function definitions */]
  }
}));
```

---

## 🔧 Function Calling Design

### Function Schema

Each function follows OpenAI's function calling format:

```typescript
const functions = [
  {
    name: "create_contact",
    description: "Create a new contact (lead/customer) in the CRM",
    parameters: {
      type: "object",
      properties: {
        first_name: { type: "string" },
        last_name: { type: "string" },
        phone: { type: "string" },
        address: { type: "string" },
        notes: { type: "string" }
      },
      required: ["first_name", "last_name"]
    }
  },
  {
    name: "add_note",
    description: "Add a note to an existing contact or project",
    parameters: {
      type: "object",
      properties: {
        entity_type: { type: "string", enum: ["contact", "project"] },
        entity_id: { type: "string" },
        note: { type: "string" }
      },
      required: ["entity_type", "entity_id", "note"]
    }
  },
  {
    name: "search_contact",
    description: "Search for a contact by name or address",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" }
      },
      required: ["query"]
    }
  },
  {
    name: "log_activity",
    description: "Log a field activity (door knock, appointment, inspection)",
    parameters: {
      type: "object",
      properties: {
        activity_type: { type: "string", enum: ["door_knock", "appointment", "inspection", "call"] },
        contact_id: { type: "string" },
        notes: { type: "string" },
        outcome: { type: "string" }
      },
      required: ["activity_type", "contact_id"]
    }
  }
];
```

### Function Execution

```typescript
// In WebRTC data channel listener
dc.onmessage = async (event) => {
  const message = JSON.parse(event.data);

  if (message.type === "function_call_request") {
    const { name, parameters } = message;

    // Execute function
    const result = await executeCRMFunction(name, parameters);

    // Send result back to OpenAI
    dc.send(JSON.stringify({
      type: "function_call_response",
      call_id: message.call_id,
      output: JSON.stringify(result)
    }));
  }
};

async function executeCRMFunction(name: string, params: any) {
  switch (name) {
    case "create_contact":
      return await fetch("/api/contacts", {
        method: "POST",
        body: JSON.stringify(params)
      }).then(r => r.json());

    case "add_note":
      return await fetch("/api/activities", {
        method: "POST",
        body: JSON.stringify({
          activity_type: "note",
          ...params
        })
      }).then(r => r.json());

    case "search_contact":
      return await fetch(`/api/contacts/search?q=${params.query}`)
        .then(r => r.json());

    case "log_activity":
      return await fetch("/api/activities", {
        method: "POST",
        body: JSON.stringify(params)
      }).then(r => r.json());

    default:
      throw new Error(`Unknown function: ${name}`);
  }
}
```

---

## 🔒 Security Considerations

### 1. **Ephemeral Tokens**
- Generate short-lived tokens (30 min TTL)
- Never expose OpenAI API key to client
- Token rotation on session expiry

### 2. **Function Authorization**
- Verify user has permission to execute CRM functions
- Check RLS policies before executing
- Log all function calls for audit

### 3. **Data Privacy**
- No audio recording unless explicitly enabled
- Session transcripts stored only if user opts in
- GDPR/CCPA compliance for voice data

### 4. **Rate Limiting**
- Limit sessions per user per day
- Throttle function calls (prevent abuse)
- Monitor token usage

---

## 📊 Success Metrics

### Performance
- ⚡ Response latency: <1 second (target)
- 🎯 Function call accuracy: >90%
- 🔊 Audio quality: >95% clarity

### Business
- 👥 Adoption rate: 50% of field team in first month
- 🚪 Activity logging: 3x increase in door knock logs
- ⏱️ Time savings: 5 min/day per user (vs manual entry)

### Technical
- 🟢 Uptime: 99.5%
- 💰 Cost per user: <$3.50/month
- 🔄 Session completion rate: >95%

---

## 🚀 Getting Started

### Prerequisites
- [x] OpenAI API key configured (✅ `.env.local`)
- [ ] Supabase `voice_sessions` table created
- [ ] WebRTC-compatible browser (Chrome, Safari, Edge)
- [ ] HTTPS (required for microphone access)

### Next Steps
1. Create database migration for voice tables
2. Build `/api/voice/session` endpoint
3. Implement `VoiceSession` component with WebRTC
4. Test basic speech-to-speech
5. Add first CRM function (`create_contact`)

---

## 📚 Resources

- [OpenAI Realtime API Guide](https://platform.openai.com/docs/guides/realtime)
- [Unofficial WebRTC Guide](https://webrtchacks.com/the-unofficial-guide-to-openai-realtime-webrtc-api/)
- [WebRTC API Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)

---

**Status**: Ready for implementation 🚀
**Estimated Timeline**: 4 weeks (Weeks 13-16)
**Risk Level**: Medium (new technology, but production-ready from OpenAI)
