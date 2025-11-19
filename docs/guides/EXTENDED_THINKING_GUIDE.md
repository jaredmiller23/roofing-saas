# Extended Thinking Guide

**Last Updated**: November 17, 2025
**Claude Version**: Sonnet 4.5
**Feature Status**: Available Now

## 🧠 What is Extended Thinking?

Extended Thinking is a deeper reasoning mode where Claude explicitly works through complex problems step-by-step before providing a response. Think of it as "showing your work" in math class - Claude reasons through the problem transparently, leading to better decisions on critical tasks.

### Key Characteristics
- **Explicit Reasoning**: You see Claude's thought process
- **Deeper Analysis**: More thorough consideration of edge cases
- **Better Decisions**: Optimal solutions for complex problems
- **Transparent Process**: Understand WHY a decision was made

## 🎯 When to Use Extended Thinking

### ✅ Perfect Use Cases for This Project

**1. Architecture Decisions**
- Designing the AI Voice Assistant pipeline
- Choosing between webhook vs polling for Twilio
- Deciding on offline-first PWA sync strategy
- Planning QuickBooks integration architecture

**Example Question**:
> "Using extended thinking, should we use WebRTC or WebSockets for the AI Voice Assistant? Consider latency, browser support, Safari compatibility, and fallback strategies."

**2. Security & Compliance Analysis**
- Analyzing TCPA compliance for SMS campaigns
- Reviewing RLS policies for multi-tenant isolation
- Evaluating call recording consent workflows
- Data retention policy design

**Example Question**:
> "With extended thinking, review our current RLS policies for the contacts table. Are there any gaps that could allow cross-tenant data leakage?"

**3. Performance Optimization**
- Analyzing bundle size and lazy loading opportunities
- Database query optimization strategies
- Caching layer design
- API rate limiting approaches

**Example Question**:
> "Use extended thinking to analyze our current bundle size. What are the top 3 optimization opportunities and their trade-offs?"

**4. Complex Data Migrations**
- Proline to Supabase contact migration strategy
- Enzy door-knocking data transformation
- Handling duplicate records and data conflicts
- Mapping legacy status codes to new pipeline stages

**Example Question**:
> "With extended thinking, design a migration strategy for 1,375 Proline contacts that handles duplicates, normalizes phone numbers, and preserves relationship history."

**5. Integration Planning**
- QuickBooks OAuth flow and token management
- Twilio webhook security and retry logic
- Resend email deliverability optimization
- Third-party API error handling strategies

**Example Question**:
> "Using extended thinking, what's the best approach for QuickBooks OAuth token refresh in our Next.js app? Consider security, user experience, and edge cases."

### ❌ When NOT to Use Extended Thinking

**Skip extended thinking for**:
- Simple CRUD operations
- Straightforward UI component creation
- Basic bug fixes with clear solutions
- Routine code refactoring
- Questions with obvious answers

## 🚀 How to Request Extended Thinking

### Method 1: Explicit Request
```
"Using extended thinking, [your complex question]"
"With extended thinking mode, analyze [problem]"
"Please think through [decision] carefully using extended thinking"
```

### Method 2: Implicit (For Critical Decisions)
Claude may automatically use extended thinking for:
- Multi-step architectural decisions
- Security/compliance questions
- Complex trade-off analysis

## 📊 Extended Thinking in Action

### Example 1: AI Voice Assistant Architecture

**Your Question**:
> "Using extended thinking, design the optimal architecture for our AI Voice Assistant that achieves <2 second latency while supporting 50+ concurrent users. Consider WebRTC vs WebSockets, local processing vs cloud, and Safari compatibility."

**Claude's Extended Thinking Process** (visible to you):
1. **Latency Requirements Analysis**
   - <2 sec target = ~1.8 sec max (buffer)
   - Breakdown: Network (300ms), Speech-to-text (500ms), LLM (800ms), Text-to-speech (400ms)

2. **WebRTC vs WebSockets Comparison**
   - WebRTC: Lower latency (peer-to-peer), better for audio
   - WebSockets: Simpler, easier fallback, works on all browsers
   - Safari: Both supported, but WebRTC has better audio APIs

3. **Local vs Cloud Processing**
   - Local (Whisper.cpp): Lower latency but limited device support
   - Cloud (OpenAI Whisper API): Reliable, scales well, 500ms penalty
   - Hybrid: Detect device capability, fall back to cloud

4. **Recommendation**: WebRTC + Cloud Processing
   - Use WebRTC for audio transport (lower latency)
   - Cloud processing for reliability and Safari compatibility
   - Implement connection quality monitoring
   - Fallback to WebSockets if WebRTC fails

