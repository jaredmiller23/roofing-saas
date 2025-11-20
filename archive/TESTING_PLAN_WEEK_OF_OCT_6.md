# Testing Plan - Week of October 6, 2025
**Goal**: Verify all features work before production deployment
**Timeline**: 5-7 days
**Status**: Ready to begin

---

## 🎯 OVERVIEW

You have **3 main testing tracks** to complete:

1. **Setup Tasks** (30-45 minutes total) - Get API keys
2. **Feature Testing** (4-6 hours total) - Verify everything works
3. **Mobile Testing** (2-4 hours total) - Test on real devices

**Total Time Estimate**: 7-10 hours over 5-7 days

---

## 📅 DAY-BY-DAY PLAN

### DAY 1: Setup & Exploration (1-2 hours)

#### Morning: API Key Setup (30-45 minutes)
- [ ] **ElevenLabs Agent** (15-20 min)
  - Go to: https://elevenlabs.io/app/conversational-ai
  - Create new agent
  - Configure 5 client tools (guide: `docs/ELEVENLABS_SETUP_GUIDE.md`)
  - Copy agent ID
  - Add to `.env.local`: `NEXT_PUBLIC_ELEVENLABS_AGENT_ID=xxx`

- [ ] **Google Maps API** (30 min)
  - Go to: https://console.cloud.google.com
  - Create project
  - Enable 3 APIs: Maps JavaScript, Geocoding, Directions
  - Generate restricted API key
  - Add to `.env.local`: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=xxx`

#### Afternoon: Financial Dashboard Tour (30-60 min)
- [ ] Start dev server: `npm run dev`
- [ ] Navigate to `/financial/reports`
  - Review P&L dashboard layout
  - Check all charts display
  - Review summary cards
- [ ] Navigate to `/financial/commissions`
  - Review commission tracking interface
  - Check team performance table
- [ ] Navigate to `/financial/analytics`
  - Review forecasting charts
  - Check cost trend analysis

**Deliverable**: API keys configured, financial dashboards reviewed

---

### DAY 2: Voice Assistant Testing (2-3 hours)

#### Morning: OpenAI Provider (1 hour)
- [ ] Navigate to `/voice-assistant`
- [ ] Click "Start Voice Assistant" (OpenAI provider)
- [ ] Grant microphone permission
- [ ] **Test Function 1**: Create Contact
  - Say: "Create a new contact named John Smith with phone 555-1234"
  - Verify contact appears in `/contacts`
- [ ] **Test Function 2**: Search Contact
  - Say: "Search for John Smith"
  - Verify AI reads back correct info
- [ ] **Test Function 3**: Add Note
  - Say: "Add a note to John Smith: Interested in metal roof"
  - Verify note saved in contact activities
- [ ] **Test Function 4**: Log Knock
  - Say: "Log a door knock at 123 Main Street, disposition interested"
  - Verify knock appears in `/knocks`
- [ ] **Test Function 5**: Update Stage
  - Say: "Move John Smith to qualified stage"
  - Verify pipeline stage changed in `/pipeline`

#### Afternoon: ElevenLabs Provider (1 hour)
- [ ] Switch to ElevenLabs provider
- [ ] Test all 5 functions again (same tests as OpenAI)
- [ ] **Quality Comparison**:
  - Which voice sounds more natural?
  - Which responds faster?
  - Which understands better?
  - Any function failures?

#### End of Day: Documentation (30 min)
- [ ] Note any bugs or issues
- [ ] Rate quality: OpenAI vs ElevenLabs (1-10)
- [ ] Document which provider you prefer

**Deliverable**: Voice assistant fully tested, provider preference documented

---

### DAY 3: Financial Features Testing (2-3 hours)

#### Morning: Job Costing (1-1.5 hours)
- [ ] Navigate to `/jobs/new`
- [ ] Create test job: "Residential Roof Replacement - Test"
  - Project: Link to existing project
  - Schedule: Next week
  - Assign crew
- [ ] Add expenses to job:
  - Labor: 8 hours @ $50/hr = $400
  - Materials: Shingles - $1,200
  - Equipment: Lift rental - $300
  - Total expenses: $1,900
- [ ] Set revenue: $3,500
- [ ] Verify calculations:
  - Total cost: $1,900 ✓
  - Profit: $1,600 ✓
  - Margin: 45.7% ✓
- [ ] Navigate to `/financial/reports`
  - Verify test job appears
  - Check P&L calculations updated

#### Afternoon: Commission System (1-1.5 hours)
- [ ] Navigate to `/financial/commissions`
- [ ] Click "Add Commission"
- [ ] Create test commission:
  - User: Select a sales rep
  - Project: Test job created earlier
  - Base amount: $3,500 (job revenue)
  - Tier: 7% (default)
  - Expected: $245 commission
- [ ] Verify calculation correct
- [ ] Check commission appears in:
  - Commissions list
  - Team performance table
  - User's total earned
- [ ] Test status changes:
  - Pending → Approved → Paid
  - Verify totals update correctly

**Deliverable**: Financial calculations verified accurate

---

### DAY 4: Territory & Maps Testing (1-2 hours)

#### Morning: Territory Management (1 hour)
- [ ] Navigate to `/territories`
- [ ] Verify Google Maps loads
- [ ] Create new territory:
  - Name: "Downtown Nashville Test"
  - Draw boundary on map
  - Assign to user
  - Save
- [ ] Verify territory displays on map
- [ ] Test map controls:
  - Zoom in/out
  - Pan/drag
  - Territory boundaries visible

#### Afternoon: Door Knocking (1 hour)
- [ ] Navigate to `/knocks/new`
- [ ] Log test knock:
  - Address: 456 Oak Street, Nashville, TN
  - Disposition: Interested
  - Notes: "Needs new roof, hail damage"
  - Photo: Upload test image
- [ ] Verify knock saved
- [ ] Navigate to `/knocks`
  - Find test knock in list
  - Verify address geocoded correctly
  - Check photo displays
- [ ] Navigate to `/territories`
  - Verify knock pin on map

**Deliverable**: Maps and territory features verified

---

### DAY 5: Mobile PWA Testing - iOS (2-4 hours)

**Prerequisites**: Deployed to production OR use ngrok for local testing

#### Morning: Installation & Basic Features (1-2 hours)
- [ ] **Installation**:
  - Open app in Safari on iPhone
  - Tap Share button → Add to Home Screen
  - Launch from home screen
  - Verify fullscreen mode (no Safari UI)

- [ ] **Basic Navigation**:
  - Test all main menu items
  - Verify pages load correctly
  - Check responsive layout

- [ ] **Field Features**:
  - Navigate to `/knocks/new`
  - Log knock with camera
  - Test photo capture
  - Verify geolocation captured

#### Afternoon: Offline Mode (1-2 hours)
- [ ] **Offline Test**:
  - Enable Airplane Mode
  - Open PWA from home screen
  - Verify app loads (cached)
  - Log knock offline
  - Capture photo offline
  - Check offline queue (`/offline`)
  - Disable Airplane Mode
  - Verify auto-sync occurs
  - Check knock/photo uploaded to server

- [ ] **Voice Assistant Mobile**:
  - Navigate to `/voice-assistant`
  - Test voice functions on mobile
  - Verify audio quality
  - Check iOS audio handling

**Deliverable**: iOS PWA fully tested

---

### DAY 6: Mobile PWA Testing - Android (2-4 hours)

**Same tests as Day 5, but on Android device**

- [ ] Installation (Chrome install prompt)
- [ ] Basic navigation
- [ ] Field features
- [ ] Offline mode
- [ ] Voice assistant mobile

**Deliverable**: Android PWA fully tested

---

### DAY 7: Final Review & Bug Fixes (Variable)

#### Morning: Bug Review (1-2 hours)
- [ ] List all bugs found during testing
- [ ] Prioritize: Critical, High, Medium, Low
- [ ] Create Archon tasks for each bug

#### Afternoon: Final Verification (1-2 hours)
- [ ] Test bug fixes (if any)
- [ ] Final walkthrough of all features
- [ ] Production deployment readiness check

**Deliverable**: Testing complete, ready for production

---

## 🐛 BUG REPORTING

When you find a bug, document it like this:

```
## Bug #1: Voice Assistant Not Connecting

