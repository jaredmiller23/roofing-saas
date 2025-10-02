-- Add proline_id column to projects table for deduplication
-- This allows safe re-imports without creating duplicate projects

-- Add the column (allows NULL initially for existing records)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS proline_id TEXT;

-- Create unique constraint (after backfilling existing records)
-- Note: We'll add the UNIQUE constraint after the first import
-- For now, just create the column and index

-- Create index for fast lookups during import
CREATE INDEX IF NOT EXISTS idx_projects_proline_id
ON projects(proline_id)
WHERE proline_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN projects.proline_id IS 'Unique identifier from Proline CRM for deduplication. Format: numeric timestamp + random identifier (e.g., 1759354835784x738374090799908400)';

-- Similarly, add source tracking for contacts
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS proline_id TEXT;

CREATE INDEX IF NOT EXISTS idx_contacts_proline_id
ON contacts(proline_id)
WHERE proline_id IS NOT NULL;

COMMENT ON COLUMN contacts.proline_id IS 'Unique identifier from Proline CRM for deduplication';

-- Add enzy_id for knock data (future use)
ALTER TABLE gamification_scores
ADD COLUMN IF NOT EXISTS enzy_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_gamification_scores_enzy_user_id
ON gamification_scores(enzy_user_id)
WHERE enzy_user_id IS NOT NULL;

COMMENT ON COLUMN gamification_scores.enzy_user_id IS 'Unique identifier from Enzy platform for linking historical knock data';