**Final Response**: Detailed architecture with code examples, based on the reasoning above.

### Example 2: RLS Policy Security Review

**Your Question**:
> "With extended thinking, review our contacts table RLS policies for security gaps."

**Claude's Extended Thinking Process**:
1. **Current Policy Review**
   - SELECT: Uses `organization_id = auth.jwt() -> 'organization_id'`
   - INSERT: Same check
   - UPDATE: Missing created_by verification
   - DELETE: Only allows soft deletes

2. **Potential Vulnerabilities**
   - JWT claim manipulation (if token generation is flawed)
   - Missing UPDATE ownership check (any org member can edit)
   - No audit log for policy violations

3. **Attack Scenarios**
   - Insider threat: Employee edits competitor's contact
   - Token compromise: Attacker reads all org contacts
   - Privilege escalation: Lower-tier user deletes admin's contact

4. **Recommendations**
   - Add role-based UPDATE restrictions
   - Implement audit logging via trigger
   - Add rate limiting at API level
   - Consider field-level RLS for sensitive data

**Final Response**: Specific SQL policy updates + security checklist.

## 🎓 Best Practices

### 1. Be Specific with Requirements
**Good**:
> "Using extended thinking, compare Next.js Server Actions vs API Routes for our Twilio webhook handler. We need: sub-second response time, proper error handling, and webhook signature verification."

**Bad**:
> "Should we use Server Actions?"

### 2. Provide Context
**Good**:
> "With extended thinking, design our offline sync strategy. Context: 50MB average territory data, 10-20 sales reps in field simultaneously, Safari on iOS is primary browser."

**Bad**:
> "How do we do offline sync?"

### 3. Ask for Trade-off Analysis
**Good**:
> "Using extended thinking, what are the pros/cons of storing call recordings in Supabase Storage vs S3? Consider: cost at 1000 calls/month, query performance, GDPR compliance."

**Bad**:
> "Where should we store recordings?"

### 4. Request Specific Reasoning
**Good**:
> "With extended thinking, analyze these 3 approaches to QuickBooks rate limiting. Which is best for our use case and why?"

**Bad**:
> "What's the best rate limiting approach?"

## 🔗 Related Guides

- **CHECKPOINT_WORKFLOWS.md** - Use checkpoints to test extended thinking recommendations
- **AGENT_SKILLS_SETUP.md** - Create domain skills to enhance extended thinking
- **MEMORY_API_USAGE.md** - Persist extended thinking decisions across sessions

## 💡 Pro Tips

### Tip 1: Combine with Checkpoints
1. Ask for extended thinking analysis
2. Create a checkpoint before implementing
3. Test the solution
4. Rewind if needed and try alternative from the analysis

### Tip 2: Save Good Reasoning
When extended thinking produces excellent analysis:
1. Document the decision in `/docs/architecture/`
2. Add to Memory API for future reference
3. Create an agent skill if it's domain-specific

### Tip 3: Use for Learning
Extended thinking is great for understanding WHY:
- "Why did we choose Supabase RLS over application-level auth?"
- "Why is this the right data structure for territories?"
- "Why does this caching strategy work better?"

## 📈 Success Metrics

**You know extended thinking worked when**:
- Decision quality improves (fewer rewrites)
- Security/compliance gaps caught early
- Performance optimizations are data-driven
- Architecture choices align with requirements
- Team (you + Claude) understands trade-offs

## 🎯 Quick Reference

| Task Type | Use Extended Thinking? | Example |
|-----------|----------------------|---------|
| Architecture Design | ✅ Yes | AI Voice pipeline, sync strategy |
| Security Analysis | ✅ Yes | RLS policies, TCPA compliance |
| Performance Optimization | ✅ Yes | Bundle size, query optimization |
| Complex Migrations | ✅ Yes | Proline import, data normalization |
| Integration Planning | ✅ Yes | QuickBooks OAuth, Twilio webhooks |
| Simple CRUD | ❌ No | Create contact form |
| UI Component | ❌ No | Add a button to navbar |
| Bug Fix (obvious) | ❌ No | Fix typo in validation |
| Code Cleanup | ❌ No | Remove unused imports |

---

**Remember**: Extended thinking is a tool for complex decisions. Use it when the stakes are high, the solution isn't obvious, or you need to understand the WHY behind a recommendation.

**For this project**, the sweet spot is Phase 4 (AI Voice), QuickBooks integration, and critical security/compliance decisions.
