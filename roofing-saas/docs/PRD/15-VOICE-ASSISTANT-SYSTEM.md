# 15. Voice Assistant System (AI Voice CRM)

## Overview

The Voice Assistant System is an industry-first AI-powered voice interface for roofing field teams, enabling hands-free CRM interactions using speech-to-speech technology. Built on a **dual-provider architecture** supporting both **OpenAI Realtime API** and **ElevenLabs Conversational AI**, the system provides ultra-low latency voice commands for managing contacts, logging door knocks, adding notes, and performing CRM actions—all without touching the screen.

**Key Value Proposition:**
- Field workers can manage CRM on rooftops or while door knocking
- Sub-2 second response time with WebRTC streaming
- 10+ CRM function calls available via voice
- Provider flexibility: OpenAI ($0.30/min) or ElevenLabs ($0.08/min - 73% savings)
- Mobile-optimized with iOS/Android audio handling
- Context-aware conversations with contact/project integration

## User Stories

### As a Sales Rep (Field)
- I want to create new contacts by voice so I can capture leads while on a roof
- I want to log door knocks by saying the address and disposition so I don't need to stop and type
- I want to search for a contact by name so I can quickly find records before a meeting
- I want to add notes to a contact by dictating so I can document conversations immediately
- I want to check the weather forecast so I know if it's safe to work on roofs today

### As an Office Staff Member
- I want to use voice commands for quick CRM lookups so I can multitask during calls
- I want to switch between voice providers to optimize costs or quality
- I want the assistant to understand context (current contact, project) so I don't repeat information

### As a Business Owner
- I want voice session analytics to understand usage patterns and costs
- I want all voice-initiated actions logged for audit purposes
- I want the system to work reliably on mobile devices for field team productivity

### As an Admin
- I want to configure voice provider preferences for cost control
- I want to run diagnostics to troubleshoot microphone and connection issues
- I want secure ephemeral tokens that expire after 30 minutes

## Features

### 1. Dual Voice Provider Architecture

The system supports two voice AI providers with seamless switching:

**OpenAI Realtime API:**
- Model: `gpt-4o-realtime-preview-2024-12-17`
- Default voice: Alloy
- Cost: ~$0.30/minute
- Direct speech-to-speech (no intermediate transcription)
- Built-in function calling
- WebRTC-based peer-to-peer connection

**ElevenLabs Conversational AI:**
- 5,000+ premium voices
- Cost: ~$0.08/minute (73% savings)
- Sub-100ms latency
- 32+ languages supported
- Client-side tool execution

**Implementation:**
- File: `lib/voice/providers/types.ts` - Abstract provider interface
- File: `lib/voice/providers/openai-provider.ts` - OpenAI implementation (195 lines)
- File: `lib/voice/providers/elevenlabs-provider.ts` - ElevenLabs implementation (176 lines)
- File: `lib/voice/providers/index.ts` - Factory function (69 lines)

### 2. Voice Session Management

WebRTC-based voice sessions with full lifecycle management:

- **Session Creation:** Server generates ephemeral tokens for secure client connections
- **Connection Establishment:** WebRTC peer connection with STUN servers
- **Audio Streaming:** Real-time bi-directional audio via MediaStream API
- **Data Channel:** JSON message passing for function calls and events
- **Session Cleanup:** Proper resource release, wake lock handling

**Implementation:**
- File: `components/voice/VoiceSession.tsx` - Main component (670 lines)
- File: `app/api/voice/session/route.ts` - OpenAI session endpoint (142 lines)
- File: `app/api/voice/session/elevenlabs/route.ts` - ElevenLabs session endpoint (136 lines)

### 3. CRM Function Calling

10+ voice-activated CRM functions:

| Function | Description | Parameters |
|----------|-------------|------------|
| `create_contact` | Create new contact (lead/customer) | first_name, last_name, phone, address |
| `search_contact` | Find contact by name/address | query |
| `add_note` | Add note to contact/project | entity_id, note |
| `log_knock` | Log door knock activity | address, disposition (interested/not_interested/not_home) |
| `update_contact_stage` | Change pipeline stage | contact_id, stage |
| `send_sms` | Send SMS message | to, body, contact_id |
| `make_call` | Initiate phone call | to, contact_id, record |
| `get_weather` | Get weather forecast | location, days |
| `search_roofing_knowledge` | RAG search for roofing info | query |
| `search_web` | Web search for real-time info | query |

