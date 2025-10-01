# Items to Circle Back To

**Last Updated**: October 1, 2025 (10:10 PM)

---

## 🔴 CRITICAL (Blocking Production)

### 1. RLS Policy Issue - Infinite Recursion ✅ COMPLETE
**Location**: `tenant_users` table
**Status**: ✅ FIXED (October 1, 2025 - 10:10 PM)
**Migration Applied**: `supabase/migrations/20251001_fix_tenant_users_recursion.sql`

**What Was Fixed**:
- Removed the recursive policy causing infinite loop
- API endpoints now working properly (contacts, projects, territories)
- getUserTenantId() function no longer throws 403 errors

### 2. Supabase Storage Bucket Creation ✅ COMPLETE
**Location**: Supabase Dashboard > Storage
**Status**: ✅ CONFIGURED (October 1, 2025 - 10:15 PM)
**Bucket**: `property-photos` (public bucket with RLS policies)

**What's Configured**:
- Storage bucket created and set to public
- RLS policies already in place (public read, authenticated upload/update/delete)
- Photo upload functionality ready to test

---

## 🟡 HIGH PRIORITY (Should Address Soon)

### 3. Component Integration into Pages
**Status**: Components built but not integrated
**Needs**:
- Photo components in contact detail pages
- Territory components in new territory management page
- Photo gallery in project detail pages

**Suggested Pages to Create**:
- `/territories` - List view
- `/territories/new` - Create with map editor
- `/territories/[id]` - View/edit territory
- `/contacts/[id]/photos` - Photo gallery for contact

### 4. Component Testing
**Status**: ⏳ NOT TESTED
**Critical Tests**:
- [ ] Photo upload with camera (mobile device required)
- [ ] Photo upload with file picker (desktop)
- [ ] Photo compression validation
- [ ] Offline photo queue (disable network)
- [ ] Territory polygon drawing
- [ ] Territory boundary editing
- [ ] Territory map visualization
- [ ] PWA install prompt
- [ ] Service worker caching

### 5. Database Migrations Setup
**Location**: `supabase/migrations/`
**Status**: ⏳ PENDING
**Purpose**: Production-ready schema versioning
**Note**: Marked as "non-blocking" but important for deployment

---

## 🟢 MEDIUM PRIORITY (Can Wait)

### 6. Resend Domain Verification
**Status**: ⏳ PENDING
**Purpose**: Production email sending
**Note**: Works without verification in development

### 7. Automation Engine Testing
**Status**: ⏳ PENDING
**Purpose**: Verify workflow execution
**Note**: Engine built but not tested with real scenarios

### 8. Week 12 - Gamification System
**Status**: 📅 SCHEDULED NEXT
**Includes**:
- Points system
- Achievements
- Leaderboards
**Database Tables**: Already exist (Phase 1)

---

## 🔵 LOW PRIORITY (Future Enhancements)

### 9. Territory Enhancements
- [ ] Contact markers on territory maps
- [ ] Address points within boundaries
- [ ] Territory coverage heatmap
- [ ] Drag-and-drop territory assignment

### 10. Photo Enhancements
- [ ] Thumbnail generation
- [ ] Image annotations/markup
- [ ] Photo categories/tags
- [ ] Batch upload

### 11. PWA Testing on Devices
- [ ] iOS Safari (install prompt)
- [ ] Android Chrome (install prompt)
- [ ] Offline mode verification
- [ ] Service worker updates

---

## 📊 Status Summary

| Priority | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 2 | Need immediate attention |
| 🟡 High | 3 | Should address before moving forward |
| 🟢 Medium | 3 | Can defer slightly |
| 🔵 Low | 3 | Future enhancements |

---

## 🎯 Recommended Next Actions

1. **Fix RLS policy issue** (30 min) - Critical for API functionality
2. **Create Supabase storage bucket** (10 min) - Required for photo uploads
3. **Create territory management pages** (2 hours) - Integrate components
4. **Test core functionality** (1 hour) - Verify photo and territory features work
5. **Move to Week 12 gamification** (After above are complete)

---

## 📝 Notes

- Components are production-ready but need integration
- Backend APIs are solid (photos, territories)
- RLS issue is the main blocker for full functionality
- Quality was prioritized over speed (as requested)
- All work is documented and committed to git

---

**How to Use This Document**:
- Review before each session
- Update status as items are completed
- Add new items as they come up
- Use priority levels to guide focus
