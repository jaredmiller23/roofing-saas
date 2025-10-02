# SMS Testing Guide

**Status**: ✅ Working (tested October 1, 2025)
**Test Phone**: +1XXXXXXXXXX

---

## 🎯 Issue Found & Fixed

### Problem
The original `/api/sms/send` endpoint requires authentication, which made testing with curl difficult during development.

### Root Cause
The `middleware.ts` file blocks ALL routes except those in the `publicRoutes` array. API routes weren't excluded, causing authentication failures.

### Solution
1. Created `/api/sms/test` endpoint (no authentication required)
2. Updated `middleware.ts` to allow test endpoint and webhooks

---

## 🧪 Working Test Command

```bash
curl -X POST http://localhost:3000/api/sms/test \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1XXXXXXXXXX",
    "body": "Your test message here"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "message": "Test SMS sent successfully",
    "sms": {
      "sid": "SM...",
      "to": "+1XXXXXXXXXX",
      "from": "+1XXXXXXXXXX",
      "status": "queued"
    }
  }
}
```

---

## 🔒 Security Notes

### Test Endpoint Security
The `/api/sms/test` endpoint:
- ✅ **Disabled in production** (`process.env.NODE_ENV === 'production'`)
- ⚠️ **No authentication** (development only)
- ⚠️ **No compliance checks** (no opt-out, quiet hours enforcement)

### Production Endpoint
Use `/api/sms/send` for production:
- ✅ Requires authentication
- ✅ TCPA compliance checks
- ✅ Activity logging
- ✅ Template support

---

## 📋 Public Routes (No Auth Required)

Updated `middleware.ts` to allow:

| Route | Purpose | Caller |
|-------|---------|--------|
| `/api/sms/test` | SMS testing | Development testing |
| `/api/sms/webhook` | Receive SMS | Twilio callbacks |
| `/api/email/webhook` | Email events | Resend callbacks |
| `/api/voice/webhook` | Call status | Twilio callbacks |
| `/api/voice/twiml` | Call instructions | Twilio callbacks |
| `/api/voice/recording` | Recording ready | Twilio callbacks |

**Why Public?**
Webhooks are called by external services (Twilio, Resend) that don't have auth tokens. They use webhook signature validation instead.

---

## 🔍 Troubleshooting

### 1. SMS Not Received

**Check Twilio Logs**:
```bash
curl -X GET "https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json?PageSize=5" \
  -u "YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN"
```

Look for:
- `"status": "delivered"` ✅ Success
- `"status": "failed"` ❌ Check error_code
- `"status": "undelivered"` ❌ Invalid phone number

**Common Issues**:
- ❌ Phone number not in E.164 format (must start with +1)
- ❌ Invalid phone number
- ❌ Phone carrier blocking messages
- ❌ Twilio trial account restrictions

### 2. "Redirecting to /login"

**Problem**: Endpoint not in `publicRoutes` array in `middleware.ts`

**Fix**: Add route to public routes:
```typescript
const publicRoutes = [
  // ... existing routes
  '/api/your-endpoint',
]
```

### 3. "User not authenticated"

**Problem**: Using production `/api/sms/send` endpoint without auth

**Options**:
1. Use `/api/sms/test` endpoint (development only)
2. Add authentication headers to curl
3. Login to the app first to get session cookie

### 4. Environment Variables

**Verify Twilio credentials**:
```bash
# Check .env.local
cat .env.local | grep TWILIO

# Expected:
# TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
```

---

## 📊 Message Status Flow

1. **`queued`** → Message accepted by Twilio
2. **`sending`** → Twilio is sending to carrier
3. **`sent`** → Carrier received message
4. **`delivered`** ✅ Message delivered to phone
5. **`failed`** ❌ Delivery failed (check error_code)
6. **`undelivered`** ❌ Carrier rejected

---

## 🧪 Test Scenarios

### Test 1: Basic SMS ✅
```bash
curl -X POST http://localhost:3000/api/sms/test \
  -H "Content-Type: application/json" \
  -d '{
    "to": "\+1XXXXXXXXXX",
    "body": "Test message"
  }'
```

### Test 2: Long Message (Multi-segment)
```bash
curl -X POST http://localhost:3000/api/sms/test \
  -H "Content-Type: application/json" \
  -d '{
    "to": "\+1XXXXXXXXXX",
    "body": "This is a very long message that exceeds 160 characters and will be split into multiple segments by Twilio. Each segment costs money so we need to track this properly in our analytics and billing systems."
  }'
```

### Test 3: Special Characters
```bash
curl -X POST http://localhost:3000/api/sms/test \
  -H "Content-Type: application/json" \
  -d '{
    "to": "\+1XXXXXXXXXX",
    "body": "Testing special chars: 🎉 emoji, \"quotes\", & symbols!"
  }'
```

### Test 4: Invalid Phone Number (Should Fail)
```bash
curl -X POST http://localhost:3000/api/sms/test \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "body": "This should fail"
  }'
```

---

## 🚀 Next Steps

1. ⏳ **Run database migrations** (required for `/api/sms/send` production endpoint)
   - `20251001_sms_compliance.sql`
   - `20251001_email_tracking.sql`
   - `20251001_automation_workflows.sql`

2. ⏳ **Setup ngrok** for webhook testing
   ```bash
   ngrok http --url=ccai.ngrok.io 80
   ```

3. ⏳ **Configure Twilio webhooks**
   - SMS webhook: `https://ccai.ngrok.io/api/sms/webhook`
   - Voice webhook: `https://ccai.ngrok.io/api/voice/webhook`

4. ⏳ **Test reply handling**
   - Reply to SMS and check `/api/sms/webhook` logs
   - Test STOP/START opt-out keywords

---

## 📚 Related Files

- `app/api/sms/test/route.ts` - Test endpoint (no auth)
- `app/api/sms/send/route.ts` - Production endpoint (with auth)
- `app/api/sms/webhook/route.ts` - Receive SMS from Twilio
- `middleware.ts` - Authentication and public routes
- `lib/twilio/sms.ts` - SMS sending logic
- `lib/twilio/compliance.ts` - TCPA compliance checks

---

**Last Updated**: October 1, 2025
**Tested By**: Claude & User
**Status**: ✅ Working