**Implementation:**
- File: `components/voice/VoiceSession.tsx` - `executeCRMFunction()` (lines 328-471)
- API integrations call existing endpoints: `/api/contacts`, `/api/activities`, `/api/knocks`, `/api/sms/send`, etc.

### 4. AI Assistant Bar (Persistent Chat)

ChatGPT Mobile-style bottom bar that persists across all dashboard pages:

- **Collapsed State:** Input preview, voice button, quick actions
- **Expanded State:** Full chat history, settings panel, conversation management
- **Minimized State:** Floating icon button
- **Voice Integration:** Start/stop voice sessions from anywhere
- **Context Awareness:** Detects current page entity (contact, project, etc.)

**Implementation:**
- File: `components/ai-assistant/AIAssistantBar.tsx` - Main UI (301 lines)
- File: `components/ai-assistant/ChatHistory.tsx` - Message display
- File: `components/ai-assistant/ChatInput.tsx` - Text input
- File: `components/ai-assistant/ConversationList.tsx` - History browser
- File: `components/ai-assistant/QuickActionsMenu.tsx` - Quick action buttons

### 5. Text-to-Speech (TTS)

ElevenLabs TTS for high-quality voice output:

- Model: `eleven_turbo_v2_5` (fast, high-quality)
- Default voice: Bella (`EXAVITQu4vr4xnSDxMaL`)
- Voice settings: stability 0.5, similarity_boost 0.75, style 0.5
- Audio streaming response (MP3)

**Implementation:**
- File: `app/api/voice/elevenlabs-tts/route.ts` - TTS endpoint (98 lines)

### 6. Intelligence Tools

Voice-accessible knowledge and information tools:

**Weather API:**
- Location-based forecast (default: Nashville, TN)
- Roofing safety assessment (wind speed, precipitation)
- 3-day forecast with conditions

**RAG Knowledge Search:**
- Vector similarity search on roofing knowledge base
- Query embedding via OpenAI
- Supabase RPC for similarity search
- Returns relevant content with summaries

**Web Search:**
- Real-time web information retrieval
- Configured for MCP WebSearch integration

**Implementation:**
- File: `app/api/voice/weather/route.ts` - Weather API (163 lines)
- File: `app/api/voice/search-rag/route.ts` - RAG search (138 lines)
- File: `app/api/voice/search-web/route.ts` - Web search (66 lines)

### 7. Voice Diagnostics

Built-in troubleshooting tool for voice issues:

- Browser detection (Safari, Chrome, Firefox)
- Environment variable validation (ELEVENLABS_AGENT_ID)
- SDK availability check (@elevenlabs/client)
- API endpoint testing
- Microphone permission testing with progressive fallback
- Audio constraint compatibility testing

**Implementation:**
- File: `components/voice/VoiceDiagnostics.tsx` - Diagnostics modal (256 lines)

### 8. Mobile Optimization

Device-specific audio handling for field use:

- **iOS Safari:** Conservative audio constraints for compatibility
- **Android Chrome:** Enhanced echo cancellation
- **Desktop:** Full constraints with sample rate optimization
- **Wake Lock:** Prevents screen sleep during voice sessions
- **Touch Targets:** 48px+ touch areas for mobile UI

**Implementation:**
- File: `components/voice/VoiceSession.tsx` - Device detection (lines 32-85)
- Functions: `isMobileDevice()`, `isIOSDevice()`, `getAudioConstraints()`

