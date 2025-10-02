-- Fix RLS policies for photos table to allow soft delete operations

-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view photos in their tenant" ON photos;
DROP POLICY IF EXISTS "Users can insert photos in their tenant" ON photos;
DROP POLICY IF EXISTS "Users can update photos in their tenant" ON photos;
DROP POLICY IF EXISTS "Users can delete photos in their tenant" ON photos;

-- Enable RLS on photos table if not already enabled
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT: Users can view photos in their tenant
CREATE POLICY "Users can view photos in their tenant"
ON photos FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id
    FROM tenant_users
    WHERE user_id = auth.uid()
  )
  AND is_deleted = false
);

-- Policy for INSERT: Users can insert photos in their tenant
CREATE POLICY "Users can insert photos in their tenant"
ON photos FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id
    FROM tenant_users
    WHERE user_id = auth.uid()
  )
);

-- Policy for UPDATE: Users can update photos in their tenant (includes soft delete)
CREATE POLICY "Users can update photos in their tenant"
ON photos FOR UPDATE
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id
    FROM tenant_users
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id
    FROM tenant_users
    WHERE user_id = auth.uid()
  )
);

-- Policy for DELETE: Users can hard delete photos in their tenant (if needed)
CREATE POLICY "Users can delete photos in their tenant"
ON photos FOR DELETE
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id
    FROM tenant_users
    WHERE user_id = auth.uid()
  )
);

-- Create an index to improve RLS policy performance
CREATE INDEX IF NOT EXISTS idx_photos_tenant_id_is_deleted
ON photos(tenant_id, is_deleted);

-- Grant necessary permissions to authenticated users
GRANT ALL ON photos TO authenticated;

-- Also ensure the photos table has proper constraints
-- Add check constraint for is_deleted if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'photos_is_deleted_check'
    AND conrelid = 'photos'::regclass
  ) THEN
    ALTER TABLE photos
    ADD CONSTRAINT photos_is_deleted_check
    CHECK (is_deleted IN (true, false));
  END IF;
END $$;