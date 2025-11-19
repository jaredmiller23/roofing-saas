# Checkpoint Workflows Guide

**Last Updated**: November 17, 2025
**Claude Code Version**: 2.0+
**Feature**: Checkpoints (Esc×2 or `/rewind`)

## 🎯 What are Checkpoints?

Checkpoints are automatic save points in your development workflow. Think of them like Git commits, but instant, automatic, and covering both code AND conversation context.

### Key Features
- **Automatic Saves**: Before each Claude code change
- **Instant Rewind**: Press Esc×2 or use `/rewind`
- **Dual State**: Restore code, conversation, or both
- **No Overhead**: Happens in background, zero performance impact
- **Fearless Experimentation**: Try risky changes safely

## 🚀 How Checkpoints Work

### Automatic Checkpoint Creation
Claude Code automatically creates a checkpoint:
1. **Before every code edit** (Write/Edit tool usage)
2. **Before major refactors**
3. **At significant conversation milestones**

You don't need to do anything - they're always running.

### Rewinding to a Checkpoint

**Method 1: Keyboard Shortcut**
```
Press Esc×2 (Escape key twice quickly)
```
- Fastest method
- Brings up checkpoint list
- Select what to restore (code/conversation/both)

**Method 2: Command**
```
/rewind
```
- Type in chat
- Same checkpoint selection interface
- Good for discoverability

### What Gets Restored?

When you rewind, you can choose:
1. **Code only**: Restore files, keep conversation
2. **Conversation only**: Restore chat history, keep files
3. **Both**: Full state restoration

## 🎯 When to Use Checkpoints (Roofing SaaS Specific)

### ✅ **1. Before Major Refactors**

**Scenario**: Refactoring territory map components to use React Server Components

**Workflow**:
1. Claude creates automatic checkpoint before first edit
2. Proceed with refactor
3. Test in browser
4. If broken: Esc×2 → Restore code → Try different approach
5. If working: Continue!

**Example**:
> "Let's refactor the TerritoryMapClient to use Server Components for better performance. I'll create a checkpoint automatically, and we can rewind if Safari has issues."

### ✅ **2. Experimenting with Architecture**

**Scenario**: Testing different AI Voice Assistant audio transport methods

**Workflow**:
1. Say: "Let's try WebRTC first for the voice assistant"
2. Claude implements (checkpoint auto-created)
3. Test latency
4. If >2 sec: Esc×2 → Restore → Try WebSockets
5. Compare both approaches

**Example**:
> "I want to experiment with 3 different approaches to the voice pipeline. Let's try each one using checkpoints, measure latency, then pick the winner."

### ✅ **3. Testing New Integrations**

**Scenario**: Implementing QuickBooks OAuth flow

**Workflow**:
1. Implement OAuth flow v1 (checkpoint)
2. Test in browser
3. If redirect fails: Esc×2 → Restore
4. Try alternative approach
5. Compare both implementations

**Example**:
> "Let's implement QuickBooks OAuth. If the callback URL handling doesn't work in Safari, we'll checkpoint and try a different approach."

### ✅ **4. Complex Data Transformations**

**Scenario**: Migrating Proline contact data with phone number normalization

**Workflow**:
1. Implement normalization logic (checkpoint)
2. Run on sample data
3. If format issues: Esc×2 → Restore → Adjust logic
4. Test again until perfect

**Example**:
> "Let's normalize phone numbers in the Proline import. We can checkpoint before running the migration, then rewind if the format isn't right."

### ✅ **5. Performance Optimizations**

**Scenario**: Adding lazy loading to reduce bundle size

**Workflow**:
1. Note baseline bundle size
2. Add lazy loading (checkpoint auto-created)
3. Build and measure
4. If worse: Esc×2 → Restore → Try different approach
5. If better: Keep changes!

**Example**:
> "Let's add dynamic imports to reduce initial bundle. If it breaks Safari or doesn't improve load time, we'll just rewind."

### ✅ **6. UI Experiments**

**Scenario**: Trying different contact form layouts

