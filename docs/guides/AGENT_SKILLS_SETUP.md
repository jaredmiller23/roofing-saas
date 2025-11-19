# Agent Skills Setup Guide

**Last Updated**: November 17, 2025
**Feature Status**: Beta (skills-2025-10-02)
**Claude Code Version**: 2.0+

## 🎯 What are Agent Skills?

Agent Skills are organized packages of domain-specific knowledge that Claude automatically loads when relevant. Think of them as "expert consultants" that Claude can call upon for specialized knowledge.

### Key Concepts
- **Domain Expertise**: Specialized knowledge in specific areas
- **Automatic Loading**: Claude loads skills when needed
- **Reusable Context**: Write once, use across all sessions
- **Structured Knowledge**: Organized folders with docs/scripts/examples

## 🏗️ Skill Structure

Each skill is a folder containing:

```
.claude/skills/skill-name/
├── README.md              # Skill overview & when to use
├── terminology.md         # Domain-specific terms
├── workflows.md           # Common processes
├── examples/              # Code examples
│   ├── example-1.ts
│   └── example-2.sql
└── resources/             # Reference materials
    ├── api-docs.md
    └── compliance-rules.md
```

## 📦 Skills for This Project

We've created 3 core skills for the Roofing SaaS project:

### 1. **roofing-business** Skill
**Purpose**: Roofing industry knowledge
**Contains**:
- Industry terminology (pitch, flashing, underlayment, etc.)
- Common workflows (inspection → estimate → contract → install)
- Customer journey stages
- Compliance basics (permits, inspections)

**Auto-loads when**: Discussing business logic, customer workflows, industry features

### 2. **quickbooks** Skill
**Purpose**: QuickBooks integration expertise
**Contains**:
- OAuth flow patterns
- API best practices
- Common accounting rules
- Error handling strategies
- Rate limiting approaches

**Auto-loads when**: Working on financial features, QB integration, invoicing

### 3. **compliance** Skill
**Purpose**: Legal & regulatory knowledge
**Contains**:
- TCPA rules for SMS/calls
- Call recording consent laws
- Data retention requirements
- Multi-state compliance considerations

**Auto-loads when**: Building SMS, email, call features, or discussing data privacy

## 🚀 Setting Up Skills

### Step 1: Create Skills Directory

Skills live in `.claude/skills/` within your project:

```bash
# Already created for you!
roofing-saas/.claude/skills/
├── roofing-business/
├── quickbooks/
└── compliance/
```

### Step 2: Understand Skill Loading

**Automatic Loading**: Claude loads skills based on context
- You're working on a QuickBooks feature → `quickbooks` skill loads
- You're discussing SMS campaigns → `compliance` skill loads
- You're building customer pipeline → `roofing-business` skill loads

**Manual Loading** (if needed):
> "Load the roofing-business skill and help me design the customer pipeline."

### Step 3: Referencing Skills

Skills are automatically available. Just work normally:

**Example 1**: Building SMS Campaign
```typescript
// Claude automatically loads 'compliance' skill
// and ensures TCPA compliance in the implementation

async function sendBulkSMS(campaign: Campaign) {
  // Skill informs: Must include opt-out, send during business hours
  // Skill provides: Template code for TCPA-compliant messaging
}
```

**Example 2**: QuickBooks Integration
```typescript
// Claude loads 'quickbooks' skill
// and follows best practices from the skill

async function syncInvoice(projectId: string) {
  // Skill informs: Use batch API for multiple invoices
  // Skill warns: Rate limit is 500 req/min
  // Skill provides: Retry logic patterns
}
```

## 📋 Skill Contents (What We Created)

### Roofing Business Skill

**File**: `.claude/skills/roofing-business/README.md`
```markdown
# Roofing Business Skill

## Industry Terminology
- **Pitch**: Roof slope (e.g., 6/12 = 6" rise per 12" run)
- **Square**: 100 sq ft of roofing material
- **Flashing**: Waterproofing at joints/edges
- **Underlayment**: Protective layer under shingles

## Customer Journey
1. Lead Generation (storm targeting, door-knocking)
2. Inspection (photo documentation, measurements)
3. Estimate (material + labor + markup)
4. Contract (e-signature required)
5. Permitting (varies by municipality)
6. Installation (crew scheduling)
7. Final Inspection (customer + city inspector)
8. Invoicing (QuickBooks integration)
9. Payment Collection
10. Warranty Registration

## Common Workflows
- Estimate calculation: (sqft / 100) * price_per_square + labor
- Project timeline: 2-4 weeks from contract to completion
- Material ordering: Lead time 5-7 days
```

