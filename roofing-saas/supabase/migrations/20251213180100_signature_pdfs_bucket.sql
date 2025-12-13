-- Storage bucket for signature PDFs
-- Rollback: DROP POLICY IF EXISTS "Allow authenticated users to upload signature PDFs" ON storage.objects;
--           DROP POLICY IF EXISTS "Allow public read access to signature PDFs" ON storage.objects;
--           DROP POLICY IF EXISTS "Allow users to update their own signature PDFs" ON storage.objects;
--           DROP POLICY IF EXISTS "Allow users to delete their own signature PDFs" ON storage.objects;
--           DELETE FROM storage.buckets WHERE id = 'signature-pdfs';

-- Create the bucket (public for easy document sharing via links)
INSERT INTO storage.buckets (id, name, public)
VALUES ('signature-pdfs', 'signature-pdfs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy 1: Allow authenticated users to upload PDFs to their own folder
CREATE POLICY "Allow authenticated users to upload signature PDFs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'signature-pdfs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 2: Allow public read access to all signature PDFs
-- Required for signing links to work without authentication
CREATE POLICY "Allow public read access to signature PDFs"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'signature-pdfs');

-- Policy 3: Allow users to update their own PDFs
CREATE POLICY "Allow users to update their own signature PDFs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'signature-pdfs' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'signature-pdfs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Allow users to delete their own PDFs
CREATE POLICY "Allow users to delete their own signature PDFs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'signature-pdfs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

COMMENT ON POLICY "Allow authenticated users to upload signature PDFs" ON storage.objects IS
'Allows authenticated users to upload PDFs for signature documents to their user-specific folder';
