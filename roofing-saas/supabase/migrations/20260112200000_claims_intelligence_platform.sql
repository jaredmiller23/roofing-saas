-- Claims Intelligence Platform - Phase 5
-- Adds granular pattern tracking for adjusters and carriers
-- Plus enhancements to existing tables for intelligence feedback loop

-- ============================================
-- 1. ADJUSTER PATTERNS TABLE
-- Tracks specific patterns for individual adjusters
-- ============================================
CREATE TABLE IF NOT EXISTS adjuster_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  adjuster_id UUID NOT NULL REFERENCES insurance_personnel(id) ON DELETE CASCADE,

  -- What pattern?
  pattern_type TEXT NOT NULL,
  -- 'omits_line_item', 'disputes_item', 'slow_response', 'unreachable',
  -- 'thorough', 'reasonable', 'low_balls', 'fair'

  pattern_detail TEXT,
  -- Specific item: 'drip_edge', 'starter_strip', 'steep_charge', 'O&P',
  -- 'OL_coverage', 'ice_water_shield', 'ridge_vent'

  frequency TEXT NOT NULL DEFAULT 'sometimes',
  -- 'always', 'often', 'sometimes', 'rarely'

  successful_counter TEXT,
  -- What argument/evidence/approach works against this pattern

  notes TEXT,
  occurrence_count INTEGER NOT NULL DEFAULT 1,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. CARRIER PATTERNS TABLE
-- Tracks specific patterns at the carrier level
-- ============================================
CREATE TABLE IF NOT EXISTS carrier_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  carrier_id UUID REFERENCES insurance_carriers(id) ON DELETE SET NULL,
  carrier_name TEXT, -- For carriers not in the master list

  -- What pattern?
  pattern_type TEXT NOT NULL,
  -- 'denies_coverage', 'disputes_line_item', 'slow_payment',
  -- 'requires_inspection', 'accepts_supplements'

  pattern_detail TEXT,
  -- Specific item/coverage: 'O&P', 'OL_coverage', 'steep_charge',
  -- 'code_upgrades', 'matching'

  frequency TEXT NOT NULL DEFAULT 'sometimes',
  -- 'always', 'often', 'sometimes', 'rarely'

  successful_counter TEXT,
  -- What argument/evidence/approach works

  occurrence_count INTEGER NOT NULL DEFAULT 1,
  counter_success_count INTEGER NOT NULL DEFAULT 0,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 3. ENHANCE CLAIMS TABLE
-- Add link to insurance_personnel (adjuster)
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'adjuster_id'
  ) THEN
    ALTER TABLE claims ADD COLUMN adjuster_id UUID REFERENCES insurance_personnel(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add inspection tracking dates if not present
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'inspection_scheduled_at'
  ) THEN
    ALTER TABLE claims ADD COLUMN inspection_scheduled_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'inspection_completed_at'
  ) THEN
    ALTER TABLE claims ADD COLUMN inspection_completed_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'decision_date'
  ) THEN
    ALTER TABLE claims ADD COLUMN decision_date DATE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'acknowledgment_date'
  ) THEN
    ALTER TABLE claims ADD COLUMN acknowledgment_date DATE;
  END IF;
END $$;

-- ============================================
-- 4. ENHANCE CLAIM_OUTCOMES TABLE
-- Add fields for intelligence tracking
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claim_outcomes' AND column_name = 'requested_amount'
  ) THEN
    ALTER TABLE claim_outcomes ADD COLUMN requested_amount DECIMAL(10,2);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claim_outcomes' AND column_name = 'approved_amount'
  ) THEN
    ALTER TABLE claim_outcomes ADD COLUMN approved_amount DECIMAL(10,2);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claim_outcomes' AND column_name = 'disputed_items'
  ) THEN
    ALTER TABLE claim_outcomes ADD COLUMN disputed_items TEXT[];
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claim_outcomes' AND column_name = 'denial_reasons'
  ) THEN
    ALTER TABLE claim_outcomes ADD COLUMN denial_reasons TEXT[];
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claim_outcomes' AND column_name = 'successful_arguments'
  ) THEN
    ALTER TABLE claim_outcomes ADD COLUMN successful_arguments TEXT[];
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claim_outcomes' AND column_name = 'adjuster_id'
  ) THEN
    ALTER TABLE claim_outcomes ADD COLUMN adjuster_id UUID REFERENCES insurance_personnel(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claim_outcomes' AND column_name = 'days_to_decision'
  ) THEN
    ALTER TABLE claim_outcomes ADD COLUMN days_to_decision INTEGER;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claim_outcomes' AND column_name = 'days_to_payment'
  ) THEN
    ALTER TABLE claim_outcomes ADD COLUMN days_to_payment INTEGER;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claim_outcomes' AND column_name = 'supplements_filed'
  ) THEN
    ALTER TABLE claim_outcomes ADD COLUMN supplements_filed INTEGER DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claim_outcomes' AND column_name = 'appeal_filed'
  ) THEN
    ALTER TABLE claim_outcomes ADD COLUMN appeal_filed BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claim_outcomes' AND column_name = 'appeal_outcome'
  ) THEN
    ALTER TABLE claim_outcomes ADD COLUMN appeal_outcome TEXT;
  END IF;
END $$;

-- ============================================
-- 5. INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_adjuster_patterns_tenant ON adjuster_patterns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_adjuster_patterns_adjuster ON adjuster_patterns(adjuster_id);
CREATE INDEX IF NOT EXISTS idx_adjuster_patterns_type ON adjuster_patterns(tenant_id, pattern_type);

CREATE INDEX IF NOT EXISTS idx_carrier_patterns_tenant ON carrier_patterns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_carrier_patterns_carrier ON carrier_patterns(carrier_id);
CREATE INDEX IF NOT EXISTS idx_carrier_patterns_type ON carrier_patterns(tenant_id, pattern_type);

CREATE INDEX IF NOT EXISTS idx_claims_adjuster ON claims(adjuster_id);
CREATE INDEX IF NOT EXISTS idx_claim_outcomes_adjuster ON claim_outcomes(adjuster_id);

-- ============================================
-- 6. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE adjuster_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE carrier_patterns ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Tenant isolation" ON adjuster_patterns;
DROP POLICY IF EXISTS "Tenant isolation" ON carrier_patterns;

-- Adjuster patterns - tenant isolation via JWT
CREATE POLICY "Tenant isolation" ON adjuster_patterns
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Carrier patterns - tenant isolation via JWT
CREATE POLICY "Tenant isolation" ON carrier_patterns
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 7. UPDATE TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_adjuster_patterns_updated_at ON adjuster_patterns;
CREATE TRIGGER update_adjuster_patterns_updated_at
  BEFORE UPDATE ON adjuster_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_carrier_patterns_updated_at ON carrier_patterns;
CREATE TRIGGER update_carrier_patterns_updated_at
  BEFORE UPDATE ON carrier_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- NOTIFY PostgREST to reload schema
-- ============================================
NOTIFY pgrst, 'reload schema';

-- Summary:
-- - Created adjuster_patterns table for granular adjuster tracking
-- - Created carrier_patterns table for granular carrier tracking
-- - Enhanced claims table with adjuster_id FK and inspection dates
-- - Enhanced claim_outcomes with intelligence fields
-- - Added indexes for performance
-- - Added RLS policies for tenant isolation
