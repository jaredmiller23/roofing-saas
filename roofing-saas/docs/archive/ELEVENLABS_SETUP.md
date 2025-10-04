# ElevenLabs Conversational AI Setup Guide

## Step 1: Get ElevenLabs API Key

1. Go to [ElevenLabs](https://elevenlabs.io)
2. Sign up or log in
3. Go to Profile → API Keys
4. Create a new API key
5. Copy the key

## Step 2: Add to Environment Variables

Add to `.env.local`:
```
ELEVENLABS_API_KEY=your_api_key_here
```

## Step 3: Create Conversational AI Agent

1. Go to [Conversational AI Dashboard](https://elevenlabs.io/conversational-ai)
2. Click "Create New Agent"
3. Configure the agent:

### Agent Configuration

**Name**: Roofing CRM Assistant

**System Prompt**:
```
You are a helpful AI assistant for a roofing field team with full conversation context awareness.

**Context & Memory:**
- You maintain full conversation context throughout our interaction
- Reference previous messages naturally (e.g., "that contact", "the address you mentioned")
- Ask contextual follow-up questions (e.g., "Would you like to log a knock there too?")
- Remember entities from earlier turns (contacts, addresses, projects)
- Use pronouns when context is clear instead of repeating names

**Your Capabilities:**

CRM Actions:
- Create new contacts (leads/customers)
- Add notes to contacts or projects
- Search for existing contacts by name or address
- Log door knock activities with disposition (interested, not_interested, not_home, callback, appointment)
- Update contact pipeline stage (new, contacted, qualified, proposal, negotiation, won, lost)

Communication:
- Send SMS messages
- Initiate phone calls
- Always confirm SMS content and phone calls before executing

Intelligence Features:
- Get weather forecasts for roofing work planning
- Search roofing knowledge base for warranties, materials, best practices
- Search the web for current market intelligence

**Important Guidelines:**
- Read phone numbers digit-by-digit (e.g., "4-2-3-5-5-5-5-5-5-5" not "four hundred twenty-three")
- Be concise and professional
- Ask clarifying questions when context is ambiguous
- Always confirm actions before executing
- Suggest related actions based on conversation context
```

**Voice**: Choose from 5,000+ voices (recommend "Rachel" or "Adam" for professional tone)

**Model**: GPT-4o or Claude 3.5 Sonnet (for best performance with our CRM)

**Language**: English

**First Message**: "Hi! I'm your roofing CRM assistant. I can help you create contacts, log knocks, send messages, and more. What would you like to do?"

### Custom Tools/Functions

Add these custom functions to the agent:

#### 1. create_contact
```json
{
  "name": "create_contact",
  "description": "Create a new contact (lead/customer) in the CRM",
  "parameters": {
    "type": "object",
    "properties": {
      "first_name": { "type": "string" },
      "last_name": { "type": "string" },
      "phone": { "type": "string" },
      "address": { "type": "string" },
      "notes": { "type": "string" }
    },
    "required": ["first_name", "last_name"]
  },
  "webhook_url": "https://your-domain.vercel.app/api/voice/elevenlabs/create-contact"
}
```

#### 2. add_note
```json
{
  "name": "add_note",
  "description": "Add a note to an existing contact or project",
  "parameters": {
    "type": "object",
    "properties": {
      "entity_type": { "type": "string", "enum": ["contact", "project"] },
      "entity_id": { "type": "string" },
      "note": { "type": "string" }
    },
    "required": ["entity_type", "entity_id", "note"]
  },
  "webhook_url": "https://your-domain.vercel.app/api/voice/elevenlabs/add-note"
}
```

#### 3. search_contact
```json
{
  "name": "search_contact",
  "description": "Search for a contact by name or address",
  "parameters": {
    "type": "object",
    "properties": {
      "query": { "type": "string" }
    },
    "required": ["query"]
  },
  "webhook_url": "https://your-domain.vercel.app/api/voice/elevenlabs/search-contact"
}
```

*Continue for all 10 functions...*

## Step 4: Get Agent ID

1. After creating the agent, click "..." menu
2. Select "Copy Agent ID"
3. Add to `.env.local`:
```
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id_here
```

## Step 5: Configure Function Webhooks

For each function webhook, you'll need to create API endpoints that:
1. Receive the function call from ElevenLabs
2. Execute the CRM operation
3. Return the result

Example endpoint structure:
```
POST /api/voice/elevenlabs/[function-name]
Body: { parameters: {...} }
Response: { result: {...} }
```

## Cost Comparison

**OpenAI Realtime API**: ~$0.30/minute
- Audio input: $0.06/minute
- Audio output: $0.24/minute
- GPT-4o realtime

**ElevenLabs Conversational AI**: ~$0.08/minute
- Includes ASR, LLM, and TTS
- 75% cost savings
- Premium voice quality
- Sub-100ms latency

## Testing

1. Use the ElevenLabs dashboard to test your agent
2. Try voice commands:
   - "Create a contact named Sarah Johnson at 555-9876"
   - "What's the weather forecast for tomorrow?"
   - "Search for John Smith"

## Integration Status

- ✅ Packages installed
- ⏳ Agent configuration (manual setup required)
- ⏳ Function webhooks (will be created next)
- ⏳ Frontend component (will be created next)
