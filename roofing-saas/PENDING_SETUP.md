# Pending Setup Tasks

**Status**: Phase 2 code complete, awaiting configuration and testing
**Last Updated**: October 1, 2025

---

## 🔴 Critical - Required Before Phase 3

### 1. Database Migrations ⏳
**Status**: Not yet run
**Required**: YES - Phase 3 depends on these tables

**Action Required**:
Run these in Supabase SQL Editor (https://supabase.com/dashboard/project/wfifizczqvogbcqamnmw/sql):

1. `supabase/migrations/20251001_sms_compliance.sql`
2. `supabase/migrations/20251001_email_tracking.sql`
3. `supabase/migrations/20251001_automation_workflows.sql`

**Instructions**: Copy each file's contents, paste into SQL Editor, click "Run"

---

### 2. Resend Email Domain Verification 🔴 PENDING
**Status**: PENDING - User acknowledged "still trying to figure out the setup"
**Priority**: HIGH - Required for production email sending

**Current Configuration**:
- API Key: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx` ✅ Added to .env.local
- Domain: `notifications.claimclarityai.com` ⏳ Needs verification
- From Name: "Roofing SaaS" ✅ Configured

**Action Required**:

#### Step 1: Verify Domain in Resend Dashboard
1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Enter: `notifications.claimclarityai.com`
4. Follow their verification steps

#### Step 2: Add DNS Records
Resend will provide these records to add to your DNS provider (GoDaddy/Cloudflare/etc):

**Expected DNS Records**:
```
Type: TXT
Name: notifications.claimclarityai.com
Value: resend-verification=xxxx (Resend will provide this)

Type: TXT
Name: _dmarc.notifications.claimclarityai.com
Value: v=DMARC1; p=none; rua=mailto:dmarc@notifications.claimclarityai.com

Type: TXT
Name: notifications.claimclarityai.com
Value: v=spf1 include:_spf.resend.com ~all

Type: CNAME
Name: resend._domainkey.notifications.claimclarityai.com
Value: resend._domainkey.resend.com
```

#### Step 3: Test Email Sending
Once domain is verified, test with:
```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com",
    "subject": "Test Email from Roofing SaaS",
    "html": "<h1>Hello!</h1><p>This is a test email.</p>",
    "text": "Hello! This is a test email."
  }'
```

**Why This Matters**:
- Without domain verification, emails may go to spam
- Some email providers may reject unverified domains
- Required for production-level deliverability

**Circle Back Reminder**: Check Resend dashboard periodically for verification status

---

## 🟡 Important - Testing Phase 2 Features

### 3. Test SMS Feature ⏳
**Status**: API built, one test SMS sent successfully
**Required**: Recommended before Phase 3

**Action Required**:
```bash
# Test SMS sending via API
curl -X POST http://localhost:3000/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "\+1XXXXXXXXXX",
    "body": "Test message from Roofing SaaS"
  }'
```

**Test Checklist**:
- [ ] Send test SMS
- [ ] Reply "STOP" to test opt-out
- [ ] Reply "START" to test opt-in
- [ ] Verify quiet hours (try sending outside 8am-9pm)
- [ ] Check activities table for logged messages

---

### 4. Configure Webhooks with ngrok 🟡
**Status**: Code ready, webhooks not yet configured
**Priority**: MEDIUM - Required for receiving SMS/calls and email tracking

**Your ngrok Command**:
```bash
ngrok http --url=ccai.ngrok.io 80
```

**Webhook URLs to Configure**:

#### Twilio Dashboard (https://console.twilio.com)
Navigate to: Phone Numbers → Active Numbers → \+1XXXXXXXXXX

**SMS Webhook**:
- URL: `https://ccai.ngrok.io/api/sms/webhook`
- Method: POST
- Events: Incoming SMS

**Voice Webhook**:
- URL: `https://ccai.ngrok.io/api/voice/webhook`
- Method: POST
- Events: Call status updates

#### Resend Dashboard (https://resend.com/webhooks)
Click "Add Webhook":
- URL: `https://ccai.ngrok.io/api/email/webhook`
- Events to subscribe:
  - `email.delivered`
  - `email.opened`
  - `email.clicked`
  - `email.bounced`
  - `email.complained`

**Testing After Configuration**:
- Reply to an SMS → Check activities table for inbound message
- Click link in email → Check email_events table for click event
- Make a call → Check call_logs table for status updates

---

## 🟢 Optional - Can Test Later

### 5. Create Test Workflows ⏳
**Status**: Engine built, no workflows created yet
**Priority**: LOW - Can test anytime

**Example Workflow**:
```bash
curl -X POST http://localhost:3000/api/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome New Contact",
    "trigger_type": "contact_created",
    "is_active": true,
    "steps": [
      {
        "step_order": 1,
        "step_type": "send_sms",
        "step_config": {
          "to": "{{trigger.contact.phone}}",
          "body": "Welcome {{trigger.contact.first_name}}! Thanks for your interest."
        },
        "delay_minutes": 0
      }
    ]
  }'
```

---

### 6. Test Analytics API ⏳
**Status**: Built but not tested
**Priority**: LOW

**Test Commands**:
```bash
# Summary analytics
curl http://localhost:3000/api/analytics?type=summary

# Call volume (last 30 days)
curl http://localhost:3000/api/analytics?type=call_volume&days=30

# Answer rate
curl http://localhost:3000/api/analytics?type=answer_rate&days=7
```

---

## 📊 Setup Progress

| Task | Status | Blocker | Phase 3 Dependency |
|------|--------|---------|-------------------|
| Database Migrations | ⏳ Not Run | User action needed | YES |
| Resend Domain | 🔴 PENDING | DNS configuration | YES (for emails) |
| SMS Testing | 🟡 Partial | One test sent | NO |
| Webhook Setup | ⏳ Not Done | Requires ngrok | NO (but recommended) |
| Workflow Testing | ⏳ Not Done | None | NO |
| Analytics Testing | ⏳ Not Done | None | NO |

---

## 🚀 Ready for Phase 3?

**Minimum Requirements**:
- ✅ Phase 2 code complete
- ⏳ Database migrations run
- ⏳ At least SMS tested once
- ⏳ Resend domain verified (for production emails)

**Current Status**: 25% ready (code done, configuration pending)

---

## 📝 Notes

- **Resend Domain**: User acknowledged "still trying to figure out the setup" - check back periodically
- **ngrok**: Using custom domain `ccai.ngrok.io` on port 80
- **Twilio**: Credentials configured and working (test SMS confirmed: "Received!!!")
- **Timeline**: Phase 3 starts when user confirms ready

---

## 🔔 Circle Back Reminders

1. **Resend Domain Verification** - Check Resend dashboard for verification status
2. **DNS Records** - Ensure all SPF, DKIM, DMARC records added
3. **Test Email** - Send test email after domain verified
4. **Production Deployment** - Update webhook URLs from ngrok to production domain

---

**Last Action**: User provided Resend credentials and ngrok domain
**Next Action**: User to verify Resend domain and run database migrations
**Phase 3 Start**: When user confirms setup complete
