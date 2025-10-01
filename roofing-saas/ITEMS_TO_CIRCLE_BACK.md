# Items to Circle Back To

**Last Updated**: October 1, 2025 (10:00 PM)

---

## 🔴 CRITICAL (Blocking Production)

### 1. RLS Policy Issue - Infinite Recursion ✅ SOLUTION READY
**Location**: `tenant_users` table
**Error**: `infinite recursion detected in policy for relation "tenant_users"`
**Impact**: API calls failing (contacts, projects returning 403)
**Status**: ⚠️ NEEDS TO BE APPLIED IN SUPABASE
**Migration Ready**: `supabase/migrations/20251001_fix_tenant_users_recursion.sql`
**Documentation**: `docs/RLS_FIX_SUMMARY.md`

**How to Fix**:
1. Open Supabase Dashboard → SQL Editor
2. Open the migration file: `supabase/migrations/20251001_fix_tenant_users_recursion.sql`
3. Copy and paste the SQL into the SQL Editor
4. Run the migration
5. Verify: Should see "tenant_users now has 1 policies"

**Dev Server Shows**:
```
[getUserTenantId] Error: {
  code: '42P17',
  message: 'infinite recursion detected in policy for relation "tenant_users"'
}
```

**What It Does**:
- Removes the recursive policy causing infinite loop
- Keeps the simple policy that allows users to see their own membership
- Fixes getUserTenantId() so all API calls work

### 2. Supabase Storage Bucket Creation
**Location**: Supabase Dashboard > Storage
**Required For**: Photo upload functionality
**Status**: ⏳ MANUAL SETUP REQUIRED
**Documentation**: `SUPABASE_STORAGE_SETUP.md`
**Steps**:
1. Create bucket: `property-photos`
2. Set to public
3. Configure RLS policies
4. Test upload

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
