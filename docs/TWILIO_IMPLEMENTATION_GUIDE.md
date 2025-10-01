# Twilio Implementation Guide for Roofing SaaS

**Created**: September 29, 2025
**Purpose**: Complete implementation guide for SMS, calling, and recording features

---

## 📱 SMS Implementation

### Setup & Installation

```bash
npm install twilio
```

### Environment Variables (.env.local)
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_MESSAGING_SERVICE_SID=optional_for_production
```

### API Route (/app/api/sms/send/route.ts)
```typescript
import { NextResponse } from 'next/server';
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request: Request) {
  try {
    const { to, message, leadId } = await request.json();

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
    });

    // Log to database
    await logSmsActivity(leadId, message, result.sid);

    return NextResponse.json({
      success: true,
      messageSid: result.sid
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send SMS' },
      { status: 500 }
    );
  }
}
```

### Production Considerations
- **Messaging Service**: Use for sender pools and higher throughput
- **Webhook Status**: Configure webhooks for delivery status
- **Rate Limiting**: Implement to prevent abuse
- **Trial Limitations**: Verify recipient numbers in console

---

## 📞 Voice Calling & Recording

### Call Recording Setup

#### Legal Requirements (CRITICAL)
Tennessee is a **one-party consent state**, but if calling other states:
- California, Connecticut, Florida: Two-party consent required
- **Best Practice**: Always announce recording at call start

### Recording Implementation

#### Start Recording on Call
```typescript
// API Route: /app/api/calls/create/route.ts
export async function POST(request: Request) {
  const { to, from } = await request.json();

  const call = await client.calls.create({
    to: to,
    from: process.env.TWILIO_PHONE_NUMBER,
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/calls/twiml`,
    record: true,  // Enable recording
    recordingChannels: 'dual',  // Dual-channel for better quality
    recordingStatusCallback: `${process.env.NEXT_PUBLIC_BASE_URL}/api/calls/recording-status`,
  });

  return NextResponse.json({ callSid: call.sid });
}
```

#### TwiML Response Handler
```typescript
// API Route: /app/api/calls/twiml/route.ts
import { twiml } from 'twilio';

export async function POST(request: Request) {
  const response = new twiml.VoiceResponse();

  // Legal announcement
  response.say({
    voice: 'alice',
    language: 'en-US'
  }, 'This call may be recorded for quality and training purposes.');

  // Record the call
  response.record({
    timeout: 10,
    transcribe: true,
    maxLength: 3600, // 1 hour max
    action: '/api/calls/recording-complete',
    recordingStatusCallback: '/api/calls/recording-status',
    recordingStatusCallbackMethod: 'POST'
  });

  return new Response(response.toString(), {
    headers: { 'Content-Type': 'text/xml' }
  });
}
```

### Recording Storage & Management

```typescript
// Handle recording completion
export async function POST(request: Request) {
  const formData = await request.formData();
  const recordingSid = formData.get('RecordingSid');
  const recordingUrl = formData.get('RecordingUrl');
  const duration = formData.get('RecordingDuration');

  // Store in Supabase
  await supabase.from('call_recordings').insert({
    recording_sid: recordingSid,
    url: recordingUrl + '.mp3',  // Get MP3 format
    duration: parseInt(duration),
    call_sid: formData.get('CallSid'),
    transcription_pending: true
  });
}
```

### Security & Compliance

#### PCI Mode (if handling payments)
```typescript
// Enable in Twilio Console or via API
await client.accounts(accountSid).update({
  pciMode: true  // Encrypts recordings
});
```

#### Recording Encryption
```typescript
// For sensitive data
const recording = await client.recordings(recordingSid).update({
  pauseBehavior: 'skip',  // Skip paused portions
  status: 'paused'  // Pause when sensitive data discussed
});
```

### Recording Costs
- **Storage**: $0.0005 per recording minute per month
- **Transcription**: $0.05 per minute
- **Recommendation**: Delete after 90 days unless needed

---

## 🔄 Webhook Configuration

### Status Callbacks
```typescript
// Supabase schema for tracking
create table sms_messages (
  id uuid default gen_random_uuid(),
  message_sid text unique,
  to_number text,
  from_number text,
  body text,
  status text, -- queued, sent, delivered, failed
  error_message text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

// Webhook handler
export async function POST(request: Request) {
  const data = await request.formData();
  const status = data.get('MessageStatus');
  const sid = data.get('MessageSid');

  await supabase
    .from('sms_messages')
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('message_sid', sid);

  return new Response('OK', { status: 200 });
}
```

---

## 💰 Cost Estimates

### SMS Pricing (US)
- **Outbound SMS**: $0.0079 per message
- **Inbound SMS**: $0.0075 per message
- **Phone Number**: $1.15/month

### Voice Pricing
- **Outbound Calls**: $0.014 per minute
- **Inbound Calls**: $0.0085 per minute
- **Recording Storage**: $0.0005 per minute/month
- **Transcription**: $0.05 per minute

### Monthly Estimate (100 leads)
- 500 SMS: ~$4
- 100 calls (5 min avg): ~$7
- Recording storage: ~$2.50
- Phone numbers (2): $2.30
- **Total**: ~$16/month

---

## 🚀 Quick Start Checklist

### Phase 1: SMS Only
- [ ] Create Twilio account
- [ ] Get phone number
- [ ] Set up environment variables
- [ ] Create send SMS API route
- [ ] Test with verified numbers

### Phase 2: Voice & Recording
- [ ] Add recording disclosure
- [ ] Implement TwiML endpoints
- [ ] Set up recording storage
- [ ] Configure webhooks
- [ ] Test compliance

### Phase 3: Production
- [ ] Upgrade to paid account
- [ ] Configure Messaging Service
- [ ] Set up error monitoring
- [ ] Implement rate limiting
- [ ] Add usage analytics

---

## ⚠️ Common Pitfalls

1. **Not handling webhook retries** - Twilio retries failed webhooks
2. **Storing recordings forever** - Gets expensive, implement retention
3. **Not announcing recording** - Legal liability
4. **Hardcoding phone numbers** - Use environment variables
5. **Not validating phone formats** - Use E.164 format (+1234567890)

---

## 🔗 Resources

- [Twilio Node.js SDK](https://www.twilio.com/docs/libraries/node)
- [Recording Compliance](https://www.twilio.com/docs/voice/tutorials/recording-consent)
- [Webhook Security](https://www.twilio.com/docs/usage/webhooks/webhooks-security)
- [Status Callbacks](https://www.twilio.com/docs/sms/api/message-resource#message-status-values)