-- Storage bucket policies for property-photos
-- These policies control who can upload, view, update, and delete files in the storage bucket

-- First, ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Delete existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own photos" ON storage.objects;

-- Policy 1: Allow authenticated users to upload photos to their own folder
-- Users can only upload to paths starting with their user ID
CREATE POLICY "Allow authenticated users to upload photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 2: Allow public read access to all photos
-- Anyone can view photos (public bucket)
CREATE POLICY "Allow public read access to photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'property-photos');

-- Policy 3: Allow users to update their own photos
-- Users can only update files in their own folder
CREATE POLICY "Allow users to update their own photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'property-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'property-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Allow users to delete their own photos
-- Users can only delete files in their own folder
CREATE POLICY "Allow users to delete their own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add comment
COMMENT ON POLICY "Allow authenticated users to upload photos" ON storage.objects IS
'Allows authenticated users to upload photos to their user-specific folder (user_id/year/month/...)';
