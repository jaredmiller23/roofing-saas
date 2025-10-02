# Supabase Storage Setup for Photos

**Status**: Setup Required
**Last Updated**: October 1, 2025

---

## 📦 Storage Bucket Configuration

The Roofing SaaS app needs a Supabase storage bucket for storing property photos taken by field reps.

### Step 1: Create Storage Bucket

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/wfifizczqvogbcqamnmw/storage/buckets
2. Click "New Bucket"
3. Configure bucket:
   - **Name**: `property-photos`
   - **Public**: ✅ Yes (photos need to be viewable by clients)
   - **File size limit**: 10 MB
   - **Allowed MIME types**: `image/*`

### Step 2: Configure Storage Policies

After creating the bucket, set up RLS (Row Level Security) policies:

#### Policy 1: Public Read Access
```sql
CREATE POLICY "Public can view photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'property-photos');
```

#### Policy 2: Authenticated Users Can Upload
```sql
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-photos' AND
  auth.role() = 'authenticated'
);
```

#### Policy 3: Users Can Update Their Own Photos
```sql
CREATE POLICY "Users can update own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'property-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'property-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy 4: Users Can Delete Their Own Photos
```sql
CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Step 3: Set Up Storage Folder Structure

Photos will be organized by user and date:
```
property-photos/
  └── {user_id}/
      └── {year}/
          └── {month}/
              └── {filename}.jpg
```

Example:
```
property-photos/
  └── 29e3230c-02d2-4de9-8934-f61db9e9629f/
      └── 2025/
          └── 10/
              └── IMG_20251001_143025_abc123.jpg
```

---

## 🔧 Configuration in Code

The storage helper is already configured in `lib/storage/photos.ts` and will work once the bucket is created.

**Bucket Name**: `property-photos`

---

## 📝 Testing Storage

Once the bucket is created, test with:

```bash
curl -X POST http://localhost:3000/api/photos/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-image.jpg" \
  -F "contact_id=your-contact-uuid" \
  -F "metadata={\"location\":\"123 Main St\",\"notes\":\"Front view\"}"
```

---

## 🔗 Useful Links

- **Storage Dashboard**: https://supabase.com/dashboard/project/wfifizczqvogbcqamnmw/storage/buckets
- **Storage Policies**: https://supabase.com/dashboard/project/wfifizczqvogbcqamnmw/storage/policies
- **Supabase Storage Docs**: https://supabase.com/docs/guides/storage

---

## ⚠️ Important Notes

1. **Public Bucket**: Photos are publicly accessible via URL. Don't store sensitive information in filenames.
2. **File Size**: 10 MB limit per photo (client-side compression reduces this significantly)
3. **MIME Types**: Only image files allowed (enforced by bucket configuration)
4. **Cleanup**: Consider implementing a cleanup job for orphaned photos (photos without associated records)
5. **Costs**: Supabase free tier includes 1 GB storage. Monitor usage as photos accumulate.

---

**Action Required**: Create the `property-photos` bucket in Supabase Dashboard before testing photo uploads.
