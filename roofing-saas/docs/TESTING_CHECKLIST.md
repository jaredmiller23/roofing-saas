# Testing Checklist
## Comprehensive Testing Guide for Roofing SaaS

**Last Updated:** October 4, 2025
**Purpose:** Systematic testing of all features when you're available

---

## 🎯 Overview

This checklist covers all features that need user testing, organized by priority and complexity.

**Legend:**
- ⏸️ Not started
- 🔄 In progress
- ✅ Complete
- ❌ Failed (needs fix)

---

## 🔴 PRIORITY 1: Voice Assistant (ElevenLabs & OpenAI)

### Setup Prerequisites
- [ ] Environment variables configured:
  - `OPENAI_API_KEY` ✅ (already set)
  - `ELEVENLABS_API_KEY` ✅ (already set)
  - `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` ⏸️ (needs your input)
- [ ] Dev server running: `npm run dev`
- [ ] ElevenLabs agent created (see `docs/ELEVENLABS_SETUP_GUIDE.md`)

### OpenAI Voice Assistant Tests

#### Basic Connectivity
- [ ] Navigate to voice assistant page
- [ ] Click "Start Voice Assistant" button
- [ ] Allow microphone permission
- [ ] Verify status changes: `idle` → `connecting` → `connected`
- [ ] Check browser console for connection confirmation
- [ ] Verify audio playback works (hear AI voice)

#### Function: create_contact
- [ ] Say: "Create a new contact named John Smith with phone 555-1234"
- [ ] Verify contact appears in database
- [ ] Check Supabase: `contacts` table has new record
- [ ] Verify tenant isolation (correct tenant_id)
- [ ] Test with full address: "Create contact Jane Doe, 123 Main St, Nashville TN"

#### Function: search_contact
- [ ] Say: "Search for John Smith"
- [ ] Verify AI reads back search results
- [ ] Try: "Find contacts on Main Street"
- [ ] Try: "Search for phone number 555"
- [ ] Verify results are accurate

#### Function: add_note
- [ ] Say: "Add a note to John Smith: Interested in metal roof"
- [ ] Verify note saved to database
- [ ] Check activities table for new record
- [ ] Try without contact ID: "Add a note: Weather was great today"

#### Function: log_knock
- [ ] Say: "Log a door knock at 456 Oak Avenue, disposition interested"
- [ ] Verify knock logged in `knocks` table
- [ ] Check GPS coordinates captured (if available)
- [ ] Try: "Log knock at 789 Pine St, no answer"
- [ ] Verify dispositions: `not_home`, `interested`, `not_interested`, `appointment`

#### Function: update_contact_stage
- [ ] Say: "Move John Smith to qualified stage"
- [ ] Verify contact stage updated
- [ ] Check pipeline visualization reflects change
- [ ] Try: "Update Jane Doe to proposal stage"

#### Advanced Tests
- [ ] Multi-turn conversation (follow-up questions)
- [ ] Interruption handling (speak while AI is talking)
- [ ] Noisy environment (test with background noise)
- [ ] Mobile device (test on phone/tablet)
- [ ] Disconnection recovery (lose internet, reconnect)

### ElevenLabs Voice Assistant Tests

**Prerequisites:** Agent configured with client tools (see setup guide)

#### Provider Switching
- [ ] Verify provider selection UI available
- [ ] Switch from OpenAI to ElevenLabs
- [ ] Confirm agent ID is loaded
- [ ] Test connection establishment

#### All Functions (Same as OpenAI)
- [ ] create_contact works
- [ ] search_contact works
- [ ] add_note works
- [ ] log_knock works
- [ ] update_contact_stage works

#### Quality Comparison
- [ ] Voice naturalness (ElevenLabs vs OpenAI)
- [ ] Response latency (should be <100ms for ElevenLabs)
- [ ] Function calling accuracy
- [ ] Cost per session (check dashboards)
- [ ] Overall user experience rating

---

