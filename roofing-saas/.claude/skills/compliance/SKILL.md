---
name: compliance
description: Legal and regulatory compliance guidance for TCPA, call recording, and data retention. Use when building SMS campaigns, implementing call recording, designing consent workflows, or planning data retention policies.
---

# Compliance Skill

**Domain**: Legal & Regulatory Compliance
**Focus Areas**: TCPA, Call Recording, Data Retention
**Jurisdiction**: United States (primary: Tennessee)
**Last Updated**: December 13, 2025

## DISCLAIMER
This skill provides general guidance. Consult legal counsel for specific compliance questions. Laws change frequently - verify current requirements.

## When This Skill Loads

This skill automatically loads when you're:
- Building SMS campaign features
- Implementing call recording
- Designing consent workflows
- Planning data retention policies
- Discussing privacy/compliance requirements

## Core Compliance Areas

### 1. TCPA (Telephone Consumer Protection Act)
### 2. Call Recording Laws (One-Party vs Two-Party States)
### 3. Data Retention Requirements
### 4. State-Specific Variations
### 5. Best Practices for Roofing Sales

## TCPA Compliance (SMS & Autodialed Calls)

### What is TCPA?
**Law**: Federal law regulating automated calls/texts
**Enforced by**: FCC + private lawsuits
**Violations**: $500-$1,500 per text/call
**Applies to**: SMS, autodialed calls, prerecorded messages

### Key Requirements

**1. Prior Express Written Consent**
- Must have customer's explicit permission BEFORE sending marketing texts
- Consent must be "clear and conspicuous"
- Can't be buried in terms & conditions
- Must specify: phone number, company name, message types

**Good Consent Example**:
```
[ ] I agree to receive text messages from [Company Name] at [phone number]
    regarding roofing services, promotions, and appointment reminders.
    Message frequency varies. Reply STOP to opt-out.
    Message and data rates may apply.
```

**Bad Consent**:
- Pre-checked boxes
- Vague language ("may contact you")
- Consent for "all communications" without specifics

**2. Time Restrictions**
- **Only 8am - 9pm** in recipient's local time zone
- No texts/calls outside this window
- Must account for time zones (TN -> CA = 2 hour difference)

**3. Opt-Out Mechanism**
- Must honor opt-out within **30 days**
- Standard: "Reply STOP to unsubscribe"
- Must be easy (one-step, no phone calls required)
- Never contact again after opt-out

**4. Business Identification**
- Every text must identify your company
- Example: "ABC Roofing: Your estimate is ready..."

**5. Record Keeping**
- Maintain consent records for **4+ years**
- Prove consent if sued
- Log: Date, method of consent, phone number, IP address

### Implementation Checklist

Before launching SMS campaigns:
- [ ] Explicit opt-in collected (checkbox, not pre-checked)
- [ ] Consent language clear (company name, phone number, message types)
- [ ] Time zone detection working (8am-9pm local time)
- [ ] "Reply STOP" opt-out mechanism functional
- [ ] Opt-out honored immediately (or within 30 days max)
- [ ] Company name in every message
- [ ] Consent records stored (4+ years)
- [ ] Audit logging enabled (who sent what, when)
- [ ] Rate limiting in place (no spam floods)
- [ ] Testing complete (send test messages to verify compliance)

### Common TCPA Violations to Avoid

- **Sending to "wrong number" repeatedly**: If customer says "wrong number", stop immediately
- **Ignoring STOP requests**: Must honor within 30 days (best practice: immediately)
- **Sending outside 8am-9pm**: Account for time zones!
- **No opt-out method**: Every message must allow opt-out
- **Pre-checked consent boxes**: User must actively check box

## Call Recording Laws

### One-Party vs Two-Party Consent States

**One-Party Consent States** (31 states including Tennessee):
- Only ONE party needs to consent to recording
- You can record without telling the other person
- **Tennessee, Virginia, North Carolina, South Carolina, Georgia, Alabama** are all one-party

**Two-Party (All-Party) Consent States** (11 states + DC):
- ALL parties must consent to recording
- Must announce "This call is being recorded" before recording
- **California, Florida, Pennsylvania, Washington** are two-party

### Best Practice: ALWAYS Announce Recording

Even in Tennessee (one-party state), announce recording:
```
"This call may be recorded for quality assurance and training purposes."
```

**Why?**:
1. Builds trust with customer
2. Protects you if calling customer in two-party state
3. Industry standard (customers expect it)
4. Avoids legal gray areas

### Call Recording Implementation Checklist

- [ ] Announcement feature ("This call is being recorded...")
- [ ] Play announcement BEFORE recording starts
- [ ] Provide way for customer to decline recording (hang up or say no)
- [ ] Log which calls are recorded (audit trail)
- [ ] Store recordings securely (encrypted)
- [ ] Set retention policy (1-3 years recommended)
- [ ] Auto-delete after retention period
- [ ] Access controls (who can listen to recordings?)
- [ ] Customer access (allow customers to request their recordings)

### State-by-State Quick Reference

| State | Consent Type | Action |
|-------|--------------|--------|
| Tennessee | One-party | Announce anyway (best practice) |
| California | Two-party | MUST announce before recording |
| Florida | Two-party | MUST announce before recording |
| Texas | One-party | Announce anyway |
| Virginia | One-party | Announce anyway |
| Pennsylvania | Two-party | MUST announce before recording |

**Rule of Thumb**: If calling someone in a two-party state, announce recording. Our app should announce for ALL calls to be safe.

## Data Retention Requirements

### Financial Records (IRS)
- **Minimum**: 3 years
- **Recommended**: 7 years (audit protection)
- **Applies to**: Invoices, estimates, payments, contracts

