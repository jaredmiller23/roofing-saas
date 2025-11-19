# Profile Photos Storage Setup

**Date**: November 18, 2025
**Feature**: User Profile & Security Settings
**Status**: ⚠️ Setup Required

---

## Overview

The user profile system requires a Supabase Storage bucket for storing profile photos. This document outlines the setup steps.

---

## Prerequisites

- Supabase project access
- Admin/Owner role in Supabase Dashboard

---

## Setup Steps

### Step 1: Create Storage Bucket

1. **Navigate to Storage**
   - Open Supabase Dashboard
   - Go to **Storage** section in left sidebar

2. **Create New Bucket**
   - Click "Create a new bucket"
   - **Bucket name**: `profile-photos`
   - **Public bucket**: ✅ **YES** (photos need to be publicly accessible)
   - Click "Create bucket"

### Step 2: Configure Bucket Policies

The bucket needs RLS policies to allow authenticated users to manage their own photos.

```sql
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can upload their own profile photos
CREATE POLICY "Users can upload own profile photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (storage.filename(name)) -- filename should be user_id
);

-- Policy: Users can update their own profile photos
CREATE POLICY "Users can update own profile photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  (storage.foldername(name))[1] = 'avatars'
);

-- Policy: Users can delete their own profile photos
CREATE POLICY "Users can delete own profile photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  (storage.foldername(name))[1] = 'avatars'
);

-- Policy: Anyone can view profile photos (public bucket)
CREATE POLICY "Anyone can view profile photos"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'profile-photos'
);
```

### Step 3: Set File Size Limits (Optional)

In Supabase Dashboard:
1. Go to **Storage** > **profile-photos** bucket
2. Click **Settings**
3. Set **Max file size**: `5MB` (5242880 bytes)

### Step 4: Configure MIME Types (Optional)

Restrict uploads to images only:
1. In bucket settings
2. Add **Allowed MIME types**:
   - `image/jpeg`
   - `image/jpg`
   - `image/png`
   - `image/webp`
   - `image/gif`

---

## Folder Structure

```
profile-photos/
└── avatars/
    ├── {user_id}-{timestamp}.jpg
    ├── {user_id}-{timestamp}.png
    └── ...
```

**Naming Convention**: `{user_id}-{timestamp}.{ext}`

**Example**: `550e8400-e29b-41d4-a716-446655440000-1700000000000.jpg`

---

## File Constraints

| Constraint | Value |
|------------|-------|
| **Max file size** | 5MB (5,242,880 bytes) |
| **Allowed types** | JPEG, JPG, PNG, WebP, GIF |
| **Folder** | avatars/ |
| **Public access** | Yes |

---

## API Integration

The profile photo upload is handled by `/api/profile/upload-photo`:

**Upload**:
```typescript
POST /api/profile/upload-photo
Content-Type: multipart/form-data

{
  file: File
}
```

**Delete**:
```typescript
DELETE /api/profile/upload-photo
```

---

## Testing

### Manual Test

1. **Upload Photo**
   ```bash
   # From profile page UI
   1. Go to /settings/profile
   2. Click "Upload Photo"
   3. Select image file (< 5MB)
   4. Verify upload success
   ```

2. **View Photo**
   - Photo should display immediately after upload
   - Public URL should be accessible without auth

3. **Delete Photo**
   - Click "Delete" button
   - Confirm deletion
   - Verify photo removed from storage and UI

### Automated Test

```typescript
// Test profile photo upload
const formData = new FormData()
formData.append('file', imageFile)

const response = await fetch('/api/profile/upload-photo', {
  method: 'POST',
  body: formData
})

expect(response.ok).toBe(true)
const data = await response.json()
expect(data.avatar_url).toBeDefined()
```

---

## Troubleshooting

### Issue: "Bucket not found" error

**Solution**: Create the `profile-photos` bucket in Supabase Dashboard

### Issue: Upload fails with 403 Forbidden

**Solution**: Check RLS policies are correctly configured

### Issue: Photos not displaying

**Solution**:
1. Verify bucket is set to **Public**
2. Check the public URL is correctly formed
3. Verify file was actually uploaded to storage

### Issue: File too large error

**Solution**:
1. Reduce image size before upload
2. Implement client-side compression
3. Increase max file size in bucket settings (not recommended)

---

## Security Considerations

1. ✅ **RLS Enabled**: Only authenticated users can upload
2. ✅ **File Type Validation**: Only images allowed
3. ✅ **Size Limits**: 5MB maximum prevents abuse
4. ✅ **Public Read**: Photos publicly accessible (needed for display)
5. ⚠️ **No Malware Scanning**: Consider adding virus scanning for production

---

## Cost Estimates

**Supabase Storage Pricing** (as of 2024):
- **Free tier**: 1GB storage included
- **Overage**: $0.021/GB/month

**Estimated Usage**:
- Average photo size: ~500KB
- 100 users = ~50MB storage
- 1,000 users = ~500MB storage
- Cost: $0 (within free tier)

---

## Migration Notes

If migrating existing profile photos from another system:

```typescript
// Bulk upload script
async function migrateProfilePhotos(users: Array<{id: string, photoUrl: string}>) {
  for (const user of users) {
    const response = await fetch(user.photoUrl)
    const blob = await response.blob()

    const formData = new FormData()
    formData.append('file', blob, `${user.id}.jpg`)

    await fetch('/api/profile/upload-photo', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${user.accessToken}`
      }
    })
  }
}
```

---

## Related Documentation

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage RLS Policies](https://supabase.com/docs/guides/storage/security/access-control)
- User Profile API: `/app/api/profile/upload-photo/route.ts`
- User Profile Page: `/app/(dashboard)/settings/profile/page.tsx`

---

**Status**: ⚠️ **Manual setup required** before profile photo uploads will work