**When Claude uses this**:
- Designing pipeline stages
- Calculating estimates
- Building customer forms
- Planning workflows

### QuickBooks Skill

**File**: `.claude/skills/quickbooks/README.md`
```markdown
# QuickBooks Integration Skill

## OAuth Best Practices
- Use PKCE flow for security
- Refresh tokens expire after 101 days (reauth needed)
- Store tokens encrypted (Supabase vault)
- Handle token refresh transparently

## API Patterns
- Batch operations: Max 30 entities per batch
- Rate limiting: 500 requests/minute
- Webhooks: For real-time updates (but finicky)
- Polling: More reliable than webhooks

## Common Entities
- Customer → Contact (our app)
- Estimate → Project (our app)
- Invoice → Project invoice
- Payment → Payment record

## Error Handling
- 401: Refresh token (transparent)
- 429: Rate limit (exponential backoff)
- 400: Validation error (show user)
- 500: QB outage (retry later)
```

**When Claude uses this**:
- Implementing QB OAuth
- Syncing invoices
- Handling API errors
- Planning integration architecture

### Compliance Skill

**File**: `.claude/skills/compliance/README.md`
```markdown
# Compliance Skill

## TCPA (Telephone Consumer Protection Act)
- **Applies to**: SMS, autodialed calls, prerecorded messages
- **Requires**: Prior express written consent
- **Opt-out**: Must honor within 30 days
- **Time restrictions**: 8am-9pm recipient's time zone
- **Violat ions**: $500-$1,500 per text/call

## Call Recording Laws
- **One-party states**: TN, VA, NC, SC, GA, AL
  - Only one party needs to consent (can record without notice)
- **Two-party states**: CA, FL, PA, etc.
  - ALL parties must consent (need beep/announcement)
- **Best practice**: Always announce recording
  - "This call may be recorded for quality assurance"

## Data Retention
- **Minimum**: 3 years (IRS requires for financial records)
- **Customer data**: Indefinite unless they request deletion (GDPR/CCPA)
- **Call recordings**: 1 year recommended
- **SMS logs**: 3 years (TCPA compliance trail)

## State Variations
- Tennessee: One-party consent state
- If calling customers in CA/FL: Must use two-party consent
```

**When Claude uses this**:
- Building SMS campaigns
- Implementing call recording
- Designing consent flows
- Planning data retention

## 🎓 Best Practices

### Practice 1: Keep Skills Updated
As you learn more about the domain, update the skills:

```bash
# Add new industry term you learned
echo "- **TPO**: Thermoplastic Polyolefin (flat roof membrane)" >> \
  .claude/skills/roofing-business/terminology.md
```

### Practice 2: Add Real Examples
Include actual code patterns from your project:

```typescript
// .claude/skills/quickbooks/examples/oauth-flow.ts

// REAL EXAMPLE from our app
export async function refreshQuickBooksToken(
  refreshToken: string
): Promise<QBTokens> {
  const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  return response.json();
}
```

### Practice 3: Document "Why" Not Just "What"
Skills should explain reasoning:

**Good**:
> "Use batch API for syncing multiple invoices. Why? QB rate limit is 500/min, and we typically sync 10-20 invoices at once. Batch API counts as 1 request."

**Bad**:
> "Use batch API for invoices."

### Practice 4: Include Compliance Checklists
For the compliance skill, add actionable checklists:

```markdown
## SMS Campaign Checklist (TCPA Compliance)

Before launching SMS campaign:
- [ ] All recipients have explicit opt-in record
- [ ] Message includes business name
- [ ] Message includes opt-out instructions ("Reply STOP to opt-out")
- [ ] Scheduled between 8am-9pm in recipient's time zone
- [ ] Opt-out mechanism tested
- [ ] Opt-out honored within 30 days
- [ ] Records retained for 3 years
```

## 🔧 Advanced Usage

### Creating New Skills

**When to create a new skill**:
- Domain knowledge used across multiple features
- Compliance/legal requirements
- Integration with external service
- Industry-specific business logic

**Example**: Creating a "twilio" skill

```bash
mkdir -p .claude/skills/twilio
```

```markdown
# .claude/skills/twilio/README.md

# Twilio Integration Skill

## Webhook Security
- Validate signature on ALL webhooks
- Use Twilio library for validation
- Store webhook URL in env var

## Error Handling
- 429: Rate limited (use message queue)
- 400: Invalid phone number (validate before sending)
- 30003: Unreachable (mark contact invalid)

## Best Practices
- Use message queues for bulk SMS
- Store message SIDs for status tracking
- Handle delivery receipts async
```

