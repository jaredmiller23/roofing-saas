-- Create photos table for storing property/project photos
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Storage info
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Tracking
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_deleted BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_photos_tenant_id ON public.photos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_photos_contact_id ON public.photos(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photos_project_id ON public.photos(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_by ON public.photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON public.photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_is_deleted ON public.photos(is_deleted) WHERE is_deleted = FALSE;

-- Auto-update updated_at timestamp
CREATE TRIGGER photos_updated_at
  BEFORE UPDATE ON public.photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Users can view photos from their tenant
CREATE POLICY "Users can view their tenant's photos"
  ON public.photos
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
    )
    AND is_deleted = FALSE
  );

-- Users can upload photos to their tenant
CREATE POLICY "Users can upload photos to their tenant"
  ON public.photos
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

-- Users can update their own photos
CREATE POLICY "Users can update their own photos"
  ON public.photos
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
    )
  );

-- Users can soft delete their tenant's photos
CREATE POLICY "Users can soft delete their tenant's photos"
  ON public.photos
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    is_deleted = TRUE
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.photos TO authenticated;
GRANT SELECT ON public.photos TO anon;

-- Add comment
COMMENT ON TABLE public.photos IS 'Stores property/project photos with compression metadata';
