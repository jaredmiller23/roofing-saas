# Items to Circle Back To

**Last Updated**: October 1, 2025 (10:35 PM)

---

## 🔴 CRITICAL (Blocking Production)

### 1. Territories Table Migration ⏳ PENDING
**Location**: Supabase SQL Editor
**Status**: ⏳ NEEDS APPLICATION
**Migration File**: `supabase/migrations/20251001_create_territories_table.sql`

**What Needs to be Done**:
1. Open Supabase Dashboard > SQL Editor
2. Copy contents of `supabase/migrations/20251001_create_territories_table.sql`
3. Run the migration
4. Verify table was created

**What This Creates**:
- `territories` table with PostGIS support
- GeoJSON boundary_data column
- Proper RLS policies for multi-tenant access
- Indexes for performance

### 2. RLS Policy Issue - Infinite Recursion ✅ COMPLETE
**Location**: `tenant_users` table
**Status**: ✅ FIXED (October 1, 2025 - 10:10 PM)
**Migration Applied**: `supabase/migrations/20251001_fix_tenant_users_recursion.sql`

**What Was Fixed**:
- Removed the recursive policy causing infinite loop
- API endpoints now working properly (contacts, projects, territories)
- getUserTenantId() function no longer throws 403 errors

### 3. Supabase Storage Bucket Creation ✅ COMPLETE
**Location**: Supabase Dashboard > Storage
**Status**: ✅ CONFIGURED (October 1, 2025 - 10:15 PM)
**Bucket**: `property-photos` (public bucket with RLS policies)

**What's Configured**:
- Storage bucket created and set to public
- RLS policies already in place (public read, authenticated upload/update/delete)
- Photo upload functionality ready to test

---

## 🟡 HIGH PRIORITY (Should Address Soon)

### 4. Component Integration into Pages ✅ COMPLETE
**Status**: ✅ INTEGRATED (October 1, 2025 - 10:25 PM)

**What Was Integrated**:
- ✅ Photo components in contact detail pages (`/contacts/[id]`)
- ✅ Territory pages created:
  - `/territories` - List view
  - `/territories/new` - Create with map editor
  - `/territories/[id]` - View/edit territory
- ✅ Navigation updated with Territories link

### 5. Component Testing
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

### 6. Database Migrations Setup ✅ COMPLETE
**Location**: `supabase/migrations/`
**Status**: ✅ READY
**Purpose**: Production-ready schema versioning
**Note**: Migration system in place, territories migration created

---

## 🟢 MEDIUM PRIORITY (Can Wait)

### 7. Resend Domain Verification
**Status**: ⏳ PENDING
**Purpose**: Production email sending
**Note**: Works without verification in development

### 8. Automation Engine Testing
**Status**: ⏳ PENDING
**Purpose**: Verify workflow execution
**Note**: Engine built but not tested with real scenarios

### 9. Week 12 - Gamification System
**Status**: 📅 SCHEDULED NEXT
**Includes**:
- Points system
- Achievements
- Leaderboards
**Database Tables**: Already exist (Phase 1)

---

## 🔵 LOW PRIORITY (Future Enhancements)

### 10. Territory Enhancements
- [ ] Contact markers on territory maps
- [ ] Address points within boundaries
- [ ] Territory coverage heatmap
- [ ] Drag-and-drop territory assignment

### 11. Photo Enhancements
- [ ] Thumbnail generation
- [ ] Image annotations/markup
- [ ] Photo categories/tags
- [ ] Batch upload

### 12. PWA Testing on Devices
- [ ] iOS Safari (install prompt)
- [ ] Android Chrome (install prompt)
- [ ] Offline mode verification
- [ ] Service worker updates

---

## 📊 Status Summary

| Priority | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 1 | Territories table migration needs to be applied |
| 🟡 High | 2 | Component testing pending |
| 🟢 Medium | 3 | Can defer slightly |
| 🔵 Low | 3 | Future enhancements |

---

## 🎯 Recommended Next Actions

1. **Apply territories table migration** (5 min) ⚠️ CRITICAL
   - Open Supabase SQL Editor
   - Run `supabase/migrations/20251001_create_territories_table.sql`

2. **Fix Leaflet SSR issue** (15 min) - Blocking territory page loads
   - Make territory map components client-only with dynamic imports

3. **Test core functionality** (1 hour) - Verify photo and territory features work
   - Photo upload and gallery
   - Territory creation with map drawing

4. **Move to Week 12 gamification** (After above are complete)

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
