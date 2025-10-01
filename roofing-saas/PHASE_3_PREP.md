# Phase 3 Preparation: Mobile PWA

**Start Date**: Ready to begin
**Duration**: Weeks 10-12 (3 weeks)
**Focus**: Progressive Web App with offline capabilities, photo uploads, and gamification

---

## 🎯 Phase 3 Goals

Transform the Roofing SaaS into a mobile-first Progressive Web App (PWA) that replaces the Enzy door-knocking app currently used by the client.

### Key Requirements (from PRD):
1. **Mobile-First Design**: Works seamlessly on phones and tablets
2. **Offline Capability**: Door-knockers can work without internet
3. **Photo Uploads**: Document roof conditions and job progress
4. **Territory Management**: Assign and track door-knocking zones
5. **Gamification**: Points, achievements, and leaderboards for sales reps

---

## 📋 Week-by-Week Breakdown

### Week 10: PWA Foundation
**Goal**: Make the app installable and work offline

**Tasks**:
- [ ] Configure Next.js PWA (next-pwa)
- [ ] Create app manifest.json
- [ ] Design app icons (192x192, 512x512)
- [ ] Implement service worker
- [ ] Setup IndexedDB for offline storage
- [ ] Add install prompt UI
- [ ] Test offline functionality

**Deliverables**:
- Installable app on mobile devices
- Basic offline support for viewing data
- App icons and splash screens

---

### Week 11: Photo System & Territory Management
**Goal**: Photo uploads and territory tracking

**Tasks - Photo System**:
- [ ] Configure Supabase Storage buckets
- [ ] Create photo upload API
- [ ] Implement image compression
- [ ] Add photo gallery UI
- [ ] Link photos to contacts/projects
- [ ] Add photo metadata (location, timestamp)

**Tasks - Territory Management**:
- [ ] Create territories table
- [ ] Territory assignment system
- [ ] Territory map view
- [ ] Address tracking per territory
- [ ] Territory performance metrics

**Deliverables**:
- Photo upload and viewing
- Territory assignment and tracking
- Map visualization of territories

---

### Week 12: Gamification System
**Goal**: Points, achievements, and competition

**Tasks - Points System**:
- [ ] Create points table
- [ ] Define point-earning actions
- [ ] Point calculation logic
- [ ] Daily/weekly/monthly point totals
- [ ] Point history tracking

**Tasks - Achievements**:
- [ ] Create achievements table
- [ ] Define achievement types
- [ ] Achievement unlock logic
- [ ] Achievement badges UI
- [ ] Achievement notifications

**Tasks - Leaderboards**:
- [ ] Leaderboard API endpoints
- [ ] Daily leaderboard
- [ ] Weekly leaderboard
- [ ] Monthly leaderboard
- [ ] All-time leaderboard
- [ ] Team rankings

**Deliverables**:
- Complete gamification system
- Leaderboards with real-time updates
- Achievement system with badges
- Competitive sales environment

---

## 🗄️ New Database Tables (Already Created!)

These tables exist from Phase 1 schema - just need to use them:

### Territories
```sql
territories (
  id, tenant_id, name, description,
  boundary_data (GeoJSON), assigned_to,
  created_at, updated_at, is_deleted
)
```

### Photos
```sql
photos (
  id, tenant_id, contact_id, project_id,
  file_path, file_url, thumbnail_url,
  metadata (JSONB), uploaded_by,
  created_at, is_deleted
)
```

### Gamification Tables
```sql
-- Points tracking
gamification_points (
  id, tenant_id, user_id, action_type,
  points, metadata, created_at
)

-- User stats
gamification_stats (
  id, tenant_id, user_id,
  total_points, level, rank,
  achievements (JSONB),
  updated_at
)

-- Achievements
gamification_achievements (
  id, tenant_id, name, description,
  icon, points_required, badge_type,
  created_at
)
```

---

## 📦 New Dependencies Needed

### PWA & Offline:
```bash
npm install next-pwa workbox-webpack-plugin
npm install idb  # IndexedDB wrapper
```

### Photos & Media:
```bash
npm install browser-image-compression  # Client-side image compression
npm install @supabase/storage-js  # Already included with Supabase
```

### Maps (if needed for territory view):
```bash
npm install leaflet react-leaflet  # Free map library
npm install @types/leaflet -D
```

---

## 🎨 UI Components Needed

### Mobile Navigation:
- Bottom tab bar (Contacts, Map, Camera, Leaderboard, Profile)
- Hamburger menu for settings
- Pull-to-refresh functionality

### Camera/Photo Components:
- Camera capture UI
- Photo gallery grid
- Photo viewer with swipe
- Photo upload progress