**Severity**: High
**Feature**: Voice Assistant
**Device**: iPhone 15, iOS 17
**Steps to Reproduce**:
1. Navigate to /voice-assistant
2. Click "Start Voice Assistant"
3. Grant microphone permission
4. Expected: Connection established
5. Actual: Error "Failed to connect"

**Error Message**: [paste error from console]

**Screenshots**: [attach if available]
```

Then create an Archon task for it.

---

## ✅ TESTING CHECKLIST SUMMARY

### Setup Tasks (Complete First!)
- [ ] ElevenLabs agent created
- [ ] Google Maps API key generated
- [ ] Both added to `.env.local`
- [ ] Dev server running

### Feature Tests
- [ ] Voice assistant (OpenAI + ElevenLabs)
- [ ] Financial dashboards (P&L, Commissions)
- [ ] Job costing calculations
- [ ] Commission calculations
- [ ] Territory mapping
- [ ] Door knocking workflow

### Mobile Tests
- [ ] iOS installation
- [ ] iOS offline mode
- [ ] iOS voice assistant
- [ ] Android installation
- [ ] Android offline mode
- [ ] Android voice assistant

### Final Steps
- [ ] All bugs documented
- [ ] Critical bugs fixed
- [ ] Production deployment plan created

---

## 📊 PROGRESS TRACKING

Use this to track daily progress:

| Day | Tasks | Status | Time Spent | Notes |
|-----|-------|--------|------------|-------|
| 1   | Setup & Exploration | ⏸️ | - | - |
| 2   | Voice Assistant | ⏸️ | - | - |
| 3   | Financial Features | ⏸️ | - | - |
| 4   | Territory & Maps | ⏸️ | - | - |
| 5   | iOS Testing | ⏸️ | - | - |
| 6   | Android Testing | ⏸️ | - | - |
| 7   | Final Review | ⏸️ | - | - |

**Legend**: ⏸️ Not started | 🔄 In progress | ✅ Complete | ❌ Blocked

---

## 💡 TESTING TIPS

### For Voice Assistant:
- **Quiet environment**: Test in room with minimal background noise
- **Clear speech**: Speak normally, don't whisper or shout
- **Natural language**: Use conversational phrases, not robotic commands
- **Wait for response**: Let AI finish speaking before interrupting

### For Financial Features:
- **Use realistic data**: Create scenarios matching real-world usage
- **Check math**: Verify all calculations with calculator
- **Test edge cases**: $0 amounts, negative margins, etc.

### For Mobile Testing:
- **Good cellular signal**: Poor connection affects offline sync
- **Battery charged**: Testing drains battery (GPS, camera)
- **Storage space**: Ensure device has space for photos
- **Permissions**: Grant all requested permissions

### For Bug Reporting:
- **Be specific**: "Contact search doesn't work" → "Search returns no results when typing 'John'"
- **Include steps**: Exact sequence to reproduce
- **Note environment**: Device, browser, network conditions
- **Check console**: Browser dev tools may show error messages

---

## 🚀 WHAT TO EXPECT

### Features That Should "Just Work":
- ✅ Contact management
- ✅ Project management
- ✅ Pipeline drag-and-drop
- ✅ Photo uploads
- ✅ Document management
- ✅ SMS sending
- ✅ Email sending
- ✅ Authentication
- ✅ Multi-tenant isolation

### Features That Need Setup:
- ⚠️ Voice assistant (needs ElevenLabs agent ID)
- ⚠️ Maps (needs Google API key)
- ⚠️ QuickBooks (needs OAuth connection)
- ⚠️ Email deliverability (needs domain verification)

### Features That May Have Minor Bugs:
- ⚠️ Offline sync edge cases
- ⚠️ Voice on poor connections
- ⚠️ iOS audio handling quirks

---

## 📞 QUESTIONS DURING TESTING?

If you get stuck or find something confusing:

1. **Check documentation**:
   - `docs/TESTING_CHECKLIST.md` (detailed guide)
   - `docs/ELEVENLABS_SETUP_GUIDE.md` (agent setup)
   - `docs/GOOGLE_MAPS_SETUP.md` (maps setup)

2. **Check browser console**:
   - Right-click → Inspect → Console tab
   - Look for error messages (red text)
   - Copy error message for bug report

3. **Ask me**:
   - I can help debug issues
   - I can explain how features work
   - I can fix bugs you find

---

## 🎉 AFTER TESTING COMPLETE

Once all testing is done:

1. ✅ Review all bugs found
2. ✅ Fix critical bugs
3. ✅ Update Archon with results
4. ✅ Create production deployment plan
5. ✅ Schedule production go-live date
6. ✅ Plan team training sessions

**You'll be ready to launch!** 🚀

---

**Created**: October 6, 2025
**Last Updated**: October 6, 2025
**Status**: Ready to Begin
