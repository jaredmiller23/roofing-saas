-- ============================================
-- ADD PROLINE_ID FOR DEDUPLICATION
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add proline_id to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS proline_id TEXT;

-- Create index for fast lookups during import
CREATE INDEX IF NOT EXISTS idx_projects_proline_id
ON projects(proline_id)
WHERE proline_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN projects.proline_id IS 'Unique identifier from Proline CRM for deduplication. Format: numeric timestamp + random identifier (e.g., 1759354835784x738374090799908400)';

-- 2. Add proline_id to contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS proline_id TEXT;

CREATE INDEX IF NOT EXISTS idx_contacts_proline_id
ON contacts(proline_id)
WHERE proline_id IS NOT NULL;

COMMENT ON COLUMN contacts.proline_id IS 'Unique identifier from Proline CRM for deduplication';

-- 3. Add enzy_user_id to gamification_scores for future Enzy data import
ALTER TABLE gamification_scores
ADD COLUMN IF NOT EXISTS enzy_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_gamification_scores_enzy_user_id
ON gamification_scores(enzy_user_id)
WHERE enzy_user_id IS NOT NULL;

COMMENT ON COLUMN gamification_scores.enzy_user_id IS 'Unique identifier from Enzy platform for linking historical knock data';

-- Verify the changes
SELECT
  'projects' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'proline_id'

UNION ALL

SELECT
  'contacts' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'contacts' AND column_name = 'proline_id'

UNION ALL

SELECT
  'gamification_scores' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'gamification_scores' AND column_name = 'enzy_user_id';

-- Expected output:
-- table_name          | column_name    | data_type
-- -------------------+----------------+-----------
-- projects           | proline_id     | text
-- contacts           | proline_id     | text
-- gamification_scores| enzy_user_id   | text
