# Communications Setup Guide - Appalachian Storm Restoration

**Purpose:** Step-by-step guide to set up production SMS, voice, and email for ASR.
**Estimated Time:** 2-3 hours (plus 24-48 hours for A2P approval)

---

## Overview

| Provider | Purpose | Status |
|----------|---------|--------|
| **Twilio** | SMS + Voice calls | Needs full setup |
| **Resend** | Email sending | ✅ Already configured |

---

## Part 1: Twilio Setup (SMS + Voice)

### Step 1.1: Account & Payment (5 min)

```
1. Go to: https://console.twilio.com/
2. Log in with existing account
3. Billing → Make Payment (if suspended)
4. Verify account is active (green status)
```

**Verification:**
- Account status shows "Active"
- No payment warnings

---

### Step 1.2: Business Profile Registration (15 min)

**Why:** Required for A2P 10DLC. Without this, SMS to US numbers gets filtered/blocked.

```
1. Go to: Console → Trust Hub → Customer Profiles
2. Click "Create Customer Profile"
3. Select: "Secondary Business Profile" (if primary exists) or "Primary Business Profile"
4. Fill in ASR business details:

   Business Information:
   - Legal Business Name: Appalachian Storm Restoration LLC
   - Business Type: LLC
   - Business Industry: Construction/Home Services
   - Business Registration Number: [EIN]
   - Business Registration Country: United States

   Address:
   - Street: [ASR Street Address]
   - City: [City]
   - State: Tennessee
   - ZIP: [ZIP]
   - Country: United States

   Contact:
   - First Name: Fahredin
   - Last Name: Nushi
   - Email: fahredin@goappsr.com
   - Phone: [Fahredin's phone]
   - Job Title: Owner

5. Submit for review
```

**Verification:**
- Profile status: "Pending Review" or "Approved"
- Takes 1-24 hours for approval

---

### Step 1.3: A2P 10DLC Brand Registration (10 min)

**Why:** Registers ASR as a legitimate business sender with carriers.

```
1. Go to: Console → Messaging → Services → Trust Center
2. Click "Register a Brand"
3. Link to Customer Profile created in Step 1.2
4. Fill in brand details:

   Brand Name: Appalachian Storm Restoration
   Brand Type: Standard (most businesses)

   Vertical: Construction & Home Improvement

   Website: https://goappsr.com (or company website)

   Company Description:
   "Appalachian Storm Restoration provides roofing repair and restoration
   services in Tennessee. We contact customers for appointment confirmations,
   job updates, and service follow-ups."

5. Submit for vetting
```

**Verification:**
- Brand status: "Pending" → "Approved"
- Vetting score determines throughput (higher = more SMS/second)
- Takes 24-48 hours

---

### Step 1.4: A2P Campaign Registration (15 min)

**Why:** Describes HOW you'll use SMS. Required by carriers.

```
1. Go to: Console → Messaging → Services → Campaigns
2. Click "Create Campaign"
3. Link to Brand from Step 1.3
4. Campaign details:

   Campaign Name: ASR Customer Communications

   Use Case: Mixed (covers multiple scenarios)
   - OR select most specific: "Customer Service" or "Delivery Notifications"

   Description (be specific - this affects approval):
   "Appalachian Storm Restoration uses SMS to communicate with customers
   about roofing services. Messages include:
   - Appointment confirmations and reminders
   - Job status updates (crew arrival, completion)
   - Estimate follow-ups
   - Weather-related service notifications
   - Invoice and payment reminders

   All recipients are existing customers or leads who have provided their
   phone number and opted in to receive communications."

   Sample Messages (provide 2-3 examples):

   Message 1:
   "Hi {{first_name}}, this is ASR. Your roofing inspection is confirmed
   for tomorrow at {{time}}. Reply STOP to opt out."

   Message 2:
   "Good news! Our crew just finished your roof repair at {{address}}.
   Please check your email for photos. Questions? Call us at 423-XXX-XXXX"

   Message 3:
   "Hi {{first_name}}, we sent your estimate last week. Ready to schedule?
   Reply YES or call 423-XXX-XXXX. Reply STOP to opt out."

   Opt-Out Keywords: STOP, UNSUBSCRIBE, CANCEL
   Opt-In Keywords: START, YES

   Help Keywords: HELP, INFO
   Help Response: "ASR Customer Support: 423-XXX-XXXX. Reply STOP to opt out."

5. Acknowledge compliance terms
6. Submit campaign
```

**Verification:**
- Campaign status: "Pending" → "Approved"
- Takes 24-48 hours
- Check for any rejection reasons and fix if needed

---

### Step 1.5: Buy Phone Number (5 min)