## 🟠 PRIORITY 2: Mobile PWA

### iOS Testing (Safari)

#### Installation
- [ ] Open https://roofing-saas.vercel.app in Safari
- [ ] Tap Share button
- [ ] Tap "Add to Home Screen"
- [ ] Verify icon appears on home screen
- [ ] Launch app from home screen
- [ ] Confirm fullscreen mode (no Safari UI)
- [ ] Check splash screen displays

#### Offline Functionality
- [ ] Enable Airplane Mode
- [ ] Open PWA from home screen
- [ ] Verify app loads (service worker cache)
- [ ] Log a door knock offline
- [ ] Capture photo offline
- [ ] Verify offline queue shows pending items
- [ ] Disable Airplane Mode
- [ ] Verify automatic sync occurs
- [ ] Check all data synced to server

#### Field Features
- [ ] Territory map loads correctly
- [ ] GPS location tracking works
- [ ] Photo capture with geolocation
- [ ] Knock logging with all dispositions
- [ ] Contact creation from knock
- [ ] Points/gamification updates

#### Performance
- [ ] App loads in <3 seconds
- [ ] Maps render smoothly
- [ ] Photo upload works on cellular
- [ ] Battery usage acceptable
- [ ] Storage usage reasonable

### Android Testing (Chrome)

#### Installation
- [ ] Open https://roofing-saas.vercel.app in Chrome
- [ ] Tap "Install" banner or Menu → "Install app"
- [ ] Verify icon on home screen
- [ ] Launch from home screen
- [ ] Confirm fullscreen mode

#### Offline Functionality
- [ ] Same tests as iOS above

#### Field Features
- [ ] Same tests as iOS above

#### Performance
- [ ] Same tests as iOS above

---

## 🟡 PRIORITY 3: Knowledge Base Search

### Vector Search Tests

#### Basic Search
- [ ] Navigate to knowledge base search
- [ ] Search: "What is the GAF System Plus warranty?"
- [ ] Verify results ranked by relevance (similarity %)
- [ ] Check top result has >70% similarity

#### Domain-Specific Queries
- [ ] Search: "How much does a roof cost in Tennessee?"
- [ ] Search: "How do I diagnose a roof leak?"
- [ ] Search: "What is ice and water shield?"
- [ ] Search: "GAF shingle installation requirements"
- [ ] Verify accurate, relevant results for each

#### Edge Cases
- [ ] Misspelled query: "wut is a vally"
- [ ] Very short query: "leak"
- [ ] Very long query: (full sentence question)
- [ ] Non-roofing query: "What's for lunch?" (should return low similarity)

#### Integration with Voice
- [ ] Ask voice assistant: "What is a GAF warranty?"
- [ ] Verify knowledge base is searched
- [ ] Check AI uses retrieved info in response

---

## 🟢 PRIORITY 4: Google Maps Integration

### Prerequisites
- [ ] Google Maps API key obtained
- [ ] Added to `.env.local`
- [ ] APIs enabled: Maps JavaScript, Geocoding, Directions
- [ ] Billing configured ($200/month limit)

### Map Display
- [ ] Navigate to `/territories`
- [ ] Verify map loads (no errors)
- [ ] Test zoom in/out
- [ ] Test pan/drag
- [ ] Verify map controls work

### Geocoding
- [ ] Create new territory with address
- [ ] Verify address converted to GPS coords
- [ ] Check boundary displays on map
- [ ] Try invalid address (error handling)

### Route Optimization
- [ ] Create 5+ knocks in a territory
- [ ] Click "Optimize Route"
- [ ] Verify efficient route displayed
- [ ] Check route follows logical order
- [ ] Test with 10+ stops

### Fallback Mode
- [ ] Disable Google Maps API (remove key)
- [ ] Verify app still functions
- [ ] Check fallback algorithms work:
  - Haversine distance calculation
  - Nearest-neighbor routing
- [ ] Re-enable API

---

## 🔵 PRIORITY 5: Gamification System