**Workflow**:
1. Current layout (baseline)
2. Try new layout (checkpoint)
3. Show to client
4. If they don't like: Esc×2 → Restore → Try another
5. Quick iteration!

**Example**:
> "Let's try 3 different contact form designs. We can checkpoint between each one and quickly switch back to any version."

## 🎓 Best Practices

### Practice 1: Checkpoint Before Risk
**High-Risk Changes**:
- Database schema modifications
- RLS policy updates
- Authentication flow changes
- Payment integration testing
- Production data migrations

**Why**: These changes can break critical functionality. Checkpoint ensures instant recovery.

### Practice 2: Name Your Experiments
When trying multiple approaches, add comments:

```typescript
// CHECKPOINT EXPERIMENT 1: WebRTC Audio Transport
// Testing: Low latency, Safari compatibility
const audioTransport = new WebRTCTransport();

// If this doesn't work, rewind and try:
// EXPERIMENT 2: WebSocket with Opus codec
```

### Practice 3: Document What You Try
Keep notes during experimentation:

```markdown
## Voice Pipeline Experiments (Nov 17, 2025)

**Baseline**: WebSocket + PCM audio (2.3s latency)

**Experiment 1** (Checkpoint A):
- WebRTC + Opus codec
- Result: 1.8s latency ✅
- Safari: Works! ✅

**Experiment 2** (Checkpoint B):
- WebRTC + Raw PCM
- Result: 1.5s latency ✅
- Safari: Audio artifacts ❌
- Decision: Rewind to Checkpoint A

**Winner**: Experiment 1 (WebRTC + Opus)
```

### Practice 4: Combine with Extended Thinking
1. **Plan**: Use extended thinking to identify best approaches
2. **Execute**: Implement with automatic checkpoints
3. **Test**: Validate in real environment
4. **Rewind**: If issues found
5. **Iterate**: Try next approach from extended thinking analysis

**Example**:
> "Using extended thinking, give me 3 approaches to offline sync, ranked by likelihood of success. Then let's implement #1 with checkpoints, and rewind to try #2 if it doesn't work."

## 📋 Checkpoint Workflows by Phase

### Phase 3: Mobile PWA
**Use checkpoints for**:
- Service worker caching strategies
- IndexedDB schema changes
- Offline sync conflict resolution
- Push notification testing

**Example Workflow**:
1. Try aggressive caching (checkpoint)
2. Test offline mode
3. If stale data issues: Rewind
4. Try selective caching
5. Compare both approaches

### Phase 4: AI Voice Assistant
**Use checkpoints for**:
- Audio codec experiments (Opus, PCM, AAC)
- Latency optimizations
- Fallback strategies
- Browser compatibility testing

**Example Workflow**:
1. Baseline: Standard WebSocket implementation
2. Checkpoint → Try WebRTC
3. Checkpoint → Try Opus codec
4. Checkpoint → Try local Whisper
5. Compare all versions, pick winner

### Phase 5: QuickBooks Integration
**Use checkpoints for**:
- OAuth flow variations
- Token refresh strategies
- API error handling
- Rate limiting approaches

**Example Workflow**:
1. Implement OAuth redirect flow (checkpoint)
2. Test in Safari
3. If popup blocked: Rewind
4. Try same-window flow
5. Compare UX of both

## 🔧 Advanced Techniques

### Technique 1: A/B Testing Components
```typescript
// CHECKPOINT A: Current Contact Form
<ContactForm layout="vertical" validation="inline" />

// CHECKPOINT B: Alternative Layout
<ContactForm layout="horizontal" validation="onSubmit" />

// CHECKPOINT C: Minimal Form
<ContactForm layout="compact" validation="optimistic" />
```

**Workflow**: Show all 3 to client, rewind to the one they prefer.

### Technique 2: Progressive Enhancement
```typescript
// CHECKPOINT 1: Basic functionality
const features = ['create', 'read', 'update', 'delete'];

// CHECKPOINT 2: Add search
const features = ['create', 'read', 'update', 'delete', 'search'];

// CHECKPOINT 3: Add filtering
const features = ['create', 'read', 'update', 'delete', 'search', 'filter'];

// CHECKPOINT 4: Add bulk actions
const features = ['create', 'read', 'update', 'delete', 'search', 'filter', 'bulk'];
```

