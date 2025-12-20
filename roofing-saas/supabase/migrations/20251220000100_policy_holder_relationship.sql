-- Policy Holder Relationship and Enhanced Contact Fields
-- Supports scenarios where property occupant != policy holder (rentals, trusts, elderly parents)

-- Add new columns to contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS policy_holder_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS job_type TEXT,
ADD COLUMN IF NOT EXISTS customer_type TEXT CHECK (customer_type IN ('insurance', 'retail')),
ADD COLUMN IF NOT EXISTS text_consent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_text_consent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_call_consent BOOLEAN DEFAULT false;

-- Create index for policy_holder_id lookups
CREATE INDEX IF NOT EXISTS idx_contacts_policy_holder_id ON contacts(policy_holder_id) WHERE policy_holder_id IS NOT NULL;

-- Add comment explaining the relationship
COMMENT ON COLUMN contacts.policy_holder_id IS 'FK to another contact who is the insurance policy holder (when different from property occupant)';
COMMENT ON COLUMN contacts.job_type IS 'Type of job: Roof, Siding, Gutters, etc. (tenant customizable)';
COMMENT ON COLUMN contacts.customer_type IS 'Customer type: insurance or retail';
COMMENT ON COLUMN contacts.text_consent IS 'Has customer consented to receive text messages';
COMMENT ON COLUMN contacts.auto_text_consent IS 'Has customer consented to automated text messages';
COMMENT ON COLUMN contacts.auto_call_consent IS 'Has customer consented to automated calls';