## Technical Implementation

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       CLIENT (Browser)                          │
├─────────────────────────────────────────────────────────────────┤
│  VoiceSession Component                                         │
│    ├── MediaStream (Microphone)                                 │
│    ├── Voice Provider Instance                                  │
│    │     ├── OpenAI Provider (WebRTC + Data Channel)           │
│    │     └── ElevenLabs Provider (Conversation SDK)            │
│    └── Function Executor (CRM API calls)                        │
│                                                                 │
│  AIAssistantBar Component                                       │
│    ├── AIAssistantContext (Global State)                       │
│    ├── Chat History / Messages                                  │
│    └── Quick Actions Menu                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ WebRTC / HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SERVER (Next.js)                          │
├─────────────────────────────────────────────────────────────────┤
│  /api/voice/session         → OpenAI ephemeral token            │
│  /api/voice/session/elevenlabs → ElevenLabs signed URL          │
│  /api/voice/elevenlabs-tts  → Text-to-speech                    │
│  /api/voice/weather         → Weather forecast                  │
│  /api/voice/search-rag      → Knowledge base search             │
│  /api/voice/search-web      → Web search                        │
│                                                                 │
│  /api/ai/conversations      → Chat conversation CRUD            │
│  /api/ai/messages           → Message handling                  │
│  /api/ai/chat/stream        → Streaming responses               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ API Calls
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                            │
├─────────────────────────────────────────────────────────────────┤
│  OpenAI Realtime API                                            │
│    └── api.openai.com/v1/realtime/sessions                     │
│                                                                 │
│  ElevenLabs Conversational AI                                   │
│    └── api.elevenlabs.io/v1/convai/conversation/get_signed_url │
│                                                                 │
│  OpenWeatherMap API                                             │
│    └── api.openweathermap.org/data/2.5/forecast                │
│                                                                 │
│  Supabase                                                       │
│    └── voice_sessions, voice_function_calls tables              │
└─────────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `lib/voice/providers/types.ts` | Voice provider abstract interface | 135 |
| `lib/voice/providers/openai-provider.ts` | OpenAI Realtime implementation | 195 |
| `lib/voice/providers/elevenlabs-provider.ts` | ElevenLabs Conversational implementation | 176 |
| `lib/voice/providers/index.ts` | Provider factory and registry | 69 |
| `components/voice/VoiceSession.tsx` | Main voice session component | 670 |
| `components/voice/VoiceDiagnostics.tsx` | Diagnostics tool | 256 |
| `app/api/voice/session/route.ts` | OpenAI session creation | 142 |
| `app/api/voice/session/elevenlabs/route.ts` | ElevenLabs session creation | 136 |
| `app/api/voice/elevenlabs-tts/route.ts` | Text-to-speech API | 98 |
| `app/api/voice/weather/route.ts` | Weather forecast API | 163 |
| `app/api/voice/search-rag/route.ts` | RAG knowledge search | 138 |
| `app/api/voice/search-web/route.ts` | Web search integration | 66 |
| `lib/ai-assistant/context.tsx` | AI assistant global state | 675 |
| `lib/ai-assistant/types.ts` | AI assistant type definitions | 192 |
| `components/ai-assistant/AIAssistantBar.tsx` | Persistent chat UI | 301 |
| `app/(dashboard)/voice-assistant/page.tsx` | Voice assistant page | 126 |
| `app/(dashboard)/voice/page.tsx` | Voice demo page | 249 |

### Data Flow

**Voice Session Initialization:**
```
1. User clicks "Start Voice Assistant"
2. VoiceSession.startSession()
3. navigator.mediaDevices.getUserMedia() → Get microphone stream
4. createVoiceProvider(provider) → Instantiate provider
5. provider.initSession() → POST /api/voice/session
6. Server generates ephemeral token from OpenAI/ElevenLabs
7. Server creates voice_sessions record in DB
8. Returns session_id + ephemeral_token
9. provider.establishConnection() → WebRTC setup
10. User speaks → Audio streamed to provider
11. Provider responds → Audio played back
```

**Function Call Flow:**
```
1. User says: "Create a contact named John Smith"
2. Provider parses intent and triggers function call
3. FunctionCallEvent { name: "create_contact", parameters: {...} }
4. executeCRMFunction() in VoiceSession
5. POST /api/contacts with parameters
6. Result returned to provider via sendFunctionResult()
7. Provider speaks confirmation to user
```

## API Endpoints

### POST /api/voice/session
Creates an OpenAI Realtime API voice session.