### Territory Components:
- Map view with territory boundaries
- Territory list view
- Address checklist
- Territory stats dashboard

### Gamification Components:
- Points counter badge
- Achievement popup notifications
- Leaderboard table
- Profile stats card
- Level progress bar

---

## 🚀 PWA Configuration

### 1. next.pwa Setup
```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

module.exports = withPWA({
  // existing config
})
```

### 2. Manifest File
```json
// public/manifest.json
{
  "name": "Roofing SaaS",
  "short_name": "Roofing",
  "description": "Complete roofing CRM and sales tool",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 3. Service Worker Strategy
- **Network First**: API calls, always try network
- **Cache First**: Static assets (JS, CSS, images)
- **Stale While Revalidate**: Contact/project lists
- **Background Sync**: Photo uploads when back online

---

## 📱 Offline Strategy

### What Works Offline:
- View cached contacts and projects
- Take photos (stored locally)
- Create new contacts (queued for sync)
- View territories and assignments
- Check leaderboards (cached data)

### What Syncs When Online:
- New contacts created offline
- Photos taken offline
- Points earned offline
- Activity logs

### Implementation:
```typescript
// IndexedDB stores:
- contacts (last synced data)
- projects (last synced data)
- pending_uploads (photos to upload)
- pending_actions (create/update operations)
- sync_queue (ordered operations)
```

---

## 🏆 Point-Earning Actions

Based on typical roofing sales workflow:

| Action | Points | Notes |
|--------|--------|-------|
| Door knock logged | 1 | Every door |
| New lead created | 10 | Contact info captured |
| Appointment scheduled | 25 | Inspection booked |
| Inspection completed | 50 | Photos uploaded |
| Proposal sent | 75 | Estimate created |
| Deal closed | 500 | Project won |
| Photo uploaded | 5 | Per photo |
| Daily goal met (20 doors) | 50 | Bonus |
| Weekly goal met (100 doors) | 250 | Bonus |

---

## 🎖️ Achievement Ideas

### Bronze Level (100 points):
- "First Steps" - Log 10 door knocks
- "Smile For The Camera" - Upload 5 photos
- "Lead Generator" - Create 5 leads

### Silver Level (500 points):
- "Century Club" - Log 100 door knocks
- "Closer" - Close first deal
- "Photographer" - Upload 50 photos

### Gold Level (2000 points):
- "Door Warrior" - Log 500 door knocks
- "Sales Master" - Close 10 deals
- "Top Performer" - Reach #1 on leaderboard

---

## ✅ Pre-Phase 3 Checklist

Before starting Phase 3:

### Database:
- [ ] Run Phase 2 migrations (SMS, Email, Automation)
- [ ] Verify gamification tables exist
- [ ] Verify territories table exists
- [ ] Verify photos table exists

### Testing:
- [ ] Test at least one Phase 2 feature (SMS recommended)
- [ ] Verify API authentication working
- [ ] Check RLS policies are active

### Environment:
- [ ] Node modules up to date (`npm install`)
- [ ] No TypeScript errors (`npm run build`)
- [ ] Development server running

### Documentation:
- [ ] Review PHASE_2_COMPLETE.md
- [ ] Understand PWA requirements
- [ ] Familiar with gamification rules

---

## 🎯 Success Criteria

Phase 3 will be considered complete when:

1. ✅ App is installable on iOS and Android
2. ✅ Basic offline functionality works
3. ✅ Photos can be uploaded and viewed
4. ✅ Territories can be assigned and tracked
5. ✅ Points are earned for actions
6. ✅ Leaderboards display rankings
7. ✅ Achievements unlock and display

---

## 📚 Resources

### PWA Learning:
- https://web.dev/progressive-web-apps/
- https://nextjs.org/docs/basic-features/progressive-web-app

### Supabase Storage:
- https://supabase.com/docs/guides/storage

### IndexedDB:
- https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- https://github.com/jakearchibald/idb

### Gamification Design:
- https://yukaichou.com/gamification-examples/
- Points, badges, leaderboards best practices

---

## 🚨 Important Notes

1. **Mobile Testing**: Phase 3 requires testing on actual mobile devices, not just browser dev tools

2. **Photo Storage**: Supabase has storage limits. May need to configure image compression and quality settings

3. **Offline Sync**: Complex! Need careful handling of conflicts when syncing offline changes

4. **iOS PWA Limitations**: iOS Safari has some PWA limitations (no push notifications, limited storage)

5. **Map Data**: Territory boundaries may require GeoJSON. Consider using simple polygon coordinates initially

---

Ready to start Phase 3 when you are! 🎉