### Customer Data (GDPR/CCPA)
- **Minimum**: None (can delete if requested)
- **Practical**: Indefinite (for business operations)
- **Right to Deletion**: Must honor customer deletion requests within 30-45 days

### Call Recordings
- **Legal Minimum**: None
- **Recommended**: 1 year (dispute resolution, training)
- **Maximum**: 3 years (avoid excessive retention)

### SMS Logs
- **TCPA Compliance**: 4+ years (prove consent)
- **Includes**: Message content, timestamp, recipient, consent record, opt-out status

### Activity Logs (Audit Trail)
- **Compliance**: 3-7 years
- **Security Events**: 1-3 years
- **User Actions**: 1-3 years

### Implementation

**Automatic Retention Policy**:
```
- Call recordings: Delete after 1 year
- SMS logs: Keep 4 years (TCPA)
- Customer data: Keep indefinitely UNLESS customer requests deletion
- Financial records: Keep 7 years (IRS)
- Audit logs: Keep 3 years
```

**GDPR/CCPA Deletion Requests**:
```
1. Verify identity
2. Delete customer data (contact, projects, notes)
3. Anonymize or delete call recordings
4. Keep financial records (legal requirement)
5. Log deletion request (compliance proof)
6. Respond within 30-45 days
```

## State-Specific Considerations

### Tennessee (Our Primary Market)
- **Call Recording**: One-party consent (can record without notice)
- **Best Practice**: Announce anyway
- **Permits**: Vary by county (Davidson, Williamson, Rutherford different)
- **Business License**: Required for contractors
- **Insurance**: General liability + workers' comp required

### Multi-State Operations
If calling customers in other states:
- **California**: Two-party consent, CCPA privacy rights
- **Florida**: Two-party consent for recording
- **Texas**: One-party consent, but TCPA still applies
- **Always**: Announce call recording to be safe

## Roofing Industry Specific Compliance

### Insurance Claim Assignments
- **What**: Customer assigns insurance payment to contractor
- **Compliance**: Ensure customer understands what they're signing
- **Disclosure**: Written disclosure of assignment terms
- **State Rules**: Vary by state (some prohibit certain practices)

### Home Improvement Contracts
- **Right to Cancel**: Many states have 3-day "cooling off" period
- **Written Contract Required**: For work over $X (varies by state)
- **License Disclosure**: Must disclose contractor license number
- **Lien Waivers**: Protect homeowner from subcontractor liens

### Storm Chasing Regulations
- **Some states**: Restrict door-to-door solicitation after disasters
- **Best Practice**: Check local rules after major storms
- **Tennessee**: Generally allows storm targeting

## Compliance Features for Our App

### SMS Campaigns
```typescript
// TCPA-Compliant SMS Sender
async function sendCompliantSMS(contact: Contact, message: string) {
  // 1. Check consent
  if (!contact.sms_consent_granted) {
    throw new Error('No SMS consent');
  }

  // 2. Check opt-out status
  if (contact.sms_opted_out) {
    throw new Error('Customer opted out');
  }

  // 3. Check time (8am-9pm recipient's time zone)
  if (!isWithinAllowedHours(contact.timezone)) {
    throw new Error('Outside allowed hours (8am-9pm)');
  }

  // 4. Add business identifier
  const fullMessage = `${COMPANY_NAME}: ${message} Reply STOP to opt-out.`;

  // 5. Send message
  await twilioClient.messages.create({
    to: contact.phone,
    from: TWILIO_PHONE,
    body: fullMessage
  });

  // 6. Log for compliance
  await logSMS(contact.id, fullMessage, 'sent');
}
```

### Call Recording Consent
```typescript
// Announce recording before starting
async function startRecordedCall(callSid: string) {
  // 1. Play announcement
  await twilioClient.calls(callSid).update({
    twiml: '<Response><Say>This call may be recorded for quality assurance.</Say><Pause length="1"/></Response>'
  });

  // 2. Wait for announcement to finish
  await wait(5000);

  // 3. Start recording
  await twilioClient.calls(callSid).recordings.create({
    recordingChannels: 'dual',
    recordingStatusCallback: '/api/recording-status'
  });

  // 4. Log that recording started
  await logCallRecording(callSid, 'started', 'announcement_played');
}
```

### Data Retention Automation
```typescript
// Background job (runs daily)
async function enforceRetentionPolicy() {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  // Delete call recordings older than 1 year
  await deleteOldRecordings(oneYearAgo);

  // Log retention enforcement
  await logRetentionAction('recordings', 'deleted', oneYearAgo);
}
```

## Compliance Audit Checklist

Run this quarterly:
- [ ] SMS consent records complete and accessible
- [ ] Opt-out mechanism working (test "STOP" reply)
- [ ] Time zone detection accurate (test with different zones)
- [ ] Call recording announcement playing before recording
- [ ] Recordings stored securely (encrypted)
- [ ] Retention policy enforced (old data deleted)
- [ ] Customer deletion requests honored (GDPR/CCPA)
- [ ] Audit logs complete (who did what, when)
- [ ] No TCPA violations reported
- [ ] Legal review (annual at minimum)

## Red Flags (Legal Risk)

**Immediate Attention Required**:
- Customer says "wrong number" but still receiving texts
- Opt-out not working (STOP replies ignored)
- Sending texts outside 8am-9pm
- Recording calls without announcement in two-party states
- Missing consent records (can't prove TCPA consent)
- Customer deletion request ignored >45 days
- Data breach (call recordings leaked)

---

**Remember**: Compliance is non-negotiable. TCPA violations are $500-$1,500 PER MESSAGE. When in doubt, be more conservative. Announce call recordings always. Honor opt-outs immediately. Maintain audit logs for everything.

**For this project**: Every SMS feature, call recording feature, and data storage decision should reference this skill for compliance guidance.