**Authentication:** Required (Supabase Auth)

**Request Body:**
```json
{
  "contact_id": "uuid (optional)",
  "project_id": "uuid (optional)",
  "context": {
    "timestamp": "2025-12-11T15:00:00Z"
  }
}
```

**Response:**
```json
{
  "data": {
    "session_id": "sess_...",
    "ephemeral_token": "sk-...",
    "database_session_id": "uuid",
    "expires_at": "2025-12-11T15:30:00Z"
  }
}
```

### POST /api/voice/session/elevenlabs
Creates an ElevenLabs Conversational AI session.

**Authentication:** Required (Supabase Auth)

**Request Body:**
```json
{
  "agent_id": "agent-id (optional, uses env default)",
  "contact_id": "uuid (optional)",
  "project_id": "uuid (optional)"
}
```

**Response:**
```json
{
  "data": {
    "session_id": "uuid",
    "database_session_id": "uuid",
    "signed_url": "wss://...",
    "agent_id": "agent-id",
    "provider": "elevenlabs"
  }
}
```

### POST /api/voice/elevenlabs-tts
Converts text to speech using ElevenLabs.

**Request Body:**
```json
{
  "text": "Hello, this is a test.",
  "voice_id": "EXAVITQu4vr4xnSDxMaL (optional, default: Bella)"
}
```

**Response:** Audio stream (audio/mpeg)

### POST /api/voice/weather
Gets weather forecast for roofing work safety.

**Request Body:**
```json
{
  "location": "Nashville,TN,US (optional)",
  "days": 3
}
```

**Response:**
```json
{
  "data": {
    "location": "Nashville",
    "current": {
      "temperature": 72,
      "feels_like": 70,
      "conditions": "Partly Cloudy",
      "humidity": 65,
      "wind_speed": 8,
      "wind_direction": "NW"
    },
    "forecast": [...],
    "safe_to_work": true,
    "notes": "Good roofing conditions."
  }
}
```

### POST /api/voice/search-rag
Searches roofing knowledge base using vector similarity.

**Request Body:**
```json
{
  "query": "GAF Timberline warranty",
  "threshold": 0.7,
  "limit": 3
}
```

**Response:**
```json
{
  "data": {
    "query": "GAF Timberline warranty",
    "results": [...],
    "summary": "GAF Timberline shingles come with a...",
    "tokens_used": 25
  }
}
```

## Data Models

### voice_sessions Table

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant reference |
| user_id | UUID | User reference |
| provider | TEXT | 'openai' or 'elevenlabs' |
| session_id | TEXT | Provider-specific session ID |
| status | TEXT | 'active', 'completed', 'failed' |
| started_at | TIMESTAMPTZ | Session start time |
| ended_at | TIMESTAMPTZ | Session end time |
| duration_seconds | INTEGER | Total session duration |
| contact_id | UUID | Active contact during session |
| project_id | UUID | Active project during session |
| context | JSONB | Session context (location, activities) |
| total_audio_duration_seconds | INTEGER | Audio duration |
| total_tokens_used | INTEGER | Token usage |
| function_calls_count | INTEGER | Number of function calls |
| connection_info | JSONB | WebRTC connection details |
| error_log | JSONB[] | Any errors during session |

### voice_function_calls Table

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant reference |
| session_id | UUID | Voice session reference |
| function_name | TEXT | CRM function name |
| parameters | JSONB | Function parameters |
| result | JSONB | Function result |
| status | TEXT | 'pending', 'success', 'failed' |
| entity_type | TEXT | 'contact', 'project', 'activity' |
| entity_id | UUID | Created/modified entity ID |
| called_at | TIMESTAMPTZ | Function call time |
| completed_at | TIMESTAMPTZ | Completion time |
| duration_ms | INTEGER | Execution duration |
| error_message | TEXT | Error if failed |

## Database Schema

**Migration Files:**
- `supabase/migrations/20251003_voice_assistant_tables.sql` (215 lines)
- `supabase/migrations/20251004_add_voice_provider.sql` (42 lines)