**Why**: If feature 4 breaks Safari, rewind to checkpoint 3. If feature 3 slows down mobile, rewind to checkpoint 2.

### Technique 3: Integration Testing
```typescript
// CHECKPOINT: Before Twilio Integration
// Baseline: Manual SMS sending works

// Try: Twilio webhook integration
// Test: Send SMS, receive status update
// If webhook doesn't fire in Safari: Rewind
// Try: Polling approach instead
```

### Technique 4: Database Migration Safety
```sql
-- CHECKPOINT: Before migration
-- Current: contacts table with 1,375 records

-- Run migration: Add phone_normalized column
-- Test: Query performance, Safari rendering
-- If slow: Rewind
-- Try: Add index first, then migrate
```

## 🚫 Checkpoint Anti-Patterns

### ❌ Don't: Rely on checkpoints instead of Git
**Bad**: Using checkpoints as primary version control
**Good**: Checkpoint for experiments, Git for permanent changes

### ❌ Don't: Checkpoint spam
**Bad**: Creating manual checkpoints every 30 seconds
**Good**: Automatic checkpoints + manual rewind when needed

### ❌ Don't: Forget to test before moving on
**Bad**: Make 10 changes, then rewind all of them
**Good**: Make change → Test → Keep or rewind → Repeat

### ❌ Don't: Use for emergency rollback in production
**Bad**: Production is broken, trying to rewind
**Good**: Checkpoints are for development only. Use Git for production rollback.

## 🎯 Quick Reference

| Situation | Action | Outcome |
|-----------|--------|---------|
| About to refactor | No action (auto-checkpoint) | Safe experimentation |
| Refactor broke Safari | Esc×2 → Restore code | Back to working state |
| Want to try 3 approaches | Try each, checkpoint between | Compare all versions |
| Integration test failed | Esc×2 → Restore code | Try alternative |
| Performance worse | Esc×2 → Restore code | Revert optimization |
| Wrong architectural path | Esc×2 → Restore conversation | Re-discuss approach |
| Client hates UI change | Esc×2 → Restore code | Show previous version |

## 🔗 Related Guides

- **EXTENDED_THINKING_GUIDE.md** - Plan approaches before checkpointing
- **AGENT_SKILLS_SETUP.md** - Domain knowledge for better experiments
- **AI_VOICE_ASSISTANT_ARCHITECTURE.md** - Perfect use case for checkpoints

## 💡 Pro Tips

### Tip 1: Checkpoint + Extended Thinking Combo
1. Ask: "Using extended thinking, what are 3 ways to implement offline sync?"
2. Get ranked list
3. Implement #1 (auto-checkpoint)
4. Test
5. If fails: Rewind, try #2
6. Rinse, repeat

### Tip 2: Name Your States
Add comments before major changes:
```typescript
// CHECKPOINT STATE: "Baseline - WebSocket only"
// CHECKPOINT STATE: "Experiment - WebRTC added"
// CHECKPOINT STATE: "Optimization - Opus codec"
```

### Tip 3: Keep a Lab Notebook
Document experiments in `/docs/experiments/`:
```markdown
# Voice Latency Experiments - Nov 17, 2025

## Setup
- Baseline: 2.3s latency
- Target: <2.0s latency
- Test: Safari 18 on macOS

## Checkpoint A: WebRTC
- Latency: 1.8s ✅
- Audio: Clear ✅
- **Winner!**

## Checkpoint B: Local Whisper
- Latency: 3.1s ❌ (model loading)
- Decision: Reverted
```

## 📈 Success Metrics

**You're using checkpoints well when**:
- Experimentation increases (trying 3+ approaches)
- Fear of changes decreases (safe to try risky things)
- Iteration speed increases (no manual undo work)
- Code quality improves (testing multiple solutions)
- Client feedback integrated faster (quick UI iterations)

---

**Remember**: Checkpoints make you fearless. Use them to try bold architectural changes, test risky optimizations, and rapidly iterate on client feedback. The worst case is always just Esc×2 away!