### Skill Composition

**Combine multiple skills** for complex features:

**Example**: SMS Campaign Feature
- Loads: `compliance` + `twilio` + `roofing-business`
- Result: TCPA-compliant SMS using Twilio best practices with roofing-specific messaging

**Example**: QuickBooks Invoice Sync
- Loads: `quickbooks` + `roofing-business`
- Result: Proper QB entity mapping with roofing-specific calculations

## 🚫 Skill Anti-Patterns

### ❌ Don't: Put code in skills
**Bad**: Entire components in skill files
**Good**: Patterns, examples, guidelines

### ❌ Don't: Duplicate documentation
**Bad**: Copying QB API docs word-for-word
**Good**: Summarize, add context, include lessons learned

### ❌ Don't: Make skills too narrow
**Bad**: Separate skill for each API endpoint
**Good**: One skill per integration (e.g., "quickbooks" not "quickbooks-invoices")

### ❌ Don't: Forget to maintain
**Bad**: Skill from 6 months ago with outdated info
**Good**: Update skills as you learn new patterns

## 📊 Skill Effectiveness Metrics

**Skills are working when**:
- Claude suggests compliance checks automatically
- QB integration follows best practices without prompting
- Roofing terminology used correctly in features
- Less time explaining domain context each session
- Fewer bugs related to domain knowledge gaps

## 🔗 Related Guides

- **EXTENDED_THINKING_GUIDE.md** - Skills enhance extended thinking analysis
- **MEMORY_API_USAGE.md** - Skills + Memory = Maximum context retention
- **CHECKPOINT_WORKFLOWS.md** - Test skill-informed implementations safely

## 💡 Pro Tips

### Tip 1: Skill + Extended Thinking Power Combo
```
"Using the compliance skill and extended thinking, design a TCPA-compliant
SMS campaign that works across all 50 states."
```

Result: Claude loads compliance skill + uses extended thinking to analyze state-by-state requirements.

### Tip 2: Reference Skills Explicitly When Needed
If Claude doesn't auto-load the skill you want:
```
"Using the roofing-business skill, what are the standard pipeline stages?"
```

### Tip 3: Update Skills After Client Feedback
Client says: "We always include permit fees in the estimate"

Update skill:
```markdown
## Estimate Calculation
- Base: (sqft / 100) * price_per_square
- Labor: crew_hours * hourly_rate
- **Permit fees**: Always include (varies by municipality)
- Markup: 20-30% typical
```

### Tip 4: Create "Lessons Learned" Section
```markdown
# QuickBooks Skill - Lessons Learned

## Things That Didn't Work
- Webhooks: Too unreliable in our tests (Nov 15, 2025)
- Polling interval <5 min: Hit rate limits

## What Works Well
- Polling every 15 minutes: No rate limit issues
- Batch API: 10x faster than individual requests
- Idempotency keys: Prevent duplicate invoices
```

## 🎯 Quick Reference

| When You're Building | Skills That Help | What They Provide |
|----------------------|-----------------|-------------------|
| SMS campaign | compliance | TCPA rules, opt-out requirements |
| QB invoice sync | quickbooks | API patterns, rate limiting |
| Customer pipeline | roofing-business | Journey stages, terminology |
| Call recording | compliance | Consent laws by state |
| Estimate calculator | roofing-business | Calculation formulas |
| Twilio webhooks | twilio (if created) | Security, error handling |
| Data retention policy | compliance | Legal requirements, timelines |

## 📈 Success Story Example

**Before Skills**:
> You: "Build an SMS campaign feature"
> Claude: "Here's a basic SMS sender"
> [Missing TCPA compliance, no opt-out, wrong time zones]

**After Skills (Compliance)**:
> You: "Build an SMS campaign feature"
> Claude: *Loads compliance skill automatically*
> "Here's a TCPA-compliant SMS campaign with:
> - Opt-in tracking
> - Time zone-aware scheduling (8am-9pm)
> - One-touch opt-out
> - 3-year record retention
> - Multi-state compliance"

---

**Remember**: Skills are living documentation. Start with the 3 we've created, then add more as you discover domain patterns. The goal is to never explain the same domain concept twice!

**For this project**: The roofing-business, quickbooks, and compliance skills will save you hours of context repetition across Phase 4 and Phase 5 development.