**Indexes:**
```sql
CREATE INDEX idx_voice_sessions_tenant_id ON voice_sessions(tenant_id);
CREATE INDEX idx_voice_sessions_user_id ON voice_sessions(user_id);
CREATE INDEX idx_voice_sessions_status ON voice_sessions(status);
CREATE INDEX idx_voice_sessions_started_at ON voice_sessions(started_at DESC);
CREATE INDEX idx_voice_sessions_session_id ON voice_sessions(session_id);
CREATE INDEX idx_voice_sessions_provider ON voice_sessions(provider);

CREATE INDEX idx_voice_function_calls_tenant_id ON voice_function_calls(tenant_id);
CREATE INDEX idx_voice_function_calls_session_id ON voice_function_calls(session_id);
CREATE INDEX idx_voice_function_calls_function_name ON voice_function_calls(function_name);
CREATE INDEX idx_voice_function_calls_status ON voice_function_calls(status);
CREATE INDEX idx_voice_function_calls_called_at ON voice_function_calls(called_at DESC);
```

**RLS Policies:**
- Users can view/create/update their own voice sessions
- Users can view/create/update function calls within their tenant
- Tenant-based isolation via tenant_users relationship

## Integration Points

### Contact Management
- `create_contact` function creates contacts via `/api/contacts`
- `search_contact` searches contacts by name/address
- `update_contact_stage` changes pipeline stage

### Activity Tracking
- `add_note` creates note activities
- `log_knock` creates door_knock activities
- Voice sessions logged as activities for analytics

### Communications
- `send_sms` sends messages via Twilio
- `make_call` initiates calls via `/api/voice/call`
- Communication actions logged to activities

### Knowledge Base
- RAG search uses `search_roofing_knowledge` RPC
- Vector embeddings via OpenAI embedding API
- Knowledge queries logged for analytics

### Project Management
- Sessions can be associated with active projects
- Project context passed to assistant for relevance

## Configuration

### Environment Variables

```env
# OpenAI (Required for OpenAI provider)
OPENAI_API_KEY=sk-...

# ElevenLabs (Required for ElevenLabs provider)
ELEVENLABS_API_KEY=sk-...
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=agent-...

# Weather (Optional - falls back to mock data)
OPENWEATHER_API_KEY=...
```

### Provider Configuration

```typescript
// Default provider selection
export function getDefaultProvider(): VoiceProviderType {
  return 'openai'
}

// Available providers with capabilities
export function getAvailableProviders() {
  return [
    {
      type: 'openai',
      name: 'OpenAI Realtime API',
      costPerMinute: 0.30,
      features: ['WebRTC', 'Function calling', 'Multi-turn'],
      status: 'ready',
    },
    {
      type: 'elevenlabs',
      name: 'ElevenLabs Conversational AI',
      costPerMinute: 0.08,
      features: ['5000+ voices', 'Sub-100ms latency', '32+ languages'],
      status: 'ready',
    },
  ]
}
```

## Security

### Token Management
- Ephemeral tokens with 30-minute TTL
- Server-side token generation (API keys never exposed to client)
- Token validation on every session creation

### Authentication
- All voice endpoints require Supabase Auth
- Tenant isolation via RLS policies
- User-specific session ownership

### WebRTC Security
- End-to-end encryption via DTLS-SRTP
- STUN servers for NAT traversal
- No audio stored unless explicitly enabled

### Audit Logging
- All function calls logged to voice_function_calls
- Session metadata tracked for analytics
- Error logs captured for debugging

## Testing

### Voice Diagnostics
- Browser compatibility testing
- Microphone permission verification
- SDK availability checks
- API endpoint validation
- Progressive audio constraint fallback

### E2E Testing Considerations
- Voice sessions require real microphone access
- Mock audio streams for automated tests
- Provider API mocking for CI/CD

## Performance

### Latency Targets
- Response time: <2 seconds
- Audio streaming: Real-time (WebRTC)
- Function execution: <500ms

### Cost Optimization
- OpenAI: ~$0.30/minute
- ElevenLabs: ~$0.08/minute (73% savings)
- Estimated usage: 5-10 minutes/user/day
- Monthly cost: $2.50-9.00/user