### Points Tracking
- [ ] Create a contact
- [ ] Verify 10 points awarded
- [ ] Check dashboard points display updated
- [ ] Upload 5 photos
- [ ] Verify 25 points awarded (5 × 5 pts)
- [ ] Check bonus points for 5 photos (25 pts)

### Leaderboard
- [ ] Navigate to dashboard
- [ ] Verify leaderboard shows rankings
- [ ] Check daily leaderboard updates
- [ ] Verify multi-tenant isolation (only team members shown)

### Levels
- [ ] Accumulate 100+ points
- [ ] Verify level increases (100 pts = Level 2)
- [ ] Check level display in UI
- [ ] Test level-based features (if any)

---

## 🟣 PRIORITY 6: Production Features

### Email System
- [ ] Send test email (password reset, notifications)
- [ ] Verify domain: notifications.claimclarityai.com
- [ ] Check deliverability (inbox, not spam)
- [ ] Test unsubscribe link

### SMS/Twilio
- [ ] Send test SMS
- [ ] Verify delivery
- [ ] Test SMS templates
- [ ] Check opt-out functionality

### QuickBooks Integration
- [ ] Connect QuickBooks account
- [ ] Test OAuth flow
- [ ] Create invoice
- [ ] Sync with QuickBooks

---

## 📊 Testing Summary Template

After completing tests, fill this out:

### Test Results

**Date:** ___________
**Tester:** ___________
**Environment:** Production / Staging / Dev

#### Voice Assistant
- OpenAI: ✅ / ❌ / ⏸️
- ElevenLabs: ✅ / ❌ / ⏸️
- Notes: ___________

#### Mobile PWA
- iOS: ✅ / ❌ / ⏸️
- Android: ✅ / ❌ / ⏸️
- Notes: ___________

#### Knowledge Base
- Search accuracy: ✅ / ❌ / ⏸️
- Voice integration: ✅ / ❌ / ⏸️
- Notes: ___________

#### Google Maps
- Maps display: ✅ / ❌ / ⏸️
- Geocoding: ✅ / ❌ / ⏸️
- Route optimization: ✅ / ❌ / ⏸️
- Notes: ___________

#### Gamification
- Points tracking: ✅ / ❌ / ⏸️
- Leaderboard: ✅ / ❌ / ⏸️
- Notes: ___________

### Issues Found

| Issue # | Feature | Description | Severity | Status |
|---------|---------|-------------|----------|--------|
| 1 | | | High/Med/Low | Open/Fixed |
| 2 | | | High/Med/Low | Open/Fixed |

### Recommendations

1. ___________
2. ___________
3. ___________

---

## 🚨 Bug Reporting Template

When you find a bug, create an Archon task with this format:

**Title:** `[BUG] Brief description`

**Description:**
```
## Bug Description
Clear description of the issue

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happened

## Environment
- Device: iPhone 15 / Pixel 8 / Desktop
- Browser: Safari / Chrome / Firefox
- Version: iOS 17 / Android 14 / macOS
- URL: /page/where/it/happened

## Screenshots/Logs
[Attach if available]

## Severity
- Critical (app crashes, data loss)
- High (feature broken)
- Medium (feature works but has issues)
- Low (cosmetic, minor UX)
```

---

## 📝 Next Steps After Testing

### If All Tests Pass ✅
1. Mark tasks as "done" in Archon
2. Deploy to production
3. Monitor production logs
4. Set up error tracking (Sentry)
5. Create user documentation

### If Tests Fail ❌
1. Create bug tasks in Archon
2. Prioritize critical issues
3. Fix bugs
4. Re-test
5. Repeat until all pass

### Ongoing Monitoring
1. Check error logs daily (first week)
2. Monitor API costs
3. Review user feedback
4. Track performance metrics
5. Plan improvements

---

**Remember:** Testing is iterative. Don't expect perfection on first try. The goal is to find and fix issues before users do!

Good luck with testing! 🧪
