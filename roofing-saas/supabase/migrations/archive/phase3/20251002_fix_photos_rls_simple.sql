-- Simplified RLS policies for photos table that should always work

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view photos in their tenant" ON photos;
DROP POLICY IF EXISTS "Users can insert photos in their tenant" ON photos;
DROP POLICY IF EXISTS "Users can update photos in their tenant" ON photos;
DROP POLICY IF EXISTS "Users can delete photos in their tenant" ON photos;

-- Enable RLS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Simple policy: authenticated users can do everything with photos they uploaded
CREATE POLICY "Users can manage their uploaded photos"
ON photos
FOR ALL
TO authenticated
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());

-- Additional policy: users can view all photos in their tenant
CREATE POLICY "Users can view all tenant photos"
ON photos
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id
    FROM tenant_users
    WHERE user_id = auth.uid()
  )
);

-- Grant permissions
GRANT ALL ON photos TO authenticated;