### Mobile Optimization
- Wake lock prevents screen sleep
- Progressive audio constraint fallback
- Touch-optimized UI (48px+ targets)
- Device-specific audio handling

## Dependencies

```json
{
  "@elevenlabs/client": "^0.7.1",
  "@elevenlabs/elevenlabs-js": "^2.17.0",
  "openai": "^6.0.1"
}
```

## Future Enhancements

### Planned Features
- Voice activity logging for gamification points
- Multi-language support (32+ via ElevenLabs)
- Custom voice selection per user
- Conversation transcripts and replay
- Offline voice command queueing

### Integration Opportunities
- DocuSign: Voice-initiated document sending
- QuickBooks: Voice invoice queries
- Calendar: Voice appointment scheduling

---

## Validation Record

### Files Examined
- `/Users/ccai/roofing saas/roofing-saas/lib/voice/providers/types.ts` - Voice provider interface (135 lines)
- `/Users/ccai/roofing saas/roofing-saas/lib/voice/providers/openai-provider.ts` - OpenAI implementation verified
- `/Users/ccai/roofing saas/roofing-saas/lib/voice/providers/elevenlabs-provider.ts` - ElevenLabs implementation verified
- `/Users/ccai/roofing saas/roofing-saas/lib/voice/providers/index.ts` - Factory function verified
- `/Users/ccai/roofing saas/roofing-saas/components/voice/VoiceSession.tsx` - Main component (670 lines)
- `/Users/ccai/roofing saas/roofing-saas/components/voice/VoiceDiagnostics.tsx` - Diagnostics tool (256 lines)
- `/Users/ccai/roofing saas/roofing-saas/app/api/voice/session/route.ts` - OpenAI session endpoint
- `/Users/ccai/roofing saas/roofing-saas/app/api/voice/session/elevenlabs/route.ts` - ElevenLabs endpoint
- `/Users/ccai/roofing saas/roofing-saas/app/api/voice/elevenlabs-tts/route.ts` - TTS endpoint
- `/Users/ccai/roofing saas/roofing-saas/app/api/voice/weather/route.ts` - Weather API
- `/Users/ccai/roofing saas/roofing-saas/app/api/voice/search-rag/route.ts` - RAG search
- `/Users/ccai/roofing saas/roofing-saas/app/api/voice/search-web/route.ts` - Web search
- `/Users/ccai/roofing saas/roofing-saas/lib/ai-assistant/context.tsx` - AI assistant context (675 lines)
- `/Users/ccai/roofing saas/roofing-saas/lib/ai-assistant/types.ts` - Type definitions
- `/Users/ccai/roofing saas/roofing-saas/components/ai-assistant/AIAssistantBar.tsx` - Chat bar UI
- `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/voice-assistant/page.tsx` - Voice page
- `/Users/ccai/roofing saas/roofing-saas/app/(dashboard)/voice/page.tsx` - Demo page
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251003_voice_assistant_tables.sql` - DB schema
- `/Users/ccai/roofing saas/roofing-saas/supabase/migrations/20251004_add_voice_provider.sql` - Provider migration
- `/Users/ccai/roofing saas/roofing-saas/docs/architecture/PHASE4_VOICE_ASSISTANT_IMPLEMENTATION.md` - Architecture doc
- `/Users/ccai/roofing saas/roofing-saas/package.json` - Dependencies verified

### Archon RAG Queries
- Query: "WebRTC voice assistant real-time API speech to speech" - Found Web Speech API references

### Verification Steps
1. Verified all file paths exist via `ls -la` commands
2. Confirmed dual provider architecture (OpenAI + ElevenLabs)
3. Verified 10+ CRM functions in VoiceSession.tsx executeCRMFunction()
4. Confirmed database tables and indexes in migration files
5. Verified RLS policies for multi-tenant isolation
6. Confirmed mobile optimization code (device detection, audio constraints)
7. Verified dependencies in package.json (@elevenlabs/client, openai)
8. Cross-referenced implementation with PHASE4_VOICE_ASSISTANT_IMPLEMENTATION.md

### Validated By
PRD Documentation Agent - Session 17
Date: 2025-12-11T15:01:10Z
