-- Create bucket for signature PDF storage
-- ESIG-001: Integrate Document Builder into Creation Flow

-- Create signature-pdfs storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'signature-pdfs',
  'signature-pdfs',
  true,
  26214400, -- 25MB limit
  ARRAY['application/pdf']
);

-- Allow authenticated users to upload PDFs
CREATE POLICY "Users can upload signature PDFs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'signature-pdfs');

-- Allow authenticated users to view signature PDFs
CREATE POLICY "Users can view signature PDFs" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'signature-pdfs');

-- Allow authenticated users to delete their own signature PDFs
CREATE POLICY "Users can delete their own signature PDFs" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'signature-pdfs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);