-- =====================================================
-- PROJECT FILES TABLE
-- Date: 2025-10-03
-- Purpose: File and photo management for projects
-- Critical for: Mobile photo uploads, document storage, before/after galleries
-- =====================================================

-- Project Files Table
-- Stores metadata for files uploaded to Supabase Storage
CREATE TABLE IF NOT EXISTS project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- File details
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'photo', 'document', 'contract', 'estimate', 'invoice', 'other'
  file_category TEXT, -- 'before', 'after', 'damage', 'inspection', 'completion', etc.
  file_url TEXT NOT NULL, -- Supabase Storage URL
  thumbnail_url TEXT, -- Thumbnail for photos (generated on upload)
  file_size INTEGER, -- Bytes
  mime_type TEXT, -- e.g., 'image/jpeg', 'application/pdf'

  -- File metadata
  description TEXT,
  tags TEXT[], -- Array of tags for categorization

  -- Geolocation (from mobile uploads)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  captured_at TIMESTAMPTZ, -- When photo was taken (may differ from uploaded)

  -- Upload info
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_from TEXT, -- 'mobile', 'desktop', 'api'

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_project_files_tenant_id ON project_files(tenant_id);
CREATE INDEX idx_project_files_project_id ON project_files(project_id);
CREATE INDEX idx_project_files_file_type ON project_files(file_type);
CREATE INDEX idx_project_files_file_category ON project_files(file_category);
CREATE INDEX idx_project_files_uploaded_by ON project_files(uploaded_by);
CREATE INDEX idx_project_files_created_at ON project_files(created_at DESC);

-- Composite index for photos query
CREATE INDEX idx_project_files_photos ON project_files(project_id, file_type) WHERE file_type = 'photo';

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Users can view files for projects in their tenant
CREATE POLICY "Users can view project files in their tenant"
  ON project_files FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can upload files to projects in their tenant
CREATE POLICY "Users can upload project files"
  ON project_files FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can update file metadata in their tenant
CREATE POLICY "Users can update project files"
  ON project_files FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can delete files in their tenant
CREATE POLICY "Users can delete project files"
  ON project_files FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for photo gallery (photos only)
CREATE OR REPLACE VIEW project_photo_gallery AS
SELECT
  pf.*,
  p.name as project_name,
  u.full_name as uploaded_by_name
FROM project_files pf
LEFT JOIN projects p ON pf.project_id = p.id
LEFT JOIN profiles u ON pf.uploaded_by = u.id
WHERE pf.file_type = 'photo'
  AND pf.is_deleted = FALSE
ORDER BY pf.created_at DESC;

-- View for documents (non-photos)
CREATE OR REPLACE VIEW project_documents AS
SELECT
  pf.*,
  p.name as project_name,
  u.full_name as uploaded_by_name
FROM project_files pf
LEFT JOIN projects p ON pf.project_id = p.id
LEFT JOIN profiles u ON pf.uploaded_by = u.id
WHERE pf.file_type != 'photo'
  AND pf.is_deleted = FALSE
ORDER BY pf.created_at DESC;

-- =====================================================
-- STORAGE BUCKETS (Run via Supabase Dashboard or API)
-- =====================================================

-- Note: Storage buckets must be created via Supabase Dashboard or Management API
-- Bucket name: 'project-files'
-- Access: Private (RLS via Storage policies)
-- File size limit: 50MB per file
-- Allowed MIME types: image/*, application/pdf, application/msword, etc.

-- Storage RLS policies (to be created separately):
-- 1. Users can upload files to their tenant's folder
-- 2. Users can read files from their tenant's folder
-- 3. Users can delete files they uploaded or from their tenant

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to generate thumbnail URL from file URL
CREATE OR REPLACE FUNCTION generate_thumbnail_url(file_url TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Simple thumbnail URL generation (customize based on your storage setup)
  -- This assumes Supabase Storage with image transformation
  RETURN REPLACE(file_url, '/project-files/', '/project-files/thumbnails/');
END;
$$ LANGUAGE plpgsql;

-- Function to get file count by project
CREATE OR REPLACE FUNCTION get_project_file_count(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  file_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO file_count
  FROM project_files
  WHERE project_id = p_project_id
    AND is_deleted = FALSE;

  RETURN file_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get photo count by project
CREATE OR REPLACE FUNCTION get_project_photo_count(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  photo_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO photo_count
  FROM project_files
  WHERE project_id = p_project_id
    AND file_type = 'photo'
    AND is_deleted = FALSE;

  RETURN photo_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE project_files IS 'Stores metadata for files and photos uploaded to projects. Actual files stored in Supabase Storage.';
COMMENT ON COLUMN project_files.file_type IS 'Type of file: photo, document, contract, estimate, invoice, other';
COMMENT ON COLUMN project_files.file_category IS 'Category for photos: before, after, damage, inspection, completion';
COMMENT ON COLUMN project_files.file_url IS 'Full URL to file in Supabase Storage bucket';
COMMENT ON COLUMN project_files.thumbnail_url IS 'URL to thumbnail version (for photos)';
COMMENT ON COLUMN project_files.captured_at IS 'When photo was taken (from EXIF data or device timestamp)';
COMMENT ON COLUMN project_files.uploaded_from IS 'Upload source: mobile, desktop, api';

COMMENT ON VIEW project_photo_gallery IS 'Photo gallery view with project and uploader details';
COMMENT ON VIEW project_documents IS 'Document library view (excludes photos)';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== Project Files Table Created ===';
  RAISE NOTICE 'Created project_files table with RLS policies';
  RAISE NOTICE 'Created indexes for performance';
  RAISE NOTICE 'Created views for photo gallery and documents';
  RAISE NOTICE 'Created helper functions for file/photo counts';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create Supabase Storage bucket: project-files';
  RAISE NOTICE '2. Configure Storage RLS policies';
  RAISE NOTICE '3. Build file upload component (mobile camera support)';
  RAISE NOTICE '4. Build photo gallery UI';
  RAISE NOTICE '5. Implement file deletion (both DB and Storage)';
  RAISE NOTICE '6. Add file compression for photos (reduce costs)';
END $$;
