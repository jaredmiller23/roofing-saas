-- Migration: Fix storage RLS policies for all buckets
-- Date: 2026-01-12
-- Issue: PDF uploads failing with "new row violates row-level security policy"
--
-- Root Cause: Multiple storage tables had RLS enabled but no policies:
-- 1. storage.buckets - users couldn't look up bucket info
-- 2. storage.prefixes - insert trigger writes to this table on every upload
--
-- When uploading to Supabase Storage:
-- 1. Client queries storage.buckets to get bucket info (needed SELECT policy)
-- 2. INSERT to storage.objects triggers storage.objects_insert_prefix_trigger()
-- 3. Trigger calls storage.add_prefixes() which INSERTs into storage.prefixes
-- Without policies on these tables, authenticated users couldn't complete uploads.

-- =============================================================================
-- BUCKETS TABLE POLICIES
-- =============================================================================

-- Allow authenticated users to read signature-pdfs bucket
CREATE POLICY "Allow authenticated users to read signature-pdfs bucket"
ON storage.buckets
FOR SELECT
TO authenticated
USING (name = 'signature-pdfs');

-- Allow authenticated users to read other buckets
CREATE POLICY "Allow authenticated users to read other buckets"
ON storage.buckets
FOR SELECT
TO authenticated
USING (name IN ('property-photos', 'profile-photos', 'claim-documents', 'files'));

-- =============================================================================
-- PREFIXES TABLE POLICIES
-- =============================================================================

-- Allow authenticated users to manage prefixes for signature-pdfs
CREATE POLICY "Allow authenticated users to manage prefixes"
ON storage.prefixes
FOR ALL
TO authenticated
USING (bucket_id = 'signature-pdfs')
WITH CHECK (bucket_id = 'signature-pdfs');

-- Allow authenticated users to manage prefixes for property-photos
CREATE POLICY "Allow authenticated users to manage property-photos prefixes"
ON storage.prefixes
FOR ALL
TO authenticated
USING (bucket_id = 'property-photos')
WITH CHECK (bucket_id = 'property-photos');

-- Allow authenticated users to manage prefixes for profile-photos
CREATE POLICY "Allow authenticated users to manage profile-photos prefixes"
ON storage.prefixes
FOR ALL
TO authenticated
USING (bucket_id = 'profile-photos')
WITH CHECK (bucket_id = 'profile-photos');

-- Allow authenticated users to manage prefixes for claim-documents
CREATE POLICY "Allow authenticated users to manage claim-documents prefixes"
ON storage.prefixes
FOR ALL
TO authenticated
USING (bucket_id = 'claim-documents')
WITH CHECK (bucket_id = 'claim-documents');

-- =============================================================================
-- OBJECTS TABLE - UPDATE POLICY (already had INSERT, SELECT, DELETE)
-- =============================================================================

-- Allow authenticated users to update signature PDFs
CREATE POLICY "Users can update signature PDFs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'signature-pdfs')
WITH CHECK (bucket_id = 'signature-pdfs');

-- NOTE: These policies were applied directly to NAS database on 2026-01-12.
-- This migration file exists for documentation and future deployments.
