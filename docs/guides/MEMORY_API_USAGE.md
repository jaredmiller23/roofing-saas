# Memory API Usage Guide

**Last Updated**: November 17, 2025
**Feature Status**: Available (Max, Enterprise, Team plans; rolling out to Pro)
**Capacity**: 500,000 tokens (~1,000 pages)

## 🧠 What is the Memory API?

The Memory API allows Claude to remember information across conversations. Instead of re-explaining your project every session, Claude retains key context permanently.

### Key Features
- **500K Token Capacity**: ~1,000 pages of context
- **Persistent Storage**: Survives session restarts
- **Automatic Retrieval**: Claude loads relevant memories
- **Cross-Session**: Share context across days/weeks
- **Selective**: You control what gets remembered

## 🎯 What to Store in Memory

### ✅ **Perfect for Memory**

**1. Architectural Decisions**
```markdown
MEMORY: AI Voice Assistant Architecture Decision (Nov 17, 2025)
- Selected: WebRTC + Opus codec + Cloud Whisper
- Latency: 1.8 seconds (meets <2s requirement)
- Rejected: Local Whisper (3.1s latency)
- Reason: Safari compatibility + reliability
- Never revisit: This is the final architecture
```

**2. Coding Preferences & Patterns**
```markdown
MEMORY: Next.js Patterns for This Project
- Always use Server Components unless client interaction needed
- Supabase client: Use server-side with cookies (not direct DB)
- Error handling: Use Sonner toast for user-facing errors
- Form validation: Zod schemas in /lib/validation/
- File organization: Features in /components/[feature]/ not /components/ui/
```

**3. Business Rules & Constraints**
```markdown
MEMORY: Roofing Business Rules
- Estimate calculation: (sqft / 100) * $350/square + labor
- Labor rate: $75/hour per crew member
- Typical crew: 3-4 people
- Timeline: 2-4 weeks from contract to completion
- Payment: 30% deposit, 70% on completion
- Warranty: 10 years workmanship, 25 years materials
```

**4. Integration Credentials & Context**
```markdown
MEMORY: Supabase Project Details
- Project ID: wfifizczqvogbcqamnmw
- URL: https://wfifizczqvogbcqamnmw.supabase.co
- Database: 1,375 contacts, 1,436 projects migrated
- Region: us-east-1
- RLS: Enabled on all tables
- Auth: Email + magic link (no social OAuth)
```

**5. Client Preferences**
```markdown
MEMORY: Client UI/UX Preferences
- Loves: Clean, minimal design (like Proline)
- Hates: Too many clicks, complex forms
- Priority: Mobile-first (80% usage in field)
- Browser: Safari on iOS (primary)
- Colors: Blue (#1E40AF) and gray tones
- Typography: System fonts only
```

**6. "Never Do This Again" Lessons**
```markdown
MEMORY: Lessons Learned - Things to Avoid
- DON'T use Chrome-only APIs (client uses Safari)
- DON'T assume phone numbers are formatted (normalize always)
- DON'T skip RLS policies (security critical)
- DON'T forget time zones in SMS scheduling (TCPA violation)
- DON'T use QB webhooks (polling is more reliable)
```

### ❌ **Not Good for Memory**

**Don't store**:
- **Secrets/passwords**: Use environment variables
- **Temporary decisions**: Use regular conversation
- **Code snippets**: Use agent skills instead
- **Session-specific tasks**: Use Archon for task tracking
- **Frequently changing data**: Use database, not memory

## 🚀 How to Use Memory

### Method 1: Explicit Memory Storage
Tell Claude what to remember:

```
"Remember this for all future sessions: Our estimate calculation is
(sqft / 100) * $350 per square plus labor at $75/hour."
```

```
"Add to memory: We're using WebRTC + Opus codec for the voice assistant.
This decision is final and should never be revisited."
```

### Method 2: Highlight Important Decisions
During extended thinking or planning:

```
"Using extended thinking, design the QB integration architecture.
Once we decide, add the final approach to memory so we don't
reconsider it later."
```

### Method 3: Build a Memory Repository
Create a memory initialization doc:

```markdown
# Roofing SaaS - Memory Initialization

When starting a new session, load these key facts:

## Architecture
- Next.js 15, Supabase, Tailwind CSS
- Safari/WebKit primary browser
- Mobile-first design (80% field usage)

## Business Rules
- Estimate: (sqft/100) * $350 + labor
- Timeline: 2-4 weeks per project
- Payment: 30% deposit, 70% completion

## Technical Decisions
- AI Voice: WebRTC + Opus + Cloud Whisper (1.8s latency)
- QB Integration: Polling every 15min (webhooks unreliable)
- SMS: TCPA-compliant (8am-9pm, opt-out, consent tracking)

## Client Preferences
- Minimal UI (like Proline)
- Mobile-first
- Blue (#1E40AF) primary color
```

## 📋 Memory Patterns for This Project

### Pattern 1: Architecture Context

