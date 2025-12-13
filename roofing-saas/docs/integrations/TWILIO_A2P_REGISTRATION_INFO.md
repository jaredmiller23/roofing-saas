# Twilio A2P 10DLC Registration - Business Information

**Purpose**: Information required for Twilio A2P 10DLC brand and campaign registration
**Last Updated**: December 13, 2025
**Status**: Ready for submission

---

## 1. Business Information (Brand Registration)

| Field | Value |
|-------|-------|
| **Business Legal Name** | [Confirm with owner] |
| **EIN/TIN** | 33-2730378 |
| **Business Address** | 121 Gilliam Cir, Fall Branch, TN 37656 |
| **Website** | goappsr.com |
| **Business Type** | Sole Proprietorship / LLC [Confirm] |
| **Industry Vertical** | Construction / Home Services / Roofing |

---

## 2. Brand Registration Details

### Required Information
- **Brand Name**: [Company name as registered]
- **Brand Display Name**: [How it appears to customers]
- **Vertical**: Construction/Home Services
- **Stock Symbol**: N/A (Private company)
- **Business Registration ID Type**: EIN
- **Business Registration ID**: 33-2730378

### Brand Trust Score
- **Registration Type**: Low-Volume Sole Proprietor ($2/month)
  - For < 6,000 messages per day
  - Appropriate for small roofing company
- **Optional Vetting**: $40 one-time (higher trust score)

---

## 3. Campaign Registration

### Campaign Details
| Field | Suggested Value |
|-------|-----------------|
| **Use Case** | Mixed (Transactional + Marketing) |
| **Description** | Customer communications for roofing services including appointment reminders, project updates, estimates, and promotional offers |
| **Expected Volume** | Low (< 3,000 msgs/month) |

### Sample Messages (Required for registration)

**1. Appointment Reminder (Transactional)**
```
[Company Name]: Reminder - Your roof inspection is scheduled for tomorrow at 2pm. Reply STOP to opt out.
```

**2. Project Update (Transactional)**
```
[Company Name]: Your roof repair is complete! Final invoice has been sent to your email. Questions? Call us at [phone]. Reply STOP to unsubscribe.
```

**3. Estimate Follow-up (Marketing)**
```
[Company Name]: Hi! Just following up on your roof estimate. Ready to schedule? Reply YES or call [phone]. Reply STOP to opt out.
```

**4. Storm Alert (Transactional)**
```
[Company Name]: Severe weather alert! We'll be checking roofs in your area after the storm. Need an inspection? Reply YES. Reply STOP to cancel.
```

**5. Promotional (Marketing)**
```
[Company Name]: Spring roofing special! Free inspection + 10% off repairs this month. Call [phone] to schedule. Reply STOP to unsubscribe.
```

---

## 4. Opt-In/Opt-Out Workflow

### Opt-In Methods
1. **Web Form**: Customer checks consent box on website contact form
2. **Verbal**: Customer gives verbal consent during phone call (logged in CRM)
3. **Text Keyword**: Customer texts "JOIN" to company number

### Opt-In Confirmation Message
```
Welcome to [Company Name] text updates! Msg & data rates may apply. Msg frequency varies. Reply HELP for help, STOP to cancel.
```

### Opt-Out Keywords (Automatic)
- STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT

### Opt-Out Confirmation
```
You have been unsubscribed from [Company Name] messages. You will not receive any more texts. Reply START to resubscribe.
```

### HELP Response
```
[Company Name] SMS Help: For support call [phone] or email [email]. Reply STOP to unsubscribe. Msg & data rates may apply.
```

---

## 5. Compliance Information

### TCPA Compliance (Already Implemented)
- Quiet hours enforced (8am-9pm local time)
- Opt-out/opt-in tracking in database
- Consent status tracked per contact
- Automatic opt-out keyword handling

### Message Content Rules
- Business name in every message
- Opt-out instructions included
- No prohibited content (SHAFT: Sex, Hate, Alcohol, Firearms, Tobacco)

---

## 6. Registration Steps

### Step 1: Create Customer Profile (Trust Hub)
1. Go to Twilio Console → Regulatory Compliance → Trust Hub
2. Create new Customer Profile
3. Enter business information above
4. Upload business documentation if required

### Step 2: Register Brand
1. Go to Messaging → A2P Registration
2. Create new Brand
3. Select "Low-Volume" for sole proprietor
4. Enter brand details

### Step 3: Register Campaign
1. Create new Campaign under registered Brand
2. Select use case: "Mixed"
3. Enter sample messages above
4. Describe opt-in/opt-out workflow

### Step 4: Associate Phone Number
1. Go to Phone Numbers → Active Numbers
2. Select your Twilio number
3. Associate with registered Campaign

---

## 7. Cost Summary

| Item | Monthly Cost |
|------|-------------|
| Low-Volume Brand Registration | $2 |
| Campaign Registration | $10 |
| Phone Number | $1.15 |
| **Total Base Cost** | **$13.15/month** |

Plus per-message costs (~$0.0079/segment)

---

## 8. Timeline

- Brand registration: 1-2 business days approval
- Campaign registration: 1-5 business days approval
- Full activation: ~1 week total

---

## Notes

- Registration is required for all business SMS in the US
- Improves deliverability and prevents carrier filtering
- Higher daily message limits after registration
- Required for production SMS sending

---

**Document prepared for**: Tennessee Roofing SaaS Project
**Twilio Account**: [To be configured]