**Why:** Need a dedicated number for ASR. Recommend Tennessee area code for local presence.

```
1. Go to: Console → Phone Numbers → Buy a Number
2. Search criteria:
   - Country: United States
   - State/Region: Tennessee
   - Capabilities: SMS + Voice (both checked)
   - Type: Local (not toll-free for A2P)

3. Search for numbers
4. Pick a number with Tennessee area code:
   - 423 (Chattanooga/East TN)
   - 615 (Nashville)
   - 901 (Memphis)
   - 865 (Knoxville)

5. Click "Buy" on chosen number
6. Note the number: +1XXXXXXXXXX
```

**Verification:**
- Number appears in Console → Phone Numbers → Manage → Active Numbers
- Shows SMS and Voice capabilities

---

### Step 1.6: Create Messaging Service (10 min)

**Why:** Links your phone number to your A2P campaign. Required for compliant sending.

```
1. Go to: Console → Messaging → Services
2. Click "Create Messaging Service"
3. Configure:

   Friendly Name: ASR Customer Messaging

   Use Case: Notifications (or Mixed)

4. Click "Create"
5. Add Sender (phone number):
   - Click "Add Senders"
   - Sender Type: Phone Number
   - Select the number from Step 1.5
   - Click "Add"

6. Link Campaign:
   - Go to "Compliance" tab
   - Click "Link a Campaign"
   - Select campaign from Step 1.4
   - Click "Link"

7. Configure Settings (optional but recommended):
   - Inbound Settings:
     - Request URL: https://roofing-saas.vercel.app/api/sms/webhook
     - Method: POST
   - Enable "Sticky Sender" if you want replies to go to same number

8. Copy the Messaging Service SID (starts with MG)
```

**Verification:**
- Service shows "Active"
- Sender (phone number) is linked
- Campaign is linked
- Note: TWILIO_MESSAGING_SERVICE_SID = MGxxxxxxxxx

---

### Step 1.7: Configure Webhook URLs (5 min)

**For inbound SMS and call status updates.**

```
1. Go to: Console → Phone Numbers → Manage → Active Numbers
2. Click on your ASR phone number
3. Configure:

   MESSAGING Section:
   ─────────────────
   A MESSAGE COMES IN:
   - Webhook URL: https://roofing-saas.vercel.app/api/sms/webhook
   - HTTP Method: POST

   VOICE Section:
   ──────────────
   A CALL COMES IN:
   - Webhook URL: https://roofing-saas.vercel.app/api/voice/twiml
   - HTTP Method: POST

   CALL STATUS CALLBACK:
   - Status Callback URL: https://roofing-saas.vercel.app/api/voice/webhook
   - HTTP Method: POST

4. Click "Save Configuration"
```

**Verification:**
- Webhooks saved without error
- Test by sending SMS to the number (should appear in app activities)

---

### Step 1.8: Update Environment Variables

```bash
# In .env.local, update these values:

# Twilio - Get from Console → Account Info
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# New phone number from Step 1.5
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

# Messaging Service SID from Step 1.6
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### Step 1.9: Verify Setup

```bash
cd /Users/ccai/Roofing\ SaaS/roofing-saas
npx tsx scripts/verify-webhooks.ts
```

**Expected output:**
```
✅ ENV: TWILIO_ACCOUNT_SID: Set
✅ ENV: TWILIO_AUTH_TOKEN: Set
✅ ENV: TWILIO_PHONE_NUMBER: Set
✅ ENV: TWILIO_MESSAGING_SERVICE_SID: Set
✅ Twilio Account: Active
✅ Twilio Phone Number: Found
✅ Twilio SMS Webhook: Configured
✅ Twilio Voice Webhook: Configured
```

---

## Part 2: Resend Setup (Email)

### Current Status: ✅ Mostly Complete

| Item | Status |
|------|--------|
| API Key | ✅ Configured |
| Domain (mail.jobclarity.io) | ✅ Verified |
| Webhook Secret | ❌ Missing |

---

### Step 2.1: Add Webhook Secret (5 min)

**Why:** Enables email open/click tracking, bounce handling, spam complaint processing.

```
1. Go to: https://resend.com/webhooks
2. Click "Add Webhook"
3. Configure:

   Endpoint URL: https://roofing-saas.vercel.app/api/email/webhook

   Events (select all):
   ☑ email.sent
   ☑ email.delivered
   ☑ email.opened
   ☑ email.clicked
   ☑ email.bounced
   ☑ email.complained

4. Click "Create"
5. Copy the webhook secret (starts with whsec_)
6. Add to .env.local:
   RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx
```

---

### Step 2.2: Verify From Email

**Current:** `noreply@mail.jobclarity.io`

If you want ASR-branded emails:
```
1. Go to: https://resend.com/domains
2. Add domain: mail.goappsr.com (or similar)
3. Add DNS records as instructed
4. Wait for verification
5. Update .env.local:
   RESEND_FROM_EMAIL=noreply@mail.goappsr.com
   RESEND_FROM_NAME=Appalachian Storm Restoration
```

**Or keep current setup** - emails will come from jobclarity.io which is fine for now.

---

## Part 3: Testing Checklist

### Test 1: Send SMS
```bash
# Get auth token first
npm run ops:auth

# Send test SMS (replace with your phone)
curl -X POST https://roofing-saas.vercel.app/api/sms/send \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"to": "+1YOURPHONE", "body": "Test from ASR system"}'
```

**Verify:**
- [ ] SMS received on phone
- [ ] Activity logged in app
- [ ] Reply with "STOP" → contact marked as opted out
- [ ] Reply with "START" → contact opted back in

### Test 2: Receive Inbound SMS
```
1. Text "Hello" to the ASR Twilio number
2. Check app → Activities → Should show inbound SMS
3. If contact exists, should be linked
```

### Test 3: Make Outbound Call
```bash
curl -X POST https://roofing-saas.vercel.app/api/voice/call \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"to": "+1YOURPHONE", "message": "Hello, this is a test call from ASR"}'
```

**Verify:**
- [ ] Phone rings
- [ ] Message plays
- [ ] Activity logged in app

### Test 4: Send Email
```bash
curl -X POST https://roofing-saas.vercel.app/api/email/send \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"to": "your@email.com", "subject": "Test from ASR", "text": "Hello!"}'
```

**Verify:**
- [ ] Email received
- [ ] Not in spam folder
- [ ] Activity logged in app
- [ ] Open tracking works (if webhook configured)

---

## Part 4: Timeline Summary

| Step | Time | Dependency |
|------|------|------------|
| 1.1 Account & Payment | 5 min | None |
| 1.2 Business Profile | 15 min | 1.1 |
| 1.3 Brand Registration | 10 min | 1.2 approved (1-24 hrs) |
| 1.4 Campaign Registration | 15 min | 1.3 approved (24-48 hrs) |
| 1.5 Buy Phone Number | 5 min | 1.1 |
| 1.6 Create Messaging Service | 10 min | 1.4 + 1.5 |
| 1.7 Configure Webhooks | 5 min | 1.5 |
| 1.8 Update Environment | 5 min | All above |
| 1.9 Verify | 5 min | 1.8 |
| 2.1 Resend Webhook | 5 min | None |
| 3.x Testing | 15 min | All above |

**Total Active Time:** ~1.5 hours
**Total Wait Time:** 24-48 hours (A2P approval)

---

## Part 5: Cost Estimates

| Item | Cost | Frequency |
|------|------|-----------|
| Twilio Phone Number | $1.15/month | Monthly |
| A2P Campaign Fee | $0.75-$2/month | Monthly |
| SMS (outbound) | $0.0079/segment | Per message |
| SMS (inbound) | $0.0079/segment | Per message |
| Voice (outbound) | $0.014/minute | Per minute |
| Voice (inbound) | $0.0085/minute | Per minute |
| Resend Email | Free (100/day) | - |
| Resend Email | $20/month | 5,000/month |

**Typical monthly for small roofing company:**
- ~500 SMS/month: ~$4
- ~100 minutes voice: ~$1.50
- ~1000 emails: Free or $20
- **Total:** $25-50/month

---

## Troubleshooting

### SMS Not Sending
1. Check A2P campaign is approved
2. Verify phone number is linked to Messaging Service
3. Check recipient hasn't opted out
4. Verify not in quiet hours (before 8am or after 9pm local)
5. Run: `npx tsx scripts/verify-webhooks.ts`

### SMS Filtered by Carrier
1. A2P campaign may not be approved yet
2. Message content may trigger spam filters
3. Check vetting score (Console → Trust Center)
4. Avoid URL shorteners in SMS

### Calls Not Connecting
1. Verify Twilio account is active
2. Check webhook URLs are correct
3. Verify TwiML endpoint returns valid XML
4. Check call compliance (DNC, time restrictions)

### Emails Going to Spam
1. Verify domain DNS records (SPF, DKIM, DMARC)
2. Check "From" address matches verified domain
3. Avoid spam trigger words in subject/body
4. Build sender reputation gradually

---

## Support Contacts

- **Twilio Support:** https://support.twilio.com/
- **Resend Support:** https://resend.com/docs
- **A2P 10DLC FAQ:** https://support.twilio.com/hc/en-us/articles/1260803965530

---

*Last Updated: January 2026*
*Created by: Claude Code + Clarity AI*