**Store once, use forever**:
```markdown
MEMORY: Roofing SaaS Technical Stack
- Framework: Next.js 15 (App Router, Server Components)
- Database: Supabase PostgreSQL
- Auth: Supabase Auth (email + magic link)
- Storage: Supabase Storage
- Deployment: Vercel
- Testing: Playwright E2E
- CI/CD: GitHub Actions → Vercel
- Browser: Safari on iOS (primary), Chromium (testing)
- OS: macOS Apple Silicon (dev), iOS (production)
```

**Benefit**: Every session, Claude knows the stack without asking.

### Pattern 2: Domain Knowledge

**Store roofing-specific context**:
```markdown
MEMORY: Roofing Industry Context
- Client: Tennessee roofing contractor
- Current tools: Proline (CRM), Enzy (door-knocking)
- Team size: 10-15 sales reps, 3-4 install crews
- Service area: Middle Tennessee
- Project types: Residential (90%), Commercial (10%)
- Average project value: $8,000-$15,000
- Average deal cycle: 2 weeks (lead to contract)
```

**Benefit**: Business logic suggestions align with reality.

### Pattern 3: Integration Blueprints

**Store external API patterns**:
```markdown
MEMORY: QuickBooks Integration Patterns
- OAuth: PKCE flow with token refresh every 101 days
- Rate limit: 500 requests/minute
- Batch API: Max 30 entities (use for invoice sync)
- Error handling: 401 (refresh), 429 (backoff), 400 (validate)
- Polling: Every 15 minutes (webhooks unreliable)
- Entities: Customer=Contact, Estimate=Project, Invoice=Invoice
```

**Benefit**: Every QB feature follows proven patterns.

### Pattern 4: Compliance Requirements

**Store legal constraints**:
```markdown
MEMORY: Compliance Requirements
- TCPA: SMS consent required, 8am-9pm local time, STOP to opt-out
- Call recording: Tennessee is one-party state (but announce anyway)
- Data retention: 3 years (IRS), indefinite for customer data
- RLS: Required on ALL tables (no exceptions)
- Audit logging: Track all data changes (regulatory requirement)
```

**Benefit**: Claude catches compliance issues automatically.

### Pattern 5: Performance Budgets

**Store performance constraints**:
```markdown
MEMORY: Performance Requirements
- Bundle size: <200KB initial (currently 156KB)
- Time to Interactive: <2 seconds on 4G
- Lighthouse score: >90 on mobile
- AI Voice latency: <2 seconds end-to-end
- Database queries: <100ms p95 (indexed properly)
- API response: <500ms p95
```

**Benefit**: Performance considered in every feature.

## 🎓 Best Practices

### Practice 1: Memory Initialization at Session Start

**Start each major session with**:
```
"Load all memory about the Roofing SaaS project and give me a brief
summary of the key architecture decisions and current status."
```

**Claude will respond**:
> "Based on memory: You're building a roofing CRM replacing Proline + Enzy. Using Next.js 15 + Supabase. Key decisions: WebRTC voice (1.8s latency), QB polling (15min), Safari-first. Currently in Phase 4 (Extensions). 1,375 contacts migrated."

### Practice 2: Update Memory After Major Decisions

**After extended thinking**:
```
✅ Extended thinking analysis complete
✅ Architecture chosen
→ "Add this to memory: [decision + rationale + never revisit]"
```

**Example**:
```
"Add to memory: Offline sync uses background fetch API with IndexedDB.
Tested on Safari iOS, works perfectly. This is the final approach,
don't reconsider other sync strategies."
```

### Practice 3: Memory + Skills = Maximum Power

**Combine for best results**:
- **Skills**: General domain knowledge (TCPA rules, QB API patterns)
- **Memory**: Project-specific decisions (our SMS timing, our QB polling interval)

**Example**:
- Skill: "TCPA requires 8am-9pm"
- Memory: "Our SMS campaigns run 9am-6pm (more conservative)"
- Result: Claude schedules 9am-6pm, not 8am-9pm

### Practice 4: Quarterly Memory Audits

**Every 3 months**, review and update:
```
"Show me all stored memory about the Roofing SaaS project.
Let's update anything that's changed and remove outdated decisions."
```

## 🔧 Advanced Usage

### Technique 1: Branching Architectures

**Store alternative approaches tried**:
```markdown
MEMORY: Voice Pipeline Experiments (Nov 17, 2025)

Tested approaches:
1. WebRTC + Opus (WINNER - 1.8s latency)
2. WebSocket + PCM (REJECTED - 2.3s latency)
3. Local Whisper (REJECTED - 3.1s latency, loading time)

Final decision: WebRTC + Opus + Cloud Whisper
Reason: Best latency + Safari compatibility
Never reconsider: Local Whisper (too slow)
```

**Benefit**: Claude won't suggest rejected approaches again.

### Technique 2: Client Feedback Loops

