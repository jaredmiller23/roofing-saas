# Canvasser Guide

**Tennessee Roofing SaaS Platform**
**Role**: Canvasser / Field Representative
**Last Updated**: November 18, 2025

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Mobile App Installation](#mobile-app-installation)
3. [Territory Management](#territory-management)
4. [Door Knocking Workflow](#door-knocking-workflow)
5. [Photo Capture](#photo-capture)
6. [Offline Mode](#offline-mode)
7. [Voice Assistant](#voice-assistant)
8. [Field Tips & Best Practices](#field-tips--best-practices)

---

## Getting Started

### Your Role

As a Canvasser, you work in the field generating leads. Your access includes:
- ✅ Mobile app (PWA) for field work
- ✅ Territory maps and assignment
- ✅ Door knock logging
- ✅ Photo capture (roof, property, damage)
- ✅ Offline mode for areas with poor signal
- ✅ Voice assistant for hands-free operation
- ✅ Lead creation from the field

**Key Difference**: Your work is primarily mobile-based, not desktop.

---

## Mobile App Installation

The platform is a Progressive Web App (PWA) - it works like a native app but installs from your browser.

### Install on iPhone/iPad

1. **Open Safari** (must use Safari, not Chrome)
2. Navigate to: `https://your-company.roofing-saas.app`
3. Log in with your credentials
4. Tap the **Share** button (square with arrow)
5. Scroll down and tap **Add to Home Screen**
6. Name the app (e.g., "Roofing CRM")
7. Tap **Add**
8. App icon appears on home screen

**Result**: App launches fullscreen like a native app.

---

### Install on Android

1. **Open Chrome** (works best in Chrome)
2. Navigate to: `https://your-company.roofing-saas.app`
3. Log in with your credentials
4. You'll see an "Install" banner at bottom
5. Tap **Install** or **Add to Home Screen**
6. Confirm installation
7. App icon appears on home screen

**Alternative**:
- Tap menu (3 dots in top right)
- Select **Install app** or **Add to Home Screen**

---

### App Permissions

Grant these permissions when prompted:

| Permission | Why Needed |
|------------|------------|
| **Location** | Show your position on territory map |
| **Camera** | Capture photos of roofs/damage |
| **Microphone** | Voice assistant feature |
| **Notifications** | Alerts for new assignments |

**Note**: You can change permissions anytime in phone settings.

---

## Territory Management

### View Your Territories

1. Open mobile app
2. Tap **Territories** from main menu
3. See list of assigned territories
4. Each territory shows:
   - Territory name
   - Address/neighborhood
   - Total houses
   - Knocked count
   - Status (In Progress, Complete)

---

### Open Territory Map

1. Tap on any territory
2. Map opens with:
   - ✅ Your current location (blue dot)
   - ✅ House pins (knocked and unvisited)
   - ✅ Territory boundary (highlighted area)
   - ✅ Street labels

---

### Map Pin Colors

- **Red**: Not yet knocked
- **Green**: Knocked - Interested
- **Yellow**: Knocked - Follow up needed
- **Gray**: Knocked - Not interested / Not home

---

### Navigate to House

1. Open territory map
2. Tap any pin
3. Pin details popup shows:
   - Address
   - Previous knock status (if any)
   - Distance from your location
4. Tap **Navigate**
5. Opens in Google Maps or Apple Maps
6. Follow directions to house

---

## Door Knocking Workflow

### Log a Door Knock

1. **Walk to House** (use map for navigation)
2. **Knock on Door**
3. When someone answers (or doesn't):
   - Open mobile app
   - Territory map should be open
   - Tap **+ Drop Pin** button (bottom right)
   - Or tap existing red pin if at that location

4. **Pin Drop Dialog** opens:
   - Auto-detects address (geocoding)
   - Shows house address (verify it's correct)

5. **Select Disposition**:
   - **Interested**: Homeowner wants info
   - **Not Interested**: Declined service
   - **Not Home**: No answer
   - **Call Back**: Follow up needed
   - **Already Serviced**: Has roofer/recent work
   - **No Access**: Gated, locked, etc.

6. **Add Notes** (optional but recommended):
   - Homeowner name if provided
   - Roof condition observed
   - Special requests or concerns
   - Best time to call back

7. **Create Lead** (if interested):
   - Check **Create Lead** checkbox
   - Enter contact details:
     - **Name**: Homeowner name
     - **Phone**: Phone number
     - **Email**: Email (if provided)
   - These auto-create a contact in CRM

8. **Tap Save**

Pin appears on map with appropriate color.

---

### Quick Knock (No Answer)

For houses with no answer, fastest flow:

1. Tap **+ Drop Pin**
2. Select **Not Home**
3. Tap **Save**

Done in 3 taps!

---

### Follow-Up Knock

If returning to a house you knocked before:

1. Find the existing pin on map
2. Tap the pin
3. Tap **Update Status**
4. Select new disposition
5. Add new notes
6. Tap **Save**

Previous knock history is preserved.

---

## Photo Capture

### Take a Photo

Photos help document property conditions and support estimates.

#### From Map

1. Tap house pin on map
2. Tap **Add Photo** button
3. Camera opens
4. Frame the shot (roof, damage, property)
5. Tap shutter button
6. Review photo
7. **Retake** or **Use Photo**
8. Add caption (optional):
   - "North-facing roof"
   - "Hail damage on shingles"
   - "Gutter issues"
9. Tap **Save**

Photo is linked to that house/pin.

---

#### From Knock Log

When logging a knock:

1. In pin drop dialog, tap **Camera** icon
2. Take photo (same as above)
3. Photo attaches to knock log
4. Tap **Save**

Photo uploads automatically when online.

---

### View Photos

1. Tap house pin on map
2. Tap **Photos** tab
3. Swipe through all photos for that property
4. Tap to view full screen
5. Tap **Share** to send to office

---

### Photo Best Practices

✅ **Do**:
- Take multiple angles of roof
- Capture visible damage close-up
- Include street view for address confirmation
- Use good lighting (avoid shadows)
- Hold phone steady

❌ **Don't**:
- Take photos of people without permission
- Include license plates or private info
- Take photos in poor lighting
- Forget to add captions

---

## Offline Mode

### What is Offline Mode?

The app works **fully offline** when you lose signal. Perfect for:
- Rural areas with poor cell coverage
- Basements or buildings blocking signal
- Conserving data usage

---

### How Offline Mode Works

1. **Data Preloading**:
   - Open territory before going offline
   - Map tiles download automatically
   - Territory data caches locally

2. **Offline Actions Allowed**:
   - ✅ Log door knocks
   - ✅ Drop pins
   - ✅ Add notes
   - ✅ Take photos
   - ✅ View territory map
   - ✅ Navigate (if map loaded)

3. **Offline Queue**:
   - All actions queue locally
   - Synced when back online
   - Shows "Pending Sync" badge

---

### Use Offline Mode

1. **Before Going Offline**:
   - Open your territory
   - Wait for map to fully load
   - App caches territory data

2. **Work Offline**:
   - Log knocks as normal
   - Actions save locally
   - See "Offline" indicator at top

3. **Return Online**:
   - Connect to WiFi or cell signal
   - App auto-syncs queued actions
   - See "Syncing..." message
   - Success notification when complete

---

### Check Offline Queue

1. Tap **Menu** (hamburger icon)
2. Tap **Offline Queue**
3. See pending actions:
   - Knock logs waiting to sync
   - Photos waiting to upload
   - Contact creates pending
4. Tap **Sync Now** to force sync

---

## Voice Assistant

### What is Voice Assistant?

Hands-free voice control for logging knocks while walking/driving.

**Use Cases**:
- Logging knocks while holding materials
- Walking to next house
- Driving between neighborhoods
- Quick notes without typing

---

### Start Voice Assistant

1. Open mobile app
2. Tap **Voice** icon (microphone at bottom)
3. Grant microphone permission if prompted
4. See "Listening..." indicator
5. Speak your command
6. Wait for response

---

### Voice Commands

#### Log a Knock

**Say**: "Log a door knock at 123 Main Street, disposition not interested"

**Result**: Knock logged for that address

---

#### Create Lead

**Say**: "Create a new lead named John Smith with phone 555-1234"

**Result**: Contact created in CRM

---

#### Add Note

**Say**: "Add note to current house: homeowner wants call back next week"

**Result**: Note added to most recent pin

---

#### Search Contact

**Say**: "Search for John Smith"

**Result**: Shows contact details if found

---

#### Update Pipeline

**Say**: "Move project Smith Roof to proposal stage"

**Result**: Project stage updated

---

### Voice Assistant Tips

✅ **Do**:
- Speak clearly and at normal pace
- Use exact addresses if possible
- Say full names (first and last)
- Use short, simple commands

❌ **Don't**:
- Speak while in loud environment
- Rush or mumble
- Use slang or abbreviations
- Say multiple commands at once

---

### Stop Voice Assistant

- Tap **Stop** button
- Or say "Stop" or "Exit"

---

## Daily Workflow

### Morning Routine

1. **Open App**
   - Launch PWA from home screen
   - Check for app updates

2. **Check Territory Assignment**
   - Tap **Territories**
   - Open today's assigned territory
   - Wait for map to fully load

3. **Review Yesterday's Progress**
   - See knocked houses (colored pins)
   - Plan route for unvisited (red pins)

4. **Enable Location Services**
   - Ensure GPS is on
   - Verify location accuracy

---

### During Canvassing

1. **Navigate to First House**
   - Use map to find next unvisited pin
   - Tap **Navigate** for directions

2. **Knock on Door**
   - Introduce yourself
   - Deliver pitch

3. **Log Result Immediately**
   - Don't wait! Log while fresh
   - Tap pin, select disposition
   - Add notes about conversation

4. **Take Photos if Interested**
   - Capture roof condition
   - Document damage if visible

5. **Create Lead if Needed**
   - Check "Create Lead"
   - Enter contact info
   - Save knock log

6. **Move to Next House**
   - Find next red pin
   - Repeat process

---

### End of Day

1. **Final Sync Check**
   - Ensure all knocks synced
   - Check for "Pending Sync" badge
   - Force sync if needed

2. **Review Day's Stats**
   - Total knocks logged
   - Leads created
   - Territory completion %

3. **Plan Tomorrow**
   - Check next territory assignment
   - Note any follow-ups needed

4. **Close App**
   - No need to log out
   - App saves state

---

## Field Tips & Best Practices

### Territory Coverage

✅ **Do**:
- Work systematically (street by street)
- Cover entire territory before moving on
- Return for "Not Home" houses later in day
- Mark "No Access" houses to skip wasting time

❌ **Don't**:
- Jump randomly between streets
- Leave gaps in coverage
- Skip houses without logging them
- Visit same house twice same day

---

### Door Knocking

✅ **Do**:
- Be polite and professional
- Respect "No Soliciting" signs
- Log every knock (even no answer)
- Add detailed notes about homeowner concerns
- Get phone number if homeowner interested

❌ **Don't**:
- Be pushy or aggressive
- Visit after dark (safety!)
- Forget to log disposition
- Leave without getting contact info from interested leads

---

### Photo Documentation

✅ **Do**:
- Take photos of all interested leads
- Capture multiple roof angles
- Document visible damage
- Add descriptive captions
- Upload photos same day

❌ **Don't**:
- Take photos without homeowner knowledge
- Forget to link photos to correct house
- Take blurry or dark photos
- Wait days to upload photos

---

### Data Usage

✅ **Do**:
- Preload territory maps on WiFi
- Use offline mode in poor signal areas
- Sync at end of day on WiFi
- Download app updates on WiFi

❌ **Don't**:
- Stream video while canvassing (waste data)
- Upload large photos on cellular (wait for WiFi)
- Leave auto-sync on for large files

---

### Safety

✅ **Do**:
- Work in pairs if possible
- Canvass during daylight hours
- Stay aware of surroundings
- Report suspicious activity
- Keep phone charged

❌ **Don't**:
- Canvass alone after dark
- Enter backyards without permission
- Ignore "No Trespassing" signs
- Let phone die (carry charger)

---

## Troubleshooting

### App Won't Install

**iPhone**:
- Must use Safari (not Chrome)
- Ensure iOS 11.3 or later
- Try clearing Safari cache

**Android**:
- Use Chrome for best results
- Ensure Android 5.0 or later
- Check storage space available

---

### Location Not Working

**Solutions**:
- Enable Location Services in phone settings
- Grant location permission to browser (Safari/Chrome)
- Restart app
- Ensure GPS is on (not just WiFi location)

---

### Photos Won't Upload

**Solutions**:
- Check internet connection
- Try again on WiFi
- Verify camera permission granted
- Check available phone storage

---

### Map Not Loading

**Solutions**:
- Check internet connection
- Reload territory page
- Clear browser cache
- Ensure GPS location is enabled

---

### Offline Sync Stuck

**Solutions**:
- Force close and reopen app
- Tap "Sync Now" in offline queue
- Check internet connection
- Wait 5 minutes and retry

---

## Get Support

- **Team Lead**: Contact your direct supervisor
- **Tech Support**: support@roofing-saas.com
- **Phone**: 1-800-ROOFING
- **Hours**: Mon-Fri 8am-6pm CST

---

**End of Canvasser Guide**

For other guides, see:
- [Administrator Guide](./ADMINISTRATOR_GUIDE.md)
- [Sales Rep Guide](./SALES_REP_GUIDE.md)
- [Office Staff Guide](./OFFICE_STAFF_GUIDE.md)