**Store UI/UX preferences**:
```markdown
MEMORY: Client Feedback History

Nov 10, 2025: "Contact form has too many fields"
→ Solution: Reduced to 5 required fields
→ Preference: Minimal forms always

Nov 12, 2025: "Love the blue color scheme"
→ Keep: #1E40AF primary color
→ Preference: Blue + gray tones only

Nov 15, 2025: "Pipeline drag-and-drop is confusing"
→ Solution: Added click-to-change as alternative
→ Preference: Multiple interaction methods
```

**Benefit**: Future features align with established preferences.

### Technique 3: Performance Evolution

**Track optimization history**:
```markdown
MEMORY: Performance Optimization History

Oct 1, 2025: Bundle size 287KB (baseline)
Oct 15, 2025: 198KB (lazy loading added)
Nov 3, 2025: 156KB (dynamic imports for maps)
Nov 17, 2025: CURRENT - 156KB target <200KB

What worked:
- Dynamic imports for heavy components (Leaflet -89KB)
- Code splitting by route (-42KB)

What didn't:
- Tree shaking (only saved 3KB)
- Compression beyond default (diminishing returns)
```

**Benefit**: Future optimization uses proven techniques.

## 🚫 Memory Anti-Patterns

### ❌ Don't: Store code
**Bad**: Entire component in memory
**Good**: Pattern/approach in memory, code in repo

### ❌ Don't: Duplicate skills
**Bad**: TCPA rules in both skill AND memory
**Good**: TCPA rules in compliance skill, our SMS timing in memory

### ❌ Don't: Store temporary state
**Bad**: "Currently implementing feature X"
**Good**: "Feature X architecture decision: [approach]"

### ❌ Don't: Forget to update
**Bad**: Memory says "using QB webhooks" (changed to polling)
**Good**: Update memory when decisions change

## 📊 Memory Effectiveness Metrics

**Memory is working when**:
- Sessions start faster (less context repetition)
- Decisions stay consistent across weeks
- Claude catches "we already tried that" scenarios
- New features align with established patterns
- Client preferences applied automatically

## 🎯 Quick Reference

| What to Remember | Why | Example |
|-----------------|-----|---------|
| Architecture decisions | Consistency | WebRTC + Opus for voice |
| Coding patterns | Code quality | Server Components by default |
| Business rules | Domain accuracy | $350/square estimate formula |
| Client preferences | UX alignment | Minimal forms, blue colors |
| Integration patterns | API reliability | QB polling not webhooks |
| Performance budgets | Speed requirements | <200KB bundle size |
| Lessons learned | Avoid mistakes | Don't use Chrome-only APIs |
| Compliance rules | Legal safety | TCPA 8am-9pm |

## 🔗 Related Guides

- **AGENT_SKILLS_SETUP.md** - Skills for general domain knowledge
- **EXTENDED_THINKING_GUIDE.md** - Think deeply before storing in memory
- **CHECKPOINT_WORKFLOWS.md** - Test memory-informed decisions safely

## 💡 Pro Tips

### Tip 1: Memory Initialization Doc
Create `/docs/MEMORY_INIT.md`:
```markdown
# Memory Initialization

Run this at session start:
"Load all memory about Roofing SaaS and summarize key decisions."

Expected response confirms:
- Tech stack (Next.js 15 + Supabase)
- Key decisions (WebRTC voice, QB polling)
- Client preferences (minimal UI, Safari-first)
- Current phase (Phase 4)
```

### Tip 2: Decision Template
When making major decisions:
```markdown
MEMORY: [Feature] Decision - [Date]

Problem: [What we were solving]
Options considered:
  1. [Option A] - [Why rejected]
  2. [Option B] - [Why rejected]
  3. [Option C] - [CHOSEN] - [Why]

Decision: [Option C]
Rationale: [Key reasons]
Never revisit: [Options A, B]
Locked: [Yes/No - can this be changed later?]
```

### Tip 3: Quarterly Memory Review
```
"Show all memory entries for Roofing SaaS.
Let's review and update anything that's changed in the last 3 months."
```

### Tip 4: Memory + Extended Thinking Combo
```
"Using extended thinking, design the QB integration.
After we choose an approach, add the decision to memory with
rationale so we never reconsider it."
```

## 📈 Success Story

**Before Memory**:
> Session 1: "We're using Next.js with Supabase..."
> Session 2: "We're using Next.js with Supabase..."
> Session 3: "We're using Next.js with Supabase..."
> [10 minutes per session explaining the same context]

**After Memory**:
> You: "Let's build the invoice sync feature"
> Claude: *Loads memory automatically*
> "Based on our QuickBooks polling strategy (15min intervals) and
> batch API approach, here's the invoice sync implementation..."
> [Zero context repetition, instant relevant suggestions]

**Time Saved**: ~10 minutes per session × 50 sessions = 8+ hours saved

---

**Remember**: Memory is your "second brain" for the project. Store architectural decisions, client preferences, and lessons learned once, then leverage them forever. Combined with agent skills, you'll never explain the same context twice!

**For this project**: Memory is perfect for Phase 4+ where architectural decisions (AI Voice, QB integration) need to stay consistent across multiple development sessions.
